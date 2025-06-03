const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// MedRehab Group location data
const locations = [
  {
    id: 1,
    name: "MedRehab Group Richmond Hill",
    address: "955 Major Mackenzie Dr. West, Unit 106, Vaughan L6A 4P9",
    phone: "(905) 417-4499",
    services: "Massage Therapy, Physiotherapy, and Chiropractic Care",
    postalCode: "L6A4P9"
  },
  {
    id: 2,
    name: "MedRehab Group Brampton",
    address: "10 Earlsbridge Blvd, Brampton L7A 3P1",
    phone: "(905) 970-0101",
    services: "Massage Therapy, Physiotherapy, and Chiropractic Care",
    postalCode: "L7A3P1"
  },
  {
    id: 3,
    name: "MedRehab Group Georgetown",
    address: "99 Sinclair Ave #110, Halton Hills L7G 5G1",
    phone: "(905) 877-5900",
    services: "Massage Therapy, Physiotherapy, and Chiropractic Care",
    postalCode: "L7G5G1"
  },
  {
    id: 4,
    name: "MedRehab Group Pickering",
    address: "1105 Kingston Rd #11, Pickering L1V 1B5",
    phone: "(905) 837-5000",
    services: "Massage Therapy, Physiotherapy, and Chiropractic Care",
    postalCode: "L1V1B5"
  },
  {
    id: 5,
    name: "MedRehab Group Toronto",
    address: "1670 Dufferin St. Suite B03, Toronto M6H 3M2",
    phone: "(416) 656-6800",
    services: "Massage Therapy, Physiotherapy, and Chiropractic Care",
    postalCode: "M6H3M2"
  },
  {
    id: 6,
    name: "MedRehab Group Woodbridge",
    address: "8333 Weston Rd., Woodbridge L4L 8E2",
    phone: "(905) 264-6311",
    services: "Massage Therapy, Physiotherapy, and Chiropractic Care",
    postalCode: "L4L8E2"
  },
  {
    id: 7,
    name: "MedRehab Group Hamilton",
    address: "631 Queenston Road, Suite 302, Hamilton L8K 6R5",
    phone: "(905) 561-6500",
    services: "Massage Therapy, Physiotherapy, and Chiropractic Care",
    postalCode: "L8K6R5"
  },
  {
    id: 8,
    name: "MedRehab Group North York",
    address: "1275 Finch Avenue West, North York M3J 2B1",
    phone: "(416) 628-8858",
    services: "Massage Therapy, Physiotherapy, and Chiropractic Care",
    postalCode: "M3J2B1"
  },
  {
    id: 9,
    name: "MedRehab Group Vaughan",
    address: "10395 Weston Rd., Woodbridge L4H 3T4",
    phone: "905-265-8966",
    services: "Massage Therapy, Physiotherapy, and Chiropractic Care",
    postalCode: "L4H3T4"
  },
  {
    id: 10,
    name: "MedRehab Group Concord",
    address: "80 Bass Pro Mills Drive, Concord L4K 5W9",
    phone: "905-798-1165",
    services: "Massage Therapy, Physiotherapy, and Chiropractic Care",
    postalCode: "L4K5W9"
  },
  {
    id: 11,
    name: "MedRehab Group Newmarket",
    address: "181 Green Ln East #2 East Gwillimbury, East Gwillimbury L9N 0C9",
    phone: "289-319-0867",
    services: "Massage Therapy, Physiotherapy, and Chiropractic Care",
    postalCode: "L9N0C9"
  },
  {
    id: 12,
    name: "MedRehab Brampton West",
    address: "305 Royal West Drive Unit H, Brampton L6X5K8",
    phone: "647-925-6833",
    services: "Massage Therapy, Physiotherapy, and Chiropractic Care",
    postalCode: "L6X5K8"
  }
];

// Function endpoints for Vapi Function tools
app.post('/get-locations', async (req, res) => {
  try {
    console.log('=== GET LOCATIONS CALLED ===');
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    const locationList = locations.map(loc => 
      `${loc.name} - ${loc.address}. Phone: ${loc.phone}. Services: ${loc.services}.`
    ).join('\n\n');
    
    const result = `We have 12 MedRehab Group locations:\n\n${locationList}`;
    
    console.log('Returning result (first 100 chars):', result.substring(0, 100) + '...');
    
    // Set Vapi token header for authentication
    res.setHeader('VAPI_TOKEN', '00683124-9b47-4bba-a4a6-ac58c14dc6d9');
    res.setHeader('Authorization', 'Bearer 00683124-9b47-4bba-a4a6-ac58c14dc6d9');
    
    // Return in "content" field as expected by system prompt
    return res.json({
      content: result,
      success: true
    });
  } catch (error) {
    console.error('Get locations error:', error);
    res.setHeader('VAPI_TOKEN', '00683124-9b47-4bba-a4a6-ac58c14dc6d9');
    return res.status(500).json({
      error: error.message
    });
  }
});

app.post('/find-location', async (req, res) => {
  try {
    const { postal_code } = req.body;
    console.log('=== FIND LOCATION CALLED ===');
    console.log(`Postal code: ${postal_code}`);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));
    
    if (!postal_code) {
      res.setHeader('VAPI_TOKEN', '00683124-9b47-4bba-a4a6-ac58c14dc6d9');
      return res.status(400).json({
        error: 'postal_code is required'
      });
    }
    
    // Clean postal code for comparison
    const cleanInput = postal_code.replace(/\s+/g, '').toUpperCase();
    
    // Find nearby locations (simplified logic)
    const nearbyLocations = locations.filter(loc => {
      const locCode = loc.postalCode.replace(/\s+/g, '').toUpperCase();
      // Simple proximity check based on first 3 characters
      return locCode.substring(0, 3) === cleanInput.substring(0, 3);
    });
    
    let result;
    if (nearbyLocations.length > 0) {
      const locationList = nearbyLocations.map(loc => 
        `${loc.name} - ${loc.address}. Phone: ${loc.phone}. Services: ${loc.services}.`
      ).join('\n\n');
      result = `Found ${nearbyLocations.length} clinic location(s) near postal code ${postal_code}:\n\n${locationList}`;
    } else {
      result = `No MedRehab Group clinics found near postal code ${postal_code}. Would you like to see all our locations?`;
    }
    
    console.log('Returning result (first 100 chars):', result.substring(0, 100) + '...');
    
    // Set Vapi token header for authentication
    res.setHeader('VAPI_TOKEN', '00683124-9b47-4bba-a4a6-ac58c14dc6d9');
    res.setHeader('Authorization', 'Bearer 00683124-9b47-4bba-a4a6-ac58c14dc6d9');
    
    // Return in "content" field as expected by system prompt
    return res.json({
      content: result,
      success: true
    });
  } catch (error) {
    console.error('Find location error:', error);
    res.setHeader('VAPI_TOKEN', '00683124-9b47-4bba-a4a6-ac58c14dc6d9');
    return res.status(500).json({
      error: error.message
    });
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'MedRehab Group Vapi Server is running with authentication' });
});

// Additional health checks for Function tools
app.get('/get-locations', (req, res) => {
  console.log('GET request to /get-locations');
  res.json({ message: 'Use POST method for this endpoint' });
});

app.get('/find-location', (req, res) => {
  console.log('GET request to /find-location');
  res.json({ message: 'Use POST method for this endpoint' });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`MedRehab Group Vapi Server running on port ${port}`);
  console.log('Using VAPI_TOKEN: 00683124-9b47-4bba-a4a6-ac58c14dc6d9');
  console.log('Returning authentic MedRehab Group clinic data');
});