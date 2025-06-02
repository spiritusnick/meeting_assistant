import React, { useEffect, useState } from 'react';

interface ControlsProps {
  isRecording: boolean;
  canTranscribe: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onTranscribe: () => void;
}


const Controls: React.FC<ControlsProps> = ({ 
  isRecording, 
  canTranscribe, 
  onStartRecording, 
  onStopRecording, 
  onTranscribe 
}) => {
  const [recordingMode, setRecordingMode] = useState<'virtual' | 'physical'>('virtual');
  const [runningApps, setRunningApps] = useState<string[]>([]);
  const [currentDevice, setCurrentDevice] = useState<string>('');
  const [audioRouteActive, setAudioRouteActive] = useState(false);
  const [blackholeInstalled, setBlackholeInstalled] = useState<boolean | null>(null);

  useEffect(() => {
    // Get initial recording mode
    window.api.getRecordingMode().then((result: any) => {
      if (result.success) {
        setRecordingMode(result.mode);
        setRunningApps(result.stats.runningApps);
        setCurrentDevice(result.stats.device);
        setAudioRouteActive(result.stats.audioRouteStatus?.isActive || false);
      }
    });

    // Check if BlackHole is installed
    window.api.checkBlackHoleInstalled().then((result: any) => {
      if (result.success) {
        setBlackholeInstalled(result.installed);
      }
    });

    // Listen for mode changes
    window.api.onModeChanged((data: any) => {
      setRecordingMode(data.mode);
      if (data.apps) {
        setRunningApps(data.apps);
      }
    });

    // Listen for audio route changes
    window.api.onAudioRouteChanged((data: any) => {
      setAudioRouteActive(data.active);
    });
  }, []);

  const handleModeChange = async (mode: 'virtual' | 'physical') => {
    const result = await window.api.setRecordingMode(mode);
    if (result.success) {
      setRecordingMode(mode);
    }
  };

  return (
    <div className="controls">
      <div className="recording-mode">
        <h3>Recording Mode</h3>
        <div className="mode-selector">
          <label>
            <input
              type="radio"
              name="mode"
              value="virtual"
              checked={recordingMode === 'virtual'}
              onChange={() => handleModeChange('virtual')}
              disabled={isRecording}
            />
            <span className="mode-label">
              💻 Virtual Meeting
              {runningApps.length > 0 && (
                <span className="running-apps"> ({runningApps.join(', ')})</span>
              )}
            </span>
          </label>
          <label>
            <input
              type="radio"
              name="mode"
              value="physical"
              checked={recordingMode === 'physical'}
              onChange={() => handleModeChange('physical')}
              disabled={isRecording}
            />
            <span className="mode-label">🎤 In-Person Meeting</span>
          </label>
        </div>
        {recordingMode === 'virtual' && blackholeInstalled === false && (
          <p className="mode-hint error">
            ⚠️ BlackHole is not installed. Please install BlackHole 2ch for system audio capture.
          </p>
        )}
        {recordingMode === 'virtual' && blackholeInstalled && runningApps.length === 0 && (
          <p className="mode-hint">
            💡 No meeting apps detected. Will capture all system audio when recording starts.
          </p>
        )}
        {audioRouteActive && (
          <p className="audio-route-status">
            🎧 Smart audio routing active - You can still hear your audio!
          </p>
        )}
        {currentDevice && (
          <p className="current-device">Device: {currentDevice}</p>
        )}
      </div>
      
      <div className="recording-controls">
      <button 
        id="start-btn" 
        onClick={onStartRecording} 
        disabled={isRecording}
      >
        Start Recording
      </button>
      
      <button 
        id="stop-btn" 
        onClick={onStopRecording} 
        disabled={!isRecording}
      >
        Stop Recording
      </button>
      
      <button 
        id="transcribe-btn" 
        onClick={onTranscribe} 
        disabled={!canTranscribe}
      >
        Transcribe
      </button>
      </div>
    </div>
  );
};

export default Controls;
