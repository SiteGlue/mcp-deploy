const express = require('express');
const https = require('https');

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
      
      const cleanedPostalCode = postalCode.replace(/\s+/g, '').toUpperCase();
      console.log(`Cleaned postal code: ${cleanedPostalCode}`);
      
      const branches = await this.executeApiCall('/branches', 'GET');
      const locationList = branches.list || branches.data || [];
      
      if (locationList && locationList.length > 0) {
        const postalPrefix = cleanedPostalCode.substring(0, 3);
        
        let exactMatch = locationList.find(loc => {
          if (!loc.postal) return false;
          const cleanedLocationPostal = loc.postal.replace(/\s+/g, '').toUpperCase();
          
          if (cleanedLocationPostal === cleanedPostalCode) return true;
          if (cleanedLocationPostal.substring(0, 3) === postalPrefix) return true;
          if (cleanedLocationPostal.startsWith(cleanedPostalCode)) return true;
          if (cleanedPostalCode.startsWith(cleanedLocationPostal.substring(0, Math.min(cleanedLocationPostal.length, cleanedPostalCode.length)))) return true;
          
          return false;
        });
        
        let nearbyLocations = [];
        if (exactMatch) {
          nearbyLocations.push(exactMatch);
          const others = locationList.filter(loc => loc.id !== exactMatch.id).slice(0, 2);
          nearbyLocations = nearbyLocations.concat(others);
        } else {
          nearbyLocations = locationList.slice(0, 3);
        }
        
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

// Create Express server for Vapi MCP integration
const app = express();
const port = process.env.PORT || 3000;

// CORS headers for Vapi
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json());

// Authentication middleware for Vapi API key
const authenticateVapi = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }
  
  // Extract the API key (in production, you'd validate this against Vapi)
  const apiKey = authHeader.substring(7);
  req.vapiApiKey = apiKey;
  next();
};

const juvonnoServer = new JuvonnoMCPServer();

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'MedRehab Group MCP Server for Vapi',
    version: '2.0.0',
    mcp_endpoint: '/mcp',
    authentication: 'Bearer token required',
    authentic_data: true,
    clinic_count: 12
  });
});

// Main MCP endpoint for Vapi integration
app.post('/mcp', authenticateVapi, async (req, res) => {
  try {
    console.log('Received MCP request:', JSON.stringify(req.body, null, 2));
    
    const { method, params } = req.body;
    
    let result;
    
    switch (method) {
      case 'tools/list':
        result = {
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
              description: 'Get all MedRehab Group clinic locations and addresses',
              inputSchema: {
                type: 'object',
                properties: {},
                required: []
              }
            }
          ]
        };
        break;
        
      case 'tools/call':
        const { name, arguments: args } = params;
        
        switch (name) {
          case 'findLocationByPostalCode':
            const locationResult = await juvonnoServer.findLocationByPostalCode(args.postal_code);
            result = {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(locationResult)
                }
              ]
            };
            break;
            
          case 'getAllLocations':
            const allLocationsResult = await juvonnoServer.getAllLocations();
            result = {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(allLocationsResult)
                }
              ]
            };
            break;
            
          default:
            result = { 
              error: {
                code: -32601,
                message: `Unknown tool: ${name}`
              }
            };
        }
        break;
        
      case 'create_call':
        // Handle Vapi call creation if needed
        result = { 
          error: {
            code: -32601,
            message: 'create_call not implemented for this MCP server'
          }
        };
        break;
        
      case 'list_assistants':
        // Handle assistant listing if needed
        result = { 
          assistants: [
            {
              id: 'medrehab-location-assistant',
              name: 'MedRehab Group Location Assistant',
              description: 'Helps find MedRehab Group clinic locations'
            }
          ]
        };
        break;
        
      default:
        result = { 
          error: {
            code: -32601,
            message: `Unknown method: ${method}`
          }
        };
    }
    
    console.log('Sending MCP response:', JSON.stringify(result, null, 2));
    
    res.json({
      jsonrpc: '2.0',
      id: req.body.id || 1,
      result
    });
    
  } catch (error) {
    console.error('MCP endpoint error:', error);
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

// Legacy endpoints for compatibility
app.get('/tools/list', (req, res) => {
  res.json({
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
        description: 'Get all MedRehab Group clinic locations and addresses',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    ]
  });
});

app.post('/tools/call', async (req, res) => {
  try {
    console.log('Received /tools/call request:', JSON.stringify(req.body, null, 2));
    console.log('Request headers:', JSON.stringify(req.headers, null, 2));
    
    // Handle multiple possible formats
    let toolName, postalCode;
    
    // Format 1: Direct parameters (Vapi's expected format)
    if (req.body.tool_name) {
      toolName = req.body.tool_name;
      postalCode = req.body.postal_code;
    }
    // Format 2: MCP standard format
    else if (req.body.name) {
      toolName = req.body.name;
      postalCode = req.body.arguments?.postal_code;
    }
    // Format 3: Nested in params
    else if (req.body.params?.name) {
      toolName = req.body.params.name;
      postalCode = req.body.params.arguments?.postal_code;
    }
    // Format 4: Check all possible nested structures
    else if (req.body.function?.name) {
      toolName = req.body.function.name;
      postalCode = req.body.function.arguments?.postal_code;
    }
    // Format 5: If it's just the function name directly
    else if (typeof req.body === 'string') {
      toolName = req.body;
    }
    else {
      console.log('Could not find tool name in any expected format');
      console.log('Available keys:', Object.keys(req.body));
      return res.status(400).json({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'error',
              message: 'Missing tool name in request',
              received_data: req.body,
              available_keys: Object.keys(req.body)
            })
          }
        ]
      });
    }
    
    let result;
    switch (toolName) {
      case 'findLocationByPostalCode':
        if (!postalCode) {
          result = { status: 'error', message: 'Postal code is required for findLocationByPostalCode' };
        } else {
          result = await juvonnoServer.findLocationByPostalCode(postalCode);
        }
        break;
        
      case 'getAllLocations':
        result = await juvonnoServer.getAllLocations();
        break;
        
      default:
        result = { status: 'error', message: `Unknown tool: ${toolName}` };
    }
    
    console.log('Sending response:', JSON.stringify(result, null, 2));
    
    res.json({
      content: [
        {
          type: 'text',
          text: JSON.stringify(result)
        }
      ]
    });
  } catch (error) {
    console.error('Error executing tool:', error);
    res.status(500).json({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            status: 'error',
            message: error.message
          })
        }
      ]
    });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`MedRehab Group MCP Server for Vapi running on port ${port}`);
  console.log('MCP endpoint: /mcp (requires Bearer token authentication)');
  console.log('Legacy endpoints: /tools/list, /tools/call');
});