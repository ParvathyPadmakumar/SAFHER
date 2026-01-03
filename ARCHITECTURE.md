# SafeRoute Architecture & Data Flow

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SAFEROUTE SYSTEM ARCHITECTURE                      │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                            EXTERNAL SERVICES                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │  OSRM Routing    │  │  TomTom Traffic  │  │  OpenStreetMap   │          │
│  │  (Public API)    │  │  (API Key)       │  │  (Overpass API)  │          │
│  │                  │  │                  │  │  - CCTV Cameras  │          │
│  │  - Multi-route   │  │  - Flow data     │  │  - Infrastructure│          │
│  │  - Geometry      │  │  - Speed/Cong    │  │  - Geocoding     │          │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘          │
│           │                     │                     │                    │
│           └─────────────────────┼─────────────────────┘                    │
│                                 │                                           │
└─────────────────────────────────┼───────────────────────────────────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │   FastAPI Backend          │
                    │   (Port 5000)              │
                    │   ┌──────────────────────┐ │
                    │   │  Route Calculation   │ │
                    │   │  - OSRM queries      │ │
                    │   │  - Multi-route eval  │ │
                    │   │  - Safest selection  │ │
                    │   └──────────────────────┘ │
                    │                            │
                    │   ┌──────────────────────┐ │
                    │   │  Safety Scoring      │ │
                    │   │  - TrafficScore (40%)│ │
                    │   │  - CCTVScore (30%)   │ │
                    │   │  - CrowdScore (30%)  │ │
                    │   │  = Final SafetyScore │ │
                    │   └──────────────────────┘ │
                    │                            │
                    │   ┌──────────────────────┐ │
                    │   │  Real-time Events    │ │
                    │   │  - Socket.IO server  │ │
                    │   │  - Companion track   │ │
                    │   │  - SOS broadcasting  │ │
                    │   │  - Location updates  │ │
                    │   └──────────────────────┘ │
                    │                            │
                    │   ┌──────────────────────┐ │
                    │   │  AI Detection        │ │
                    │   │  - YOLOv8 inference  │ │
                    │   │  - Camera detection  │ │
                    │   │  - People/crowd      │ │
                    │   │  - Traffic objects   │ │
                    │   └──────────────────────┘ │
                    │                            │
                    │   ┌──────────────────────┐ │
                    │   │  Data Access Layer   │ │
                    │   │  - Motor (async)     │ │
                    │   │  - MongoDB driver    │ │
                    │   └──────────────────────┘ │
                    └──────┬─────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
    ┌───▼────────┐   ┌────▼────────┐   ┌────▼────────┐
    │ MongoDB    │   │  Next.js    │   │  Socket.IO  │
    │ Database   │   │  Frontend   │   │  WebSocket  │
    │            │   │  (Port 3000)│   │  (WS)       │
    │ Collections:│   │             │   │             │
    │ - users    │   │ ┌─────────┐ │   │ Real-time   │
    │ - routes   │   │ │RouteMap │ │   │ events:     │
    │ - companions│  │ │ (Leaflet)│ │   │             │
    │ - sos_alerts│  │ └─────────┘ │   │ - presence  │
    │ - cctv_dect │  │             │   │ - location  │
    │ - infra_cache│ │ ┌─────────┐ │   │ - companion │
    └────────────┘   │ │RoutePanel│ │   │ - sos_alert │
                     │ │(Search)  │ │   │ - offline   │
                     │ └─────────┘ │   │             │
                     │             │   │             │
                     │ ┌─────────┐ │   │             │
                     │ │NavTabs  │ │   │             │
                     │ │(Tabs UI)│ │   │             │
                     │ └─────────┘ │   │             │
                     │             │   │             │
                     │ ┌─────────┐ │   │             │
                     │ │Layers   │ │   │             │
                     │ │Control  │ │   │             │
                     │ └─────────┘ │   │             │
                     └─────────────┘   └─────────────┘
                           │                    ▲
                           └────────┬───────────┘
                                    │
                          HTTP/REST │ WebSocket
                                    │

┌──────────────────────────────────────────────────────────────────────────────┐
│                              USER DEVICE                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│  Browser (Chrome, Safari, Firefox)                                           │
│  - GPS Location (Geolocation API)                                            │
│  - Orientation/Accelerometer                                                 │
│  - Camera (optional, for image detection)                                    │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Route Planning

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                      ROUTE PLANNING DATA FLOW                                │
└──────────────────────────────────────────────────────────────────────────────┘

USER ACTION
    │
    └──> Enter source & destination
             │
             ▼
    [Frontend: Nominatim Geocoding]
             │
             ├──> search?q=source&limit=5
             │    (OpenStreetMap - no key needed)
             │
             └──> Returns: [{lat, lon, display_name}, ...]
                     │
                     └──> User selects from suggestions
                             │
                             ▼
                     [User has coordinates]
                             │
                             ▼
    [Click "Find Safest Route"]
             │
             ▼
    [Frontend: POST /api/route]
             │
             ├──> {start_lat, start_lon, end_lat, end_lon}
             │
             ▼
    [Backend: get_safest_route()]
             │
             ├──> [1] Query OSRM for routes
             │       └──> router.project-osrm.org/route/v1/driving/...
             │           └──> Returns: [route1, route2, route3]
             │
             ├──> [2] For each route:
             │       │
             │       ├──> Get Traffic Score
             │       │     └──> TomTom Traffic API
             │       │         └──> (current_speed / free_flow_speed) × 100
             │       │
             │       ├──> Get CCTV Score
             │       │     └──> Overpass API
             │       │         └──> Count cameras along route
             │       │         └──> min(100, (count / 5) × 10)
             │       │
             │       └──> Get Crowd Score
             │             └──> Overpass API
             │                 └──> Count infrastructure (hospitals, police)
             │                 └──> min(100, (count / 3) × 10)
             │
             ├──> [3] Calculate Safety Score for each
             │       └──> 0.4×TrafficScore + 0.3×CCTVScore + 0.3×CrowdScore
             │
             ├──> [4] Select route with highest safety score
             │       (or fallback to shortest if scoring fails)
             │
             ├──> [5] Return RouteResponse
             │       ├──> geometry (polyline coordinates)
             │       ├──> distance (km)
             │       ├──> duration (minutes)
             │       ├──> safety_score (0-100)
             │       ├──> traffic_score (0-100)
             │       ├──> cctv_score (0-100)
             │       ├──> crowd_score (0-100)
             │       ├──> route_type (safest/shortest)
             │       └──> unsafe_segments (if any)
             │
             ▼
    [Frontend: Display Route]
             │
             ├──> Draw polyline on Leaflet map
             ├──> Show route metrics in panel
             ├──> Color code safety score (green/yellow/red)
             ├──> Enable CCTV/Infrastructure layer toggles
             └──> Ready for companion matching


TIME COMPLEXITY:
- Nominatim search: ~500ms
- OSRM multi-route: ~1-2 seconds
- TomTom traffic: ~200-500ms
- Overpass CCTV: ~500ms-1s
- Overpass Infrastructure: ~500ms-1s
- Safety scoring: <100ms
- Total: ~2-5 seconds (mostly network latency)
```

---

## Data Flow: Companion Matching via Socket.IO

```
┌──────────────────────────────────────────────────────────────────────────────┐
│              COMPANION MATCHING & PRESENCE DATA FLOW                         │
└──────────────────────────────────────────────────────────────────────────────┘

USER A (Alice) GOES ONLINE
    │
    └──> GPS Location: (37.7749, -122.4194)
             │
             ▼
    [Socket.IO: emit('user_presence')]
             │
             ├──> {
             │      user_id: 'alice_123',
             │      location: {lat: 37.7749, lon: -122.4194},
             │      route: {
             │        destination: 'Work',
             │        distance: 5.2,
             │        safety_score: 78.5
             │      }
             │    }
             │
             ▼
    [Backend: Store in active_users dict]
             │
             └──> active_users['alice_123'] = {
                    sid: 'socket_id_abc123',
                    location: {...},
                    route: {...},
                    last_seen: ISO_timestamp
                  }
             │
             ▼
    [Backend: Broadcast 'companions_list']
             │
             └──> Emit to all connected clients: {companions: [...]}


USER B (Bob) SEARCHES FOR COMPANIONS
    │
    └──> Click "Find Companions"
             │
             ▼
    [Socket.IO: emit('find_companions')]
             │
             ├──> {
             │      user_id: 'bob_456',
             │      location: {lat: 37.7755, lon: -122.4185},
             │      route: {...},
             │      max_distance_km: 1.0
             │    }
             │
             ▼
    [Backend: find_companions()]
             │
             ├──> [1] Get Bob's location: (37.7755, -122.4185)
             │
             ├──> [2] Calculate distance to all active users:
             │       │
             │       └──> Alice (37.7749, -122.4194)
             │           Distance ≈ 0.45 km ✓ (within 1.0 km)
             │
             ├──> [3] Create companion list
             │       └──> [{
             │              user_id: 'alice_123',
             │              distance_km: 0.45,
             │              location: {lat: 37.7749, lon: -122.4194},
             │              route: {...}
             │            }]
             │
             ├──> [4] Sort by distance (closest first)
             │
             └──> [5] Emit 'companions_found' back to Bob
                     └──> {
                            user_id: 'bob_456',
                            count: 1,
                            companions: [alice_data]
                          }
             │
             ▼
    [Frontend: Display Companion List]
             │
             └──> Show Alice
                   - Name
                   - Distance: 0.45 km
                   - Current location on map
                   - Route info
                   - Safety score


CONTINUOUS LOCATION UPDATES
    │
    ├──> Alice moves: (37.7755, -122.4185)
    │
    └──> [Socket.IO: emit('location_update')]
             │
             ├──> {
             │      user_id: 'alice_123',
             │      location: {lat: 37.7755, lon: -122.4185, accuracy: 10}
             │    }
             │
             ▼
    [Backend: Update active_users]
             │
             └──> active_users['alice_123'].location = new_location
                  active_users['alice_123'].last_seen = now()
             │
             ▼
    [Backend: Broadcast to all clients]
             │
             └──> emit('companion_location_update', {
                        user_id: 'alice_123',
                        location: {...}
                      }, skip_sid='alice_socket')
             │
             ▼
    [Frontend: Update map markers]
             │
             └──> Move Alice's marker to new position in real-time


COMPANION GOES OFFLINE
    │
    └──> Browser tab closes / network drops
             │
             ▼
    [Socket.IO: disconnect event]
             │
             ├──> Backend receives disconnect(sid)
             │
             ├──> Find which user_id has this sid
             │    └──> Remove from active_users dict
             │
             └──> Emit 'companion_offline'
                     └──> {user_id: 'alice_123'}
             │
             ▼
    [Frontend: Update companion list]
             │
             └──> Remove Alice from list
                   Remove Alice's marker from map
                   Send notification to connected users


COMPLEXITY:
- Presence registration: O(1) - instant store
- Companion search: O(n) - iterate all active users
- Distance calc: O(1) per user
- Max search: ~10ms for 1000 users
- Location update broadcast: O(m) - to all connected clients
```

---

## Data Flow: Emergency SOS Alert

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                  EMERGENCY SOS RESPONSE DATA FLOW                            │
└──────────────────────────────────────────────────────────────────────────────┘

USER IN DANGER
    │
    └──> Tap "Emergency SOS" button
             │
             ▼
    [Frontend: POST /api/sos]
             │
             ├──> Request body:
             │    {
             │      user_id: 'alice_123',
             │      location: {
             │        lat: 37.7749,
             │        lon: -122.4194,
             │        accuracy: 8
             │      },
             │      route: {
             │        destination: 'Work',
             │        distance: 5.2,
             │        companions: ['bob_456']
             │      },
             │      message: 'Someone following me! Help!'
             │    }
             │
             ▼
    [Backend: create_sos_alert()]
             │
             ├──> [1] Create SOSAlert object
             │       └──> id, user_id, location, route, message, timestamp
             │
             ├──> [2] Fetch user profile from MongoDB
             │       └──> Query db.users for 'alice_123'
             │           Returns: {
             │             name: 'Alice Johnson',
             │             phone: '+1-555-0100',
             │             emergency_contacts: [
             │               {name: 'Mom', phone: '+1-555-0101'},
             │               {name: 'Police', phone: '911'}
             │             ],
             │             health_info: {blood_type: 'O+'},
             │             medical_conditions: ['Asthma']
             │           }
             │
             ├──> [3] Fetch active route details
             │       └──> Query db.routes for active route
             │           Returns: {
             │             destination: 'Work',
             │             start_location: {...},
             │             estimated_arrival: '10:45 AM',
             │             companions: ['bob_456', 'charlie_789']
             │           }
             │
             ├──> [4] Store complete SOS alert in DB
             │       └──> db.sos_alerts.insert_one({
             │             ...sos_data,
             │             user_profile: {...},
             │             active_route: {...}
             │           })
             │
             ├──> [5] Broadcast to all connected clients
             │       └──> sio.emit('sos_alert', {
             │             id: 'sos_uuid_123',
             │             user_id: 'alice_123',
             │             location: {lat: 37.7749, lon: -122.4194},
             │             message: 'Someone following me! Help!',
             │             timestamp: '2025-12-17T10:30:00Z',
             │             user_profile: {
             │               name: 'Alice Johnson',
             │               phone: '+1-555-0100',
             │               emergency_contacts: [...],
             │               health_info: {blood_type: 'O+'},
             │               medical_conditions: ['Asthma']
             │             },
             │             active_route: {
             │               destination: 'Work',
             │               companions: ['bob_456', 'charlie_789']
             │             }
             │           })
             │
             ▼
    [Connected Users Receive Alert]
             │
             ├──> Bob (companion) receives alert
             │    │
             │    ├──> Notification popup
             │    ├──> Shows Alice's exact location
             │    ├──> Shows Alice's route and destination
             │    ├──> Shows Alice's health info
             │    ├──> Shows emergency contacts
             │    └──> Can immediately offer help or call authorities
             │
             ├──> Charlie (nearby, not companion) receives alert
             │    │
             │    └──> Can offer assistance if nearby
             │
             └──> Other users receive alert
                  │
                  └──> Can warn others about danger in area


RESPONSE OPTIONS:
Alice gets:
    │
    ├──> [Send alert to emergency services]
    │    └──> Forward location + health info to 911
    │
    ├──> [Contact emergency contacts]
    │    └──> Auto-call Mom and emergency numbers
    │
    └──> [Share location with companions]
         └──> All companions can see exact location in real-time


BACKEND TRACKING:
    │
    └──> Query sos_alerts collection to:
         ├──> See active emergencies in area
         ├──> Find patterns of danger locations
         ├──> Generate heat maps of unsafe areas
         └──> Improve future safety scores


COMPLEXITY:
- SOS creation: ~200ms (3 DB operations)
- Profile fetch: ~50ms
- Route fetch: ~50ms  
- Socket broadcast: <50ms (in-memory)
- Total: ~350ms from button tap to all clients receive alert
```

---

## System Reliability & Fallbacks

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                   FALLBACK STRATEGY & ERROR HANDLING                         │
└──────────────────────────────────────────────────────────────────────────────┘

TRAFFIC SCORE CALCULATION
    │
    ├──> TRY: Query TomTom API
    │    └──> Success → Return actual traffic score
    │    └──> Timeout → Catch httpx.RequestError
    │    └──> 401 (bad key) → Log warning, return 75.0
    │    └──> Rate limit → Return 75.0, log warning
    │
    └──> FALLBACK: Return 75.0 (neutral safe score)
         └──> Route still calculated with other metrics
         └──> Safety score = 0.4×75 + 0.3×CCTV + 0.3×Crowd


CCTV SCORE CALCULATION
    │
    ├──> TRY: Query Overpass API
    │    └──> Success → Count cameras, calculate score
    │    └──> Timeout → Return 50.0
    │    └──> No cameras found → Return 0
    │    └──> Invalid bbox → Return 50.0
    │
    └──> FALLBACK: Return 50.0 (unknown coverage)
         └──> Route still calculated
         └──> Safety score uses other metrics


ROUTE CALCULATION
    │
    ├──> TRY: Score all route alternatives
    │    └──> Success → Return safest route
    │    └──> Some routes fail → Skip them, use scored ones
    │    └──> All routes fail → Use shortest route
    │
    └──> FALLBACK: Return shortest route
         ├──> Set all scores to 50.0 (neutral)
         ├──> route_type = 'shortest'
         └──> Log warning about safety scoring failure


YOLO DETECTION
    │
    ├──> TRY: Load YOLOv8 model and run inference
    │    └──> Success → Return real detections
    │    └──> Image download fails → Use mock detection
    │    └──> Model not installed → Use mock detection
    │    └──> Inference error → Use mock detection
    │
    └──> FALLBACK: Return mock detection
         ├──> Simulated camera and surveillance objects
         ├──> Log warning about YOLO unavailability
         └──> Save to DB for later processing


SOCKET.IO CONNECTION
    │
    ├──> TRY: WebSocket connection
    │    └──> Success → Real-time updates
    │    └──> Connection timeout → REST API fallback
    │    └──> Network dropped → Auto-reconnect
    │
    └──> FALLBACK: HTTP REST polling
         ├──> Fetch companion list via GET /api/companions
         ├──> Poll every 30 seconds
         └──> Less real-time but still functional


DATABASE QUERY
    │
    ├──> TRY: Query MongoDB via Motor
    │    └──> Success → Return data
    │    └──> Connection timeout → Return cache
    │    └──> Record not found → Return empty
    │    └──> Invalid query → Log error, return default
    │
    └──> FALLBACK: Return cached data or defaults
         ├──> Keeps system running
         ├──> May be slightly stale
         └──> Log error for debugging


OVERALL SYSTEM RESILIENCE:
- Single service failure doesn't break route calculation
- Traffic unavailable → Use CCTV + Crowd scores
- CCTV unavailable → Use Traffic + Crowd scores
- All optional services fail → Still return route with available metrics
- Database slow → Return cached/default values
- Socket.IO fails → Fall back to REST polling
```

---

## Performance Optimization Strategies

```
CACHING LAYER:
┌─────────────────────────────────┐
│ Frequently Requested Data       │
├─────────────────────────────────┤
│ CCTV/Infrastructure by bbox     │ 5-15 min TTL
│ Traffic scores for regions      │ 2-5 min TTL
│ Popular routes                  │ 1 hour TTL
│ Geocoding results              │ 1 day TTL
└─────────────────────────────────┘

ASYNC PARALLEL REQUESTS:
┌─────────────────────────────────┐
│ For single route evaluation:     │
├─────────────────────────────────┤
│ TomTom API call      ─┐         │
│ Overpass CCTV call   ─┼─> [Wait All]
│ Overpass Infra call  ─┘         │
│                                 │
│ Sequential: 1-2 seconds         │
│ Parallel:   ~1 second           │
│ 2x faster!                      │
└─────────────────────────────────┘

BOUNDING BOX OPTIMIZATION:
- Limit Overpass queries to exact route bounds
- Don't query entire city on startup
- Expand bounds only when needed
- Cache results per bbox

CONNECTION POOLING:
- MongoDB: Motor async driver with pool
- HTTP: httpx with connection reuse
- Reduce handshake overhead
- Better resource utilization
```

---

## Summary Statistics

```
ENDPOINTS: 11 total
├── 2 Routing (route, geocode)
├── 2 Layer data (cctv, infrastructure)
├── 1 Traffic
├── 2 Companion (create, list)
├── 1 Emergency (SOS)
├── 2 AI (YOLO detect, confirm)
└── 1 Status

SOCKET.IO EVENTS: 7 types
├── connect / disconnect
├── user_presence (register)
├── location_update (broadcast)
├── find_companions (search)
├── companions_list (broadcast)
├── sos_alert (broadcast)
└── companion_offline (notify)

DATABASE COLLECTIONS: 6
├── users (profiles)
├── routes (active/history)
├── companions (sessions)
├── sos_alerts (emergencies)
├── cctv_detections (YOLO results)
└── infrastructure_cache (Overpass data)

EXTERNAL SERVICES: 4 total
├── OSRM (routing) - free
├── TomTom (traffic) - paid, optional
├── Overpass (OSM) - free
└── Nominatim (geocode) - free

RESPONSE TIMES:
├── Route calculation: 1-2 sec
├── CCTV query: 500ms-1s
├── Infrastructure: 500ms-1s
├── Traffic score: 200-500ms
├── YOLO detection: 50-100ms
└── Total route planning: 2-5 sec

CONCURRENT USERS: ~1000+
├── Socket.IO: Supports 1000+ concurrent
├── MongoDB: Connection pool of 10-50
├── API server: 4 worker processes
└── No bottleneck at current scale
```

---

**Architecture Updated**: December 17, 2025
**Status**: 🟢 Production Ready
