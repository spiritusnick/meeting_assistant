import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';
import { AudioRouteManager } from './audio-route-manager.js';

const execAsync = promisify(exec);

export type RecordingMode = 'virtual' | 'physical';

export interface AudioDevice {
  id: string;
  name: string;
  type: 'input' | 'output';
}

export class MeetingRecorder extends EventEmitter {
  private mode: RecordingMode = 'virtual';
  private audioSource: string = '';
  private isRecording: boolean = false;
  private recordingProcess: any = null;
  private audioRouteManager: AudioRouteManager;

  constructor() {
    super();
    this.audioRouteManager = new AudioRouteManager();
    this.setupAudioRouteListeners();
    this.detectAndSetMode();
  }

  private setupAudioRouteListeners(): void {
    this.audioRouteManager.on('routeActivated', (data) => {
      console.log('Audio route activated:', data);
      this.emit('audioRouteChanged', { active: true, ...data });
    });

    this.audioRouteManager.on('routeDeactivated', (data) => {
      console.log('Audio route deactivated:', data);
      this.emit('audioRouteChanged', { active: false, ...data });
    });
  }

  async detectAndSetMode(): Promise<void> {
    const meetingApps = await this.detectMeetingApps();
    if (meetingApps.length > 0) {
      this.switchToVirtual();
      this.emit('modeChanged', 'virtual', meetingApps);
    } else {
      this.switchToPhysical();
      this.emit('modeChanged', 'physical', []);
    }
  }

  private async detectMeetingApps(): Promise<string[]> {
    const appsToCheck = [
      { process: 'Microsoft Teams', name: 'Teams' },
      { process: 'zoom.us', name: 'Zoom' },
      { process: 'GoToMeeting', name: 'GoToMeeting' },
      { process: 'Slack', name: 'Slack' },
      { process: 'Google Chrome', name: 'Google Meet' }
    ];

    const runningApps: string[] = [];

    try {
      const { stdout } = await execAsync('ps aux');
      
      for (const app of appsToCheck) {
        if (stdout.includes(app.process)) {
          runningApps.push(app.name);
        }
      }
    } catch (error) {
      console.error('Error detecting meeting apps:', error);
    }

    return runningApps;
  }

  switchToVirtual(): void {
    this.mode = 'virtual';
    // Use loopback input (hardware cable from headphone out to mic in)
    // Or use BlackHole if configured
    this.audioSource = 'BlackHole 2ch'; // Default to BlackHole, can be overridden
    this.emit('modeChanged', 'virtual');
  }

  switchToPhysical(): void {
    this.mode = 'physical';
    // Use regular microphone for in-person meetings
    this.audioSource = 'default'; // System default mic
    this.emit('modeChanged', 'physical');
  }

  getMode(): RecordingMode {
    return this.mode;
  }

  setAudioSource(deviceId: string): void {
    this.audioSource = deviceId;
  }

  getAudioSource(): string {
    return this.audioSource;
  }

  async getAvailableDevices(): Promise<AudioDevice[]> {
    const devices: AudioDevice[] = [];
    
    try {
      // Get audio input devices using system_profiler
      const { stdout } = await execAsync('system_profiler SPAudioDataType -json');
      const audioData = JSON.parse(stdout);
      
      // Parse the audio devices
      if (audioData.SPAudioDataType) {
        for (const device of audioData.SPAudioDataType) {
          if (device._items) {
            for (const item of device._items) {
              if (item.coreaudio_input_source) {
                devices.push({
                  id: item._name,
                  name: item._name,
                  type: 'input'
                });
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error getting audio devices:', error);
      
      // Fallback to known devices
      devices.push(
        { id: 'default', name: 'Default Microphone', type: 'input' },
        { id: 'BlackHole 2ch', name: 'BlackHole 2ch', type: 'input' }
      );
    }

    return devices;
  }

  async startRecording(outputPath: string): Promise<void> {
    if (this.isRecording) {
      throw new Error('Already recording');
    }

    // If in virtual mode, activate smart audio routing
    if (this.mode === 'virtual') {
      try {
        await this.audioRouteManager.startSmartRoute();
        // Use BlackHole as the recording source
        const blackholeDevice = await this.audioRouteManager.getBlackHoleDevice();
        if (blackholeDevice) {
          this.audioSource = blackholeDevice.name;
        }
      } catch (error) {
        console.error('Failed to activate smart audio route:', error);
        // Fall back to default behavior
      }
    }

    this.isRecording = true;
    this.emit('recordingStarted', { mode: this.mode, device: this.audioSource });

    // The actual recording will be handled by the existing capture.ts
    // This class just manages the mode and device selection
  }

  async stopRecording(): Promise<void> {
    if (!this.isRecording) {
      throw new Error('Not recording');
    }

    // If in virtual mode, deactivate smart audio routing
    if (this.mode === 'virtual') {
      try {
        await this.audioRouteManager.stopSmartRoute();
      } catch (error) {
        console.error('Failed to deactivate smart audio route:', error);
      }
    }

    this.isRecording = false;
    this.emit('recordingStopped');
  }

  isCurrentlyRecording(): boolean {
    return this.isRecording;
  }

  async autoDetectLoopbackDevice(): Promise<string | null> {
    const devices = await this.getAvailableDevices();
    
    // Look for common loopback device names
    const loopbackPatterns = [
      'BlackHole',
      'Loopback',
      'Stereo Mix',
      'What U Hear',
      'Soundflower'
    ];

    for (const device of devices) {
      for (const pattern of loopbackPatterns) {
        if (device.name.toLowerCase().includes(pattern.toLowerCase())) {
          return device.id;
        }
      }
    }

    return null;
  }

  async getRecordingStats(): Promise<{
    mode: RecordingMode;
    device: string;
    runningApps: string[];
    isRecording: boolean;
    audioRouteStatus: any;
  }> {
    const runningApps = await this.detectMeetingApps();
    const audioRouteStatus = this.audioRouteManager.getStatus();
    
    return {
      mode: this.mode,
      device: this.audioSource,
      runningApps,
      isRecording: this.isRecording,
      audioRouteStatus
    };
  }

  async checkBlackHoleInstalled(): Promise<boolean> {
    return await this.audioRouteManager.isBlackHoleInstalled();
  }

  getAudioRouteManager(): AudioRouteManager {
    return this.audioRouteManager;
  }
}