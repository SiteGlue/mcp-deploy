#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import https from 'https';
import express from 'express';

const JUVONNO_API_KEY = '2deb7d7d8b814409ca3d8b11fd9e9b59a9fd5242';
const JUVONNO_SUBDOMAIN = 'medrehabgroup';

class JuvonnoMCPServer {
  constructor() {
    this.baseUrl = `https://${JUVONNO_SUBDOMAIN}.juvonno.com/api`;
    this.apiKey = JUVONNO_API_KEY;
  }

  async executeApiCall(path, method = 'GET') {
    const url = `${this.baseUrl}${path}`;
    const options = {
      method: method.toUpperCase(),
      headers: {
        'X-API-Key': this.apiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'MedRehab-MCP-Server/2.0'
      },
      timeout: 10000
    };

    return new Promise((resolve, reject) => {
      const req = https.request(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            resolve(result);
          } catch (e) {
            reject(new Error(`Invalid JSON response: ${e.message}`));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.end();
    });
  }

  async findLocationByPostalCode(postalCode) {
    try {
      console.log(`Finding location for postal code: ${postalCode}`);
      
      // Clean and normalize postal code for voice input
      const cleanedPostalCode = postalCode.replace(/\s+/g, '').toUpperCase();
      console.log(`Cleaned postal code: ${cleanedPostalCode}`);
      
      // Get branches from the API
      const branches = await this.executeApiCall('/branches', 'GET');
      const locationList = branches.list || branches.data || [];
      
      if (locationList && locationList.length > 0) {
        // Try to find locations matching the postal code area using cleaned postal code
        const postalPrefix = cleanedPostalCode.substring(0, 3);
        
        // Find exact match first - try full postal code, then prefix matching
        let exactMatch = locationList.find(loc => {
          if (!loc.postal) return false;
          const cleanedLocationPostal = loc.postal.replace(/\s+/g, '').toUpperCase();
          
          // Try exact match first
          if (cleanedLocationPostal === cleanedPostalCode) return true;
          
          // Try prefix matching (first 3 characters)
          if (cleanedLocationPostal.substring(0, 3) === postalPrefix) return true;
          
          // Try partial matching for voice input
          if (cleanedLocationPostal.startsWith(cleanedPostalCode)) return true;
          
          // Try reverse - provided code starts with location postal
          if (cleanedPostalCode.startsWith(cleanedLocationPostal.substring(0, Math.min(cleanedLocationPostal.length, cleanedPostalCode.length)))) return true;
          
          return false;
        });
        
        // Get up to 3 locations - prioritize exact match, then all others
        let nearbyLocations = [];
        if (exactMatch) {
          nearbyLocations.push(exactMatch);
          // Add other locations that aren't the exact match
          const others = locationList.filter(loc => loc.id !== exactMatch.id).slice(0, 2);
          nearbyLocations = nearbyLocations.concat(others);
        } else {
          // No exact match, return first 3 locations
          nearbyLocations = locationList.slice(0, 3);
        }
        
        // Format locations for the response
        const formattedLocations = nearbyLocations.map(loc => ({
          name: loc.name,
          address: loc.address,
          city: loc.city,
          postal_code: loc.postal,
          phone: loc.phone,
          services: ['Massage Therapy', 'Physiotherapy', 'Chiropractic Care']
        }));
        
        return {
          status: 'success',
          location_found: true,
          message: `Found ${formattedLocations.length} clinic locations near postal code ${cleanedPostalCode}`,
          locations: formattedLocations,
          count: formattedLocations.length,
          // Also include primary location for backward compatibility
          clinic_name: formattedLocations[0].name,
          address: formattedLocations[0].address,
          phone: formattedLocations[0].phone,
          postal_code: formattedLocations[0].postal_code,
          services: formattedLocations[0].services,
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

  async getAllLocations() {
    try {
      console.log('Getting all MedRehab Group locations');
      
      const branches = await this.executeApiCall('/branches', 'GET');
      const locationList = branches.list || branches.data || [];
      
      if (locationList && locationList.length > 0) {
        const formattedLocations = locationList.map(loc => ({
          name: loc.name,
          address: loc.address,
          city: loc.city,
          postal_code: loc.postal,
          phone: loc.phone,
          services: ['Massage Therapy', 'Physiotherapy', 'Chiropractic Care']
        }));
        
        return {
          status: 'success',
          message: `We have ${formattedLocations.length} MedRehab Group locations`,
          locations: formattedLocations,
          count: formattedLocations.length
        };
      } else {
        return {
          status: 'error',
          message: 'No locations available'
        };
      }
    } catch (error) {
      console.error('Error getting all locations:', error);
      return {
        status: 'error',
        message: `Error getting locations: ${error.message}`
      };
    }
  }
}

function createMcpServer() {
  const juvonnoServer = new JuvonnoMCPServer();

  const mcpServer = new McpServer({
    name: 'MedRehab Group MCP Server',
    version: '1.0.0',
    capabilities: [],
  });

  // Register tools/list handler
  mcpServer.setRequestHandler('tools/list', async () => {
    return {
      tools: [
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
          name: 'getAllLocations',
          description: 'Get all MedRehab Group clinic locations and addresses when asked "What are your locations?"',
          inputSchema: {
            type: 'object',
            properties: {},
            required: []
          }
        }
      ]
    };
  });

  // Register tools/call handler
  mcpServer.setRequestHandler('tools/call', async (request) => {
    const { name, arguments: args } = request.params;
    
    try {
      switch (name) {
        case 'findLocationByPostalCode':
          const locationResult = await juvonnoServer.findLocationByPostalCode(args.postal_code);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(locationResult)
              }
            ]
          };
          
        case 'getAllLocations':
          const allLocationsResult = await juvonnoServer.getAllLocations();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(allLocationsResult)
              }
            ]
          };
          
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      console.error(`Error executing tool ${name}:`, error);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'error',
              message: error.message
            })
          }
        ]
      };
    }
  });

  return mcpServer;
}

// Create HTTP wrapper for Heroku deployment
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'MedRehab Group MCP Server Running',
    version: '1.0.0',
    endpoints: ['/mcp', '/health'],
    authentic_data: true
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// MCP endpoint that handles stdio-like communication over HTTP
app.post('/mcp', async (req, res) => {
  try {
    const mcpServer = createMcpServer();
    const { method, params } = req.body;
    
    // Simulate MCP request handling
    let result;
    if (method === 'tools/list') {
      result = await mcpServer.requestHandlers['tools/list']();
    } else if (method === 'tools/call') {
      result = await mcpServer.requestHandlers['tools/call']({ params });
    } else {
      result = { error: `Unknown method: ${method}` };
    }
    
    res.json({
      jsonrpc: '2.0',
      id: req.body.id || 1,
      result
    });
  } catch (error) {
    res.status(500).json({
      jsonrpc: '2.0',
      id: req.body.id || 1,
      error: {
        code: -32603,
        message: error.message
      }
    });
  }
});

async function main() {
  const isHeroku = process.env.PORT !== undefined;
  
  if (isHeroku) {
    // Run as HTTP server on Heroku
    app.listen(port, '0.0.0.0', () => {
      console.log(`MedRehab Group MCP Server running on port ${port}`);
    });
  } else {
    // Run as stdio MCP server locally
    try {
      const mcpServer = createMcpServer();
      const transport = new StdioServerTransport();
      await mcpServer.connect(transport);

      console.error('MedRehab Group MCP Server started (stdio mode)');
      
      process.on('SIGINT', async () => {
        try {
          await mcpServer.close();
          process.exit(0);
        } catch (err) {
          process.exit(1);
        }
      });
    } catch (err) {
      console.error('Failed to start MCP server:', err);
      process.exit(1);
    }
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});