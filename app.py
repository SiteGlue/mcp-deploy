import os
from flask import Flask, request, jsonify

app = Flask(__name__)

# MedRehab Group clinic data
LOCATIONS = [
    {
        "name": "MedRehab Group Richmond Hill",
        "address": "955 Major Mackenzie Dr. West, Unit 106, Vaughan L6A 4P9",
        "phone": "(905) 417-4499",
        "services": "Massage Therapy, Physiotherapy, and Chiropractic Care",
        "postal_code": "L6A"
    },
    {
        "name": "MedRehab Group Brampton",
        "address": "10 Earlsbridge Blvd, Brampton L7A 3P1",
        "phone": "(905) 970-0101",
        "services": "Massage Therapy, Physiotherapy, and Chiropractic Care",
        "postal_code": "L7A"
    },
    {
        "name": "MedRehab Group Georgetown",
        "address": "99 Sinclair Ave #110, Halton Hills L7G 5G1",
        "phone": "(905) 877-5900",
        "services": "Massage Therapy, Physiotherapy, and Chiropractic Care",
        "postal_code": "L7G"
    },
    {
        "name": "MedRehab Group Pickering",
        "address": "1105 Kingston Rd #11, Pickering L1V 1B5",
        "phone": "(905) 837-5000",
        "services": "Massage Therapy, Physiotherapy, and Chiropractic Care",
        "postal_code": "L1V"
    },
    {
        "name": "MedRehab Group Toronto",
        "address": "1670 Dufferin St. Suite B03, Toronto M6H 3M2",
        "phone": "(416) 656-6800",
        "services": "Massage Therapy, Physiotherapy, and Chiropractic Care",
        "postal_code": "M6H"
    },
    {
        "name": "MedRehab Group Woodbridge",
        "address": "8333 Weston Rd., Woodbridge L4L 8E2",
        "phone": "(905) 264-6311",
        "services": "Massage Therapy, Physiotherapy, and Chiropractic Care",
        "postal_code": "L4L"
    },
    {
        "name": "MedRehab Group Hamilton",
        "address": "631 Queenston Road, Suite 302, Hamilton L8K 6R5",
        "phone": "(905) 561-6500",
        "services": "Massage Therapy, Physiotherapy, and Chiropractic Care",
        "postal_code": "L8K"
    },
    {
        "name": "MedRehab Group North York",
        "address": "1275 Finch Avenue West, North York M3J 2B1",
        "phone": "(416) 628-8858",
        "services": "Massage Therapy, Physiotherapy, and Chiropractic Care",
        "postal_code": "M3J"
    },
    {
        "name": "MedRehab Group Vaughan",
        "address": "10395 Weston Rd., Woodbridge L4H 3T4",
        "phone": "905-265-8966",
        "services": "Massage Therapy, Physiotherapy, and Chiropractic Care",
        "postal_code": "L4H"
    },
    {
        "name": "MedRehab Group Concord",
        "address": "80 Bass Pro Mills Drive, Concord L4K 5W9",
        "phone": "905-798-1165",
        "services": "Massage Therapy, Physiotherapy, and Chiropractic Care",
        "postal_code": "L4K"
    },
    {
        "name": "MedRehab Group Newmarket",
        "address": "181 Green Ln East #2 East Gwillimbury, East Gwillimbury L9N 0C9",
        "phone": "289-319-0867",
        "services": "Massage Therapy, Physiotherapy, and Chiropractic Care",
        "postal_code": "L9N"
    },
    {
        "name": "MedRehab Brampton West",
        "address": "305 Royal West Drive Unit H, Brampton L6X5K8",
        "phone": "647-925-6833",
        "services": "Massage Therapy, Physiotherapy, and Chiropractic Care",
        "postal_code": "L6X"
    }
]

def check_auth():
    """Check Bearer token authentication"""
    auth_header = request.headers.get('Authorization')
    return auth_header == 'Bearer 9e4ce8c2-e125-4657-bb2b-4ac9c82dc123'

@app.after_request
def after_request(response):
    """Add CORS headers"""
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

@app.route('/', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "MedRehab Location API Running",
        "endpoints": ["/get-locations", "/find-location"],
        "locations_count": len(LOCATIONS)
    })

@app.route('/get-locations', methods=['POST', 'OPTIONS'])
def get_all_locations():
    """Get all MedRehab Group locations"""
    if request.method == 'OPTIONS':
        return '', 200
        
    if not check_auth():
        return jsonify({"error": "Unauthorized"}), 401
    
    print(f"Get locations request received")
    
    # Format locations as readable text
    location_text = "We have 12 MedRehab Group locations:\n\n"
    for loc in LOCATIONS:
        location_text += f"{loc['name']} - {loc['address']}. Phone: {loc['phone']}. Services: {loc['services']}.\n\n"
    
    return jsonify({
        "success": True,
        "message": location_text.strip()
    })

@app.route('/find-location', methods=['POST', 'OPTIONS'])
def find_location_by_postal():
    """Find locations near a postal code"""
    if request.method == 'OPTIONS':
        return '', 200
        
    if not check_auth():
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.json or {}
    postal_code = data.get('postal_code', '')
    
    print(f"Find location request for postal code: {postal_code}")
    
    if not postal_code:
        return jsonify({
            "success": False,
            "error": "postal_code is required"
        }), 400
    
    # Search by postal code prefix
    code_prefix = postal_code.upper().replace(' ', '')[:3]
    matches = [loc for loc in LOCATIONS if loc['postal_code'].startswith(code_prefix)]
    
    if not matches:
        # Return all locations if no match
        location_text = f"No MedRehab Group locations found near postal code {postal_code}. Here are all our locations:\n\n"
        for loc in LOCATIONS:
            location_text += f"{loc['name']} - {loc['address']}. Phone: {loc['phone']}. Services: {loc['services']}.\n\n"
    else:
        location_text = f"MedRehab Group locations near {postal_code}:\n\n"
        for loc in matches:
            location_text += f"{loc['name']} - {loc['address']}. Phone: {loc['phone']}. Services: {loc['services']}.\n\n"
    
    return jsonify({
        "success": True,
        "message": location_text.strip()
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)