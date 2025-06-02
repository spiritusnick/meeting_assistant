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
  sender: string;
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  }
}

interface ErrorData {
  type: string;
  message: string;
}

interface ElectronAPI {
  // AUDIO CAPTURE METHODS
  startAudioCapture: (options?: any) => Promise<any>;
  stopAudioCapture: () => Promise<any>;
  
  // TRANSCRIPTION METHODS
  startTranscription: (audioData: any) => Promise<TranscriptionResult>;
  
  // MEETING SUMMARY METHODS
  generateSummary: (transcription: string) => Promise<SummaryResult>;
  saveMeeting: (meetingData: MeetingData) => Promise<SaveResult>;
  listMeetings: () => Promise<ListMeetingsResult>;
  loadMeeting: (meetingId: string) => Promise<LoadMeetingResult>;
  
  // EMAIL METHODS
  sendEmail: (emailData: EmailData) => Promise<EmailResult>;
  saveEmailSettings: (settings: EmailSettings) => Promise<any>;
  getEmailSettings: () => Promise<any>;
  
  // EVENT LISTENERS
  onAudioData: (callback: (data: AudioData) => void) => () => void;
  onTranscriptionResult: (callback: (result: string) => void) => () => void;
  onError: (callback: (error: ErrorData | string) => void) => () => void;
  
  // MEETING RECORDER METHODS
  getRecordingMode: () => Promise<any>;
  setRecordingMode: (mode: 'virtual' | 'physical') => Promise<any>;
  getAudioDevices: () => Promise<any>;
  setAudioDevice: (deviceId: string) => Promise<any>;
  onModeChanged: (callback: (data: any) => void) => () => void;
  checkBlackHoleInstalled: () => Promise<any>;
  onAudioRouteChanged: (callback: (data: any) => void) => () => void;
}

interface Window {
  api: ElectronAPI;
}
