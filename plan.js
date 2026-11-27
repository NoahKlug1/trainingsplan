// Trainingsplan – Index = JS-Wochentag (0 = Sonntag … 6 = Samstag)
// weight: true → Gewichtsfeld wird angezeigt
// alt: Übung, die in geraden Kalenderwochen die normale ersetzt

const PLAN = {
  1: {
    title: "Bouldern + Push",
    place: "Halle",
    exercises: [
      { id: "mo-warm", name: "Aufwärmen", detail: "15 min, leichtes Klettern" },
      {
        id: "mo-fb", name: "Fingerboard Max Hangs", detail: "5× 10 s, 2–3 s Reserve, 3 min Pause", weight: true,
        alt: { id: "mo-campus", name: "Campus Board", detail: "4 Sätze Ladders" }
      },
      { id: "mo-boulder", name: "Bouldern am Limit", detail: "60 min, lange Pausen" },
      { id: "mo-bench", name: "Bankdrücken", detail: "4×3–5", weight: true },
      { id: "mo-lat", name: "Seitheben", detail: "3×10–12", weight: true }
    ]
  },
  2: { title: "Ruhetag", rest: true },
  3: {
    title: "Schulter + Core",
    place: "Zuhause",
    exercises: [
      { id: "mi-ohp", name: "LH-Schulterdrücken stehend", detail: "4×4–6, schwer", weight: true },
      { id: "mi-lat", name: "Seitheben", detail: "3×10–12", weight: true },
      { id: "mi-dips", name: "Enge Liegestütze / Dips", detail: "2×8–10" },
      { id: "mi-prehab", name: "Prehab", detail: "Außenrotation 2×15 + Reverse Flys 2×15" },
      { id: "mi-core", name: "Hanging Leg Raises", detail: "3×8" }
    ]
  },
  4: {
    title: "Seilklettern + Pull",
    place: "Halle",
    exercises: [
      { id: "do-rope", name: "Seilklettern", detail: "60–75 min" },
      { id: "do-pull", name: "Klimmzüge mit Zusatzgewicht", detail: "4×3–5", weight: true },
      { id: "do-row", name: "Langhantelrudern", detail: "3×5", weight: true }
    ]
  },
  5: { title: "Ruhetag", rest: true, note: "Schule + Arbeit" },
  6: {
    title: "Kraft",
    place: "Zuhause, vor der Arbeit",
    exercises: [
      { id: "sa-fb", name: "Fingerboard Max Hangs", detail: "4× 10 s", weight: true },
      { id: "sa-ohp", name: "LH-Schulterdrücken", detail: "3×5", weight: true },
      { id: "sa-bench", name: "Bankdrücken", detail: "3×5", weight: true },
      { id: "sa-lat", name: "Seitheben", detail: "3×12", weight: true },
      { id: "sa-row", name: "Langhantelrudern", detail: "3×6", weight: true }
    ]
  },
  0: { title: "Ruhetag", rest: true }
};

// Übungen, die dasselbe Gewicht teilen (für "Letztes Mal")
const WEIGHT_GROUP = {
  "mo-fb": "fb", "sa-fb": "fb",
  "mo-bench": "bench", "sa-bench": "bench",
  "mo-lat": "lat", "mi-lat": "lat", "sa-lat": "lat",
  "mi-ohp": "ohp", "sa-ohp": "ohp",
  "do-row": "row", "sa-row": "row",
  "do-pull": "pull"
};
