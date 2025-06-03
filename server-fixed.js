#!/usr/bin/env node

import express from 'express';
import https from 'https';

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
        
        const formattedLocations = nearbyLocations.map(location => ({
          name: `MedRehab Group ${location.name}`,
          address: location.address || 'Address not available',
          city: location.city || 'City not available',
          postal_code: location.postal || 'Postal code not available',
          phone: location.phone || 'Phone not available',
          services: ['Massage Therapy', 'Physiotherapy', 'Chiropractic Care']
        }));
        
        const primaryLocation = formattedLocations[0];
        
        return {
          status: 'success',
          location_found: true,
          message: `Found ${formattedLocations.length} clinic locations near postal code ${postalCode}`,
          locations: formattedLocations,
          count: formattedLocations.length,
          clinic_name: primaryLocation.name,
          address: primaryLocation.address,
          phone: primaryLocation.phone,
          postal_code: primaryLocation.postal_code,
          services: primaryLocation.services,
          booking_available: true
        };
      } else {
        return {
          status: 'error',
          location_found: false,
          message: 'No clinic locations found',
          locations: [],
          count: 0,
          booking_available: false
        };
      }
    } catch (error) {
      console.error('Error finding location:', error);
      return {
        status: 'error',
        location_found: false,
        message: `Error finding location: ${error.message}`,
        locations: [],
        count: 0,
        booking_available: false
      };
    }
  }

  async getAllLocations() {
    try {
      console.log('Getting all MedRehab Group locations');
      
      const branches = await this.executeApiCall('/branches', 'GET');
      const locationList = branches.list || branches.data || [];
      
      if (locationList && locationList.length > 0) {
        const formattedLocations = locationList.map(location => ({
          name: `MedRehab Group ${location.name}`,
          address: location.address || 'Address not available',
          city: location.city || 'City not available',
          postal_code: location.postal || 'Postal code not available',
          phone: location.phone || 'Phone not available',
          services: ['Massage Therapy', 'Physiotherapy', 'Chiropractic Care']
        }));
        
        return {
          status: 'success',
          message: `We have ${formattedLocations.length} MedRehab Group locations`,
          locations: formattedLocations,
          count: formattedLocations.length,
          booking_available: true
        };
      } else {
        return {
          status: 'error',
          message: 'No clinic locations found',
          locations: [],
          count: 0,
          booking_available: false
        };
      }
    } catch (error) {
      console.error('Error getting all locations:', error);
      return {
        status: 'error',
        message: `Error retrieving locations: ${error.message}`,
        locations: [],
        count: 0,
        booking_available: false
      };
    }
  }
}

// Create HTTP server
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Add CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).send();
  }
  next();
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'MedRehab Group MCP Server Running',
    version: '2.0.0',
    endpoints: ['/mcp', '/vapi/tools/call', '/health'],
    authentic_data: true
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// MCP protocol endpoint
app.post('/mcp', async (req, res) => {
  try {
    const juvonnoServer = new JuvonnoMCPServer();
    const { method, params } = req.body;
    
    if (method === 'tools/list') {
      const result = {
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
      
      return res.json({
        jsonrpc: '2.0',
        id: req.body.id || 1,
        result
      });
    }
    
    if (method === 'tools/call') {
      const { name, arguments: args } = params;
      let result;
      
      switch (name) {
        case 'findLocationByPostalCode':
          result = await juvonnoServer.findLocationByPostalCode(args.postal_code);
          break;
        case 'getAllLocations':
          result = await juvonnoServer.getAllLocations();
          break;
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
      
      return res.json({
        jsonrpc: '2.0',
        id: req.body.id || 1,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result)
            }
          ]
        }
      });
    }
    
    res.status(400).json({
      jsonrpc: '2.0',
      id: req.body.id || 1,
      error: {
        code: -32601,
        message: `Unknown method: ${method}`
      }
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

// Vapi-compatible endpoint
app.post('/vapi/tools/call', async (req, res) => {
  try {
    console.log('Vapi request received:', JSON.stringify(req.body, null, 2));
    
    const juvonnoServer = new JuvonnoMCPServer();
    const { method, params } = req.body;
    
    if (method === 'tools/call') {
      const { name, arguments: args } = params;
      
      // Handle Vapi's wrapper function format
      if (name === 'findMedRehabLocation') {
        const { tool_name, postal_code } = args;
        
        console.log(`Vapi wrapper call - tool_name: ${tool_name}, postal_code: ${postal_code}`);
        
        let result;
        switch (tool_name) {
          case 'findLocationByPostalCode':
            if (!postal_code) {
              result = {
                status: 'error',
                message: 'postal_code is required for findLocationByPostalCode'
              };
            } else {
              result = await juvonnoServer.findLocationByPostalCode(postal_code);
            }
            break;
            
          case 'getAllLocations':
            result = await juvonnoServer.getAllLocations();
            break;
            
          default:
            result = {
              status: 'error',
              message: `Unknown tool_name: ${tool_name}`
            };
        }
        
        console.log('Result:', JSON.stringify(result, null, 2));
        return res.json(result);
      }
      
      // Handle direct tool calls
      let result;
      switch (name) {
        case 'findLocationByPostalCode':
          result = await juvonnoServer.findLocationByPostalCode(args.postal_code);
          break;
        case 'getAllLocations':
          result = await juvonnoServer.getAllLocations();
          break;
        default:
          result = {
            status: 'error',
            message: `Unknown tool: ${name}`
          };
      }
      
      return res.json(result);
    }
    
    res.json({
      status: 'error',
      message: 'Invalid request format'
    });
  } catch (error) {
    console.error('Vapi endpoint error:', error);
    res.json({
      status: 'error',
      message: error.message
    });
  }
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`MedRehab Group MCP Server running on port ${port}`);
});