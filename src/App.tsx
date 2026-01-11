import { Layout } from './components/layout/Layout';
import type { TabId } from './components/layout/Layout';
import { RecordTab, TranscribeTab, PublishTab, DocsTab, SettingsTab } from './components/tabs';

function App() {
  // Get API key from environment
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';

  const renderTab = (activeTab: TabId) => {
    switch (activeTab) {
      case 'record':
        return <RecordTab apiKey={apiKey} />;
      case 'transcribe':
        return <TranscribeTab />;
      case 'publish':
        return <PublishTab />;
      case 'docs':
        return <DocsTab />;
      case 'settings':
        return <SettingsTab />;
      default:
        return <RecordTab apiKey={apiKey} />;
    }
  };

  return (
    <Layout>
      {renderTab}
    </Layout>
  );
}

export default App;
