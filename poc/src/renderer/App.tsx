import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import WaveSurfer from 'wavesurfer.js';
import DeviceSelector from './components/DeviceSelector.js';
import Controls from './components/Controls.js';
import Transcription from './components/Transcription.js';
import StatusBar from './components/StatusBar.js';
import Summary from './components/Summary.js';
import EmailDialog from './components/EmailDialog.js';
import { 
  AudioDevice, 
  AudioData, 
  SummaryData, 
  Meeting, 
  EmailData, 
  ErrorResponse 
} from './types/interfaces.js';

interface AudioChunk extends Uint8Array {}

interface DecodedBuffer {
  length: number;
  duration: number;
  sampleRate: number;
  numberOfChannels: number;
  getChannelData: (channel: number) => Float32Array;
}

const App: React.FC = () => {
  // State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('default');
  const [status, setStatus] = useState<string>('Ready');
  const [transcription, setTranscription] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [audioChunks, setAudioChunks] = useState<AudioChunk[]>([]);
  const [canTranscribe, setCanTranscribe] = useState<boolean>(false);
  
  // Summary and email related state
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState<boolean>(false);
  const [canGenerateSummary, setCanGenerateSummary] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'record' | 'summary' | 'history'>('record');
  const [isSavingSummary, setIsSavingSummary] = useState<boolean>(false);
  const [savedMeetings, setSavedMeetings] = useState<Meeting[]>([]);
  
  // Email state
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState<boolean>(false);
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);

  // Refs
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);

  // Initialize WaveSurfer
  useEffect(() => {
    if (waveformRef.current) {
      wavesurferRef.current = WaveSurfer.create({
        container: waveformRef.current,
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

    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
      }
    };
  }, []);

  // Initialize audio devices
  useEffect(() => {
    const populateDeviceList = async (): Promise<void> => {
      try {
        // Request permission to access audio devices
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Get list of audio devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputDevices = devices.filter(device => device.kind === 'audioinput');
        
        // Process devices
        const processedDevices: AudioDevice[] = [
          { id: 'default', label: 'Default Device' },
          ...audioInputDevices.map(device => ({
            id: device.deviceId,
            label: device.label || `Microphone ${audioInputDevices.indexOf(device) + 1}`
          }))
        ];
        
        // Add BlackHole option if not already in the list
        const hasBlackHole = processedDevices.some(device => device.label.includes('BlackHole'));
        
        if (!hasBlackHole) {
          processedDevices.push({
            id: 'blackhole',
            label: 'BlackHole 2ch (Virtual)'
          });
        }
        
        setAudioDevices(processedDevices);
      } catch (error: any) {
        showError(`Could not access audio devices: ${error.message}`);
      }
    };

    populateDeviceList();
  }, []);

  // Setup API event listeners
  useEffect(() => {
    const audioDataUnsubscribe = window.api.onAudioData((data: AudioData) => {
      processAudioData(data);
    });
    
    const transcriptionResultUnsubscribe = window.api.onTranscriptionResult((result: string) => {
      setTranscription(result);
      setStatus('Transcription complete');
    });
    
    const errorUnsubscribe = window.api.onError((error: ErrorResponse | string) => {
      if (typeof error === 'string') {
        showError(`Error: ${error}`);
      } else {
        showError(`Error: ${error.message}`);
      }
    });

    return () => {
      audioDataUnsubscribe();
      transcriptionResultUnsubscribe();
      errorUnsubscribe();
    };
  }, []);

  // Process incoming audio data
  const processAudioData = (data: AudioData): void => {
    if (!isRecording) return;
    
    // Store audio chunk
    setAudioChunks(prev => [...prev, new Uint8Array(data.buffer)]);
    
    // Update waveform visualization would go here
    // This is simplified for POC and will be improved in a future update
  };

  // Create audio buffer from collected chunks for visualization
  const createAudioBufferFromChunks = (): void => {
    try {
      if (!audioChunks.length || !wavesurferRef.current) return;
      
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
      const decodedBuffer: DecodedBuffer = {
        length: float32Array.length,
        duration: float32Array.length / 16000, // Assuming 16kHz sample rate
        sampleRate: 16000,
        numberOfChannels: 1,
        getChannelData: (channel: number) => {
          if (channel === 0) return float32Array;
          return new Float32Array(float32Array.length);
        }
      };
      
      wavesurferRef.current.loadDecodedBuffer(decodedBuffer);
    } catch (error: any) {
      showError(`Error processing audio data: ${error.message}`);
    }
  };

  // Start recording audio
  const startRecording = async (): Promise<void> => {
    try {
      setAudioChunks([]);
      setStatus('Starting recording...');
      
      const deviceName = audioDevices.find(device => device.id === selectedDevice)?.label || 'Default Device';
      
      const result = await window.api.startAudioCapture({
        deviceName: deviceName,
        sampleRate: 16000,
        channels: 1
      });
      
      if (result.success) {
        setIsRecording(true);
        setCanTranscribe(false);
        setStatus('Recording in progress...');
      } else {
        showError(`Failed to start recording: ${result.error}`);
      }
    } catch (error: any) {
      showError(`Recording error: ${error.message}`);
    }
  };

  // Stop recording audio
  const stopRecording = async (): Promise<void> => {
    try {
      setStatus('Stopping recording...');
      
      const result = await window.api.stopAudioCapture();
      
      if (result.success) {
        setIsRecording(false);
        setCanTranscribe(true);
        setStatus('Recording stopped. Ready to transcribe.');
        
        // Create audio buffer from chunks for visualization
        if (audioChunks.length > 0) {
          createAudioBufferFromChunks();
        }
      } else {
        showError(`Failed to stop recording: ${result.error}`);
      }
    } catch (error: any) {
      showError(`Error stopping recording: ${error.message}`);
    }
  };

  // Transcribe the recorded audio
  const transcribeAudio = async (): Promise<void> => {
    try {
      // We no longer need to check audioChunks since we're using saved files
      // The recordings are saved to the file system independently
      
      setStatus('Transcribing audio...');
      setCanTranscribe(false);
      
      console.log("Starting transcription process. Using the saved recording file.");
      
      const result = await window.api.startTranscription({
        useLatestRecording: true,
        sampleRate: 16000
      });
      
      console.log("Transcription API result:", result);
      
      if (result.success) {
        setTranscription(result.transcription);
        setStatus('Transcription complete');
      } else {
        showError(`Transcription failed: ${result.error}`);
      }
      
      setCanTranscribe(true);
    } catch (error: any) {
      showError(`Transcription error: ${error.message}`);
      setCanTranscribe(true);
    }
  };

  // Generate a summary from the transcription
  const generateSummary = async (): Promise<void> => {
    if (!transcription || transcription.trim().length === 0) {
      showError('No transcription to summarize. Please transcribe a recording first.');
      return;
    }
    
    try {
      setIsGeneratingSummary(true);
      setStatus('Generating summary...');
      
      const result = await window.api.generateSummary(transcription);
      
      if (result.success) {
        setSummary(result.summary);
        setActiveTab('summary');
        setCanGenerateSummary(true);
        setStatus('Summary generated successfully');
      } else {
        showError(`Failed to generate summary: ${result.error}`);
      }
    } catch (error: any) {
      showError(`Summary generation error: ${error.message}`);
    } finally {
      setIsGeneratingSummary(false);
    }
  };
  
  // Save the meeting data
  const saveMeeting = async (summaryData: SummaryData): Promise<void> => {
    try {
      setIsSavingSummary(true);
      
      const meetingData = {
        title: summaryData.title,
        date: new Date().toISOString(),
        transcription: transcription,
        summary: summaryData
      };
      
      const result = await window.api.saveMeeting(meetingData);
      
      if (result.success) {
        setSummary(summaryData);
        setStatus('Meeting saved successfully');
        
        // Refresh the meeting list
        loadMeetings();
      } else {
        showError(`Failed to save meeting: ${result.error}`);
      }
    } catch (error: any) {
      showError(`Error saving meeting: ${error.message}`);
    } finally {
      setIsSavingSummary(false);
    }
  };
  
  // Load all saved meetings
  const loadMeetings = async (): Promise<void> => {
    try {
      setStatus('Loading meetings...');
      
      const result = await window.api.listMeetings();
      
      if (result.success) {
        setSavedMeetings(result.meetings);
      } else {
        setSavedMeetings([]);
        showError(`Failed to load meetings: ${result.error}`);
      }
    } catch (error: any) {
      showError(`Error loading meetings: ${error.message}`);
    }
  };
  
  // Load a specific meeting
  const loadMeeting = async (meetingId: string): Promise<void> => {
    try {
      setStatus('Loading meeting...');
      
      const result = await window.api.loadMeeting(meetingId);
      
      if (result.success) {
        setTranscription(result.meeting.transcription);
        setSummary(result.meeting.summary);
        setActiveTab('summary');
        setStatus('Meeting loaded successfully');
      } else {
        showError(`Failed to load meeting: ${result.error}`);
      }
    } catch (error: any) {
      showError(`Error loading meeting: ${error.message}`);
    }
  };
  
  // Open email dialog
  const openEmailDialog = (): void => {
    setIsEmailDialogOpen(true);
  };
  
  // Close email dialog
  const closeEmailDialog = (): void => {
    setIsEmailDialogOpen(false);
  };
  
  // Send email with summary
  const sendEmail = async (emailData: EmailData): Promise<void> => {
    try {
      setIsSendingEmail(true);
      
      const result = await window.api.sendEmail(emailData);
      
      if (result.success) {
        setIsEmailDialogOpen(false);
        setStatus('Email sent successfully');
      } else {
        showError(`Failed to send email: ${result.error}`);
      }
    } catch (error: any) {
      showError(`Error sending email: ${error.message}`);
    } finally {
      setIsSendingEmail(false);
    }
  };
  
  // Show error message
  const showError = (message: string): void => {
    // Check if the error is about SOX being missing
    if (message.includes('SOX') || message.includes('sox')) {
      setError(`SOX (Sound eXchange) is not installed. Please install it with "brew install sox" and restart the application.`);
      // Don't auto-hide SOX error as it's critical
    } else {
      setError(message);
      // Auto-hide other errors after 5 seconds
      setTimeout(() => {
        setError('');
      }, 5000);
    }
  };
  
  // Load meetings when component mounts
  useEffect(() => {
    loadMeetings();
  }, []);
  
  // Enable summary generation when transcription is available
  useEffect(() => {
    if (transcription && transcription.trim().length > 0) {
      setCanGenerateSummary(true);
    } else {
      setCanGenerateSummary(false);
    }
  }, [transcription]);

  return (
    <div className="container">
      <h1>Meeting Assistant POC</h1>
      
      {error && <div className="error">{error}</div>}
      
      {/* Navigation Tabs */}
      <div className="app-tabs">
        <button 
          className={`app-tab ${activeTab === 'record' ? 'active' : ''}`}
          onClick={() => setActiveTab('record')}
        >
          Record & Transcribe
        </button>
        <button 
          className={`app-tab ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
          disabled={!summary}
        >
          Summary
        </button>
        <button 
          className={`app-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Meeting History
        </button>
      </div>
      
      {/* Recording & Transcription Tab */}
      <div className={`tab-content ${activeTab === 'record' ? 'active' : ''}`}>
        <DeviceSelector 
          devices={audioDevices}
          selectedDevice={selectedDevice}
          onDeviceChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedDevice(e.target.value)}
        />
        
        <Controls 
          isRecording={isRecording}
          canTranscribe={canTranscribe}
          onStartRecording={startRecording}
          onStopRecording={stopRecording}
          onTranscribe={transcribeAudio}
        />
        
        <StatusBar status={status} />
        
        <div className="waveform" ref={waveformRef}></div>
        
        <Transcription text={transcription} />
        
        {transcription && transcription.length > 0 && (
          <div className="summary-actions">
            <button 
              onClick={generateSummary}
              disabled={isGeneratingSummary || !canGenerateSummary}
              className="generate-btn"
            >
              {isGeneratingSummary ? 'Generating Summary...' : 'Generate Meeting Summary'}
            </button>
          </div>
        )}
      </div>
      
      {/* Summary Tab */}
      <div className={`tab-content ${activeTab === 'summary' ? 'active' : ''}`}>
        {summary ? (
          <>
            <Summary 
              summary={summary}
              onSave={saveMeeting}
              onEmail={openEmailDialog}
              onEdit={() => {}} // Providing a no-op function for the onEdit prop
              isSaving={isSavingSummary}
            />
          </>
        ) : (
          <div className="empty-state">
            <p>No summary available. Generate a summary from a transcription first.</p>
            <button onClick={() => setActiveTab('record')}>Go to Recording</button>
          </div>
        )}
      </div>
      
      {/* History Tab */}
      <div className={`tab-content ${activeTab === 'history' ? 'active' : ''}`}>
        <h2>Meeting History</h2>
        {savedMeetings.length > 0 ? (
          <div className="meeting-list">
            {savedMeetings.map(meeting => (
              <div key={meeting.id} className="meeting-item">
                <div className="meeting-info">
                  <h3>{meeting.title}</h3>
                  <p>{new Date(meeting.date).toLocaleString()}</p>
                </div>
                <div className="meeting-actions">
                  <button onClick={() => loadMeeting(meeting.id)}>
                    Load Meeting
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No saved meetings. Save a meeting summary first.</p>
            <button onClick={() => setActiveTab('record')}>Go to Recording</button>
          </div>
        )}
      </div>
      
      {/* Email Dialog */}
      <EmailDialog 
        isOpen={isEmailDialogOpen}
        onClose={closeEmailDialog}
        onSend={sendEmail}
        summary={summary}
        isSending={isSendingEmail}
      />
    </div>
  );
};

export default App;
