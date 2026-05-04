#!/usr/bin/env node
// ============================================================
// Test: Extract and examine geojson2shp ZIP output
// ============================================================

const geojson2shp = require("geojson2shp");
const path = require("path");
const fs = require("fs");
const os = require("os");
const AdmZip = require("adm-zip");

async function testConversion() {
  const testGeojson = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { name: "Test" },
        geometry: {
          type: "Point",
          coordinates: [77.2, 28.6]
        }
      }
    ]
  };

  const tempDir = path.join(os.tmpdir(), `test-shp-3-${Date.now()}`);
  const outputPath = path.join(tempDir, "test-output");

  try {
    console.log("Creating temp directory...");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    console.log("Running geojson2shp.convert()...");
    const result = await geojson2shp.convert(testGeojson, outputPath);

    console.log("\nExtracting ZIP contents...");
    const zipFile = path.join(tempDir, "test-output");
    const zip = new AdmZip(zipFile);
    const entries = zip.getEntries();

    console.log("Contents of ZIP:");
    entries.forEach(entry => {
      console.log(`  ${entry.name} - ${entry.header.size} bytes`);
    });

    // Extract all files
    zip.extractAllTo(tempDir, true);

    console.log("\nFiles after extraction:");
    const files = fs.readdirSync(tempDir);
    files.forEach(file => {
      const fullPath = path.join(tempDir, file);
      const stats = fs.statSync(fullPath);
      console.log(`  ${file} - ${stats.size} bytes`);
    });

  } catch (err) {
    console.error("Error:", err.message);
    console.error(err);
  } finally {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

testConversion();
