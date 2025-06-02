import React from 'react';

interface TranscriptionProps {
  text: string;
}

const Transcription: React.FC<TranscriptionProps> = ({ text }) => {
  return (
    <>
      <h3>Transcription:</h3>
      <div className="transcription">
        {text || 'No transcription available yet. Record audio and click "Transcribe" to see results.'}
      </div>
    </>
  );
};

export default Transcription;
