import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { PrismaClient as PClient } from '@prisma/client';
import { MeetingRecorder } from './services/meeting-recorder.js';
import { ProcessDetector } from './services/process-detector.js';

const PrismaClient = PClient;

// Initialize Prisma client
const prisma = new PrismaClient();

// Initialize meeting recorder and process detector
export const meetingRecorder = new MeetingRecorder();
export const processDetector = new ProcessDetector();

// Interfaces for TypeScript
interface AudioCaptureOptions {
  deviceName?: string;
  sampleRate?: number;
  channels?: number;
  audioType?: 'raw' | 'wav';
  recordingDir?: string;
  autoDetectMode?: boolean;
}

interface RecorderOptions {
  sampleRate: number;
  channels: number;
  device: string;
  silence: string;
  threshold: number;
  recordProgram: string;
  verbose: boolean;
}

interface AudioData {
  buffer: Uint8Array;
  sampleRate: number;
  channels: number;
}

// Global variables to track recording subprocess and file
let soxProcess: ChildProcess | null = null;
let currentRecordingPath: string | null = null;

// Check if SOX is installed
function checkSoxInstalled(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    exec('sox --version', (error, stdout, stderr) => {
      if (error) {
        console.error('SOX not found:', error);
        reject(new Error('SOX (Sound eXchange) is not installed. Please install it with "brew install sox" and try again.'));
        return;
      }
      resolve(true);
    });
  });
}

/**
 * Start capturing audio from the specified device
 * @param options - Audio capture options
 * @returns Promise that resolves when recording starts
 */
export async function startAudioCapture(options: AudioCaptureOptions = {}): Promise<boolean> {
  // Determine and validate recording directory and device
  await checkSoxInstalled();
  if (soxProcess) throw new Error('Audio capture already in progress');
  
  const defaultOptions: AudioCaptureOptions = {
    deviceName: process.env.DEVICE_NAME || 'default',
    sampleRate: 16000,
    channels: 1,
    recordingDir: path.join(__dirname, '../recordings'),
    autoDetectMode: true
  };
  
  const recordingOptions = { ...defaultOptions, ...options };
  
  // Auto-detect recording mode if enabled
  if (recordingOptions.autoDetectMode) {
    await meetingRecorder.detectAndSetMode();
    const mode = meetingRecorder.getMode();
    
    if (mode === 'virtual' && !recordingOptions.deviceName) {
      // Try to find a loopback device
      const loopbackDevice = await meetingRecorder.autoDetectLoopbackDevice();
      if (loopbackDevice) {
        recordingOptions.deviceName = loopbackDevice;
        console.log(`Auto-detected loopback device: ${loopbackDevice}`);
      } else {
        console.log('No loopback device found, using default');
      }
    }
  }
  
  // Use the device from MeetingRecorder if not specified
  if (!recordingOptions.deviceName || recordingOptions.deviceName === 'default') {
    const audioSource = meetingRecorder.getAudioSource();
    if (audioSource && audioSource !== 'default') {
      recordingOptions.deviceName = audioSource;
    }
  }
  
  if (!fs.existsSync(recordingOptions.recordingDir!)) {
    fs.mkdirSync(recordingOptions.recordingDir!, { recursive: true });
  }
  
  const filename = `recording-${Date.now()}.wav`;
  const outPath = path.join(recordingOptions.recordingDir!, filename);
  currentRecordingPath = outPath;
  
  const recordingMode = meetingRecorder.getMode();
  console.log(`Starting SoX recording in ${recordingMode} mode: device=${recordingOptions.deviceName}, rate=${recordingOptions.sampleRate}, channels=${recordingOptions.channels}`);
  
  const args = [
    '-q',
    '-t', 'coreaudio', recordingOptions.deviceName!,
    '-b', '16',
    '-c', String(recordingOptions.channels!),
    '-r', String(recordingOptions.sampleRate!),
    outPath
  ];
  
  soxProcess = spawn('rec', args);
  soxProcess.on('error', err => console.error('SoX error:', err));
  
  // Notify MeetingRecorder that recording has started
  await meetingRecorder.startRecording(outPath);
  
  return true;
}

/**
 * Stop the audio capture process
 * @returns Promise that resolves with the complete audio buffer
 */
export async function stopAudioCapture(): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    if (!soxProcess || !currentRecordingPath) {
      return reject(new Error('No active recording to stop'));
    }
    console.log('Stopping SoX recording...');
    soxProcess.kill('SIGINT');
    soxProcess.once('close', async () => {
      const recordedPath = currentRecordingPath!;
      soxProcess = null;
      currentRecordingPath = null;
      
      // Notify MeetingRecorder that recording has stopped
      await meetingRecorder.stopRecording();
      
      console.log(`Recording finished, file at ${recordedPath}`);
      resolve(recordedPath);
    });
  });
}

/**
 * Save meeting record to the database
 * @param filePath Path to the recorded audio file
 * @param duration Duration of the recording in seconds
 */
async function saveMeetingRecord(filePath: string, duration: number): Promise<void> {
  try {
    // Create a new meeting record in the database
    const meeting = await prisma.meeting.create({
      data: {
        title: `Meeting ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
        duration: Math.round(duration),
        fileUrl: filePath
      }
    });
    
    console.log(`Meeting record saved to database with ID: ${meeting.id}`);
  } catch (error) {
    console.error('Error saving meeting record to database:', error);
  }
}
