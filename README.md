# Trainingsplan – Klettern & Kraft

PWA zum Abhaken des wöchentlichen Kletter- und Krafttrainings mit Gewichts-Tracking.

## Features
- **Heute**: Übungen des Tages abhaken, Gewichte eintragen („Letztes Mal“ wird angezeigt), Notiz pro Tag, mit Pfeilen durch die Tage blättern
- **Bearbeiten & Verschieben**: Workouts direkt in der App bearbeiten (Übungen hinzufügen, löschen, umsortieren, Muskeln zuordnen) und einzelne Tage innerhalb der Woche tauschen
- **Woche**: Wochenübersicht, Verlauf der letzten 8 Wochen, Streak
- **Fortschritt**: Muskel-Heatmap (vorne/hinten, 7 oder 30 Tage) und Gewichtsverlauf pro Übung
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

Plan ändern: in der App unter Einstellungen → Wochenplan. `plan.js` ist nur die Vorlage (nach Änderungen in `sw.js` die `CACHE`-Version erhöhen).

## Deployment (GitHub Pages)
Settings → Pages → Source: *Deploy from a branch* → `main` / `root`.
Danach am Handy die Seite öffnen → „Zum Startbildschirm hinzufügen“.

## Lokal starten
```bash
python3 -m http.server 8000
```
