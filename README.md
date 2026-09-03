# GetMySHP — Administrative Boundary Download Portal

> **"Every boundary tells a story. Spatial knowledge should be accessible to all."**

GetMySHP is a full-stack Web GIS portal for querying, previewing, and downloading administrative boundary Shapefiles of India across all administrative levels: **Country (Admin 0) → State (Admin 1) → District (Admin 2) → Taluka (Admin 3) → Village (Admin 4)**.

---

## 🌟 Key Features

- 🗺 **Interactive Map Preview**: Dynamic Leaflet.js map with auto-zoom (`flyToBounds`) for instant boundary inspection.
- 📦 **Multi-Format Export**: On-the-fly packaging of spatial data into ESRI Shapefile components (`.shp`, `.shx`, `.dbf`, `.prj`) inside `.zip` archives.
- ⚡ **In-Memory GeoJSON Engine**: Loads boundary geometries directly into RAM at server start for sub-millisecond API response times.
- 🔒 **Secure Authentication**: JWT session handling with bcrypt password hashing.
- 🌐 **WGS84 Standard**: All coordinate references compliant with EPSG:4326 for seamless compatibility with QGIS, ArcGIS Pro, and Google Earth.

---

## 🏗 Project Architecture

```text
gis-portal/
├── backend/
│   ├── data/             ← Boundary GeoJSON datasets (Admin 0 - Admin 4)
│   ├── routes/
│   │   ├── auth.js       ← Registration & login authentication
│   │   ├── gis.js        ← Spatial querying, preview, and shapefile export
│   │   └── admin.js      ← Analytics & statistics API
│   ├── db.js             ← Lightweight JSON-based local store
│   └── server.js         ← Express server & static build handler
│
├── frontend/
│   ├── public/
│   └── src/
│       ├── context/
│       │   └── AuthContext.js
│       ├── pages/
│       │   ├── AuthPage.js    ← Sign in / registration interface
│       │   └── Dashboard.js   ← GIS portal & interactive map preview
│       └── App.js
│
├── package.json          ← Build & deployment orchestration
└── render.yaml           ← Cloud deployment blueprint
```

---

## 🚀 Live Portal & Quick Start

### 🌐 Live Deployment
Access the portal live at: **[GetMySHP Web Service](https://getmyshp.onrender.com)**

### 💻 Running Locally

#### 1. Clone & Install Dependencies
```bash
git clone https://github.com/pranavpatil954/GetMyShp.git
cd GetMyShp
npm run install-all
```

#### 2. Environment Setup
Create a `.env` file inside the `backend/` directory:
```env
PORT=5000
JWT_SECRET=your_secure_random_secret
```

#### 3. Start Development Environment
Run the launch script from the project root:
```bash
npm start
```
- **Backend API**: `http://localhost:5000/api`
- **Frontend App**: `http://localhost:3000`

---

## 🗺 Shapefile Conversion Guide

If you wish to add custom regional boundaries:

1. **Format Requirements**: Convert your `.shp` files to standard `.json` (GeoJSON).
2. **Coordinate Reference System (CRS)**: Must be set to **EPSG:4326 (WGS84)**.
3. **Required Attribute Mapping**:
   - `STATE` (e.g., "Maharashtra")
   - `DISTRICT` (e.g., "Kolhapur")
   - `TALUKA` (e.g., "Karvir")
   - `VILLAGE` (e.g., "Talsande")

### Conversion using QGIS (Free & Open Source)
1. Open QGIS → Layer → Add Vector Layer.
2. Select your `.shp` file.
3. Right-click layer → **Export** → **Save Features As...**
4. Set Format to **GeoJSON** and CRS to **EPSG:4326 - WGS84**.
5. Save inside `backend/data/`.

---

## 🛰 API Endpoint Documentation

All GIS endpoints require a valid Bearer Token: `Authorization: Bearer <your_jwt_token>`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register a new user account |
| `POST` | `/api/auth/login` | Login and receive a JWT token |
| `GET` | `/api/gis/states` | Fetch list of available states |
| `GET` | `/api/gis/districts/:state` | Fetch districts for selected state |
| `GET` | `/api/gis/talukas/:district` | Fetch talukas for selected district |
| `GET` | `/api/gis/villages/:taluka` | Fetch villages for selected taluka |
| `POST` | `/api/gis/preview` | Generate GeoJSON boundary preview payload |
| `POST` | `/api/gis/download` | Export ESRI Shapefile `.zip` archive |

---

## 🔒 Security & Privacy Statement

This repository adheres to strict open-source security guidelines:
- **No Private Keys Exposed**: Production environment secrets are passed securely via environment variables.
- **Sensitive Files Excluded**: Local database files (`backend/db/*.json`), `.env` files, and raw data layers are excluded via `.gitignore`.
- **Password Security**: Passwords are standardly hashed using `bcryptjs` with salt rounds prior to storage.

---

## ⚖️ Data License & Non-Commercial Disclaimer

- **Boundary Data Source**: Administrative boundary data is derived from [GADM (Global Administrative Areas)](https://gadm.org) version 2.8.
- **Permitted Use**: GADM data is freely available for **academic, educational, personal, and non-commercial research purposes**. 
- **Non-Commercial Notice**: This project and web portal are created strictly for **educational and non-commercial demonstration purposes**. If you intend to use GADM data for commercial purposes, please request permission directly from GADM at [gadm.org/license.html](https://gadm.org/license.html).

---

## 📜 Technical Stack

React 18 · Node.js · Express · Leaflet · shp-write · WGS84 (EPSG:4326) Standard.

