# Setup Guide for SafeRoute

## Prerequisites

- Node.js 18+ (for Next.js frontend)
- Python 3.9+ (for FastAPI backend)
- MongoDB (for database)
- TomTom API Key (for real traffic data)

## Installation

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Frontend Setup

```bash
# From root directory
npm install
```

### 3. Environment Configuration

Create a `.env` file in the backend directory:

```bash
# MongoDB
MONGO_URL=mongodb://localhost:27017
DB_NAME=saferoute

# TomTom API (Get from https://developer.tomtom.com/)
TOMTOM_API_KEY=your_tomtom_api_key_here

# Mapillary API (Optional, for street images)
MAPILLARY_CLIENT_ID=your_mapillary_client_id_here

# CORS Configuration
CORS_ORIGINS=http://localhost:3000,http://localhost:5000
```

Create `.env.local` in the frontend directory:

```bash
# Frontend environment - these are automatically loaded
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

## Running the Application

### 1. Start MongoDB

```bash
# If using local MongoDB
mongod
```

### 2. Start Backend Server

```bash
cd backend
python -m uvicorn server:app --reload --host 0.0.0.0 --port 5000
```

Backend will be available at: `http://localhost:5000`

API documentation: `http://localhost:5000/docs` (Swagger UI)

### 3. Start Frontend Server

```bash
npm run dev
```

Frontend will be available at: `http://localhost:3000`

## TomTom API Integration Guide

### Getting TomTom API Key

1. Visit https://developer.tomtom.com/
2. Sign up for a free account
3. Create a new API key in the dashboard
4. Copy the key and add to `.env` file

### Supported TomTom Endpoints Used

#### Traffic Flow API
- **Endpoint**: `https://api.tomtom.com/traffic/services/4/flowSegmentData/relative/10/json`
- **Method**: GET
- **Parameters**:
  - `point`: Latitude,Longitude (location to check traffic)
  - `key`: Your API key
- **Response**: Current traffic speed, free flow speed, congestion info
- **Rate Limit**: 60 requests per minute (free tier)

### Traffic Score Calculation

The backend converts TomTom traffic data to a 0-100 safety score:

```python
traffic_score = (current_speed / free_flow_speed) × 100
```

- 100 = No congestion (free flow)
- 75-99 = Light traffic (safe conditions)
- 50-74 = Moderate traffic (caution advised)
- 0-49 = Heavy congestion (risky conditions)

## Data Source Integration

### CCTV Data (OpenStreetMap)

No API key needed. Automatically fetches from Overpass API:

```
Endpoint: https://overpass-api.de/api/interpreter
Query: Surveillance cameras and CCTV nodes from OSM
Rate: No strict limits, ~1-2 seconds per query
```

### Infrastructure Data (OpenStreetMap)

Fetches hospitals, police stations, fire stations, ambulance stations:

```
Endpoint: https://overpass-api.de/api/interpreter
Query: Amenities and emergency services from OSM
Rate: No strict limits, ~1-2 seconds per query
```

### Routing (OSRM)

No API key needed. Uses public OSRM servers:

```
Endpoint: http://router.project-osrm.org/route/v1/driving/
Features: Multiple route alternatives, full geometry, turn restrictions
```

### Geocoding (Nominatim)

No API key needed. Uses public Nominatim servers:

```
Endpoint: https://nominatim.openstreetmap.org/
Features: Address search, reverse geocoding
Rate: ~1 request per second
```

## YOLOv8 Setup

### Installation

```bash
pip install ultralytics torch torchvision opencv-python
```

### First Run

The system will automatically download the YOLOv8 nano model (~50MB) on first use.

### Supported Object Detection

The system detects:
- `camera` - Security/surveillance cameras
- `person` - People (for crowd detection)
- `traffic light` - Traffic controls
- `car`, `truck`, `motorcycle` - Vehicles

### Model Performance

- **Model**: YOLOv8 Nano (yolov8n.pt)
- **Size**: ~50MB (lightweight)
- **Inference Time**: ~50ms per image
- **Accuracy**: High confidence for cameras and people
- **Hardware**: CPU or GPU supported

## Architecture Overview

### Frontend (Next.js + React)
- **Location**: `/app`
- **Route Planning UI**: RoutePanel.jsx (location search, route display)
- **Map Display**: RouteMap.tsx (Leaflet with OpenStreetMap)
- **Navigation**: NavigationTabs.jsx (Map, Companions, Emergency, Profile)
- **Styling**: Tailwind CSS v4

### Backend (FastAPI)
- **Location**: `/backend/server.py`
- **Routing**: OSRM + Safety Scoring
- **Traffic**: TomTom API integration
- **CCTV/Infrastructure**: Overpass API queries
- **AI**: YOLOv8 image detection
- **Real-time**: Socket.IO for companions and SOS

### Database (MongoDB)
- **Collections**:
  - `users` - User profiles and preferences
  - `routes` - Active and historical routes
  - `companions` - Active companion sessions
  - `sos_alerts` - Emergency alert records
  - `cctv_detections` - YOLO detection history

## Safety Score Calculation

```
SafetyScore = 0.4 × TrafficScore + 0.3 × CCTVScore + 0.3 × CrowdScore
```

### TrafficScore (40%)
- From TomTom Traffic API
- Speed-based calculation
- 100 = free flow, 0 = severe congestion

### CCTVScore (30%)
- From OpenStreetMap CCTV locations
- Formula: min(100, (count / 5) × 10)
- More cameras = higher score

### CrowdScore (30%)
- From infrastructure density (hospitals, police, fire)
- Formula: min(100, (count / 3) × 10)
- More facilities = busier area = potentially safer

## Troubleshooting

### Backend Won't Start

```
Error: ModuleNotFoundError: No module named 'motor'
Solution: pip install motor
```

### TomTom API 401 Error

```
Error: 401 Unauthorized
Solution: Check TOMTOM_API_KEY is correctly set in .env
```

### Overpass API Timeout

```
Error: Request timeout from Overpass API
Solution: Use bounding box limiting, try again after 1-2 seconds
```

### YOLO Model Download Fails

```
Error: Could not download yolov8n.pt
Solution: Download manually: python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"
```

### Socket.IO Connection Issues

```
Error: WebSocket connection failed
Solution: Ensure backend is running, check CORS_ORIGINS includes frontend URL
```

## Testing the System

### 1. Test Route Calculation

```bash
curl -X POST http://localhost:5000/api/route \
  -H "Content-Type: application/json" \
  -d '{
    "start_lat": 37.7749,
    "start_lon": -122.4194,
    "end_lat": 37.8044,
    "end_lon": -122.2712
  }'
```

### 2. Test CCTV Layer

```bash
curl "http://localhost:5000/api/cctv?min_lon=-122.5&min_lat=37.7&max_lon=-122.3&max_lat=37.9"
```

### 3. Test Infrastructure Layer

```bash
curl "http://localhost:5000/api/infrastructure?min_lon=-122.5&min_lat=37.7&max_lon=-122.3&max_lat=37.9"
```

### 4. Test SOS Alert

```bash
curl -X POST http://localhost:5000/api/sos \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test_user",
    "location": {"lat": 37.7749, "lon": -122.4194},
    "message": "Test emergency"
  }'
```

## Production Deployment

### Backend (Uvicorn + Gunicorn)

```bash
# Install Gunicorn
pip install gunicorn

# Run with multiple workers
gunicorn -w 4 -k uvicorn.workers.UvicornWorker server:app --bind 0.0.0.0:5000
```

### Frontend (Next.js Build)

```bash
npm run build
npm run start
```

### Database Optimization

- Create indexes on frequently queried fields
- Enable MongoDB connection pooling
- Set up regular backups

### Caching

- Cache CCTV/infrastructure queries (5-15 min TTL)
- Cache traffic scores (2-5 min TTL)
- Cache route calculations for common paths

## Performance Optimization

### Backend
- Use async/await throughout
- Cache Overpass API responses
- Limit concurrent OSRM requests
- Use connection pooling for MongoDB

### Frontend
- Lazy load map components
- Cache route data client-side
- Debounce location update events
- Use virtual scrolling for long lists

## Security Considerations

1. **API Rate Limiting**: Implement per-IP rate limiting
2. **Authentication**: Add user auth before SOS/companion features
3. **Data Validation**: Validate all coordinates and inputs
4. **CORS**: Limit to specific origins in production
5. **TomTom Key**: Never expose in frontend, only use from backend
6. **HTTPS**: Use SSL/TLS in production
7. **Database**: Enable authentication on MongoDB in production

## Support & Resources

- **OSRM Docs**: https://project-osrm.org/docs/v5.24.0/api/
- **TomTom API**: https://developer.tomtom.com/
- **Overpass API**: https://wiki.openstreetmap.org/wiki/Overpass_API
- **YOLOv8 Docs**: https://docs.ultralytics.com/
- **Socket.IO**: https://socket.io/docs/v4/
- **FastAPI**: https://fastapi.tiangolo.com/
- **Leaflet**: https://leafletjs.com/

---

**Last Updated**: December 17, 2025
