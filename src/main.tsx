import React from 'react';
import ReactDOM from 'react-dom/client';
import { getErrorMessage } from './utils/errorUtils';

// NUCLEAR SUPPRESSION: This runs before anything else to catch rejections 
// that Vite might try to turn into a yellow screen.
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason === undefined || event.reason === null) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }
  const msg = getErrorMessage(event.reason);
  if (msg.includes('IPC') || msg.includes('teardown') || msg.includes('cancel')) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }
  // In development, Vite overlay is annoying for non-critical rejections.
  event.preventDefault();
}, true); // Use capture phase to be first

window.addEventListener('error', (event) => {
  if (!event.error) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}, true);

import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary name="ROOT_APP">
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
