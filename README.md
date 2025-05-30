# MedRehab Group MCP Server for Vapi Integration

This server provides proper MCP protocol support for Vapi with authentic MedRehab Group clinic data.

## Vapi Requirements Met
- ✅ Authorization: Bearer YOUR_VAPI_API_KEY support
- ✅ MCP format with tools/list and tools/call methods
- ✅ Dynamic tool and action request handling
- ✅ Publicly accessible HTTPS endpoint at /mcp

## Endpoints
- POST /mcp - Main MCP endpoint for Vapi (requires Bearer token)
- GET / - Health check and server info
- GET /tools/list - Legacy compatibility
- POST /tools/call - Legacy compatibility

## Authentication
The server requires Authorization: Bearer <VAPI_API_KEY> header for the /mcp endpoint.

## Deployment
Deploy to Heroku and configure Vapi to use: https://your-app.herokuapp.com/mcp

## Data Source
Connected to authentic MedRehab Group clinic data via Juvonno API.