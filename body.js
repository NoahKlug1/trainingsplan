// Muskel-Heatmap: zeichnet die Figuren aus BODY_SHAPES (body-shapes.js).
// Aufbau wie im Original: dunkle Grundfläche (ergibt die Konturlinien), darauf die einzelnen Muskelflächen.

// level: { muskelId: 0..1 }
function bodySvg(side, level) {
  const s = BODY_SHAPES[side];
  const regions = s.regions.map(([m, d]) => {
    const lv = m ? level[m] || 0 : 0;
    const heat = lv > 0
      ? `<path d="${d}" class="b-heat" style="fill-opacity:${(0.3 + 0.7 * lv).toFixed(2)}"/>`
      : "";
    return `<g>${m ? `<title>${MUSCLES[m]}</title>` : ""}<path d="${d}" class="b-base"/>${heat}</g>`;
  }).join("");
  return `<svg class="body" viewBox="0 0 ${s.w} ${s.h}" role="img" aria-label="Muskeln ${side === "front" ? "vorne" : "hinten"}">
    <path d="${s.backdrop}" class="b-line"/>${regions}</svg>`;
}
