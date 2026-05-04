# GetMySHP — Administrative Boundary Download Portal

> "Every boundary tells a story. Knowledge of the land should be free."

A full-stack GIS web portal for browsing, previewing, and downloading administrative
boundary shapefiles of India — from Country → State → District → Taluka → Village.

---

## PROJECT STRUCTURE

```
gis-portal/
├── backend/
│   ├── data/
│   │   ├── admin0.json     ← Country level
│   │   ├── admin1.json     ← State level
│   │   ├── admin2.json     ← District level
│   │   ├── admin3.json     ← Taluka level
│   │   └── admin4.json     ← Village level
│   ├── routes/
│   │   ├── auth.js
│   │   └── gis.js
│   ├── server.js
│   └── package.json
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── context/AuthContext.js
    │   ├── pages/AuthPage.js
    │   ├── pages/Dashboard.js
    │   ├── App.js
    │   └── index.js
    └── package.json
```

---

## ══════════════════════════════════════════════════
## STEP 1 — CONVERT YOUR SHAPEFILES TO GEOJSON
## (THE MOST IMPORTANT STEP)
## ══════════════════════════════════════════════════

You have: .shp, .shx, .prj, .dbf, .cpg files
You need: .json (GeoJSON) files for the backend

### Option A — QGIS (Recommended, Free)
1. Open QGIS
2. Layer → Add Layer → Add Vector Layer
3. Select your .shp file
4. Right-click the layer → Export → Save Features As...
5. Format: GeoJSON
6. CRS: EPSG:4326 (WGS84) ← VERY IMPORTANT
7. Save as: admin0.json (or admin1, admin2, admin3, admin4)

### Option B — ogr2ogr (Command Line, Fast)
Install GDAL, then run:
```
ogr2ogr -f GeoJSON -t_srs EPSG:4326 admin1.json your_state_shapefile.shp
ogr2ogr -f GeoJSON -t_srs EPSG:4326 admin2.json your_district_shapefile.shp
ogr2ogr -f GeoJSON -t_srs EPSG:4326 admin3.json your_taluka_shapefile.shp
ogr2ogr -f GeoJSON -t_srs EPSG:4326 admin4.json your_village_shapefile.shp
```

### Option C — ArcGIS Pro
1. Open your shapefile in ArcGIS
2. Right-click layer → Data → Export Features
3. Output type: GeoJSON
4. Coordinate system: GCS WGS 1984

---

## STEP 2 — CHECK GEOJSON PROPERTY NAMES

Your GeoJSON features MUST have these property names (case-sensitive):

```json
{
  "type": "Feature",
  "properties": {
    "STATE":    "Maharashtra",
    "DISTRICT": "Kolhapur",
    "TALUKA":   "Karvir",
    "VILLAGE":  "Talsande"
  },
  "geometry": { ... }
}
```

If your shapefile uses different column names (e.g. "St_Name", "Dist_NM"),
you need to rename them. In QGIS:
- Open attribute table
- Field Calculator → rename columns to STATE, DISTRICT, TALUKA, VILLAGE

For admin levels that don't have all fields (e.g. admin1 only has STATE),
that's fine — just include what applies.

---

## STEP 3 — PLACE FILES IN BACKEND

Copy your converted JSON files to:
```
gis-portal/backend/data/
├── admin0.json   ← (optional) Country boundary
├── admin1.json   ← State boundaries
├── admin2.json   ← District boundaries
├── admin3.json   ← Taluka boundaries
└── admin4.json   ← Village boundaries
```

---

## STEP 4 — RUN THE APPLICATION

### Backend
```bash
cd gis-portal/backend
npm install
node server.js
# Runs at http://localhost:5000
```

### Frontend
```bash
cd gis-portal/frontend
npm install
npm start
# Runs at http://localhost:3000
```

Open browser → http://localhost:3000
Register an account → Start downloading!

---

## API REFERENCE

### Auth
POST /api/auth/register   { name, email, password }
POST /api/auth/login      { email, password }

### GIS (all require: Authorization: Bearer <token>)
GET  /api/gis/states
GET  /api/gis/districts/:state
GET  /api/gis/talukas/:district
GET  /api/gis/villages/:taluka
POST /api/gis/preview     { state, district?, taluka?, village? }
POST /api/gis/download    { state, district?, taluka?, village?, mode }
  mode: "boundary" | "subunits" | "full"

---

## EXAMPLE API CALLS (cURL)

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"nav@example.com","password":"test123"}'

# Get states
curl http://localhost:5000/api/gis/states \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Download Kolhapur district shapefile
curl -X POST http://localhost:5000/api/gis/download \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"state":"Maharashtra","district":"Kolhapur","mode":"boundary"}' \
  --output kolhapur.zip

---

## TECH STACK

Backend:  Node.js · Express · JWT · bcryptjs · shp-write · archiver
Frontend: React · React Router · Leaflet · React-Leaflet · Axios
Design:   Space Mono + DM Sans · Dark cartographic theme · WGS84

---

## NOTES

- All GeoJSON data is loaded into RAM on startup — no DB needed
- The dummy admin0.json has sample Maharashtra data for testing
- Replace with your real converted GeoJSON files for production
- CRS must be WGS84 (EPSG:4326) for Leaflet to render correctly

---
Built for: GetMySHP — Administrative Boundary Download Portal
