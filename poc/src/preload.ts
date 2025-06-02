import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
// This is a preload script and will be bundled separately

// Define types for our API
interface AudioData {
  buffer: Uint8Array;
  sampleRate: number;
  channels: number;
}

interface TranscriptionResult {
  success: boolean;
  transcription: string;
  message: string;
  error?: string;
}

interface SummaryResult {
  success: boolean;
  summary: any;
  message: string;
  error?: string;
}

interface MeetingData {
  title: string;
  date: string;
  transcription: string;
  summary: any;
}

interface SaveResult {
  success: boolean;
  filePath?: string;
  message: string;
  error?: string;
}

interface ListMeetingsResult {
  success: boolean;
  meetings: any[];
  error?: string;
}

interface LoadMeetingResult {
  success: boolean;
  meeting?: any;
  error?: string;
}

interface EmailData {
  to: string[];
  cc?: string[];
  subject: string;
  textContent: string;
  htmlContent: string;
  customMessage?: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  message: string;
  error?: string;
}

interface EmailSettings {
  service?: string;
  host?: string;
  port?: string | number;
  secure?: boolean;
  user?: string;
  password?: string;
}

interface ErrorData {
  type: string;
  message: string;
}

// Define callback function types
type AudioDataCallback = (data: AudioData) => void;
type TranscriptionCallback = (result: string) => void;
type ErrorCallback = (error: ErrorData | string) => void;

// Define the API object with TypeScript types
const api = {
  //----------------------------------------
  // AUDIO CAPTURE METHODS
  //----------------------------------------
  startAudioCapture: async (options: any): Promise<any> => {
    return await ipcRenderer.invoke('start-audio-capture', options);
  },
  stopAudioCapture: async (): Promise<any> => {
    return await ipcRenderer.invoke('stop-audio-capture');
  },
  
  //----------------------------------------
  // TRANSCRIPTION METHODS
  //----------------------------------------
  startTranscription: async (audioData: any): Promise<TranscriptionResult> => {
    return await ipcRenderer.invoke('start-transcription', audioData);
  },
  
  //----------------------------------------
  // MEETING SUMMARY METHODS
  //----------------------------------------
  generateSummary: async (transcription: string): Promise<SummaryResult> => {
    return await ipcRenderer.invoke('generate-summary', transcription);
  },
  saveMeeting: async (meetingData: MeetingData): Promise<SaveResult> => {
    return await ipcRenderer.invoke('save-meeting', meetingData);
  },
  listMeetings: async (): Promise<ListMeetingsResult> => {
    return await ipcRenderer.invoke('list-meetings');
  },
  loadMeeting: async (meetingId: string): Promise<LoadMeetingResult> => {
    return await ipcRenderer.invoke('load-meeting', meetingId);
  },
  
  //----------------------------------------
  // EMAIL METHODS
  //----------------------------------------
  sendEmail: async (emailData: EmailData): Promise<EmailResult> => {
    return await ipcRenderer.invoke('send-email', emailData);
  },
  saveEmailSettings: async (settings: EmailSettings): Promise<any> => {
    return await ipcRenderer.invoke('save-email-settings', settings);
  },
  getEmailSettings: async (): Promise<any> => {
    return await ipcRenderer.invoke('get-email-settings');
  },
  
  //----------------------------------------
  // EVENT LISTENERS
  //----------------------------------------
  // Audio data event listeners
  onAudioData: (callback: AudioDataCallback): (() => void) => {
    const subscription = (_event: IpcRendererEvent, data: AudioData) => callback(data);
    ipcRenderer.on('audio-data', subscription);
    return () => {
      ipcRenderer.removeListener('audio-data', subscription);
    };
  },
  
  // Transcription event listeners
  onTranscriptionResult: (callback: TranscriptionCallback): (() => void) => {
    const subscription = (_event: IpcRendererEvent, result: string) => callback(result);
    ipcRenderer.on('transcription-result', subscription);
    return () => {
      ipcRenderer.removeListener('transcription-result', subscription);
    };
  },
  
  // Error event listeners
  onError: (callback: ErrorCallback): (() => void) => {
    const subscription = (_event: IpcRendererEvent, error: ErrorData | string) => callback(error);
    ipcRenderer.on('error', subscription);
    return () => {
      ipcRenderer.removeListener('error', subscription);
    };
  },
  
  //----------------------------------------
  // MEETING RECORDER METHODS
  //----------------------------------------
  getRecordingMode: async (): Promise<any> => {
    return await ipcRenderer.invoke('get-recording-mode');
  },
  setRecordingMode: async (mode: 'virtual' | 'physical'): Promise<any> => {
    return await ipcRenderer.invoke('set-recording-mode', mode);
  },
  getAudioDevices: async (): Promise<any> => {
    return await ipcRenderer.invoke('get-audio-devices');
  },
  setAudioDevice: async (deviceId: string): Promise<any> => {
    return await ipcRenderer.invoke('set-audio-device', deviceId);
  },
  
  // Mode change event listener
  onModeChanged: (callback: (data: any) => void): (() => void) => {
    const subscription = (_event: IpcRendererEvent, data: any) => callback(data);
    ipcRenderer.on('mode-changed', subscription);
    return () => {
      ipcRenderer.removeListener('mode-changed', subscription);
    };
  },
  
  // Check BlackHole installation
  checkBlackHoleInstalled: async (): Promise<any> => {
    return await ipcRenderer.invoke('check-blackhole-installed');
  },
  
  // Audio route change event listener
  onAudioRouteChanged: (callback: (data: any) => void): (() => void) => {
    const subscription = (_event: IpcRendererEvent, data: any) => callback(data);
    ipcRenderer.on('audio-route-changed', subscription);
    return () => {
      ipcRenderer.removeListener('audio-route-changed', subscription);
    };
  }
};

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('api', api);
