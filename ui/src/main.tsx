import './styles/index.css';

import React from 'react';
import ReactDOM from 'react-dom/client';

import App from '@/app/App';
import { AppProviders } from '@/app/providers/AppProviders';

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>,
);
