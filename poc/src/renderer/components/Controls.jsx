import React from 'react';

const Controls = ({ isRecording, canTranscribe, onStartRecording, onStopRecording, onTranscribe }) => {
  return (
    <div className="controls">
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
  );
};

export default Controls;
