import React, { useState, useCallback, useEffect } from 'react';
import { Settings } from './types';
import { DEFAULT_SETTINGS } from './constants';
import ConversationView from './components/ConversationView';
import SettingsView from './components/SettingsView';
import { SettingsIcon, MicIcon } from './components/icons';
import * as db from './services/db';

type View = 'conversation' | 'settings';

const App: React.FC = () => {
  const [view, setView] = useState<View>('conversation');
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const savedSettings = await db.getSettings();
        setSettings(savedSettings);
      } catch (error) {
        console.error("Failed to load settings:", error);
        setSettings(DEFAULT_SETTINGS);
      }
    };
    loadData();
  }, []);

  const handleSettingsChange = useCallback(async (newSettings: Settings) => {
    setSettings(newSettings);
    await db.saveSettings(newSettings);
  }, []);

  const handleExportData = useCallback(async () => {
    try {
      const snapshot = await db.exportDatabaseSnapshot();
      const json = JSON.stringify(snapshot, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `linguaflow_avatar_backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Falha ao exportar dados.');
    }
  }, []);

  const handleImportBackup = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as db.DatabaseSnapshot;
      await db.importDatabaseSnapshot(parsed);
      const savedSettings = await db.getSettings();
      setSettings(savedSettings);
      alert('Backup restaurado!');
    } catch (error) {
      console.error('Import failed:', error);
      alert('Falha ao restaurar backup.');
    }
  }, []);

  const renderView = () => {
    if (!settings) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
          <p>Carregando...</p>
        </div>
      );
    }

    switch (view) {
      case 'conversation':
        return <ConversationView settings={settings} onBack={() => setView('conversation')} />;
      case 'settings':
        return (
          <SettingsView
            settings={settings}
            onSettingsChange={handleSettingsChange}
            onExportBackup={handleExportData}
            onImportBackup={handleImportBackup}
            onBack={() => setView('conversation')}
          />
        );
      default:
        return <ConversationView settings={settings} onBack={() => setView('conversation')} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-cyan-400">LinguaFlow Avatar</h1>
          <nav className="flex space-x-2">
            <button
              onClick={() => setView('conversation')}
              className={`px-4 py-2 rounded-md transition-colors flex items-center space-x-2 ${
                view === 'conversation' ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <MicIcon className="w-5 h-5" />
              <span>Conversa</span>
            </button>
            <button
              onClick={() => setView('settings')}
              className={`px-4 py-2 rounded-md transition-colors flex items-center space-x-2 ${
                view === 'settings' ? 'bg-cyan-600 text-white' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <SettingsIcon className="w-5 h-5" />
              <span>Configurações</span>
            </button>
          </nav>
        </div>
      </header>
      <main className="flex-1 overflow-hidden">
        {renderView()}
      </main>
    </div>
  );
};

export default App;
