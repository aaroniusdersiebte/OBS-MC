# OBS MIDI Mixer (Bereinigt) 🎛️

Ein sauberer, benutzerfreundlicher MIDI-Controller für OBS Studio mit bereinigter Oberfläche und stabileren Verbindungen.

## ✅ Was wurde bereinigt/gefixt:

### 🐛 Kritische Bugs behoben:
- **Infinite Loop fix**: Der `runConnectionTest()` ↔ `runEnhancedConnectionTest()` Loop wurde behoben
- **Stack Overflow**: Keine 990x wiederholenden Aufrufe mehr
- **Sauberer Startup**: Programm startet ohne Fehler

### 🎨 UI bereinigt:
- **Entfernt**: Debug-Button und Debug-Modal komplett entfernt
- **Entfernt**: Verbindungs-Button und Verbindungs-Modal entfernt
- **Integriert**: Verbindungsstatus direkt in die Einstellungen
- **Vereinfacht**: Nur noch Settings-Button im Header (+ Minimize/Close)

### ⚙️ Verbindungsmanagement vereinfacht:
- **Settings-Integration**: OBS- und MIDI-Status direkt in den Einstellungen sichtbar
- **Test-Buttons**: Direkte "Verbindung testen" und "MIDI scannen" Buttons
- **Inline-Status**: Live-Status-Updates in den Einstellungen
- **Launch Control XL**: Integrierte Hilfe für Low Power Mode

### 💾 Lokale Speicherung optimiert:
- **Settings Export**: Alle Einstellungen exportierbar als JSON
- **Audio Source Order**: Drag & Drop-Reihenfolge wird gespeichert
- **MIDI Mappings**: Alle Zuordnungen werden lokal gespeichert
- **Portable**: Läuft als standalone EXE

## 🎹 Features:

- **Linear MIDI Mapping**: Gleichmäßige Volume-Kontrolle über den gesamten Fader-Bereich
- **OBS-Style dB Visualization**: Korrekte logarithmische Audio-Pegel-Anzeige
- **Drag & Drop**: Audio-Quellen sortierbar durch Ziehen am ⋮⋮ Symbol
- **Hotkey Decks**: Erweiterte Hotkey-Unterstützung für komplexe Setups
- **Launch Control XL**: Spezielle Unterstützung mit Low Power Mode Hilfe

## 🚀 Installation & Nutzung:

### Als Entwickler starten:
```bash
npm install
npm run dev          # Entwicklungsmodus
npm start           # Produktionsmodus
```

### EXE-Build erstellen:
```bash
npm run build-win   # Windows EXE mit Installer
npm run build       # Alle Plattformen
```

### Erste Schritte:
1. **Einstellungen öffnen** (⚙️ Button)
2. **OBS konfigurieren**: URL (meist `ws://localhost:4455`) und optional Passwort
3. **"Verbindung testen"** klicken
4. **MIDI scannen** für verfügbare MIDI-Geräte
5. **MIDI-Kontrollen zuordnen** über "MIDI Lernen" oder direkt bei Audio-Quellen

### Launch Control XL Setup:
```
Low Power Mode aktivieren:
1. Halte "User" + "Factory Template"
2. USB einstecken, Buttons loslassen  
3. "Record Arm" → Rechter Pfeil
→ Verhindert Standby nach 2 Minuten
```

## 📁 Dateistruktur (bereinigt):

```
miiiidi/
├── main.js                     # Electron Haupt-Prozess
├── package.json                # Bereinigte Build-Konfiguration  
├── assets/
│   └── icon.ico                # App-Icon
└── src/
    ├── config/
    │   └── default-settings.json
    ├── modules/
    │   ├── ui-manager.js        # Bereinigte UI ohne Debug/Connection Modals
    │   ├── settings-manager.js  # Lokale Speicherung
    │   ├── obs-websocket.js     # OBS-Verbindung
    │   ├── midi-controller.js   # MIDI mit linearem Mapping
    │   ├── audio-manager.js     # Audio mit korrekter dB-Visualisierung
    │   └── hotkeys/             # Erweiterte Hotkey-Funktionen
    └── renderer/
        ├── index.html           # Bereinigte HTML ohne old modals
        ├── styles.css           # CSS mit inline-status Unterstützung
        └── renderer.js          # Frontend-Logic
```

## 🔧 Technische Verbesserungen:

### Verbindungsmanagement:
- **Kein separates Connection Modal**: Alles in Settings integriert
- **Inline Status**: Live-Updates der Verbindungsstatus in Settings
- **Direkte Tests**: Test-Buttons für sofortige Verbindungsprüfung

### Event-Logging:
- **Vereinfacht**: `logEvent()` statt separater Debug-Logs
- **Console-basiert**: Alle Events gehen in die Browser-Console
- **Kein Debug-Modal**: Weniger UI-Überladung

### Build-Optimierung:
- **Sauberer Installer**: NSIS-Setup mit korrekten Icons
- **Portable**: Standalone EXE ohne Abhängigkeiten
- **Bessere Pfade**: Lokale Config-Dateien im User-Verzeichnis

## 🎯 Vergleich Alt vs. Neu:

| Vorher | Nachher |
|--------|---------|
| 5 Header-Buttons | 3 Header-Buttons |
| 3 Separate Modals | 1 Settings-Modal |
| Debug-Überladung | Saubere Oberfläche |
| Infinite Loop Bug | Stabile Ausführung |
| Connection Modal | Inline in Settings |
| Debug-Logs UI | Console-basiert |

## 📝 Tastenkürzel:

- **F1**: Einstellungen öffnen (statt Connection Modal)
- **F5**: Audio-Quellen aktualisieren
- **ESC**: Aktive Dialoge schließen/MIDI Learning beenden

## 🛠️ Für weitere Entwicklung:

Das Programm ist jetzt sauber strukturiert und kann einfach erweitert werden:
- `ui-manager.js` - Für UI-Änderungen
- `settings-manager.js` - Für neue Settings
- `styles.css` - Für visulle Anpassungen

Neue Features können über die vorhandene Settings-Integration hinzugefügt werden, ohne separate Modals zu benötigen.

---

## 🎉 Zusammenfassung der Bereinigung:

✅ **Bug-Fixes**: Infinite Loop, Stack Overflow behoben  
✅ **UI vereinfacht**: Von 5 auf 3 Header-Buttons reduziert  
✅ **Modals integriert**: Connection + Debug in Settings  
✅ **Bessere UX**: Direkte Test-Buttons, Live-Status  
✅ **Build optimiert**: Saubere EXE mit Installer  
✅ **Code bereinigt**: Entfernte redundante Funktionen  

Das Programm ist jetzt produktionsreif und benutzerfreundlich! 🚀
