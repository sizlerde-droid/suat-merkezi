import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { DocumentItem, AppSettings } from '../types';
import {
  Folder,
  FolderPlus,
  Image as ImageIcon,
  FileText,
  File,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  CheckCircle2,
  Home,
  ArrowLeft,
  Eye,
  Volume2,
  Download,
  Sparkles,
  Stethoscope,
  Users,
  Baby,
  RotateCcw,
  Upload,
} from 'lucide-react';
import { sound } from '../utils/audio';

interface DosyalarimProps {
  documents: DocumentItem[];
  onAddDocument: (doc: DocumentItem) => void;
  onDeleteDocument: (id: string) => void;
  settings: AppSettings;
  onBackHome?: () => void;
}

// Default initial folders required by the user
const DEFAULT_FOLDERS = [
  '📷 Fotoğraflar',
  '👨‍👩‍👧 Aile',
  '👶 Torunlar',
  '🩺 Raporlar',
  '📄 Evraklar',
  '📁 Diğer',
];

export const Dosyalarim: React.FC<DosyalarimProps> = ({
  documents,
  onAddDocument,
  onDeleteDocument,
  settings,
  onBackHome,
}) => {
  // Custom folders created by the user (stored in localStorage)
  const [customFolders, setCustomFolders] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('suat_custom_folders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Active folder selection ('Tümü' or specific folder name)
  const [selectedFolder, setSelectedFolder] = useState<string>('Tümü');

  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [deleteConfirmDoc, setDeleteConfirmDoc] = useState<DocumentItem | null>(null);
  const [activeTextDoc, setActiveTextDoc] = useState<DocumentItem | null>(null);

  // Fullscreen Photo Lightbox state
  const [fullscreenPhotoIndex, setFullscreenPhotoIndex] = useState<number | null>(null);
  const [photoZoom, setPhotoZoom] = useState(1);

  // New Folder Form State
  const [newFolderName, setNewFolderName] = useState('');

  // New Document Form State
  const [newTitle, setNewTitle] = useState('');
  const [newFolder, setNewFolder] = useState<string>('📷 Fotoğraflar');
  const [newType, setNewType] = useState<'image' | 'text' | 'pdf'>('image');
  const [newDesc, setNewDesc] = useState('');
  const [previewContent, setPreviewContent] = useState('');
  const [newFileName, setNewFileName] = useState('');
  const [newFileSize, setNewFileSize] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Combined list of all folders
  const allFolders = useMemo(() => {
    return [...DEFAULT_FOLDERS, ...customFolders.filter((f) => !DEFAULT_FOLDERS.includes(f))];
  }, [customFolders]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Persist custom folders
  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) return;

    const formatted = trimmed.startsWith('📁') || trimmed.startsWith('📷') || trimmed.startsWith('🩺')
      ? trimmed
      : `📁 ${trimmed}`;

    if (!allFolders.includes(formatted)) {
      const updated = [...customFolders, formatted];
      setCustomFolders(updated);
      try {
        localStorage.setItem('suat_custom_folders', JSON.stringify(updated));
      } catch {
        // ignore
      }
      setSelectedFolder(formatted);
      showToast(`"${formatted}" klasörü başarıyla oluşturuldu.`);
      if (settings.voiceAssistance) {
        sound.speak(`${formatted} klasörü oluşturuldu.`);
      }
    } else {
      setSelectedFolder(formatted);
    }

    setNewFolderName('');
    setShowNewFolderModal(false);
    if (settings.soundEffects) sound.playSuccess();
  };

  // Helper to determine all folders a document belongs to (non-exclusive: photos belong both to Fotoğraflar and their specific folder)
  const getDocFolders = useCallback((doc: DocumentItem): string[] => {
    const matched = new Set<string>();

    // 1. All photos automatically belong to "📷 Fotoğraflar"
    if (doc.type === 'image') {
      matched.add('📷 Fotoğraflar');
    }

    // 2. Direct folder field
    if (doc.folder && allFolders.includes(doc.folder)) {
      matched.add(doc.folder);
    }

    // 3. Category field if it matches an existing folder
    const cat = doc.category || '';
    if (allFolders.includes(cat)) {
      matched.add(cat);
    }

    // 4. Legacy and semantic categorization
    if (cat.includes('Torun') || doc.title.toLowerCase().includes('torun')) {
      matched.add('👶 Torunlar');
    }
    if (cat.includes('Aile') || doc.title.toLowerCase().includes('aile')) {
      matched.add('👨‍👩‍👧 Aile');
    }
    if (
      cat.includes('Sağlık') ||
      cat.includes('İlaç') ||
      cat.includes('Rapor') ||
      doc.title.toLowerCase().includes('rapor') ||
      doc.title.toLowerCase().includes('tahlil')
    ) {
      matched.add('🩺 Raporlar');
    }
    if (
      cat.includes('Fatura') ||
      cat.includes('Makbuz') ||
      cat.includes('Resmi') ||
      cat.includes('Evrak') ||
      doc.title.toLowerCase().includes('fatura') ||
      doc.title.toLowerCase().includes('makbuz') ||
      doc.title.toLowerCase().includes('abonelik')
    ) {
      matched.add('📄 Evraklar');
    }

    // 5. If it's a PDF and has no specific folder, also categorize under '📄 Evraklar'
    if (doc.type === 'pdf') {
      matched.add('📄 Evraklar');
    }

    // 6. If no folder matched at all, default to '📁 Diğer'
    if (matched.size === 0) {
      matched.add('📁 Diğer');
    }

    return Array.from(matched);
  }, [allFolders]);

  // Check if a document belongs to a given folder (or 'Tümü')
  const isDocInFolder = useCallback((doc: DocumentItem, folder: string): boolean => {
    if (folder === 'Tümü') return true;
    return getDocFolders(doc).includes(folder);
  }, [getDocFolders]);

  // Helper to determine the primary badge folder to display on the document card
  const getDocumentPrimaryFolder = useCallback((doc: DocumentItem): string => {
    if (doc.folder && allFolders.includes(doc.folder)) {
      return doc.folder;
    }
    const folders = getDocFolders(doc);
    const specific = folders.find((f) => f !== '📷 Fotoğraflar' && f !== '📁 Diğer');
    if (specific) return specific;
    if (doc.type === 'image') return '📷 Fotoğraflar';
    return folders[0] || '📁 Diğer';
  }, [allFolders, getDocFolders]);

  // Filtered documents
  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const matchesFolder = isDocInFolder(doc, selectedFolder);

      const query = searchQuery.toLowerCase().trim();
      if (!query) return matchesFolder;

      const docFolders = getDocFolders(doc);
      const matchesQuery =
        doc.title.toLowerCase().includes(query) ||
        (doc.description || '').toLowerCase().includes(query) ||
        (doc.fileName || '').toLowerCase().includes(query) ||
        docFolders.some((f) => f.toLowerCase().includes(query)) ||
        (doc.date || '').toLowerCase().includes(query);

      return matchesFolder && matchesQuery;
    });
  }, [documents, selectedFolder, searchQuery, isDocInFolder, getDocFolders]);

  // Extract all photos in current view for the fullscreen lightbox carousel
  const photoDocs = useMemo(() => {
    return filteredDocs.filter((d) => d.type === 'image');
  }, [filteredDocs]);

  // Open photo in fullscreen
  const handleOpenFullscreenPhoto = (doc: DocumentItem) => {
    if (settings.soundEffects) sound.playClick();
    const index = photoDocs.findIndex((d) => d.id === doc.id);
    if (index !== -1) {
      setFullscreenPhotoIndex(index);
      setPhotoZoom(1);
      if (settings.voiceAssistance) {
        sound.speak(`${doc.title}. Fotoğraf tam ekran açıldı.`);
      }
    }
  };

  // Fullscreen Navigation: Previous Photo
  const handlePrevPhoto = useCallback(() => {
    if (fullscreenPhotoIndex === null || photoDocs.length === 0) return;
    if (settings.soundEffects) sound.playClick();
    setPhotoZoom(1);
    setFullscreenPhotoIndex((prev) =>
      prev === null ? 0 : (prev - 1 + photoDocs.length) % photoDocs.length
    );
  }, [fullscreenPhotoIndex, photoDocs.length, settings.soundEffects]);

  // Fullscreen Navigation: Next Photo
  const handleNextPhoto = useCallback(() => {
    if (fullscreenPhotoIndex === null || photoDocs.length === 0) return;
    if (settings.soundEffects) sound.playClick();
    setPhotoZoom(1);
    setFullscreenPhotoIndex((prev) =>
      prev === null ? 0 : (prev + 1) % photoDocs.length
    );
  }, [fullscreenPhotoIndex, photoDocs.length, settings.soundEffects]);

  // Keyboard navigation for photo carousel
  useEffect(() => {
    if (fullscreenPhotoIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrevPhoto();
      } else if (e.key === 'ArrowRight') {
        handleNextPhoto();
      } else if (e.key === 'Escape') {
        setFullscreenPhotoIndex(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fullscreenPhotoIndex, handlePrevPhoto, handleNextPhoto]);

  // Handle local file picking
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileName = file.name;
      setNewFileName(fileName);

      // Estimate file size
      const sizeKb = Math.round(file.size / 1024);
      const sizeStr = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${sizeKb} KB`;
      setNewFileSize(sizeStr);

      // Auto-detect type
      const isImg = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');

      if (isImg) {
        setNewType('image');
        // If current folder is not photo-related, suggest photo folder
        if (!newFolder.includes('Fotoğraf') && !newFolder.includes('Aile') && !newFolder.includes('Torun')) {
          setNewFolder('📷 Fotoğraflar');
        }
      } else if (isPdf) {
        setNewType('pdf');
        if (!newFolder.includes('Rapor') && !newFolder.includes('Evrak')) {
          setNewFolder('📄 Evraklar');
        }
      } else {
        setNewType('text');
      }

      // Default title from file name
      if (!newTitle) {
        const cleanName = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setNewTitle(cleanName);
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewContent(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit new document
  const handleSubmitNewDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const today = new Date().toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const docItem: DocumentItem = {
      id: `doc-${Date.now()}`,
      title: newTitle.trim(),
      category: newFolder,
      folder: newFolder,
      date: today,
      type: newType,
      contentUrl: previewContent || '',
      description: newDesc.trim() || 'Dosyalarıma eklenen önemli evrak / fotoğraf.',
      fileSize: newFileSize || 'Bilinmiyor',
      fileName: newFileName || `${newTitle.trim()}.${newType === 'image' ? 'jpg' : 'pdf'}`,
    };

    onAddDocument(docItem);
    setShowAddModal(false);

    // Reset form
    setNewTitle('');
    setNewDesc('');
    setPreviewContent('');
    setNewFileName('');
    setNewFileSize('');

    if (settings.soundEffects) sound.playSuccess();
    showToast(`"${docItem.title}" başarıyla kütüphanenize eklendi.`);
    if (settings.voiceAssistance) {
      sound.speak(`${docItem.title} dosyası kaydedildi.`);
    }
  };

  // Confirm delete document
  const handleConfirmDelete = () => {
    if (!deleteConfirmDoc) return;
    onDeleteDocument(deleteConfirmDoc.id);
    showToast(`"${deleteConfirmDoc.title}" silindi.`);
    if (settings.soundEffects) sound.playClick();
    if (settings.voiceAssistance) {
      sound.speak('Dosya silindi.');
    }
    setDeleteConfirmDoc(null);
  };

  // Read aloud document
  const handleReadAloud = (doc: DocumentItem) => {
    if (settings.soundEffects) sound.playClick();
    sound.speak(`${doc.title}. Tarih: ${doc.date}. Açıklama: ${doc.description}`);
  };

  // Icon selector per folder
  const getFolderIcon = (name: string) => {
    if (name.includes('Fotoğraf')) return ImageIcon;
    if (name.includes('Aile')) return Users;
    if (name.includes('Torun')) return Baby;
    if (name.includes('Rapor')) return Stethoscope;
    if (name.includes('Evrak')) return FileText;
    return Folder;
  };

  return (
    <div
      id="dosyalarim-view"
      className={`min-h-full py-5 px-3 sm:px-6 transition-colors ${
        settings.highContrast ? 'bg-black text-white' : 'bg-slate-50 text-slate-900'
      }`}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* TOP BAR: Always visible Back Home Button */}
        <div
          className={`flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-5 rounded-3xl border-3 shadow-md ${
            settings.highContrast
              ? 'bg-black border-yellow-400 text-yellow-300'
              : 'bg-gradient-to-r from-purple-900 via-indigo-900 to-sky-900 border-purple-700 text-white'
          }`}
        >
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              id="btn-back-home-dosyalar"
              onClick={() => {
                if (settings.soundEffects) sound.playClick();
                if (settings.voiceAssistance) sound.speak('Ana ekrana dönülüyor.');
                if (onBackHome) onBackHome();
              }}
              className="flex items-center gap-2.5 px-5 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-lg sm:text-xl shadow-lg transform active:scale-95 transition-all cursor-pointer border-2 border-amber-200"
            >
              <ArrowLeft className="w-7 h-7" />
              <span>⬅️ Suat Merkezi'ne Dön</span>
            </button>
          </div>

          <div className="text-center sm:text-right">
            <div className="flex items-center justify-center sm:justify-end gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs sm:text-sm font-black tracking-wider uppercase">
                <Folder className="w-4 h-4 text-purple-300" />
                <span>KOLAY DOSYA YÖNETİCİSİ</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black">📁 Dosyalarım</h1>
            <p className="text-sm sm:text-base text-purple-100 font-medium">
              Aile & Torun Fotoğrafları, Doktor Raporları ve Evraklar
            </p>
          </div>
        </div>

        {/* Toast feedback */}
        {toastMessage && (
          <div
            role="status"
            className="p-4 rounded-2xl bg-emerald-600 text-white font-bold text-lg flex items-center gap-3 shadow-lg border-2 border-emerald-400"
          >
            <CheckCircle2 className="w-7 h-7 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* ACTIONS & CONTROLS TOOLBAR */}
        <div
          className={`p-4 sm:p-5 rounded-3xl border-3 shadow-md flex flex-wrap items-center justify-between gap-3 ${
            settings.highContrast
              ? 'bg-black border-yellow-400 text-white'
              : 'bg-white border-slate-200'
          }`}
        >
          {/* Main Action: Big "＋ Dosya Ekle" Button */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              id="btn-add-file"
              onClick={() => {
                if (settings.soundEffects) sound.playClick();
                setShowAddModal(true);
              }}
              className="flex items-center gap-2.5 px-6 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xl shadow-lg cursor-pointer transition-all active:scale-95 border-2 border-emerald-400"
            >
              <Plus className="w-7 h-7" />
              <span>＋ Dosya Ekle</span>
            </button>

            {/* New Folder Button */}
            <button
              id="btn-create-folder"
              onClick={() => {
                if (settings.soundEffects) sound.playClick();
                setShowNewFolderModal(true);
              }}
              className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-base sm:text-lg shadow-md cursor-pointer transition-all active:scale-95 border-2 border-purple-400"
            >
              <FolderPlus className="w-6 h-6" />
              <span>＋ Yeni Klasör</span>
            </button>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-slate-600 dark:text-zinc-300">
            <span>Toplam: <strong>{documents.length} Dosya</strong></span>
            <span>•</span>
            <span>Fotoğraf: <strong>{documents.filter((d) => d.type === 'image').length}</strong></span>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Fotoğraf, doktor raporu veya evrak adı ara..."
            className="w-full pl-13 pr-12 py-4 rounded-2xl border-2 border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white font-bold text-lg focus:outline-none focus:ring-4 focus:ring-purple-400 shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* FOLDERS GRID / PILLS */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-base sm:text-lg font-black text-slate-700 dark:text-zinc-300">
              📂 Klasörler:
            </span>
            {selectedFolder !== 'Tümü' && (
              <button
                onClick={() => setSelectedFolder('Tümü')}
                className="text-xs sm:text-sm font-black text-purple-600 hover:text-purple-800 dark:text-purple-400 cursor-pointer"
              >
                Tüm Dosyaları Göster ({documents.length})
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {/* 'Tümü' Pill */}
            <button
              onClick={() => {
                if (settings.soundEffects) sound.playClick();
                setSelectedFolder('Tümü');
              }}
              className={`p-3 rounded-2xl border-2 font-black text-left cursor-pointer transition-all flex flex-col justify-between ${
                selectedFolder === 'Tümü'
                  ? 'bg-purple-600 text-white border-purple-700 shadow-md scale-102'
                  : 'bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border-slate-300 hover:border-purple-300'
              }`}
            >
              <div className="text-lg">🌟 Tümü</div>
              <div className="text-xs opacity-80 mt-1 font-bold">{documents.length} Dosya</div>
            </button>

            {/* Each Folder Pill */}
            {allFolders.map((folderName) => {
              const FolderIcon = getFolderIcon(folderName);
              const count = documents.filter((d) => isDocInFolder(d, folderName)).length;
              const isSelected = selectedFolder === folderName;

              return (
                <button
                  key={folderName}
                  onClick={() => {
                    if (settings.soundEffects) sound.playClick();
                    setSelectedFolder(folderName);
                    if (settings.voiceAssistance) {
                      sound.speak(`${folderName} klasörü seçildi.`);
                    }
                  }}
                  className={`p-3 rounded-2xl border-2 font-black text-left cursor-pointer transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-700 shadow-md scale-102'
                      : 'bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border-slate-300 hover:border-purple-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-base truncate">
                    <FolderIcon className="w-5 h-5 shrink-0" />
                    <span className="truncate">{folderName}</span>
                  </div>
                  <div className="text-xs opacity-80 mt-1 font-bold">{count} Dosya</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ACTIVE SECTION HEADER */}
        <div className="flex items-center justify-between pt-2 border-b border-slate-200 dark:border-zinc-700 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {selectedFolder === 'Tümü' ? '🌟 Tüm Dosyalar' : selectedFolder}
            </span>
            <span className="px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 font-bold text-sm">
              {filteredDocs.length} Dosya Bulundu
            </span>
          </div>
        </div>

        {/* DOCUMENTS & PHOTOS GRID */}
        {filteredDocs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDocs.map((doc) => {
              const isPhoto = doc.type === 'image';
              const folderName = getDocumentPrimaryFolder(doc);

              return (
                <div
                  key={doc.id}
                  className={`rounded-3xl border-3 shadow-md overflow-hidden flex flex-col justify-between transition-all ${
                    settings.highContrast
                      ? 'bg-black border-zinc-700 text-white hover:border-yellow-400'
                      : 'bg-white border-slate-200 hover:border-purple-300'
                  }`}
                >
                  {/* Photo Preview / Document Header */}
                  {isPhoto && doc.contentUrl ? (
                    <div
                      onClick={() => handleOpenFullscreenPhoto(doc)}
                      className="relative aspect-4/3 bg-slate-100 dark:bg-zinc-900 overflow-hidden cursor-pointer group"
                      title="Fotoğrafı Büyütmek İçin Dokunun"
                    >
                      <img
                        src={doc.contentUrl}
                        alt={doc.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-black text-lg">
                        <Maximize2 className="w-8 h-8" />
                        <span>Fotoğrafı Büyüt</span>
                      </div>
                      <span className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-black/70 text-white font-bold text-xs backdrop-blur-xs flex items-center gap-1">
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Büyüt</span>
                      </span>
                    </div>
                  ) : (
                    <div
                      onClick={() => setActiveTextDoc(doc)}
                      className={`p-6 flex flex-col items-center justify-center text-center cursor-pointer ${
                        doc.type === 'pdf'
                          ? 'bg-red-50 dark:bg-zinc-800/80 text-red-700 dark:text-red-300'
                          : 'bg-sky-50 dark:bg-zinc-800/80 text-sky-700 dark:text-sky-300'
                      }`}
                    >
                      {doc.type === 'pdf' ? (
                        <FileText className="w-16 h-16 mb-2" />
                      ) : (
                        <File className="w-16 h-16 mb-2" />
                      )}
                      <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-white/70 dark:bg-zinc-700">
                        {doc.type === 'pdf' ? 'PDF Belgesi' : 'Metin Evrak'}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-zinc-400 mt-2">
                        Görüntülemek için dokunun
                      </span>
                    </div>
                  )}

                  {/* Card Info Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 text-xs font-black truncate max-w-[180px]">
                          {folderName}
                        </span>
                        <span className="text-xs text-slate-400 font-bold">{doc.date}</span>
                      </div>

                      <h3 className="text-xl font-black text-slate-900 dark:text-white leading-snug line-clamp-2">
                        {doc.title}
                      </h3>

                      {doc.description && (
                        <p className="text-sm text-slate-600 dark:text-zinc-300 mt-1.5 line-clamp-2 leading-relaxed">
                          {doc.description}
                        </p>
                      )}
                    </div>

                    {/* Footer Controls */}
                    <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {/* Read aloud */}
                        <button
                          onClick={() => handleReadAloud(doc)}
                          title="Sesli Oku"
                          className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 cursor-pointer"
                        >
                          <Volume2 className="w-5 h-5" />
                        </button>

                        {/* Open / Fullscreen */}
                        {isPhoto ? (
                          <button
                            onClick={() => handleOpenFullscreenPhoto(doc)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200 font-bold text-sm cursor-pointer"
                          >
                            <Maximize2 className="w-4 h-4" />
                            <span>Büyüt</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setActiveTextDoc(doc)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-100 hover:bg-sky-200 dark:bg-sky-900/50 text-sky-800 dark:text-sky-200 font-bold text-sm cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                            <span>Aç / Oku</span>
                          </button>
                        )}
                      </div>

                      {/* Delete */}
                      <button
                        onClick={() => {
                          if (settings.soundEffects) sound.playClick();
                          setDeleteConfirmDoc(doc);
                        }}
                        title="Dosyayı Sil"
                        className="p-2.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-zinc-800 text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 rounded-3xl border-2 border-dashed border-slate-300 dark:border-zinc-700 text-center bg-white/50 dark:bg-zinc-900/50 space-y-4">
            <span className="text-5xl block">📂</span>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white">
              Bu Klasörde Henüz Dosya Yok
            </h3>
            <p className="text-base text-slate-600 dark:text-zinc-400 max-w-md mx-auto">
              Bilgisayarınızdaki aile fotoğraflarını, torun hatıralarını veya doktor raporlarını buraya ekleyebilirsiniz.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-8 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg shadow-lg cursor-pointer inline-flex items-center gap-2"
            >
              <Plus className="w-6 h-6" />
              <span>＋ İlk Dosyanızı Ekleyin</span>
            </button>
          </div>
        )}

        {/* MODAL 1: FULLSCREEN PHOTO LIGHTBOX WITH ZOOM & PREV/NEXT CAROUSEL */}
        {fullscreenPhotoIndex !== null && photoDocs[fullscreenPhotoIndex] && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-black/95 flex flex-col justify-between p-3 sm:p-6 select-none"
          >
            {/* Lightbox Top Header */}
            <div className="flex items-center justify-between text-white pb-3 border-b border-white/20">
              <div className="flex items-center gap-3 truncate">
                <span className="px-3 py-1 rounded-xl bg-purple-600 text-white font-black text-sm">
                  Fotoğraf {fullscreenPhotoIndex + 1} / {photoDocs.length}
                </span>
                <h3 className="text-lg sm:text-2xl font-black truncate">
                  {photoDocs[fullscreenPhotoIndex].title}
                </h3>
              </div>

              {/* Zoom Controls & Close */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPhotoZoom((z) => Math.min(3, z + 0.3))}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/25 text-white font-bold cursor-pointer"
                  title="Yakınlaştır (+)"
                >
                  <ZoomIn className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setPhotoZoom((z) => Math.max(0.6, z - 0.3))}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/25 text-white font-bold cursor-pointer"
                  title="Uzaklaştır (-)"
                >
                  <ZoomOut className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setPhotoZoom(1)}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/25 text-white font-bold cursor-pointer"
                  title="Normal Boyut (%100)"
                >
                  <RotateCcw className="w-6 h-6" />
                </button>
                <button
                  onClick={() => setFullscreenPhotoIndex(null)}
                  className="p-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black cursor-pointer ml-2"
                  title="Kapat"
                >
                  <X className="w-7 h-7" />
                </button>
              </div>
            </div>

            {/* Lightbox Center Image View */}
            <div className="relative flex-1 flex items-center justify-center overflow-hidden my-2">
              <img
                src={photoDocs[fullscreenPhotoIndex].contentUrl}
                alt={photoDocs[fullscreenPhotoIndex].title}
                style={{
                  transform: `scale(${photoZoom})`,
                  transition: 'transform 0.2s ease-out',
                }}
                className="max-h-[75vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl"
              />

              {/* Previous Photo Button */}
              {photoDocs.length > 1 && (
                <button
                  onClick={handlePrevPhoto}
                  className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 p-4 sm:p-5 rounded-full bg-black/60 hover:bg-black/90 text-white border-2 border-white/30 cursor-pointer transition-transform active:scale-90 shadow-2xl"
                  title="Önceki Fotoğraf (Sol Ok Tuşu)"
                >
                  <ChevronLeft className="w-8 h-8 sm:w-10 sm:h-10" />
                </button>
              )}

              {/* Next Photo Button */}
              {photoDocs.length > 1 && (
                <button
                  onClick={handleNextPhoto}
                  className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 p-4 sm:p-5 rounded-full bg-black/60 hover:bg-black/90 text-white border-2 border-white/30 cursor-pointer transition-transform active:scale-90 shadow-2xl"
                  title="Sonraki Fotoğraf (Sağ Ok Tuşu)"
                >
                  <ChevronRight className="w-8 h-8 sm:w-10 sm:h-10" />
                </button>
              )}
            </div>

            {/* Lightbox Bottom Description */}
            <div className="bg-white/10 rounded-2xl p-4 text-white text-center sm:flex sm:items-center sm:justify-between">
              <div className="text-base sm:text-lg font-medium">
                {photoDocs[fullscreenPhotoIndex].description}
              </div>
              <div className="text-xs sm:text-sm text-white/70 mt-2 sm:mt-0 font-bold">
                Tarih: {photoDocs[fullscreenPhotoIndex].date}
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: DOCUMENT / REPORT READER MODAL */}
        {activeTextDoc && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <div
              className={`w-full max-w-2xl max-h-[90vh] flex flex-col p-6 sm:p-8 rounded-3xl border-3 shadow-2xl ${
                settings.highContrast
                  ? 'bg-black border-yellow-400 text-white'
                  : 'bg-white text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-zinc-700">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-8 h-8 text-purple-600" />
                  <div>
                    <h3 className="text-2xl font-black">{activeTextDoc.title}</h3>
                    <span className="text-xs text-slate-500 dark:text-zinc-400 font-bold">
                      {getDocumentPrimaryFolder(activeTextDoc)} • {activeTextDoc.date}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTextDoc(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-7 h-7" />
                </button>
              </div>

              {/* Document Body */}
              <div className="my-6 p-6 rounded-2xl bg-slate-50 dark:bg-zinc-800 border-2 border-slate-200 dark:border-zinc-700 overflow-y-auto flex-1 font-sans text-lg sm:text-xl leading-relaxed whitespace-pre-wrap">
                {activeTextDoc.description}
              </div>

              {/* Document Actions */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-zinc-700">
                <button
                  onClick={() => handleReadAloud(activeTextDoc)}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-base cursor-pointer shadow-sm"
                >
                  <Volume2 className="w-5 h-5" />
                  <span>Sesli Oku</span>
                </button>

                <button
                  onClick={() => setActiveTextDoc(null)}
                  className="px-6 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-base cursor-pointer"
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: ADD NEW DOCUMENT / PHOTO */}
        {showAddModal && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          >
            <div
              className={`w-full max-w-xl p-6 sm:p-8 rounded-3xl border-3 shadow-2xl my-6 ${
                settings.highContrast
                  ? 'bg-black border-yellow-400 text-white'
                  : 'bg-white text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-zinc-700 mb-5">
                <h3 className="text-2xl font-black flex items-center gap-2">
                  <Upload className="w-7 h-7 text-emerald-600" />
                  <span>Dosya / Fotoğraf Ekle</span>
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-7 h-7" />
                </button>
              </div>

              <form onSubmit={handleSubmitNewDocument} className="space-y-4">
                {/* File picker button & area */}
                <div>
                  <label className="block font-black text-base mb-1.5">
                    Bilgisayarınızdan Dosya Seçin *:
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,application/pdf,text/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="p-6 rounded-2xl border-3 border-dashed border-emerald-400 dark:border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 text-center cursor-pointer hover:bg-emerald-100/50 transition-colors"
                  >
                    {newFileName ? (
                      <div className="flex items-center justify-center gap-2 text-emerald-800 dark:text-emerald-300 font-black text-lg">
                        <CheckCircle2 className="w-6 h-6" />
                        <span className="truncate max-w-xs">{newFileName}</span>
                        <span className="text-xs opacity-75">({newFileSize})</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Upload className="w-10 h-10 text-emerald-600 mx-auto" />
                        <div className="text-lg font-black text-slate-900 dark:text-white">
                          Fotoğraf veya Belge Seçmek İçin Dokunun
                        </div>
                        <div className="text-xs text-slate-500 dark:text-zinc-400">
                          (JPG, PNG, PDF veya Metin Belgesi)
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Preview if image */}
                {previewContent && newType === 'image' && (
                  <div className="text-center">
                    <img
                      src={previewContent}
                      alt="Önizleme"
                      className="max-h-40 mx-auto rounded-xl border-2 border-slate-300 shadow-sm"
                    />
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block font-black text-base mb-1">
                    Dosya Başlığı / Adı *:
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Örn: Torun Can Bayram Fotoğrafı veya Kan Tahlili"
                    required
                    className="w-full p-3.5 rounded-xl border-2 border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 font-bold text-lg focus:ring-3 focus:ring-emerald-400"
                  />
                </div>

                {/* Folder Selection */}
                <div>
                  <label className="block font-black text-base mb-1">Klasör Seçin *:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {allFolders.map((fld) => (
                      <button
                        type="button"
                        key={fld}
                        onClick={() => setNewFolder(fld)}
                        className={`p-2.5 rounded-xl text-sm font-black border cursor-pointer truncate ${
                          newFolder === fld
                            ? 'bg-purple-600 text-white border-purple-700'
                            : 'bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border-slate-300'
                        }`}
                      >
                        {fld}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block font-black text-base mb-1">
                    Açıklama / Hatırlatma Notu:
                  </label>
                  <textarea
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    rows={2}
                    placeholder="Bu fotoğraf veya evrak hakkında hatırlatıcı not..."
                    className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-sm"
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-zinc-700">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-5 py-3 rounded-xl border border-slate-300 text-slate-700 dark:text-zinc-300 font-bold cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    Dosyayı Kaydet
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 4: CREATE NEW FOLDER */}
        {showNewFolderModal && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <div
              className={`w-full max-w-md p-6 sm:p-8 rounded-3xl border-3 shadow-2xl ${
                settings.highContrast
                  ? 'bg-black border-yellow-400 text-white'
                  : 'bg-white text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                <h3 className="text-2xl font-black flex items-center gap-2">
                  <FolderPlus className="w-7 h-7 text-purple-600" />
                  <span>Yeni Klasör Oluştur</span>
                </h3>
                <button
                  onClick={() => setShowNewFolderModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCreateFolder} className="space-y-4">
                <div>
                  <label className="block font-black text-base mb-1.5">Klasör Adı *:</label>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Örn: Yazlık Hatıraları, Askerlik vb."
                    required
                    autoFocus
                    className="w-full p-3.5 rounded-xl border-2 border-slate-300 dark:border-zinc-700 font-bold text-lg"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowNewFolderModal(false)}
                    className="px-5 py-3 rounded-xl border border-slate-300 font-bold cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black cursor-pointer shadow-md"
                  >
                    Klasörü Oluştur
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 5: DELETE CONFIRMATION (Explicit requirement 8) */}
        {deleteConfirmDoc && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-white dark:bg-zinc-900 text-slate-900 dark:text-white border-3 border-red-500 shadow-2xl text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-8 h-8" />
              </div>

              <h3 className="text-2xl font-black">
                Bu dosyayı silmek istediğinizden emin misiniz?
              </h3>

              <div className="p-3 bg-slate-100 dark:bg-zinc-800 rounded-xl text-slate-700 dark:text-zinc-200 font-bold">
                "{deleteConfirmDoc.title}"
              </div>

              <p className="text-sm text-slate-500 dark:text-zinc-400">
                Bu işlem geri alınamaz. Dosya kütüphanenizden kalıcı olarak kaldırılacaktır.
              </p>

              <div className="flex items-center justify-center gap-3 pt-3">
                <button
                  onClick={() => setDeleteConfirmDoc(null)}
                  className="px-6 py-3.5 rounded-xl border border-slate-300 font-bold text-base cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-8 py-3.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-base shadow-md cursor-pointer"
                >
                  Evet, Sil
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
