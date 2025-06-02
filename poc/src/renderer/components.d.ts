// This file contains type declarations for JSX component files

// Type definitions for DeviceSelector component
import React from 'react';

declare module '*.jsx' {
  const Component: React.ComponentType<any>;
  export default Component;
}

// Add type definitions for our specific components
interface DeviceSelectorProps {
  devices: Array<{ id: string; label: string }>;
  selectedDevice: string;
  onDeviceChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

interface ControlsProps {
  isRecording: boolean;
  canTranscribe: boolean;
  onStartRecording: () => Promise<void>;
  onStopRecording: () => Promise<void>;
  onTranscribe: () => Promise<void>;
}

interface TranscriptionProps {
  text: string;
}

interface StatusBarProps {
  status: string;
}

interface SummaryProps {
  summary: any;
  onSave: (summaryData: any) => Promise<void>;
  onEmail: () => void;
  isSaving: boolean;
}

interface EmailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (emailData: any) => Promise<void>;
  summary: any;
  isSending: boolean;
}

// Make these interfaces available globally
declare global {
  interface DeviceSelectorComponent extends React.FC<DeviceSelectorProps> {}
  interface ControlsComponent extends React.FC<ControlsProps> {}
  interface TranscriptionComponent extends React.FC<TranscriptionProps> {}
  interface StatusBarComponent extends React.FC<StatusBarProps> {}
  interface SummaryComponent extends React.FC<SummaryProps> {}
  interface EmailDialogComponent extends React.FC<EmailDialogProps> {}
}
