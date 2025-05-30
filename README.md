# MedRehab Group MCP Server - Fixed Version

This deployment package contains a working MCP server with authentic MedRehab Group clinic data.

## Fixed Issues
- Removed problematic MCP SDK dependency that was causing MODULE_NOT_FOUND errors
- Simplified to use only Express.js for HTTP endpoints
- Maintains all authentic clinic location functionality

## Endpoints
- GET / - Health check and server info
- GET /tools/list - List available MCP tools
- POST /tools/call - Execute MCP tools
- POST /mcp - MCP protocol endpoint

## Deployment
1. Extract files to your Heroku app directory
2. Deploy using git push or Heroku CLI
3. Server will start automatically on the assigned port

## Features
- 12 authentic MedRehab Group clinic locations
- Voice input postal code matching
- Real phone numbers and addresses from Juvonno API