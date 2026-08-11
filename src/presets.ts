export interface FloorPreset {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
}

// Clean SVG Data URLs for built-in floor templates
const SKELETON_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="100%" height="100%">
  <rect width="100%" height="100%" fill="%2309090b"/>
  <g stroke="rgba(99,102,241,0.2)" stroke-width="1">
    <line x1="0" y1="200" x2="800" y2="200"/>
    <line x1="0" y1="400" x2="800" y2="400"/>
    <line x1="0" y1="600" x2="800" y2="600"/>
    <line x1="0" y1="800" x2="800" y2="800"/>
    <line x1="400" y1="0" x2="400" y2="1000"/>
  </g>
  <!-- Skull -->
  <circle cx="400" cy="140" r="50" fill="%231e1b4b" stroke="%23818cf8" stroke-width="3"/>
  <text x="400" y="145" fill="%23c7d2fe" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">SKULL (Cranium)</text>

  <!-- Cervical Spine -->
  <line x1="400" y1="190" x2="400" y2="250" stroke="%23818cf8" stroke-width="6"/>

  <!-- Clavicle / Shoulder -->
  <line x1="280" y1="250" x2="520" y2="250" stroke="%23818cf8" stroke-width="4"/>

  <!-- Ribcage -->
  <path d="M 330,260 Q 280,340 330,420 L 470,420 Q 520,340 470,260 Z" fill="%231e1b4b" stroke="%23818cf8" stroke-width="3"/>
  <text x="400" y="340" fill="%23c7d2fe" font-family="sans-serif" font-size="16" font-weight="bold" text-anchor="middle">THORAX / RIBCAGE</text>
  <line x1="330" y1="300" x2="470" y2="300" stroke="%236366f1" stroke-width="2"/>
  <line x1="320" y1="340" x2="480" y2="340" stroke="%236366f1" stroke-width="2"/>
  <line x1="330" y1="380" x2="470" y2="380" stroke="%236366f1" stroke-width="2"/>

  <!-- Arms -->
  <line x1="280" y1="250" x2="240" y2="430" stroke="%23818cf8" stroke-width="4"/>
  <line x1="240" y1="430" x2="210" y2="600" stroke="%23818cf8" stroke-width="3"/>
  <circle cx="210" cy="610" r="15" fill="%23312e81" stroke="%23818cf8" stroke-width="2"/>

  <line x1="520" y1="250" x2="560" y2="430" stroke="%23818cf8" stroke-width="4"/>
  <line x1="560" y1="430" x2="590" y2="600" stroke="%23818cf8" stroke-width="3"/>
  <circle cx="590" cy="610" r="15" fill="%23312e81" stroke="%23818cf8" stroke-width="2"/>

  <!-- Spine -->
  <line x1="400" y1="420" x2="400" y2="520" stroke="%23818cf8" stroke-width="8" stroke-dasharray="10 4"/>

  <!-- Pelvis -->
  <path d="M 320,520 Q 400,490 480,520 L 460,600 Q 400,620 340,600 Z" fill="%231e1b4b" stroke="%23818cf8" stroke-width="3"/>
  <text x="400" y="560" fill="%23c7d2fe" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle">PELVIS</text>

  <!-- Legs (Femur, Tibia, Fibula) -->
  <!-- Left Leg -->
  <line x1="360" y1="600" x2="340" y2="780" stroke="%23818cf8" stroke-width="6"/>
  <circle cx="340" cy="790" r="10" fill="%234338ca" stroke="%23818cf8" stroke-width="2"/>
  <line x1="340" y1="800" x2="330" y2="940" stroke="%23818cf8" stroke-width="4"/>
  <path d="M 310,940 L 350,940 L 340,970 L 300,970 Z" fill="%23312e81" stroke="%23818cf8" stroke-width="2"/>

  <!-- Right Leg -->
  <line x1="440" y1="600" x2="460" y2="780" stroke="%23818cf8" stroke-width="6"/>
  <circle cx="460" cy="790" r="10" fill="%234338ca" stroke="%23818cf8" stroke-width="2"/>
  <line x1="460" y1="800" x2="470" y2="940" stroke="%23818cf8" stroke-width="4"/>
  <path d="M 450,940 L 490,940 L 500,970 L 460,970 Z" fill="%23312e81" stroke="%23818cf8" stroke-width="2"/>

  <!-- Labels & Guide Lines -->
  <text x="50" y="50" fill="%2394a3b8" font-family="sans-serif" font-size="18" font-weight="bold">HUMAN SKELETON ANATOMY MAP</text>
  <text x="50" y="75" fill="%2364748b" font-family="sans-serif" font-size="12">Click anywhere on the skeleton diagram to place a spatial memory anchor pin</text>
</svg>`;

const HOUSE_FLOOR_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 700" width="100%" height="100%">
  <rect width="100%" height="100%" fill="%2309090b"/>
  <!-- Outer Walls -->
  <rect x="50" y="50" width="900" height="600" fill="%2318181b" stroke="%233f3f46" stroke-width="6"/>
  
  <!-- Living Room -->
  <rect x="50" y="50" width="450" height="350" fill="%231e1b4b" stroke="%236366f1" stroke-width="3"/>
  <text x="275" y="210" fill="%23c7d2fe" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="middle">LIVING ROOM</text>

  <!-- Kitchen -->
  <rect x="500" y="50" width="450" height="350" fill="%2314532d" stroke="%2322c55e" stroke-width="3"/>
  <text x="725" y="210" fill="%23bbf7d0" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="middle">KITCHEN & DINING</text>

  <!-- Bedroom -->
  <rect x="50" y="400" width="450" height="250" fill="%23701a75" stroke="%23e879f9" stroke-width="3"/>
  <text x="275" y="530" fill="%23f5d0fe" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="middle">MASTER BEDROOM</text>

  <!-- Study / Office -->
  <rect x="500" y="400" width="450" height="250" fill="%237c2d12" stroke="%23f97316" stroke-width="3"/>
  <text x="725" y="530" fill="%23ffedd5" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="middle">STUDY & LIBRARY</text>

  <!-- Doors & Entrances -->
  <circle cx="500" cy="225" r="18" fill="%23fbbf24"/>
  <circle cx="275" cy="400" r="18" fill="%23fbbf24"/>
  <circle cx="725" cy="400" r="18" fill="%23fbbf24"/>

  <text x="70" y="30" fill="%2394a3b8" font-family="sans-serif" font-size="16" font-weight="bold">HOUSE ARCHITECTURE FLOOR PLAN</text>
</svg>`;

export const BUILTIN_PRESETS: FloorPreset[] = [
  {
    id: "preset-skeleton",
    title: "Human Skeleton Anatomy",
    description: "Anatomical bone structure diagram for medical, biology, & anatomical mnemonics",
    imageUrl: SKELETON_SVG,
  },
  {
    id: "preset-house",
    title: "House Architecture Blueprint",
    description: "Classic multi-room layout for room-by-room memory palaces",
    imageUrl: HOUSE_FLOOR_SVG,
  },
];
