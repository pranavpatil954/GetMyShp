#!/usr/bin/env node
// ============================================================
// Test: Download Endpoint with New Shapefile Conversion
// ============================================================

const http = require('http');
const fs = require('fs');
const path = require('path');

// Test data - a simple state filter
const postData = JSON.stringify({
  state: "Arunachal Pradesh",
  mode: "boundary"
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/gis/download',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'Authorization': 'Bearer test-token' // You may need to provide a valid token
  }
};

console.log('🧪 Testing /api/gis/download endpoint...\n');
console.log(`📤 Sending POST request to ${options.path}`);
console.log(`📍 Filters: state=Arunachal Pradesh, mode=boundary\n`);

const req = http.request(options, (res) => {
  console.log(`✅ Response status: ${res.statusCode}`);
  console.log(`📋 Response headers:`, res.headers, '\n');

  if (res.statusCode !== 200) {
    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    res.on('end', () => {
      console.error('❌ Error response:', responseData);
    });
    return;
  }

  // Save the downloaded ZIP
  const outputPath = path.join(__dirname, 'test-download.zip');
  const file = fs.createWriteStream(outputPath);

  res.pipe(file);

  file.on('finish', () => {
    file.close();
    console.log(`✅ File saved: ${outputPath}`);
    
    // Check file size
    const stats = fs.statSync(outputPath);
    console.log(`📦 File size: ${stats.size} bytes`);

    // Try to read ZIP contents
    try {
      const AdmZip = require('adm-zip');
      const zip = new AdmZip(outputPath);
      const entries = zip.getEntries();
      
      console.log(`\n📂 ZIP Contents (${entries.length} files):`);
      entries.forEach(entry => {
        console.log(`  ✓ ${entry.name} - ${entry.header.size} bytes`);
      });

      // Check for essential shapefile files
      const hasShp = entries.some(e => e.name.endsWith('.shp'));
      const hasShx = entries.some(e => e.name.endsWith('.shx'));
      const hasDbf = entries.some(e => e.name.endsWith('.dbf'));
      const hasPrj = entries.some(e => e.name.endsWith('.prj'));
      const hasGeojson = entries.some(e => e.name.endsWith('.geojson'));

      console.log(`\n✅ File Validation:`);
      console.log(`  ${hasShp ? '✓' : '✗'} .shp file found`);
      console.log(`  ${hasShx ? '✓' : '✗'} .shx file found`);
      console.log(`  ${hasDbf ? '✓' : '✗'} .dbf file found`);
      console.log(`  ${hasPrj ? '✓' : '✗'} .prj file found`);
      console.log(`  ${hasGeojson ? '✓' : '✗'} .geojson file found`);

      if (hasShp && hasShx && hasDbf) {
        console.log(`\n🎉 SUCCESS: Complete shapefile found in ZIP!`);
      } else {
        console.log(`\n⚠️  WARNING: Missing shapefile components!`);
      }

      // Clean up
      fs.unlinkSync(outputPath);
      console.log(`\n🧹 Cleaned up test file`);

    } catch (err) {
      console.error('Error reading ZIP:', err.message);
    }
  });

  file.on('error', (err) => {
    fs.unlink(outputPath, () => {}); // Delete the file
    console.error('Error writing file:', err);
  });
});

req.on('error', (err) => {
  console.error('❌ Request error:', err.message);
  process.exit(1);
});

// Send the request
req.write(postData);
req.end();
