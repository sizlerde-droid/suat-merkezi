import React, { useState, useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { IPTVChannel, AppSettings } from '../types';
import {
  Tv,
  Home,
  Volume2,
  VolumeX,
  Maximize2,
  ChevronUp,
  ChevronDown,
  Plus,
  Play,
  Pause,
  Film,
  Search,
  Star,
  RefreshCw,
  Upload,
  Link,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Download,
  Info,
  X,
  Radio,
} from 'lucide-react';
import { sound } from '../utils/audio';
import { parseM3U, exportToM3U } from '../utils/m3uParser';
import { saveChannelsToStorage, clearChannelsStorage } from '../utils/iptvStorage';

interface SuatiPTVProps {
  channels: IPTVChannel[];
  onSetChannels: (channels: IPTVChannel[]) => void;
  onAddChannel: (channel: IPTVChannel) => void;
  onToggleFavorite: (channelId: string) => void;
  onClearChannels: () => void;
  onBackHome: () => void;
  settings: AppSettings;
}

export const SuatiPTV: React.FC<SuatiPTVProps> = ({
  channels,
  onSetChannels,
  onAddChannel,
  onToggleFavorite,
  onClearChannels,
  onBackHome,
  settings,
}) => {
  // Player state
  const [selectedChannelIndex, setSelectedChannelIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isLoadingStream, setIsLoadingStream] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('Tümü');

  // Modal state
  const [showManageModal, setShowManageModal] = useState(false);
  const [modalTab, setModalTab] = useState<'file' | 'url' | 'paste' | 'single'>('file');

  // M3U URL input
  const [m3uUrl, setM3uUrl] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [urlFetchError, setUrlFetchError] = useState<string | null>(null);

  // M3U Text Paste
  const [pastedText, setPastedText] = useState('');

  // Single channel form
  const [singleName, setSingleName] = useState('');
  const [singleUrl, setSingleUrl] = useState('');
  const [singleGroup, setSingleGroup] = useState('Genel');

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);

  // Get current channel safely
  const currentChannel: IPTVChannel | undefined = channels[selectedChannelIndex] || channels[0];

  // Extract all unique groups from channels
  const allGroups = React.useMemo(() => {
    const set = new Set<string>();
    channels.forEach((c) => {
      const g = c.group || c.category;
      if (g && g.trim()) set.add(g.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [channels]);

  // Favorites count
  const favoritesCount = React.useMemo(() => {
    return channels.filter((c) => c.isFavorite).length;
  }, [channels]);

  // Filtered channels based on search and selected group
  const filteredChannels = React.useMemo(() => {
    return channels.filter((c) => {
      // Group filter
      if (selectedGroup === '⭐ Favorilerim') {
        if (!c.isFavorite) return false;
      } else if (selectedGroup !== 'Tümü') {
        const g = c.group || c.category;
        if (g !== selectedGroup) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = c.name.toLowerCase().includes(q);
        const matchGroup = (c.group || c.category || '').toLowerCase().includes(q);
        const matchNumber = c.number.toString() === q;
        if (!matchName && !matchGroup && !matchNumber) return false;
      }

      return true;
    });
  }, [channels, selectedGroup, searchQuery]);

  // Video playback management with HLS.js
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentChannel || !currentChannel.streamUrl) {
      return;
    }

    setStreamError(null);
    setIsLoadingStream(true);

    // Destroy existing HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const streamUrl = currentChannel.streamUrl.trim();

    // Check if it is a standard YouTube or iframe link
    if (streamUrl.includes('youtube.com') || streamUrl.includes('youtu.be')) {
      setIsLoadingStream(false);
      return;
    }

    // Use HLS.js if supported
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
      });
      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoadingStream(false);
        setStreamError(null);
        if (isPlaying) {
          video.play().catch(() => {
            // Autoplay might need user interaction
          });
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          setIsLoadingStream(false);
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setStreamError('Yayın sunucusuna bağlanılamadı. İnternet bağlantınızı veya kanal adresini kontrol ediniz.');
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setStreamError('Yayın akışı oynatılamadı. Yayın şu an çevrimdışı olabilir.');
              hls.destroy();
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari HLS support
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsLoadingStream(false);
        setStreamError(null);
        if (isPlaying) {
          video.play().catch(() => {});
        }
      });
      video.addEventListener('error', () => {
        setIsLoadingStream(false);
        setStreamError('Yayın açılamadı. Yayın adresi geçersiz veya çevrimdışı olabilir.');
      });
    } else {
      // Fallback standard video source
      video.src = streamUrl;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentChannel, currentChannel?.streamUrl]);

  // Sync volume and mute with video element
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume / 100;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  // Sync play/pause with video element
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  // Channel changing handlers
  const handleSelectChannel = (channel: IPTVChannel) => {
    const targetIdx = channels.findIndex((c) => c.id === channel.id);
    if (targetIdx !== -1) {
      setSelectedChannelIndex(targetIdx);
      setIsPlaying(true);
      setStreamError(null);
      if (settings.soundEffects) sound.playClick();
      if (settings.voiceAssistance) {
        sound.speak(`Kanal ${channel.number}. ${channel.name}.`);
      }
    }
  };

  const handlePrevChannel = () => {
    if (channels.length === 0) return;
    let nextIdx = selectedChannelIndex - 1;
    if (nextIdx < 0) nextIdx = channels.length - 1;
    setSelectedChannelIndex(nextIdx);
    setIsPlaying(true);
    setStreamError(null);
    if (settings.soundEffects) sound.playClick();
    if (settings.voiceAssistance) {
      const ch = channels[nextIdx];
      sound.speak(`Kanal ${ch.number}. ${ch.name}.`);
    }
  };

  const handleNextChannel = () => {
    if (channels.length === 0) return;
    let nextIdx = selectedChannelIndex + 1;
    if (nextIdx >= channels.length) nextIdx = 0;
    setSelectedChannelIndex(nextIdx);
    setIsPlaying(true);
    setStreamError(null);
    if (settings.soundEffects) sound.playClick();
    if (settings.voiceAssistance) {
      const ch = channels[nextIdx];
      sound.speak(`Kanal ${ch.number}. ${ch.name}.`);
    }
  };

  const handleTogglePlay = () => {
    if (settings.soundEffects) sound.playClick();
    setIsPlaying(!isPlaying);
  };

  const handleVolumeUp = () => {
    if (settings.soundEffects) sound.playClick();
    setVolume((v) => Math.min(100, v + 10));
    setIsMuted(false);
  };

  const handleVolumeDown = () => {
    if (settings.soundEffects) sound.playClick();
    setVolume((v) => Math.max(0, v - 10));
  };

  const handleToggleMute = () => {
    if (settings.soundEffects) sound.playClick();
    setIsMuted(!isMuted);
  };

  const handleFullScreen = () => {
    if (settings.soundEffects) sound.playClick();
    if (playerContainerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        playerContainerRef.current.requestFullscreen();
      }
    }
  };

  const handleToggleCurrentFavorite = () => {
    if (!currentChannel) return;
    if (settings.soundEffects) sound.playClick();
    onToggleFavorite(currentChannel.id);
    if (settings.voiceAssistance) {
      sound.speak(
        currentChannel.isFavorite
          ? `${currentChannel.name} favorilerden çıkarıldı.`
          : `${currentChannel.name} favorilere eklendi.`
      );
    }
  };

  const handleSpeakChannelInfo = () => {
    if (!currentChannel) return;
    sound.speak(
      `Şu an izlenen kanal: ${currentChannel.number} numara, ${currentChannel.name}. Kategori: ${
        currentChannel.group || currentChannel.category
      }.`
    );
  };

  // M3U File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const result = parseM3U(content);
        if (result.channels.length > 0) {
          onSetChannels(result.channels);
          saveChannelsToStorage(result.channels);
          setSelectedChannelIndex(0);
          setShowManageModal(false);
          if (settings.soundEffects) sound.playSuccess();
          sound.speak(`${result.channels.length} adet televizyon kanalı başarıyla yüklendi.`);
        } else {
          alert('Dosya içinde geçerli kanal bulunamadı. Lütfen M3U formatında bir liste seçiniz.');
        }
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  // M3U URL Fetch
  const handleFetchM3UUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!m3uUrl.trim()) return;

    setIsFetchingUrl(true);
    setUrlFetchError(null);

    try {
      const response = await fetch(m3uUrl.trim());
      if (!response.ok) {
        throw new Error(`Sunucu yanıtı: ${response.status} ${response.statusText}`);
      }
      const text = await response.text();
      const result = parseM3U(text);

      if (result.channels.length > 0) {
        onSetChannels(result.channels);
        saveChannelsToStorage(result.channels);
        setSelectedChannelIndex(0);
        setShowManageModal(false);
        setM3uUrl('');
        if (settings.soundEffects) sound.playSuccess();
        sound.speak(`${result.channels.length} adet kanal internet üzerinden başarıyla yüklendi.`);
      } else {
        setUrlFetchError('Verilen bağlantıda geçerli M3U kanalı bulunamadı.');
      }
    } catch (err: any) {
      console.warn('URL Fetch error:', err);
      setUrlFetchError(
        'İnternet sağlayıcısının güvenlik engeli (CORS) veya sunucu hatası nedeniyle bu link doğrudan indirilemedi. Lütfen bağlantıyı yeni bir sekmede açıp tüm metni kopyalayarak "Metin Yapıştır" sekmesine yapıştırınız.'
      );
    } finally {
      setIsFetchingUrl(false);
    }
  };

  // M3U Pasted Text
  const handleApplyPastedText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedText.trim()) return;

    const result = parseM3U(pastedText);
    if (result.channels.length > 0) {
      onSetChannels(result.channels);
      saveChannelsToStorage(result.channels);
      setSelectedChannelIndex(0);
      setShowManageModal(false);
      setPastedText('');
      if (settings.soundEffects) sound.playSuccess();
      sound.speak(`${result.channels.length} adet kanal başarıyla kaydedildi.`);
    } else {
      alert('Yapıştırılan metin içinde geçerli kanal bulunamadı. Lütfen M3U formatında olduğundan emin olunuz.');
    }
  };

  // Single Channel Add
  const handleAddSingleChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleName.trim() || !singleUrl.trim()) return;

    const newChannel: IPTVChannel = {
      id: `manual-${Date.now()}`,
      number: channels.length + 1,
      name: singleName.trim(),
      category: singleGroup.trim() || 'Genel',
      group: singleGroup.trim() || 'Genel',
      streamUrl: singleUrl.trim(),
      badge: 'CANLI',
      currentProgram: 'Canlı Yayın',
      description: `${singleGroup} kategorisinde özel eklenmiş kanal.`,
      isFavorite: false,
    };

    onAddChannel(newChannel);
    setSelectedChannelIndex(channels.length);
    setShowManageModal(false);
    setSingleName('');
    setSingleUrl('');
    setSingleGroup('Genel');
    if (settings.soundEffects) sound.playSuccess();
    sound.speak(`${newChannel.name} kanalı listeye eklendi.`);
  };

  // Export Playlist as M3U file
  const handleDownloadBackup = () => {
    if (channels.length === 0) return;
    const content = exportToM3U(channels);
    const blob = new Blob([content], { type: 'audio/x-mpegurl;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `suat_iptv_kanallari_${new Date().toISOString().slice(0, 10)}.m3u`;
    link.click();
    URL.revokeObjectURL(url);
    if (settings.soundEffects) sound.playClick();
  };

  // Load a public HLS test stream for verification if user wishes to test player
  const handleLoadTestStream = () => {
    const testChannel: IPTVChannel = {
      id: 'test-stream-hls',
      number: 1,
      name: 'Örnek Test Yayını (HLS Test)',
      category: 'Test Yayını',
      group: 'Test Yayını',
      streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
      badge: 'HLS TEST',
      currentProgram: 'Deneme ve Ses Kontrol Yayını',
      description: 'Televizyon ve ses sisteminizi denemek için açık kaynaklı HLS test yayını.',
      isFavorite: true,
    };

    onSetChannels([testChannel]);
    setSelectedChannelIndex(0);
    setShowManageModal(false);
    if (settings.soundEffects) sound.playSuccess();
    sound.speak('Örnek test yayını yüklendi. Ses ve görüntü oynatılıyor.');
  };

  return (
    <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6">
      {/* Prominent Navigation Bar: Back to Suat Merkezi */}
      <div className="mb-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <button
          id="btn-iptv-back-home"
          onClick={() => {
            if (settings.soundEffects) sound.playClick();
            if (settings.voiceAssistance) {
              sound.speak('Suat Merkezi ana ekranına dönülüyor.');
            }
            onBackHome();
          }}
          className={`flex items-center justify-center gap-3.5 px-6 py-4 rounded-2xl font-black text-xl sm:text-2xl border-3 shadow-lg transition-transform active:scale-95 cursor-pointer ${
            settings.highContrast
              ? 'bg-yellow-400 hover:bg-yellow-300 text-black border-white ring-4 ring-yellow-500/40'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-800 ring-4 ring-emerald-500/20'
          }`}
          title="Suat Merkezi Ana Ekranına Dön"
        >
          <Home className="w-8 h-8 sm:w-9 sm:h-9 shrink-0" />
          <span>🏠 Suat Merkezi'ne Dön</span>
        </button>

        <div className="flex items-center gap-2 justify-end">
          <button
            id="btn-open-m3u-modal-top"
            onClick={() => {
              if (settings.soundEffects) sound.playClick();
              setShowManageModal(true);
            }}
            className="flex items-center justify-center gap-2 px-5 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-lg shadow-md border-2 border-red-800 active:scale-95 w-full sm:w-auto"
          >
            <Upload className="w-6 h-6 shrink-0" />
            <span>M3U Kanal Listesi Ekle</span>
          </button>
        </div>
      </div>

      {/* Top Banner with Current Channel Info */}
      <div
        className={`p-4 sm:p-6 rounded-3xl border-3 mb-6 shadow-md flex flex-col md:flex-row items-center justify-between gap-4 ${
          settings.highContrast
            ? 'bg-black border-red-500 text-white'
            : 'bg-red-50 border-red-300 text-red-950'
        }`}
      >
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-red-600 text-white rounded-2xl flex items-center justify-center font-black text-3xl shadow-md shrink-0">
            {currentChannel ? currentChannel.number : <Tv className="w-9 h-9" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 bg-red-600 text-white text-xs sm:text-sm font-black rounded-lg uppercase">
                {currentChannel ? currentChannel.badge || 'CANLI' : 'IPTV SİSTEMİ'}
              </span>
              <span className="text-sm sm:text-base font-bold text-slate-700 dark:text-yellow-300">
                {currentChannel ? currentChannel.group || currentChannel.category : 'Kanal Listesi'}
              </span>
              {currentChannel?.isFavorite && (
                <span className="px-2.5 py-0.5 bg-amber-500 text-white text-xs font-black rounded-md flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-current" /> Favorilerimde
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-4xl font-black truncate mt-0.5">
              {currentChannel ? currentChannel.name : 'Henüz Kanal Eklenmedi'}
            </h2>

            <p className="text-base sm:text-lg font-semibold opacity-90 truncate">
              {channels.length > 0
                ? `Toplam ${channels.length} kanal yüklü • ${allGroups.length} farklı grup`
                : 'M3U veya M3U8 kanal listenizi yükleyerek hemen başlayın.'}
            </p>
          </div>
        </div>

        {/* Action Buttons Top Right */}
        <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto justify-end flex-wrap">
          {currentChannel && (
            <>
              <button
                onClick={handleToggleCurrentFavorite}
                className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-base sm:text-lg border-2 active:scale-95 shadow-xs transition-colors ${
                  currentChannel.isFavorite
                    ? 'bg-amber-400 text-slate-950 border-amber-500 hover:bg-amber-300'
                    : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
                }`}
                title="Favorilere Ekle / Çıkar"
              >
                <Star
                  className={`w-6 h-6 ${
                    currentChannel.isFavorite ? 'fill-current text-slate-950' : 'text-amber-500'
                  }`}
                />
                <span>{currentChannel.isFavorite ? 'Favorilerimde' : 'Favoriye Ekle'}</span>
              </button>

              <button
                onClick={handleSpeakChannelInfo}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl font-bold text-base sm:text-lg bg-white text-slate-900 border-2 border-red-300 hover:bg-red-100 shadow-xs active:scale-95"
                title="Kanalı Sesli Dinle"
              >
                <Info className="w-6 h-6 text-red-600" />
                <span className="hidden sm:inline">Sesli Oku</span>
              </button>
            </>
          )}

          {/* Manage M3U Playlist Button */}
          <button
            id="btn-open-m3u-modal"
            onClick={() => {
              if (settings.soundEffects) sound.playClick();
              setShowManageModal(true);
            }}
            className="flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-base sm:text-lg shadow-md border-2 border-red-800 active:scale-95"
          >
            <Upload className="w-6 h-6" />
            <span>M3U Kanal Listesi Ekle</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 8 Cols: TV Screen Player & Senior Remote Control */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Television Frame Screen */}
          <div
            ref={playerContainerRef}
            className="relative w-full aspect-video bg-black rounded-3xl border-4 border-slate-800 shadow-2xl overflow-hidden flex items-center justify-center group"
          >
            {channels.length === 0 ? (
              // Empty State (No Channels Yet)
              <div className="flex flex-col items-center justify-center text-white p-6 text-center max-w-lg">
                <div className="w-20 h-20 rounded-full bg-red-950/60 border-2 border-red-500 flex items-center justify-center mb-4">
                  <Tv className="w-10 h-10 text-red-400" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-black mb-2">
                  Televizyonunuz Yayın Bekliyor
                </h3>
                <p className="text-base sm:text-lg text-slate-300 mb-6 leading-relaxed">
                  Şu an için kayıtlı kanal bulunmuyor. Bilgisayarınızdan M3U dosyasını seçerek veya bağlantı adresini girerek listenizi yükleyebilirsiniz.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                  <button
                    onClick={() => {
                      if (settings.soundEffects) sound.playClick();
                      setShowManageModal(true);
                    }}
                    className="px-6 py-4 bg-red-600 hover:bg-red-700 text-white font-black text-xl rounded-2xl flex items-center justify-center gap-3 shadow-lg active:scale-95"
                  >
                    <Upload className="w-6 h-6" />
                    <span>M3U Listesi Yükle</span>
                  </button>

                  <button
                    onClick={handleLoadTestStream}
                    className="px-5 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-lg rounded-2xl flex items-center justify-center gap-2 border border-slate-600 active:scale-95"
                  >
                    <Radio className="w-5 h-5 text-amber-400" />
                    <span>Örnek Test Yayını Dene</span>
                  </button>
                </div>
              </div>
            ) : streamError ? (
              // Stream Error Screen (Friendly Turkish error for seniors)
              <div className="flex flex-col items-center justify-center text-white p-6 sm:p-8 text-center max-w-xl bg-slate-950/90 rounded-2xl border-2 border-red-600">
                <div className="w-16 h-16 rounded-full bg-red-600/30 text-red-400 flex items-center justify-center mb-4 animate-bounce">
                  <AlertTriangle className="w-10 h-10" />
                </div>
                <h3 className="text-2xl sm:text-3xl font-black mb-2 text-red-400">
                  ⚠️ Yayın Açılamadı veya Şu Anda Çevrimdışı
                </h3>
                <p className="text-lg sm:text-xl font-semibold text-slate-200 mb-3">
                  <strong>{currentChannel.name}</strong> kanalının yayın sunucusuna ulaşılamıyor.
                </p>
                <p className="text-base text-slate-400 mb-6 leading-relaxed">
                  Yayın adresi değişmiş, geçici olarak yayını durdurulmuş veya internet bağlantısında kesinti yaşanmış olabilir.
                </p>

                <div className="flex flex-wrap gap-3 justify-center">
                  <button
                    onClick={() => {
                      setStreamError(null);
                      setIsLoadingStream(true);
                      // Force reload
                      if (videoRef.current) {
                        videoRef.current.load();
                      }
                    }}
                    className="px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white font-black text-lg rounded-xl flex items-center gap-2 shadow-md active:scale-95"
                  >
                    <RefreshCw className="w-5 h-5" />
                    <span>Yeniden Dene</span>
                  </button>

                  <button
                    onClick={handleNextChannel}
                    className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-lg rounded-xl flex items-center gap-2 shadow-md active:scale-95"
                  >
                    <ChevronDown className="w-5 h-5" />
                    <span>Sonraki Kanala Geç</span>
                  </button>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 text-xs font-mono text-slate-500 max-w-md truncate">
                  Adres: {currentChannel.streamUrl}
                </div>
              </div>
            ) : (
              // Active HTML5 Video Player
              <>
                <video
                  ref={videoRef}
                  className="w-full h-full object-contain bg-black"
                  playsInline
                  controls={false}
                  onClick={handleTogglePlay}
                />

                {/* Loading indicator overlay */}
                {isLoadingStream && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white pointer-events-none">
                    <RefreshCw className="w-12 h-12 text-red-500 animate-spin mb-3" />
                    <span className="text-2xl font-black">Yayın Yükleniyor...</span>
                    <span className="text-base text-slate-300 mt-1">{currentChannel.name}</span>
                  </div>
                )}

                {/* In-screen Channel overlay on top right */}
                <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-md px-4 py-2 rounded-xl border border-white/20 text-white flex items-center gap-2 pointer-events-none">
                  <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                  <span className="font-mono font-bold text-lg">
                    {currentChannel.number}. {currentChannel.name}
                  </span>
                </div>

                {/* Paused state overlay */}
                {!isPlaying && (
                  <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white p-4">
                    <div className="w-20 h-20 rounded-full bg-amber-500 flex items-center justify-center mb-4 shadow-xl">
                      <Pause className="w-10 h-10 fill-current text-white" />
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-black mb-2">Yayın Duraklatıldı</h3>
                    <p className="text-lg text-slate-300 mb-4">
                      {currentChannel.name} yayınını devam ettirmek için dokunun.
                    </p>
                    <button
                      onClick={handleTogglePlay}
                      className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-black text-2xl rounded-2xl flex items-center gap-3 shadow-lg active:scale-95"
                    >
                      <Play className="w-7 h-7 fill-current" />
                      <span>YAYINI OYNAT</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Senior Big Remote Control Panel */}
          <div
            className={`p-4 sm:p-6 rounded-3xl border-3 shadow-lg ${
              settings.highContrast
                ? 'bg-black border-yellow-400 text-white'
                : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="font-black text-lg sm:text-xl text-slate-600 dark:text-yellow-200 uppercase tracking-wider flex items-center gap-2">
                <span>🎮 Büyük Tuşlu Televizyon Kumandası</span>
              </div>
              {currentChannel && (
                <span className="font-bold text-base sm:text-lg text-slate-500">
                  Seçili: <strong>{currentChannel.name}</strong>
                </span>
              )}
            </div>

            {/* Main Action Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {/* Previous Channel Button */}
              <button
                id="btn-tv-prev-channel"
                onClick={handlePrevChannel}
                disabled={channels.length === 0}
                className="py-4 px-3 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-40 text-white rounded-2xl font-black text-lg sm:text-xl flex flex-col items-center justify-center gap-1 shadow-md border-2 border-blue-800"
              >
                <ChevronUp className="w-8 h-8" />
                <span>ÖNCEKİ KANAL</span>
              </button>

              {/* Next Channel Button */}
              <button
                id="btn-tv-next-channel"
                onClick={handleNextChannel}
                disabled={channels.length === 0}
                className="py-4 px-3 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-40 text-white rounded-2xl font-black text-lg sm:text-xl flex flex-col items-center justify-center gap-1 shadow-md border-2 border-blue-800"
              >
                <ChevronDown className="w-8 h-8" />
                <span>SONRAKİ KANAL</span>
              </button>

              {/* Play / Pause Toggle Button */}
              <button
                id="btn-tv-play-pause"
                onClick={handleTogglePlay}
                disabled={channels.length === 0}
                className={`py-4 px-3 rounded-2xl font-black text-lg sm:text-xl flex flex-col items-center justify-center gap-1 shadow-md border-2 active:scale-95 disabled:opacity-40 ${
                  isPlaying
                    ? 'bg-amber-500 hover:bg-amber-600 text-white border-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-800'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-8 h-8 fill-current" />
                    <span>DURDUR</span>
                  </>
                ) : (
                  <>
                    <Play className="w-8 h-8 fill-current" />
                    <span>OYNAT</span>
                  </>
                )}
              </button>

              {/* Fullscreen Button */}
              <button
                id="btn-tv-fullscreen"
                onClick={handleFullScreen}
                disabled={channels.length === 0}
                className="py-4 px-3 bg-purple-600 hover:bg-purple-700 active:scale-95 disabled:opacity-40 text-white rounded-2xl font-black text-lg sm:text-xl flex flex-col items-center justify-center gap-1 shadow-md border-2 border-purple-800"
              >
                <Maximize2 className="w-8 h-8" />
                <span>TAM EKRAN</span>
              </button>
            </div>

            {/* Volume Control Bar with Big Buttons */}
            <div className="mt-4 pt-4 border-t-2 border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={handleVolumeDown}
                  className="px-5 py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-xl font-black text-xl border-2 border-slate-300 active:scale-95"
                  title="Sesi Azalt"
                >
                  🔉 - Sesi Kıs
                </button>
                <button
                  onClick={handleVolumeUp}
                  className="px-5 py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-xl font-black text-xl border-2 border-slate-300 active:scale-95"
                  title="Sesi Arttır"
                >
                  🔊 + Sesi Aç
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleToggleMute}
                  className={`flex items-center gap-2 px-5 py-3.5 rounded-xl font-black text-xl border-2 active:scale-95 ${
                    isMuted
                      ? 'bg-red-600 text-white border-red-800'
                      : 'bg-slate-200 text-slate-800 border-slate-300 hover:bg-slate-300'
                  }`}
                >
                  {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                  <span>{isMuted ? 'Sessiz Aç' : 'Sesi Kapat'}</span>
                </button>
                <span className="font-extrabold text-2xl px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-300 min-w-[120px] text-center">
                  Ses: %{isMuted ? 0 : volume}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Channel Search, Group Tabs & Channels List */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div
            className={`p-4 sm:p-5 rounded-3xl border-3 shadow-md flex flex-col ${
              settings.highContrast
                ? 'bg-black border-red-400 text-white'
                : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            {/* Header with channel count & add button */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-2xl font-black flex items-center gap-2">
                <Tv className="w-7 h-7 text-red-600" />
                <span>Kanallar ({channels.length})</span>
              </h3>
              <button
                onClick={() => {
                  if (settings.soundEffects) sound.playClick();
                  setShowManageModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm sm:text-base shadow-xs"
                title="M3U Listesi Ekle / Yönet"
              >
                <Plus className="w-5 h-5" />
                <span>M3U Ekle</span>
              </button>
            </div>

            {/* Channel Search Input */}
            <div className="relative mb-3">
              <Search className="w-6 h-6 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Kanal Ara (Ad, numara veya grup)..."
                className="w-full pl-12 pr-10 py-3.5 rounded-2xl border-2 border-slate-300 text-lg font-bold placeholder:text-slate-400 focus:border-red-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Groups & Favorites Filter Chips */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-thin">
              <button
                onClick={() => {
                  if (settings.soundEffects) sound.playClick();
                  setSelectedGroup('Tümü');
                }}
                className={`px-3.5 py-2 rounded-xl font-extrabold text-sm whitespace-nowrap transition-all border-2 ${
                  selectedGroup === 'Tümü'
                    ? 'bg-red-600 text-white border-red-700 shadow-sm'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                Tümü ({channels.length})
              </button>

              {favoritesCount > 0 && (
                <button
                  onClick={() => {
                    if (settings.soundEffects) sound.playClick();
                    setSelectedGroup('⭐ Favorilerim');
                  }}
                  className={`px-3.5 py-2 rounded-xl font-extrabold text-sm whitespace-nowrap transition-all border-2 flex items-center gap-1.5 ${
                    selectedGroup === '⭐ Favorilerim'
                      ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm'
                      : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                  }`}
                >
                  <Star className="w-4 h-4 fill-current" />
                  <span>Favorilerim ({favoritesCount})</span>
                </button>
              )}

              {allGroups.map((grp) => {
                const count = channels.filter((c) => (c.group || c.category) === grp).length;
                const isSelected = selectedGroup === grp;
                return (
                  <button
                    key={grp}
                    onClick={() => {
                      if (settings.soundEffects) sound.playClick();
                      setSelectedGroup(grp);
                    }}
                    className={`px-3.5 py-2 rounded-xl font-extrabold text-sm whitespace-nowrap transition-all border-2 ${
                      isSelected
                        ? 'bg-red-600 text-white border-red-700 shadow-sm'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {grp} ({count})
                  </button>
                );
              })}
            </div>

            {/* Channel List Container */}
            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
              {filteredChannels.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-300">
                  <Tv className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                  <p className="text-xl font-black text-slate-700 dark:text-slate-300">
                    {channels.length === 0
                      ? 'Listenizde kanal bulunmuyor.'
                      : 'Aradığınız kriterde kanal bulunamadı.'}
                  </p>
                  {channels.length === 0 ? (
                    <button
                      onClick={() => setShowManageModal(true)}
                      className="mt-4 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-black text-lg rounded-xl shadow-md"
                    >
                      M3U Listesi Ekle
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedGroup('Tümü');
                      }}
                      className="mt-3 px-4 py-2 text-red-600 font-bold underline"
                    >
                      Filtreleri Temizle
                    </button>
                  )}
                </div>
              ) : (
                filteredChannels.map((ch) => {
                  const isSelected = currentChannel?.id === ch.id;
                  return (
                    <div
                      key={ch.id}
                      className={`w-full text-left p-3.5 rounded-2xl border-3 transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-red-600 text-white border-red-800 shadow-lg ring-4 ring-red-300'
                          : settings.highContrast
                          ? 'bg-slate-900 text-white border-slate-700 hover:bg-slate-800'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-900 border-slate-200 shadow-xs'
                      }`}
                    >
                      {/* Main Clickable Area to switch channel */}
                      <div
                        onClick={() => handleSelectChannel(ch)}
                        className="flex items-center gap-3 flex-1 cursor-pointer min-w-0"
                      >
                        {/* Channel Number / Logo */}
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl shrink-0 overflow-hidden ${
                            isSelected
                              ? 'bg-white text-red-600'
                              : 'bg-slate-200 text-slate-800'
                          }`}
                        >
                          {ch.logo ? (
                            <img
                              src={ch.logo}
                              alt={ch.name}
                              className="w-full h-full object-contain p-1"
                              onError={(e) => {
                                // fallback to number if logo fails
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <span>{ch.number}</span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="font-black text-lg leading-tight truncate">
                            {ch.name}
                          </div>
                          <div
                            className={`text-xs font-bold truncate ${
                              isSelected ? 'text-red-100' : 'text-slate-500'
                            }`}
                          >
                            {ch.group || ch.category || 'Genel'}
                          </div>
                        </div>
                      </div>

                      {/* Favorite Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (settings.soundEffects) sound.playClick();
                          onToggleFavorite(ch.id);
                        }}
                        className={`p-2 rounded-xl transition-colors ${
                          ch.isFavorite
                            ? 'text-amber-400 hover:text-amber-300'
                            : isSelected
                            ? 'text-red-200 hover:text-white'
                            : 'text-slate-400 hover:text-amber-500'
                        }`}
                        title={ch.isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
                      >
                        <Star className={`w-6 h-6 ${ch.isFavorite ? 'fill-current' : ''}`} />
                      </button>

                      {isSelected && (
                        <span className="px-2.5 py-1 rounded-lg bg-white/20 text-white font-black text-xs uppercase tracking-wider shrink-0">
                          İZLENİYOR
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* M3U Playlist & Channels Management Modal */}
      {showManageModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-8 max-w-2xl w-full border-4 border-red-600 shadow-2xl text-slate-900 my-8">
            <div className="flex items-center justify-between mb-4 border-b pb-4">
              <h3 className="text-2xl sm:text-3xl font-black flex items-center gap-3 text-red-700">
                <Film className="w-8 h-8" />
                <span>M3U / M3U8 Kanal Listesi Ekle</span>
              </h3>
              <button
                onClick={() => setShowManageModal(false)}
                className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                <X className="w-6 h-6 text-slate-700" />
              </button>
            </div>

            {/* Tabs for Add Methods */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
              <button
                onClick={() => setModalTab('file')}
                className={`p-3 rounded-xl font-black text-base flex flex-col items-center gap-1 border-2 transition-all ${
                  modalTab === 'file'
                    ? 'bg-red-600 text-white border-red-800 shadow-md'
                    : 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
                }`}
              >
                <Upload className="w-5 h-5" />
                <span>Dosya Seç</span>
              </button>

              <button
                onClick={() => setModalTab('url')}
                className={`p-3 rounded-xl font-black text-base flex flex-col items-center gap-1 border-2 transition-all ${
                  modalTab === 'url'
                    ? 'bg-red-600 text-white border-red-800 shadow-md'
                    : 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
                }`}
              >
                <Link className="w-5 h-5" />
                <span>İnternet Linki</span>
              </button>

              <button
                onClick={() => setModalTab('paste')}
                className={`p-3 rounded-xl font-black text-base flex flex-col items-center gap-1 border-2 transition-all ${
                  modalTab === 'paste'
                    ? 'bg-red-600 text-white border-red-800 shadow-md'
                    : 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
                }`}
              >
                <FileText className="w-5 h-5" />
                <span>Metin Yapıştır</span>
              </button>

              <button
                onClick={() => setModalTab('single')}
                className={`p-3 rounded-xl font-black text-base flex flex-col items-center gap-1 border-2 transition-all ${
                  modalTab === 'single'
                    ? 'bg-red-600 text-white border-red-800 shadow-md'
                    : 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
                }`}
              >
                <Plus className="w-5 h-5" />
                <span>Tek Kanal</span>
              </button>
            </div>

            {/* TAB 1: FILE PICKER */}
            {modalTab === 'file' && (
              <div className="space-y-4">
                <p className="text-lg font-bold text-slate-700">
                  Bilgisayarınızda veya cihazınızda kayıtlı olan <strong>.m3u</strong>, <strong>.m3u8</strong> veya <strong>.txt</strong> formatındaki kanal dosyasını seçin:
                </p>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-3 border-dashed border-red-400 p-8 rounded-2xl text-center cursor-pointer hover:bg-red-50 transition-colors"
                >
                  <Upload className="w-16 h-16 text-red-600 mx-auto mb-3" />
                  <p className="text-xl font-black text-red-900 mb-1">
                    M3U Dosyası Seçmek İçin Buraya Dokunun
                  </p>
                  <span className="text-base text-slate-500 font-semibold">
                    (Dosyayı seçtiğinizde kanal adları ve gruplar otomatik okunacaktır)
                  </span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".m3u,.m3u8,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            )}

            {/* TAB 2: URL FETCH */}
            {modalTab === 'url' && (
              <form onSubmit={handleFetchM3UUrl} className="space-y-4">
                <p className="text-lg font-bold text-slate-700">
                  İnternet üzerindeki M3U veya M3U8 çalma listesi bağlantınızı (URL) girin:
                </p>

                <div>
                  <label className="block text-lg font-bold mb-2">M3U Listesi Web Adresi:</label>
                  <input
                    type="url"
                    required
                    placeholder="https://example.com/playlist.m3u"
                    value={m3uUrl}
                    onChange={(e) => setM3uUrl(e.target.value)}
                    className="w-full p-4 rounded-xl border-2 border-slate-300 text-lg font-semibold focus:border-red-500 focus:outline-none"
                  />
                </div>

                {urlFetchError && (
                  <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl text-amber-950 font-bold text-base flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                    <div>{urlFetchError}</div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isFetchingUrl}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black text-xl rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isFetchingUrl ? (
                    <>
                      <RefreshCw className="w-6 h-6 animate-spin" />
                      <span>İndiriliyor ve Kanallar Okunuyor...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-6 h-6" />
                      <span>Listeyi İndir ve Kaydet</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* TAB 3: PASTE TEXT */}
            {modalTab === 'paste' && (
              <form onSubmit={handleApplyPastedText} className="space-y-4">
                <p className="text-lg font-bold text-slate-700">
                  M3U dosyasının metin içeriğini doğrudan aşağıdaki alana yapıştırabilirsiniz:
                </p>

                <div>
                  <textarea
                    rows={8}
                    required
                    placeholder={`#EXTM3U\n#EXTINF:-1 tvg-name="TRT 1" group-title="Ulusal",TRT 1 HD\nhttps://example.com/live/trt1.m3u8\n#EXTINF:-1 tvg-name="Kanal D" group-title="Ulusal",Kanal D\nhttps://example.com/live/kanald.m3u8`}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    className="w-full p-4 rounded-xl border-2 border-slate-300 font-mono text-sm leading-relaxed focus:border-red-500 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black text-xl rounded-xl shadow-lg flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-6 h-6" />
                  <span>Metni Ayrıştır ve Kanalları Kaydet</span>
                </button>
              </form>
            )}

            {/* TAB 4: SINGLE CHANNEL ADD */}
            {modalTab === 'single' && (
              <form onSubmit={handleAddSingleChannel} className="space-y-4">
                <div>
                  <label className="block text-lg font-bold mb-1">Kanal Adı:</label>
                  <input
                    type="text"
                    required
                    placeholder="Örn: TRT Spor veya Yeşilçam Sinema"
                    value={singleName}
                    onChange={(e) => setSingleName(e.target.value)}
                    className="w-full p-3.5 rounded-xl border-2 border-slate-300 text-lg font-bold"
                  />
                </div>

                <div>
                  <label className="block text-lg font-bold mb-1">Grup / Kategori:</label>
                  <input
                    type="text"
                    placeholder="Örn: Ulusal, Haber, Spor, Sinema..."
                    value={singleGroup}
                    onChange={(e) => setSingleGroup(e.target.value)}
                    className="w-full p-3.5 rounded-xl border-2 border-slate-300 text-lg font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-lg font-bold mb-1">Yayın Adresi (Stream / M3U8 URL):</label>
                  <input
                    type="url"
                    required
                    placeholder="https://.../stream.m3u8"
                    value={singleUrl}
                    onChange={(e) => setSingleUrl(e.target.value)}
                    className="w-full p-3.5 rounded-xl border-2 border-slate-300 text-lg font-semibold"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white font-black text-xl rounded-xl shadow-lg flex items-center justify-center gap-2"
                >
                  <Plus className="w-6 h-6" />
                  <span>Bu Kanalı Listeye Ekle</span>
                </button>
              </form>
            )}

            {/* Existing channels management row */}
            {channels.length > 0 && (
              <div className="mt-8 pt-6 border-t-2 border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="flex items-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-base"
                >
                  <Download className="w-5 h-5" />
                  <span>Listeyi M3U Olarak İndir (Yedekle)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Tüm kanal listesini silmek istediğinizden emin misiniz?')) {
                      onClearChannels();
                      clearChannelsStorage();
                      setShowManageModal(false);
                      if (settings.soundEffects) sound.playClick();
                      sound.speak('Kanal listesi temizlendi.');
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl font-bold text-base"
                >
                  <Trash2 className="w-5 h-5" />
                  <span>Kanal Listesini Temizle</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
