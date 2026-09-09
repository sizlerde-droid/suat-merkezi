import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { TabType, AppSettings, IPTVChannel, Transaction, PasswordItem, DocumentItem } from './types';
import {
  initialSettings,
  initialChannels,
  initialMusic,
  initialTransactions,
  initialPasswords,
  initialDocuments,
} from './data/initialData';
import { Header } from './components/Header';
import { HomeGrid } from './components/HomeGrid';
import { SuatiPTV } from './components/SuatiPTV';
import { SuatMuzik } from './components/SuatMuzik';
import { YesilcamMuhasebe } from './components/YesilcamMuhasebe';
import { YesilcamSifreMerkezi } from './components/YesilcamSifreMerkezi';
import { Dosyalarim } from './components/Dosyalarim';
import { Ayarlar } from './components/Ayarlar';
import { InternetMedya } from './components/InternetMedya';
import { sound } from './utils/audio';
import { useTVGlobalBack } from './platform';
import {
  loadChannelsSync,
  loadChannelsFromStorage,
  saveChannelsToStorage,
  clearChannelsStorage,
  saveFavoritesToStorage,
  getFavoritesFromStorage,
} from './utils/iptvStorage';

export default function App() {
  // Navigation State
  const [currentTab, setCurrentTab] = useState<TabType>('home');

  // Settings State with LocalStorage
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('suat_settings');
      return saved ? { ...initialSettings, ...JSON.parse(saved) } : initialSettings;
    } catch {
      return initialSettings;
    }
  });

  // Global TV Remote & Keyboard Back Handler (Escape / Back / Android KeyCode 4)
  useTVGlobalBack({
    currentTab,
    onBackHome: () => {
      if (settings.soundEffects) {
        sound.playClick();
      }
      setCurrentTab('home');
    },
    settings,
  });

  // Channels State (instant sync from localStorage + durable IndexedDB)
  const [channels, setChannels] = useState<IPTVChannel[]>(() => {
    return loadChannelsSync();
  });
  const [channelsLoaded, setChannelsLoaded] = useState(false);

  // Load channels securely on mount from IndexedDB / Storage
  useEffect(() => {
    loadChannelsFromStorage().then((saved) => {
      if (saved && saved.length > 0) {
        setChannels(saved);
      }
      setChannelsLoaded(true);
    });
  }, []);

  // Transactions State
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('suat_transactions');
      return saved ? JSON.parse(saved) : initialTransactions;
    } catch {
      return initialTransactions;
    }
  });

  // Passwords State
  const [passwords, setPasswords] = useState<PasswordItem[]>(() => {
    try {
      const saved = localStorage.getItem('suat_passwords');
      return saved ? JSON.parse(saved) : initialPasswords;
    } catch {
      return initialPasswords;
    }
  });

  // Documents State
  const [documents, setDocuments] = useState<DocumentItem[]>(() => {
    try {
      const saved = localStorage.getItem('suat_documents');
      return saved ? JSON.parse(saved) : initialDocuments;
    } catch {
      return initialDocuments;
    }
  });

  // Sync state changes with storage
  useEffect(() => {
    try {
      localStorage.setItem('suat_settings', JSON.stringify(settings));
    } catch {}
  }, [settings]);

  useEffect(() => {
    if (channelsLoaded) {
      saveChannelsToStorage(channels);
    }
  }, [channels, channelsLoaded]);

  useEffect(() => {
    try {
      localStorage.setItem('suat_transactions', JSON.stringify(transactions));
    } catch {}
  }, [transactions]);

  useEffect(() => {
    try {
      // Clear legacy unencrypted passwords to maintain high security
      localStorage.removeItem('suat_passwords');
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('suat_documents', JSON.stringify(documents));
    } catch {}
  }, [documents]);

  // Update Settings handler
  const handleUpdateSettings = (newPartial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...newPartial }));
  };

  // Reset Data to sample
  const handleResetData = () => {
    setChannels([]);
    clearChannelsStorage();
    setTransactions(initialTransactions);
    setPasswords(initialPasswords);
    setDocuments(initialDocuments);
    setSettings(initialSettings);
    if (settings.soundEffects) sound.playSuccess();
    if (settings.voiceAssistance) {
      sound.speak('Tüm bilgiler ilk ayarlara döndürüldü.');
    }
  };

  // Handlers for transactions
  const handleAddTransaction = (newTx: Transaction) => {
    setTransactions((prev) => [newTx, ...prev]);
  };

  const handleUpdateTransaction = (updatedTx: Transaction) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === updatedTx.id ? updatedTx : t))
    );
  };

  const handleTogglePaid = (id: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isPaid: !t.isPaid } : t))
    );
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleImportTransactions = (imported: Transaction[]) => {
    setTransactions(imported);
  };

  // Handlers for passwords
  const handleAddPassword = (item: PasswordItem) => {
    setPasswords((prev) => [item, ...prev]);
  };

  const handleDeletePassword = (id: string) => {
    setPasswords((prev) => prev.filter((p) => p.id !== id));
  };

  // Handlers for documents
  const handleAddDocument = (doc: DocumentItem) => {
    setDocuments((prev) => [doc, ...prev]);
  };

  const handleDeleteDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  // Handlers for IPTV channels
  const handleSetChannels = (newChannels: IPTVChannel[]) => {
    setChannels(newChannels);
    saveChannelsToStorage(newChannels);
  };

  const handleAddChannel = (channel: IPTVChannel) => {
    setChannels((prev) => {
      const next = [...prev, channel];
      saveChannelsToStorage(next);
      return next;
    });
  };

  const handleToggleFavoriteChannel = (channelId: string) => {
    setChannels((prev) => {
      const updated = prev.map((c) =>
        c.id === channelId ? { ...c, isFavorite: !c.isFavorite } : c
      );
      const favs = new Set<string>(updated.filter((c) => c.isFavorite).map((c) => c.id));
      saveFavoritesToStorage(favs);
      saveChannelsToStorage(updated);
      return updated;
    });
  };

  const handleClearChannels = () => {
    setChannels([]);
    clearChannelsStorage();
  };

  // Dynamic Root Font Size class
  const getFontSizeClass = () => {
    switch (settings.fontSize) {
      case 'normal':
        return 'text-[17px] leading-relaxed';
      case 'large':
        return 'text-[21px] leading-relaxed';
      case 'xlarge':
        return 'text-[25px] leading-loose';
      default:
        return 'text-[19px] leading-relaxed';
    }
  };

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${getFontSizeClass()} ${
        settings.highContrast
          ? 'bg-black text-white selection:bg-yellow-400 selection:text-black'
          : 'bg-slate-50 text-slate-900 selection:bg-amber-200 selection:text-slate-900'
      }`}
    >
      {/* Universal Header */}
      <Header
        currentTab={currentTab}
        onNavigate={setCurrentTab}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col">
        <AnimatePresence mode="wait">
          {currentTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="flex-1"
            >
              <HomeGrid onNavigate={setCurrentTab} settings={settings} />
            </motion.div>
          )}

          {currentTab === 'iptv' && (
            <motion.div
              key="iptv"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="flex-1"
            >
              <SuatiPTV
                channels={channels}
                onSetChannels={handleSetChannels}
                onAddChannel={handleAddChannel}
                onToggleFavorite={handleToggleFavoriteChannel}
                onClearChannels={handleClearChannels}
                onBackHome={() => setCurrentTab('home')}
                settings={settings}
              />
            </motion.div>
          )}

          {currentTab === 'muzik' && (
            <motion.div
              key="muzik"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="flex-1"
            >
              <SuatMuzik onBackHome={() => setCurrentTab('home')} settings={settings} />
            </motion.div>
          )}

          {currentTab === 'muhasebe' && (
            <motion.div
              key="muhasebe"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="flex-1"
            >
              <YesilcamMuhasebe
                transactions={transactions}
                onAddTransaction={handleAddTransaction}
                onUpdateTransaction={handleUpdateTransaction}
                onTogglePaid={handleTogglePaid}
                onDeleteTransaction={handleDeleteTransaction}
                onImportTransactions={handleImportTransactions}
                onBackHome={() => setCurrentTab('home')}
                settings={settings}
              />
            </motion.div>
          )}

          {currentTab === 'sifre' && (
            <motion.div
              key="sifre"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="flex-1"
            >
              <YesilcamSifreMerkezi
                onBackHome={() => setCurrentTab('home')}
                settings={settings}
              />
            </motion.div>
          )}

          {currentTab === 'dosyalar' && (
            <motion.div
              key="dosyalar"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="flex-1"
            >
              <Dosyalarim
                documents={documents}
                onAddDocument={handleAddDocument}
                onDeleteDocument={handleDeleteDocument}
                settings={settings}
                onBackHome={() => setCurrentTab('home')}
              />
            </motion.div>
          )}

          {currentTab === 'ayarlar' && (
            <motion.div
              key="ayarlar"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="flex-1"
            >
              <Ayarlar
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                onResetData={handleResetData}
              />
            </motion.div>
          )}

          {currentTab === 'internet_medya' && (
            <motion.div
              key="internet_medya"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="flex-1"
            >
              <InternetMedya
                onBackHome={() => setCurrentTab('home')}
                onNavigate={setCurrentTab}
                settings={settings}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Senior Footer Bar */}
      <footer
        className={`w-full py-4 px-6 border-t-2 text-center transition-colors ${
          settings.highContrast
            ? 'bg-black border-yellow-400 text-yellow-300'
            : 'bg-white border-slate-200 text-slate-600'
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-base sm:text-lg font-bold">
          <div className="flex items-center gap-2">
            <span>🇹🇷 Suat Merkezi</span>
            <span className="text-slate-400">•</span>
            <span>Huzurlu ve Kolay Kullanım</span>
          </div>

          <div className="flex items-center gap-4">
            {currentTab !== 'home' && (
              <button
                onClick={() => {
                  if (settings.soundEffects) sound.playClick();
                  setCurrentTab('home');
                }}
                className="underline hover:text-emerald-700 text-emerald-600 font-black cursor-pointer"
              >
                🏠 Ana Sayfaya Git
              </button>
            )}
            <span className="text-sm font-semibold text-slate-400">
              Göz sağlığı için optimize edilmiştir
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
