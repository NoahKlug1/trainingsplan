# Trainingsplan – Klettern & Kraft

PWA zum Abhaken des wöchentlichen Kletter- und Krafttrainings mit Gewichts-Tracking.

## Features
- **Heute**: Übungen des Tages abhaken, Gewichte eintragen („Letztes Mal“ wird angezeigt), Notiz pro Tag, mit Pfeilen durch die Tage blättern
- **Bearbeiten & Verschieben**: Workouts direkt in der App bearbeiten (Übungen aus einer Bibliothek mit Standardübungen oder eigene hinzufügen, löschen, umsortieren, Muskeln zuordnen) und einzelne Tage innerhalb der Woche tauschen
- **Woche**: Wochenübersicht, Verlauf der letzten 8 Wochen, Streak
- **Fortschritt**: Muskel-Heatmap (vorne/hinten, 7 oder 30 Tage) und Gewichtsverlauf pro Übung
- Deload-Hinweis jede 6. Woche, Montag wechselt Fingerboard (ungerade KW) und Campus Board (gerade KW)
- **Konto (optional, Supabase)**: Anmelden mit E-Mail und Passwort, Daten werden gesichert und zwischen Geräten synchronisiert
- Offlinefähig, installierbar, ohne Konto bleiben die Daten lokal (`localStorage`), Backup als JSON

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

## Konten einrichten (Supabase)
1. Projekt auf supabase.com anlegen.
2. Im *SQL Editor* den Inhalt von `supabase.sql` ausführen (Tabelle + Row Level Security).
3. *Authentication → URL Configuration*: Site URL und Redirect URL auf die GitHub-Pages-Adresse setzen.
4. *Project Settings → API*: Project URL und anon/publishable Key in `config.js` eintragen.

## Deployment (GitHub Pages)
Settings → Pages → Source: *Deploy from a branch* → `main` / `root`.
Danach am Handy die Seite öffnen → „Zum Startbildschirm hinzufügen“.

## Lokal starten
```bash
python3 -m http.server 8000
```
