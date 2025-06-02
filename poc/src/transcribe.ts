import { OpenAI } from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { ipcMain, BrowserWindow } from 'electron';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface AudioData {
  buffer?: Buffer | Uint8Array;
  useLatestRecording?: boolean;
  sampleRate?: number;
}

interface RecordingFile {
  name: string;
  path: string;
  isWav: boolean;
  time: number;
}

/**
 * Transcribe audio data using OpenAI's Whisper API
 * @param audioData - Audio data object
 * @returns Promise that resolves with the transcription text
 */
export async function transcribeAudio(audioData: AudioData): Promise<string> {
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
      const files: RecordingFile[] = fs.readdirSync(recordingsDir)
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

      let fileToTranscribe: string;
      // If it's already a WAV, we can send it directly
      if (latestFile.isWav) {
        fileToTranscribe = latestFile.path;
        console.log(`Using existing WAV file, skipping conversion: ${fileToTranscribe}`);
      } else {
        // Otherwise convert raw PCM to WAV
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        const tempFilePath = path.join(tempDir, `temp-${Date.now()}.wav`);
        const rawData = fs.readFileSync(latestFile.path);
        if (rawData.length === 0) throw new Error('The recording file is empty (0 bytes). Please try recording again.');
        // Build WAV header (16kHz, mono, 16-bit)
        const sampleRate = 16000, channels = 1, bitsPerSample = 16;
        const header = Buffer.alloc(44);
        header.write('RIFF', 0);
        header.writeUInt32LE(36 + rawData.length, 4);
        header.write('WAVE', 8);
        header.write('fmt ', 12);
        header.writeUInt32LE(16, 16);
        header.writeUInt16LE(1, 20);
        header.writeUInt16LE(channels, 22);
        header.writeUInt32LE(sampleRate, 24);
        header.writeUInt32LE(sampleRate * channels * bitsPerSample / 8, 28);
        header.writeUInt16LE(channels * bitsPerSample / 8, 32);
        header.writeUInt16LE(bitsPerSample, 34);
        header.write('data', 36);
        header.writeUInt32LE(rawData.length, 40);
        fs.writeFileSync(tempFilePath, Buffer.concat([header, rawData]));
        console.log(`Converted raw PCM to WAV: ${tempFilePath}`);
        fileToTranscribe = tempFilePath;
      }
      // Log file size for debugging
      const stat = fs.statSync(fileToTranscribe);
      console.log(`Transcribing file ${fileToTranscribe}, size ${stat.size} bytes`);
      if (stat.size === 0) throw new Error('File is empty, cannot transcribe');
      // Invoke Whisper API
      console.log('Sending request to OpenAI Whisper API...');
      let response;
      try {
        response = await openai.audio.transcriptions.create({
          file: fs.createReadStream(fileToTranscribe),
          model: 'whisper-1',
          language: 'en',
          response_format: 'text'
        });
      } catch (apiError: any) {
        console.error('OpenAI API Error:', apiError);
        let msg = 'Failed to transcribe audio: ';
        if (apiError.response) msg += `API ${apiError.response.status} ${apiError.response.statusText}`;
        else if (apiError.message) msg += apiError.message;
        else msg += 'Unknown error';
        throw new Error(msg);
      }
      const transcription = response.toString();
      console.log(`Transcription length: ${transcription.length}`);
      return transcription;
    }
    
    // If buffer is provided (original behavior)
    if (!audioData.buffer) {
      throw new Error('No audio data provided for transcription');
    }
    
    // Ensure buffer is a Buffer object
    const buffer = Buffer.isBuffer(audioData.buffer) 
      ? audioData.buffer 
      : Buffer.from(audioData.buffer);
    
    // Save audio buffer to a temporary file
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempFilePath = path.join(tempDir, `temp-${Date.now()}.wav`);
    
    // For simplicity in this POC, we'll assume the buffer is already in a format Whisper can handle
    // In a real implementation, you would need to convert the raw PCM to a WAV file
    fs.writeFileSync(tempFilePath, buffer);

    console.log(`Transcribing audio file: ${tempFilePath}`);

    // Call OpenAI Whisper API
    const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-1",
      language: "en", // Specify language if known
      response_format: "text"
    });

    const transcription = response.toString();

    // Clean up temporary file
    fs.unlinkSync(tempFilePath);

    // Send transcription result to renderer process
    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('transcription-result', transcription);
    }

    return transcription;
  } catch (error: any) {
    console.error('Transcription error:', error);
    
    // Send error to renderer process
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
 * @param filePath - Path to the audio file
 * @returns Promise that resolves with the transcription text
 */
export async function transcribeFile(filePath: string): Promise<string> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is not set. Please set OPENAI_API_KEY in your .env file.');
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    console.log(`Transcribing file: ${filePath}`);

    // Call OpenAI Whisper API
    const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-1",
      language: "en", // Specify language if known
      response_format: "text"
    });

    return response.toString();
  } catch (error: any) {
    console.error('File transcription error:', error);
    throw error;
  }
}

// For backward compatibility
module.exports = {
  transcribeAudio,
  transcribeFile
};
