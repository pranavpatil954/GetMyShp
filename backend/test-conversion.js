#!/usr/bin/env node
// ============================================================
// Test: GeoJSON to Shapefile Conversion
// ============================================================

const geojson2shp = require("geojson2shp");
const path = require("path");
const fs = require("fs");
const os = require("os");

async function testConversion() {
  console.log("🧪 Testing GeoJSON to Shapefile conversion...\n");

  // Create a simple test GeoJSON
  const testGeojson = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { name: "Test Feature", value: 42 },
        geometry: {
          type: "Point",
          coordinates: [77.2, 28.6] // Delhi coordinates
        }
      },
      {
        type: "Feature",
        properties: { name: "Another Feature", value: 99 },
        geometry: {
          type: "Polygon",
          coordinates: [[
            [77.0, 28.4],
            [77.4, 28.4],
            [77.4, 28.8],
            [77.0, 28.8],
            [77.0, 28.4]
          ]]
        }
      }
    ]
  };

  const tempDir = path.join(os.tmpdir(), `test-shp-${Date.now()}`);
  const outputPath = path.join(tempDir, "test-output");

  console.log(`📂 Temp directory: ${tempDir}`);
  console.log(`📂 Output path: ${outputPath}\n`);

  try {
    // Create temp directory
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Convert
    console.log("🔄 Converting GeoJSON to Shapefile...");
    await geojson2shp.convert(testGeojson, outputPath);
    console.log("✅ Conversion completed!\n");

    // Check files
    console.log("📂 Files created:");
    const files = fs.readdirSync(tempDir);
    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);
      console.log(`  ✓ ${file} (${stats.size} bytes)`);
    });

    // Verify essential files
    const requiredFiles = [
      path.join(tempDir, "test-output.shp"),
      path.join(tempDir, "test-output.shx"),
      path.join(tempDir, "test-output.dbf")
    ];

    console.log("\n✅ Checking required shapefile files:");
    let allFound = true;
    requiredFiles.forEach(file => {
      if (fs.existsSync(file)) {
        console.log(`  ✓ ${path.basename(file)}`);
      } else {
        console.log(`  ❌ MISSING: ${path.basename(file)}`);
        allFound = false;
      }
    });

    if (allFound) {
      console.log("\n🎉 SUCCESS: All shapefile components generated correctly!");
    } else {
      console.log("\n⚠️  WARNING: Some shapefile components missing!");
    }

    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log(`\n🧹 Cleaned up temp directory`);

  } catch (err) {
    console.error("❌ Test failed:", err.message);
    console.error("\n Stack trace:");
    console.error(err.stack);
    
    // Cleanup on error
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    
    process.exit(1);
  }
}

testConversion();
