#!/usr/bin/env node
// ============================================================
// Shapefile to GeoJSON Converter
// Usage: node convert-shapefiles.js
// Converts .shp files from IND_adm folder to GeoJSON format
// ============================================================

const fs = require("fs");
const path = require("path");
const shapefile = require("shapefile");

const DATA_DIR = path.join(__dirname, "data");
const IND_ADM_DIR = path.join(__dirname, "IND_adm");
const VILLAGE_DIR = path.join(__dirname, "village-data");

// Mapping of IND_adm files to desired output names
const conversionMap = [
  { input: "IND_adm0", output: "admin0", dir: IND_ADM_DIR },
  { input: "IND_adm1", output: "admin1", dir: IND_ADM_DIR },
  { input: "IND_adm2", output: "admin2", dir: IND_ADM_DIR },
  { input: "IND_adm3", output: "admin3", dir: IND_ADM_DIR },
  { input: "india-village-census-2001-UP", output: "admin4", dir: VILLAGE_DIR },
];

async function convertShapefileToGeoJSON(inputName, outputName, inputDir) {
  const shapefilePath = path.join(inputDir, `${inputName}.shp`);
  const outputPath = path.join(DATA_DIR, `${outputName}.json`);

  if (!fs.existsSync(shapefilePath)) {
    console.warn(`⚠️  ${inputName}.shp not found — skipping`);
    return false;
  }

  try {
    console.log(`📦 Converting ${inputName}.shp → ${outputName}.json...`);
    
    // Read shapefile
    const source = await shapefile.open(shapefilePath);
    const features = [];
    let result = await source.read();

    while (!result.done) {
      features.push(result.value);
      result = await source.read();
    }

    // Create GeoJSON FeatureCollection
    const geojson = {
      type: "FeatureCollection",
      features: features,
    };

    // Write to JSON file
    fs.writeFileSync(outputPath, JSON.stringify(geojson, null, 2), "utf-8");
    console.log(`✅ ${outputName}.json created (${features.length} features)`);
    return true;
  } catch (error) {
    console.error(`❌ Error converting ${inputName}:`, error.message);
    return false;
  }
}

async function main() {
  console.log("🔄 Starting Shapefile to GeoJSON conversion...\n");

  for (const map of conversionMap) {
    await convertShapefileToGeoJSON(map.input, map.output, map.dir);
  }

  console.log("\n✨ Conversion complete!");
  console.log("📂 Check backend/data/ for .json files");
  console.log("📦 Source files stored in backend/IND_adm/ and backend/village-data/ for future use");
}

main();
