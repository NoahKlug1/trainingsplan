// Standard-Trainingsplan – Index = JS-Wochentag (0 = Sonntag … 6 = Samstag)
// Der Plan lässt sich in der App bearbeiten; das hier ist nur die Vorlage.
// weight: true → Gewichtsfeld wird angezeigt
// group: Übungen mit gleicher group teilen sich „Letztes Mal“ und den Gewichtsverlauf
// muscles: trainierte Muskeln (für die Heatmap), IDs siehe MUSCLES
// alt: Übung, die in geraden Kalenderwochen die normale ersetzt

const MUSCLES = {
  chest: "Brust",
  shoulders: "Schultern",
  biceps: "Bizeps",
  forearms: "Unterarme",
  abs: "Bauch",
  obliques: "Seitl. Bauch",
  traps: "Trapez",
  reardelts: "Hintere Schulter",
  lats: "Latissimus",
  triceps: "Trizeps",
  lowerback: "Unterer Rücken",
  glutes: "Gesäß",
  quads: "Oberschenkel",
  adductors: "Adduktoren",
  hamstrings: "Beinbeuger",
  calves: "Waden"
};

// Vorlagen für „Übung hinzufügen“
const EXERCISE_LIBRARY = {
  "Klettern": [
    { name: "Aufwärmen", detail: "15 min, leichtes Klettern", muscles: [] },
    { name: "Bouldern am Limit", detail: "60 min, lange Pausen", muscles: ["forearms", "lats", "biceps", "abs"] },
    { name: "Seilklettern", detail: "60–75 min", muscles: ["forearms", "lats", "biceps"] },
    { name: "Fingerboard Max Hangs", detail: "5× 10 s, 3 min Pause", weight: true, muscles: ["forearms"] },
    { name: "Campus Board", detail: "4 Sätze Ladders", muscles: ["forearms", "lats", "biceps"] },
    { name: "Fingerboard Repeaters", detail: "6× 7 s an / 3 s aus", muscles: ["forearms"] },
    { name: "Ausdauer-Traversen", detail: "3× 8 min", muscles: ["forearms", "lats"] }
  ],
  "Ziehen": [
    { name: "Klimmzüge mit Zusatzgewicht", detail: "4×3–5", weight: true, muscles: ["lats", "biceps", "forearms"] },
    { name: "Klimmzüge", detail: "3× max", muscles: ["lats", "biceps", "forearms"] },
    { name: "Langhantelrudern", detail: "3×5", weight: true, muscles: ["lats", "traps", "reardelts", "biceps"] },
    { name: "Kurzhantelrudern", detail: "3×8–10", weight: true, muscles: ["lats", "reardelts", "biceps"] },
    { name: "Latziehen", detail: "3×8–10", weight: true, muscles: ["lats", "biceps"] },
    { name: "Face Pulls", detail: "3×15", weight: true, muscles: ["reardelts", "traps"] },
    { name: "Bizepscurls", detail: "3×10", weight: true, muscles: ["biceps", "forearms"] }
  ],
  "Drücken": [
    { name: "Bankdrücken", detail: "4×3–5", weight: true, muscles: ["chest", "triceps", "shoulders"] },
    { name: "LH-Schulterdrücken", detail: "3×5", weight: true, muscles: ["shoulders", "triceps", "traps"] },
    { name: "KH-Schulterdrücken", detail: "3×8", weight: true, muscles: ["shoulders", "triceps"] },
    { name: "Schrägbankdrücken", detail: "3×6–8", weight: true, muscles: ["chest", "shoulders", "triceps"] },
    { name: "Liegestütze", detail: "3× max", muscles: ["chest", "triceps", "shoulders"] },
    { name: "Dips", detail: "3×8–10", muscles: ["chest", "triceps"] },
    { name: "Seitheben", detail: "3×10–12", weight: true, muscles: ["shoulders"] },
    { name: "Trizepsdrücken", detail: "3×12", weight: true, muscles: ["triceps"] }
  ],
  "Beine": [
    { name: "Kniebeugen", detail: "4×5", weight: true, muscles: ["quads", "glutes", "adductors", "lowerback"] },
    { name: "Kreuzheben", detail: "3×5", weight: true, muscles: ["hamstrings", "glutes", "lowerback", "traps", "forearms"] },
    { name: "Rumänisches Kreuzheben", detail: "3×8", weight: true, muscles: ["hamstrings", "glutes", "lowerback"] },
    { name: "Bulgarian Split Squats", detail: "3×8 pro Seite", weight: true, muscles: ["quads", "glutes"] },
    { name: "Ausfallschritte", detail: "3×10 pro Seite", weight: true, muscles: ["quads", "glutes", "adductors"] },
    { name: "Hip Thrust", detail: "3×10", weight: true, muscles: ["glutes", "hamstrings"] },
    { name: "Wadenheben", detail: "3×15", weight: true, muscles: ["calves"] },
    { name: "Pistol Squats", detail: "3×5 pro Seite", muscles: ["quads", "glutes"] }
  ],
  "Core": [
    { name: "Hanging Leg Raises", detail: "3×8", muscles: ["abs", "obliques"] },
    { name: "Plank", detail: "3× 45 s", muscles: ["abs", "obliques"] },
    { name: "Ab Wheel", detail: "3×8", muscles: ["abs", "lowerback"] },
    { name: "Russian Twists", detail: "3×20", muscles: ["obliques", "abs"] },
    { name: "Front Lever Progression", detail: "5× 8 s", muscles: ["lats", "abs"] }
  ],
  "Prehab": [
    { name: "Außenrotation", detail: "2×15", weight: true, muscles: ["reardelts"] },
    { name: "Reverse Flys", detail: "2×15", weight: true, muscles: ["reardelts", "traps"] },
    { name: "Fingerstrecker mit Gummi", detail: "2×25", muscles: ["forearms"] },
    { name: "Handgelenk-Curls", detail: "2×15", weight: true, muscles: ["forearms"] },
    { name: "Schulterblatt-Liegestütze", detail: "2×12", muscles: ["chest", "traps"] }
  ],
  // Dehnen zählt bewusst nicht in die Muskel-Heatmap (muscles leer), der Bereich steht im Detail
  "Dehnen": [
    { name: "Unterarmbeuger dehnen", detail: "Unterarme · 2× 30 s pro Seite, Handfläche nach vorne, Finger zurückziehen", muscles: [] },
    { name: "Unterarmstrecker dehnen", detail: "Unterarme · 2× 30 s pro Seite, Faust nach unten beugen", muscles: [] },
    { name: "Brust am Türrahmen", detail: "Brust, Schultern · 2× 30 s pro Seite", muscles: [] },
    { name: "Schulter Cross-Body", detail: "Hintere Schulter · 2× 30 s pro Seite", muscles: [] },
    { name: "Lat-Dehnung an der Stange", detail: "Latissimus · 2× 30 s, locker hängen oder seitlich lehnen", muscles: [] },
    { name: "Trizeps über Kopf", detail: "Trizeps · 2× 30 s pro Seite", muscles: [] },
    { name: "Nacken & Trapez", detail: "Nacken · 2× 20 s pro Seite, Kopf seitlich neigen", muscles: [] },
    { name: "Schulter-Dislocates", detail: "Schultern, Mobilität · 2×10 mit Band oder Stock", muscles: [] },
    { name: "Brustwirbelsäule rotieren", detail: "Oberer Rücken, Mobilität · 2×8 pro Seite im Vierfüßlerstand", muscles: [] },
    { name: "Katze-Kuh", detail: "Rücken, Mobilität · 10 langsame Wiederholungen", muscles: [] },
    { name: "Frog Stretch", detail: "Hüfte, Adduktoren · 2× 45 s, wichtig fürs Eindrehen an der Wand", muscles: [] },
    { name: "Taube", detail: "Hüfte, Gesäß · 2× 45 s pro Seite", muscles: [] },
    { name: "Hüftbeuger im Ausfallschritt", detail: "Hüfte · 2× 30 s pro Seite", muscles: [] },
    { name: "Beinbeuger dehnen", detail: "Beinbeuger · 2× 30 s pro Seite", muscles: [] },
    { name: "Waden an der Wand", detail: "Waden · 2× 30 s pro Seite", muscles: [] }
  ]
};

const DEFAULT_PLAN = {
  1: {
    title: "Bouldern + Push",
    place: "Halle",
    exercises: [
      { id: "mo-warm", name: "Aufwärmen", detail: "15 min, leichtes Klettern", muscles: [] },
      {
        id: "mo-fb", name: "Fingerboard Max Hangs", detail: "5× 10 s, 2–3 s Reserve, 3 min Pause",
        weight: true, group: "fb", muscles: ["forearms"],
        alt: { id: "mo-campus", name: "Campus Board", detail: "4 Sätze Ladders", muscles: ["forearms", "lats", "biceps"] }
      },
      { id: "mo-boulder", name: "Bouldern am Limit", detail: "60 min, lange Pausen", muscles: ["forearms", "lats", "biceps", "abs"] },
      { id: "mo-bench", name: "Bankdrücken", detail: "4×3–5", weight: true, group: "bench", muscles: ["chest", "triceps", "shoulders"] },
      { id: "mo-lat", name: "Seitheben", detail: "3×10–12", weight: true, group: "lat", muscles: ["shoulders"] }
    ]
  },
  2: { title: "Ruhetag", rest: true },
  3: {
    title: "Schulter + Core",
    place: "Zuhause",
    exercises: [
      { id: "mi-ohp", name: "LH-Schulterdrücken stehend", detail: "4×4–6, schwer", weight: true, group: "ohp", muscles: ["shoulders", "triceps", "traps"] },
      { id: "mi-lat", name: "Seitheben", detail: "3×10–12", weight: true, group: "lat", muscles: ["shoulders"] },
      { id: "mi-dips", name: "Enge Liegestütze / Dips", detail: "2×8–10", muscles: ["chest", "triceps"] },
      { id: "mi-prehab", name: "Prehab", detail: "Außenrotation 2×15 + Reverse Flys 2×15", muscles: ["reardelts", "traps"] },
      { id: "mi-core", name: "Hanging Leg Raises", detail: "3×8", muscles: ["abs", "obliques"] }
    ]
  },
  4: {
    title: "Seilklettern + Pull",
    place: "Halle",
    exercises: [
      { id: "do-rope", name: "Seilklettern", detail: "60–75 min", muscles: ["forearms", "lats", "biceps"] },
      { id: "do-pull", name: "Klimmzüge mit Zusatzgewicht", detail: "4×3–5", weight: true, group: "pull", muscles: ["lats", "biceps", "forearms"] },
      { id: "do-row", name: "Langhantelrudern", detail: "3×5", weight: true, group: "row", muscles: ["lats", "traps", "reardelts", "biceps"] }
    ]
  },
  5: { title: "Ruhetag", rest: true, note: "Schule + Arbeit" },
  6: {
    title: "Kraft",
    place: "Zuhause, vor der Arbeit",
    exercises: [
      { id: "sa-fb", name: "Fingerboard Max Hangs", detail: "4× 10 s", weight: true, group: "fb", muscles: ["forearms"] },
      { id: "sa-ohp", name: "LH-Schulterdrücken", detail: "3×5", weight: true, group: "ohp", muscles: ["shoulders", "triceps", "traps"] },
      { id: "sa-bench", name: "Bankdrücken", detail: "3×5", weight: true, group: "bench", muscles: ["chest", "triceps", "shoulders"] },
      { id: "sa-lat", name: "Seitheben", detail: "3×12", weight: true, group: "lat", muscles: ["shoulders"] },
      { id: "sa-row", name: "Langhantelrudern", detail: "3×6", weight: true, group: "row", muscles: ["lats", "traps", "reardelts", "biceps"] }
    ]
  },
  0: { title: "Ruhetag", rest: true }
};
