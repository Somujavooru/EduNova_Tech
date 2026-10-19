import fs from 'fs';

const content = fs.readFileSync('src/lib/data/pdfCatalog.ts', 'utf8');
const projectBlocks = content.split(/\{\s*"id":/g).slice(1);

console.log('Total project blocks:', projectBlocks.length);
const list = [];
for (const b of projectBlocks) {
  const idMatch = b.match(/"([^"]+)"/);
  const titleMatch = b.match(/"title":\s*"([^"]+)"/);
  const catMatch = b.match(/"category":\s*"([^"]+)"/);
  const techMatch = b.match(/"techStack":\s*\[([^\]]+)\]/);
  if (idMatch && titleMatch) {
    list.push({
      id: idMatch[1],
      title: titleMatch[1],
      category: catMatch ? catMatch[1] : 'software',
      tech: techMatch ? techMatch[1].replace(/"/g, '').trim() : ''
    });
  }
}

console.log('Extracted projects:', list.length);
console.log('Sample list of first 10:');
console.log(list.slice(0, 10));

fs.writeFileSync('scripts/extracted_projects.json', JSON.stringify(list, null, 2));
console.log('Saved to scripts/extracted_projects.json');
