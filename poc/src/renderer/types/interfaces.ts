// Define shared interfaces for use across components

export interface AudioDevice {
  id: string;
  label: string;
}

export interface AudioData {
  buffer: Uint8Array;
  sampleRate: number;
  channels: number;
}

export interface SummaryData {
  title: string;
  'Overall Summary'?: string;
  'Key Points'?: string[];
  'Action Items'?: string[];
  'Decisions Made'?: string[];
  [key: string]: any;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  transcription: string;
  summary: SummaryData;
}

export interface EmailData {
  to: string[];
  cc?: string[];
  subject: string;
  textContent: string;
  htmlContent: string;
  customMessage?: string;
}

export interface ErrorResponse {
  message: string;
  type?: string;
}
