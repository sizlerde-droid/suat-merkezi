import React, { useState, useRef, useEffect } from 'react';
import { TabType, AppSettings, DownloadedMediaItem } from '../types';
import {
  Globe,
  Home,
  Tv,
  Music,
  Download,
  FolderDown,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize,
  ExternalLink,
  Upload,
  Mic,
  Square,
  Sparkles,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileAudio,
  FileVideo,
  FileText,
  ShieldCheck,
  Search,
  FastForward,
  Rewind,
} from 'lucide-react';
import { sound } from '../utils/audio';

interface InternetMedyaProps {
  onBackHome: () => void;
  onNavigate: (tab: TabType) => void;
  settings: AppSettings;
}

type SubSection = 'youtube' | 'facebook' | 'muzik' | 'araclar' | 'indirilenler';

// WAV encoder from AudioBuffer
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new DataView(new ArrayBuffer(length));
  let pos = 0;

  const writeString = (str: string) => {
    for (let i = 0; i < str.length; i++) {
      out.setUint8(pos++, str.charCodeAt(i));
    }
  };

  writeString('RIFF');
  out.setUint32(pos, length - 8, true);
  pos += 4;
  writeString('WAVE');
  writeString('fmt ');
  out.setUint32(pos, 16, true);
  pos += 4;
  out.setUint16(pos, 1, true); // PCM
  pos += 2;
  out.setUint16(pos, numOfChan, true);
  pos += 2;
  out.setUint32(pos, buffer.sampleRate, true);
  pos += 4;
  out.setUint32(pos, buffer.sampleRate * 2 * numOfChan, true);
  pos += 4;
  out.setUint16(pos, numOfChan * 2, true);
  pos += 2;
  out.setUint16(pos, 16, true);
  pos += 2;
  writeString('data');
  out.setUint32(pos, length - pos - 4, true);
  pos += 4;

  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numOfChan; ch++) {
      let sample = buffer.getChannelData(ch)[i];
      sample = Math.max(-1, Math.min(1, sample));
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      out.setInt16(pos, sample, true);
      pos += 2;
    }
  }

  return new Blob([out], { type: 'audio/wav' });
}

export const InternetMedya: React.FC<InternetMedyaProps> = ({
  onBackHome,
  onNavigate,
  settings,
}) => {
  const [activeSection, setActiveSection] = useState<SubSection>('youtube');

  // Local Media Player State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [mediaSrc, setMediaSrc] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'video' | 'audio' | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Microphone Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  // Downloads List State with localStorage persistence
  const [downloads, setDownloads] = useState<DownloadedMediaItem[]>(() => {
    try {
      const saved = localStorage.getItem('suat_downloads');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return [
      {
        id: 'sample-1',
        name: 'Nostalji_Zil_Sesi_Nihavend.wav',
        type: 'audio',
        size: '340 KB',
        date: '2026-09-09',
        source: 'İzinli Telifsiz Melodi',
      },
      {
        id: 'sample-2',
        name: 'Yesilcam_Muhasebe_Yedek_2026-09.json',
        type: 'document',
        size: '14 KB',
        date: '2026-09-09',
        source: 'Yeşilçam Muhasebe',
      },
    ];
  });

  const [notification, setNotification] = useState<string | null>(null);

  // Save downloads to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('suat_downloads', JSON.stringify(downloads));
    } catch {
      // ignore
    }
  }, [downloads]);

  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // Safe navigation to external site
  const handleOpenExternal = (url: string, siteName: string) => {
    if (settings.soundEffects) sound.playClick();
    if (settings.voiceAssistance) {
      sound.speak(`${siteName} web sitesi yeni sekmede açılıyor.`);
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Switch Sub-section
  const handleTabChange = (sec: SubSection, title: string) => {
    if (settings.soundEffects) sound.playClick();
    if (settings.voiceAssistance) {
      sound.speak(`${title} bölümü açıldı.`);
    }
    setActiveSection(sec);
  };

  // Handle local file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (settings.soundEffects) sound.playClick();

    // revoke previous blob URL if any
    if (mediaSrc && mediaSrc.startsWith('blob:')) {
      URL.revokeObjectURL(mediaSrc);
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setMediaSrc(url);

    if (file.type.startsWith('video/')) {
      setMediaType('video');
    } else {
      setMediaType('audio');
    }
    setIsPlaying(false);
    setCurrentTime(0);

    const typeLabel = file.type.startsWith('video/') ? 'Video' : 'Ses';
    showToast(`"${file.name}" seçildi. Oynatmaya hazır!`);
    if (settings.voiceAssistance) {
      sound.speak(`${file.name} adlı ${typeLabel} dosyası yüklendi.`);
    }
  };

  // Player controls
  const activeMediaElement = mediaType === 'video' ? videoRef.current : audioRef.current;

  const togglePlay = () => {
    if (!activeMediaElement) return;
    if (settings.soundEffects) sound.playClick();

    if (isPlaying) {
      activeMediaElement.pause();
      setIsPlaying(false);
    } else {
      activeMediaElement
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          showToast('Medya oynatılamadı. Lütfen geçerli bir dosya seçiniz.');
        });
    }
  };

  const handleSeek = (seconds: number) => {
    if (!activeMediaElement) return;
    if (settings.soundEffects) sound.playClick();
    activeMediaElement.currentTime = Math.max(0, Math.min(duration, activeMediaElement.currentTime + seconds));
  };

  const handleRestart = () => {
    if (!activeMediaElement) return;
    if (settings.soundEffects) sound.playClick();
    activeMediaElement.currentTime = 0;
    activeMediaElement.play().then(() => setIsPlaying(true));
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen?.();
      }
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (activeMediaElement) {
      activeMediaElement.volume = newVol;
    }
    if (newVol > 0 && isMuted) {
      setIsMuted(false);
      if (activeMediaElement) activeMediaElement.muted = false;
    }
  };

  const toggleMute = () => {
    if (!activeMediaElement) return;
    if (settings.soundEffects) sound.playClick();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    activeMediaElement.muted = nextMuted;
  };

  const changePlaybackRate = (rate: number) => {
    if (settings.soundEffects) sound.playClick();
    setPlaybackRate(rate);
    if (activeMediaElement) {
      activeMediaElement.playbackRate = rate;
    }
  };

  // Start microphone voice recording
  const startRecording = async () => {
    try {
      if (settings.soundEffects) sound.playClick();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setRecordedAudioBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setRecordedAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      showToast('Mikrofon kaydı başladı. Konuşabilirsiniz.');
      if (settings.voiceAssistance) {
        sound.speak('Mikrofon kaydı başladı. Konuşmanızı bitirince kırmızı düğmeye basınız.');
      }
    } catch {
      showToast('Mikrofon izni verilemedi veya tarayıcı desteklemiyor.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    if (settings.soundEffects) sound.playClick();

    mediaRecorderRef.current.stop();
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    showToast('Kayıt tamamlandı! Aşağıdan dinleyebilir veya indirebilirsiniz.');
    if (settings.voiceAssistance) {
      sound.speak('Ses kaydı tamamlandı. Kaydınızı dinleyebilir veya bilgisayarınıza indirebilirsiniz.');
    }
  };

  // Save recorded audio to Downloads and trigger download
  const handleSaveRecording = () => {
    if (!recordedAudioBlob) return;
    if (settings.soundEffects) sound.playSuccess();

    const timestamp = new Date().toISOString().slice(0, 10);
    const fileName = `Suat_Ses_Kaydi_${timestamp}.wav`;

    const downloadUrl = URL.createObjectURL(recordedAudioBlob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    const newItem: DownloadedMediaItem = {
      id: 'rec-' + Date.now(),
      name: fileName,
      type: 'audio',
      size: `${Math.round(recordedAudioBlob.size / 1024)} KB`,
      date: new Date().toLocaleDateString('tr-TR'),
      blobUrl: downloadUrl,
      source: 'Kişisel Ses Kaydı',
    };

    setDownloads((prev) => [newItem, ...prev]);
    showToast(`"${fileName}" bilgisayarınıza indirildi ve İndirilenler listesine eklendi.`);
  };

  // Generate a classic royalty-free Turkish classical motif (Nihavend/Hicaz) WAV file
  const handleGeneratePermittedMelody = async () => {
    if (settings.soundEffects) sound.playClick();
    showToast('Nostalji melodisi hazırlanıyor...');

    try {
      const sampleRate = 44100;
      const durationSec = 4.5;
      const totalFrames = sampleRate * durationSec;
      const offlineCtx = new OfflineAudioContext(1, totalFrames, sampleRate);

      // Classic Turkish Music melody notes (Nihavend pentachord frequencies)
      // D4, E4, F4, G4, A4, G4, F4, E4, D4
      const melody = [
        { freq: 293.66, dur: 0.45 }, // Re
        { freq: 329.63, dur: 0.45 }, // Mi
        { freq: 349.23, dur: 0.45 }, // Fa
        { freq: 392.0, dur: 0.7 },  // Sol
        { freq: 440.0, dur: 0.6 },  // La
        { freq: 392.0, dur: 0.4 },  // Sol
        { freq: 349.23, dur: 0.4 }, // Fa
        { freq: 329.63, dur: 0.4 }, // Mi
        { freq: 293.66, dur: 0.9 }, // Re (long)
      ];

      let startTime = 0.1;
      melody.forEach((note) => {
        const osc = offlineCtx.createOscillator();
        const gain = offlineCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(note.freq, startTime);

        // Acoustic decay curve
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.35, startTime + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + note.dur);

        osc.connect(gain);
        gain.connect(offlineCtx.destination);

        osc.start(startTime);
        osc.stop(startTime + note.dur);

        startTime += note.dur * 0.95;
      });

      const renderedBuffer = await offlineCtx.startRendering();
      const wavBlob = audioBufferToWav(renderedBuffer);
      const url = URL.createObjectURL(wavBlob);

      const fileName = `Nostalji_Zil_Sesi_${Date.now().toString().slice(-4)}.wav`;
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      const newItem: DownloadedMediaItem = {
        id: 'mel-' + Date.now(),
        name: fileName,
        type: 'audio',
        size: `${Math.round(wavBlob.size / 1024)} KB`,
        date: new Date().toLocaleDateString('tr-TR'),
        blobUrl: url,
        source: 'İzinli Telifsiz Melodi',
      };

      setDownloads((prev) => [newItem, ...prev]);
      if (settings.soundEffects) sound.playSuccess();
      showToast(`"${fileName}" oluşturuldu ve İndirilenler listesine kaydedildi!`);
      if (settings.voiceAssistance) {
        sound.speak('Nostalji melodisi bilgisayarınıza indirildi ve İndirilenler listesine eklendi.');
      }
    } catch {
      showToast('Melodi oluşturulurken bir hata oluştu.');
    }
  };

  // Re-download item from list
  const handleDownloadItem = (item: DownloadedMediaItem) => {
    if (settings.soundEffects) sound.playClick();
    if (item.blobUrl) {
      const a = document.createElement('a');
      a.href = item.blobUrl;
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast(`"${item.name}" tekrar indiriliyor.`);
    } else {
      // Create text/json blob for documents or sample
      const blob = new Blob([JSON.stringify({ title: item.name, date: item.date }, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast(`"${item.name}" indirildi.`);
    }
  };

  // Play item from list in the player
  const handlePlayDownloadedItem = (item: DownloadedMediaItem) => {
    if (settings.soundEffects) sound.playClick();
    if (item.blobUrl) {
      setMediaSrc(item.blobUrl);
      setMediaType(item.type === 'video' ? 'video' : 'audio');
      setSelectedFile(new File([], item.name));
      setActiveSection('araclar');
      showToast(`"${item.name}" oynatıcıya yüklendi.`);
      if (settings.voiceAssistance) {
        sound.speak(`${item.name} oynatıcıya yüklendi.`);
      }
    } else {
      showToast(`Bu dosya için canlı önizleme oluşturulamadı.`);
    }
  };

  // Delete from downloads
  const handleDeleteDownload = (id: string, name: string) => {
    if (settings.soundEffects) sound.playClick();
    setDownloads((prev) => prev.filter((d) => d.id !== id));
    showToast(`"${name}" listeden kaldırıldı.`);
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      id="internet-medya-view"
      className={`min-h-full py-5 px-3 sm:px-6 transition-colors ${
        settings.highContrast ? 'bg-black text-white' : 'bg-slate-50 text-slate-900'
      }`}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Control Bar: Home button & Title */}
        <div
          className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl border-3 shadow-md ${
            settings.highContrast
              ? 'bg-black border-yellow-400 text-yellow-300'
              : 'bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900 border-indigo-700 text-white'
          }`}
        >
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              id="btn-back-home-internet"
              onClick={() => {
                if (settings.soundEffects) sound.playClick();
                if (settings.voiceAssistance) sound.speak('Ana ekrana dönülüyor.');
                onBackHome();
              }}
              className="flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-lg sm:text-xl shadow-lg transform active:scale-95 transition-all cursor-pointer border-2 border-amber-200"
            >
              <Home className="w-7 h-7" />
              <span>🏠 Suat Merkezi'ne Dön</span>
            </button>
          </div>

          <div className="text-center sm:text-right">
            <span className="inline-block px-3 py-1 rounded-full bg-white/20 text-xs sm:text-sm font-black tracking-wider uppercase mb-1">
              GÜVENLİ İNTERNET & MEDYA
            </span>
            <h1 className="text-2xl sm:text-3xl font-black">🌐 İnternet & Medya Merkezi</h1>
            <p className="text-sm sm:text-base text-indigo-100 font-medium">
              YouTube, Facebook, Müzik ve Kişisel Medya Araçları
            </p>
          </div>
        </div>

        {/* Toast Notification */}
        {notification && (
          <div
            role="status"
            className="p-4 rounded-2xl bg-emerald-600 text-white font-bold text-lg flex items-center gap-3 shadow-lg animate-fade-in border-2 border-emerald-400"
          >
            <CheckCircle2 className="w-7 h-7 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* The 5 Big Option Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* 1. YouTube */}
          <button
            id="btn-nav-youtube"
            onClick={() => handleTabChange('youtube', 'YouTube')}
            className={`flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl border-3 shadow-sm transition-all cursor-pointer font-black text-lg text-center ${
              activeSection === 'youtube'
                ? settings.highContrast
                  ? 'bg-yellow-400 text-black border-white'
                  : 'bg-red-600 text-white border-red-700 shadow-md ring-4 ring-red-300'
                : settings.highContrast
                ? 'bg-black text-white border-yellow-400 hover:bg-zinc-900'
                : 'bg-white hover:bg-red-50 text-slate-800 border-slate-300'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-2 shadow-xs">
              <Play className="w-7 h-7 fill-red-600" />
            </div>
            <span>▶️ YouTube</span>
            <span className="text-xs font-semibold mt-1 opacity-85">Videolar & Filmler</span>
          </button>

          {/* 2. Facebook */}
          <button
            id="btn-nav-facebook"
            onClick={() => handleTabChange('facebook', 'Facebook')}
            className={`flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl border-3 shadow-sm transition-all cursor-pointer font-black text-lg text-center ${
              activeSection === 'facebook'
                ? settings.highContrast
                  ? 'bg-yellow-400 text-black border-white'
                  : 'bg-blue-600 text-white border-blue-700 shadow-md ring-4 ring-blue-300'
                : settings.highContrast
                ? 'bg-black text-white border-yellow-400 hover:bg-zinc-900'
                : 'bg-white hover:bg-blue-50 text-slate-800 border-slate-300'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-2 shadow-xs">
              <Globe className="w-7 h-7" />
            </div>
            <span>👍 Facebook</span>
            <span className="text-xs font-semibold mt-1 opacity-85">Dostlar & Aile</span>
          </button>

          {/* 3. Müzik */}
          <button
            id="btn-nav-muzik"
            onClick={() => handleTabChange('muzik', 'Müzik')}
            className={`flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl border-3 shadow-sm transition-all cursor-pointer font-black text-lg text-center ${
              activeSection === 'muzik'
                ? settings.highContrast
                  ? 'bg-yellow-400 text-black border-white'
                  : 'bg-amber-600 text-white border-amber-700 shadow-md ring-4 ring-amber-300'
                : settings.highContrast
                ? 'bg-black text-white border-yellow-400 hover:bg-zinc-900'
                : 'bg-white hover:bg-amber-50 text-slate-800 border-slate-300'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-2 shadow-xs">
              <Music className="w-7 h-7" />
            </div>
            <span>🎵 Müzik</span>
            <span className="text-xs font-semibold mt-1 opacity-85">SuatMuzik Çalar</span>
          </button>

          {/* 4. Medya Araçları */}
          <button
            id="btn-nav-araclar"
            onClick={() => handleTabChange('araclar', 'Medya Araçları')}
            className={`flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl border-3 shadow-sm transition-all cursor-pointer font-black text-lg text-center ${
              activeSection === 'araclar'
                ? settings.highContrast
                  ? 'bg-yellow-400 text-black border-white'
                  : 'bg-indigo-600 text-white border-indigo-700 shadow-md ring-4 ring-indigo-300'
                : settings.highContrast
                ? 'bg-black text-white border-yellow-400 hover:bg-zinc-900'
                : 'bg-white hover:bg-indigo-50 text-slate-800 border-slate-300'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-2 shadow-xs">
              <Download className="w-7 h-7" />
            </div>
            <span>⬇️ Medya Araçları</span>
            <span className="text-xs font-semibold mt-1 opacity-85">Oynatıcı & Kayıt</span>
          </button>

          {/* 5. İndirilenler */}
          <button
            id="btn-nav-indirilenler"
            onClick={() => handleTabChange('indirilenler', 'İndirilenler')}
            className={`col-span-2 sm:col-span-1 flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl border-3 shadow-sm transition-all cursor-pointer font-black text-lg text-center ${
              activeSection === 'indirilenler'
                ? settings.highContrast
                  ? 'bg-yellow-400 text-black border-white'
                  : 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-4 ring-emerald-300'
                : settings.highContrast
                ? 'bg-black text-white border-yellow-400 hover:bg-zinc-900'
                : 'bg-white hover:bg-emerald-50 text-slate-800 border-slate-300'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-2 shadow-xs">
              <FolderDown className="w-7 h-7" />
            </div>
            <span>📥 İndirilenler</span>
            <span className="text-xs font-semibold mt-1 opacity-85">
              {downloads.length} Dosya Kayıtlı
            </span>
          </button>
        </div>

        {/* SECTION 1: YOUTUBE */}
        {activeSection === 'youtube' && (
          <div className="space-y-6">
            <div
              className={`p-6 sm:p-8 rounded-3xl border-3 shadow-md ${
                settings.highContrast
                  ? 'bg-black border-red-500 text-white'
                  : 'bg-white border-red-200'
              }`}
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-lg shrink-0">
                    <Play className="w-9 h-9 fill-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                      ▶️ YouTube Resmi Web Sitesi
                    </h2>
                    <p className="text-base sm:text-lg text-slate-600 dark:text-zinc-300 font-medium mt-1">
                      Milyonlarca nostaljik Yeşilçam filmi, Türk Sanat Müziği ve canlı yayınları güvenle izleyin.
                    </p>
                  </div>
                </div>

                {/* Primary Safe External Link */}
                <button
                  id="btn-open-youtube-official"
                  onClick={() => handleOpenExternal('https://www.youtube.com', 'YouTube')}
                  className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xl shadow-xl transition-all cursor-pointer border-2 border-red-400 transform active:scale-95"
                >
                  <Play className="w-7 h-7 fill-white" />
                  <span>YouTube'u Yeni Sekmede Aç</span>
                  <ExternalLink className="w-6 h-6" />
                </button>
              </div>

              {/* Safety banner for seniors */}
              <div className="mt-6 p-4 rounded-2xl bg-blue-50 dark:bg-zinc-900 border-2 border-blue-200 dark:border-zinc-700 flex items-start gap-3">
                <ShieldCheck className="w-7 h-7 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-sm sm:text-base text-slate-700 dark:text-zinc-200">
                  <strong className="text-slate-900 dark:text-white font-extrabold">Güvenli Bağlantı Bilgisi:</strong> Yukarıdaki düğmeye bastığınızda YouTube resmi sitesi tarayıcınızın yeni bir sekmesinde güvenli olarak açılacaktır. İstediğiniz zaman bu sekmeye geri dönebilirsiniz.
                </div>
              </div>

              {/* Quick Senior Search Shortcuts */}
              <div className="mt-8">
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Search className="w-6 h-6 text-red-600" />
                  <span>Tek Dokunuşla Nostalji & Sevilen Aramalar:</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    {
                      title: '🎬 Yeşilçam Klasik Filmleri',
                      desc: 'Kemal Sunal, Münir Özkul, Adile Naşit filmleri',
                      query: 'eski+yeşilçam+filmleri+tek+parça',
                    },
                    {
                      title: '🎻 Türk Sanat Müziği Konserleri',
                      desc: 'Zeki Müren, Müzeyyen Senar, Emel Sayın',
                      query: 'zeki+müren+türk+sanat+müziği+konseri',
                    },
                    {
                      title: '📺 Barış Manço ile 7\'den 77\'ye',
                      desc: 'Eski TRT nostalji programları ve klipleri',
                      query: 'barış+manço+7den+77ye+tam+bölüm',
                    },
                    {
                      title: '📰 Günün Canlı Haber Bültenleri',
                      desc: 'TRT Haber ve ulusal canlı haber yayınları',
                      query: 'canlı+haber+bülteni+trt+haber',
                    },
                    {
                      title: '🌿 Türkiye Doğa ve Gezi Rehberi',
                      desc: 'Huzurlu doğa manzaraları ve tarihi yerler',
                      query: 'türkiye+doğa+belgeseli+huzur',
                    },
                    {
                      title: '📻 Eski Radyo Tiyatroları',
                      desc: 'Arkası Yarın ve nostalji radyo tiyatrosu',
                      query: 'trt+radyo+tiyatrosu+arkası+yarın',
                    },
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      id={`btn-yt-shortcut-${idx}`}
                      onClick={() =>
                        handleOpenExternal(
                          `https://www.youtube.com/results?search_query=${item.query}`,
                          item.title
                        )
                      }
                      className="p-5 rounded-2xl border-2 border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 hover:bg-red-50 dark:hover:bg-zinc-700 hover:border-red-300 transition-all text-left flex flex-col justify-between group cursor-pointer shadow-xs"
                    >
                      <div>
                        <div className="text-lg font-black text-slate-900 dark:text-white group-hover:text-red-600 transition-colors">
                          {item.title}
                        </div>
                        <div className="text-sm text-slate-600 dark:text-zinc-300 mt-1">
                          {item.desc}
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-1 text-sm font-bold text-red-600">
                        <span>Aç ve İzle</span>
                        <ExternalLink className="w-4 h-4" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: FACEBOOK */}
        {activeSection === 'facebook' && (
          <div className="space-y-6">
            <div
              className={`p-6 sm:p-8 rounded-3xl border-3 shadow-md ${
                settings.highContrast
                  ? 'bg-black border-blue-500 text-white'
                  : 'bg-white border-blue-200'
              }`}
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shrink-0">
                    <Globe className="w-9 h-9" />
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                      👍 Facebook Resmi Web Sitesi
                    </h2>
                    <p className="text-base sm:text-lg text-slate-600 dark:text-zinc-300 font-medium mt-1">
                      Akrabalarınız, torunlarınız ve eski okul dostlarınızla haberleşin, paylaşılan fotoğraflara bakın.
                    </p>
                  </div>
                </div>

                {/* Primary Safe External Link */}
                <button
                  id="btn-open-facebook-official"
                  onClick={() => handleOpenExternal('https://www.facebook.com', 'Facebook')}
                  className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xl shadow-xl transition-all cursor-pointer border-2 border-blue-400 transform active:scale-95"
                >
                  <Globe className="w-7 h-7" />
                  <span>Facebook'u Yeni Sekmede Aç</span>
                  <ExternalLink className="w-6 h-6" />
                </button>
              </div>

              {/* Senior Safety Guide Card */}
              <div className="mt-8 space-y-4">
                <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-blue-600" />
                  <span>Facebook Kullanırken Dikkat Edilecek Önemli Kurallar:</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-5 rounded-2xl bg-amber-50 dark:bg-zinc-900 border-2 border-amber-300 dark:border-amber-500">
                    <span className="text-2xl mb-2 block">🔒</span>
                    <h4 className="font-extrabold text-base text-slate-900 dark:text-white mb-1">
                      1. Şifrenizi Asla Paylaşmayın
                    </h4>
                    <p className="text-sm text-slate-700 dark:text-zinc-300">
                      Hiçbir resmi yetkili veya akraba sizden mesajla şifre veya banka bilgisi istemez.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-zinc-900 border-2 border-emerald-300 dark:border-emerald-500">
                    <span className="text-2xl mb-2 block">👥</span>
                    <h4 className="font-extrabold text-base text-slate-900 dark:text-white mb-1">
                      2. Yalnızca Tanıdıklarınızı Ekleyin
                    </h4>
                    <p className="text-sm text-slate-700 dark:text-zinc-300">
                      Tanımadığınız kişilerden gelen arkadaşlık isteklerini onaylamayınız.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl bg-sky-50 dark:bg-zinc-900 border-2 border-sky-300 dark:border-sky-500">
                    <span className="text-2xl mb-2 block">📸</span>
                    <h4 className="font-extrabold text-base text-slate-900 dark:text-white mb-1">
                      3. Aile Fotoğraflarını İnceleyin
                    </h4>
                    <p className="text-sm text-slate-700 dark:text-zinc-300">
                      Çocuklarınızın ve torunlarınızın yüklediği fotoğrafları güvenle beğenip yorum yapabilirsiniz.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: MÜZİK */}
        {activeSection === 'muzik' && (
          <div className="space-y-6">
            <div
              className={`p-6 sm:p-8 rounded-3xl border-3 shadow-md ${
                settings.highContrast
                  ? 'bg-black border-amber-500 text-white'
                  : 'bg-white border-amber-200'
              }`}
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-lg shrink-0">
                    <Music className="w-9 h-9" />
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                      🎵 SuatMuzik - Nostalji & Kendi Müzikleriniz
                    </h2>
                    <p className="text-base sm:text-lg text-slate-600 dark:text-zinc-300 font-medium mt-1">
                      Bilgisayarınızdaki sevdiğiniz MP3, WAV ve M4A müzik dosyalarını kolay kumandayla dinleyin.
                    </p>
                  </div>
                </div>

                {/* Direct Switch to SuatMuzik Tab */}
                <button
                  id="btn-goto-suat-muzik"
                  onClick={() => {
                    if (settings.soundEffects) sound.playClick();
                    if (settings.voiceAssistance) sound.speak('Suat Müzik bölümüne geçiliyor.');
                    onNavigate('muzik');
                  }}
                  className="w-full md:w-auto flex items-center justify-center gap-3 px-8 py-5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xl shadow-xl transition-all cursor-pointer border-2 border-amber-400 transform active:scale-95"
                >
                  <Music className="w-7 h-7" />
                  <span>SuatMuzik Bölümünü Aç</span>
                  <ExternalLink className="w-6 h-6" />
                </button>
              </div>

              {/* Overview of music features */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-amber-50 dark:bg-zinc-900 border-2 border-amber-200 dark:border-zinc-700">
                  <h4 className="font-black text-lg text-amber-950 dark:text-amber-300 mb-2">
                    📻 SuatMuzik Özellikleri
                  </h4>
                  <ul className="space-y-2 text-slate-700 dark:text-zinc-300 text-base">
                    <li>• Bilgisayarınızdan MP3, WAV, AAC, M4A dosyası seçebilme</li>
                    <li>• Şarkı, sanatçı veya albüme göre hızlı arama</li>
                    <li>• Büyük ve kolay kullanılabilir müzik kumandası</li>
                    <li>• Karışık çalma ve tekrar çalma seçenekleri</li>
                    <li>• Sayfa yenilendiğinde çalma listesinin korunması</li>
                  </ul>
                </div>

                <div className="p-5 rounded-2xl bg-indigo-50 dark:bg-zinc-900 border-2 border-indigo-200 dark:border-zinc-700">
                  <h4 className="font-black text-lg text-indigo-950 dark:text-indigo-300 mb-2">
                    💡 İpucu: Bu Bölümde de Medya Oynatabilirsiniz
                  </h4>
                  <p className="text-slate-700 dark:text-zinc-300 text-base leading-relaxed">
                    Ayrıca hemen yanındaki <strong>"⬇️ Medya Araçları"</strong> sekmesini kullanarak da bilgisayarınızdaki herhangi bir video veya ses dosyasını anında seçip büyük ekranda oynatabilirsiniz.
                  </p>
                  <button
                    onClick={() => handleTabChange('araclar', 'Medya Araçları')}
                    className="mt-4 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 cursor-pointer shadow-xs"
                  >
                    Medya Araçları Oynatıcısına Git →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: MEDYA ARAÇLARI */}
        {activeSection === 'araclar' && (
          <div className="space-y-8">
            {/* 4.A: Local Media File Player */}
            <div
              className={`p-6 sm:p-8 rounded-3xl border-3 shadow-md ${
                settings.highContrast
                  ? 'bg-black border-indigo-400 text-white'
                  : 'bg-white border-indigo-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
                    <Play className="w-8 h-8 fill-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                      🎬 Yerel Medya Dosyası Oynatıcı
                    </h2>
                    <p className="text-base sm:text-lg text-slate-600 dark:text-zinc-300 font-medium">
                      Bilgisayarınızdaki video (.mp4, .webm) veya ses (.mp3, .wav) dosyalarını kolayca seçin ve izleyin.
                    </p>
                  </div>
                </div>

                {/* File input button */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*,audio/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="local-media-input"
                  />
                  <button
                    id="btn-choose-local-file"
                    onClick={() => {
                      fileInputRef.current?.click();
                    }}
                    className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-lg cursor-pointer transition-all active:scale-95 border-2 border-indigo-400"
                  >
                    <Upload className="w-6 h-6" />
                    <span>Bilgisayardan Dosya Seç</span>
                  </button>
                </div>
              </div>

              {/* Player Area */}
              {mediaSrc ? (
                <div className="mt-6 space-y-4">
                  {/* File information pill */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-2xl bg-indigo-50 dark:bg-zinc-800 border border-indigo-200">
                    <div className="flex items-center gap-2">
                      {mediaType === 'video' ? (
                        <FileVideo className="w-6 h-6 text-indigo-600" />
                      ) : (
                        <FileAudio className="w-6 h-6 text-amber-600" />
                      )}
                      <span className="font-black text-base sm:text-lg text-slate-900 dark:text-white truncate max-w-xs sm:max-w-md">
                        {selectedFile?.name || 'Seçilen Medya Dosyası'}
                      </span>
                    </div>

                    <span className="text-sm font-bold px-3 py-1 rounded-full bg-white dark:bg-zinc-700 text-slate-700 dark:text-zinc-200 border border-slate-300">
                      {selectedFile ? `${Math.round(selectedFile.size / 1024)} KB` : ''}
                    </span>
                  </div>

                  {/* Video Screen or Audio Box */}
                  {mediaType === 'video' ? (
                    <div className="relative rounded-3xl overflow-hidden bg-black border-4 border-slate-800 shadow-2xl aspect-video flex items-center justify-center">
                      <video
                        ref={videoRef}
                        src={mediaSrc}
                        playsInline
                        onTimeUpdate={() => {
                          if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
                        }}
                        onLoadedMetadata={() => {
                          if (videoRef.current) setDuration(videoRef.current.duration);
                        }}
                        onEnded={() => setIsPlaying(false)}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="p-8 rounded-3xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-zinc-900 dark:to-zinc-800 border-3 border-amber-300 flex flex-col items-center justify-center text-center shadow-inner">
                      <audio
                        ref={audioRef}
                        src={mediaSrc}
                        onTimeUpdate={() => {
                          if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
                        }}
                        onLoadedMetadata={() => {
                          if (audioRef.current) setDuration(audioRef.current.duration);
                        }}
                        onEnded={() => setIsPlaying(false)}
                      />
                      <div className="w-20 h-20 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-lg mb-3">
                        <Music className="w-10 h-10" />
                      </div>
                      <h4 className="text-xl font-black text-slate-900 dark:text-white">
                        {selectedFile?.name || 'Ses Dosyası Çalınıyor'}
                      </h4>
                      <p className="text-base text-slate-600 dark:text-zinc-400 mt-1">
                        Müzik / Ses Dosyası
                      </p>
                    </div>
                  )}

                  {/* Big Accessible Controls */}
                  <div className="p-5 rounded-2xl bg-slate-100 dark:bg-zinc-800 border-2 border-slate-300 dark:border-zinc-700 space-y-4">
                    {/* Time progress slider */}
                    <div className="flex items-center gap-3">
                      <span className="text-sm sm:text-base font-bold text-slate-700 dark:text-zinc-300 w-16 text-right font-mono">
                        {formatTime(currentTime)}
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={duration || 100}
                        value={currentTime}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setCurrentTime(val);
                          if (activeMediaElement) activeMediaElement.currentTime = val;
                        }}
                        className="flex-1 h-3 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                      <span className="text-sm sm:text-base font-bold text-slate-700 dark:text-zinc-300 w-16 font-mono">
                        {formatTime(duration)}
                      </span>
                    </div>

                    {/* Button Controls Row */}
                    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 pt-2">
                      {/* 10s Rewind */}
                      <button
                        onClick={() => handleSeek(-10)}
                        title="10 Saniye Geri"
                        className="px-4 py-3 rounded-2xl bg-white dark:bg-zinc-700 hover:bg-slate-200 border-2 border-slate-300 dark:border-zinc-600 text-slate-900 dark:text-white font-bold flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
                      >
                        <Rewind className="w-5 h-5" />
                        <span className="text-sm sm:text-base">10 sn Geri</span>
                      </button>

                      {/* Restart */}
                      <button
                        onClick={handleRestart}
                        title="Başa Dön"
                        className="p-3.5 rounded-2xl bg-white dark:bg-zinc-700 hover:bg-slate-200 border-2 border-slate-300 dark:border-zinc-600 text-slate-900 dark:text-white cursor-pointer shadow-xs active:scale-95"
                      >
                        <RotateCcw className="w-6 h-6" />
                      </button>

                      {/* Giant Play/Pause */}
                      <button
                        id="btn-media-play-pause"
                        onClick={togglePlay}
                        className={`px-8 py-4 rounded-3xl font-black text-xl flex items-center gap-3 cursor-pointer shadow-xl transition-all active:scale-95 border-3 ${
                          isPlaying
                            ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-300'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-400'
                        }`}
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="w-8 h-8 fill-current" />
                            <span>DURAKLAT</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-8 h-8 fill-current" />
                            <span>OYNAT</span>
                          </>
                        )}
                      </button>

                      {/* 10s Forward */}
                      <button
                        onClick={() => handleSeek(10)}
                        title="10 Saniye İleri"
                        className="px-4 py-3 rounded-2xl bg-white dark:bg-zinc-700 hover:bg-slate-200 border-2 border-slate-300 dark:border-zinc-600 text-slate-900 dark:text-white font-bold flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
                      >
                        <span className="text-sm sm:text-base">10 sn İleri</span>
                        <FastForward className="w-5 h-5" />
                      </button>

                      {/* Fullscreen (video only) */}
                      {mediaType === 'video' && (
                        <button
                          onClick={handleFullscreen}
                          title="Tam Ekran"
                          className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-900 text-white font-bold flex items-center gap-2 cursor-pointer shadow-md active:scale-95"
                        >
                          <Maximize className="w-5 h-5" />
                          <span className="text-sm sm:text-base">Tam Ekran</span>
                        </button>
                      )}
                    </div>

                    {/* Bottom row: Volume & Playback Rate */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-200 dark:border-zinc-700">
                      {/* Volume */}
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button
                          onClick={toggleMute}
                          className="p-2.5 rounded-xl bg-white dark:bg-zinc-700 border border-slate-300 text-slate-800 dark:text-white cursor-pointer"
                        >
                          {isMuted || volume === 0 ? (
                            <VolumeX className="w-6 h-6 text-red-500" />
                          ) : (
                            <Volume2 className="w-6 h-6 text-indigo-600" />
                          )}
                        </button>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={isMuted ? 0 : volume}
                          onChange={(e) => handleVolumeChange(Number(e.target.value))}
                          className="w-32 h-2.5 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <span className="text-sm font-bold text-slate-700 dark:text-zinc-300">
                          %{Math.round((isMuted ? 0 : volume) * 100)} Ses
                        </span>
                      </div>

                      {/* Speed Control */}
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-600 dark:text-zinc-400">
                          Hız:
                        </span>
                        {[0.75, 1.0, 1.25].map((rate) => (
                          <button
                            key={rate}
                            onClick={() => changePlaybackRate(rate)}
                            className={`px-3 py-1.5 rounded-xl text-sm font-black border cursor-pointer ${
                              playbackRate === rate
                                ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                                : 'bg-white dark:bg-zinc-700 text-slate-800 dark:text-zinc-200 border-slate-300'
                            }`}
                          >
                            {rate === 1 ? 'Normal' : `${rate}x`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 p-10 rounded-3xl border-3 border-dashed border-indigo-300 dark:border-zinc-700 bg-indigo-50/50 dark:bg-zinc-900/50 text-center flex flex-col items-center justify-center">
                  <div className="w-20 h-20 rounded-3xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4 shadow-xs">
                    <Upload className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                    Henüz Medya Seçilmedi
                  </h3>
                  <p className="text-base sm:text-lg text-slate-600 dark:text-zinc-400 max-w-lg mb-6">
                    Aşağıdaki büyük düğmeye dokunarak bilgisayarınızdaki herhangi bir videoyu (aile videoları, hatıralar) veya ses dosyasını anında seçip izleyebilirsiniz.
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-lg cursor-pointer transition-all active:scale-95"
                  >
                    📁 Bilgisayardan Video veya Ses Seç
                  </button>
                </div>
              )}
            </div>

            {/* 4.B: Personal Content Download & Creation Tools */}
            <div
              className={`p-6 sm:p-8 rounded-3xl border-3 shadow-md ${
                settings.highContrast
                  ? 'bg-black border-emerald-400 text-white'
                  : 'bg-white border-emerald-200'
              }`}
            >
              <div className="flex items-center gap-4 pb-6 border-b border-slate-200">
                <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
                  <Download className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                    ⬇️ Kişisel Medya İndirme & Dönüştürme Araçları
                  </h2>
                  <p className="text-base sm:text-lg text-slate-600 dark:text-zinc-300 font-medium">
                    Yasal düzenlemelere uygun şekilde; yalnızca kendi ses kayıtlarınız veya izinli içerikler için indirme seçenekleri.
                  </p>
                </div>
              </div>

              {/* Legal Notice */}
              <div className="mt-6 p-4 rounded-2xl bg-emerald-50 dark:bg-zinc-900 border-2 border-emerald-200 dark:border-zinc-700 flex items-start gap-3">
                <ShieldCheck className="w-7 h-7 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-sm sm:text-base text-slate-700 dark:text-zinc-200">
                  <strong className="text-slate-900 dark:text-white font-extrabold">Yasal Güvenlik Bilgisi:</strong> Bu bölümde telif hakkı içeren harici videolar doğrudan indirilmez. Yalnızca kendi oluşturduğunuz ses kayıtlarınız, yedek dosyalarınız veya serbest lisanslı Yeşilçam zil sesi melodileri güvenle indirilebilir.
                </div>
              </div>

              {/* Two Main Tools */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tool 1: Voice Recorder to WAV */}
                <div className="p-6 rounded-3xl border-2 border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-3xl">🎙️</span>
                      <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
                        KİŞİSEL SES KAYDI
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">
                      Kendi Sesinizi Kaydedin & İndirin
                    </h3>
                    <p className="text-sm sm:text-base text-slate-600 dark:text-zinc-300 mb-4">
                      Torunlarınıza mesaj, hatıra veya hatırlatıcı ses kaydı yapın. Ses dosyanızı (.wav) tek tıkla bilgisayarınıza kaydedebilirsiniz.
                    </p>

                    {/* Live Recording Indicator */}
                    {isRecording && (
                      <div className="mb-4 p-4 rounded-2xl bg-red-100 dark:bg-red-950/60 border-2 border-red-500 text-red-900 dark:text-red-200 flex items-center justify-between animate-pulse">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full bg-red-600 animate-ping" />
                          <span className="font-black text-lg">Sesiniz Kaydediliyor...</span>
                        </div>
                        <span className="font-mono font-black text-xl">
                          {formatTime(recordingSeconds)}
                        </span>
                      </div>
                    )}

                    {/* Recorded Audio Preview */}
                    {recordedAudioUrl && !isRecording && (
                      <div className="mb-4 p-4 rounded-2xl bg-emerald-100 dark:bg-zinc-700 border border-emerald-300">
                        <div className="text-sm font-bold text-emerald-950 dark:text-emerald-300 mb-2">
                          ✓ Kaydedilen Ses Dinlemeye Hazır:
                        </div>
                        <audio src={recordedAudioUrl} controls className="w-full h-10" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 mt-4">
                    {/* Record / Stop Button */}
                    {!isRecording ? (
                      <button
                        id="btn-start-record"
                        onClick={startRecording}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg shadow-md cursor-pointer transition-all active:scale-95"
                      >
                        <Mic className="w-6 h-6" />
                        <span>Kaydı Başlat</span>
                      </button>
                    ) : (
                      <button
                        id="btn-stop-record"
                        onClick={stopRecording}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-lg shadow-lg cursor-pointer transition-all active:scale-95 animate-pulse"
                      >
                        <Square className="w-6 h-6 fill-white" />
                        <span>Kaydı Bitir</span>
                      </button>
                    )}

                    {/* Download button if recording exists */}
                    {recordedAudioBlob && !isRecording && (
                      <button
                        id="btn-save-recording-file"
                        onClick={handleSaveRecording}
                        className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-md cursor-pointer transition-all active:scale-95 border-2 border-indigo-400"
                      >
                        <Download className="w-6 h-6" />
                        <span>Ses Dosyasını İndir (.wav)</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Tool 2: Permitted Nostalgia Melody Generator */}
                <div className="p-6 rounded-3xl border-2 border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-3xl">🎼</span>
                      <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-black">
                        TELİFSİZ NOSTALJİ MELODİSİ
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">
                      İzinli Nostalji Melodisi İndir
                    </h3>
                    <p className="text-sm sm:text-base text-slate-600 dark:text-zinc-300 mb-4">
                      Telefonunuza veya bilgisayarınıza zil sesi yapabileceğiniz, telif hakkı bulunmayan huzurlu Nihavend Türk Müziği melodisini WAV ses dosyası olarak indirin.
                    </p>

                    <div className="p-4 rounded-2xl bg-amber-100/70 dark:bg-zinc-900 border border-amber-300 text-amber-950 dark:text-amber-200 text-sm">
                      <strong>✓ Tamamen Yasal & Serbest:</strong> Bu melodi tarayıcınız tarafından özel olarak sentezlenir ve indirilmesine izin verilmiştir.
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      id="btn-download-sample-melody"
                      onClick={handleGeneratePermittedMelody}
                      className="w-full flex items-center justify-center gap-3 px-6 py-5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xl shadow-lg cursor-pointer transition-all active:scale-95 border-2 border-amber-400"
                    >
                      <Sparkles className="w-7 h-7" />
                      <span>Nostalji Melodisini İndir (.wav)</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 5: İNDİRİLENLER */}
        {activeSection === 'indirilenler' && (
          <div className="space-y-6">
            <div
              className={`p-6 sm:p-8 rounded-3xl border-3 shadow-md ${
                settings.highContrast
                  ? 'bg-black border-emerald-400 text-white'
                  : 'bg-white border-emerald-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shrink-0">
                    <FolderDown className="w-8 h-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                      📥 İndirilenler & Dosya Geçmişi
                    </h2>
                    <p className="text-base sm:text-lg text-slate-600 dark:text-zinc-300 font-medium">
                      Uygulama üzerinden oluşturulan veya indirilen tüm dosyalarınızın bağlantıları.
                    </p>
                  </div>
                </div>

                {downloads.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm('İndirilenler listesini temizlemek istiyor musunuz?')) {
                        if (settings.soundEffects) sound.playClick();
                        setDownloads([]);
                        showToast('İndirilenler listesi temizlendi.');
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl border-2 border-red-300 text-red-700 hover:bg-red-50 dark:text-red-400 font-bold text-sm cursor-pointer"
                  >
                    Listeyi Temizle
                  </button>
                )}
              </div>

              {/* Downloads list */}
              {downloads.length > 0 ? (
                <div className="mt-6 space-y-4">
                  {downloads.map((item) => (
                    <div
                      key={item.id}
                      className={`p-5 rounded-2xl border-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all shadow-xs ${
                        settings.highContrast
                          ? 'border-zinc-700 bg-zinc-900 text-white'
                          : 'border-slate-200 bg-slate-50 hover:bg-white hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div
                          className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                            item.type === 'audio'
                              ? 'bg-amber-100 text-amber-700'
                              : item.type === 'video'
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-emerald-100 text-emerald-700'
                          }`}
                        >
                          {item.type === 'audio' ? (
                            <FileAudio className="w-8 h-8" />
                          ) : item.type === 'video' ? (
                            <FileVideo className="w-8 h-8" />
                          ) : (
                            <FileText className="w-8 h-8" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white truncate">
                            {item.name}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs sm:text-sm text-slate-600 dark:text-zinc-400 font-semibold">
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-zinc-700 text-slate-800 dark:text-zinc-200">
                              {item.source}
                            </span>
                            <span>•</span>
                            <span>{item.size}</span>
                            <span>•</span>
                            <span>{item.date}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                        {item.blobUrl && (
                          <button
                            onClick={() => handlePlayDownloadedItem(item)}
                            title="Oynat / Önizle"
                            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
                          >
                            <Play className="w-4 h-4 fill-white" />
                            <span>Oynat</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleDownloadItem(item)}
                          title="Bilgisayara İndir"
                          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
                        >
                          <Download className="w-4 h-4" />
                          <span>İndir</span>
                        </button>

                        <button
                          onClick={() => handleDeleteDownload(item.id, item.name)}
                          title="Listeden Kaldır"
                          className="p-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-8 p-12 rounded-3xl border-2 border-dashed border-slate-300 dark:border-zinc-700 text-center">
                  <span className="text-4xl mb-3 block">📂</span>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white">
                    Henüz İndirilen Dosya Yok
                  </h3>
                  <p className="text-base text-slate-600 dark:text-zinc-400 mt-1 max-w-md mx-auto">
                    "Medya Araçları" sekmesinden kendi sesinizi kaydederek veya izinli nostalji melodisini indirerek bu listeyi oluşturabilirsiniz.
                  </p>
                  <button
                    onClick={() => handleTabChange('araclar', 'Medya Araçları')}
                    className="mt-5 px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold cursor-pointer hover:bg-emerald-700 shadow-sm"
                  >
                    Medya Araçlarına Git →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
