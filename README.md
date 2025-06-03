# MedRehab Group MCP Client

A TypeScript MCP (Model Context Protocol) client that provides authentic MedRehab Group clinic location data for voice assistants and AI applications.

## Features

- **getAllLocations**: Returns all 12 MedRehab Group clinic locations
- **findLocationByPostalCode**: Find clinics near a specific postal code
- **findMedRehabLocation**: Alias for getAllLocations (compatible with existing Vapi configurations)

## Installation

```bash
npm install
npm run build
```

## Usage

### For Zapier MCP Platform

1. Upload this TypeScript client to Zapier MCP
2. Select "TypeScript" as the client type
3. Configure your AI assistant to use these tools:
   - `ZapierFindAll` - Get all clinic locations
   - `ZapierPostalCodeSearch` - Search by postal code

### Tools Available

#### ZapierFindAll
Returns all 12 authentic MedRehab Group clinic locations with:
- Clinic name and address
- Phone number for booking
- Available services (Massage Therapy, Physiotherapy, Chiropractic Care)
- Postal codes for location reference

#### ZapierPostalCodeSearch
Search for clinics near a postal code:
- Exact postal code matching
- Forward Sortation Area (FSA) matching for broader area search
- Returns nearby clinics or all locations if none found nearby

## Data Source

All clinic data is authentic and sourced directly from MedRehab Group's current locations:
- 12 active clinic locations across Ontario
- Real addresses and phone numbers
- Current service offerings
- Accurate postal codes for location services

## Integration with Voice Assistants

This MCP client is designed to work seamlessly with:
- Vapi voice assistants
- OpenAI function calling
- Claude and other AI assistants
- Zapier automation workflows

The client ensures consistent, reliable access to authentic clinic information during voice conversations and automated workflows.