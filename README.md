# Meeting Assistant 🎙️

A smart meeting recorder that automatically transcribes, summarizes, and creates action items from your meetings.

## Features

✨ **Dual Recording Modes**
- **Virtual Meeting Mode**: Captures system audio from Teams, Zoom, etc.
- **In-Person Mode**: Records from microphone for physical meetings

🎯 **Smart Audio Routing**
- Automatically manages audio devices
- Preserves your ability to hear while recording
- No manual configuration needed

🤖 **AI-Powered Processing**
- Real-time transcription with OpenAI Whisper
- Intelligent summarization with GPT-4
- Automatic extraction of action items and decisions

🚀 **Seamless Experience**
- System tray app - always accessible
- Global hotkey (Cmd+Shift+R) for quick recording
- Email summaries with one click

## Quick Start

### Prerequisites
- macOS 10.15 or later
- Node.js 16+ and npm
- BlackHole 2ch (for system audio capture)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/meeting_assistant.git
cd meeting_assistant/poc
```

2. Install dependencies:
```bash
npm install
```

3. Set up audio (one-time):
```bash
./scripts/setup-audio.sh
```

4. Configure environment:
```bash
cp .env.example .env
# Edit .env with your API keys
```

5. Launch the app:
```bash
./launch.command
# Or: npm start
```

## Configuration

### Required API Keys

1. **OpenAI API Key**
   - Get from: https://platform.openai.com/api-keys
   - Used for transcription and summarization

2. **Email Credentials** (optional)
   - For Gmail: Create app-specific password
   - Enables automatic email summaries

See [SECURITY.md](poc/SECURITY.md) for detailed setup instructions.

## Usage

### Recording a Meeting

1. Click the system tray icon
2. Select your recording mode:
   - **Virtual**: For online meetings
   - **In-Person**: For physical meetings
3. Press **Cmd+Shift+R** or click "Start Recording"
4. The icon turns red while recording
5. Press **Cmd+Shift+R** again to stop

### After Recording

The app automatically:
- Transcribes your meeting
- Generates a summary with key points
- Extracts action items and decisions
- Offers to email the summary

## Project Structure

```
meeting_assistant/
├── poc/                    # Main application
│   ├── src/               
│   │   ├── main.ts        # Electron main process
│   │   ├── renderer/      # React UI components
│   │   └── services/      # Audio routing, processing
│   ├── scripts/           # Setup and utility scripts
│   └── assets/            # Icons and resources
├── design/                # Architecture documentation
└── research/              # Technical research notes
```

## Documentation

- [Audio Setup Guide](poc/AUDIO_SETUP.md) - Configure audio routing
- [Launch Guide](poc/LAUNCH_GUIDE.md) - Different ways to start the app
- [Security Guide](poc/SECURITY.md) - API key management
- [Architecture](design/system-architecture-and-ui.md) - System design

## Development

### Running in Development Mode
```bash
npm run dev
```

### Building for Distribution
```bash
npm run build
```

### Creating Desktop App
```bash
./scripts/create-desktop-launcher.sh
```

## Troubleshooting

### No Audio Being Recorded
1. Ensure BlackHole is installed
2. Check System Preferences > Security & Privacy > Microphone
3. Grant permissions to Meeting Assistant

### Can't Start Recording
- Verify `.env` file has valid `OPENAI_API_KEY`
- Check console for error messages
- Try switching recording modes

## Tech Stack

- **Frontend**: React + TypeScript
- **Backend**: Electron + Node.js
- **AI**: OpenAI Whisper + GPT-4
- **Database**: SQLite with Prisma ORM
- **Audio**: BlackHole + SOX
- **Build**: Webpack + electron-builder

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

MIT License - see LICENSE file

## Acknowledgments

- [BlackHole](https://existential.audio/blackhole/) for audio routing
- [OpenAI](https://openai.com) for AI capabilities
- [Electron](https://electronjs.org) for desktop framework

---

Built with ❤️ for better meetings