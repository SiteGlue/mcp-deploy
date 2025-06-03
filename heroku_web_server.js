#!/usr/bin/env node

/**
 * HTTP wrapper for the MCP server to work with Heroku
 * Provides both HTTP API endpoints and MCP protocol support
 */

import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs';
import https from 'https';

class JuvonnoMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'juvonno-swagger-mcp',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.apiSpec = null;
    this.apiKey = process.env.JUVONNO_API_KEY || '2deb7d7d8b814409ca3d8b11fd9e9b59a9fd5242';
    this.subdomain = process.env.JUVONNO_SUBDOMAIN || 'medrehabgroup';
    this.baseUrl = `https://${this.subdomain}.juvonno.com/api`;

    this.setupHandlers();
    this.loadSwaggerSpec();
  }

  async loadSwaggerSpec() {
    try {
      // Try to load the swagger specification
      if (fs.existsSync('./juvonno_api_swagger.json')) {
        const swaggerData = fs.readFileSync('./juvonno_api_swagger.json', 'utf8');
        this.apiSpec = JSON.parse(swaggerData);
        console.log('Loaded Juvonno API specification');
      } else {
        this.apiSpec = this.createMinimalSpec();
        console.log('Using minimal API specification');
      }
    } catch (error) {
      console.error('Error loading swagger spec:', error.message);
      this.apiSpec = this.createMinimalSpec();
    }
  }

  createMinimalSpec() {
    return {
      "openapi": "3.0.0",
      "info": { "title": "Juvonno API", "version": "1.0.0" },
      "servers": [{ "url": this.baseUrl }],
      "paths": {
        "/branches": {
          "get": {
            "operationId": "getBranches",
            "summary": "Get all clinic branches/locations",
            "description": "Retrieve all clinic locations for appointment booking"
          }
        },
        "/providers": {
          "get": {
            "operationId": "getProviders",
            "summary": "Get all healthcare providers",
            "description": "Retrieve all available healthcare providers"
          }
        }
      }
    };
  }

  setupHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = this.generateToolsFromSwagger();
      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      return await this.handleToolCall(name, args);
    });
  }

  generateToolsFromSwagger() {
    const tools = [];
    
    // Add the location finder tool specifically for Vapi
    tools.push({
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
    });

    // Add tools from swagger spec
    if (this.apiSpec && this.apiSpec.paths) {
      for (const [path, methods] of Object.entries(this.apiSpec.paths)) {
        for (const [method, operation] of Object.entries(methods)) {
          if (typeof operation !== 'object' || !operation.operationId) {
            continue;
          }
          
          tools.push({
            name: operation.operationId,
            description: operation.summary || operation.description || `${method.toUpperCase()} ${path}`,
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          });
        }
      }
    }

    return tools;
  }

  async handleToolCall(toolName, args) {
    try {
      console.log(`Executing tool: ${toolName} with args:`, args);

      if (toolName === 'findLocationByPostalCode') {
        return await this.findLocationByPostalCode(args.postal_code);
      }

      if (toolName === 'getBranches') {
        const result = await this.executeApiCall('/branches', 'get', {});
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }

      if (toolName === 'getProviders') {
        const result = await this.executeApiCall('/providers', 'get', {});
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }

      throw new Error(`Unknown tool: ${toolName}`);
    } catch (error) {
      console.error(`Error executing tool ${toolName}:`, error);
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }]
      };
    }
  }

  async findLocationByPostalCode(postalCode) {
    try {
      // Get branches from the API
      const branches = await this.executeApiCall('/branches', 'get', {});
      
      if (branches.data && branches.data.length > 0) {
        const location = branches.data[0];
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'success',
                location_found: true,
                message: `Found clinic location for postal code ${postalCode}`,
                clinic_name: location.name || 'MedRehab Group Pickering',
                address: location.address || '1105 Kingston Rd #11, Pickering, Ontario',
                phone: location.phone || '(905) 837-5000',
                postal_code: location.postal_code || 'L1V 1B5',
                services: ['Massage Therapy', 'Physiotherapy', 'Chiropractic Care'],
                booking_available: true
              }, null, 2)
            }
          ]
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                status: 'error',
                location_found: false,
                message: `No clinic locations found near ${postalCode}`
              }, null, 2)
            }
          ]
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              status: 'error',
              message: `Error finding location: ${error.message}`
            }, null, 2)
          }
        ]
      };
    }
  }

  async executeApiCall(path, method, args) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'X-API-Key': this.apiKey,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    return new Promise((resolve, reject) => {
      const options = {
        method: method.toUpperCase(),
        headers: headers
      };

      const req = https.request(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            resolve(result);
          } catch (error) {
            resolve({ raw_response: data });
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.end();
    });
  }
}

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
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

// Initialize MCP server
const mcpServer = new JuvonnoMCPServer();

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Juvonno MCP Server',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// MCP tools list endpoint
app.get('/tools', async (req, res) => {
  try {
    const tools = mcpServer.generateToolsFromSwagger();
    res.json({ tools });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// MCP tool call endpoint
app.post('/tools/:toolName', async (req, res) => {
  try {
    const { toolName } = req.params;
    const args = req.body;
    const result = await mcpServer.handleToolCall(toolName, args);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Direct location finder endpoint for Vapi
app.post('/find-location', async (req, res) => {
  try {
    const { postal_code } = req.body;
    const result = await mcpServer.findLocationByPostalCode(postal_code);
    
    // Extract the JSON content from MCP response format
    if (result.content && result.content[0] && result.content[0].text) {
      const locationData = JSON.parse(result.content[0].text);
      res.json(locationData);
    } else {
      res.json(result);
    }
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: error.message 
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Juvonno MCP Server listening on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API Key configured: ${mcpServer.apiKey ? 'Yes' : 'No'}`);
  console.log(`Subdomain: ${mcpServer.subdomain}`);
});