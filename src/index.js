import React from 'react';
import ReactDOM from 'react-dom/client'; // Uppdaterad import
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { AuthProvider } from './auth'; // Korrigerad sökväg

const root = ReactDOM.createRoot(document.getElementById('root')); // Uppdaterad rad
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);

reportWebVitals();