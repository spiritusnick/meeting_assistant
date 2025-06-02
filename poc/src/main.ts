import { app, BrowserWindow, ipcMain, IpcMainInvokeEvent, Tray, Menu, nativeImage, globalShortcut } from 'electron';
import * as path from 'path';
import * as url from 'url';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { startAudioCapture, stopAudioCapture, meetingRecorder, processDetector } from './capture.js';
import { generateMeetingSummary, saveMeetingData, listSavedMeetings, loadMeetingById } from './summarize.js';
import { transcribeAudio, transcribeFile } from './transcribe.js';
import { sendMeetingSummary, saveEmailSettings, getEmailSettings } from './email.js';
import { initDatabase } from './db.js';

// Load environment variables
dotenv.config();

// Type definition for the safe wrapper function
type SafeHandler = (event: IpcMainInvokeEvent, ...args: any[]) => Promise<any> | any;

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
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isRecording = false;

function createWindow(): void {
  // Set up app icon
  const iconPath = path.join(__dirname, '../assets/icons/icon-512.png');
  let icon;
  
  // Only set icon if it exists
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath);
  }

  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    icon: icon,
    title: 'Meeting Assistant',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js') // This file is built from preload.ts
    }
  });

  // Load the renderer entrypoint (bundled by Webpack into dist/)
  const indexPath = path.join(__dirname, 'index.html');
  
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

// Create system tray
function createTray(): void {
  // Create tray icon
  const iconPath = path.join(__dirname, '../assets/tray-icon.png');
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);
  
  updateTrayMenu();
  
  // Set up tray click behavior
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
      }
    } else {
      createWindow();
    }
  });
  
  // Listen for recording state changes
  meetingRecorder.on('recordingStarted', () => {
    isRecording = true;
    updateTrayIcon(true);
    updateTrayMenu();
  });
  
  meetingRecorder.on('recordingStopped', () => {
    isRecording = false;
    updateTrayIcon(false);
    updateTrayMenu();
  });
  
  // Listen for mode changes
  meetingRecorder.on('modeChanged', (mode: string, apps?: string[]) => {
    updateTrayMenu();
    if (mainWindow) {
      mainWindow.webContents.send('mode-changed', { mode, apps });
    }
  });
  
  // Listen for audio route changes
  meetingRecorder.on('audioRouteChanged', (data: any) => {
    if (mainWindow) {
      mainWindow.webContents.send('audio-route-changed', data);
    }
  });
}

function updateTrayIcon(recording: boolean): void {
  if (!tray) return;
  
  const iconName = recording ? 'tray-icon-recording.png' : 'tray-icon.png';
  const iconPath = path.join(__dirname, '../assets', iconName);
  const icon = nativeImage.createFromPath(iconPath);
  tray.setImage(icon);
}

function updateTrayMenu(): void {
  if (!tray) return;
  
  const mode = meetingRecorder.getMode();
  const stats = meetingRecorder.getRecordingStats();
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: isRecording ? '🔴 Recording...' : 'Not Recording',
      enabled: false
    },
    { type: 'separator' },
    {
      label: isRecording ? 'Stop Recording' : 'Start Recording',
      accelerator: 'CmdOrCtrl+Shift+R',
      click: async () => {
        if (isRecording) {
          await stopAudioCapture();
        } else {
          await startAudioCapture();
        }
      }
    },
    { type: 'separator' },
    {
      label: `Mode: ${mode === 'virtual' ? '💻 Virtual Meeting' : '🎤 In-Person'}`,
      enabled: false
    },
    {
      label: 'Switch to Virtual Mode',
      type: 'radio',
      checked: mode === 'virtual',
      click: () => {
        meetingRecorder.switchToVirtual();
        if (mainWindow) {
          mainWindow.webContents.send('mode-changed', { mode: 'virtual' });
        }
      }
    },
    {
      label: 'Switch to In-Person Mode',
      type: 'radio',
      checked: mode === 'physical',
      click: () => {
        meetingRecorder.switchToPhysical();
        if (mainWindow) {
          mainWindow.webContents.send('mode-changed', { mode: 'physical' });
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Show Window',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
        } else {
          createWindow();
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      }
    }
  ]);
  
  tray.setContextMenu(contextMenu);
  tray.setToolTip(`Meeting Assistant - ${mode === 'virtual' ? 'Virtual' : 'In-Person'} Mode`);
}

// Create window when Electron has finished initialization
app.on('ready', async () => {
  try {
    // Initialize database before creating the window
    await initDatabase();
    console.log('Database initialized successfully');
    
    // Create tray
    createTray();
    
    // Register global shortcut
    globalShortcut.register('CommandOrControl+Shift+R', async () => {
      if (isRecording) {
        await stopAudioCapture();
      } else {
        await startAudioCapture();
      }
    });
    
    // Start process monitoring
    processDetector.startMonitoring();
    
    // Don't show window on startup, just show tray
    // createWindow();
  } catch (error) {
    console.error('Failed to initialize:', error);
  }
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // Don't quit on window close, keep running in tray
  // app.quit() is now only called from tray menu
});

app.on('will-quit', () => {
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
  
  // Stop process monitoring
  processDetector.stopMonitoring();
});

app.on('activate', () => {
  // On macOS re-create a window when the dock icon is clicked and no other windows are open
  if (mainWindow === null) {
    createWindow();
  }
});

// Safe wrapper function for IPC handlers
const safe = (fn: SafeHandler) => {
  return async (event: IpcMainInvokeEvent, ...args: any[]) => {
    try {
      return await fn(event, ...args);
    } catch (e: any) {
      console.error(`Error in ${fn.name}:`, e);
      event.sender.send('error', JSON.stringify({
        step: fn.name,
        msg: e.message
      }));
      return {
        success: false,
        error: e.message
      };
    }
  };
};

// IPC handlers for audio capture and transcription
ipcMain.handle('start-audio-capture', safe(async (event, options) => {
  await startAudioCapture(options);
  return { success: true, message: 'Audio capture started' };
}));

ipcMain.handle('stop-audio-capture', safe(async (event) => {
  await stopAudioCapture();
  return { success: true, message: 'Audio capture stopped' };
}));

ipcMain.handle('start-transcription', safe(async (event, audioData) => {
  console.log('Main process received transcription request with data:', audioData);
  const result = await transcribeAudio(audioData);
  console.log('Transcription completed successfully, result length:', result ? result.length : 0);
  
  // Explicitly send the result via IPC event (in addition to the return value)
  event.sender.send('transcription-result', result);
  
  return { 
    success: true, 
    transcription: result,
    message: 'Transcription completed successfully' 
  };
}));

// IPC handlers for meeting summarization
ipcMain.handle('generate-summary', safe(async (event, transcription) => {
  console.log('Main process received summary request for transcription');
  const summary = await generateMeetingSummary(transcription);
  
  return { 
    success: true, 
    summary: summary,
    message: 'Summary generated successfully' 
  };
}));

// IPC handler for saving meeting data
ipcMain.handle('save-meeting', safe(async (event, meetingData) => {
  console.log('Main process received request to save meeting data');
  const savedFilePath = await saveMeetingData(meetingData);
  
  return { 
    success: true, 
    filePath: savedFilePath,
    message: 'Meeting data saved successfully' 
  };
}));

// IPC handler for listing saved meetings
ipcMain.handle('list-meetings', safe(async (event) => {
  const meetings = await listSavedMeetings();
  
  return { 
    success: true, 
    meetings: meetings
  };
}));

// IPC handler for loading a meeting
ipcMain.handle('load-meeting', safe(async (event, meetingId) => {
  const meeting = await loadMeetingById(meetingId);
  
  return { 
    success: true, 
    meeting: meeting
  };
}));

// IPC handlers for email functionality
ipcMain.handle('send-email', safe(async (event, emailData) => {
  console.log('Main process received request to send email');
  const result = await sendMeetingSummary(emailData);
  
  return { 
    success: true, 
    messageId: result.messageId,
    message: 'Email sent successfully' 
  };
}));

// IPC handler for saving email settings
ipcMain.handle('save-email-settings', safe(async (event, settings) => {
  await saveEmailSettings(settings);
  
  return { 
    success: true, 
    message: 'Email settings saved successfully' 
  };
}));

// IPC handler for getting current email settings
ipcMain.handle('get-email-settings', safe(async (event) => {
  const settings = getEmailSettings();
  
  return { 
    success: true, 
    settings: settings
  };
}));

// IPC handlers for meeting recorder
ipcMain.handle('get-recording-mode', safe(async (event) => {
  const mode = meetingRecorder.getMode();
  const stats = await meetingRecorder.getRecordingStats();
  
  return {
    success: true,
    mode: mode,
    stats: stats
  };
}));

ipcMain.handle('check-blackhole-installed', safe(async (event) => {
  const installed = await meetingRecorder.checkBlackHoleInstalled();
  
  return {
    success: true,
    installed: installed
  };
}));

ipcMain.handle('set-recording-mode', safe(async (event, mode) => {
  if (mode === 'virtual') {
    meetingRecorder.switchToVirtual();
  } else {
    meetingRecorder.switchToPhysical();
  }
  
  return {
    success: true,
    mode: mode
  };
}));

ipcMain.handle('get-audio-devices', safe(async (event) => {
  const devices = await meetingRecorder.getAvailableDevices();
  
  return {
    success: true,
    devices: devices
  };
}));

ipcMain.handle('set-audio-device', safe(async (event, deviceId) => {
  meetingRecorder.setAudioSource(deviceId);
  
  return {
    success: true,
    device: deviceId
  };
}));

// Create necessary directories if they don't exist
const rendererDir = path.join(__dirname, 'renderer');
if (!fs.existsSync(rendererDir)) {
  fs.mkdirSync(rendererDir, { recursive: true });
}

// Create assets directory for tray icons
const assetsDir = path.join(__dirname, '../assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}
