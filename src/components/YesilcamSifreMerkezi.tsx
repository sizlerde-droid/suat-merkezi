import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PasswordItem, PasswordCategory, AppSettings } from '../types';
import {
  Lock,
  Unlock,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Plus,
  Trash2,
  Edit,
  Volume2,
  Maximize2,
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  Sparkles,
  Download,
  Upload,
  Clock,
  Home,
  X,
  Mail,
  Wifi,
  Smartphone,
  Tv,
  CreditCard,
  Tag,
  RefreshCw,
} from 'lucide-react';
import { sound } from '../utils/audio';
import {
  encryptVaultData,
  decryptVaultData,
  generateRandomPassword,
  generateMemorablePassphrase,
} from '../utils/vaultCrypto';
import { initialPasswords } from '../data/initialData';

interface YesilcamSifreMerkeziProps {
  onBackHome: () => void;
  settings: AppSettings;
}

const STORAGE_VAULT_KEY = 'suat_encrypted_vault';
const CATEGORIES: PasswordCategory[] = ['Mail', 'Wi-Fi', 'Telefon', 'TV', 'Banka', 'Diğer'];

export const YesilcamSifreMerkezi: React.FC<YesilcamSifreMerkeziProps> = ({
  onBackHome,
  settings,
}) => {
  // Vault state
  const [isLocked, setIsLocked] = useState(true);
  const [hasExistingVault, setHasExistingVault] = useState(false);
  const [masterPasswordInput, setMasterPasswordInput] = useState('');
  const [showMasterPassword, setShowMasterPassword] = useState(false);
  const [currentMasterPassword, setCurrentMasterPassword] = useState<string | null>(null);

  // Decrypted passwords kept strictly in RAM (never plaintext in storage)
  const [items, setItems] = useState<PasswordItem[]>([]);

  // Setup mode (for first time users)
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);
  const [setupPin, setSetupPin] = useState('1234');
  const [setupPinConfirm, setSetupPinConfirm] = useState('1234');
  const [setupHint, setSetupHint] = useState('');

  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tümü');
  const [visiblePasswordIds, setVisiblePasswordIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PasswordItem | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<PasswordItem | null>(null);
  const [showGeneratorModal, setShowGeneratorModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [giantModalItem, setGiantModalItem] = useState<PasswordItem | null>(null);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<PasswordCategory>('Mail');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formShowPassword, setFormShowPassword] = useState(false);

  // Auto-lock timer state
  const [autoLockMinutes, setAutoLockMinutes] = useState<number>(3); // 3 minutes default
  const lastActivityRef = useRef<number>(Date.now());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if vault exists on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_VAULT_KEY);
      if (stored) {
        setHasExistingVault(true);
        setIsFirstTimeSetup(false);
      } else {
        setHasExistingVault(false);
        setIsFirstTimeSetup(true);
      }
    } catch {
      setHasExistingVault(false);
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // Lock the vault and flush decrypted secrets from RAM
  const handleLockVault = useCallback(() => {
    if (settings.soundEffects) sound.playClick();
    setIsLocked(true);
    setCurrentMasterPassword(null);
    setItems([]);
    setMasterPasswordInput('');
    setVisiblePasswordIds([]);
    setGiantModalItem(null);
    setShowAddEditModal(false);
    setShowDeleteModal(null);
    showToast('Kasa güvenle kilitlendi. Şifreleriniz koruma altında.');
    if (settings.voiceAssistance) {
      sound.speak('Şifre kasası kilitlendi.');
    }
  }, [settings.soundEffects, settings.voiceAssistance]);

  // Auto-lock inactivity listener
  useEffect(() => {
    if (isLocked || autoLockMinutes <= 0) return;

    const resetTimer = () => {
      lastActivityRef.current = Date.now();
    };

    const interval = setInterval(() => {
      const elapsedMs = Date.now() - lastActivityRef.current;
      const thresholdMs = autoLockMinutes * 60 * 1000;
      if (elapsedMs >= thresholdMs) {
        handleLockVault();
      }
    }, 5000);

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('touchstart', resetTimer);
    window.addEventListener('scroll', resetTimer);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
      window.removeEventListener('scroll', resetTimer);
    };
  }, [isLocked, autoLockMinutes, handleLockVault]);

  // Unlock Vault with Master Password
  const handleUnlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const enteredPin = masterPasswordInput.trim();
    if (!enteredPin) {
      setErrorMessage('Lütfen Ana Parolanızı giriniz.');
      return;
    }

    try {
      const encryptedStr = localStorage.getItem(STORAGE_VAULT_KEY);
      if (!encryptedStr) {
        setErrorMessage('Kasa bulunamadı.');
        return;
      }

      const decrypted = await decryptVaultData<PasswordItem[]>(encryptedStr, enteredPin);

      // Successfully decrypted!
      setItems(decrypted);
      setCurrentMasterPassword(enteredPin);
      setIsLocked(false);
      setMasterPasswordInput('');
      lastActivityRef.current = Date.now();

      if (settings.soundEffects) sound.playSuccess();
      showToast('Kasa açıldı. Şifreleriniz güvende!');
      if (settings.voiceAssistance) {
        sound.speak('Şifre kasası açıldı.');
      }
    } catch (err: unknown) {
      if (settings.soundEffects) sound.playClick();
      setErrorMessage('Hatalı Ana Parola! Lütfen kontrol edip tekrar deneyiniz.');
      if (settings.voiceAssistance) {
        sound.speak('Hatalı ana parola. Lütfen tekrar deneyiniz.');
      }
    }
  };

  // First time setup: Encrypt initial records and save
  const handleFirstTimeSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!setupPin.trim()) {
      setErrorMessage('Lütfen bir Ana Parola belirleyiniz.');
      return;
    }
    if (setupPin !== setupPinConfirm) {
      setErrorMessage('Girdiğiniz iki parola birbiriyle eşleşmiyor.');
      return;
    }

    try {
      // Encrypt initial demo passwords with user's new master password
      const encryptedPayload = await encryptVaultData(
        initialPasswords,
        setupPin.trim(),
        setupHint.trim()
      );
      localStorage.setItem(STORAGE_VAULT_KEY, encryptedPayload);

      // Clean up any old plaintext passwords from previous sessions
      try {
        localStorage.removeItem('suat_passwords');
      } catch {
        // ignore
      }

      setHasExistingVault(true);
      setIsFirstTimeSetup(false);
      setCurrentMasterPassword(setupPin.trim());
      setItems(initialPasswords);
      setIsLocked(false);
      lastActivityRef.current = Date.now();

      if (settings.soundEffects) sound.playSuccess();
      showToast('Şifre kasanız askeri düzeyde AES-256 ile kuruldu ve açıldı!');
      if (settings.voiceAssistance) {
        sound.speak('Şifre kasanız başarıyla kuruldu ve açıldı.');
      }
    } catch {
      setErrorMessage('Kasa oluşturulurken bir hata meydana geldi.');
    }
  };

  // Persist updated records into encrypted storage
  const saveEncryptedItems = async (newItems: PasswordItem[]) => {
    if (!currentMasterPassword) return;
    try {
      const encrypted = await encryptVaultData(newItems, currentMasterPassword);
      localStorage.setItem(STORAGE_VAULT_KEY, encrypted);
      setItems(newItems);
    } catch {
      showToast('Kasa güncellenirken şifreleme hatası oluştu.');
    }
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    if (settings.soundEffects) sound.playClick();
    setEditingItem(null);
    setFormTitle('');
    setFormCategory('Mail');
    setFormUsername('');
    setFormPassword('');
    setFormDescription('');
    setFormShowPassword(false);
    setShowAddEditModal(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: PasswordItem) => {
    if (settings.soundEffects) sound.playClick();
    setEditingItem(item);
    setFormTitle(item.title);
    setFormCategory(item.category);
    setFormUsername(item.username);
    setFormPassword(item.password || item.secret || '');
    setFormDescription(item.description || item.notes || '');
    setFormShowPassword(false);
    setShowAddEditModal(true);
  };

  // Save Add/Edit
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formPassword.trim()) {
      showToast('Lütfen başlık ve parola alanlarını doldurunuz.');
      return;
    }

    const todayDate = new Date().toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    let updatedList: PasswordItem[];
    if (editingItem) {
      updatedList = items.map((it) =>
        it.id === editingItem.id
          ? {
              ...it,
              title: formTitle.trim(),
              category: formCategory,
              username: formUsername.trim() || 'Belirtilmedi',
              password: formPassword.trim(),
              secret: formPassword.trim(),
              description: formDescription.trim() || 'Önemli hesap bilgisi',
              notes: formDescription.trim() || 'Önemli hesap bilgisi',
              updatedAt: todayDate,
            }
          : it
      );
      showToast(`"${formTitle.trim()}" güncellendi ve kasanız şifrelendi.`);
    } else {
      const newItem: PasswordItem = {
        id: `pwd-${Date.now()}`,
        title: formTitle.trim(),
        category: formCategory,
        username: formUsername.trim() || 'Belirtilmedi',
        password: formPassword.trim(),
        secret: formPassword.trim(),
        description: formDescription.trim() || 'Önemli hesap bilgisi',
        notes: formDescription.trim() || 'Önemli hesap bilgisi',
        updatedAt: todayDate,
      };
      updatedList = [newItem, ...items];
      showToast(`"${formTitle.trim()}" kasanıza güvenle eklendi.`);
    }

    await saveEncryptedItems(updatedList);
    setShowAddEditModal(false);
    if (settings.soundEffects) sound.playSuccess();
  };

  // Delete Item
  const handleConfirmDelete = async () => {
    if (!showDeleteModal) return;
    const filtered = items.filter((it) => it.id !== showDeleteModal.id);
    await saveEncryptedItems(filtered);
    showToast(`"${showDeleteModal.title}" kasanızdan silindi.`);
    setShowDeleteModal(null);
    if (settings.soundEffects) sound.playClick();
  };

  // Copy password to clipboard with security timer
  const handleCopyPassword = (id: string, pwdText: string, titleText: string) => {
    navigator.clipboard.writeText(pwdText);
    setCopiedId(id);
    if (settings.soundEffects) sound.playSuccess();
    showToast(`"${titleText}" parolası panoya kopyalandı.`);
    if (settings.voiceAssistance) {
      sound.speak(`${titleText} parolası kopyalandı.`);
    }
    setTimeout(() => {
      setCopiedId((prev) => (prev === id ? null : prev));
    }, 3000);
  };

  // Toggle visible status of individual password in list
  const toggleVisibility = (id: string) => {
    if (settings.soundEffects) sound.playClick();
    setVisiblePasswordIds((prev) =>
      prev.includes(id) ? prev.filter((it) => it !== id) : [...prev, id]
    );
  };

  // Read aloud
  const handleReadAloud = (item: PasswordItem) => {
    if (settings.soundEffects) sound.playClick();
    const pwd = item.password || item.secret || '';
    const spaced = pwd.split('').join(' ');
    sound.speak(`${item.title}. Kullanıcı adı: ${item.username}. Parolanız: ${spaced}`);
  };

  // Export encrypted backup
  const handleExportBackup = () => {
    if (settings.soundEffects) sound.playClick();
    const stored = localStorage.getItem(STORAGE_VAULT_KEY);
    if (!stored) return;

    const blob = new Blob([stored], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `suat_sifre_kasasi_yedek_${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (settings.soundEffects) sound.playSuccess();
    showToast('Şifreli kasa yedeği bilgisayarınıza indirildi.');
  };

  // Import backup file
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        // Verify format
        const parsed = JSON.parse(content);
        if (!parsed.salt || !parsed.data) {
          showToast('Geçersiz yedek dosyası!');
          return;
        }

        // Test decryption with current master password
        if (currentMasterPassword) {
          const testDecrypted = await decryptVaultData<PasswordItem[]>(
            content,
            currentMasterPassword
          );
          localStorage.setItem(STORAGE_VAULT_KEY, content);
          setItems(testDecrypted);
          showToast('Yedek başarıyla içe aktarıldı ve kasanız güncellendi!');
          setShowBackupModal(false);
        } else {
          // If locked or outside, save payload to storage
          localStorage.setItem(STORAGE_VAULT_KEY, content);
          showToast('Yedek kaydedildi. Lütfen ana parolanızla giriş yapınız.');
          setShowBackupModal(false);
        }
      } catch {
        showToast('Yedek dosyası açılamadı. Parola uyuşmuyor olabilir.');
      }
    };
    reader.readAsText(file);
  };

  // Reset vault to factory defaults if forgotten
  const handleResetVault = () => {
    localStorage.removeItem(STORAGE_VAULT_KEY);
    setIsLocked(true);
    setHasExistingVault(false);
    setIsFirstTimeSetup(true);
    setSetupPin('1234');
    setSetupPinConfirm('1234');
    setShowResetConfirmModal(false);
    showToast('Kasa sıfırlandı. Yeni bir Ana Parola belirleyebilirsiniz.');
  };

  // Filtered items
  const filteredItems = items.filter((item) => {
    const matchesCategory =
      selectedCategory === 'Tümü' || item.category === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesCategory;

    const pwd = (item.password || item.secret || '').toLowerCase();
    const matchesQuery =
      item.title.toLowerCase().includes(query) ||
      item.username.toLowerCase().includes(query) ||
      (item.description || item.notes || '').toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      pwd.includes(query);

    return matchesCategory && matchesQuery;
  });

  // Category Icon & Colors
  const getCategoryMeta = (cat: PasswordCategory) => {
    switch (cat) {
      case 'Mail':
        return {
          icon: Mail,
          bgLight: 'bg-blue-100 text-blue-800 border-blue-300',
          badgeText: 'Mail & E-Posta',
        };
      case 'Wi-Fi':
        return {
          icon: Wifi,
          bgLight: 'bg-purple-100 text-purple-800 border-purple-300',
          badgeText: 'Wi-Fi & İnternet',
        };
      case 'Telefon':
        return {
          icon: Smartphone,
          bgLight: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          badgeText: 'Telefon & PIN',
        };
      case 'TV':
        return {
          icon: Tv,
          bgLight: 'bg-red-100 text-red-800 border-red-300',
          badgeText: 'Televizyon',
        };
      case 'Banka':
        return {
          icon: CreditCard,
          bgLight: 'bg-amber-100 text-amber-900 border-amber-300',
          badgeText: 'Banka Hatırlatıcı',
        };
      case 'Diğer':
      default:
        return {
          icon: Tag,
          bgLight: 'bg-slate-200 text-slate-800 border-slate-300',
          badgeText: 'Diğer Hesaplar',
        };
    }
  };

  return (
    <div
      id="yesilcam-sifre-merkezi-view"
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
              : 'bg-gradient-to-r from-sky-900 via-sky-800 to-indigo-900 border-sky-700 text-white'
          }`}
        >
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              id="btn-back-home-sifre"
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
            <div className="flex items-center justify-center sm:justify-end gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-xs sm:text-sm font-black tracking-wider uppercase">
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                <span>%100 YEREL & GÜVENLİ KASA</span>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black">🔐 Yeşilçam Şifre Kasası</h1>
            <p className="text-sm sm:text-base text-sky-100 font-medium">
              Mail, Wi-Fi, Telefon, TV, Banka ve Diğer Şifreleriniz
            </p>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div
            role="status"
            className="p-4 rounded-2xl bg-emerald-600 text-white font-bold text-lg flex items-center gap-3 shadow-lg animate-fade-in border-2 border-emerald-400"
          >
            <CheckCircle2 className="w-7 h-7 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* STATE A: FIRST TIME VAULT SETUP */}
        {isFirstTimeSetup && (
          <div
            className={`p-6 sm:p-10 rounded-3xl border-3 shadow-xl max-w-2xl mx-auto text-center ${
              settings.highContrast
                ? 'bg-black border-yellow-400 text-white'
                : 'bg-white border-sky-300'
            }`}
          >
            <div className="w-20 h-20 rounded-3xl bg-sky-100 text-sky-700 flex items-center justify-center mx-auto mb-4 shadow-md">
              <KeyRound className="w-12 h-12" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-2">
              Şifre Kasanızı Kurun
            </h2>
            <p className="text-base sm:text-lg text-slate-600 dark:text-zinc-300 mb-6 leading-relaxed">
              Şifrelerinizi korumak için kendinize kolayca hatırlayabileceğiniz bir <strong>Ana Parola</strong> belirleyin.
            </p>

            {errorMessage && (
              <div className="mb-4 p-4 rounded-2xl bg-red-100 text-red-900 font-bold border-2 border-red-300 text-left">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleFirstTimeSetup} className="space-y-5 text-left">
              <div>
                <label className="block font-black text-lg text-slate-900 dark:text-white mb-2">
                  🔑 Ana Parola / PIN Belirleyin:
                </label>
                <input
                  type="text"
                  value={setupPin}
                  onChange={(e) => setSetupPin(e.target.value)}
                  placeholder="Örn: 1234 veya yesilcam1954"
                  className="w-full p-4 rounded-2xl border-3 border-sky-300 dark:border-zinc-600 bg-sky-50/50 dark:bg-zinc-800 text-slate-900 dark:text-white font-black text-xl tracking-wider focus:outline-none focus:ring-4 focus:ring-sky-400"
                  required
                />
                <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1.5">
                  Öneri: Doğum yılınız, torununuzun adı veya "1234" gibi unutmayacağınız bir kod.
                </p>
              </div>

              <div>
                <label className="block font-black text-lg text-slate-900 dark:text-white mb-2">
                  ✓ Ana Parolayı Tekrar Yazın:
                </label>
                <input
                  type="text"
                  value={setupPinConfirm}
                  onChange={(e) => setSetupPinConfirm(e.target.value)}
                  placeholder="Aynı parolayı tekrar yazınız"
                  className="w-full p-4 rounded-2xl border-3 border-sky-300 dark:border-zinc-600 bg-sky-50/50 dark:bg-zinc-800 text-slate-900 dark:text-white font-black text-xl tracking-wider focus:outline-none focus:ring-4 focus:ring-sky-400"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-base text-slate-700 dark:text-zinc-300 mb-1">
                  💡 Hatırlatma İpucu (İsteğe Bağlı):
                </label>
                <input
                  type="text"
                  value={setupHint}
                  onChange={(e) => setSetupHint(e.target.value)}
                  placeholder="Örn: Evlilik yılım veya memleket plakası"
                  className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white text-base"
                />
              </div>

              {/* Security guarantee card */}
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-zinc-900 border-2 border-emerald-300 dark:border-emerald-600 text-sm text-slate-700 dark:text-zinc-300 space-y-1">
                <div className="font-black text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>Tam Güvenlik Sözü:</span>
                </div>
                <div>• Şifreleriniz asla internete, sunucuya veya yapay zekaya gönderilmez.</div>
                <div>• Tarayıcınızda düz metin olarak değil, AES-256 ile kilitli saklanır.</div>
              </div>

              <button
                type="submit"
                id="btn-create-vault"
                className="w-full py-5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-black text-xl shadow-xl transition-all active:scale-95 cursor-pointer border-2 border-sky-400"
              >
                🔐 Kasanızı Oluşturun ve Açın
              </button>
            </form>
          </div>
        )}

        {/* STATE B: LOCKED VAULT SCREEN */}
        {!isFirstTimeSetup && isLocked && (
          <div
            className={`p-6 sm:p-10 rounded-3xl border-3 shadow-xl max-w-xl mx-auto text-center ${
              settings.highContrast
                ? 'bg-black border-yellow-400 text-white'
                : 'bg-white border-sky-300'
            }`}
          >
            <div className="w-20 h-20 rounded-3xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4 shadow-md">
              <Lock className="w-12 h-12" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mb-2">
              Kasa Kilitli
            </h2>
            <p className="text-base sm:text-lg text-slate-600 dark:text-zinc-300 mb-6">
              Şifrelerinizi görmek için lütfen belirlediğiniz <strong>Ana Parolayı</strong> giriniz:
            </p>

            {errorMessage && (
              <div className="mb-4 p-4 rounded-2xl bg-red-100 text-red-900 font-bold border-2 border-red-300 text-left flex items-center gap-3">
                <ShieldAlert className="w-6 h-6 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleUnlock} className="space-y-5">
              <div className="relative">
                <input
                  id="input-master-password"
                  type={showMasterPassword ? 'text' : 'password'}
                  value={masterPasswordInput}
                  onChange={(e) => setMasterPasswordInput(e.target.value)}
                  placeholder="Ana Parolanızı Giriniz"
                  autoFocus
                  className="w-full p-5 pr-14 rounded-2xl border-3 border-sky-300 dark:border-zinc-600 bg-sky-50/50 dark:bg-zinc-800 text-slate-900 dark:text-white font-black text-2xl tracking-wider text-center focus:outline-none focus:ring-4 focus:ring-sky-400"
                />
                <button
                  type="button"
                  onClick={() => setShowMasterPassword(!showMasterPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                  title={showMasterPassword ? 'Parolayı Gizle' : 'Parolayı Göster'}
                >
                  {showMasterPassword ? <EyeOff className="w-7 h-7" /> : <Eye className="w-7 h-7" />}
                </button>
              </div>

              <button
                type="submit"
                id="btn-unlock-vault"
                className="w-full py-5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-black text-2xl shadow-xl transition-all active:scale-95 cursor-pointer border-2 border-sky-400 flex items-center justify-center gap-3"
              >
                <Unlock className="w-8 h-8" />
                <span>Kasayı Aç</span>
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-zinc-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
              <span>🔒 256-Bit Askeri Düzeyde Şifreli</span>
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(true)}
                className="text-red-600 hover:text-red-800 dark:text-red-400 underline font-bold cursor-pointer"
              >
                Ana Parolayı Unuttum / Sıfırla
              </button>
            </div>
          </div>
        )}

        {/* STATE C: UNLOCKED VAULT */}
        {!isLocked && (
          <div className="space-y-6">
            {/* Control Toolbar */}
            <div
              className={`p-4 sm:p-5 rounded-3xl border-3 shadow-md flex flex-wrap items-center justify-between gap-3 ${
                settings.highContrast
                  ? 'bg-black border-yellow-400 text-white'
                  : 'bg-white border-slate-200'
              }`}
            >
              {/* Left Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Add New Password */}
                <button
                  id="btn-add-new-password"
                  onClick={handleOpenAddModal}
                  className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg shadow-md cursor-pointer transition-all active:scale-95 border-2 border-emerald-400"
                >
                  <Plus className="w-6 h-6" />
                  <span>Yeni Parola Ekle</span>
                </button>

                {/* Password Generator */}
                <button
                  id="btn-open-generator"
                  onClick={() => {
                    if (settings.soundEffects) sound.playClick();
                    setShowGeneratorModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base shadow-sm cursor-pointer transition-all active:scale-95"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>Parola Üretici</span>
                </button>

                {/* Backup / Export / Import */}
                <button
                  id="btn-open-backup"
                  onClick={() => {
                    if (settings.soundEffects) sound.playClick();
                    setShowBackupModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-700 hover:bg-slate-800 text-white font-bold text-base shadow-sm cursor-pointer transition-all active:scale-95"
                >
                  <Download className="w-5 h-5" />
                  <span>Yedekle / Yükle</span>
                </button>
              </div>

              {/* Right Auto-lock & Manual Lock */}
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                {/* Auto Lock Timer Dropdown */}
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-zinc-800 px-3 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 text-xs sm:text-sm font-bold text-slate-700 dark:text-zinc-200">
                  <Clock className="w-4 h-4 text-sky-600" />
                  <label htmlFor="select-auto-lock">Oto Kilit:</label>
                  <select
                    id="select-auto-lock"
                    value={autoLockMinutes}
                    onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
                    className="bg-transparent font-black cursor-pointer focus:outline-none"
                  >
                    <option value={1}>1 dk</option>
                    <option value={2}>2 dk</option>
                    <option value={3}>3 dk</option>
                    <option value={5}>5 dk</option>
                    <option value={10}>10 dk</option>
                    <option value={0}>Kapalı</option>
                  </select>
                </div>

                {/* Lock Immediately */}
                <button
                  id="btn-lock-now"
                  onClick={handleLockVault}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-base shadow-md cursor-pointer transition-all active:scale-95 border-2 border-red-400"
                >
                  <Lock className="w-5 h-5" />
                  <span>Kasayı Kilitle</span>
                </button>
              </div>
            </div>

            {/* Search & Category Filter Pills */}
            <div className="space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Hesap adı, kullanıcı adı veya not ara..."
                  className="w-full pl-13 pr-4 py-4 rounded-2xl border-2 border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-900 dark:text-white font-bold text-lg focus:outline-none focus:ring-4 focus:ring-sky-400"
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

              {/* Category Pills (Mail, Wi-Fi, Telefon, TV, Banka, Diğer) */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={() => setSelectedCategory('Tümü')}
                  className={`px-4 py-2.5 rounded-xl font-black text-sm sm:text-base border cursor-pointer transition-all ${
                    selectedCategory === 'Tümü'
                      ? 'bg-sky-600 text-white border-sky-700 shadow-sm'
                      : 'bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border-slate-300'
                  }`}
                >
                  Tümü ({items.length})
                </button>

                {CATEGORIES.map((cat) => {
                  const meta = getCategoryMeta(cat);
                  const Icon = meta.icon;
                  const count = items.filter((it) => it.category === cat).length;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-black text-sm sm:text-base border cursor-pointer transition-all ${
                        selectedCategory === cat
                          ? 'bg-sky-600 text-white border-sky-700 shadow-sm'
                          : 'bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border-slate-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{cat}</span>
                      <span className="opacity-75 text-xs">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* List of Password Cards */}
            {filteredItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {filteredItems.map((item) => {
                  const meta = getCategoryMeta(item.category);
                  const Icon = meta.icon;
                  const isVisible = visiblePasswordIds.includes(item.id);
                  const pwdValue = item.password || item.secret || '';
                  const descValue = item.description || item.notes || '';

                  return (
                    <div
                      key={item.id}
                      className={`p-5 sm:p-6 rounded-3xl border-3 shadow-md flex flex-col justify-between transition-all ${
                        settings.highContrast
                          ? 'bg-black border-zinc-700 text-white hover:border-yellow-400'
                          : 'bg-white border-slate-200 hover:border-sky-300'
                      }`}
                    >
                      <div>
                        {/* Header: Category Badge + Actions */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs sm:text-sm font-black border ${meta.bgLight}`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{meta.badgeText}</span>
                          </span>

                          <div className="flex items-center gap-1">
                            {/* Read Aloud */}
                            <button
                              onClick={() => handleReadAloud(item)}
                              title="Sesli Oku"
                              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 cursor-pointer"
                            >
                              <Volume2 className="w-5 h-5" />
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              title="Düzenle"
                              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 cursor-pointer"
                            >
                              <Edit className="w-5 h-5" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => setShowDeleteModal(item)}
                              title="Sil"
                              className="p-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-zinc-800 text-red-600 cursor-pointer"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        {/* Title */}
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-1">
                          {item.title}
                        </h3>

                        {/* Username */}
                        <div className="text-sm sm:text-base font-bold text-slate-600 dark:text-zinc-300 mb-2">
                          <span className="text-slate-400 font-medium">Kullanıcı Adı: </span>
                          <span className="font-mono">{item.username}</span>
                        </div>

                        {/* Description */}
                        {descValue && (
                          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mb-4 bg-slate-50 dark:bg-zinc-900 p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800">
                            {descValue}
                          </p>
                        )}

                        {/* Password Display Box (Default Hidden) */}
                        <div className="p-4 rounded-2xl bg-slate-100 dark:bg-zinc-800 border-2 border-slate-300 dark:border-zinc-700 mb-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-black text-slate-500 uppercase tracking-wider">
                              Parola:
                            </span>

                            <div className="flex items-center gap-1">
                              {/* Giant Zoom Modal */}
                              <button
                                onClick={() => setGiantModalItem(item)}
                                title="Gözlüksüz Dev Boyut"
                                className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-700 border border-slate-300 text-xs font-bold text-slate-700 dark:text-zinc-200 flex items-center gap-1 cursor-pointer"
                              >
                                <Maximize2 className="w-3.5 h-3.5" />
                                <span>Büyüt</span>
                              </button>

                              {/* Toggle Show / Hide */}
                              <button
                                onClick={() => toggleVisibility(item.id)}
                                className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-700 border border-slate-300 text-xs font-bold text-slate-700 dark:text-zinc-200 flex items-center gap-1 cursor-pointer"
                              >
                                {isVisible ? (
                                  <>
                                    <EyeOff className="w-3.5 h-3.5" />
                                    <span>Gizle</span>
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Göster</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* The Password Value */}
                          <div className="mt-2 text-xl sm:text-2xl font-black font-mono tracking-widest text-slate-900 dark:text-white select-all break-all">
                            {isVisible ? pwdValue : '••••••••••••'}
                          </div>
                        </div>
                      </div>

                      {/* Card Bottom: Big Copy Button */}
                      <div className="pt-3 border-t border-slate-200 dark:border-zinc-700 flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-400 font-medium">
                          {item.updatedAt}
                        </span>

                        <button
                          onClick={() => handleCopyPassword(item.id, pwdValue, item.title)}
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm sm:text-base cursor-pointer shadow-xs transition-all active:scale-95 ${
                            copiedId === item.id
                              ? 'bg-emerald-600 text-white'
                              : 'bg-sky-600 hover:bg-sky-700 text-white'
                          }`}
                        >
                          {copiedId === item.id ? (
                            <>
                              <CheckCircle2 className="w-5 h-5" />
                              <span>Kopyalandı!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-5 h-5" />
                              <span>Parolayı Kopyala</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 rounded-3xl border-2 border-dashed border-slate-300 dark:border-zinc-700 text-center bg-white/50 dark:bg-zinc-900/50">
                <span className="text-4xl mb-2 block">🔍</span>
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Kayıt Bulunamadı
                </h3>
                <p className="text-slate-500 dark:text-zinc-400 mt-1">
                  Aradığınız kriterlere uygun şifre kaydı yok veya bu kategori henüz boş.
                </p>
                <button
                  onClick={handleOpenAddModal}
                  className="mt-4 px-6 py-3 rounded-2xl bg-emerald-600 text-white font-bold cursor-pointer hover:bg-emerald-700"
                >
                  ➕ Yeni Şifre Ekle
                </button>
              </div>
            )}
          </div>
        )}

        {/* MODAL 1: ADD / EDIT PASSWORD */}
        {showAddEditModal && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          >
            <div
              className={`w-full max-w-xl p-6 sm:p-8 rounded-3xl border-3 shadow-2xl ${
                settings.highContrast
                  ? 'bg-black border-yellow-400 text-white'
                  : 'bg-white text-slate-900'
              }`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-zinc-700 mb-5">
                <h3 className="text-2xl font-black flex items-center gap-2">
                  <KeyRound className="w-7 h-7 text-sky-600" />
                  <span>{editingItem ? 'Şifreyi Düzenle' : 'Yeni Şifre Ekle'}</span>
                </h3>
                <button
                  onClick={() => setShowAddEditModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-7 h-7" />
                </button>
              </div>

              <form onSubmit={handleSaveItem} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block font-black text-base mb-1">
                    Hesap / Servis Adı *:
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Örn: Evdeki Wi-Fi İnternet, Gmail Hesabım, vb."
                    required
                    className="w-full p-3.5 rounded-xl border-2 border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 font-bold text-lg focus:ring-3 focus:ring-sky-400"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block font-black text-base mb-1">Kategori *:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setFormCategory(cat)}
                        className={`p-2.5 rounded-xl text-sm font-black border cursor-pointer ${
                          formCategory === cat
                            ? 'bg-sky-600 text-white border-sky-700'
                            : 'bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 border-slate-300'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Username */}
                <div>
                  <label className="block font-black text-base mb-1">
                    Kullanıcı Adı / E-posta / Telefon:
                  </label>
                  <input
                    type="text"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="Örn: suat.yesilcam@gmail.com veya 0532..."
                    className="w-full p-3.5 rounded-xl border-2 border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 font-bold text-base focus:ring-3 focus:ring-sky-400"
                  />
                </div>

                {/* Password with generator shortcut */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-black text-base">Parola *:</label>
                    <button
                      type="button"
                      onClick={() => {
                        const newPwd = generateMemorablePassphrase();
                        setFormPassword(newPwd);
                        setFormShowPassword(true);
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Güçlü Parola Üret</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={formShowPassword ? 'text' : 'password'}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="Parolayı giriniz"
                      required
                      className="w-full p-3.5 pr-12 rounded-xl border-2 border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 font-mono font-black text-xl tracking-wider focus:ring-3 focus:ring-sky-400"
                    />
                    <button
                      type="button"
                      onClick={() => setFormShowPassword(!formShowPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                    >
                      {formShowPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block font-black text-base mb-1">
                    Açıklama / Hatırlatma Notu:
                  </label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={2}
                    placeholder="Bu şifre nerede kullanılır? Hatırlatıcı not..."
                    className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-sm"
                  />
                </div>

                {/* Submit Buttons */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-zinc-700">
                  <button
                    type="button"
                    onClick={() => setShowAddEditModal(false)}
                    className="px-5 py-3 rounded-xl border border-slate-300 text-slate-700 dark:text-zinc-300 font-bold cursor-pointer"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black text-lg shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    {editingItem ? 'Güncellemeyi Kaydet' : 'Kasanıza Ekle'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 2: DELETE CONFIRMATION */}
        {showDeleteModal && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-zinc-900 text-slate-900 dark:text-white border-3 border-red-400 shadow-2xl text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black">Şifreyi Silmek İstiyor musunuz?</h3>
              <p className="text-slate-600 dark:text-zinc-300">
                <strong>"{showDeleteModal.title}"</strong> adlı şifre kaydı kasanızdan kalıcı olarak silinecektir.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setShowDeleteModal(null)}
                  className="px-6 py-3 rounded-xl border border-slate-300 font-bold cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="px-8 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black shadow-md cursor-pointer"
                >
                  Evet, Sil
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: GÜÇLÜ PAROLA OLUŞTURUCU */}
        {showGeneratorModal && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <div className="w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-white dark:bg-zinc-900 text-slate-900 dark:text-white border-3 border-indigo-400 shadow-2xl space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="text-2xl font-black flex items-center gap-2">
                  <Sparkles className="w-7 h-7 text-indigo-600" />
                  <span>Güçlü Parola Oluşturucu</span>
                </h3>
                <button
                  onClick={() => setShowGeneratorModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-7 h-7" />
                </button>
              </div>

              {/* Memorable Passphrase Option */}
              <div className="p-5 rounded-2xl bg-amber-50 dark:bg-zinc-800 border-2 border-amber-300 space-y-2">
                <span className="text-xs font-black text-amber-900 uppercase">
                  1. Kolay Okunur & Hatırlanabilir Parola:
                </span>
                <div className="text-xl font-black font-mono text-slate-900 dark:text-white select-all">
                  {generateMemorablePassphrase()}
                </div>
                <p className="text-xs text-slate-600 dark:text-zinc-400">
                  Türkçe kelimeler ve yıl içeren bu parolalar yaşlılarımızın ezberlemesi için idealdir.
                </p>
              </div>

              {/* Random Strong Character Option */}
              <div className="p-5 rounded-2xl bg-indigo-50 dark:bg-zinc-800 border-2 border-indigo-300 space-y-2">
                <span className="text-xs font-black text-indigo-900 uppercase">
                  2. Askeri Düzeyde Rastgele Karakterler:
                </span>
                <div className="text-xl font-black font-mono text-slate-900 dark:text-white select-all">
                  {generateRandomPassword(14, true)}
                </div>
              </div>

              <div className="text-center pt-2">
                <button
                  onClick={() => {
                    const newPwd = generateMemorablePassphrase();
                    navigator.clipboard.writeText(newPwd);
                    showToast(`"${newPwd}" üretildi ve panoya kopyalandı.`);
                    setShowGeneratorModal(false);
                  }}
                  className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-md cursor-pointer active:scale-95"
                >
                  📋 Yeni Parola Üret ve Kopyala
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 4: GIANT FONT ZOOM PREVIEW FOR SENIORS */}
        {giantModalItem && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="w-full max-w-2xl p-6 sm:p-10 rounded-3xl bg-white dark:bg-black text-slate-900 dark:text-yellow-300 border-4 border-yellow-400 shadow-2xl text-center space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-xl font-black uppercase tracking-wider text-slate-500 dark:text-yellow-100">
                  👓 Gözlüksüz Dev Boyut
                </span>
                <button
                  onClick={() => setGiantModalItem(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-8 h-8" />
                </button>
              </div>

              <h3 className="text-3xl sm:text-4xl font-black">{giantModalItem.title}</h3>

              <div className="text-xl sm:text-2xl font-bold text-slate-600 dark:text-yellow-200">
                Kullanıcı Adı: <span className="font-mono">{giantModalItem.username}</span>
              </div>

              {/* The Giant Password */}
              <div className="p-8 rounded-3xl bg-slate-100 dark:bg-zinc-900 border-4 border-sky-400 dark:border-yellow-400">
                <span className="block text-sm font-black text-slate-500 dark:text-yellow-200 uppercase mb-2">
                  PAROLANIZ:
                </span>
                <div className="text-4xl sm:text-6xl font-black font-mono tracking-widest break-all select-all text-indigo-700 dark:text-yellow-300">
                  {giantModalItem.password || giantModalItem.secret}
                </div>
              </div>

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => {
                    handleReadAloud(giantModalItem);
                  }}
                  className="px-6 py-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xl flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Volume2 className="w-6 h-6" />
                  <span>Sesli Dinle</span>
                </button>

                <button
                  onClick={() => {
                    handleCopyPassword(
                      giantModalItem.id,
                      giantModalItem.password || giantModalItem.secret || '',
                      giantModalItem.title
                    );
                  }}
                  className="px-8 py-4 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-black text-xl flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Copy className="w-6 h-6" />
                  <span>Kopyala</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 5: BACKUP & RESTORE */}
        {showBackupModal && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <div className="w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-white dark:bg-zinc-900 text-slate-900 dark:text-white border-3 border-slate-300 shadow-2xl space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <h3 className="text-2xl font-black flex items-center gap-2">
                  <Download className="w-7 h-7 text-sky-600" />
                  <span>Güvenli Yedekleme & Geri Yükleme</span>
                </h3>
                <button
                  onClick={() => setShowBackupModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-7 h-7" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Export */}
                <div className="p-5 rounded-2xl bg-sky-50 dark:bg-zinc-800 border-2 border-sky-300 space-y-2">
                  <h4 className="font-black text-lg">💾 Şifreli Kasa Yedeğini İndir</h4>
                  <p className="text-sm text-slate-600 dark:text-zinc-300">
                    Kasanızdaki tüm şifreleri kilitli ve şifreli bir dosya olarak bilgisayarınıza kaydedin.
                  </p>
                  <button
                    onClick={handleExportBackup}
                    className="mt-2 w-full py-3.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black text-base shadow-sm cursor-pointer"
                  >
                    Yedek Dosyasını İndir (.json)
                  </button>
                </div>

                {/* Import */}
                <div className="p-5 rounded-2xl bg-purple-50 dark:bg-zinc-800 border-2 border-purple-300 space-y-2">
                  <h4 className="font-black text-lg">📂 Yedekten Geri Yükle</h4>
                  <p className="text-sm text-slate-600 dark:text-zinc-300">
                    Daha önce indirdiğiniz şifreli kasa yedeğini seçerek şifrelerinizi geri yükleyin.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportFile}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-base shadow-sm cursor-pointer"
                  >
                    Yedek Dosyası Seç
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 6: RESET CONFIRMATION */}
        {showResetConfirmModal && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md p-6 rounded-3xl bg-white dark:bg-zinc-900 text-slate-900 dark:text-white border-3 border-red-500 shadow-2xl text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
                <RefreshCw className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-black">Kasa Sıfırlansın mı?</h3>
              <p className="text-sm sm:text-base text-slate-600 dark:text-zinc-300">
                Ana parolanızı unuttuysanız kasanızı sıfırlayıp yeni bir Ana Parola belirleyebilirsiniz.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setShowResetConfirmModal(false)}
                  className="px-6 py-3 rounded-xl border border-slate-300 font-bold cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  onClick={handleResetVault}
                  className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black shadow-md cursor-pointer"
                >
                  Evet, Kasayı Sıfırla
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
