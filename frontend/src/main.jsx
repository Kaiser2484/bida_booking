import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import useAuthStore from './store/authStore';

// Initialize auth on app load
useAuthStore.getState().initAuth();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);