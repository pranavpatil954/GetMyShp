const fs = require('fs');
const path = require('path');

const DB_DIR = path.join(__dirname, 'db');
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR);

// Very simple JSON database to avoid needing an external MongoDB server
const jsonDB = {
  read: (table) => {
    const file = path.join(DB_DIR, `${table}.json`);
    if (!fs.existsSync(file)) return [];
    try {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {
      return [];
    }
  },
  write: (table, data) => {
    const file = path.join(DB_DIR, `${table}.json`);
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  },
  insert: (table, record) => {
    const data = jsonDB.read(table);
    // basic id generation
    record._id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    data.push(record);
    jsonDB.write(table, data);
    return record;
  },
  find: (table, queryFn) => {
    return jsonDB.read(table).filter(queryFn);
  },
  findOne: (table, queryFn) => {
    return jsonDB.read(table).find(queryFn);
  },
  update: (table, id, updates) => {
    const data = jsonDB.read(table);
    const index = data.findIndex(r => r._id === id);
    if (index !== -1) {
      data[index] = { ...data[index], ...updates };
      jsonDB.write(table, data);
      return data[index];
    }
    return null;
  }
};

module.exports = jsonDB;
