export interface ElectronAPI {
  // Audio capture methods
  startAudioCapture: (options: any) => Promise<any>;
  stopAudioCapture: () => Promise<any>;
  
  // Transcription methods
  startTranscription: (audioData: any) => Promise<any>;
  
  // Meeting summary methods
  generateSummary: (transcription: string) => Promise<any>;
  saveMeeting: (meetingData: any) => Promise<any>;
  listMeetings: () => Promise<any>;
  loadMeeting: (meetingId: string) => Promise<any>;
  
  // Email methods
  sendEmail: (emailData: any) => Promise<any>;
  saveEmailSettings: (settings: any) => Promise<any>;
  getEmailSettings: () => Promise<any>;
  
  // Event listeners
  onAudioData: (callback: (data: any) => void) => () => void;
  onTranscriptionResult: (callback: (result: string) => void) => () => void;
  onError: (callback: (error: any) => void) => () => void;
  
  // Meeting recorder methods
  getRecordingMode: () => Promise<any>;
  setRecordingMode: (mode: 'virtual' | 'physical') => Promise<any>;
  getAudioDevices: () => Promise<any>;
  setAudioDevice: (deviceId: string) => Promise<any>;
  onModeChanged: (callback: (data: any) => void) => () => void;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}