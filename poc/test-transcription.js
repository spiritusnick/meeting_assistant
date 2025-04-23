const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Print out environment details
console.log('Environment:');
console.log(`- Current working directory: ${process.cwd()}`);
console.log(`- API Key exists: ${!!process.env.OPENAI_API_KEY}`);
console.log(`- API Key starts with: ${process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 5) + '...' : 'not set'}`);

// Get recordings directory
const recordingsDir = path.join(__dirname, 'recordings');
console.log(`\nLooking for recordings in: ${recordingsDir}`);

// Find the most recent WAV file
const wavFiles = fs.readdirSync(recordingsDir)
  .filter(file => file.endsWith('.wav'))
  .map(file => ({
    name: file,
    path: path.join(recordingsDir, file),
    time: fs.statSync(path.join(recordingsDir, file)).mtime.getTime()
  }))
  .sort((a, b) => b.time - a.time);

if (wavFiles.length === 0) {
  console.error('No WAV files found in recordings directory.');
  process.exit(1);
}

// Get the most recent WAV file
const latestWav = wavFiles[0];
console.log(`\nFound ${wavFiles.length} WAV file(s). Using most recent: ${latestWav.name}`);

// Check the file size
const fileStats = fs.statSync(latestWav.path);
console.log(`File size: ${fileStats.size} bytes`);

if (fileStats.size === 0) {
  console.error('Error: File is empty (0 bytes)');
  process.exit(1);
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Function to test transcription
async function testTranscription() {
  try {
    console.log('\nSending file to OpenAI Whisper API...');
    
    // Call OpenAI Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(latestWav.path),
      model: "whisper-1",
      language: "en",
      response_format: "text"
    });
    
    console.log('\nTranscription successful!');
    console.log('--------------------------');
    console.log(transcription);
    console.log('--------------------------');
    console.log(`Length: ${transcription.length} characters`);
    
  } catch (error) {
    console.error('\nTranscription failed with error:');
    console.error(error);
    
    // Log additional error details if available
    if (error.response) {
      console.error('API Response:', error.response.data);
      console.error('Status:', error.response.status);
    }
  }
}

// Run the test
console.log('\nTesting transcription...');
testTranscription();
