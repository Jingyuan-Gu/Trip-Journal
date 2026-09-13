import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { TripProvider } from './context/TripContext';
import App from './App';
import './index.css';
createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter><TripProvider><App /></TripProvider></BrowserRouter></StrictMode>);
