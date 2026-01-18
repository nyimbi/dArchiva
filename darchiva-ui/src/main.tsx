// (c) Copyright Datacraft, 2026
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Initialize theme from system preference or stored preference
const storedTheme = localStorage.getItem('darchiva-theme');
const prefersDark = storedTheme
	? storedTheme === 'dark'
	: window.matchMedia('(prefers-color-scheme: dark)').matches;
document.documentElement.classList.toggle('dark', prefersDark);

const container = document.getElementById('root');
if (!container) throw new Error('Root container not found');

createRoot(container).render(
	<StrictMode>
		<App />
	</StrictMode>
);
