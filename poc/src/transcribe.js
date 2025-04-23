const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
const { ipcMain } = require('electron');
require('dotenv').config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Transcribe audio data using OpenAI's Whisper API
 * @param {Object} audioData - Audio data object
 * @param {Buffer} audioData.buffer - Raw audio buffer
 * @param {boolean} audioData.useLatestRecording - Whether to use the latest recording file
 * @param {number} audioData.sampleRate - Sample rate of the audio
 * @returns {Promise<string>} - Promise that resolves with the transcription text
 */
async function transcribeAudio(audioData) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not set. Please set OPENAI_API_KEY in your .env file.');
    }

    // If useLatestRecording is true, find and use the latest recording file
    if (audioData.useLatestRecording) {
      const recordingsDir = path.join(__dirname, '../recordings');
      if (!fs.existsSync(recordingsDir)) {
        throw new Error('Recordings directory not found');
      }

      // Get all recording files - prefer .wav files over .raw files
      const files = fs.readdirSync(recordingsDir)
        .filter(file => file.endsWith('.wav') || file.endsWith('.raw'))
        .map(file => ({
          name: file,
          path: path.join(recordingsDir, file),
          isWav: file.endsWith('.wav'),
          time: fs.statSync(path.join(recordingsDir, file)).mtime.getTime()
        }))
        // Sort by time (newest first) and then prefer .wav over .raw
        .sort((a, b) => {
          if (a.time === b.time) return a.isWav ? -1 : 1;
          return b.time - a.time;
        });

      if (files.length === 0) {
        throw new Error('No recording files found');
      }

      // Get the latest file
      const latestFile = files[0];
      console.log(`Using latest recording file: ${latestFile.name}`);

      // Convert raw PCM file to WAV
      const tempDir = path.join(__dirname, '../temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempFilePath = path.join(tempDir, `temp-${Date.now()}.wav`);
      
      // Read the raw PCM data
      const rawData = fs.readFileSync(latestFile.path);
      console.log(`Raw file size: ${rawData.length} bytes`);
      
      // Check if the file has data
      if (rawData.length === 0) {
        throw new Error('The recording file is empty (0 bytes). Please try recording again.');
      }
      
      // Convert raw PCM to WAV by adding proper WAV headers
      const sampleRate = 16000; // 16kHz
      const channels = 1;     // Mono
      const bitsPerSample = 16; // 16-bit

      // Create WAV header
      const wavHeader = Buffer.alloc(44);
      
      // "RIFF" chunk descriptor
      wavHeader.write('RIFF', 0);
      wavHeader.writeUInt32LE(36 + rawData.length, 4); // Chunk size
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
      wavHeader.writeUInt32LE(rawData.length, 40); // Subchunk2 size
      
      // Combine header and PCM data to create WAV file
      const wavData = Buffer.concat([wavHeader, rawData]);
      fs.writeFileSync(tempFilePath, wavData);
      
      console.log(`Converted raw PCM to WAV format: ${tempFilePath}`);

      console.log(`Transcribing audio file: ${tempFilePath}`);

      console.log("Preparing to call OpenAI Whisper API...");
      
      // Verify file exists and has content
      const fileStats = fs.statSync(tempFilePath);
      console.log(`File size: ${fileStats.size} bytes`);
      
      if (fileStats.size === 0) {
        throw new Error("File is empty, cannot transcribe");
      }
      
      // Check if API key is valid (first few characters only for security)
      const apiKeyFirstChars = process.env.OPENAI_API_KEY.substring(0, 10);
      console.log(`Using API key starting with: ${apiKeyFirstChars}...`);
      
      let transcription;
      try {
        // Call OpenAI Whisper API with more detailed error handling
        console.log("Sending request to OpenAI Whisper API...");
        transcription = await openai.audio.transcriptions.create({
          file: fs.createReadStream(tempFilePath),
          model: "whisper-1",
          language: "en", // Specify language if known
          response_format: "text"
        });
        
        console.log("Successfully received transcription response");
        console.log(`Transcription result length: ${transcription ? transcription.length : 0} characters`);
        
        if (!transcription || transcription.length === 0) {
          console.log("Warning: Empty transcription returned");
        }
      } catch (apiError) {
        console.error("OpenAI API Error Details:");
        console.error(apiError);
        
        // Enhanced error message with more details
        let errorMessage = "Failed to transcribe audio: ";
        
        if (apiError.response) {
          console.error("API Response Error:", apiError.response);
          errorMessage += `API Error: ${apiError.response.status} - ${apiError.response.statusText}`;
        } else if (apiError.message) {
          errorMessage += apiError.message;
        } else {
          errorMessage += "Unknown API error";
        }
        
        throw new Error(errorMessage);
      } finally {
        // Clean up temporary file
        try {
          fs.unlinkSync(tempFilePath);
          console.log("Temporary file cleaned up");
        } catch (cleanupError) {
          console.error("Error cleaning up temporary file:", cleanupError);
        }
      }
      
      // Send transcription result to renderer process
      const { BrowserWindow } = require('electron');
      const mainWindow = BrowserWindow.getAllWindows()[0];
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('transcription-result', transcription);
      }
      
      // Return the transcription
      return transcription;
    }
    
    // If buffer is provided (original behavior)
    if (!audioData.buffer) {
      throw new Error('No audio data provided for transcription');
    }
    
    // Save audio buffer to a temporary file
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFilePath = path.join(tempDir, `temp-${Date.now()}.wav`);
    
    // For simplicity in this POC, we'll assume the buffer is already in a format Whisper can handle
    // In a real implementation, you would need to convert the raw PCM to a WAV file
    fs.writeFileSync(tempFilePath, audioData.buffer);

    console.log(`Transcribing audio file: ${tempFilePath}`);

    // Call OpenAI Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-1",
      language: "en", // Specify language if known
      response_format: "text"
    });

    // Clean up temporary file
    fs.unlinkSync(tempFilePath);

    // Send transcription result to renderer process
    const { BrowserWindow } = require('electron');
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('transcription-result', transcription);
    }

    return transcription;
  } catch (error) {
    console.error('Transcription error:', error);
    
    // Send error to renderer process
    const { BrowserWindow } = require('electron');
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('error', {
        type: 'transcription',
        message: error.message
      });
    }
    
    throw error;
  }
}

/**
 * Transcribe an audio file using OpenAI's Whisper API
 * @param {string} filePath - Path to the audio file
 * @returns {Promise<string>} - Promise that resolves with the transcription text
 */
async function transcribeFile(filePath) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not set. Please set OPENAI_API_KEY in your .env file.');
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    console.log(`Transcribing file: ${filePath}`);

    // Call OpenAI Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-1",
      language: "en", // Specify language if known
      response_format: "text"
    });

    return transcription;
  } catch (error) {
    console.error('File transcription error:', error);
    throw error;
  }
}

// Export the functions
module.exports = {
  transcribeAudio,
  transcribeFile
};
