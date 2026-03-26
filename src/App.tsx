import { useState, useEffect } from 'react';
import { Layout } from './components/layout/Layout';
import {
  StudioTab,
  SettingsTab,
  CreditsTab,
} from './components/tabs';
import { StartupScreen } from './components/StartupScreen';
import { Onboarding } from './components/Onboarding';
import { ensureDirectories } from './services/fileManager';
import { getSettings } from './hooks/useSettings';
import type { StartupResult } from './services/startupManager';

function App() {
  const [startupComplete, setStartupComplete] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState(() => {
    return getSettings().hasCompletedOnboarding;
  });

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

  if (!startupComplete) {
    return (
      <StartupScreen
        onReady={handleStartupReady}
        onSkip={handleStartupSkip}
      />
    );
  }

  if (!onboardingComplete) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <Layout
      tabs={{
        studio: <StudioTab />,
        settings: <SettingsTab />,
        credits: <CreditsTab />,
      }}
    />
  );
}

export default App;
