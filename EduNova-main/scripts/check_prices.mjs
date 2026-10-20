import fs from 'fs';

const mockContent = fs.readFileSync('src/lib/data/mockProjects.ts', 'utf8');
const pdfContent = fs.readFileSync('src/lib/data/pdfCatalog.ts', 'utf8');

const mockPrices = Array.from(mockContent.matchAll(/price:\s*(\d+)/g)).map(m => Number(m[1]));
const pdfPrices = Array.from(pdfContent.matchAll(/"price":\s*(\d+)/g)).map(m => Number(m[1]));

const allPrices = [...mockPrices, ...pdfPrices];
const below2999 = allPrices.filter(p => p < 2999 && p > 0);

console.log('Total prices found:', allPrices.length);
console.log('Prices below 2999:', below2999);
console.log('Min price:', Math.min(...allPrices.filter(p => p > 0)));
console.log('Max price:', Math.max(...allPrices));
