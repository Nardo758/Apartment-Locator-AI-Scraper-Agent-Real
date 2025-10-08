import process from "node:process";
const fs = require('fs');
const path = require('path');

const dumpPath = path.join(__dirname, '..', 'tmp', 'local_dump.sql');
const ids = [
  'amli_arts_center', 'amli_midtown', 'atlantic_house', 'novel_midtown_atlanta'
];

if (!fs.existsSync(dumpPath)) {
  console.error('Dump file not found:', dumpPath);
  process.exit(2);
}

const content = fs.readFileSync(dumpPath, 'utf8');

ids.forEach(id => {
  const idx = content.indexOf(id);
  if (idx === -1) {
    console.log(`${id}: NOT FOUND`);
  } else {
    // print a short excerpt around the match
    const start = Math.max(0, idx - 120);
    const end = Math.min(content.length, idx + id.length + 120);
    const excerpt = content.slice(start, end).replace(/\s+/g, ' ');
    console.log(`${id}: FOUND -> ...${excerpt}...`);
  }
});
