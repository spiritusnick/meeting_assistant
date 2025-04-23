const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
require('dotenv').config();

// Enable live reload for development
if (process.argv.includes('--dev')) {
  try {
    require('electron-reload')(__dirname, {
      electron: path.join(__dirname, '../node_modules', '.bin', 'electron'),
      hardResetMethod: 'exit'
    });
  } catch (err) {
    console.error('Error setting up electron-reload:', err);
  }
}

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the index.html file (when in dev mode, load from renderer directory, otherwise from dist)
  const indexPath = process.argv.includes('--dev')
    ? path.join(__dirname, 'renderer', 'index.html')
    : path.join(__dirname, '../dist', 'index.html');
  
  mainWindow.loadURL(url.format({
    pathname: indexPath,
    protocol: 'file:',
    slashes: true
  }));
  
  // Add error handler for page loading
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error(`Failed to load: ${errorDescription} (${errorCode})`);
  });

  // Open DevTools in development mode
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // Handle window closed event
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create window when Electron has finished initialization
app.on('ready', createWindow);

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS applications keep their menu bar active until the user quits explicitly
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS re-create a window when the dock icon is clicked and no other windows are open
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC handlers for audio capture and transcription
ipcMain.handle('start-audio-capture', async (event, options) => {
  try {
    const { startAudioCapture } = require('./capture');
    const stream = await startAudioCapture(options);
    return { success: true, message: 'Audio capture started' };
  } catch (error) {
    console.error('Error starting audio capture:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-audio-capture', async (event) => {
  try {
    const { stopAudioCapture } = require('./capture');
    await stopAudioCapture();
    return { success: true, message: 'Audio capture stopped' };
  } catch (error) {
    console.error('Error stopping audio capture:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('start-transcription', async (event, audioData) => {
  try {
    console.log('Main process received transcription request with data:', audioData);
    const { transcribeAudio } = require('./transcribe');
    const result = await transcribeAudio(audioData);
    console.log('Transcription completed successfully, result length:', result ? result.length : 0);
    
    // Explicitly send the result via IPC event (in addition to the return value)
    event.sender.send('transcription-result', result);
    
    return { 
      success: true, 
      transcription: result,
      message: 'Transcription completed successfully' 
    };
  } catch (error) {
    console.error('Error during transcription:', error);
    
    // Send error via IPC
    event.sender.send('error', {
      type: 'transcription',
      message: error.message
    });
    
    return { 
      success: false, 
      error: error.message,
      message: 'Transcription failed, check console for details'
    };
  }
});

// IPC handlers for meeting summarization
ipcMain.handle('generate-summary', async (event, transcription) => {
  try {
    console.log('Main process received summary request for transcription');
    const { generateMeetingSummary } = require('./summarize');
    const summary = await generateMeetingSummary(transcription);
    
    return { 
      success: true, 
      summary: summary,
      message: 'Summary generated successfully' 
    };
  } catch (error) {
    console.error('Error generating summary:', error);
    return { 
      success: false, 
      error: error.message,
      message: 'Summary generation failed, check console for details'
    };
  }
});

// IPC handler for saving meeting data
ipcMain.handle('save-meeting', async (event, meetingData) => {
  try {
    console.log('Main process received request to save meeting data');
    const { saveMeetingData } = require('./summarize');
    const savedFilePath = await saveMeetingData(meetingData);
    
    return { 
      success: true, 
      filePath: savedFilePath,
      message: 'Meeting data saved successfully' 
    };
  } catch (error) {
    console.error('Error saving meeting data:', error);
    return { 
      success: false, 
      error: error.message,
      message: 'Failed to save meeting data'
    };
  }
});

// IPC handler for listing saved meetings
ipcMain.handle('list-meetings', async (event) => {
  try {
    const { listSavedMeetings } = require('./summarize');
    const meetings = await listSavedMeetings();
    
    return { 
      success: true, 
      meetings: meetings
    };
  } catch (error) {
    console.error('Error listing meetings:', error);
    return { 
      success: false, 
      error: error.message,
      meetings: []
    };
  }
});

// IPC handler for loading a meeting
ipcMain.handle('load-meeting', async (event, meetingId) => {
  try {
    const { loadMeeting } = require('./summarize');
    const meeting = await loadMeeting(meetingId);
    
    return { 
      success: true, 
      meeting: meeting
    };
  } catch (error) {
    console.error('Error loading meeting:', error);
    return { 
      success: false, 
      error: error.message
    };
  }
});

// IPC handlers for email functionality
ipcMain.handle('send-email', async (event, emailData) => {
  try {
    console.log('Main process received request to send email');
    const { sendMeetingSummary } = require('./email');
    const result = await sendMeetingSummary(emailData);
    
    return { 
      success: true, 
      messageId: result.messageId,
      message: 'Email sent successfully' 
    };
  } catch (error) {
    console.error('Error sending email:', error);
    return { 
      success: false, 
      error: error.message,
      message: 'Failed to send email'
    };
  }
});

// IPC handler for saving email settings
ipcMain.handle('save-email-settings', async (event, settings) => {
  try {
    const { saveEmailSettings } = require('./email');
    await saveEmailSettings(settings);
    
    return { 
      success: true, 
      message: 'Email settings saved successfully' 
    };
  } catch (error) {
    console.error('Error saving email settings:', error);
    return { 
      success: false, 
      error: error.message,
      message: 'Failed to save email settings'
    };
  }
});

// IPC handler for getting current email settings
ipcMain.handle('get-email-settings', async (event) => {
  try {
    const { getEmailSettings } = require('./email');
    const settings = getEmailSettings();
    
    return { 
      success: true, 
      settings: settings
    };
  } catch (error) {
    console.error('Error getting email settings:', error);
    return { 
      success: false, 
      error: error.message,
      settings: {}
    };
  }
});

// Create necessary directories if they don't exist
const rendererDir = path.join(__dirname, 'renderer');
if (!fs.existsSync(rendererDir)) {
  fs.mkdirSync(rendererDir, { recursive: true });
}
