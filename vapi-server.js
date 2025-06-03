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
        'User-Agent': 'MedRehab-MCP-Server/3.0'
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
        
        const formattedLocations = nearbyLocations.map(location => {
          const name = location.name.includes('MedRehab') ? location.name : `MedRehab Group ${location.name}`;
          return `${name} - ${location.address || 'Address not available'}, ${location.city || 'City not available'} ${location.postal || 'Postal code not available'}. Phone: ${location.phone || 'Phone not available'}. Services: Massage Therapy, Physiotherapy, and Chiropractic Care.`;
        });
        
        return `Found ${formattedLocations.length} clinic locations near postal code ${postalCode}:\n\n${formattedLocations.join('\n\n')}`;
      } else {
        return `No clinic locations found near postal code ${postalCode}. Please call our main office for assistance.`;
      }
    } catch (error) {
      console.error('Error finding location:', error);
      return `I'm having trouble accessing our location database right now. Please call our main office or try again in a moment.`;
    }
  }

  async getAllLocations() {
    try {
      console.log('Getting all MedRehab Group locations');
      
      const branches = await this.executeApiCall('/branches', 'GET');
      const locationList = branches.list || branches.data || [];
      
      if (locationList && locationList.length > 0) {
        const formattedLocations = locationList.map(location => {
          const name = location.name.includes('MedRehab') ? location.name : `MedRehab Group ${location.name}`;
          return `${name} - ${location.address || 'Address not available'}, ${location.city || 'City not available'} ${location.postal || 'Postal code not available'}. Phone: ${location.phone || 'Phone not available'}. Services: Massage Therapy, Physiotherapy, and Chiropractic Care.`;
        });
        
        return `We have ${formattedLocations.length} MedRehab Group locations:\n\n${formattedLocations.join('\n\n')}`;
      } else {
        return `I'm having trouble accessing our location information right now. Please call our main office for current locations and contact details.`;
      }
    } catch (error) {
      console.error('Error getting all locations:', error);
      return `I'm having trouble accessing our location database right now. Please call our main office for current locations.`;
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
  console.log('Health check accessed');
  res.json({
    status: 'MedRehab Group Vapi Server Running',
    version: '3.0.0',
    endpoints: ['/mcp', '/vapi/tools/call', '/health'],
    authentic_data: true,
    vapi_compatible: true,
    last_request: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  console.log('Health endpoint accessed');
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Log all requests middleware
app.use('/vapi/tools/call', (req, res, next) => {
  console.log('=== VAPI REQUEST RECEIVED ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('=== END REQUEST LOG ===');
  next();
});

// MCP protocol endpoint for backward compatibility
app.post('/mcp', async (req, res) => {
  try {
    const juvonnoServer = new JuvonnoMCPServer();
    const { method, params } = req.body;
    
    if (method === 'tools/list') {
      const result = {
        tools: [
          {
            name: 'medrehab_locations',
            description: 'Get all MedRehab Group clinic locations and addresses',
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          },
          {
            name: 'find_location_by_postal_code',
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
        case 'medrehab_locations':
          result = await juvonnoServer.getAllLocations();
          break;
        case 'find_location_by_postal_code':
        case 'findLocationByPostalCode':
          result = await juvonnoServer.findLocationByPostalCode(args.postal_code);
          break;
        case 'get_all_locations':
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
              text: result
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

// Vapi-compatible endpoint that handles multiple request formats
app.post('/vapi/tools/call', async (req, res) => {
  try {
    console.log('=== PROCESSING VAPI REQUEST ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    
    const juvonnoServer = new JuvonnoMCPServer();
    
    // Handle direct Vapi Tool Test format (simple object with tool_name)
    if (req.body.tool_name) {
      const { tool_name, postal_code } = req.body;
      
      console.log(`DIRECT TOOL TEST - tool_name: ${tool_name}, postal_code: ${postal_code}`);
      
      let result;
      switch (tool_name) {
        case 'findLocationByPostalCode':
          if (!postal_code) {
            result = 'I need a postal code to find the nearest clinic location. Please provide your postal code.';
          } else {
            console.log('Calling findLocationByPostalCode with postal_code:', postal_code);
            result = await juvonnoServer.findLocationByPostalCode(postal_code);
          }
          break;
          
        case 'getAllLocations':
          console.log('Calling getAllLocations');
          result = await juvonnoServer.getAllLocations();
          break;
          
        default:
          result = `I don't understand the request: ${tool_name}. Please ask about our locations or provide a postal code.`;
      }
      
      console.log('DIRECT RESULT LENGTH:', result.length);
      console.log('DIRECT RESULT PREVIEW:', result.substring(0, 200) + '...');
      
      const response = {
        content: [{ type: "text", text: result }]
      };
      
      console.log('SENDING DIRECT RESPONSE:', JSON.stringify(response, null, 2));
      return res.json(response);
    }
    
    // Handle MCP protocol format
    const { method, params } = req.body;
    console.log('MCP FORMAT - method:', method, 'params:', JSON.stringify(params));
    
    if (method === 'tools/call') {
      const { name, arguments: args } = params;
      console.log('TOOL CALL - name:', name, 'args:', JSON.stringify(args));
      
      // Handle Vapi's wrapper function format
      if (name === 'findMedRehabLocation') {
        const { tool_name, postal_code } = args;
        
        console.log(`WRAPPER CALL - tool_name: ${tool_name}, postal_code: ${postal_code}`);
        
        let result;
        switch (tool_name) {
          case 'findLocationByPostalCode':
            if (!postal_code) {
              result = 'I need a postal code to find the nearest clinic location. Please provide your postal code.';
            } else {
              console.log('Calling findLocationByPostalCode with postal_code:', postal_code);
              result = await juvonnoServer.findLocationByPostalCode(postal_code);
            }
            break;
            
          case 'getAllLocations':
            console.log('Calling getAllLocations');
            result = await juvonnoServer.getAllLocations();
            break;
            
          default:
            result = `I don't understand the request: ${tool_name}. Please ask about our locations or provide a postal code.`;
        }
        
        console.log('WRAPPER RESULT LENGTH:', result.length);
        console.log('WRAPPER RESULT PREVIEW:', result.substring(0, 200) + '...');
        
        const response = {
          content: [{ type: "text", text: result }]
        };
        
        console.log('SENDING WRAPPER RESPONSE:', JSON.stringify(response, null, 2));
        return res.json(response);
      }
      
      // Handle direct tool calls
      console.log('DIRECT TOOL CALL');
      let result;
      switch (name) {
        case 'findLocationByPostalCode':
          result = await juvonnoServer.findLocationByPostalCode(args.postal_code);
          break;
        case 'getAllLocations':
          result = await juvonnoServer.getAllLocations();
          break;
        default:
          result = `Unknown tool: ${name}`;
      }
      
      const response = {
        content: [{ type: "text", text: result }]
      };
      
      console.log('SENDING DIRECT TOOL RESPONSE:', JSON.stringify(response, null, 2));
      return res.json(response);
    }
    
    console.log('UNRECOGNIZED FORMAT - REQUEST BODY:', JSON.stringify(req.body));
    const errorResponse = {
      content: [{ type: "text", text: "Invalid request format - please check the request structure" }]
    };
    console.log('SENDING ERROR RESPONSE:', JSON.stringify(errorResponse, null, 2));
    res.json(errorResponse);
  } catch (error) {
    console.error('VAPI ENDPOINT ERROR:', error);
    const errorResponse = {
      content: [{ type: "text", text: `I'm having trouble accessing our systems right now. Please try again in a moment.` }]
    };
    console.log('SENDING EXCEPTION RESPONSE:', JSON.stringify(errorResponse, null, 2));
    res.json(errorResponse);
  }
});

// Function endpoints for Vapi Function tools
app.post('/get-locations', async (req, res) => {
  try {
    console.log('Function: Get locations request received');
    
    const juvonnoServer = new JuvonnoMCPServer();
    const result = await juvonnoServer.getAllLocations();
    
    return res.json({
      success: true,
      message: result
    });
  } catch (error) {
    console.error('Get locations error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/find-location', async (req, res) => {
  try {
    const { postal_code } = req.body;
    console.log(`Function: Find location request for postal code: ${postal_code}`);
    
    if (!postal_code) {
      return res.status(400).json({
        success: false,
        error: 'postal_code is required'
      });
    }
    
    const juvonnoServer = new JuvonnoMCPServer();
    const result = await juvonnoServer.findLocationByPostalCode(postal_code);
    
    return res.json({
      success: true,
      message: result
    });
  } catch (error) {
    console.error('Find location error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`MedRehab Group Vapi Server running on port ${port}`);
  console.log(`Function endpoints: /get-locations, /find-location`);
});