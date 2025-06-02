declare module './components/DeviceSelector' {
  import React from 'react';
  
  interface DeviceSelectorProps {
    devices: Array<{ id: string; label: string }>;
    selectedDevice: string;
    onDeviceChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  }
  
  const DeviceSelector: React.FC<DeviceSelectorProps>;
  export default DeviceSelector;
}

declare module './components/Controls' {
  import React from 'react';
  
  interface ControlsProps {
    isRecording: boolean;
    canTranscribe: boolean;
    onStartRecording: () => Promise<void>;
    onStopRecording: () => Promise<void>;
    onTranscribe: () => Promise<void>;
  }
  
  const Controls: React.FC<ControlsProps>;
  export default Controls;
}

declare module './components/Transcription' {
  import React from 'react';
  
  interface TranscriptionProps {
    text: string;
  }
  
  const Transcription: React.FC<TranscriptionProps>;
  export default Transcription;
}

declare module './components/StatusBar' {
  import React from 'react';
  
  interface StatusBarProps {
    status: string;
  }
  
  const StatusBar: React.FC<StatusBarProps>;
  export default StatusBar;
}

declare module './components/Summary' {
  import React from 'react';
  
  interface SummaryProps {
    summary: any;
    onSave: (summaryData: any) => Promise<void>;
    onEmail: () => void;
    isSaving: boolean;
  }
  
  const Summary: React.FC<SummaryProps>;
  export default Summary;
}

declare module './components/EmailDialog' {
  import React from 'react';
  
  interface EmailDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSend: (emailData: any) => Promise<void>;
    summary: any;
    isSending: boolean;
  }
  
  const EmailDialog: React.FC<EmailDialogProps>;
  export default EmailDialog;
}
