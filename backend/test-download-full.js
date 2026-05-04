#!/usr/bin/env node
// ============================================================
// Test: Comprehensive Download Test with Auth
// ============================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

// Generate a valid JWT token
const JWT_SECRET = process.env.JWT_SECRET || "gis_portal_secret_key_2024";
const token = jwt.sign({ 
  id: "test-user", 
  name: "Test User", 
  email: "test@example.com" 
}, JWT_SECRET, { expiresIn: "7d" });

console.log(`🔐 Generated JWT token: ${token.substring(0, 20)}...\n`);

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
    'Authorization': `Bearer ${token}`
  }
};

console.log('🧪 Testing /api/gis/download endpoint...\n');
console.log(`📤 Sending POST request to ${options.path}`);
console.log(`📍 Filters: state=Arunachal Pradesh, mode=boundary\n`);

const req = http.request(options, (res) => {
  console.log(`✅ Response status: ${res.statusCode}`);
  console.log(`📋 Content-Type: ${res.headers['content-type']}\n`);

  if (res.statusCode !== 200) {
    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    res.on('end', () => {
      console.error('❌ Error response:', responseData);
      process.exit(1);
    });
    return;
  }

  // Save the downloaded ZIP
  const outputPath = path.join(__dirname, 'test-download.zip');
  const file = fs.createWriteStream(outputPath);

  res.pipe(file);

  file.on('finish', () => {
    file.close();
    console.log(`✅ File saved: test-download.zip`);
    
    // Check file size
    const stats = fs.statSync(outputPath);
    console.log(`📦 File size: ${stats.size} bytes\n`);

    // Try to read ZIP contents
    try {
      const AdmZip = require('adm-zip');
      const zip = new AdmZip(outputPath);
      const entries = zip.getEntries();
      
      console.log(`📂 ZIP Contents (${entries.length} files):`);
      entries.forEach(entry => {
        console.log(`  ✓ ${entry.name} - ${entry.header.size} bytes`);
      });

      // Check for essential shapefile files
      const hasShp = entries.some(e => e.name.endsWith('.shp'));
      const hasShx = entries.some(e => e.name.endsWith('.shx'));
      const hasDbf = entries.some(e => e.name.endsWith('.dbf'));
      const hasPrj = entries.some(e => e.name.endsWith('.prj'));
      const hasCpg = entries.some(e => e.name.endsWith('.cpg'));
      const hasGeojson = entries.some(e => e.name.endsWith('.geojson'));

      console.log(`\n✅ File Validation:`);
      console.log(`  ${hasShp ? '✓' : '✗'} .shp file found`);
      console.log(`  ${hasShx ? '✓' : '✗'} .shx file found`);
      console.log(`  ${hasDbf ? '✓' : '✗'} .dbf file found`);
      console.log(`  ${hasPrj ? '✓' : '✗'} .prj file found`);
      console.log(`  ${hasCpg ? '✓' : '✗'} .cpg file found`);
      console.log(`  ${hasGeojson ? '✓' : '✗'} .geojson file found`);

      if (hasShp && hasShx && hasDbf && hasPrj) {
        console.log(`\n🎉 SUCCESS: Complete shapefile found in ZIP!`);
      } else {
        console.log(`\n⚠️  WARNING: Missing shapefile components!`);
        console.log(`  Required: .shp, .shx, .dbf, .prj`);
        console.log(`  Found: ${[hasShp && '.shp', hasShx && '.shx', hasDbf && '.dbf', hasPrj && '.prj'].filter(Boolean).join(', ')}`);
      }

      // Clean up
      fs.unlinkSync(outputPath);
      console.log(`\n🧹 Cleaned up test file`);

    } catch (err) {
      console.error('❌ Error reading ZIP:', err.message);
      process.exit(1);
    }
  });

  file.on('error', (err) => {
    fs.unlink(outputPath, () => {}); // Delete the file
    console.error('❌ Error writing file:', err);
    process.exit(1);
  });
});

req.on('error', (err) => {
  console.error('❌ Request error:', err.message);
  process.exit(1);
});

// Send the request
req.write(postData);
req.end();
