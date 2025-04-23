import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

// Create root and render the React app
const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
