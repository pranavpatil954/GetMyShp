#!/usr/bin/env node
// ============================================================
// Test: Complete End-to-End Shapefile Download Flow
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

console.log(`
╔════════════════════════════════════════════════════════════════╗
║        COMPLETE SHAPEFILE DOWNLOAD TEST                       ║
║        Testing automated shapefile conversion                  ║
╚════════════════════════════════════════════════════════════════╝
`);

// Test multiple download modes
const testCases = [
  {
    name: "Single State (Boundary Only)",
    data: { state: "Arunachal Pradesh", mode: "boundary" },
    expectedFiles: [".shp", ".shx", ".dbf", ".prj", ".cpg", ".geojson"]
  },
  {
    name: "District Level",
    data: { state: "Arunachal Pradesh", district: "Kameng" , mode: "boundary" },
    expectedFiles: [".shp", ".shx", ".dbf", ".prj", ".cpg", ".geojson"]
  }
];

async function runTest(testCase, index) {
  return new Promise((resolve) => {
    const postData = JSON.stringify(testCase.data);

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

    console.log(`\n📋 Test ${index + 1}: ${testCase.name}`);
    console.log(`   Filters: ${JSON.stringify(testCase.data)}\n`);

    const req = http.request(options, (res) => {
      if (res.statusCode !== 200) {
        console.log(`   ❌ Status: ${res.statusCode}`);
        resolve(false);
        return;
      }

      let data = [];
      res.on('data', chunk => data.push(chunk));
      
      res.on('end', () => {
        const blob = Buffer.concat(data);
        console.log(`   ✅ Status: 200`);
        console.log(`   📦 File size: ${blob.length} bytes`);

        try {
          const AdmZip = require('adm-zip');
          const zip = new AdmZip(blob);
          const entries = zip.getEntries();

          console.log(`   📂 ZIP Contains (${entries.length} files):`);
          const filesInZip = [];
          entries.forEach(entry => {
            const ext = path.extname(entry.name);
            filesInZip.push(ext);
            console.log(`      ✓ ${entry.name}`);
          });

          // Verify all expected files present
          const allFound = testCase.expectedFiles.every(ext => 
            filesInZip.includes(ext)
          );

          if (allFound) {
            console.log(`   ✅ ALL FILES PRESENT!`);
            resolve(true);
          } else {
            const missing = testCase.expectedFiles.filter(ext => !filesInZip.includes(ext));
            console.log(`   ❌ MISSING FILES: ${missing.join(", ")}`);
            resolve(false);
          }
        } catch (err) {
          console.log(`   ❌ Error reading ZIP: ${err.message}`);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.log(`   ❌ Request error: ${err.message}`);
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
}

(async () => {
  const results = [];
  for (let i = 0; i < testCases.length; i++) {
    const passed = await runTest(testCases[i], i);
    results.push({ test: testCases[i].name, passed });
    // Small delay between tests
    await new Promise(r => setTimeout(r, 500));
  }

  console.log(`\n╔════════════════════════════════════════════════════════════════╗`);
  console.log(`║                      TEST SUMMARY                             ║`);
  console.log(`╚════════════════════════════════════════════════════════════════╝`);
  
  results.forEach((r, i) => {
    console.log(`${i + 1}. ${r.test}: ${r.passed ? '✅ PASS' : '❌ FAIL'}`);
  });

  const passCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  
  console.log(`\n📊 Results: ${passCount}/${totalCount} tests passed\n`);

  if (passCount === totalCount) {
    console.log(`🎉 ALL TESTS PASSED! Shapefile conversion is working perfectly!\n`);
  } else {
    console.log(`⚠️  Some tests failed. Check the output above.\n`);
  }
})();
