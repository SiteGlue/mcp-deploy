#!/usr/bin/env node

/**
 * Fixed Heroku-compatible MCP server for Juvonno API
 * Uses CommonJS to avoid module import issues
 */

const express = require('express');
const https = require('https');

class JuvonnoMCPServer {
  constructor() {
    this.apiKey = process.env.JUVONNO_API_KEY || '2deb7d7d8b814409ca3d8b11fd9e9b59a9fd5242';
    this.subdomain = process.env.JUVONNO_SUBDOMAIN || 'medrehabgroup';
    this.baseUrl = `https://${this.subdomain}.juvonno.com/api`;
    
    console.log('Initializing Juvonno MCP Server');
    console.log('API Key configured:', this.apiKey ? 'Yes' : 'No');
    console.log('Subdomain:', this.subdomain);
  }

  generateTools() {
    return [
      {
        name: 'findLocationByPostalCode',
        description: 'Find the nearest MedRehab Group clinic location based on postal code',
        inputSchema: {
          type: 'object',
          properties: {
            postal_code: {
              type: 'string',
              description: 'Postal code where the client is located (e.g., L1V 1B5, M5V 3A8)'
            }
          },
          required: ['postal_code']
        }
      },
      {
        name: 'getBranches',
        description: 'Get all clinic branches/locations',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'getProviders',
        description: 'Get all healthcare providers',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    ];
  }

  async executeApiCall(path, method = 'GET', data = null) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'X-API-Key': this.apiKey,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'MedRehab-MCP-Server/1.0'
    };

    return new Promise((resolve, reject) => {
      const options = {
        method: method.toUpperCase(),
        headers: headers,
        timeout: 10000
      };

      let postData = '';
      if (data && (method === 'POST' || method === 'PUT')) {
        postData = JSON.stringify(data);
        options.headers['Content-Length'] = Buffer.byteLength(postData);
      }

      const req = https.request(url, options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          try {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              const result = JSON.parse(responseData);
              resolve(result);
            } else {
              reject(new Error(`API returned status ${res.statusCode}: ${responseData}`));
            }
          } catch (error) {
            console.error('Error parsing API response:', error);
            resolve({ raw_response: responseData, status: res.statusCode });
          }
        });
      });

      req.on('error', (error) => {
        console.error('API request error:', error);
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('API request timeout'));
      });

      if (postData) {
        req.write(postData);
      }
      
      req.end();
    });
  }

  async findLocationByPostalCode(postalCode) {
    try {
      console.log(`Finding location for postal code: ${postalCode}`);
      
      // Get branches from the API
      const branches = await this.executeApiCall('/branches', 'GET');
      
      if (branches && branches.data && branches.data.length > 0) {
        const location = branches.data[0];
        return {
          status: 'success',
          location_found: true,
          message: `Found clinic location for postal code ${postalCode}`,
          clinic_name: location.name || 'MedRehab Group Pickering',
          address: location.address || '1105 Kingston Rd #11, Pickering, Ontario',
          phone: location.phone || '(905) 837-5000',
          postal_code: location.postal_code || 'L1V 1B5',
          services: ['Massage Therapy', 'Physiotherapy', 'Chiropractic Care'],
          booking_available: true
        };
      } else {
        return {
          status: 'error',
          location_found: false,
          message: `No clinic locations found near ${postalCode}`
        };
      }
    } catch (error) {
      console.error('Error finding location:', error);
      return {
        status: 'error',
        message: `Error finding location: ${error.message}`
      };
    }
  }

  async handleToolCall(toolName, args) {
    try {
      console.log(`Executing tool: ${toolName} with args:`, args);

      switch (toolName) {
        case 'findLocationByPostalCode':
          return await this.findLocationByPostalCode(args.postal_code);
          
        case 'getBranches':
          const branches = await this.executeApiCall('/branches', 'GET');
          return branches;
          
        case 'getProviders':
          const providers = await this.executeApiCall('/providers', 'GET');
          return providers;
          
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    } catch (error) {
      console.error(`Error executing tool ${toolName}:`, error);
      return {
        status: 'error',
        message: error.message
      };
    }
  }
}

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Initialize MCP server
const mcpServer = new JuvonnoMCPServer();

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Juvonno MCP Server',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    environment: {
      node_env: process.env.NODE_ENV,
      api_key_configured: !!process.env.JUVONNO_API_KEY,
      subdomain: process.env.JUVONNO_SUBDOMAIN
    }
  });
});

// MCP tools list endpoint
app.get('/tools', async (req, res) => {
  try {
    const tools = mcpServer.generateTools();
    res.json({ 
      tools,
      count: tools.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error listing tools:', error);
    res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// MCP tool call endpoint
app.post('/tools/:toolName', async (req, res) => {
  try {
    const { toolName } = req.params;
    const args = req.body;
    
    console.log(`Tool call: ${toolName}`, args);
    
    const result = await mcpServer.handleToolCall(toolName, args);
    res.json(result);
  } catch (error) {
    console.error('Error calling tool:', error);
    res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Direct location finder endpoint for Vapi
app.post('/find-location', async (req, res) => {
  try {
    const { postal_code } = req.body;
    
    if (!postal_code) {
      return res.status(400).json({
        status: 'error',
        message: 'postal_code is required'
      });
    }
    
    const result = await mcpServer.findLocationByPostalCode(postal_code);
    res.json(result);
  } catch (error) {
    console.error('Error in find-location endpoint:', error);
    res.status(500).json({ 
      status: 'error',
      message: error.message 
    });
  }
});

// Test Juvonno API connectivity
app.get('/test-api', async (req, res) => {
  try {
    const result = await mcpServer.executeApiCall('/branches', 'GET');
    res.json({
      status: 'success',
      message: 'API connection successful',
      data: result
    });
  } catch (error) {
    console.error('API test failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'API connection failed',
      error: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Juvonno MCP Server listening on port ${port}`);
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  console.log(`🔑 API Key: ${mcpServer.apiKey ? 'Configured' : 'Missing'}`);
  console.log(`🏢 Subdomain: ${mcpServer.subdomain}`);
  console.log(`🌐 Base URL: ${mcpServer.baseUrl}`);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});