# SafeRoute API Specification

## Architecture Overview

SafeRoute is a real-time safety routing application that combines multiple data sources and AI to provide users with the safest routes. The system integrates:

- **Routing**: OSRM (Open Source Routing Machine) public API
- **Traffic Data**: TomTom Traffic Flow API
- **CCTV Data**: OpenStreetMap Overpass API
- **Infrastructure Data**: OpenStreetMap Overpass API
- **AI Service**: Python FastAPI + YOLOv8 for image-based detection
- **Real-time**: Socket.IO for live companion tracking and SOS alerts

---

## Safety Score Calculation

```
SafetyScore = 0.4 × TrafficScore + 0.3 × CCTVScore + 0.3 × CrowdScore
```

### Score Components

1. **TrafficScore (40% weight)** - From TomTom Traffic API
   - 100 = Free flow (no traffic)
   - 75-99 = Light traffic
   - 50-74 = Moderate traffic
   - 0-49 = Heavy congestion

2. **CCTVScore (30% weight)** - From OpenStreetMap Overpass API
   - Based on actual CCTV camera count along route
   - Formula: (camera_count / 5) × 10, max 100
   - Each 5 cameras adds 10% to score

3. **CrowdScore (30% weight)** - From Infrastructure Density
   - Based on public infrastructure presence (hospitals, police, fire stations)
   - Formula: (infrastructure_count / 3) × 10, max 100
   - More infrastructure = busier area = potentially safer

---

## REST API Endpoints

### Route Calculation

#### POST `/api/route`
Calculate safest route between two points

**Request:**
```json
{
  "start_lat": 37.7749,
  "start_lon": -122.4194,
  "end_lat": 37.8044,
  "end_lon": -122.2712
}
```

**Response:**
```json
{
  "geometry": {
    "type": "LineString",
    "coordinates": [[lon, lat], ...]
  },
  "distance": 15.4,
  "duration": 24.5,
  "safety_score": 78.5,
  "traffic_score": 82.0,
  "cctv_score": 75.0,
  "crowd_score": 71.0,
  "route_type": "safest",
  "unsafe_segments": []
}
```

### Location Search

#### GET `/api/geocode?query=...&limit=5`
Search locations using Nominatim (OpenStreetMap)

**Response:**
```json
[
  {
    "lat": "37.7749",
    "lon": "-122.4194",
    "display_name": "San Francisco, California",
    "address": {...}
  }
]
```

### CCTV Cameras

#### GET `/api/cctv?min_lon=X&min_lat=Y&max_lon=X&max_lat=Y`
Get CCTV cameras in bounding box

**Response:**
```json
{
  "type": "FeatureCollection",
  "count": 23,
  "source": "OpenStreetMap (Overpass API)",
  "features": [
    {
      "type": "Feature",
      "geometry": {"type": "Point", "coordinates": [lon, lat]},
      "properties": {"id": 123, "type": "cctv"}
    }
  ]
}
```

### Public Infrastructure

#### GET `/api/infrastructure?min_lon=X&min_lat=Y&max_lon=X&max_lat=Y`
Get public infrastructure in bounding box

**Response:**
```json
{
  "type": "FeatureCollection",
  "count": 8,
  "source": "OpenStreetMap (Overpass API)",
  "features": [
    {
      "type": "Feature",
      "geometry": {"type": "Point", "coordinates": [lon, lat]},
      "properties": {
        "id": 456,
        "type": "hospital",
        "name": "General Hospital"
      }
    }
  ]
}
```

### Traffic Data

#### GET `/api/traffic?lon=X&lat=Y&radius=1.0`
Get traffic data for a location

**Response:**
```json
{
  "location": {"lon": -122.4194, "lat": 37.7749},
  "traffic_score": 82.5,
  "status": "Light traffic",
  "note": "Real-time data from TomTom API"
}
```

### Companions

#### POST `/api/companions`
Register as an active companion on a route

**Request:**
```json
{
  "name": "Alice",
  "user_id": "user_123",
  "route": {
    "destination": "Work",
    "distance": 5.2,
    "duration": 15
  },
  "current_location": {"lat": 37.7749, "lon": -122.4194}
}
```

#### GET `/api/companions?user_id=...`
Get list of active companions

### SOS Emergency Alert

#### POST `/api/sos`
Send emergency SOS alert with location, route, and user profile

**Request:**
```json
{
  "user_id": "user_123",
  "location": {"lat": 37.7749, "lon": -122.4194, "accuracy": 10},
  "route": {
    "destination": "Work",
    "distance": 5.2,
    "companions": ["user_456"]
  },
  "message": "Emergency - Help needed!"
}
```

**Response:**
```json
{
  "id": "sos_alert_uuid",
  "user_id": "user_123",
  "location": {"lat": 37.7749, "lon": -122.4194},
  "route": {...},
  "message": "Emergency - Help needed!",
  "timestamp": "2025-12-17T10:30:00Z",
  "user_profile": {
    "name": "Alice Johnson",
    "phone": "+1-555-0123",
    "emergency_contacts": [...],
    "health_info": {},
    "medical_conditions": []
  },
  "active_route": {
    "destination": "Work",
    "start_location": {...},
    "estimated_arrival": "10:45",
    "companions": ["user_456"]
  }
}
```

### AI/YOLOv8 Detection

#### POST `/api/yolo/detect`
Detect CCTV cameras and objects in street images using YOLOv8

**Request:**
```json
{
  "image_url": "https://example.com/street_image.jpg",
  "location": {"lat": 37.7749, "lon": -122.4194}
}
```

**Response:**
```json
{
  "success": true,
  "detection_id": "detection_uuid",
  "detections": [
    {
      "class": "camera",
      "confidence": 0.87,
      "bbox": [245, 120, 310, 180]
    },
    {
      "class": "person",
      "confidence": 0.92,
      "bbox": [100, 50, 200, 400]
    }
  ],
  "detection_count": 2,
  "max_confidence": 0.92,
  "source": "YOLOv8"
}
```

#### POST `/api/yolo/confirm/{detection_id}`
User confirms a CCTV detection

**Response:**
```json
{
  "detection_id": "detection_uuid",
  "confirmations": 5,
  "verified": false
}
```

---

## Socket.IO Events

### Real-time Communication

#### Event: `user_presence`
Register user presence with location and route info

**Emit:**
```json
{
  "user_id": "user_123",
  "location": {"lat": 37.7749, "lon": -122.4194},
  "route": {
    "destination": "Work",
    "distance": 5.2,
    "duration": 15,
    "safety_score": 78.5
  }
}
```

#### Event: `location_update`
Send real-time location updates

**Emit:**
```json
{
  "user_id": "user_123",
  "location": {
    "lat": 37.7749,
    "lon": -122.4194,
    "accuracy": 10
  }
}
```

**Receive (from server):**
```json
{
  "user_id": "other_user",
  "location": {...}
}
```

#### Event: `find_companions`
Find nearby companions on similar routes

**Emit:**
```json
{
  "user_id": "user_123",
  "location": {"lat": 37.7749, "lon": -122.4194},
  "route": {
    "destination": "Work",
    "waypoints": [...]
  },
  "max_distance_km": 1.0
}
```

**Receive:**
```json
{
  "user_id": "user_123",
  "count": 3,
  "companions": [
    {
      "user_id": "user_456",
      "distance_km": 0.45,
      "location": {...},
      "route": {...}
    }
  ]
}
```

#### Event: `companions_list`
Broadcast updated list of all online companions

**Receive:**
```json
{
  "companions": [
    {
      "user_id": "user_123",
      "location": {...},
      "route": {...},
      "last_seen": "2025-12-17T10:30:00Z"
    }
  ]
}
```

#### Event: `sos_alert`
Emergency SOS alert broadcast to all connected clients

**Receive:**
```json
{
  "id": "sos_alert_uuid",
  "user_id": "user_123",
  "location": {"lat": 37.7749, "lon": -122.4194},
  "route": {...},
  "message": "Emergency - Help needed!",
  "timestamp": "2025-12-17T10:30:00Z",
  "user_profile": {...},
  "active_route": {...}
}
```

#### Event: `companion_location_update`
Real-time location update from a specific companion

**Receive:**
```json
{
  "user_id": "user_456",
  "location": {"lat": 37.7800, "lon": -122.2700}
}
```

#### Event: `companion_offline`
Notification when a companion goes offline

**Receive:**
```json
{
  "user_id": "user_456"
}
```

---

## Configuration

### Environment Variables

```bash
# API Keys
TOMTOM_API_KEY=your_tomtom_api_key
MAPILLARY_CLIENT_ID=your_mapillary_client_id

# Database
MONGO_URL=mongodb://localhost:27017
DB_NAME=saferoute

# Server
CORS_ORIGINS=http://localhost:3000,http://localhost:5000
```

### TomTom API Setup

1. Get API key from https://developer.tomtom.com/
2. Set `TOMTOM_API_KEY` environment variable
3. Endpoint used: `https://api.tomtom.com/traffic/services/4/flowSegmentData/relative/10/json`

### YOLOv8 Installation

```bash
pip install ultralytics torch torchvision opencv-python
```

The system will use YOLOv8 nano model (`yolov8n.pt`) for optimal performance.

---

## Data Flow

### Route Planning
1. User enters source and destination
2. Frontend calls `/api/route` with coordinates
3. Backend:
   - Fetches routes from OSRM (alternatives=true)
   - Evaluates each route with safety scoring
   - For each route:
     - Queries TomTom Traffic API for traffic score
     - Queries Overpass API for CCTV count → calculates CCTV score
     - Queries Overpass API for infrastructure → calculates crowd score
     - Calculates final safety score: 0.4×traffic + 0.3×cctv + 0.3×crowd
   - Returns safest route, or shortest as fallback
4. Frontend displays route with markers, layers, and metrics
5. User can toggle CCTV/Infrastructure layers for detailed view

### Companion Matching
1. User registers presence via Socket.IO `user_presence` event
2. User requests companions via `find_companions` event
3. Backend:
   - Looks at all active users
   - Calculates distance from user's location
   - Returns nearby companions within max_distance_km
   - Sorts by proximity
4. Frontend displays companion list with distance and route info
5. Real-time updates via `location_update` events

### Emergency Response (SOS)
1. User taps SOS button with emergency message
2. Frontend calls `/api/sos` with:
   - Current location with accuracy
   - Active route details
   - User ID and message
3. Backend:
   - Creates SOS alert record
   - Fetches user profile (emergency contacts, health info)
   - Fetches active route details
   - Broadcasts via Socket.IO `sos_alert` event to all connected clients
   - Nearby companions receive alert with full context
4. Companions can see exact location, route, and user info to provide help

---

## Data Sources Attribution

- **Routing**: © OpenStreetMap contributors via OSRM
- **Traffic**: © TomTom
- **CCTV/Infrastructure**: © OpenStreetMap contributors via Overpass API
- **Map Tiles**: © OpenStreetMap contributors
- **Geocoding**: © Nominatim (OpenStreetMap)
- **AI Models**: YOLOv8 by Ultralytics

---

## Future Enhancements

1. **Real TomTom Integration**: Currently supports API endpoints, just needs API key configuration
2. **Mapillary Integration**: Load street view images for YOLO detection
3. **Crowd API Integration**: Real crowd density from mobile data
4. **ML Model Training**: Train custom YOLO models for better camera detection
5. **Route Caching**: Cache common routes to reduce API calls
6. **User Reputation**: Verified CCTV locations from community confirmations
7. **Emergency Services Integration**: Direct dispatch to nearby authorities on SOS
