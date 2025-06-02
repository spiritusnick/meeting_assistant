#!/bin/bash

echo "Meeting Assistant Audio Setup"
echo "============================"
echo ""

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "❌ Homebrew is not installed. Please install it first:"
    echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
    exit 1
fi

echo "✅ Homebrew is installed"

# Check if SwitchAudioSource is installed
if ! command -v SwitchAudioSource &> /dev/null; then
    echo "📦 Installing SwitchAudioSource..."
    brew install switchaudio-osx
else
    echo "✅ SwitchAudioSource is installed"
fi

# Check if BlackHole is installed
if ! SwitchAudioSource -a | grep -q "BlackHole"; then
    echo ""
    echo "⚠️  BlackHole is not installed!"
    echo ""
    echo "Please install BlackHole 2ch from:"
    echo "👉 https://existential.audio/blackhole/"
    echo ""
    echo "Installation steps:"
    echo "1. Download BlackHole 2ch (not 16ch)"
    echo "2. Run the installer"
    echo "3. Restart this setup script"
    echo ""
    read -p "Press Enter after installing BlackHole..."
else
    echo "✅ BlackHole is installed"
fi

# Check if SOX is installed
if ! command -v sox &> /dev/null; then
    echo "📦 Installing SOX..."
    brew install sox
else
    echo "✅ SOX is installed"
fi

echo ""
echo "🎉 Audio setup complete!"
echo ""
echo "The Meeting Assistant will now:"
echo "- Automatically create a multi-output device when recording"
echo "- Route audio through BlackHole while preserving your speakers"
echo "- Restore your original audio settings when done"
echo ""