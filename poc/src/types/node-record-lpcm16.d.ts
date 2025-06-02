declare module 'node-record-lpcm16' {
  interface RecorderOptions {
    sampleRate: number;
    channels: number;
    device: string;
    silence?: string;
    threshold?: number;
    recordProgram?: string;
    verbose?: boolean;
  }

  interface RecordingProcess {
    stream(): NodeJS.ReadableStream;
    stop(): void;
  }

  export function record(options: RecorderOptions): RecordingProcess;
}
