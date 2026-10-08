import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { LanguageProvider } from './contexts/LanguageContext';
import { FarmProvider } from './contexts/FarmContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <FarmProvider>
          <App />
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: { borderRadius: '12px', background: '#1c1917', color: '#fff', fontSize: '14px' },
            }}
          />
        </FarmProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
);
