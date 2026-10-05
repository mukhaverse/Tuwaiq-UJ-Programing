// Stand-in photos for trying out the memories pile in `npm run dev`, for done
// milestones that don't have real photos yet. Never used in a production build.
const SCENES = [
  ["#4f29b7", "#f4a664", "first time all in one room"],
  ["#1b4d6b", "#57e3d8", "laptops everywhere"],
  ["#5b2a4a", "#f472b6", "the whiteboard got full fast"],
  ["#20402c", "#4ade80", "snack break (important)"],
  ["#3a2a12", "#facc15", "group photo, take 7"],
  ["#2a2140", "#a380ff", "مين صوّر هذي؟"],
];

function scene([deep, light, caption], i) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${deep}"/></linearGradient></defs>
  <rect width="400" height="400" fill="url(#g)"/>
  <circle cx="${90 + i * 40}" cy="${110 + (i % 3) * 20}" r="${46 + i * 4}" fill="#fff" opacity=".35"/>
  <path d="M0 300 Q 100 ${220 + i * 10} 200 290 T 400 ${260 - i * 8} V400 H0Z" fill="${deep}" opacity=".85"/>
  <g fill="#16181d" opacity=".75">${[0, 1, 2, 3]
    .map((k) => `<circle cx="${70 + k * 85}" cy="${292 - (k % 2) * 12}" r="22"/><rect x="${48 + k * 85}" y="${310 - (k % 2) * 12}" width="44" height="90" rx="20"/>`)
    .join("")}</g>
  <text x="200" y="40" fill="#fff" opacity=".6" font-family="monospace" font-size="16" text-anchor="middle">DEV PLACEHOLDER ${i + 1}</text>
</svg>`;
  return { url: `data:image/svg+xml,${encodeURIComponent(svg)}`, caption };
}

export const devPhotos = () => SCENES.map(scene);
