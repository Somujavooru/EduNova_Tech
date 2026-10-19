import fs from 'fs';
import path from 'path';

const outDir = 'public/postcards';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const projects = JSON.parse(fs.readFileSync('scripts/extracted_projects.json', 'utf8'));
console.log(`Generating project postcards for ${projects.length} projects...`);

function escapeXml(unsafe) {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function classifyProject(title, tech) {
  const t = (title + ' ' + tech).toLowerCase();

  if (t.includes('2048')) return 'game_2048';
  if (t.includes('valentine') || t.includes('heart')) return 'valentine';
  if (t.includes('rose') || t.includes('flower')) return 'rose';
  if (t.includes('flag') || t.includes('tiranga')) return 'flag';
  if (t.includes('binary') && t.includes('decimal')) return 'binary';
  if (t.includes('weather') || t.includes('forecast') || t.includes('climate')) return 'weather';
  if (t.includes('notepad') || t.includes('text editor')) return 'notepad';
  if (t.includes('phone') && (t.includes('lookup') || t.includes('location') || t.includes('carrier'))) return 'phone_lookup';
  if (t.includes('car') && (t.includes('racing') || t.includes('game') || t.includes('pygame'))) return 'car_racing';
  if (t.includes('alarm') || t.includes('clock') || t.includes('stopwatch')) return 'clock';
  if (t.includes('snake')) return 'snake';
  if (t.includes('tic tac') || t.includes('tictactoe')) return 'tictactoe';
  if (t.includes('flappy')) return 'flappy';
  if (t.includes('chess') || t.includes('sudoku')) return 'boardgame';
  if (t.includes('game') || t.includes('arcade') || t.includes('pong') || t.includes('hangman') || t.includes('space invader')) return 'arcade_game';
  if (t.includes('hospital') || t.includes('doctor') || t.includes('patient') || t.includes('health') || t.includes('clinic') || t.includes('pharmacy')) return 'hospital';
  if (t.includes('atm') || t.includes('bank') || t.includes('banking')) return 'bank_atm';
  if (t.includes('library') || t.includes('book')) return 'library';
  if (t.includes('billing') || t.includes('invoice') || t.includes('electricity') || t.includes('supermarket')) return 'billing';
  if (t.includes('hotel') || t.includes('reservation') || t.includes('resort')) return 'hotel';
  if (t.includes('student') || t.includes('college') || t.includes('school') || t.includes('grading') || t.includes('attendance')) return 'student';
  if (t.includes('chat') || t.includes('messaging') || t.includes('messenger')) return 'chat';
  if (t.includes('face') || t.includes('gesture') || t.includes('opencv') || t.includes('detection') || t.includes('recognition') || t.includes('lane') || t.includes('vision') || t.includes('object')) return 'vision_ai';
  if (t.includes('netflix') || t.includes('movie') || t.includes('streaming') || t.includes('video player')) return 'netflix';
  if (t.includes('spotify') || t.includes('music') || t.includes('mp3') || t.includes('audio')) return 'spotify';
  if (t.includes('ecommerce') || t.includes('shop') || t.includes('amazon') || t.includes('cart') || t.includes('store') || t.includes('food delivery')) return 'ecommerce';
  if (t.includes('quiz') || t.includes('exam') || t.includes('test system')) return 'quiz';
  if (t.includes('crypto') || t.includes('bitcoin') || t.includes('stock')) return 'crypto';
  if (t.includes('portfolio') || t.includes('resume') || t.includes('personal website')) return 'portfolio';
  if (t.includes('calculator') || t.includes('tip calculator') || t.includes('age calculator')) return 'calculator';
  if (t.includes('todo') || t.includes('task') || t.includes('notes')) return 'todo';
  if (t.includes('qr code') || t.includes('barcode') || t.includes('youtube') || t.includes('downloader') || t.includes('scraper') || t.includes('automation') || t.includes('email sender')) return 'automation';
  if (t.includes('turtle')) return 'turtle_graphics';
  if (t.includes('django') || t.includes('flask') || t.includes('spring boot') || t.includes('rest api')) return 'backend_framework';
  if (t.includes('react') || t.includes('next.js') || t.includes('tailwind')) return 'react_app';
  if (t.includes('java')) return 'java_core';
  if (t.includes('python')) return 'python_core';
  return 'general_software';
}

function getThemeConfig(type) {
  switch (type) {
    case 'game_2048':
      return {
        bgFrom: '#1c1917', bgTo: '#0c0a09', glow: '#d97706', accent: '#f59e0b', tag: 'GAME ALGORITHM',
        badge: 'PYTHON TKINTER', icon: '2048'
      };
    case 'valentine':
      return {
        bgFrom: '#3b0764', bgTo: '#1e0524', glow: '#e11d48', accent: '#fb7185', tag: 'PROCEDURAL ANIMATION',
        badge: 'PYTHON TURTLE', icon: 'HEART'
      };
    case 'rose':
      return {
        bgFrom: '#270816', bgTo: '#0d0208', glow: '#f43f5e', accent: '#fb7185', tag: 'BOTANICAL GEOMETRY',
        badge: 'TURTLE GRAPHICS', icon: 'ROSE'
      };
    case 'flag':
      return {
        bgFrom: '#18120b', bgTo: '#07160d', glow: '#ea580c', accent: '#16a34a', tag: 'NATIONAL PATRIOTIC ART',
        badge: 'TURTLE GEOMETRY', icon: 'FLAG'
      };
    case 'binary':
      return {
        bgFrom: '#022c22', bgTo: '#02130e', glow: '#10b981', accent: '#34d399', tag: 'ALGORITHMS & LOGIC',
        badge: 'PYTHON CORE', icon: 'BINARY'
      };
    case 'weather':
      return {
        bgFrom: '#082f49', bgTo: '#031726', glow: '#0284c7', accent: '#38bdf8', tag: 'METEOROLOGICAL API',
        badge: 'DJANGO / REACT', icon: 'WEATHER'
      };
    case 'notepad':
      return {
        bgFrom: '#1e1b4b', bgTo: '#0f0e26', glow: '#6366f1', accent: '#818cf8', tag: 'DESKTOP PRODUCTIVITY',
        badge: 'PYTHON TKINTER', icon: 'EDITOR'
      };
    case 'phone_lookup':
      return {
        bgFrom: '#0c1a2e', bgTo: '#060d17', glow: '#2563eb', accent: '#60a5fa', tag: 'TELECOM & GEOCODING',
        badge: 'GEO-LOCATION', icon: 'RADAR'
      };
    case 'car_racing':
      return {
        bgFrom: '#2e1005', bgTo: '#140702', glow: '#ea580c', accent: '#f97316', tag: '2D ARCADE ENGINE',
        badge: 'PYGAME', icon: 'RACE'
      };
    case 'clock':
      return {
        bgFrom: '#172554', bgTo: '#0b132b', glow: '#3b82f6', accent: '#93c5fd', tag: 'TIME TELEMETRY',
        badge: 'GUI APPLICATION', icon: 'CLOCK'
      };
    case 'snake':
      return {
        bgFrom: '#052e16', bgTo: '#02140a', glow: '#22c55e', accent: '#4ade80', tag: 'CLASSIC ARCADE',
        badge: 'GAME ENGINE', icon: 'SNAKE'
      };
    case 'tictactoe':
    case 'flappy':
    case 'boardgame':
    case 'arcade_game':
      return {
        bgFrom: '#311042', bgTo: '#15071d', glow: '#a855f7', accent: '#c084fc', tag: 'INTERACTIVE GAME',
        badge: 'ARCADE SUITE', icon: 'GAMEPAD'
      };
    case 'hospital':
      return {
        bgFrom: '#083344', bgTo: '#031922', glow: '#06b6d4', accent: '#22d3ee', tag: 'HEALTHCARE SYSTEM',
        badge: 'ENTERPRISE APPS', icon: 'HOSPITAL'
      };
    case 'bank_atm':
      return {
        bgFrom: '#064e3b', bgTo: '#02231b', glow: '#10b981', accent: '#34d399', tag: 'FINTECH & BANKING',
        badge: 'SECURITY ENGINE', icon: 'VAULT'
      };
    case 'library':
      return {
        bgFrom: '#291807', bgTo: '#120b03', glow: '#d97706', accent: '#fbbf24', tag: 'ACADEMIC REPOSITORY',
        badge: 'CATALOG ENGINE', icon: 'BOOK'
      };
    case 'billing':
      return {
        bgFrom: '#142718', bgTo: '#08120b', glow: '#15803d', accent: '#4ade80', tag: 'COMMERCIAL POS',
        badge: 'INVOICE ENGINE', icon: 'INVOICE'
      };
    case 'hotel':
      return {
        bgFrom: '#2d1b06', bgTo: '#130c02', glow: '#b45309', accent: '#f59e0b', tag: 'HOSPITALITY BOOKING',
        badge: 'RESERVATION SYS', icon: 'HOTEL'
      };
    case 'student':
      return {
        bgFrom: '#1e1b4b', bgTo: '#0c0a21', glow: '#4f46e5', accent: '#818cf8', tag: 'CAMPUS ERP',
        badge: 'ACADEMIC PORTAL', icon: 'GRADUATION'
      };
    case 'chat':
      return {
        bgFrom: '#0e2b40', bgTo: '#06141e', glow: '#0284c7', accent: '#38bdf8', tag: 'REAL-TIME WEBSOCKET',
        badge: 'COMMUNICATION', icon: 'CHAT'
      };
    case 'vision_ai':
      return {
        bgFrom: '#280c45', bgTo: '#11051f', glow: '#8b5cf6', accent: '#c084fc', tag: 'COMPUTER VISION AI',
        badge: 'OPENCV & DEEP LEARNING', icon: 'AI_SCAN'
      };
    case 'netflix':
      return {
        bgFrom: '#300a0e', bgTo: '#140305', glow: '#e11d48', accent: '#f43f5e', tag: 'MEDIA STREAMING',
        badge: 'REACT & TAILWIND', icon: 'FILM'
      };
    case 'spotify':
      return {
        bgFrom: '#052e16', bgTo: '#02140a', glow: '#10b981', accent: '#34d399', tag: 'AUDIO PLAYER',
        badge: 'WEB AUDIO API', icon: 'AUDIO'
      };
    case 'ecommerce':
      return {
        bgFrom: '#1c1917', bgTo: '#0c0a09', glow: '#f59e0b', accent: '#fbbf24', tag: 'COMMERCE PLATFORM',
        badge: 'FULLSTACK STORE', icon: 'CART'
      };
    case 'quiz':
      return {
        bgFrom: '#1f1338', bgTo: '#0d0718', glow: '#9333ea', accent: '#c084fc', tag: 'ASSESSMENT ENGINE',
        badge: 'INTERACTIVE QUIZ', icon: 'QUIZ'
      };
    case 'crypto':
      return {
        bgFrom: '#18120b', bgTo: '#0a0704', glow: '#f59e0b', accent: '#fbbf24', tag: 'CRYPTO TELEMETRY',
        badge: 'BLOCKCHAIN API', icon: 'CRYPTO'
      };
    case 'portfolio':
      return {
        bgFrom: '#111827', bgTo: '#030712', glow: '#6366f1', accent: '#a5b4fc', tag: 'DEV SHOWCASE',
        badge: 'RESPONSIVE WEB', icon: 'CODE'
      };
    case 'calculator':
      return {
        bgFrom: '#18181b', bgTo: '#09090b', glow: '#06b6d4', accent: '#22d3ee', tag: 'NUMERICAL COMPUTATION',
        badge: 'MATH UTILITY', icon: 'CALCULATOR'
      };
    case 'todo':
      return {
        bgFrom: '#111827', bgTo: '#030712', glow: '#10b981', accent: '#34d399', tag: 'PRODUCTIVITY SUITE',
        badge: 'TASK ENGINE', icon: 'CHECKLIST'
      };
    case 'automation':
      return {
        bgFrom: '#141c2b', bgTo: '#070b12', glow: '#0284c7', accent: '#38bdf8', tag: 'BOT AUTOMATION',
        badge: 'SCRIPT UTILITY', icon: 'ROBOT'
      };
    case 'turtle_graphics':
      return {
        bgFrom: '#231238', bgTo: '#0e0717', glow: '#d946ef', accent: '#f0abfc', tag: 'PROCEDURAL CANVAS',
        badge: 'TURTLE GRAPHICS', icon: 'PALETTE'
      };
    case 'backend_framework':
      return {
        bgFrom: '#18181b', bgTo: '#09090b', glow: '#10b981', accent: '#34d399', tag: 'ENTERPRISE BACKEND',
        badge: 'API ARCHITECTURE', icon: 'SERVER'
      };
    case 'react_app':
      return {
        bgFrom: '#0b1d33', bgTo: '#040b14', glow: '#0284c7', accent: '#38bdf8', tag: 'MODERN WEB APPLICATION',
        badge: 'REACT & COMPONENT UI', icon: 'REACT'
      };
    case 'java_core':
      return {
        bgFrom: '#241010', bgTo: '#0d0505', glow: '#ef4444', accent: '#f87171', tag: 'JAVA APPLICATION',
        badge: 'JAVA 17 & SWING', icon: 'JAVA'
      };
    case 'python_core':
    default:
      return {
        bgFrom: '#0e1f38', bgTo: '#060e1a', glow: '#3b82f6', accent: '#60a5fa', tag: 'PYTHON WORKFLOW',
        badge: 'PYTHON 3.11', icon: 'PYTHON'
      };
  }
}

function renderVisualGraphic(icon, accent, glow) {
  switch (icon) {
    case '2048':
      return `
        <!-- 2048 Game Grid -->
        <g transform="translate(480, 100)">
          <rect width="260" height="260" rx="16" fill="#292524" stroke="#44403c" stroke-width="3" />
          <!-- 4x4 Grid Tiles -->
          <rect x="16" y="16" width="50" height="50" rx="8" fill="#57534e" />
          <text x="41" y="48" fill="#ffffff" font-family="monospace" font-size="20" font-weight="bold" text-anchor="middle">2</text>
          
          <rect x="76" y="16" width="50" height="50" rx="8" fill="#78716c" />
          <text x="101" y="48" fill="#ffffff" font-family="monospace" font-size="20" font-weight="bold" text-anchor="middle">4</text>
          
          <rect x="136" y="16" width="50" height="50" rx="8" fill="#d97706" />
          <text x="161" y="48" fill="#ffffff" font-family="monospace" font-size="20" font-weight="bold" text-anchor="middle">8</text>
          
          <rect x="196" y="16" width="50" height="50" rx="8" fill="#ea580c" />
          <text x="221" y="48" fill="#ffffff" font-family="monospace" font-size="18" font-weight="bold" text-anchor="middle">16</text>
          
          <!-- Row 2 -->
          <rect x="16" y="76" width="50" height="50" rx="8" fill="#78716c" />
          <text x="41" y="108" fill="#ffffff" font-family="monospace" font-size="20" font-weight="bold" text-anchor="middle">4</text>
          
          <rect x="76" y="76" width="50" height="50" rx="8" fill="#f59e0b" filter="url(#glow-filter)" />
          <text x="101" y="108" fill="#18181b" font-family="monospace" font-size="16" font-weight="900" text-anchor="middle">2048</text>
          
          <rect x="136" y="76" width="50" height="50" rx="8" fill="#b45309" />
          <text x="161" y="108" fill="#ffffff" font-family="monospace" font-size="18" font-weight="bold" text-anchor="middle">64</text>
          
          <rect x="196" y="76" width="50" height="50" rx="8" fill="#57534e" />
          <text x="221" y="108" fill="#ffffff" font-family="monospace" font-size="20" font-weight="bold" text-anchor="middle">2</text>
          
          <!-- Row 3 & 4 Tiles -->
          <rect x="16" y="136" width="50" height="50" rx="8" fill="#d97706" />
          <rect x="76" y="136" width="50" height="50" rx="8" fill="#ea580c" />
          <rect x="136" y="136" width="50" height="50" rx="8" fill="#f59e0b" />
          <rect x="196" y="136" width="50" height="50" rx="8" fill="#44403c" />
          
          <rect x="16" y="196" width="50" height="50" rx="8" fill="#44403c" />
          <rect x="76" y="196" width="50" height="50" rx="8" fill="#57534e" />
          <rect x="136" y="196" width="50" height="50" rx="8" fill="#44403c" />
          <rect x="196" y="196" width="50" height="50" rx="8" fill="#d97706" />
        </g>
      `;
    case 'HEART':
      return `
        <!-- Valentine Glowing Heart -->
        <g transform="translate(500, 110)">
          <path d="M 100 240 C 20 160 0 100 0 50 C 0 20 20 0 50 0 C 80 0 100 30 100 30 C 100 30 120 0 150 0 C 180 0 200 20 200 50 C 200 100 180 160 100 240 Z" 
                fill="url(#heart-grad)" stroke="#fda4af" stroke-width="3" filter="url(#glow-filter)" />
          <!-- Particle Constellation -->
          <circle cx="20" cy="20" r="4" fill="#f43f5e" opacity="0.8" />
          <circle cx="180" cy="40" r="5" fill="#fb7185" opacity="0.9" />
          <circle cx="30" cy="180" r="3" fill="#fda4af" opacity="0.7" />
          <circle cx="170" cy="190" r="4" fill="#f43f5e" opacity="0.8" />
          <circle cx="100" cy="90" r="6" fill="#ffffff" opacity="0.9" />
          <path d="M 60 70 Q 100 40 140 70" stroke="#ffffff" stroke-width="2" fill="none" opacity="0.6" stroke-linecap="round" />
        </g>
      `;
    case 'ROSE':
      return `
        <!-- Rose Floral Geometry -->
        <g transform="translate(510, 120)">
          <circle cx="100" cy="90" r="75" fill="none" stroke="#f43f5e" stroke-width="4" stroke-dasharray="10 6" opacity="0.4" />
          <circle cx="100" cy="90" r="50" fill="url(#rose-grad)" stroke="#fb7185" stroke-width="3" filter="url(#glow-filter)" />
          <path d="M 100 40 C 130 50 140 80 130 110 C 120 140 80 140 70 110 C 60 80 70 50 100 40 Z" fill="#e11d48" opacity="0.8" />
          <path d="M 100 90 Q 120 120 100 150 Q 80 120 100 90" fill="#be123c" />
          <!-- Stem & Leaf -->
          <path d="M 100 145 Q 90 200 110 240" stroke="#22c55e" stroke-width="5" fill="none" stroke-linecap="round" />
          <path d="M 95 190 Q 60 180 50 200 Q 80 205 95 190" fill="#16a34a" />
          <path d="M 105 170 Q 140 160 150 180 Q 120 185 105 170" fill="#16a34a" />
        </g>
      `;
    case 'FLAG':
      return `
        <!-- Indian Flag & Ashoka Chakra -->
        <g transform="translate(480, 120)">
          <!-- Saffron, White, Green Bands -->
          <rect x="0" y="0" width="260" height="60" rx="6" fill="#f97316" />
          <rect x="0" y="60" width="260" height="60" fill="#f8fafc" />
          <rect x="0" y="120" width="260" height="60" rx="6" fill="#16a34a" />
          <!-- Ashoka Chakra (24 Spokes) -->
          <circle cx="130" cy="90" r="24" fill="none" stroke="#1d4ed8" stroke-width="3" />
          <circle cx="130" cy="90" r="4" fill="#1d4ed8" />
          <!-- Spokes -->
          <g stroke="#1d4ed8" stroke-width="1.5">
            ${Array.from({length: 12}).map((_, i) => `<line x1="130" y1="90" x2="${130 + 24 * Math.cos(i * Math.PI / 6)}" y2="${90 + 24 * Math.sin(i * Math.PI / 6)}" />`).join('')}
          </g>
          <!-- Mast -->
          <rect x="-10" y="-10" width="10" height="240" rx="4" fill="#94a3b8" />
        </g>
      `;
    case 'BINARY':
      return `
        <!-- Binary Logic Gate Matrix -->
        <g transform="translate(490, 110)">
          <rect width="250" height="230" rx="14" fill="#064e3b" stroke="#10b981" stroke-width="2" opacity="0.9" />
          <g font-family="monospace" font-size="16" fill="#34d399" font-weight="bold">
            <text x="25" y="45">01000010 01001001</text>
            <text x="25" y="80">01001110 01000001</text>
            <text x="25" y="115">01010010 01011001</text>
            <text x="25" y="150">DEC: 2048 -> BIN</text>
            <text x="25" y="185">HEX: 0x800 [OK]</text>
          </g>
          <path d="M 25 205 L 225 205" stroke="#10b981" stroke-width="3" stroke-dasharray="4 4" />
        </g>
      `;
    case 'WEATHER':
      return `
        <!-- Weather Glass HUD -->
        <g transform="translate(480, 100)">
          <rect width="260" height="240" rx="16" fill="#0c4a6e" stroke="#38bdf8" stroke-width="2" opacity="0.8" />
          <!-- Sun -->
          <circle cx="85" cy="75" r="32" fill="#facc15" filter="url(#glow-filter)" />
          <!-- Cloud Overlay -->
          <path d="M 60 130 C 60 100 90 95 105 105 C 120 90 155 95 160 120 C 175 120 185 130 185 145 C 185 160 170 170 150 170 L 60 170 C 45 170 35 155 35 145 C 35 135 45 130 60 130 Z" fill="#e2e8f0" opacity="0.95" />
          <!-- Rain / Lightning -->
          <path d="M 125 180 L 115 200 L 135 200 L 120 225" stroke="#facc15" stroke-width="3" fill="none" stroke-linecap="round" />
          <text x="200" y="80" fill="#38bdf8" font-family="sans-serif" font-size="28" font-weight="900">28°C</text>
          <text x="200" y="110" fill="#94a3b8" font-family="sans-serif" font-size="13">Sunny / Rain</text>
          <text x="200" y="130" fill="#38bdf8" font-family="sans-serif" font-size="12">Humidity 68%</text>
        </g>
      `;
    case 'EDITOR':
      return `
        <!-- Code & Notepad Mockup -->
        <g transform="translate(470, 100)">
          <rect width="280" height="240" rx="12" fill="#0f172a" stroke="#334155" stroke-width="2" />
          <!-- Window Header -->
          <rect width="280" height="34" rx="12" fill="#1e293b" />
          <circle cx="20" cy="17" r="5" fill="#ef4444" />
          <circle cx="36" cy="17" r="5" fill="#f59e0b" />
          <circle cx="52" cy="17" r="5" fill="#10b981" />
          <text x="140" y="22" fill="#94a3b8" font-family="sans-serif" font-size="12" text-anchor="middle">notepad_editor.py</text>
          <!-- Code Lines -->
          <rect x="25" y="55" width="80" height="8" rx="4" fill="#f43f5e" />
          <rect x="115" y="55" width="120" height="8" rx="4" fill="#38bdf8" />
          <rect x="45" y="75" width="160" height="8" rx="4" fill="#a855f7" />
          <rect x="45" y="95" width="90" height="8" rx="4" fill="#22c55e" />
          <rect x="25" y="120" width="130" height="8" rx="4" fill="#f59e0b" />
          <rect x="45" y="140" width="180" height="8" rx="4" fill="#64748b" />
          <rect x="45" y="160" width="110" height="8" rx="4" fill="#38bdf8" />
          <!-- Cursor -->
          <rect x="160" y="158" width="3" height="12" fill="#f59e0b" />
        </g>
      `;
    case 'RADAR':
      return `
        <!-- Telecom Signal & Map Radar -->
        <g transform="translate(490, 100)">
          <circle cx="125" cy="120" r="105" fill="#0f172a" stroke="#2563eb" stroke-width="2" />
          <circle cx="125" cy="120" r="75" fill="none" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="6 6" />
          <circle cx="125" cy="120" r="45" fill="none" stroke="#60a5fa" stroke-width="1" />
          <!-- Sweep Line -->
          <line x1="125" y1="120" x2="200" y2="45" stroke="#60a5fa" stroke-width="3" stroke-linecap="round" filter="url(#glow-filter)" />
          <!-- Carrier Location Pin -->
          <circle cx="170" cy="75" r="7" fill="#ef4444" filter="url(#glow-filter)" />
          <text x="125" y="215" fill="#60a5fa" font-family="monospace" font-size="13" font-weight="bold" text-anchor="middle">GPS: 40.7128° N, 74.0060° W</text>
        </g>
      `;
    case 'RACE':
      return `
        <!-- Arcade Car & Speedometer -->
        <g transform="translate(480, 110)">
          <!-- Road Perspective -->
          <path d="M 40 220 L 90 50 L 170 50 L 220 220 Z" fill="#262626" stroke="#404040" stroke-width="2" />
          <line x1="130" y1="50" x2="130" y2="220" stroke="#facc15" stroke-width="4" stroke-dasharray="14 10" />
          <!-- 2D Pixel Race Car -->
          <rect x="105" y="130" width="50" height="70" rx="8" fill="#ef4444" stroke="#ffffff" stroke-width="2" filter="url(#glow-filter)" />
          <rect x="115" y="145" width="30" height="25" rx="4" fill="#38bdf8" />
          <!-- Wheels -->
          <rect x="98" y="135" width="8" height="18" rx="2" fill="#171717" />
          <rect x="154" y="135" width="8" height="18" rx="2" fill="#171717" />
          <rect x="98" y="175" width="8" height="18" rx="2" fill="#171717" />
          <rect x="154" y="175" width="8" height="18" rx="2" fill="#171717" />
        </g>
      `;
    case 'CLOCK':
      return `
        <!-- Modern LED Alarm Clock -->
        <g transform="translate(480, 110)">
          <rect width="260" height="220" rx="20" fill="#0f172a" stroke="#3b82f6" stroke-width="2" />
          <circle cx="130" cy="110" r="80" fill="#1e293b" stroke="#60a5fa" stroke-width="3" />
          <!-- Clock Hands -->
          <line x1="130" y1="110" x2="130" y2="55" stroke="#f59e0b" stroke-width="4" stroke-linecap="round" />
          <line x1="130" y1="110" x2="175" y2="110" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" />
          <circle cx="130" cy="110" r="6" fill="#ffffff" />
          <!-- Alarm Bells -->
          <path d="M 60 45 C 50 30 75 15 90 30 Z" fill="#f59e0b" />
          <path d="M 200 45 C 210 30 185 15 170 30 Z" fill="#f59e0b" />
          <text x="130" y="210" fill="#38bdf8" font-family="monospace" font-size="16" font-weight="bold" text-anchor="middle">07:00:00 AM</text>
        </g>
      `;
    case 'SNAKE':
      return `
        <!-- Retro Snake Game -->
        <g transform="translate(480, 100)">
          <rect width="260" height="240" rx="14" fill="#052e16" stroke="#22c55e" stroke-width="2" />
          <!-- Snake Body Segments -->
          <rect x="40" y="120" width="22" height="22" rx="4" fill="#22c55e" />
          <rect x="65" y="120" width="22" height="22" rx="4" fill="#22c55e" />
          <rect x="90" y="120" width="22" height="22" rx="4" fill="#22c55e" />
          <rect x="115" y="120" width="22" height="22" rx="4" fill="#22c55e" />
          <rect x="115" y="95" width="22" height="22" rx="4" fill="#22c55e" />
          <rect x="115" y="70" width="22" height="22" rx="4" fill="#4ade80" filter="url(#glow-filter)" />
          <!-- Eyes -->
          <circle cx="120" cy="76" r="3" fill="#000000" />
          <circle cx="132" cy="76" r="3" fill="#000000" />
          <!-- Red Food Apple -->
          <circle cx="180" cy="70" r="10" fill="#ef4444" filter="url(#glow-filter)" />
          <text x="130" y="220" fill="#4ade80" font-family="monospace" font-size="15" font-weight="bold" text-anchor="middle">SCORE: 1,480 PTS</text>
        </g>
      `;
    case 'GAMEPAD':
      return `
        <!-- Console Gamepad Controller -->
        <g transform="translate(480, 110)">
          <path d="M 40 100 C 40 60 70 40 130 40 C 190 40 220 60 220 100 C 220 160 190 190 170 190 C 150 190 140 160 130 160 C 120 160 110 190 90 190 C 70 190 40 160 40 100 Z" fill="#3b0764" stroke="#a855f7" stroke-width="3" filter="url(#glow-filter)" />
          <!-- D-Pad -->
          <rect x="75" y="85" width="12" height="36" rx="2" fill="#c084fc" />
          <rect x="63" y="97" width="36" height="12" rx="2" fill="#c084fc" />
          <!-- Action Buttons -->
          <circle cx="170" cy="90" r="7" fill="#f43f5e" />
          <circle cx="185" cy="105" r="7" fill="#38bdf8" />
          <circle cx="155" cy="105" r="7" fill="#facc15" />
          <circle cx="170" cy="120" r="7" fill="#22c55e" />
        </g>
      `;
    case 'HOSPITAL':
      return `
        <!-- Hospital & ECG Telemetry -->
        <g transform="translate(470, 100)">
          <rect width="280" height="240" rx="16" fill="#083344" stroke="#06b6d4" stroke-width="2" />
          <!-- Medical Cross -->
          <rect x="125" y="35" width="30" height="70" rx="6" fill="#ef4444" filter="url(#glow-filter)" />
          <rect x="105" y="55" width="70" height="30" rx="6" fill="#ef4444" filter="url(#glow-filter)" />
          <!-- ECG Pulse Waveform -->
          <path d="M 20 160 L 70 160 L 85 130 L 100 190 L 115 110 L 130 180 L 145 150 L 160 160 L 260 160" 
                stroke="#22d3ee" stroke-width="3" fill="none" stroke-linecap="round" filter="url(#glow-filter)" />
          <text x="140" y="215" fill="#67e8f9" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">BPM: 72 • NORMAL PULSE</text>
        </g>
      `;
    case 'VAULT':
      return `
        <!-- ATM Smart Card & Bank Vault -->
        <g transform="translate(480, 100)">
          <!-- Smart Card -->
          <rect width="260" height="160" rx="14" fill="#064e3b" stroke="#10b981" stroke-width="2" />
          <!-- Gold Chip -->
          <rect x="30" y="40" width="45" height="35" rx="6" fill="#f59e0b" stroke="#d97706" stroke-width="2" />
          <line x1="30" y1="58" x2="75" y2="58" stroke="#78350f" stroke-width="1.5" />
          <line x1="52" y1="40" x2="52" y2="75" stroke="#78350f" stroke-width="1.5" />
          <!-- Card Details -->
          <text x="30" y="110" fill="#a7f3d0" font-family="monospace" font-size="16" font-weight="bold">•••• •••• •••• 8842</text>
          <text x="30" y="135" fill="#6ee7b7" font-family="sans-serif" font-size="12">SECURE TRANSACTIONS</text>
          <!-- ATM Cash Flow -->
          <rect x="20" y="180" width="220" height="40" rx="8" fill="#042f2e" stroke="#34d399" stroke-width="1.5" />
          <text x="130" y="205" fill="#34d399" font-family="monospace" font-size="15" font-weight="bold" text-anchor="middle">₹ 10,000 DISPENSED [OK]</text>
        </g>
      `;
    case 'BOOK':
      return `
        <!-- Library Books & Knowledge Stack -->
        <g transform="translate(480, 100)">
          <!-- Open Book -->
          <path d="M 40 150 Q 85 120 130 140 Q 175 120 220 150 L 220 210 Q 175 180 130 200 Q 85 180 40 210 Z" fill="#fef3c7" stroke="#d97706" stroke-width="3" />
          <!-- Page Lines -->
          <line x1="60" y1="160" x2="110" y2="150" stroke="#78350f" stroke-width="2" />
          <line x1="60" y1="175" x2="110" y2="165" stroke="#78350f" stroke-width="2" />
          <line x1="150" y1="150" x2="200" y2="160" stroke="#78350f" stroke-width="2" />
          <line x1="150" y1="165" x2="200" y2="175" stroke="#78350f" stroke-width="2" />
          <!-- Top Floating Books -->
          <rect x="60" y="60" width="140" height="24" rx="4" fill="#b45309" stroke="#f59e0b" stroke-width="2" />
          <rect x="75" y="32" width="120" height="24" rx="4" fill="#0369a1" stroke="#38bdf8" stroke-width="2" />
        </g>
      `;
    case 'INVOICE':
      return `
        <!-- Billing & Pos Invoice -->
        <g transform="translate(480, 95)">
          <rect width="250" height="250" rx="12" fill="#ffffff" stroke="#15803d" stroke-width="2" opacity="0.95" />
          <text x="30" y="40" fill="#15803d" font-family="sans-serif" font-size="16" font-weight="bold">TAX INVOICE / RECEIPT</text>
          <line x1="30" y1="55" x2="220" y2="55" stroke="#cbd5e1" stroke-width="1.5" />
          <!-- Item rows -->
          <text x="30" y="80" fill="#334155" font-family="monospace" font-size="12">Product SKU-01</text>
          <text x="180" y="80" fill="#0f172a" font-family="monospace" font-size="12">₹ 2,499</text>
          <text x="30" y="105" fill="#334155" font-family="monospace" font-size="12">GST (18% Output)</text>
          <text x="180" y="105" fill="#0f172a" font-family="monospace" font-size="12">₹ 449</text>
          <line x1="30" y1="125" x2="220" y2="125" stroke="#cbd5e1" stroke-width="1.5" />
          <text x="30" y="150" fill="#15803d" font-family="sans-serif" font-size="15" font-weight="900">NET TOTAL</text>
          <text x="160" y="150" fill="#15803d" font-family="sans-serif" font-size="16" font-weight="900">₹ 2,948</text>
          <!-- Barcode -->
          <g transform="translate(40, 180)">
            <rect x="0" y="0" width="4" height="40" fill="#0f172a" />
            <rect x="8" y="0" width="8" height="40" fill="#0f172a" />
            <rect x="20" y="0" width="3" height="40" fill="#0f172a" />
            <rect x="28" y="0" width="6" height="40" fill="#0f172a" />
            <rect x="38" y="0" width="10" height="40" fill="#0f172a" />
            <rect x="52" y="0" width="4" height="40" fill="#0f172a" />
            <rect x="62" y="0" width="7" height="40" fill="#0f172a" />
            <rect x="74" y="0" width="4" height="40" fill="#0f172a" />
            <rect x="84" y="0" width="12" height="40" fill="#0f172a" />
            <rect x="102" y="0" width="5" height="40" fill="#0f172a" />
            <rect x="114" y="0" width="9" height="40" fill="#0f172a" />
            <rect x="130" y="0" width="4" height="40" fill="#0f172a" />
            <rect x="140" y="0" width="8" height="40" fill="#0f172a" />
            <rect x="154" y="0" width="5" height="40" fill="#0f172a" />
          </g>
        </g>
      `;
    case 'AI_SCAN':
      return `
        <!-- Computer Vision Biometric HUD -->
        <g transform="translate(480, 100)">
          <!-- Target Bracket Box -->
          <rect width="250" height="240" rx="16" fill="#1e1035" stroke="#8b5cf6" stroke-width="2" />
          <!-- Corner brackets -->
          <path d="M 30 60 L 30 30 L 60 30" stroke="#c084fc" stroke-width="4" fill="none" stroke-linecap="round" />
          <path d="M 190 30 L 220 30 L 220 60" stroke="#c084fc" stroke-width="4" fill="none" stroke-linecap="round" />
          <path d="M 30 180 L 30 210 L 60 210" stroke="#c084fc" stroke-width="4" fill="none" stroke-linecap="round" />
          <path d="M 190 210 L 220 210 L 220 180" stroke="#c084fc" stroke-width="4" fill="none" stroke-linecap="round" />
          <!-- Facial Landmark Mesh -->
          <ellipse cx="125" cy="115" rx="55" ry="70" fill="none" stroke="#a855f7" stroke-width="2" stroke-dasharray="4 4" />
          <circle cx="105" cy="95" r="5" fill="#38bdf8" />
          <circle cx="145" cy="95" r="5" fill="#38bdf8" />
          <path d="M 125 105 L 125 125 L 115 130" stroke="#38bdf8" stroke-width="2" fill="none" />
          <path d="M 105 150 Q 125 165 145 150" stroke="#38bdf8" stroke-width="2" fill="none" />
          <!-- HUD Tag -->
          <rect x="40" y="175" width="170" height="24" rx="4" fill="#581c87" />
          <text x="125" y="192" fill="#c084fc" font-family="monospace" font-size="12" font-weight="bold" text-anchor="middle">MATCH CONFIDENCE: 99.4%</text>
        </g>
      `;
    case 'FILM':
      return `
        <!-- Streaming Video & Play Button -->
        <g transform="translate(480, 100)">
          <rect width="260" height="230" rx="16" fill="#180004" stroke="#e11d48" stroke-width="2" />
          <!-- Cinema Reel Ribbon -->
          <path d="M 40 40 L 80 40 L 140 190 L 100 190 Z" fill="#be123c" />
          <path d="M 80 40 L 120 40 L 180 190 L 140 190 Z" fill="#e11d48" />
          <!-- Glowing Play Button -->
          <circle cx="190" cy="115" r="32" fill="#ef4444" filter="url(#glow-filter)" />
          <polygon points="182,100 206,115 182,130" fill="#ffffff" />
        </g>
      `;
    case 'AUDIO':
      return `
        <!-- Audio Spectrum & Turntable -->
        <g transform="translate(480, 100)">
          <rect width="260" height="230" rx="16" fill="#022c22" stroke="#10b981" stroke-width="2" />
          <!-- Vinyl Disc -->
          <circle cx="90" cy="115" r="60" fill="#0f172a" stroke="#34d399" stroke-width="2" />
          <circle cx="90" cy="115" r="20" fill="#10b981" />
          <circle cx="90" cy="115" r="4" fill="#ffffff" />
          <!-- Equalizer Spectrum Bars -->
          <g transform="translate(165, 60)">
            <rect x="0" y="60" width="8" height="50" rx="4" fill="#34d399" />
            <rect x="12" y="20" width="8" height="90" rx="4" fill="#10b981" />
            <rect x="24" y="40" width="8" height="70" rx="4" fill="#34d399" />
            <rect x="36" y="10" width="8" height="100" rx="4" fill="#4ade80" />
            <rect x="48" y="35" width="8" height="75" rx="4" fill="#10b981" />
            <rect x="60" y="55" width="8" height="55" rx="4" fill="#34d399" />
          </g>
          <text x="130" y="205" fill="#6ee7b7" font-family="monospace" font-size="13" font-weight="bold" text-anchor="middle">320 KBPS • HI-RES AUDIO</text>
        </g>
      `;
    case 'CART':
      return `
        <!-- E-Commerce Shopping Cart -->
        <g transform="translate(480, 110)">
          <rect width="250" height="220" rx="16" fill="#1c1917" stroke="#f59e0b" stroke-width="2" />
          <!-- Shopping Cart Body -->
          <path d="M 40 50 L 70 50 L 95 130 L 190 130 L 210 75 L 75 75" stroke="#f59e0b" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round" />
          <!-- Wheels -->
          <circle cx="105" cy="155" r="10" fill="#f59e0b" />
          <circle cx="180" cy="155" r="10" fill="#f59e0b" />
          <!-- Verified Store Badge -->
          <rect x="60" y="175" width="130" height="24" rx="4" fill="#78350f" />
          <text x="125" y="192" fill="#fef3c7" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">1-CLICK CHECKOUT</text>
        </g>
      `;
    case 'CALCULATOR':
      return `
        <!-- Precision Calculator Keypad -->
        <g transform="translate(490, 95)">
          <rect width="240" height="250" rx="16" fill="#18181b" stroke="#06b6d4" stroke-width="2" />
          <!-- Display Screen -->
          <rect x="20" y="20" width="200" height="45" rx="6" fill="#0f172a" stroke="#334155" stroke-width="1.5" />
          <text x="205" y="52" fill="#22d3ee" font-family="monospace" font-size="24" font-weight="bold" text-anchor="end">3,141,592.65</text>
          <!-- Grid Buttons -->
          <g fill="#27272a" stroke="#3f3f46" stroke-width="1">
            <rect x="20" y="80" width="42" height="32" rx="4" /><text x="41" y="102" fill="#e4e4e7" font-family="sans-serif" font-size="14" text-anchor="middle">7</text>
            <rect x="72" y="80" width="42" height="32" rx="4" /><text x="93" y="102" fill="#e4e4e7" font-family="sans-serif" font-size="14" text-anchor="middle">8</text>
            <rect x="124" y="80" width="42" height="32" rx="4" /><text x="145" y="102" fill="#e4e4e7" font-family="sans-serif" font-size="14" text-anchor="middle">9</text>
            <rect x="176" y="80" width="44" height="32" rx="4" fill="#0e7490" /><text x="198" y="102" fill="#ffffff" font-family="sans-serif" font-size="14" text-anchor="middle">÷</text>

            <rect x="20" y="120" width="42" height="32" rx="4" /><text x="41" y="142" fill="#e4e4e7" font-family="sans-serif" font-size="14" text-anchor="middle">4</text>
            <rect x="72" y="120" width="42" height="32" rx="4" /><text x="93" y="142" fill="#e4e4e7" font-family="sans-serif" font-size="14" text-anchor="middle">5</text>
            <rect x="124" y="120" width="42" height="32" rx="4" /><text x="145" y="142" fill="#e4e4e7" font-family="sans-serif" font-size="14" text-anchor="middle">6</text>
            <rect x="176" y="120" width="44" height="32" rx="4" fill="#0e7490" /><text x="198" y="142" fill="#ffffff" font-family="sans-serif" font-size="14" text-anchor="middle">×</text>

            <rect x="20" y="160" width="42" height="32" rx="4" /><text x="41" y="182" fill="#e4e4e7" font-family="sans-serif" font-size="14" text-anchor="middle">1</text>
            <rect x="72" y="160" width="42" height="32" rx="4" /><text x="93" y="182" fill="#e4e4e7" font-family="sans-serif" font-size="14" text-anchor="middle">2</text>
            <rect x="124" y="160" width="42" height="32" rx="4" /><text x="145" y="182" fill="#e4e4e7" font-family="sans-serif" font-size="14" text-anchor="middle">3</text>
            <rect x="176" y="160" width="44" height="32" rx="4" fill="#0e7490" /><text x="198" y="182" fill="#ffffff" font-family="sans-serif" font-size="14" text-anchor="middle">-</text>

            <rect x="20" y="200" width="94" height="32" rx="4" /><text x="67" y="222" fill="#e4e4e7" font-family="sans-serif" font-size="14" text-anchor="middle">0</text>
            <rect x="124" y="200" width="42" height="32" rx="4" /><text x="145" y="222" fill="#e4e4e7" font-family="sans-serif" font-size="14" text-anchor="middle">.</text>
            <rect x="176" y="200" width="44" height="32" rx="4" fill="#0891b2" /><text x="198" y="222" fill="#ffffff" font-family="sans-serif" font-size="16" font-weight="bold" text-anchor="middle">=</text>
          </g>
        </g>
      `;
    case 'REACT':
      return `
        <!-- React Atomic Orbit & Code Window -->
        <g transform="translate(480, 100)">
          <!-- Atomic Core & Orbits -->
          <ellipse cx="130" cy="115" rx="90" ry="34" fill="none" stroke="#38bdf8" stroke-width="3" filter="url(#glow-filter)" />
          <ellipse cx="130" cy="115" rx="90" ry="34" fill="none" stroke="#38bdf8" stroke-width="3" transform="rotate(60 130 115)" filter="url(#glow-filter)" />
          <ellipse cx="130" cy="115" rx="90" ry="34" fill="none" stroke="#38bdf8" stroke-width="3" transform="rotate(120 130 115)" filter="url(#glow-filter)" />
          <circle cx="130" cy="115" r="14" fill="#38bdf8" filter="url(#glow-filter)" />
        </g>
      `;
    case 'JAVA':
      return `
        <!-- Java Steaming Coffee Cup -->
        <g transform="translate(490, 100)">
          <rect width="250" height="230" rx="16" fill="#1f0a0a" stroke="#ef4444" stroke-width="2" />
          <!-- Coffee Cup Body -->
          <path d="M 60 90 L 75 180 Q 75 195 125 195 Q 175 195 175 180 L 190 90 Z" fill="#b91c1c" stroke="#fca5a5" stroke-width="2" />
          <!-- Cup Handle -->
          <path d="M 185 105 Q 220 105 220 135 Q 220 165 178 165" fill="none" stroke="#b91c1c" stroke-width="8" stroke-linecap="round" />
          <!-- Saucer -->
          <ellipse cx="125" cy="205" rx="80" ry="12" fill="#7f1d1d" stroke="#fca5a5" stroke-width="2" />
          <!-- Steam Waves -->
          <path d="M 95 75 Q 85 50 105 30" stroke="#f87171" stroke-width="3" fill="none" stroke-linecap="round" />
          <path d="M 125 75 Q 145 50 125 30" stroke="#f87171" stroke-width="3" fill="none" stroke-linecap="round" />
          <path d="M 155 75 Q 145 50 165 30" stroke="#f87171" stroke-width="3" fill="none" stroke-linecap="round" />
        </g>
      `;
    case 'PYTHON':
    default:
      return `
        <!-- Python Interlocking Serpents -->
        <g transform="translate(500, 100)">
          <rect width="240" height="230" rx="16" fill="#08182b" stroke="#3b82f6" stroke-width="2" />
          <!-- Blue Python Head -->
          <path d="M 120 40 L 70 40 C 50 40 40 50 40 70 L 40 95 C 40 115 50 125 70 125 L 95 125 L 95 105 C 95 90 105 80 120 80 L 145 80 L 145 70 C 145 50 135 40 120 40 Z" fill="#2563eb" filter="url(#glow-filter)" />
          <circle cx="65" cy="60" r="5" fill="#ffffff" />
          <!-- Yellow Python Tail -->
          <path d="M 120 200 L 170 200 C 190 200 200 190 200 170 L 200 145 C 200 125 190 115 170 115 L 145 115 L 145 135 C 145 150 135 160 120 160 L 95 160 L 95 170 C 95 190 105 200 120 200 Z" fill="#eab308" filter="url(#glow-filter)" />
          <circle cx="175" cy="180" r="5" fill="#000000" />
        </g>
      `;
  }
}

function generateSvgPostcard(proj) {
  const type = classifyProject(proj.title, proj.tech);
  const cfg = getThemeConfig(type);

  // Formatted title lines (wrap to 2 lines if long)
  const fullTitle = proj.title.replace(/using Python Turtle Graphics/i, 'Turtle')
                              .replace(/using Python Tkinter/i, 'Tkinter')
                              .replace(/using Django/i, 'Django')
                              .replace(/using Turtle Python/i, 'Turtle');
  const words = fullTitle.split(' ');
  let titleL1 = fullTitle;
  let titleL2 = '';
  if (fullTitle.length > 28 && words.length > 3) {
    const mid = Math.ceil(words.length / 2);
    titleL1 = words.slice(0, mid).join(' ');
    titleL2 = words.slice(mid).join(' ');
  }

  const categoryLabel = escapeXml(cfg.tag);
  const badgeLabel = escapeXml(cfg.badge);
  const title1Esc = escapeXml(titleL1);
  const title2Esc = escapeXml(titleL2);
  const techEsc = escapeXml(proj.tech.split(',').slice(0, 3).join(' • '));

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 480" width="800" height="480">
  <defs>
    <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${cfg.bgFrom}" />
      <stop offset="60%" stop-color="${cfg.bgTo}" />
      <stop offset="100%" stop-color="#050505" />
    </linearGradient>

    <radialGradient id="mesh-glow" cx="80%" cy="30%" r="65%">
      <stop offset="0%" stop-color="${cfg.glow}" stop-opacity="0.35" />
      <stop offset="60%" stop-color="${cfg.glow}" stop-opacity="0.08" />
      <stop offset="100%" stop-color="${cfg.glow}" stop-opacity="0" />
    </radialGradient>

    <linearGradient id="heart-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fb7185" />
      <stop offset="100%" stop-color="#e11d48" />
    </linearGradient>

    <linearGradient id="rose-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f43f5e" />
      <stop offset="100%" stop-color="#be123c" />
    </linearGradient>

    <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <pattern id="dot-grid" width="24" height="24" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1" fill="#ffffff" fill-opacity="0.07" />
    </pattern>
  </defs>

  <!-- Background Layer -->
  <rect width="800" height="480" fill="url(#bg-grad)" />
  <rect width="800" height="480" fill="url(#mesh-glow)" />
  <rect width="800" height="480" fill="url(#dot-grid)" />

  <!-- Outer Card Frame Border -->
  <rect x="12" y="12" width="776" height="456" rx="20" fill="none" stroke="#ffffff" stroke-opacity="0.08" stroke-width="1.5" />
  <rect x="24" y="24" width="752" height="432" rx="14" fill="none" stroke="${cfg.accent}" stroke-opacity="0.2" stroke-width="1" />

  <!-- Top Header Badges -->
  <g transform="translate(48, 48)">
    <!-- Tech Badge Pill -->
    <rect width="160" height="32" rx="8" fill="#18181b" stroke="${cfg.accent}" stroke-width="1.5" stroke-opacity="0.6" />
    <text x="80" y="21" fill="${cfg.accent}" font-family="sans-serif" font-size="11" font-weight="bold" letter-spacing="1" text-anchor="middle">${badgeLabel}</text>

    <!-- Category Pill -->
    <rect x="175" y="0" width="180" height="32" rx="8" fill="#ffffff" fill-opacity="0.05" stroke="#ffffff" stroke-opacity="0.1" stroke-width="1" />
    <text x="265" y="21" fill="#e4e4e7" font-family="sans-serif" font-size="10" font-weight="700" letter-spacing="1" text-anchor="middle">${categoryLabel}</text>
  </g>

  <!-- Domain Specific Centerpiece Graphic -->
  ${renderVisualGraphic(cfg.icon, cfg.accent, cfg.glow)}

  <!-- Left Content Area: Project Title & Details -->
  <g transform="translate(48, 140)">
    <!-- Decorative mini accent bar -->
    <rect x="0" y="0" width="36" height="4" rx="2" fill="${cfg.accent}" />

    <!-- Project Title -->
    <text x="0" y="44" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="32" font-weight="800" letter-spacing="-0.5">${title1Esc}</text>
    ${title2Esc ? `<text x="0" y="82" fill="#f4f4f5" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="800" letter-spacing="-0.5">${title2Esc}</text>` : ''}

    <!-- Tech Stack Summary -->
    <g transform="translate(0, ${title2Esc ? 118 : 78})">
      <text x="0" y="0" fill="#a1a1aa" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="500">${techEsc}</text>
    </g>

    <!-- Key Deliverables Feature Checkmarks -->
    <g transform="translate(0, ${title2Esc ? 154 : 116})">
      <g transform="translate(0, 0)">
        <circle cx="8" cy="8" r="8" fill="${cfg.accent}" fill-opacity="0.2" />
        <path d="M 5 8 L 7.5 10.5 L 12 5.5" stroke="${cfg.accent}" stroke-width="2" fill="none" stroke-linecap="round" />
        <text x="24" y="12" fill="#d4d4d8" font-family="sans-serif" font-size="12" font-weight="600">Full Tested Source Code Included</text>
      </g>
      <g transform="translate(0, 26)">
        <circle cx="8" cy="8" r="8" fill="${cfg.accent}" fill-opacity="0.2" />
        <path d="M 5 8 L 7.5 10.5 L 12 5.5" stroke="${cfg.accent}" stroke-width="2" fill="none" stroke-linecap="round" />
        <text x="24" y="12" fill="#d4d4d8" font-family="sans-serif" font-size="12" font-weight="600">Step-by-Step Installation &amp; Run Manual</text>
      </g>
      <g transform="translate(0, 52)">
        <circle cx="8" cy="8" r="8" fill="${cfg.accent}" fill-opacity="0.2" />
        <path d="M 5 8 L 7.5 10.5 L 12 5.5" stroke="${cfg.accent}" stroke-width="2" fill="none" stroke-linecap="round" />
        <text x="24" y="12" fill="#d4d4d8" font-family="sans-serif" font-size="12" font-weight="600">Academic &amp; Commercial Project Ready</text>
      </g>
    </g>
  </g>

  <!-- Bottom Brand & Verification Footer -->
  <g transform="translate(48, 420)">
    <!-- Watermark / Seal -->
    <g transform="translate(0, 0)">
      <circle cx="10" cy="10" r="10" fill="#f59e0b" fill-opacity="0.2" />
      <polygon points="10,4 12,8 16,9 13,12 14,16 10,14 6,16 7,12 4,9 8,8" fill="#f59e0b" />
      <text x="28" y="14" fill="#a1a1aa" font-family="sans-serif" font-size="11" font-weight="600">EDUNOVA VERIFIED REPOSITORY</text>
    </g>

    <text x="704" y="14" fill="#71717a" font-family="monospace" font-size="11" text-anchor="end">PKG-ID: ${escapeXml(proj.id.substring(0, 24))}</text>
  </g>
</svg>`;
}

let count = 0;
for (const p of projects) {
  const svg = generateSvgPostcard(p);
  const filename = `${p.id}.svg`;
  fs.writeFileSync(path.join(outDir, filename), svg, 'utf8');
  count++;
}

console.log(`Successfully generated and wrote ${count} unique SVG project postcards into ${outDir}/`);
