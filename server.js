const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// MedRehab Group clinic data
const locations = [
  {
    name: "MedRehab Group Richmond Hill",
    address: "955 Major Mackenzie Dr. West, Unit 106, Vaughan L6A 4P9",
    phone: "(905) 417-4499",
    services: "Massage Therapy, Physiotherapy, and Chiropractic Care",
    postal_code: "L6A"
  },
  {
    name: "MedRehab Group Brampton",
    address: "10 Earlsbridge Blvd, Brampton L7A 3P1",
    phone: "(905) 970-0101",
    services: "Massage Therapy, Physiotherapy, and Chiropractic Care",
    postal_code: "L7A"
  },
  {
    name: "MedRehab Group Georgetown",
    address: "99 Sinclair Ave #110, Halton Hills L7G 5G1",
    phone: "(905) 877-5900",
    services: "Massage Therapy, Physiotherapy, and Chiropractic Care",
    postal_code: "L7G"
  },
  {
    name: "MedRehab Group Pickering",
    address: "1105 Kingston Rd #11, Pickering L1V 1B5",
    phone: "(905) 837-5000",
    services: "Massage Therapy, Physiotherapy, and Chiropractic Care",
    postal_code: "L1V"
  },
  {
    name: "MedRehab Group Toronto",
    address: "1670 Dufferin St. Suite B03, Toronto M6H 3M2",
    phone: "(416) 656-6800",
    services: "Massage Therapy, Physiotherapy, and Chiropractic Care",
    postal_code: "M6H"
  },
  {
    name: "MedRehab Group Woodbridge",
    address: "8333 Weston Rd., Woodbridge L4L 8E2",
    phone: "(905) 264-6311",
    services: "Massage Therapy, Physiotherapy, and Chiropractic Care",
    postal_code: "L4L"
  },
  {
    name: "MedRehab Group Hamilton",
    address: "631 Queenston Road, Suite 302, Hamilton L8K 6R5",
    phone: "(905) 561-6500",
    services: "Massage Therapy, Physiotherapy, and Chiropractic Care",
    postal_code: "L8K"
  },
  {
    name: "MedRehab Group North York",
    address: "1275 Finch Avenue West, North York M3J 2B1",
    phone: "(416) 628-8858",
    services: "Massage Therapy, Physiotherapy, and Chiropractic Care",
    postal_code: "M3J"
  },
  {
    name: "MedRehab Group Vaughan",
    address: "10395 Weston Rd., Woodbridge L4H 3T4",
    phone: "905-265-8966",
    services: "Massage Therapy, Physiotherapy, and Chiropractic Care",
    postal_code: "L4H"
  },
  {
    name: "MedRehab Group Concord",
    address: "80 Bass Pro Mills Drive, Concord L4K 5W9",
    phone: "905-798-1165",
    services: "Massage Therapy, Physiotherapy, and Chiropractic Care",
    postal_code: "L4K"
  },
  {
    name: "MedRehab Group Newmarket",
    address: "181 Green Ln East #2 East Gwillimbury, East Gwillimbury L9N 0C9",
    phone: "289-319-0867",
    services: "Massage Therapy, Physiotherapy, and Chiropractic Care",
    postal_code: "L9N"
  },
  {
    name: "MedRehab Brampton West",
    address: "305 Royal West Drive Unit H, Brampton L6X5K8",
    phone: "647-925-6833",
    services: "Massage Therapy, Physiotherapy, and Chiropractic Care",
    postal_code: "L6X"
  }
];

function formatAllLocations() {
  return locations.map((loc, index) => 
    `${index + 1}. ${loc.name} - ${loc.address}. Phone: ${loc.phone}. Services: ${loc.services}.`
  ).join('\n\n');
}

function findLocationByPostal(postalCode) {
  const code = postalCode.toUpperCase().substring(0, 3);
  const matches = locations.filter(loc => loc.postal_code.startsWith(code));
  
  if (matches.length === 0) {
    return `No MedRehab Group locations found near postal code ${postalCode}. Here are all our locations:\n\n${formatAllLocations()}`;
  }
  
  return matches.map((loc, index) => 
    `${index + 1}. ${loc.name} - ${loc.address}. Phone: ${loc.phone}. Services: ${loc.services}.`
  ).join('\n\n');
}

// Basic authentication check
function checkAuth(req) {
  const authHeader = req.headers.authorization;
  return authHeader && authHeader === 'Bearer 9e4ce8c2-e125-4657-bb2b-4ac9c82dc123';
}

// MCP protocol endpoint
app.post('/mcp', async (req, res) => {
  try {
    if (!checkAuth(req)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('MCP Request:', JSON.stringify(req.body, null, 2));
    
    const { method, params } = req.body;
    
    if (method === 'tools/list') {
      return res.json({
        jsonrpc: '2.0',
        id: req.body.id || 1,
        result: {
          tools: [
            {
              name: 'medrehab_locations',
              description: 'Get all MedRehab Group clinic locations',
              inputSchema: {
                type: 'object',
                properties: {},
                required: []
              }
            },
            {
              name: 'find_location_by_postal_code',
              description: 'Find MedRehab clinics near a postal code',
              inputSchema: {
                type: 'object',
                properties: {
                  postal_code: {
                    type: 'string',
                    description: 'Canadian postal code (e.g., L1V 1B5)'
                  }
                },
                required: ['postal_code']
              }
            }
          ]
        }
      });
    }
    
    if (method === 'tools/call') {
      const { name, arguments: args } = params;
      let result;
      
      switch (name) {
        case 'medrehab_locations':
          result = `We have 12 MedRehab Group locations:\n\n${formatAllLocations()}`;
          break;
        case 'find_location_by_postal_code':
          result = findLocationByPostal(args.postal_code || '');
          break;
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
      
      return res.json({
        jsonrpc: '2.0',
        id: req.body.id || 1,
        result: {
          content: [{ type: 'text', text: result }]
        }
      });
    }
    
    return res.status(400).json({
      jsonrpc: '2.0',
      id: req.body.id || 1,
      error: { code: -32601, message: `Unknown method: ${method}` }
    });
    
  } catch (error) {
    console.error('MCP Error:', error);
    return res.status(500).json({
      jsonrpc: '2.0',
      id: req.body.id || 1,
      error: { code: -32603, message: error.message }
    });
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'MedRehab MCP Server Running',
    tools: ['medrehab_locations', 'find_location_by_postal_code']
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`MedRehab MCP Server running on port ${port}`);
});