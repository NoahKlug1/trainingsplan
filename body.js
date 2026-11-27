// Stilisierte Körperfigur für die Muskel-Heatmap.
// Pfade sind für die linke Bildhälfte (x < 100) gezeichnet; mirror: true spiegelt sie an x = 100.
// m: Muskel-ID aus MUSCLES, null = neutrale Fläche (Kopf, Hände, Knie, Füße)

const BODY = {
  front: [
    { m: null, d: "M100 8 C88 8 82 18 82 30 C82 44 90 52 100 52 C110 52 118 44 118 30 C118 18 112 8 100 8 Z" },
    { m: null, d: "M91 48 L109 48 L110 64 L90 64 Z" },
    { m: "traps", mirror: true, d: "M91 56 Q86 64 76 69 L90 67 Z" },
    { m: "shoulders", mirror: true, d: "M80 69 Q62 64 54 78 Q49 92 54 108 Q62 98 67 90 Q70 78 80 72 Z" },
    { m: "chest", mirror: true, d: "M99 72 L82 72 Q70 76 68 90 Q69 106 83 112 L99 112 Z" },
    { m: "biceps", mirror: true, d: "M54 111 Q49 128 51 146 L62 148 Q69 128 67 94 Q60 102 54 111 Z" },
    { m: "forearms", mirror: true, d: "M51 150 Q44 172 46 202 L57 204 Q66 178 63 151 Z" },
    { m: null, mirror: true, d: "M46 206 Q42 216 45 228 Q50 234 55 228 Q58 216 57 207 Z" },
    { m: "abs", mirror: true, d: "M87 115 L99 115 L99 188 L91 188 Q85 160 87 115 Z" },
    { m: "obliques", mirror: true, d: "M85 114 Q72 114 70 128 Q72 162 79 188 L89 190 Q83 160 85 114 Z" },
    { m: null, mirror: true, d: "M80 188 L100 188 L100 216 Q88 207 78 193 Z" },
    { m: "quads", mirror: true, d: "M78 193 Q67 212 67 242 Q69 280 81 296 L94 296 Q99 262 99 214 Q88 206 78 193 Z" },
    { m: null, mirror: true, d: "M80 300 Q78 308 81 314 Q88 318 95 314 Q97 307 94 300 Z" },
    { m: "calves", mirror: true, d: "M79 318 Q71 342 77 370 L90 371 Q97 342 95 318 Z" },
    { m: null, mirror: true, d: "M77 374 Q72 382 74 388 L93 388 Q95 380 91 374 Z" }
  ],
  frontLines: [
    "M87 136 L99 136", "M101 136 L113 136",
    "M88 156 L99 156", "M101 156 L112 156",
    "M100 115 L100 188"
  ],
  back: [
    { m: null, d: "M100 8 C88 8 82 18 82 30 C82 44 90 52 100 52 C110 52 118 44 118 30 C118 18 112 8 100 8 Z" },
    { m: null, d: "M91 48 L109 48 L110 60 L90 60 Z" },
    { m: "lats", mirror: true, d: "M90 96 Q80 84 69 90 Q66 112 71 132 Q79 160 91 174 L99 174 L99 124 Z" },
    { m: "traps", mirror: true, d: "M99 50 L93 54 Q86 64 74 69 Q86 76 91 94 L99 124 Z" },
    { m: "reardelts", mirror: true, d: "M73 70 Q59 68 54 80 Q49 94 54 108 Q62 98 68 90 Q72 80 80 74 Z" },
    { m: "triceps", mirror: true, d: "M54 111 Q49 128 51 146 L62 148 Q69 128 67 94 Q60 102 54 111 Z" },
    { m: "forearms", mirror: true, d: "M51 150 Q44 172 46 202 L57 204 Q66 178 63 151 Z" },
    { m: null, mirror: true, d: "M46 206 Q42 216 45 228 Q50 234 55 228 Q58 216 57 207 Z" },
    { m: "lowerback", mirror: true, d: "M99 176 L90 176 Q82 180 80 196 L99 198 Z" },
    { m: "glutes", mirror: true, d: "M99 200 L79 198 Q67 210 69 228 Q77 244 99 240 Z" },
    { m: "hamstrings", mirror: true, d: "M69 233 Q67 270 80 298 L94 298 Q99 270 99 243 Q80 247 69 233 Z" },
    { m: null, mirror: true, d: "M80 301 Q79 306 81 310 L94 310 Q96 305 94 301 Z" },
    { m: "calves", mirror: true, d: "M79 313 Q67 338 75 360 Q83 368 91 364 Q99 336 95 313 Z" },
    { m: null, mirror: true, d: "M78 368 Q74 380 75 388 L92 388 Q94 378 91 368 Z" }
  ],
  backLines: ["M100 52 L100 198"]
};

// Baut die SVG-Figur. level: { muskelId: 0..1 }
function bodySvg(side, level) {
  const shapes = BODY[side], lines = BODY[side + "Lines"] || [];
  const mirror = "transform=\"translate(200 0) scale(-1 1)\"";
  const paths = [];
  shapes.forEach(s => {
    [false, true].forEach(mir => {
      if (mir && !s.mirror) return;
      paths.push({ m: s.m, d: s.d, t: mir ? mirror : "" });
    });
  });
  const base = paths.map(p => `<path d="${p.d}" ${p.t} class="b-base"/>`).join("");
  const heat = paths.filter(p => p.m && level[p.m] > 0)
    .map(p => `<path d="${p.d}" ${p.t} class="b-heat" style="fill-opacity:${(0.25 + 0.75 * level[p.m]).toFixed(2)}"><title>${MUSCLES[p.m]}</title></path>`).join("");
  const outline = paths.map(p => `<path d="${p.d}" ${p.t} class="b-line"/>`).join("");
  const deco = lines.map(d => `<path d="${d}" class="b-deco"/>`).join("");
  return `<svg class="body" viewBox="38 2 124 392" role="img" aria-label="Muskeln ${side === "front" ? "vorne" : "hinten"}">${base}${heat}${outline}${deco}</svg>`;
}
