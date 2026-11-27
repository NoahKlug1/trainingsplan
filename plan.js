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
  quads: "Oberschenkel",
  calves: "Waden",
  traps: "Trapez",
  reardelts: "Hintere Schulter",
  lats: "Latissimus",
  triceps: "Trizeps",
  lowerback: "Unterer Rücken",
  glutes: "Gesäß",
  hamstrings: "Beinbeuger"
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
