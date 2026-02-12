import { Layout } from './components/layout/Layout';
import type { TabId } from './components/layout/Layout';
import {
  RecordTab,
  TranscribeTab,
  ProductionTab,
  PublisherTab,
  DocsTab,
  SettingsTab,
} from './components/tabs';

function App() {
  const apiKey = (import.meta.env as { VITE_GEMINI_API_KEY?: string })?.VITE_GEMINI_API_KEY || '';

  const renderTab = (activeTab: TabId) => {
    switch (activeTab) {
      case 'studio':
        return <RecordTab apiKey={apiKey} />;
      case 'production':
        return <ProductionTab />;
      case 'publisher':
        return <PublisherTab />;
      case 'library':
        return <TranscribeTab />;
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
