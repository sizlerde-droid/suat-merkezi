import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AppSettings } from '../types';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Heart,
  Shuffle,
  Repeat,
  Repeat1,
  Music,
  Plus,
  Trash2,
  Search,
  X,
  Disc,
  Home,
  Upload,
  FolderOpen,
  Sparkles,
} from 'lucide-react';
import { sound } from '../utils/audio';
import {
  UserMusicTrack,
  loadTracksFromStorage,
  saveTracksToStorage,
  deleteTrackFromStorage,
  clearAllTracksStorage,
  parseAudioFileName,
  getAudioDuration,
  getStoredFavorites,
  saveStoredFavorites,
} from '../utils/musicStorage';

interface SuatMuzikProps {
  settings: AppSettings;
  onBackHome: () => void;
  tracks?: any[]; // For backward compatibility if passed
}

export const SuatMuzik: React.FC<SuatMuzikProps> = ({ settings, onBackHome }) => {
  // Playlist State
  const [tracks, setTracks] = useState<UserMusicTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);

  // Playback State
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(80); // 0 - 100
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('all');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'favorites'>('all');
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  // Audio element reference
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load tracks from IndexedDB on component mount
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    loadTracksFromStorage()
      .then((loaded) => {
        if (!isMounted) return;
        setTracks(loaded);
        setIsLoading(false);
      })
      .catch((err) => {
        console.warn('Error loading tracks:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Cleanup object URLs when tracks change or unmount
  const tracksRef = useRef<UserMusicTrack[]>([]);
  tracksRef.current = tracks;
  useEffect(() => {
    return () => {
      tracksRef.current.forEach((t) => {
        if (t.objectUrl) {
          try {
            URL.revokeObjectURL(t.objectUrl);
          } catch {
            // ignore
          }
        }
      });
    };
  }, []);

  // Current active track
  const currentTrack: UserMusicTrack | undefined = tracks[currentTrackIndex];

  // Set audio source when currentTrack changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentTrack && currentTrack.objectUrl) {
      audio.src = currentTrack.objectUrl;
      audio.currentTime = 0;
      setCurrentTime(0);
      setDuration(currentTrack.duration || 0);

      if (isPlaying) {
        audio
          .play()
          .catch((err) => {
            console.warn('Auto playback prevented or failed:', err);
            setIsPlaying(false);
          });
      }
    } else {
      audio.removeAttribute('src');
      audio.load();
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [currentTrack?.id, currentTrack?.objectUrl]);

  // Volume synchronization
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : volume / 100;
  }, [volume, isMuted]);

  // Format seconds to mm:ss
  const formatTime = (secs: number): string => {
    if (!secs || isNaN(secs) || secs < 0) return '00:00';
    const mins = Math.floor(secs / 60);
    const rem = Math.floor(secs % 60);
    return `${mins < 10 ? '0' : ''}${mins}:${rem < 10 ? '0' : ''}${rem}`;
  };

  // Play / Pause toggle
  const handleTogglePlay = () => {
    if (settings.soundEffects) sound.playClick();
    if (!currentTrack) {
      if (tracks.length > 0) {
        setCurrentTrackIndex(0);
        setIsPlaying(true);
      } else {
        fileInputRef.current?.click();
      }
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      if (settings.voiceAssistance) {
        sound.speak('Müzik duraklatıldı.');
      }
    } else {
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          if (settings.voiceAssistance) {
            sound.speak(`${currentTrack.title}, ${currentTrack.artist} çalıyor.`);
          }
        })
        .catch((err) => {
          console.warn('Playback error:', err);
          setIsPlaying(false);
        });
    }
  };

  // Next Track
  const handleNextTrack = () => {
    if (settings.soundEffects) sound.playClick();
    if (tracks.length === 0) return;

    let nextIndex: number;
    if (isShuffle && tracks.length > 1) {
      let rand = Math.floor(Math.random() * tracks.length);
      while (rand === currentTrackIndex && tracks.length > 1) {
        rand = Math.floor(Math.random() * tracks.length);
      }
      nextIndex = rand;
    } else {
      nextIndex = (currentTrackIndex + 1) % tracks.length;
    }

    setCurrentTrackIndex(nextIndex);
    setIsPlaying(true);

    if (settings.voiceAssistance && tracks[nextIndex]) {
      sound.speak(`Sıradaki: ${tracks[nextIndex].title}`);
    }
  };

  // Previous Track
  const handlePrevTrack = () => {
    if (settings.soundEffects) sound.playClick();
    if (tracks.length === 0) return;

    const audio = audioRef.current;
    // If playing for more than 3 seconds, restart current track first
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      setCurrentTime(0);
      return;
    }

    const prevIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
    setCurrentTrackIndex(prevIndex);
    setIsPlaying(true);

    if (settings.voiceAssistance && tracks[prevIndex]) {
      sound.speak(`Önceki: ${tracks[prevIndex].title}`);
    }
  };

  // Audio element event handlers
  const handleTimeUpdate = () => {
    const audio = audioRef.current;
    if (audio) {
      setCurrentTime(audio.currentTime);
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    }
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (audio && audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
      setDuration(audio.duration);
    }
  };

  const handleEnded = () => {
    if (repeatMode === 'one') {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(console.warn);
      }
      return;
    }

    if (repeatMode === 'off' && currentTrackIndex === tracks.length - 1 && !isShuffle) {
      setIsPlaying(false);
      return;
    }

    handleNextTrack();
  };

  // Seek bar handler
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetSec = parseFloat(e.target.value);
    setCurrentTime(targetSec);
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = targetSec;
    }
  };

  // Toggle favorite
  const handleToggleFavorite = async (trackId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (settings.soundEffects) sound.playSuccess();

    const favs = getStoredFavorites();
    const willBeFavorite = !favs.has(trackId);

    if (willBeFavorite) {
      favs.add(trackId);
    } else {
      favs.delete(trackId);
    }
    saveStoredFavorites(favs);

    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, isFavorite: willBeFavorite } : t))
    );

    if (settings.voiceAssistance) {
      sound.speak(willBeFavorite ? 'Favorilere eklendi.' : 'Favorilerden çıkarıldı.');
    }
  };

  // File Upload Handler (MP3, M4A, AAC, WAV)
  const processFiles = async (fileList: FileList | File[]) => {
    const allowedExtensions = ['.mp3', '.m4a', '.aac', '.wav'];
    const validFiles: File[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      const ext = '.' + f.name.split('.').pop()?.toLowerCase();
      if (
        allowedExtensions.includes(ext) ||
        f.type.startsWith('audio/') ||
        ext === '.m4a' ||
        ext === '.aac'
      ) {
        validFiles.push(f);
      }
    }

    if (validFiles.length === 0) {
      alert('Lütfen geçerli bir MP3, M4A, AAC veya WAV müzik dosyası seçin.');
      return;
    }

    setIsUploading(true);
    setUploadStatus(`${validFiles.length} müzik dosyası işleniyor...`);

    const newTracks: UserMusicTrack[] = [];

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      setUploadStatus(`Dosya yükleniyor (${i + 1}/${validFiles.length}): ${file.name}`);

      const { title, artist, album } = parseAudioFileName(file.name);
      const trackDuration = await getAudioDuration(file);
      const trackId = `track_${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${i}`;

      const objectUrl = URL.createObjectURL(file);

      const trackItem: UserMusicTrack = {
        id: trackId,
        title,
        artist,
        album,
        duration: trackDuration,
        fileName: file.name,
        fileType: file.type || 'audio/mpeg',
        fileSize: file.size,
        addedAt: Date.now() + i,
        isFavorite: false,
        blob: file,
        objectUrl,
      };

      newTracks.push(trackItem);
    }

    try {
      // Save all to IndexedDB and update state
      await saveTracksToStorage(newTracks);
      setTracks((prev) => [...prev, ...newTracks]);

      if (settings.soundEffects) sound.playSuccess();
      if (settings.voiceAssistance) {
        sound.speak(`${validFiles.length} adet müzik listenize başarıyla eklendi.`);
      }
    } catch (err) {
      console.error('Save to storage failed:', err);
      // Still keep in memory
      setTracks((prev) => [...prev, ...newTracks]);
    } finally {
      setIsUploading(false);
      setUploadStatus('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  // Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Delete single track
  const handleDeleteTrack = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (settings.soundEffects) sound.playClick();

    const targetIdx = tracks.findIndex((t) => t.id === id);
    if (targetIdx === -1) return;

    await deleteTrackFromStorage(id);
    const updated = tracks.filter((t) => t.id !== id);

    if (tracks[targetIdx]?.objectUrl) {
      try {
        URL.revokeObjectURL(tracks[targetIdx].objectUrl!);
      } catch {
        // ignore
      }
    }

    setTracks(updated);
    if (currentTrackIndex >= updated.length) {
      setCurrentTrackIndex(Math.max(0, updated.length - 1));
    }
  };

  // Clear all tracks
  const handleClearAll = async () => {
    if (settings.soundEffects) sound.playClick();
    tracks.forEach((t) => {
      if (t.objectUrl) {
        try {
          URL.revokeObjectURL(t.objectUrl);
        } catch {
          // ignore
        }
      }
    });
    await clearAllTracksStorage();
    setTracks([]);
    setCurrentTrackIndex(0);
    setIsPlaying(false);
    setConfirmClearOpen(false);

    if (settings.voiceAssistance) {
      sound.speak('Müzik listesi temizlendi.');
    }
  };

  // Filtered tracks based on search and favorite tab
  const filteredTracks = useMemo(() => {
    return tracks.filter((track) => {
      if (activeFilter === 'favorites' && !track.isFavorite) {
        return false;
      }

      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const matchTitle = track.title.toLowerCase().includes(q);
      const matchArtist = track.artist.toLowerCase().includes(q);
      const matchAlbum = track.album.toLowerCase().includes(q);
      const matchFileName = track.fileName.toLowerCase().includes(q);

      return matchTitle || matchArtist || matchAlbum || matchFileName;
    });
  }, [tracks, activeFilter, searchQuery]);

  // Repeat Mode Cycle
  const handleCycleRepeat = () => {
    if (settings.soundEffects) sound.playClick();
    if (repeatMode === 'off') {
      setRepeatMode('all');
      if (settings.voiceAssistance) sound.speak('Tüm liste tekrarlanacak.');
    } else if (repeatMode === 'all') {
      setRepeatMode('one');
      if (settings.voiceAssistance) sound.speak('Aynı şarkı tekrarlanacak.');
    } else {
      setRepeatMode('off');
      if (settings.voiceAssistance) sound.speak('Tekrar kapalı.');
    }
  };

  // Toggle Shuffle
  const handleToggleShuffle = () => {
    if (settings.soundEffects) sound.playClick();
    const next = !isShuffle;
    setIsShuffle(next);
    if (settings.voiceAssistance) {
      sound.speak(next ? 'Karışık çalma açık.' : 'Karışık çalma kapalı.');
    }
  };

  // Volume +/- steps
  const handleVolumeStep = (delta: number) => {
    if (settings.soundEffects) sound.playClick();
    setVolume((prev) => {
      const next = Math.max(0, Math.min(100, prev + delta));
      if (isMuted && next > 0) setIsMuted(false);
      return next;
    });
  };

  return (
    <div
      className="max-w-7xl mx-auto py-4 px-4 sm:px-6"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        preload="auto"
      />

      {/* Hidden File Input for MP3, M4A, AAC, WAV */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".mp3,.m4a,.aac,.wav,audio/mp3,audio/mpeg,audio/mp4,audio/x-m4a,audio/aac,audio/wav,audio/*"
        onChange={handleFileInputChange}
        className="hidden"
        id="suat-music-file-picker"
      />

      {/* Prominent Navigation Bar: Back to Suat Merkezi */}
      <div className="mb-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <button
          id="btn-muzik-back-home"
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

        {/* Add Music Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            id="btn-pick-music-files"
            onClick={() => {
              if (settings.soundEffects) sound.playClick();
              fileInputRef.current?.click();
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2.5 px-5 py-4 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-black text-lg sm:text-xl shadow-md border-3 border-amber-800 active:scale-95 cursor-pointer"
          >
            <Upload className="w-6 h-6 shrink-0" />
            <span>📁 Bilgisayarımdan Müzik Ekle</span>
          </button>
        </div>
      </div>

      {/* Drag & Drop Overlay Notification */}
      {isDragOver && (
        <div className="mb-4 p-6 bg-amber-500 text-white rounded-3xl border-4 border-dashed border-white text-center font-black text-2xl shadow-xl animate-pulse">
          🎵 Müzik dosyalarını buraya bırakın (MP3, M4A, AAC, WAV)...
        </div>
      )}

      {/* Uploading progress notification banner */}
      {isUploading && (
        <div className="mb-4 p-4 bg-amber-100 border-3 border-amber-400 text-amber-950 rounded-2xl font-bold flex items-center gap-3 shadow-md animate-pulse">
          <Sparkles className="w-6 h-6 text-amber-700 shrink-0" />
          <span className="text-lg">{uploadStatus}</span>
        </div>
      )}

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT 7 COLS: BIG SENIOR MUSIC CONTROLLER & JUKEBOX */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Main Jukebox Vinyl Card */}
          <div
            className={`p-6 sm:p-8 rounded-3xl border-3 shadow-xl flex flex-col items-center justify-center text-center relative overflow-hidden ${
              settings.highContrast
                ? 'bg-black border-yellow-400 text-white'
                : 'bg-gradient-to-b from-amber-900 via-amber-950 to-stone-950 text-white border-amber-800'
            }`}
          >
            {/* Spinning Vinyl Record Visual */}
            <div className="relative my-3">
              <div
                className={`w-44 h-44 sm:w-60 sm:h-60 rounded-full border-8 border-slate-900 bg-black flex items-center justify-center shadow-2xl transition-transform ${
                  isPlaying ? 'animate-spin' : ''
                }`}
                style={{ animationDuration: '4.5s' }}
              >
                {/* Vinyl Grooves */}
                <div className="w-36 h-36 sm:w-48 sm:h-48 rounded-full border border-slate-800 flex items-center justify-center">
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border border-slate-800 bg-amber-600 flex flex-col items-center justify-center text-white shadow-inner p-2">
                    <Disc className="w-8 h-8 sm:w-10 sm:h-10 text-amber-100" />
                    <span className="text-xs sm:text-sm font-black uppercase text-center mt-1 tracking-wider">
                      Suat Plak
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Badge */}
              <div className="absolute top-2 right-2 flex items-center gap-2 bg-black/80 px-3.5 py-1.5 rounded-full border border-white/20 shadow-md">
                <span
                  className={`w-3.5 h-3.5 rounded-full ${
                    isPlaying ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
                  }`}
                />
                <span className="text-sm font-black tracking-wide">
                  {isPlaying ? 'ÇALIYOR' : 'DURDU'}
                </span>
              </div>
            </div>

            {/* Currently Playing Track Information */}
            <div className="mt-2 mb-3 w-full px-2">
              {currentTrack ? (
                <>
                  <h2 className="text-2xl sm:text-4xl font-black mb-1 line-clamp-2 leading-tight">
                    {currentTrack.title}
                  </h2>
                  <p className="text-xl sm:text-2xl font-bold text-amber-300 line-clamp-1">
                    {currentTrack.artist}
                  </p>
                  {currentTrack.album && currentTrack.album !== 'Müziklerim' && (
                    <p className="text-base font-semibold text-slate-300 mt-0.5">
                      Albüm: {currentTrack.album}
                    </p>
                  )}
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <span className="px-2.5 py-1 rounded-md bg-amber-800/80 border border-amber-600 text-xs font-black uppercase text-amber-200">
                      {currentTrack.fileName.split('.').pop()?.toUpperCase() || 'SES'}
                    </span>
                    <span className="text-xs text-slate-300 font-medium">
                      {tracks.length} parçadan {currentTrackIndex + 1}. parça
                    </span>
                  </div>
                </>
              ) : (
                <div className="py-4">
                  <h2 className="text-2xl sm:text-3xl font-black mb-2 text-amber-300">
                    Henüz Müzik Seçilmedi
                  </h2>
                  <p className="text-lg text-slate-300 max-w-md mx-auto mb-4">
                    Bilgisayarınızdaki MP3, M4A, AAC veya WAV dosyalarını eklemek için aşağıdaki düğmeye tıklayın.
                  </p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xl rounded-2xl border-2 border-amber-300 shadow-lg active:scale-95"
                  >
                    <FolderOpen className="w-6 h-6" />
                    <span>Müzik Dosyası Seç</span>
                  </button>
                </div>
              )}
            </div>

            {/* Seekable Progress Bar & Duration Display */}
            <div className="w-full max-w-xl my-2 px-2">
              <input
                id="music-seek-bar"
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                disabled={!currentTrack}
                className="w-full h-3.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400 border border-slate-700"
                title="Şarkı Süresinde İlerle"
              />
              <div className="flex justify-between text-lg sm:text-xl font-black text-amber-200 mt-1.5">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* GIANT SENIOR MUSIC CONTROLLER BUTTONS */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-4">
              {/* Previous Song */}
              <button
                id="btn-music-prev"
                onClick={handlePrevTrack}
                disabled={tracks.length === 0}
                className="p-4 sm:p-5 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white border-3 border-slate-600 shadow-lg disabled:opacity-40 cursor-pointer flex flex-col items-center gap-1 min-w-[90px] sm:min-w-[110px]"
                title="Önceki Şarkı"
              >
                <SkipBack className="w-8 h-8 sm:w-10 sm:h-10 fill-current" />
                <span className="text-xs sm:text-sm font-black uppercase">Önceki</span>
              </button>

              {/* Main Play / Pause Button */}
              <button
                id="btn-music-play-pause"
                onClick={handleTogglePlay}
                className={`px-8 py-5 sm:px-10 sm:py-6 rounded-3xl font-black text-2xl sm:text-3xl flex items-center justify-center gap-3 active:scale-95 shadow-2xl transition-transform border-4 cursor-pointer min-w-[180px] sm:min-w-[220px] ${
                  isPlaying
                    ? 'bg-rose-600 hover:bg-rose-700 border-rose-300 text-white ring-4 ring-rose-500/40'
                    : 'bg-emerald-500 hover:bg-emerald-600 border-emerald-300 text-white ring-4 ring-emerald-400/40'
                }`}
                title={isPlaying ? 'Durdur' : 'Oynat'}
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-10 h-10 sm:w-12 sm:h-12 fill-current" />
                    <span>DURDUR</span>
                  </>
                ) : (
                  <>
                    <Play className="w-10 h-10 sm:w-12 sm:h-12 fill-current" />
                    <span>ÇAL</span>
                  </>
                )}
              </button>

              {/* Next Song */}
              <button
                id="btn-music-next"
                onClick={handleNextTrack}
                disabled={tracks.length === 0}
                className="p-4 sm:p-5 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white border-3 border-slate-600 shadow-lg disabled:opacity-40 cursor-pointer flex flex-col items-center gap-1 min-w-[90px] sm:min-w-[110px]"
                title="Sonraki Şarkı"
              >
                <SkipForward className="w-8 h-8 sm:w-10 sm:h-10 fill-current" />
                <span className="text-xs sm:text-sm font-black uppercase">Sonraki</span>
              </button>
            </div>

            {/* Playback Modes & Favorites Bar */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 w-full">
              {/* Favorite Button */}
              {currentTrack && (
                <button
                  id="btn-music-fav-current"
                  onClick={() => handleToggleFavorite(currentTrack.id)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-lg border-2 active:scale-95 cursor-pointer shadow-md ${
                    currentTrack.isFavorite
                      ? 'bg-rose-600 border-rose-300 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200'
                  }`}
                  title={currentTrack.isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
                >
                  <Heart
                    className={`w-6 h-6 ${currentTrack.isFavorite ? 'fill-current text-white' : ''}`}
                  />
                  <span>
                    {currentTrack.isFavorite ? 'Favorilerimde' : 'Favoriye Ekle'}
                  </span>
                </button>
              )}

              {/* Shuffle Toggle */}
              <button
                id="btn-music-shuffle"
                onClick={handleToggleShuffle}
                className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-black text-base sm:text-lg border-2 active:scale-95 cursor-pointer shadow-md ${
                  isShuffle
                    ? 'bg-amber-500 text-slate-950 border-amber-300'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200'
                }`}
                title="Karışık Çalma"
              >
                <Shuffle className="w-6 h-6" />
                <span>Karışık: {isShuffle ? 'Açık' : 'Kapalı'}</span>
              </button>

              {/* Repeat Mode Toggle */}
              <button
                id="btn-music-repeat"
                onClick={handleCycleRepeat}
                className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-black text-base sm:text-lg border-2 active:scale-95 cursor-pointer shadow-md ${
                  repeatMode !== 'off'
                    ? 'bg-amber-500 text-slate-950 border-amber-300'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-600 text-slate-200'
                }`}
                title="Tekrar Modu"
              >
                {repeatMode === 'one' ? (
                  <Repeat1 className="w-6 h-6" />
                ) : (
                  <Repeat className="w-6 h-6" />
                )}
                <span>
                  {repeatMode === 'one'
                    ? 'Tekrar: Bu Şarkı'
                    : repeatMode === 'all'
                    ? 'Tekrar: Tüm Liste'
                    : 'Tekrar: Kapalı'}
                </span>
              </button>
            </div>

            {/* Volume Control Row with Large Steps */}
            <div className="mt-6 w-full max-w-lg bg-slate-900/90 p-4 rounded-2xl border-2 border-slate-700 flex flex-wrap items-center justify-between gap-3">
              <button
                id="btn-music-mute"
                onClick={() => {
                  if (settings.soundEffects) sound.playClick();
                  setIsMuted(!isMuted);
                }}
                className={`p-3 rounded-xl border-2 cursor-pointer ${
                  isMuted
                    ? 'bg-rose-700 text-white border-rose-400'
                    : 'bg-slate-800 text-amber-400 border-slate-600 hover:bg-slate-700'
                }`}
                title={isMuted ? 'Sesi Aç' : 'Sesi Kapat'}
              >
                {isMuted ? <VolumeX className="w-7 h-7" /> : <Volume2 className="w-7 h-7" />}
              </button>

              <button
                id="btn-music-vol-down"
                onClick={() => handleVolumeStep(-10)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl font-black text-xl border border-slate-600 text-white active:scale-95"
                title="Sesi %10 Kıs"
              >
                - Sesi Kıs
              </button>

              <div className="flex-1 min-w-[120px] flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const v = parseInt(e.target.value);
                    setVolume(v);
                    if (isMuted && v > 0) setIsMuted(false);
                  }}
                  className="w-full h-3 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400"
                  title="Ses Seviyesi"
                />
                <span className="font-black text-lg min-w-[50px] text-right text-amber-300">
                  %{isMuted ? 0 : volume}
                </span>
              </div>

              <button
                id="btn-music-vol-up"
                onClick={() => handleVolumeStep(10)}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl font-black text-xl border border-slate-600 text-white active:scale-95"
                title="Sesi %10 Aç"
              >
                + Sesi Aç
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT 5 COLS: SEARCHABLE MUSIC PLAYLIST */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div
            className={`p-5 rounded-3xl border-3 shadow-md flex flex-col h-full ${
              settings.highContrast
                ? 'bg-black border-amber-400 text-white'
                : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            {/* Playlist Header */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Music className="w-7 h-7 text-amber-600" />
                <h3 className="text-2xl sm:text-3xl font-black">
                  Müziklerim
                </h3>
              </div>
              <span className="px-3 py-1 bg-amber-100 text-amber-900 font-black text-base rounded-full border border-amber-300">
                {tracks.length} Şarkı
              </span>
            </div>

            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="w-6 h-6 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="input-search-music"
                type="text"
                placeholder="Şarkı, sanatçı veya albüm ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-12 pr-10 py-3.5 rounded-2xl font-bold text-lg border-2 focus:outline-none focus:ring-4 focus:ring-amber-500/30 ${
                  settings.highContrast
                    ? 'bg-slate-900 text-white border-yellow-400 placeholder:text-slate-400'
                    : 'bg-slate-50 text-slate-900 border-slate-300 placeholder:text-slate-400'
                }`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                  title="Aramayı Temizle"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Filter Tabs: Tümü vs Favorilerim */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => {
                  if (settings.soundEffects) sound.playClick();
                  setActiveFilter('all');
                }}
                className={`flex-1 py-2.5 px-3 rounded-xl font-black text-lg border-2 transition-all ${
                  activeFilter === 'all'
                    ? 'bg-amber-600 text-white border-amber-800 shadow-sm'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                Tümü ({tracks.length})
              </button>
              <button
                onClick={() => {
                  if (settings.soundEffects) sound.playClick();
                  setActiveFilter('favorites');
                }}
                className={`flex-1 py-2.5 px-3 rounded-xl font-black text-lg border-2 transition-all flex items-center justify-center gap-1.5 ${
                  activeFilter === 'favorites'
                    ? 'bg-rose-600 text-white border-rose-800 shadow-sm'
                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                }`}
              >
                <Heart className="w-5 h-5 fill-current text-rose-500" />
                <span>Favoriler ({tracks.filter((t) => t.isFavorite).length})</span>
              </button>
            </div>

            {/* Track List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[560px] pr-1">
              {isLoading ? (
                <div className="py-12 text-center text-slate-500 font-bold text-xl">
                  Müzikler yükleniyor...
                </div>
              ) : filteredTracks.length === 0 ? (
                <div className="py-12 text-center px-4">
                  <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Music className="w-8 h-8" />
                  </div>
                  <h4 className="font-black text-xl mb-1">
                    {searchQuery
                      ? 'Aradığınız müzik bulunamadı'
                      : activeFilter === 'favorites'
                      ? 'Henüz favori şarkı eklenmemiş'
                      : 'Henüz müzik listeniz boş'}
                  </h4>
                  <p className="text-base text-slate-500 mb-4">
                    {searchQuery
                      ? 'Farklı bir arama kelimesi deneyebilirsiniz.'
                      : 'Bilgisayarınızdaki müzik dosyalarını (MP3, M4A, AAC, WAV) ekleyin.'}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-5 py-3 bg-amber-600 hover:bg-amber-700 text-white font-black text-lg rounded-xl shadow-md active:scale-95 inline-flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Müzik Dosyası Ekle</span>
                    </button>
                  )}
                </div>
              ) : (
                filteredTracks.map((track) => {
                  const originalIndex = tracks.findIndex((t) => t.id === track.id);
                  const isCurrent = track.id === currentTrack?.id;

                  return (
                    <div
                      key={track.id}
                      id={`track-item-${track.id}`}
                      onClick={() => {
                        if (settings.soundEffects) sound.playClick();
                        setCurrentTrackIndex(originalIndex);
                        setIsPlaying(true);
                        if (settings.voiceAssistance) {
                          sound.speak(`${track.title}, ${track.artist}`);
                        }
                      }}
                      className={`p-3.5 rounded-2xl border-3 transition-all flex items-center justify-between gap-3 cursor-pointer select-none active:scale-98 ${
                        isCurrent
                          ? 'bg-amber-500 text-white border-amber-700 shadow-md ring-4 ring-amber-300'
                          : settings.highContrast
                          ? 'bg-slate-900 hover:bg-slate-800 text-white border-slate-700'
                          : 'bg-slate-50 hover:bg-amber-50 text-slate-900 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                            isCurrent
                              ? 'bg-white text-amber-600 shadow-sm'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isCurrent && isPlaying ? (
                            <Disc className="w-6 h-6 animate-spin text-amber-600" />
                          ) : (
                            <Music className="w-6 h-6" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="font-black text-lg sm:text-xl truncate leading-tight">
                            {track.title}
                          </div>
                          <div
                            className={`text-sm sm:text-base font-bold truncate ${
                              isCurrent ? 'text-amber-100' : 'text-slate-600'
                            }`}
                          >
                            {track.artist}
                            {track.album && track.album !== 'Müziklerim' ? ` • ${track.album}` : ''}
                          </div>
                        </div>
                      </div>

                      {/* Right side actions: duration, favorite, delete */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-sm font-bold ${
                            isCurrent ? 'text-white' : 'text-slate-500'
                          }`}
                        >
                          {formatTime(track.duration)}
                        </span>

                        {/* Favorite star */}
                        <button
                          onClick={(e) => handleToggleFavorite(track.id, e)}
                          className={`p-2 rounded-lg cursor-pointer ${
                            track.isFavorite
                              ? 'text-rose-500'
                              : isCurrent
                              ? 'text-white/70 hover:text-white'
                              : 'text-slate-400 hover:text-rose-500'
                          }`}
                          title={track.isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
                        >
                          <Heart
                            className={`w-5 h-5 ${track.isFavorite ? 'fill-current text-rose-500' : ''}`}
                          />
                        </button>

                        {/* Delete track */}
                        <button
                          onClick={(e) => handleDeleteTrack(track.id, e)}
                          className={`p-2 rounded-lg cursor-pointer ${
                            isCurrent
                              ? 'text-white/70 hover:text-white hover:bg-amber-600'
                              : 'text-slate-400 hover:text-red-600 hover:bg-slate-200'
                          }`}
                          title="Bu Şarkıyı Listeden Kaldır"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Actions: Clear list */}
            {tracks.length > 0 && (
              <div className="pt-3 border-t border-slate-200 mt-2 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-500">
                  Tarayıcınızda kayıtlıdır.
                </span>

                {confirmClearOpen ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-rose-600">Tümü silinsin mi?</span>
                    <button
                      onClick={handleClearAll}
                      className="px-3 py-1.5 bg-rose-600 text-white rounded-lg font-black text-xs cursor-pointer hover:bg-rose-700"
                    >
                      Evet, Sil
                    </button>
                    <button
                      onClick={() => setConfirmClearOpen(false)}
                      className="px-2 py-1.5 bg-slate-200 text-slate-700 rounded-lg font-bold text-xs cursor-pointer"
                    >
                      İptal
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmClearOpen(true)}
                    className="text-xs font-bold text-slate-500 hover:text-rose-600 underline cursor-pointer"
                  >
                    Tüm Listeyi Temizle
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
