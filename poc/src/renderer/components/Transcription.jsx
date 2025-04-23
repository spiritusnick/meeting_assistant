import React from 'react';

const Transcription = ({ text }) => {
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
