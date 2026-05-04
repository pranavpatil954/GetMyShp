const fs = require('fs');
const mh1 = JSON.parse(fs.readFileSync('C:/users/BusinessComputers.in/Downloads/indian_village_boundaries-master/indian_village_boundaries-master/mh/mh1.geojson', 'utf8'));
const mh2 = JSON.parse(fs.readFileSync('C:/users/BusinessComputers.in/Downloads/indian_village_boundaries-master/indian_village_boundaries-master/mh/mh2.geojson', 'utf8'));

const features = [];
for (const f of [...mh1.features, ...mh2.features]) {
  const p = f.properties;
  f.properties = {
    STATE: p.STATE,
    DISTRICT: p.DISTRICT,
    TALUKA: p.SUB_DIST,
    VILLAGE: p.NAME
  };
  features.push(f);
}

const geojson = { type: 'FeatureCollection', features: features };
fs.writeFileSync('D:/.shp website/gis-portal/gis-portal/backend/data/admin4.json', JSON.stringify(geojson));
console.log('Successfully created admin4.json with ' + features.length + ' MH villages!');

