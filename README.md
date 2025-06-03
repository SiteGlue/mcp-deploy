# MedRehab Group MCP Server

This MCP server provides access to authentic MedRehab Group clinic locations via the Juvonno API.

## Features
- Authentic clinic data from 12 MedRehab Group locations
- Voice input postal code matching (handles "L 1 V 1 B 5" format)
- Two main functions:
  - `findLocationByPostalCode`: Find nearest clinic by postal code
  - `getAllLocations`: Get all clinic locations

## Deployment
1. Deploy to Heroku using the provided files
2. The server runs on HTTP for Heroku compatibility
3. Use the `/mcp` endpoint for MCP protocol communication

## Testing
Health check: GET /
MCP endpoint: POST /mcp

## Data Source
Connected to medrehabgroup.juvonno.com with authentic clinic information.