# Trainingsplan – Klettern & Kraft

PWA zum Abhaken des wöchentlichen Kletter- und Krafttrainings, mit Gewichts-Tracking und Protein-Check.

## Features
- **Heute**: Übungen des Tages abhaken, Gewichte eintragen („Letztes Mal“ wird angezeigt), Notiz pro Tag, mit Pfeilen durch die Tage blättern
- **Woche**: Wochenübersicht, Verlauf der letzten 8 Wochen, Streak
- **Protein**: Tagesziel aus Körpergewicht (Standard 1,8 g/kg), Essen und Pulver getrennt erfassen, Empfehlung, ob sich Proteinpulver lohnt (Basis: Essens-Schnitt der letzten 7 Tage gegen das Minimum von 1,6 g/kg)
- Deload-Hinweis jede 6. Woche, Montag wechselt Fingerboard (ungerade KW) und Campus Board (gerade KW)
- Offlinefähig, installierbar, Daten bleiben lokal (`localStorage`), Backup als JSON

## Wochenplan
| Tag | Einheit |
|-----|---------|
| Mo | Bouldern + Push (Fingerboard/Campus, Bankdrücken, Seitheben) |
| Di | Ruhe |
| Mi | Zuhause: LH-Schulterdrücken, Seitheben, Dips, Prehab, Core |
| Do | Seilklettern + Klimmzüge gewichtet, LH-Rudern |
| Fr | Ruhe |
| Sa | Zuhause: Fingerboard, LH-Schulterdrücken, Bankdrücken, Seitheben, LH-Rudern |
| So | Ruhe |

Plan ändern: `plan.js` bearbeiten und in `sw.js` die `CACHE`-Version erhöhen.

## Deployment (GitHub Pages)
Settings → Pages → Source: *Deploy from a branch* → `main` / `root`.
Danach am Handy die Seite öffnen → „Zum Startbildschirm hinzufügen“.

## Lokal starten
```bash
python3 -m http.server 8000
```
