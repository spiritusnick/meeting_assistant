# Meeting Assistant Codebase Summary

## Directory Structure

```
meeting_assistant/
├── cline_docs/            # Project documentation
├── dist/                  # Webpack output directory
├── node_modules/          # npm dependencies
├── poc/                   # Proof of Concept implementation
│   ├── recordings/        # Directory for saved audio recordings
│   ├── temp/              # Temporary files directory
│   ├── src/               # Source code
│   │   ├── main.js        # Electron main process
│   │   ├── preload.js     # Electron preload script for IPC
│   │   ├── capture.js     # Audio capture functionality
│   │   ├── transcribe.js  # Transcription functionality
│   │   └── renderer/      # React frontend
│   │       ├── index.js   # React entry point
│   │       ├── index.html # HTML template
│   │       ├── App.jsx    # Main React component
│   │       ├── styles.css # Global styles
│   │       └── components/ # UI components
│   │           ├── Controls.jsx        # Recording control buttons
│   │           ├── DeviceSelector.jsx  # Audio device dropdown
│   │           ├── StatusBar.jsx       # Status messages
│   │           └── Transcription.jsx   # Transcription display
│   ├── package.json       # npm package configuration
│   ├── webpack.config.js  # Webpack configuration
│   ├── .env               # Environment variables
│   └── .env.example       # Example environment variables
└── research/              # Research documentation
    └── audio-capture-transcription-research.md
```

## Architecture Overview

The Meeting Assistant follows an Electron architecture with React for the UI:

1. **Electron Main Process** (`main.js`):
   - Entry point for the application
   - Creates and manages the application window
   - Sets up IPC handlers for audio capture and transcription

2. **Preload Script** (`preload.js`):
   - Securely exposes IPC communication channels to the renderer
   - Provides a bridge between main process capabilities and renderer UI

3. **Audio Capture Module** (`capture.js`):
   - Handles audio recording from selected devices
   - Manages recording state and audio buffers
   - Saves recordings to disk

4. **Transcription Module** (`transcribe.js`):
   - Interfaces with OpenAI Whisper API
   - Processes audio data for transcription
   - Returns text transcription results

5. **React UI** (`renderer/`):
   - Main App component manages application state
   - Specialized components for various UI elements
   - Communicates with main process via IPC bridge

## Data Flow

```mermaid
graph TD
    User[User] -->|Selects Audio Device| DS[DeviceSelector]
    User -->|Controls Recording| C[Controls]
    
    DS -->|Updates Device| App[App Component]
    C -->|Start/Stop/Transcribe| App
    
    App -->|Start Recording| IPC[IPC Bridge]
    IPC -->|Invoke startAudioCapture| Cap[capture.js]
    Cap -->|Audio Data| IPC
    IPC -->|Audio Data Event| App
    
    App -->|Stop Recording| IPC
    IPC -->|Invoke stopAudioCapture| Cap
    
    App -->|Transcribe| IPC
    IPC -->|Invoke startTranscription| Trans[transcribe.js]
    Trans -->|API Request| OpenAI[OpenAI Whisper API]
    OpenAI -->|Transcription Result| Trans
    Trans -->|Transcription Result| IPC
    IPC -->|Transcription Event| App
    
    App -->|Update State| WF[Waveform]
    App -->|Update State| SB[StatusBar]
    App -->|Update State| TR[Transcription]
    
    WF -->|Show Visualization| User
    SB -->|Show Status| User
    TR -->|Show Text| User
```

## Component Relationships

1. **App Component**:
   - Central state manager for the application
   - Coordinates between UI components and IPC bridge
   - Maintains recording state, transcription results, and audio data

2. **UI Components**:
   - **DeviceSelector**: Lists available audio devices, updates App state on change
   - **Controls**: Provides buttons for recording and transcription, triggers App methods
   - **StatusBar**: Displays current application status from App state
   - **Transcription**: Renders transcription results from App state

3. **Main Process Modules**:
   - **capture.js**: Handles audio recording, sends data back via events
   - **transcribe.js**: Processes audio for transcription, sends results via events

## State Management

The application uses React's useState hooks for state management:

- **isRecording**: Tracks if recording is in progress
- **audioDevices**: List of available audio input devices
- **selectedDevice**: Currently selected audio device
- **status**: Current application status message
- **transcription**: Transcription result text
- **error**: Error message if any
- **audioChunks**: Collected audio data buffers
- **canTranscribe**: Flag indicating if transcription is available

## IPC Communication

Communication between Electron's main and renderer processes happens via IPC:

1. **From Renderer to Main**:
   - `window.api.startAudioCapture()`: Begin recording from selected device
   - `window.api.stopAudioCapture()`: Stop active recording
   - `window.api.startTranscription()`: Request transcription of recorded audio

2. **From Main to Renderer**:
   - `audio-data`: Event with chunks of recorded audio
   - `transcription-result`: Event with transcription text
   - `error`: Event with error information

## Challenges and Considerations

1. **Audio Format Handling**:
   - Current implementation uses raw PCM, may need proper WAV conversion
   - Buffer handling between processes needs optimization

2. **React Integration**:
   - Using useEffect for event listeners and cleanup
   - Need to ensure proper state updates on asynchronous events

3. **Performance**:
   - Audio visualization can be resource-intensive
   - Large audio files may cause memory pressure

4. **Future Modularity**:
   - Current structure works for POC but will need more separation of concerns
   - Consider context API for deeper component trees

## Version Control Considerations

The project's `.gitignore` configuration excludes the following categories of files:

1. **Dependencies and Package Managers**:
   - `node_modules/` directory
   - `package-lock.json` (~337KB) - regenerated on npm install

2. **Build and Distribution Artifacts**:
   - `dist/`, `build/`, and `out/` directories
   - Webpack output (`.webpack/`)
   - Electron builder output
   - Application installers and bundles (`.app`, `.exe`, `.dmg`, etc.)

3. **Environment and Configuration**:
   - `.env` files containing secrets and API keys
   - Local configuration files

4. **Generated Content**:
   - `recordings/` directory - audio recordings (potentially large files)
   - `transcripts/` - text transcriptions
   - `summaries/` - meeting summaries
   - All audio files (`.wav`, `.mp3`, `.ogg`, `.raw`)

5. **Temporary and Cache Files**:
   - Editor-specific files (`.vscode/`, `.idea/`)
   - OS-generated files (`.DS_Store`)
   - Temporary directories (`temp/`, `tmp/`)
   - Electron cache directories

This configuration ensures that only essential source code is versioned, while build artifacts, local configurations, and large generated files are excluded to keep the repository size manageable.
