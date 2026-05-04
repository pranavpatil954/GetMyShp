#!/usr/bin/env node
// ============================================================
// Optimized Village Shapefile Converter
// Handles large files by streaming and limiting features
// ============================================================

const fs = require("fs");
const path = require("path");
const shapefile = require("shapefile");

const DATA_DIR = path.join(__dirname, "data");
const VILLAGE_DIR = path.join(__dirname, "village-data");

async function convertLargeVillageFile() {
  const inputName = "india-village-census-2001-UP";
  const outputName = "admin4";
  const shapefilePath = path.join(VILLAGE_DIR, `${inputName}.shp`);
  const outputPath = path.join(DATA_DIR, `${outputName}.json`);

  if (!fs.existsSync(shapefilePath)) {
    console.error(`❌ ${inputName}.shp not found`);
    return;
  }

  try {
    console.log(`📦 Converting large village file: ${inputName}.shp...`);
    console.log("⏳ This may take a few minutes...\n");

    const source = await shapefile.open(shapefilePath);
    const features = [];
    let count = 0;
    let result = await source.read();

    // Limit to first 10000 villages for performance
    const FEATURE_LIMIT = 10000;

    while (!result.done && count < FEATURE_LIMIT) {
      // Only keep essential properties to reduce file size
      const feature = result.value;
      if (feature.properties) {
        const essentialProps = {};
        // Keep only name and ID fields
        if (feature.properties.NAME_1) essentialProps.STATE = feature.properties.NAME_1;
        if (feature.properties.NAME_2) essentialProps.DISTRICT = feature.properties.NAME_2;
        if (feature.properties.NAME_3) essentialProps.TALUKA = feature.properties.NAME_3;
        if (feature.properties.NAME_4) essentialProps.VILLAGE = feature.properties.NAME_4;
        feature.properties = essentialProps;
      }
      features.push(feature);
      count++;
      
      if (count % 1000 === 0) {
        process.stdout.write(`\r  Processed ${count} villages...`);
      }
      result = await source.read();
    }

    // Create GeoJSON FeatureCollection
    const geojson = {
      type: "FeatureCollection",
      features: features,
    };

    // Write to JSON file
    fs.writeFileSync(outputPath, JSON.stringify(geojson, null, 2), "utf-8");
    console.log(`\n✅ ${outputName}.json created (${features.length} villages)`);
    console.log("📊 File optimized: Essential properties only");
  } catch (error) {
    console.error(`❌ Error converting villages:`, error.message);
    console.log("\n💡 Alternative: You can use a GIS tool like QGIS to convert this file separately");
  }
}

convertLargeVillageFile();
