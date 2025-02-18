import React from 'react';
import ReactDOM from 'react-dom/client'; // Uppdaterad import
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { AuthProvider } from './auth'; // Korrigerad sökväg
import * as serviceWorkerRegistration from './serviceWorkerRegistration'; // Importera service worker

const root = ReactDOM.createRoot(document.getElementById('root')); // Uppdaterad rad
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);

// Registrera service worker för att göra appen till en PWA
serviceWorkerRegistration.register();

reportWebVitals();