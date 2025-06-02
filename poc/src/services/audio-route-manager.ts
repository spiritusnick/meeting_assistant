import { exec } from 'child_process';
import { promisify } from 'util';
import { EventEmitter } from 'events';

const execAsync = promisify(exec);

export interface AudioDevice {
  name: string;
  id: string;
  uid: string;
  isInput: boolean;
  isOutput: boolean;
}

export interface MultiOutputConfig {
  name: string;
  devices: string[];
}

export class AudioRouteManager extends EventEmitter {
  private originalOutputDevice: string | null = null;
  private originalInputDevice: string | null = null;
  private multiOutputDevice: string | null = null;
  private isRouteActive: boolean = false;
  private blackholeDeviceName: string = 'BlackHole 2ch';

  constructor() {
    super();
  }

  /**
   * Get all audio devices using macOS system_profiler
   */
  async getAllAudioDevices(): Promise<AudioDevice[]> {
    try {
      const { stdout } = await execAsync('system_profiler SPAudioDataType -json');
      const audioData = JSON.parse(stdout);
      const devices: AudioDevice[] = [];

      if (audioData.SPAudioDataType) {
        for (const category of audioData.SPAudioDataType) {
          if (category._items) {
            for (const item of category._items) {
              // Check for output devices
              if (item.coreaudio_default_audio_output_device === 'yes' || 
                  item._name.includes('Output') || 
                  item._name.includes('Speaker')) {
                devices.push({
                  name: item._name,
                  id: item._name,
                  uid: item.coreaudio_device_uid || item._name,
                  isInput: false,
                  isOutput: true
                });
              }
              
              // Check for input devices
              if (item.coreaudio_default_audio_input_device === 'yes' || 
                  item._name.includes('Input') || 
                  item._name.includes('Microphone')) {
                devices.push({
                  name: item._name,
                  id: item._name,
                  uid: item.coreaudio_device_uid || item._name,
                  isInput: true,
                  isOutput: false
                });
              }
            }
          }
        }
      }

      // Also get devices using a more reliable method
      await this.getDevicesUsingSwitchAudioSource(devices);

      return devices;
    } catch (error) {
      console.error('Error getting audio devices:', error);
      return [];
    }
  }

  /**
   * Get devices using SwitchAudioSource if available
   */
  private async getDevicesUsingSwitchAudioSource(existingDevices: AudioDevice[]): Promise<void> {
    try {
      // Check if SwitchAudioSource is installed
      await execAsync('which SwitchAudioSource');
      
      // Get output devices
      const { stdout: outputs } = await execAsync('SwitchAudioSource -a -t output');
      const outputLines = outputs.trim().split('\n');
      
      for (const line of outputLines) {
        const deviceName = line.trim();
        if (deviceName && !existingDevices.find(d => d.name === deviceName && d.isOutput)) {
          existingDevices.push({
            name: deviceName,
            id: deviceName,
            uid: deviceName,
            isInput: false,
            isOutput: true
          });
        }
      }

      // Get input devices
      const { stdout: inputs } = await execAsync('SwitchAudioSource -a -t input');
      const inputLines = inputs.trim().split('\n');
      
      for (const line of inputLines) {
        const deviceName = line.trim();
        if (deviceName && !existingDevices.find(d => d.name === deviceName && d.isInput)) {
          existingDevices.push({
            name: deviceName,
            id: deviceName,
            uid: deviceName,
            isInput: true,
            isOutput: false
          });
        }
      }
    } catch (error) {
      // SwitchAudioSource not installed, skip
    }
  }

  /**
   * Get current system audio output device
   */
  async getCurrentOutputDevice(): Promise<string | null> {
    try {
      // Try using SwitchAudioSource first
      const { stdout } = await execAsync('SwitchAudioSource -c');
      return stdout.trim();
    } catch (error) {
      // Fallback to system_profiler
      const devices = await this.getAllAudioDevices();
      const defaultOutput = devices.find(d => d.isOutput);
      return defaultOutput?.name || null;
    }
  }

  /**
   * Set system audio output device
   */
  async setOutputDevice(deviceName: string): Promise<void> {
    try {
      await execAsync(`SwitchAudioSource -s "${deviceName}"`);
      this.emit('outputDeviceChanged', deviceName);
    } catch (error) {
      console.error(`Failed to set output device to ${deviceName}:`, error);
      throw error;
    }
  }

  /**
   * Check if BlackHole is installed
   */
  async isBlackHoleInstalled(): Promise<boolean> {
    const devices = await this.getAllAudioDevices();
    return devices.some(d => d.name.toLowerCase().includes('blackhole'));
  }

  /**
   * Create a multi-output device that includes BlackHole and current output
   */
  async createMultiOutputDevice(): Promise<string> {
    try {
      // Get current output device
      const currentOutput = await this.getCurrentOutputDevice();
      if (!currentOutput) {
        throw new Error('No current output device found');
      }

      // Check if BlackHole is installed
      const blackholeInstalled = await this.isBlackHoleInstalled();
      if (!blackholeInstalled) {
        throw new Error('BlackHole is not installed. Please install BlackHole 2ch first.');
      }

      const multiOutputName = 'Meeting Assistant Multi-Output';
      
      // Create the multi-output device using AppleScript
      const script = `
        tell application "Audio MIDI Setup"
          activate
        end tell
        
        delay 0.5
        
        tell application "System Events"
          tell process "Audio MIDI Setup"
            -- Click the + button to create new device
            click button 1 of window 1
            delay 0.2
            
            -- Select "Create Multi-Output Device" from menu
            click menu item "Create Multi-Output Device" of menu 1 of button 1 of window 1
            delay 0.5
            
            -- The new device window should be open
            -- Check the checkboxes for our devices
            set devicesList to table 1 of scroll area 1 of window 1
            
            repeat with deviceRow in rows of devicesList
              set deviceName to value of text field 1 of deviceRow
              if deviceName contains "${currentOutput}" or deviceName contains "${this.blackholeDeviceName}" then
                set deviceCheckbox to checkbox 1 of deviceRow
                if value of deviceCheckbox is 0 then
                  click deviceCheckbox
                end if
              end if
            end repeat
            
            -- Rename the device
            set value of text field 1 of window 1 to "${multiOutputName}"
            
            -- Close the window
            click button 1 of window 1
          end tell
        end tell
      `;

      await execAsync(`osascript -e '${script}'`);
      
      this.multiOutputDevice = multiOutputName;
      this.emit('multiOutputCreated', multiOutputName);
      
      return multiOutputName;
    } catch (error) {
      console.error('Failed to create multi-output device:', error);
      
      // Fallback: Try to find existing multi-output device
      const devices = await this.getAllAudioDevices();
      const existingMulti = devices.find(d => 
        d.name.includes('Multi-Output') && 
        d.name.includes('Meeting')
      );
      
      if (existingMulti) {
        this.multiOutputDevice = existingMulti.name;
        return existingMulti.name;
      }
      
      throw error;
    }
  }

  /**
   * Start smart audio routing for recording
   */
  async startSmartRoute(): Promise<void> {
    if (this.isRouteActive) {
      console.log('Smart route already active');
      return;
    }

    try {
      // Save current audio configuration
      this.originalOutputDevice = await this.getCurrentOutputDevice();
      
      // Create or find multi-output device
      let multiOutput: string;
      try {
        multiOutput = await this.createMultiOutputDevice();
      } catch (error) {
        // If we can't create multi-output, just use BlackHole directly
        console.warn('Could not create multi-output device, using BlackHole directly');
        multiOutput = this.blackholeDeviceName;
      }
      
      // Switch to multi-output device
      await this.setOutputDevice(multiOutput);
      
      this.isRouteActive = true;
      this.emit('routeActivated', {
        originalDevice: this.originalOutputDevice,
        currentDevice: multiOutput
      });
      
      console.log(`Smart route activated: ${this.originalOutputDevice} → ${multiOutput}`);
    } catch (error) {
      console.error('Failed to start smart route:', error);
      throw error;
    }
  }

  /**
   * Stop smart audio routing and restore original configuration
   */
  async stopSmartRoute(): Promise<void> {
    if (!this.isRouteActive) {
      console.log('Smart route not active');
      return;
    }

    try {
      // Restore original output device
      if (this.originalOutputDevice) {
        await this.setOutputDevice(this.originalOutputDevice);
        console.log(`Restored original output device: ${this.originalOutputDevice}`);
      }
      
      this.isRouteActive = false;
      this.emit('routeDeactivated', {
        restoredDevice: this.originalOutputDevice
      });
      
      // Clean up
      this.originalOutputDevice = null;
      this.multiOutputDevice = null;
    } catch (error) {
      console.error('Failed to stop smart route:', error);
      throw error;
    }
  }

  /**
   * Get BlackHole device info
   */
  async getBlackHoleDevice(): Promise<AudioDevice | null> {
    const devices = await this.getAllAudioDevices();
    return devices.find(d => d.name.toLowerCase().includes('blackhole')) || null;
  }

  /**
   * Install SwitchAudioSource if not present
   */
  async ensureSwitchAudioSource(): Promise<void> {
    try {
      await execAsync('which SwitchAudioSource');
    } catch (error) {
      console.log('Installing SwitchAudioSource...');
      try {
        await execAsync('brew install switchaudio-osx');
      } catch (installError) {
        console.error('Failed to install SwitchAudioSource. Please install manually: brew install switchaudio-osx');
      }
    }
  }

  /**
   * Get route status
   */
  getStatus(): {
    isActive: boolean;
    originalDevice: string | null;
    currentDevice: string | null;
  } {
    return {
      isActive: this.isRouteActive,
      originalDevice: this.originalOutputDevice,
      currentDevice: this.multiOutputDevice
    };
  }
}