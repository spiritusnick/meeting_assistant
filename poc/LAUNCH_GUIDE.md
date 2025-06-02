# Meeting Assistant - Launch Guide

## Quick Start (Easiest Method)

### Option 1: Double-Click Launch
1. Navigate to the `poc` folder in Finder
2. Double-click `launch.command`
3. The app will start automatically!

### Option 2: Desktop Icon
1. Open Terminal in the `poc` folder
2. Run: `./scripts/create-desktop-launcher.sh`
3. A "Meeting Assistant" app will appear on your Desktop
4. Double-click it to launch!

## Manual Launch

### From Terminal
```bash
cd poc
npm start
```

### Development Mode
```bash
cd poc
npm run dev
```

## First Time Setup

When you first launch, the app will:
1. Check for dependencies (auto-install if needed)
2. Build the application (if needed)
3. Check for `.env` file (create template if missing)

## How It Works

The Meeting Assistant runs as a **system tray application**:
- Look for the icon in your menu bar (top-right)
- Click the icon to show/hide the main window
- Right-click for options menu
- Use **Cmd+Shift+R** to quickly start/stop recording

## Creating a Permanent Desktop App

To create a proper macOS app:

1. **Build the distributable:**
   ```bash
   npm run build
   ```

2. **Find your app:**
   - Look in `poc/release/mac`
   - You'll find "Meeting Assistant.app"

3. **Install it:**
   - Drag "Meeting Assistant.app" to your Applications folder
   - Add it to your Dock for easy access

## Troubleshooting

### App won't start
- Make sure you have Node.js installed
- Run `npm install` in the poc directory
- Check that `.env` file exists with your API keys

### No icon appears
- The app needs proper icon files
- Run the icon generation scripts in `assets/icons`

### Can't see system tray icon
- Check your menu bar (top-right of screen)
- Make sure you have menu bar space available
- Try restarting the app

## Features When Running

- **System Tray**: Always accessible from menu bar
- **Global Hotkey**: Cmd+Shift+R to start/stop recording
- **Smart Audio Routing**: Automatically manages audio devices
- **Visual Indicators**: Red icon when recording

## Tips

1. **Keep in Dock**: Right-click the app icon while running → Options → Keep in Dock
2. **Start at Login**: System Preferences → Users & Groups → Login Items → Add Meeting Assistant
3. **Quick Access**: The app stays in your menu bar even when the window is closed