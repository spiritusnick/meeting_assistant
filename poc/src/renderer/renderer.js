// Import WaveSurfer from the node_modules directory
const WaveSurfer = window.WaveSurfer;

// DOM Elements
const startButton = document.getElementById('start-btn');
const stopButton = document.getElementById('stop-btn');
const transcribeButton = document.getElementById('transcribe-btn');
const deviceSelect = document.getElementById('device-select');
const statusElement = document.getElementById('status');
const transcriptionElement = document.getElementById('transcription');
const errorElement = document.getElementById('error-message');

// Global variables
let isRecording = false;
let audioChunks = [];
let wavesurfer;
let audioContext;
let audioBuffer;

// Initialize WaveSurfer
function initWaveSurfer() {
  wavesurfer = WaveSurfer.create({
    container: '#waveform',
    waveColor: '#4F4A85',
    progressColor: '#383351',
    height: 120,
    cursorWidth: 1,
    cursorColor: '#333',
    barWidth: 2,
    barGap: 1,
    responsive: true,
    normalize: true
  });
}

// Initialize the application
async function init() {
  try {
    initWaveSurfer();
    setupEventListeners();
    await populateDeviceList();
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  } catch (error) {
    showError(`Initialization error: ${error.message}`);
  }
}

// Set up event listeners for buttons
function setupEventListeners() {
  startButton.addEventListener('click', startRecording);
  stopButton.addEventListener('click', stopRecording);
  transcribeButton.addEventListener('click', transcribeAudio);
  
  // Set up API event listeners
  window.api.onAudioData((data) => {
    processAudioData(data);
  });
  
  window.api.onTranscriptionResult((result) => {
    displayTranscription(result);
  });
  
  window.api.onError((error) => {
    showError(`Error: ${error.message}`);
  });
}

// Populate the device select dropdown with available audio devices
async function populateDeviceList() {
  try {
    // Request permission to access audio devices
    await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Get list of audio devices
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputDevices = devices.filter(device => device.kind === 'audioinput');
    
    // Clear existing options except the default
    while (deviceSelect.options.length > 1) {
      deviceSelect.remove(1);
    }
    
    // Add devices to select
    audioInputDevices.forEach(device => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.text = device.label || `Microphone ${deviceSelect.options.length}`;
      deviceSelect.appendChild(option);
    });
    
    // Add BlackHole option if not already in the list
    const hasBlackHole = Array.from(deviceSelect.options).some(
      option => option.text.includes('BlackHole')
    );
    
    if (!hasBlackHole) {
      const option = document.createElement('option');
      option.value = 'blackhole';
      option.text = 'BlackHole 2ch (Virtual)';
      deviceSelect.appendChild(option);
    }
  } catch (error) {
    showError(`Could not access audio devices: ${error.message}`);
  }
}

// Start recording audio
async function startRecording() {
  try {
    audioChunks = [];
    updateStatus('Starting recording...');
    
    const deviceName = deviceSelect.options[deviceSelect.selectedIndex].text;
    
    const result = await window.api.startAudioCapture({
      deviceName: deviceName,
      sampleRate: 16000,
      channels: 1
    });
    
    if (result.success) {
      isRecording = true;
      startButton.disabled = true;
      stopButton.disabled = false;
      transcribeButton.disabled = true;
      updateStatus('Recording in progress...');
    } else {
      showError(`Failed to start recording: ${result.error}`);
    }
  } catch (error) {
    showError(`Recording error: ${error.message}`);
  }
}

// Stop recording audio
async function stopRecording() {
  try {
    updateStatus('Stopping recording...');
    
    const result = await window.api.stopAudioCapture();
    
    if (result.success) {
      isRecording = false;
      startButton.disabled = false;
      stopButton.disabled = true;
      transcribeButton.disabled = false;
      updateStatus('Recording stopped. Ready to transcribe.');
      
      // Create audio buffer from chunks for visualization
      if (audioChunks.length > 0) {
        createAudioBufferFromChunks();
      }
    } else {
      showError(`Failed to stop recording: ${result.error}`);
    }
  } catch (error) {
    showError(`Error stopping recording: ${error.message}`);
  }
}

// Process incoming audio data
function processAudioData(data) {
  if (!isRecording) return;
  
  // Store audio chunk
  audioChunks.push(new Uint8Array(data.buffer));
  
  // Update waveform visualization (simplified for POC)
  // In a real implementation, you would need to properly convert the buffer
  // and update the waveform in real-time
}

// Create audio buffer from collected chunks for visualization
function createAudioBufferFromChunks() {
  try {
    // Combine all chunks into a single buffer
    const combinedLength = audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const combinedBuffer = new Uint8Array(combinedLength);
    
    let offset = 0;
    audioChunks.forEach(chunk => {
      combinedBuffer.set(chunk, offset);
      offset += chunk.length;
    });
    
    // Convert to Float32Array for WaveSurfer
    const float32Array = new Float32Array(combinedBuffer.length);
    for (let i = 0; i < combinedBuffer.length; i++) {
      // Convert 8-bit unsigned to float in range [-1, 1]
      float32Array[i] = (combinedBuffer[i] / 128.0) - 1.0;
    }
    
    // Load the buffer into WaveSurfer
    wavesurfer.loadDecodedBuffer({
      length: float32Array.length,
      duration: float32Array.length / 16000, // Assuming 16kHz sample rate
      sampleRate: 16000,
      numberOfChannels: 1,
      getChannelData: channel => {
        if (channel === 0) return float32Array;
        return new Float32Array(float32Array.length);
      }
    });
  } catch (error) {
    showError(`Error processing audio data: ${error.message}`);
  }
}

// Transcribe the recorded audio
async function transcribeAudio() {
  try {
    if (audioChunks.length === 0) {
      showError('No audio recorded to transcribe');
      return;
    }
    
    updateStatus('Transcribing audio...');
    transcribeButton.disabled = true;
    
    // Combine all chunks into a single buffer
    const combinedLength = audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const combinedBuffer = new Uint8Array(combinedLength);
    
    let offset = 0;
    audioChunks.forEach(chunk => {
      combinedBuffer.set(chunk, offset);
      offset += chunk.length;
    });
    
    const result = await window.api.startTranscription({
      buffer: combinedBuffer.buffer,
      sampleRate: 16000
    });
    
    if (result.success) {
      displayTranscription(result.transcription);
      updateStatus('Transcription complete');
    } else {
      showError(`Transcription failed: ${result.error}`);
    }
    
    transcribeButton.disabled = false;
  } catch (error) {
    showError(`Transcription error: ${error.message}`);
    transcribeButton.disabled = false;
  }
}

// Display transcription text
function displayTranscription(text) {
  transcriptionElement.textContent = text;
}

// Update status message
function updateStatus(message) {
  statusElement.textContent = message;
}

// Show error message
function showError(message) {
  errorElement.textContent = message;
  errorElement.style.display = 'block';
  setTimeout(() => {
    errorElement.style.display = 'none';
  }, 5000);
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);
