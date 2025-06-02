# Meeting Assistant – 30‑Day Roadmap

## 0  Prerequisites

- Node ≥ 20, pnpm, TypeScript, Electron 30
- Python 3.10+, CUDA 11.x (if GPU), Docker Desktop
- Whisper model folders mounted at `/models/whisper`

---

## 1  Architecture Snapshot

```text
┌────────────┐            websockets            ┌──────────────┐
│ Electron UI│◀───────────────────────────────▶│  ASR Service │ (Python + faster‑whisper)
└────────────┘                                └──────────────┘
       │                                              ▲
       │         speaker events                       │ gRPC / REST
       ▼                                              │
┌────────────┐            websockets            ┌──────────────┐
│RNNoise/VAD │◀───────────────────────────────▶│DiarizationSvc│ (WhisperX / pyannote)
└────────────┘                                └──────────────┘
       │                                               
       ▼                                               
    Prisma DB  (SQLite – meeting, segment, summary)
```

---

## 2  Four‑Week Sprint Plan

| Week | Deliverables | Definition of Done |
|------|--------------|--------------------|
| **1** | ✔ Convert codebase to TypeScript<br>✔ Introduce Prisma + SQLite<br>✔ Robust IPC error wrapper | `npm run typecheck` passes; new `db.sqlite` auto‑migrates; UI shows toast on any IPC error |
| **2** | ✔ Dockerised `asr-service` with faster‑whisper (tiny model) <br>✔ Electron sends 1 s PCM chunks over WS <br>✔ Live captions rendered in UI | Latency ≤ 1.5 s; subtitles update as you speak |
| **3** | ✔ RNNoise transform stream <br>✔ `diarization-service` returns speaker labels post‑meeting <br>✔ Captions file includes `speaker` field | `meeting‑YYYYMMDD.vtt` contains `speaker:X` tags |
| **4** | ✔ Teams post‑meeting fetch (Graph API) <br>✔ GPT‑4o map‑reduce summariser <br>✔ React‑Native iOS viewer (Expo) | Summary JSON stored and displays on phone; push notification on meeting end |

---

## 3  Task‑by‑Task Instructions

### Week 1
1. **Init TS**  
   ```bash
   pnpm add -D typescript @types/node ts-node
   npx tsc --init --rootDir src --outDir dist --module ESNext --strict
   ```
2. **Refactor capture file**  
   Rename `poc/src/capture.js → capture.ts`; replace implicit `any` buffers with `Uint8Array`.
3. **Add Prisma**  
   ```bash
   pnpm add prisma @prisma/client
   npx prisma init --datasource-provider sqlite
   ```
4. **Create schema** (meeting, segment, summary) then `npx prisma migrate dev --name init`.
5. **IPC error wrapper** – in `main.ts`:
   ```ts
   const safe = (fn: (...a:any[])=>any)=>(event,...args)=>{
     try{ return fn(event,...args);}catch(e){
       event.sender.send('error', JSON.stringify({step:fn.name,msg:e.message}))
     }
   }
   ipcMain.handle('start-recording', safe(startRecording))
   ```

### Week 2
1. `backend/docker-compose.yaml` with whisper + uvicorn.
2. Implement `/ws` endpoint that streams partial + final `{"text":"","is_final":bool}`.
3. Connect Electron: use `MediaRecorder`, transcode to 16‑kHz PCM via `@ai/audio`.

### Week 3
1. `rnnoise-nodejs`:
   ```ts
   import { RnnoiseStream } from 'rnnoise-stream';
   micStream.pipe(new RnnoiseStream()).pipe(ws)
   ```
2. Add `diarization-service` Docker (WhisperX align mode).
3. Post‑meeting: fetch `.wav` from local storage, run diarization, merge with transcript.

### Week 4
1. Register Azure app → get Teams access token → `/communications/callRecords/{id}` to download transcript.
2. Map‑reduce summariser prompt (in `summarise.ts`).
3. Expo app: subscribe to `/meetings/:id/stream` WS; build summary screen.

---

## 4  Cursor Prompts Library

Paste these into Cursor ➜ ChatGPT panel when you hit each milestone.

### TypeScript Migration
> **Prompt TS‑01:**  
> “Convert the following Electron preload script to TypeScript with explicit types and proper contextBridge exposure:```…code…```”

### ASR Micro‑service
> **Prompt ASR‑01:**  
> “Generate a FastAPI app exposing `/ws` which accepts 16‑kHz 1‑channel PCM frames and streams JSON `{text,is_final}` using faster‑whisper tiny model → language=en.”

### WebSocket Client
> **Prompt WS‑01:**  
> “Show a minimal Node snippet that opens a WS to `ws://localhost:8000/ws`, sends 1‑second Uint8Array PCM chunks, and logs server JSON.”

### Diarization
> **Prompt DIAR‑01:**  
> “Write a Python script using WhisperX that loads `input.wav`, performs diarization, and outputs an SRT with speaker labels.”

### Summarisation
> **Prompt SUM‑01:**  
> “Create an OpenAI chat‑completions request that does map‑reduce summarisation over N chunk summaries and returns JSON with keys summary, decisions, action_items.”

### React Native Viewer
> **Prompt IOS‑01:**  
> “Generate an Expo app screen that subscribes to a websocket emitting `{speaker,text}` events and displays a live transcript list.”

---

## 5  Testing Checklist

- [ ] Latency < 1.5 s for interim captions
- [ ] Transcript accuracy ≥ 90 % on 5‑min mixed‑speaker sample
- [ ] Speaker diarization error rate < 20 %
- [ ] Summary JSON validates against schema
- [ ] iOS app receives push within 5 seconds of meeting end

🏁  Once all boxes are ticked, tag the repo `v0.2‑realtime` and cut a demo video.

