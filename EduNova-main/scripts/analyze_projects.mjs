import fs from 'fs';

const content = fs.readFileSync('src/lib/data/pdfCatalog.ts', 'utf8');
const matches = Array.from(content.matchAll(/"thumbnail": "([^"]+)"/g)).map(m => m[1]);
const counts = {};
for (const m of matches) counts[m] = (counts[m] || 0) + 1;
console.log('Thumbnail distribution in pdfCatalog:', counts);
console.log('Total projects in pdfCatalog:', matches.length);
