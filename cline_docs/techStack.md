# Meeting Assistant Technology Stack

## Frontend
- **Framework**: React 18
  - Functional components with hooks for state management
  - Context API for global state where needed
- **Styling**: CSS (potentially upgrading to CSS Modules or styled-components in future)
- **Visualization**: wavesurfer.js for audio waveform rendering

## Backend & Desktop Integration
- **Platform**: Electron
  - Enables cross-platform desktop application
  - Provides native system access for audio capture
- **IPC**: Electron's contextBridge for secure main-renderer process communication
- **Build Tools**: Webpack for bundling React components
- **Package Management**: npm

## Audio Processing
- **Capture**: node-record-lpcm16 for recording from audio devices
- **Virtual Audio**: BlackHole (macOS virtual audio device)
- **Processing**: Basic buffer manipulation for now (potential AudioKit integration later)
- **Format Handling**: Currently raw PCM, plans for proper WAV conversion

## AI & Transcription
- **Speech-to-Text**: OpenAI Whisper API
  - Current: Post-recording processing
  - Planned: Real-time streaming transcription
- **API Integration**: OpenAI Node.js SDK
- **Intelligence**: Plans for OpenAI GPT integration for summarization

## Storage
- **Local Storage**: File system for audio recordings
- **Configuration**: Environment variables (.env) and Electron Store (future)
- **Data Format**: Raw audio files, text transcriptions

## Development Tools
- **Source Control**: Git
- **Linting**: ESLint (planned)
- **Testing**: Jest (planned)
- **Build Pipeline**: electron-builder for packaging and distribution

## System Requirements
- **OS**: macOS (for BlackHole compatibility)
- **Resources**: 
  - Moderate CPU for audio processing
  - Sufficient memory for audio buffers
  - Internet connection for API calls to OpenAI

## Future Considerations
- **Security**: Encryption for sensitive transcription data
- **Cloud Integration**: Potential cloud storage for transcriptions and recordings
- **iOS Integration**: React Native companion app
- **AI Expansion**: On-device models for offline transcription
