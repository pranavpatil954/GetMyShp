#!/usr/bin/env node
// ============================================================
// Test: Examine geojson2shp output
// ============================================================

const geojson2shp = require("geojson2shp");
const path = require("path");
const fs = require("fs");
const os = require("os");

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

  const tempDir = path.join(os.tmpdir(), `test-shp-2-${Date.now()}`);
  const outputPath = path.join(tempDir, "test-output");

  try {
    console.log("Creating temp directory...");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    console.log("Running geojson2shp.convert()...");
    const result = await geojson2shp.convert(testGeojson, outputPath);
    console.log("Result from geojson2shp:", result);
    console.log("\nFiles in directory:");
    const files = fs.readdirSync(tempDir);
    files.forEach(file => {
      const fullPath = path.join(tempDir, file);
      const stats = fs.statSync(fullPath);
      const ext = path.extname(file) || "NO_EXT";
      console.log(`  ${file} - ${stats.size} bytes, mimeType: ${ext}`);
      
      // Check first few bytes to identify file type
      const buffer = Buffer.alloc(4);
      const fd = fs.openSync(fullPath, 'r');
      fs.readSync(fd, buffer, 0, 4);
      fs.closeSync(fd);
      console.log(`    Magic bytes: ${buffer.toString('hex')}`);
    });
    
    // Check if it's a zip file
    if (files.length > 0) {
      const firstFile = path.join(tempDir, files[0]);
      const buffer = Buffer.alloc(4);
      const fd = fs.openSync(firstFile, 'r');
      fs.readSync(fd, buffer, 0, 4);
      fs.closeSync(fd);
      
      if (buffer.toString('hex') === '504b0304') {
        console.log("\n📦 This appears to be a ZIP file!");
      }
    }

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
