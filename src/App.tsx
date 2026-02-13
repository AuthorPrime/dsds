import { useState, useEffect } from 'react';
import { Layout } from './components/layout/Layout';
import {
  StudioTab,
  WorkshopTab,
  SettingsTab,
  CreditsTab,
} from './components/tabs';
import { StartupScreen } from './components/StartupScreen';
import { Onboarding } from './components/Onboarding';
import { ensureDirectories } from './services/fileManager';
import { getSettings } from './hooks/useSettings';
import type { StartupResult } from './services/startupManager';

function App() {
  const apiKey = (import.meta.env as { VITE_GEMINI_API_KEY?: string })?.VITE_GEMINI_API_KEY || '';

  // Startup gate — show splash until Ollama is ready
  const [startupComplete, setStartupComplete] = useState(false);

  // Onboarding gate — show welcome flow on first launch
  const [onboardingComplete, setOnboardingComplete] = useState(() => {
    return getSettings().hasCompletedOnboarding;
  });

  // Create output folder structure after startup completes
  useEffect(() => {
    if (startupComplete) {
      ensureDirectories().catch(err =>
        console.warn('Could not create output directories:', err)
      );
    }
  }, [startupComplete]);

  const handleStartupReady = (result: StartupResult) => {
    setStartupComplete(true);
    console.log('[App] Startup complete:', result);
  };

  const handleStartupSkip = () => {
    setStartupComplete(true);
    console.log('[App] Startup skipped — entering without AI');
  };

  const handleOnboardingComplete = () => {
    setOnboardingComplete(true);
    console.log('[App] Onboarding complete');
  };

  // Show startup screen until ready
  if (!startupComplete) {
    return (
      <StartupScreen
        onReady={handleStartupReady}
        onSkip={handleStartupSkip}
      />
    );
  }

  // Show onboarding for first-time users
  if (!onboardingComplete) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <Layout
      tabs={{
        studio: <StudioTab apiKey={apiKey} />,
        workshop: <WorkshopTab />,
        settings: <SettingsTab />,
        credits: <CreditsTab />,
      }}
    />
  );
}

export default App;
