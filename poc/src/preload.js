const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'api', {
    //----------------------------------------
    // AUDIO CAPTURE METHODS
    //----------------------------------------
    startAudioCapture: async (options) => {
      return await ipcRenderer.invoke('start-audio-capture', options);
    },
    stopAudioCapture: async () => {
      return await ipcRenderer.invoke('stop-audio-capture');
    },
    
    //----------------------------------------
    // TRANSCRIPTION METHODS
    //----------------------------------------
    startTranscription: async (audioData) => {
      return await ipcRenderer.invoke('start-transcription', audioData);
    },
    
    //----------------------------------------
    // MEETING SUMMARY METHODS
    //----------------------------------------
    generateSummary: async (transcription) => {
      return await ipcRenderer.invoke('generate-summary', transcription);
    },
    saveMeeting: async (meetingData) => {
      return await ipcRenderer.invoke('save-meeting', meetingData);
    },
    listMeetings: async () => {
      return await ipcRenderer.invoke('list-meetings');
    },
    loadMeeting: async (meetingId) => {
      return await ipcRenderer.invoke('load-meeting', meetingId);
    },
    
    //----------------------------------------
    // EMAIL METHODS
    //----------------------------------------
    sendEmail: async (emailData) => {
      return await ipcRenderer.invoke('send-email', emailData);
    },
    saveEmailSettings: async (settings) => {
      return await ipcRenderer.invoke('save-email-settings', settings);
    },
    getEmailSettings: async () => {
      return await ipcRenderer.invoke('get-email-settings');
    },
    
    //----------------------------------------
    // EVENT LISTENERS
    //----------------------------------------
    // Audio data event listeners
    onAudioData: (callback) => {
      ipcRenderer.on('audio-data', (event, data) => callback(data));
      return () => {
        ipcRenderer.removeAllListeners('audio-data');
      };
    },
    
    // Transcription event listeners
    onTranscriptionResult: (callback) => {
      ipcRenderer.on('transcription-result', (event, result) => callback(result));
      return () => {
        ipcRenderer.removeAllListeners('transcription-result');
      };
    },
    
    // Error event listeners
    onError: (callback) => {
      ipcRenderer.on('error', (event, error) => callback(error));
      return () => {
        ipcRenderer.removeAllListeners('error');
      };
    }
  }
);
