# Smart Audio Routing Setup

The Meeting Assistant now includes **Smart BlackHole Manager** that automatically manages audio routing without disrupting your normal audio experience.

## How It Works

When you start recording in Virtual Meeting mode:
1. **Saves** your current audio output device
2. **Creates** a multi-output device that includes:
   - BlackHole (for recording)
   - Your speakers/headphones (so you can still hear)
3. **Routes** system audio through both devices
4. **Records** from BlackHole input

When you stop recording:
- **Restores** your original audio settings automatically

## Initial Setup

### 1. Run the Setup Script
```bash
cd poc
./scripts/setup-audio.sh
```

This will:
- Install SwitchAudioSource (for device management)
- Install SOX (for recording)
- Guide you to install BlackHole if needed

### 2. Install BlackHole (if not installed)
1. Download BlackHole 2ch from: https://existential.audio/blackhole/
2. Run the installer
3. Restart your computer (recommended)

### 3. First Recording
1. Launch the Meeting Assistant
2. Select "Virtual Meeting" mode
3. Click "Start Recording"
4. The app will automatically:
   - Create the multi-output device
   - Route your audio properly
   - Show "🎧 Smart audio routing active" status

## Benefits

- ✅ **No Manual Configuration**: Everything is automated
- ✅ **Hear While Recording**: You still hear all audio normally
- ✅ **Auto-Restore**: Original settings restored after recording
- ✅ **Meeting App Detection**: Automatically detects Teams, Zoom, etc.
- ✅ **Fallback Mode**: Uses microphone if BlackHole isn't available

## Troubleshooting

### "BlackHole is not installed" message
- Run `./scripts/setup-audio.sh` and follow the instructions
- Make sure to download BlackHole **2ch** (not 16ch)

### No audio being recorded
1. Check System Preferences > Security & Privacy > Microphone
2. Ensure Meeting Assistant has permission
3. Try switching to In-Person mode and back to Virtual

### Audio routing not working
- The app may need to request permission to control Audio MIDI Setup
- Grant permission when prompted
- If issues persist, manually create a Multi-Output Device in Audio MIDI Setup

### Can't hear audio while recording
- This shouldn't happen with Smart Routing
- Check that the multi-output device was created
- Manually check Audio MIDI Setup for the "Meeting Assistant Multi-Output" device

## Manual Override

If you prefer manual control:
1. Open Audio MIDI Setup
2. Create a Multi-Output Device with:
   - Your speakers/headphones
   - BlackHole 2ch
3. Set this as your output before recording
4. Record from "BlackHole 2ch" input