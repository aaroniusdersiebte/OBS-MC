# OBS MIDI Mixer - Icon Guide

## Benötigte Icons und Formate

### Hauptprogramm-Icons
- **icon.png** - 512x512px - Haupt-Icon für Linux/allgemein (PNG)
- **icon.ico** - Windows Icon mit mehreren Größen (16x16, 32x32, 48x48, 256x256)
- **icon.icns** - macOS Icon Bundle (verschiedene Größen)

### Zusätzliche Icons (optional)
- **tray-icon.png** - 16x16px - Taskleisten/Tray Icon
- **splash.png** - 400x300px - Ladebildschirm
- **favicon.ico** - 32x32px - Web-Favicon

## Icon-Design Empfehlungen

### Farbschema
- **Primärfarbe**: Orange (#D2691E) - Hauptakzent der App
- **Sekundärfarbe**: Grün (#32D743) - Success/Active Status  
- **Hintergrund**: Dunkle Töne (#1A1A1A, #2A2A2A) - Matching zum Dark Theme

### Design-Elemente
1. **MIDI-Controller** - 🎛️ Mixing Board/Fader
2. **Audio-Wellen** - 🎵 Soundwaves
3. **Verbindung** - 🔗 Link zwischen MIDI und OBS
4. **Broadcast** - 📺 Streaming Symbol

### Beispiel-Konzepte
1. **Minimalistisch**: Stilisierter MIDI-Fader mit Audio-Wellen
2. **Technisch**: Mixing Board mit OBS-Logo-Elementen
3. **Abstrakt**: Geometrische Formen die MIDI-Kontrolle symbolisieren

## Datei-Speicherorte
```
assets/
├── icon.png          (512x512 - Haupt-Icon)
├── icon.ico          (Windows Multi-Size)
├── icon.icns         (macOS Bundle)
├── tray-icon.png     (16x16 - System Tray)
├── splash.png        (400x300 - Splash Screen)
└── favicon.ico       (32x32 - Web Favicon)
```

## Icon-Generierung Tools
- **Online**: realfavicongenerator.net, iconifier.net
- **Software**: GIMP, Inkscape (kostenlos), Adobe Illustrator
- **Automatisch**: electron-icon-builder, png2icons

## Implementierung
Die Icons werden automatisch von Electron Builder beim Build-Prozess verwendet:
- Windows: `icon.ico`
- macOS: `icon.icns` 
- Linux: `icon.png`

Das tray-icon.png wird für Benachrichtigungen und System-Tray verwendet.
