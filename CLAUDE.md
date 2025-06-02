# Meeting Assistant - Hybrid Audio Capture Implementation

## Project Overview
Building a smart meeting recorder with dual-mode audio capture that automatically transcribes, summarizes, and creates follow-up actions from meetings.

## Key Architecture Decisions

### Audio Capture Strategy
- **Meeting Mode**: Hardware loopback cable (3.5mm male-to-male) for foolproof system audio capture
- **In-Person Mode**: Direct microphone capture for physical meetings
- **Auto-Detection**: Detects running meeting apps (Teams, Zoom, GoTo) to switch modes

### Processing Pipeline
1. Audio Capture → 2. Noise Reduction (RNNoise) → 3. Transcription (Whisper) → 4. Speaker Diarization → 5. Summary (GPT-4) → 6. Action Items & Calendar Events

### Tech Stack
- **Electron + React + TypeScript**: Desktop app with system tray
- **SOX**: Audio recording (existing)
- **OpenAI APIs**: Whisper + GPT-4 (existing)
- **Prisma + SQLite**: Data persistence (existing)
- **node-notifier**: System tray notifications (new)
- **node-global-key-listener**: Hotkey support (new)

## Implementation Phases

### Phase 1: Core Hybrid Recording
- [ ] Add MeetingRecorder class with dual-mode support
- [ ] Implement process detection for auto-mode switching
- [ ] Update UI to show current recording mode
- [ ] Add loopback input device support

### Phase 2: System Tray & Hotkeys
- [ ] Convert to system tray app with menu bar icon
- [ ] Add recording status indicator (red when active)
- [ ] Implement global hotkey (Ctrl+Shift+R) for start/stop
- [ ] Add quick access menu for mode switching

### Phase 3: Real-Time Processing
- [ ] Integrate RNNoise for audio cleanup
- [ ] Add streaming transcription support
- [ ] Implement speaker diarization service
- [ ] Create real-time transcript view

### Phase 4: Meeting Intelligence
- [ ] Add conversation analytics (talk-time, questions, sentiment)
- [ ] Implement smart summarization templates by meeting type
- [ ] Create auto-calendar event generation
- [ ] Add CRM/calendar integrations

## Key Files to Modify

1. `poc/src/capture.ts` - Add MeetingRecorder class
2. `poc/src/main.ts` - Add system tray functionality
3. `poc/src/renderer/App.tsx` - Update UI for dual modes
4. `poc/src/transcribe.ts` - Add streaming support
5. New: `poc/src/services/meeting-intelligence.ts`
6. New: `poc/src/services/process-detector.ts`

## Commands
- Build: `npm run build`
- Dev: `npm run dev`
- Lint: `npm run lint` (if available)
- Type check: `npm run typecheck` (if available)

## Notes
- User prefers concise responses
- Avoid creating unnecessary documentation
- Focus on practical implementation
- Hardware loopback cable eliminates complex virtual audio routing