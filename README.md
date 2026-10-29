# Cockpit

Persönliches Dashboard als Startseite für jeden neuen Tab: Uhr mit Tagesfokus, Pomodoro, Aufgaben,
Notizen und Lesezeichen. Die Kacheln verteilen sich je nach Fensterbreite auf 1 bis 4 Spalten.
React, TypeScript und Vite – derselbe Stack wie die To-do-App.

## Starten

```bash
yarn
yarn dev        # http://localhost:5173
yarn build      # fertige Version in dist/
```

## Als neuen Tab einrichten

Chrome, Edge, Brave, Arc (alles mit Chromium):

1. `yarn build`
2. `chrome://extensions` öffnen (Edge: `edge://extensions`), **Entwicklermodus** einschalten
3. **Entpackte Erweiterung laden** → den Ordner `dist` wählen

Ab jetzt zeigt jeder neue Tab das Cockpit. Nach Änderungen am Code: `yarn build` und in der
Erweiterungsliste auf „Neu laden“ klicken. `public/manifest.json` ist die Erweiterungs-Beschreibung.

Firefox: `about:debugging` → „Temporäres Add-on laden“ → `dist/manifest.json` (bleibt nur bis zum
Neustart, dauerhaft braucht Firefox eine Signatur).

## Als Website (Vercel)

Jeder Push auf `main` geht automatisch auf https://cockpit-productivity.vercel.app online, andere
Branches bekommen eine eigene Vorschau-Adresse. Einstellungen: Vercel-Projekt `cockpit-productivity`,
Preset Vite, Ausgabe `dist`.

Safari: Einstellungen › Allgemein › „Neue Fenster/Tabs öffnen mit: Homepage“ und als Homepage die
Adresse oben eintragen. Eine Safari-Erweiterung bräuchte einen Apple-Developer-Account.

Bis zum Login liegen die Daten auch auf der Website nur im jeweiligen Browser – Safari, Chrome-Erweiterung
und Website haben also getrennte Daten (Umzug per Export/Import).

## Bedienung

- **Fokus**: eine Sache für jetzt. Aus „Heute“ wählen oder frei eintippen. Hat die Aufgabe Schritte,
  zeigt die Karte nur den nächsten.
- **Aufgaben**: Heute, Später, Erledigt. Klick auf den Titel öffnet Schritte und Umbenennen.
  ◎ setzt den Fokus, ◷ / ☀ schiebt zwischen Heute und Später. Löschen und Erledigen lassen sich
  rückgängig machen.
- **Pomodoro**: Mitte startet und pausiert, + / − ändern die Zeit um eine Minute, ↺ setzt zurück,
  ⏭ springt zur nächsten Phase. Läuft über alle offenen Tabs hinweg und klingelt nur einmal.
- **Notizen**: Schnellerfassung unten (Enter), ausführlich über +. Speichert beim Tippen.
- **Lesezeichen**: in Gruppen; der Stift schaltet Umbenennen und Entfernen frei.
- **Fokusmodus** (oben rechts) blendet alles außer Uhr, Fokus und Pomodoro aus.
- **Kacheln**: am Griff (erscheint beim Darüberfahren) verschieben. Größe über das Feld-Symbol
  daneben oder in den Einstellungen: 1 Feld, 2 nebeneinander, 4 als Quadrat, 8 so breit wie möglich
  und zwei hoch. Große Kacheln nutzen den Platz: Aufgaben als Board (Heute | Später | Erledigt),
  Notizen als Karten, Lesezeichen als große Schnellwahl. Auf dem Handy stehen alle untereinander.

## Daten

Alles liegt im `localStorage` des jeweiligen Browsers (Schlüssel `cockpit:data`). Die Erweiterung und
`yarn dev` haben getrennte Speicher. Umziehen und sichern: Einstellungen › Daten › Exportieren / Importieren.

`src/data/store.ts` ist die einzige Stelle, die speichert. Für Login und Sync wird später nur dieses
Modul gegen einen API-Client getauscht; die Kacheln nutzen ausschließlich `useAppData()` und die Actions.
Jede Änderung baut auf dem zuletzt gespeicherten Stand auf, andere Tabs ziehen per `storage`-Event nach.

## Themes

Mitgeliefert: **Orbit** (Standard, nach der Vorlage), **Eclipse**, **Paper** und **Automatisch**
(folgt dem System). Ein Theme ist nur ein Satz CSS-Variablen; Komponenten lesen ausschließlich diese.

Neues Theme:

1. In `src/themes/themes.css` einen Block `:root[data-theme='mein-theme'] { … }` anlegen
   (am einfachsten einen bestehenden kopieren)
2. In `src/themes/index.ts` einen Eintrag in `THEMES` ergänzen (Name, Beschreibung, Farbfelder)

Neben Farben lassen sich pro Theme auch Schrift (`--font`), Radien, Unschärfe und Hintergrund ändern.

## Struktur

| Bereich | Datei |
| --- | --- |
| Raster, Drag & Drop, Fokusmodus | `src/App.tsx` |
| Kacheln | `src/tiles/*Tile.tsx` |
| Timer-Ende über alle Tabs | `src/tiles/PomodoroEngine.tsx` |
| Speicher und Actions | `src/data/store.ts` |
| Startdaten und Standard-Layout | `src/data/seed.ts` |
| Einstellungen | `src/settings/SettingsDrawer.tsx` |
| Themes | `src/themes/` |
