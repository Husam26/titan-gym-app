import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initSync, pullFromCloud } from './utils/syncManager.ts'
import { useStore } from './store/useStore.ts'

async function bootstrap() {
  // If the user hasn't onboarded locally, try to pull existing data from the cloud
  if (!useStore.getState().hasOnboarded) {
    await pullFromCloud();
  }

  // Start background syncing
  initSync();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

bootstrap();
