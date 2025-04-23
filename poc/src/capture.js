const recorder = require('node-record-lpcm16');
const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');

// Global variables to track recording state
let isRecording = false;
let recordingProcess = null;
let audioChunks = [];

// Check if SOX is installed
function checkSoxInstalled() {
  return new Promise((resolve, reject) => {
    const { exec } = require('child_process');
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
 * @param {Object} options - Audio capture options
 * @param {string} options.deviceName - Name of the audio device to capture from (e.g., "BlackHole 2ch")
 * @param {number} options.sampleRate - Sample rate in Hz (default: 16000)
 * @param {number} options.channels - Number of audio channels (default: 1)
 * @returns {Promise<boolean>} - Promise that resolves when recording starts
 */
function startAudioCapture(options = {}) {
  return new Promise(async (resolve, reject) => {
    try {
      // Check if SOX is installed before attempting to record
      await checkSoxInstalled();
      
      if (isRecording) {
        return reject(new Error('Audio capture already in progress'));
      }
    } catch (error) {
      return reject(error);
    }

    const defaultOptions = {
      deviceName: process.env.DEVICE_NAME || 'default',
      sampleRate: 16000,
      channels: 1,
      audioType: 'raw', // 'raw' | 'wav'
      recordingDir: path.join(__dirname, '../recordings')
    };

    const recordingOptions = { ...defaultOptions, ...options };
    
    // Create recordings directory if it doesn't exist
    if (!fs.existsSync(recordingOptions.recordingDir)) {
      fs.mkdirSync(recordingOptions.recordingDir, { recursive: true });
    }

    try {
      console.log(`Starting audio capture from device: ${recordingOptions.deviceName}`);
      
      // Configure recorder
      const recorderOptions = {
        sampleRate: recordingOptions.sampleRate,
        channels: recordingOptions.channels,
        device: recordingOptions.deviceName,
        silence: '0.0', // No silence detection
        threshold: 0, // No threshold
        recordProgram: 'rec', // Use SoX's rec command
        verbose: true // Log information for debugging
      };

      // Start recording
      recordingProcess = recorder.record(recorderOptions);
      isRecording = true;

      // Handle data events
      recordingProcess.stream()
        .on('data', (chunk) => {
          // Store audio chunk
          audioChunks.push(chunk);
          
      // Send audio data to renderer process
      const { BrowserWindow } = require('electron');
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('audio-data', {
          buffer: chunk,
          sampleRate: recordingOptions.sampleRate,
          channels: recordingOptions.channels
        });
      }
        })
        .on('error', (err) => {
          console.error('Recording error:', err);
          const { BrowserWindow } = require('electron');
          const mainWindow = BrowserWindow.getAllWindows()[0];
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('error', {
              type: 'recording',
              message: err.message
            });
          }
        });

      resolve(true);
    } catch (error) {
      console.error('Failed to start audio capture:', error);
      reject(error);
    }
  });
}

/**
 * Stop the audio capture process
 * @returns {Promise<Buffer>} - Promise that resolves with the complete audio buffer
 */
function stopAudioCapture() {
  return new Promise((resolve, reject) => {
    if (!isRecording || !recordingProcess) {
      return reject(new Error('No active recording to stop'));
    }

    try {
      // Stop the recording process
      recordingProcess.stop();
      
      // Combine all audio chunks into a single buffer
      const completeAudioBuffer = Buffer.concat(audioChunks);
      
      // Reset state
      isRecording = false;
      recordingProcess = null;
      audioChunks = [];

      // Save the recording to a file with WAV header for better compatibility
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const rawFilePath = path.join(__dirname, '../recordings', `recording-${timestamp}.raw`);
      const wavFilePath = path.join(__dirname, '../recordings', `recording-${timestamp}.wav`);
      
      // First save the raw data
      fs.writeFileSync(rawFilePath, completeAudioBuffer);
      console.log(`Raw recording saved to ${rawFilePath}`);
      
      // Then create a WAV version with proper headers
      try {
        // Convert raw PCM to WAV by adding proper WAV headers
        const sampleRate = 16000; // 16kHz
        const channels = 1;     // Mono
        const bitsPerSample = 16; // 16-bit

        // Create WAV header
        const wavHeader = Buffer.alloc(44);
        
        // "RIFF" chunk descriptor
        wavHeader.write('RIFF', 0);
        wavHeader.writeUInt32LE(36 + completeAudioBuffer.length, 4); // Chunk size
        wavHeader.write('WAVE', 8);
        
        // "fmt " sub-chunk
        wavHeader.write('fmt ', 12);
        wavHeader.writeUInt32LE(16, 16); // Subchunk1 size (16 for PCM)
        wavHeader.writeUInt16LE(1, 20);  // Audio format (1 for PCM)
        wavHeader.writeUInt16LE(channels, 22); // Number of channels
        wavHeader.writeUInt32LE(sampleRate, 24); // Sample rate
        wavHeader.writeUInt32LE(sampleRate * channels * bitsPerSample / 8, 28); // Byte rate
        wavHeader.writeUInt16LE(channels * bitsPerSample / 8, 32); // Block align
        wavHeader.writeUInt16LE(bitsPerSample, 34); // Bits per sample
        
        // "data" sub-chunk
        wavHeader.write('data', 36);
        wavHeader.writeUInt32LE(completeAudioBuffer.length, 40); // Subchunk2 size
        
        // Combine header and PCM data to create WAV file
        const wavData = Buffer.concat([wavHeader, completeAudioBuffer]);
        fs.writeFileSync(wavFilePath, wavData);
        
        console.log(`WAV recording saved to ${wavFilePath}`);
      } catch (err) {
        console.error('Error creating WAV file:', err);
      }

      resolve(completeAudioBuffer);
    } catch (error) {
      console.error('Error stopping audio capture:', error);
      reject(error);
    }
  });
}

// Export the functions
module.exports = {
  startAudioCapture,
  stopAudioCapture
};
