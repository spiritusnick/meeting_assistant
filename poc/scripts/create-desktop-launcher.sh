#!/bin/bash

echo "Creating Meeting Assistant Desktop Launcher..."

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

# Create a simple launcher app using AppleScript
LAUNCHER_NAME="Meeting Assistant"
LAUNCHER_PATH="$HOME/Desktop/$LAUNCHER_NAME.app"

# Create the app structure
mkdir -p "$LAUNCHER_PATH/Contents/MacOS"
mkdir -p "$LAUNCHER_PATH/Contents/Resources"

# Create Info.plist
cat > "$LAUNCHER_PATH/Contents/Info.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>launcher</string>
    <key>CFBundleIconFile</key>
    <string>app</string>
    <key>CFBundleIdentifier</key>
    <string>com.nicholasbianco.meetingassistant.launcher</string>
    <key>CFBundleName</key>
    <string>Meeting Assistant</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>LSMinimumSystemVersion</key>
    <string>10.10</string>
    <key>LSUIElement</key>
    <false/>
</dict>
</plist>
EOF

# Create the launcher script
cat > "$LAUNCHER_PATH/Contents/MacOS/launcher" << EOF
#!/bin/bash
cd "$PROJECT_DIR"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    osascript -e 'display dialog "Dependencies not installed. Please run npm install in the project directory." buttons {"OK"} default button 1'
    exit 1
fi

# Check if dist exists
if [ ! -d "dist" ]; then
    osascript -e 'display dialog "App not built. Building now..." buttons {"OK"} default button 1'
    npm run build:all
fi

# Start the app
npm start
EOF

# Make the launcher executable
chmod +x "$LAUNCHER_PATH/Contents/MacOS/launcher"

# Copy icon if it exists
if [ -f "$PROJECT_DIR/assets/icons/app.icns" ]; then
    cp "$PROJECT_DIR/assets/icons/app.icns" "$LAUNCHER_PATH/Contents/Resources/app.icns"
else
    echo "Warning: Icon file not found at $PROJECT_DIR/assets/icons/app.icns"
fi

echo "✅ Desktop launcher created at: $LAUNCHER_PATH"
echo ""
echo "You can now:"
echo "1. Double-click the Meeting Assistant app on your Desktop"
echo "2. Drag it to your Applications folder for permanent installation"
echo "3. Add it to your Dock for quick access"
echo ""

# Create an alias in Applications (optional)
read -p "Would you like to create an alias in Applications folder? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    ln -sf "$LAUNCHER_PATH" "/Applications/Meeting Assistant.app"
    echo "✅ Alias created in Applications folder"
fi