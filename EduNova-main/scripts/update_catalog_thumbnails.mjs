import fs from 'fs';

const filePath = 'src/lib/data/pdfCatalog.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Replace any thumbnail and previewImages inside pdfCatalog.ts based on each project's id
const projectRegex = /\{\s*"id":\s*"([^"]+)"[\s\S]*?\n  \}/g;

let updatedCount = 0;
content = content.replace(projectRegex, (match, id) => {
  const newThumb = `/postcards/${id}.svg`;
  // Replace thumbnail
  let updated = match.replace(/"thumbnail":\s*"[^"]+"/, `"thumbnail": "${newThumb}"`);
  // Replace previewImages array
  updated = updated.replace(/"previewImages":\s*\[\s*"[^"]+"\s*\]/, `"previewImages": [\n      "${newThumb}"\n    ]`);
  updatedCount++;
  return updated;
});

fs.writeFileSync(filePath, content, 'utf8');
console.log(`Successfully updated ${updatedCount} projects in ${filePath} to use custom postcards!`);
