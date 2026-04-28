import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

// Suppress Tauri dev overlay for undefined/null promise rejections.
// These are caused by IPC teardown noise (e.g. component unmounts, canceled events)
// and are not real errors. Real errors are still logged to console.
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason === undefined || event.reason === null) {
    event.preventDefault();
    return;
  }
  // Log real rejections but still prevent the intrusive Tauri overlay
  console.error('[Unhandled Rejection]', event.reason);
  event.preventDefault();
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
