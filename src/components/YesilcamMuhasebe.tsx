import React, { useState, useMemo, useRef } from 'react';
import { Transaction, TransactionCategory, AppSettings } from '../types';
import {
  Wallet,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Edit3,
  Calculator,
  Zap,
  Droplets,
  Flame,
  Phone,
  Pill,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Volume2,
  Home,
  Printer,
  Download,
  Upload,
  Search,
  X,
  AlertTriangle,
  ShieldCheck,
  FileText,
  Calendar,
  Landmark,
  Coins,
  Receipt,
  Tag,
} from 'lucide-react';
import { sound } from '../utils/audio';

interface YesilcamMuhasebeProps {
  transactions: Transaction[];
  onAddTransaction: (transaction: Transaction) => void;
  onUpdateTransaction?: (transaction: Transaction) => void;
  onTogglePaid: (id: string) => void;
  onDeleteTransaction: (id: string) => void;
  onImportTransactions?: (transactions: Transaction[]) => void;
  onBackHome?: () => void;
  settings: AppSettings;
}

// Category Configuration & Turkish Labels
interface CategoryConfig {
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  defaultType: 'gelir' | 'gider';
  badgeColor: string;
}

export const getCategoryConfig = (cat: TransactionCategory): CategoryConfig => {
  switch (cat) {
    case 'emekli_maasi':
    case 'maas':
      return {
        label: 'Emekli Maaşı (SGK / Bağ-Kur)',
        shortLabel: 'Emekli Maaşı',
        icon: <Landmark className="w-7 h-7 text-emerald-600" />,
        defaultType: 'gelir',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      };
    case 'diger_gelir':
      return {
        label: 'Diğer Gelirler (Kira, Ek Gelir)',
        shortLabel: 'Diğer Gelir',
        icon: <Coins className="w-7 h-7 text-green-600" />,
        defaultType: 'gelir',
        badgeColor: 'bg-green-100 text-green-800 border-green-300',
      };
    case 'elektrik':
      return {
        label: 'Elektrik Faturası',
        shortLabel: 'Elektrik',
        icon: <Zap className="w-7 h-7 text-amber-600" />,
        defaultType: 'gider',
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      };
    case 'su':
      return {
        label: 'Su Faturası',
        shortLabel: 'Su',
        icon: <Droplets className="w-7 h-7 text-cyan-600" />,
        defaultType: 'gider',
        badgeColor: 'bg-cyan-100 text-cyan-800 border-cyan-300',
      };
    case 'dogalgaz':
      return {
        label: 'Doğalgaz Faturası',
        shortLabel: 'Doğalgaz',
        icon: <Flame className="w-7 h-7 text-orange-600" />,
        defaultType: 'gider',
        badgeColor: 'bg-orange-100 text-orange-800 border-orange-300',
      };
    case 'telefon_internet':
      return {
        label: 'Telefon ve İnternet Faturası',
        shortLabel: 'Telefon & İnternet',
        icon: <Phone className="w-7 h-7 text-indigo-600" />,
        defaultType: 'gider',
        badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      };
    case 'diger_fatura':
    case 'fatura':
      return {
        label: 'Diğer Faturalar (Aidat, TV vb.)',
        shortLabel: 'Diğer Fatura',
        icon: <Receipt className="w-7 h-7 text-purple-600" />,
        defaultType: 'gider',
        badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
      };
    case 'market':
      return {
        label: 'Market & Mutfak & Pazar',
        shortLabel: 'Market',
        icon: <ShoppingCart className="w-7 h-7 text-blue-600" />,
        defaultType: 'gider',
        badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
      };
    case 'saglik':
      return {
        label: 'Sağlık & Eczane & İlaç',
        shortLabel: 'Sağlık / Eczane',
        icon: <Pill className="w-7 h-7 text-rose-600" />,
        defaultType: 'gider',
        badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
      };
    case 'diger':
    default:
      return {
        label: 'Diğer Harcamalar',
        shortLabel: 'Diğer',
        icon: <Tag className="w-7 h-7 text-slate-600" />,
        defaultType: 'gider',
        badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
      };
  }
};

// Turkish currency formatter
const formatTL = (amount: number): string => {
  return (
    '₺' +
    amount.toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
};

// Turkish date display helper
const formatTRDate = (dateStr: string): string => {
  if (!dateStr) return '';
  // Check if ISO format YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-');
    const monthNames = [
      'Ocak',
      'Şubat',
      'Mart',
      'Nisan',
      'Mayıs',
      'Haziran',
      'Temmuz',
      'Ağustos',
      'Eylül',
      'Ekim',
      'Kasım',
      'Aralık',
    ];
    const monthIndex = parseInt(m, 10) - 1;
    return `${parseInt(d, 10)} ${monthNames[monthIndex] || m} ${y}`;
  }
  return dateStr;
};

// Helper to extract year-month key (YYYY-MM) from date
const getYearMonth = (dateStr: string): string => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr.substring(0, 7);
  }
  // Try Turkish month parsing
  const monthsTr: Record<string, string> = {
    ocak: '01',
    şubat: '02',
    subat: '02',
    mart: '03',
    nisan: '04',
    mayıs: '05',
    mayis: '05',
    haziran: '06',
    temmuz: '07',
    ağustos: '08',
    agustos: '08',
    eylül: '09',
    eylul: '09',
    ekim: '10',
    kasım: '11',
    kasim: '11',
    aralık: '12',
    aralik: '12',
  };
  const parts = dateStr.toLowerCase().split(' ');
  if (parts.length >= 3) {
    const m = monthsTr[parts[1]];
    const y = parts[2];
    if (m && y && y.length === 4) {
      return `${y}-${m}`;
    }
  }
  return 'other';
};

const getMonthTitle = (ym: string): string => {
  if (ym === 'all') return 'Tüm Zamanlar';
  if (/^\d{4}-\d{2}$/.test(ym)) {
    const [y, m] = ym.split('-');
    const monthNames = [
      'Ocak',
      'Şubat',
      'Mart',
      'Nisan',
      'Mayıs',
      'Haziran',
      'Temmuz',
      'Ağustos',
      'Eylül',
      'Ekim',
      'Kasım',
      'Aralık',
    ];
    return `${monthNames[parseInt(m, 10) - 1] || m} ${y}`;
  }
  return ym;
};

export const YesilcamMuhasebe: React.FC<YesilcamMuhasebeProps> = ({
  transactions,
  onAddTransaction,
  onUpdateTransaction,
  onTogglePaid,
  onDeleteTransaction,
  onImportTransactions,
  onBackHome,
  settings,
}) => {
  // Filters state
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'paid' | 'income' | 'expense'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deletingTransaction, setDeletingTransaction] = useState<Transaction | null>(null);
  const [showCalcModal, setShowCalcModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importedCandidate, setImportedCandidate] = useState<Transaction[] | null>(null);
  const [importStatusMessage, setImportStatusMessage] = useState<string | null>(null);

  // Form state for New Transaction
  const [formType, setFormType] = useState<'gelir' | 'gider'>('gider');
  const [formCategory, setFormCategory] = useState<TransactionCategory>('elektrik');
  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  const [formDueDate, setFormDueDate] = useState('');
  const [formIsPaid, setFormIsPaid] = useState(false);
  const [formNotes, setFormNotes] = useState('');

  // File Input Ref for JSON Restore
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Big Keypad Calculator State
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [calcPrev, setCalcPrev] = useState<number | null>(null);
  const [calcOp, setCalcOp] = useState<string | null>(null);
  const [calcClearNext, setCalcClearNext] = useState(false);

  // Extract distinct available months from transactions
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    // Always include current month
    const curYM = new Date().toISOString().substring(0, 7);
    monthsSet.add(curYM);

    transactions.forEach((t) => {
      const ym = getYearMonth(t.date);
      if (ym && ym !== 'other') {
        monthsSet.add(ym);
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [transactions]);

  // Filtered transactions by month, status, category, and search query
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Month filter
      if (selectedMonth !== 'all') {
        const ym = getYearMonth(t.date);
        if (ym !== selectedMonth) return false;
      }

      // Status filter
      if (statusFilter === 'unpaid' && (t.type !== 'gider' || t.isPaid)) return false;
      if (statusFilter === 'paid' && !t.isPaid) return false;
      if (statusFilter === 'income' && t.type !== 'gelir') return false;
      if (statusFilter === 'expense' && t.type !== 'gider') return false;

      // Category filter
      if (categoryFilter !== 'all') {
        if (categoryFilter === 'fatura_all') {
          if (
            ![
              'elektrik',
              'su',
              'dogalgaz',
              'telefon_internet',
              'diger_fatura',
              'fatura',
            ].includes(t.category)
          ) {
            return false;
          }
        } else if (t.category !== categoryFilter) {
          return false;
        }
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = t.title.toLowerCase().includes(q);
        const notesMatch = t.notes ? t.notes.toLowerCase().includes(q) : false;
        const amountMatch = t.amount.toString().includes(q);
        const catConfig = getCategoryConfig(t.category);
        const catMatch = catConfig.label.toLowerCase().includes(q);
        if (!titleMatch && !notesMatch && !amountMatch && !catMatch) return false;
      }

      return true;
    });
  }, [transactions, selectedMonth, statusFilter, categoryFilter, searchQuery]);

  // Calculations for current selected period
  const periodTransactions = useMemo(() => {
    if (selectedMonth === 'all') return transactions;
    return transactions.filter((t) => getYearMonth(t.date) === selectedMonth);
  }, [transactions, selectedMonth]);

  const monthlyIncome = useMemo(() => {
    return periodTransactions
      .filter((t) => t.type === 'gelir')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [periodTransactions]);

  const monthlyExpense = useMemo(() => {
    return periodTransactions
      .filter((t) => t.type === 'gider')
      .reduce((acc, t) => acc + t.amount, 0);
  }, [periodTransactions]);

  const remainingBalance = monthlyIncome - monthlyExpense;

  const unpaidBillsTotal = useMemo(() => {
    return periodTransactions
      .filter((t) => t.type === 'gider' && !t.isPaid)
      .reduce((acc, t) => acc + t.amount, 0);
  }, [periodTransactions]);

  const unpaidBillsCount = useMemo(() => {
    return periodTransactions.filter((t) => t.type === 'gider' && !t.isPaid).length;
  }, [periodTransactions]);

  // Quick preset helper for easy senior form fill
  const applyPreset = (
    presetTitle: string,
    cat: TransactionCategory,
    type: 'gelir' | 'gider'
  ) => {
    if (settings.soundEffects) sound.playClick();
    setFormTitle(presetTitle);
    setFormCategory(cat);
    setFormType(type);
    if (type === 'gelir') {
      setFormIsPaid(true);
    }
  };

  // Open add modal clean
  const handleOpenAddModal = (presetCategory?: TransactionCategory) => {
    if (settings.soundEffects) sound.playClick();
    const cat = presetCategory || 'elektrik';
    const cfg = getCategoryConfig(cat);
    setFormType(cfg.defaultType);
    setFormCategory(cat);
    setFormTitle('');
    setFormAmount('');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormDueDate('');
    setFormIsPaid(cfg.defaultType === 'gelir');
    setFormNotes('');
    setShowAddModal(true);
  };

  // Save new transaction
  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(formAmount.replace(',', '.'));
    if (!formTitle.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    const newTx: Transaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: formTitle.trim(),
      category: formCategory,
      amount: parsedAmount,
      date: formDate,
      dueDate: formDueDate ? formDueDate : undefined,
      isPaid: formType === 'gelir' ? true : formIsPaid,
      type: formType,
      notes: formNotes.trim() || undefined,
    };

    onAddTransaction(newTx);
    setShowAddModal(false);

    if (settings.soundEffects) sound.playSuccess();
    if (settings.voiceAssistance) {
      sound.speak(
        `${newTx.title}, ${formatTL(newTx.amount)} tutarıyla muhasebe defterine kaydedildi.`
      );
    }
  };

  // Open Edit Modal
  const handleStartEdit = (tx: Transaction) => {
    if (settings.soundEffects) sound.playClick();
    setEditingTransaction(tx);
    setFormTitle(tx.title);
    setFormAmount(String(tx.amount));
    setFormCategory(tx.category);
    setFormType(tx.type);
    setFormDate(tx.date);
    setFormDueDate(tx.dueDate || '');
    setFormIsPaid(tx.isPaid);
    setFormNotes(tx.notes || '');
  };

  // Save edited transaction
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;

    const parsedAmount = parseFloat(formAmount.replace(',', '.'));
    if (!formTitle.trim() || isNaN(parsedAmount) || parsedAmount <= 0) return;

    const updated: Transaction = {
      ...editingTransaction,
      title: formTitle.trim(),
      category: formCategory,
      amount: parsedAmount,
      date: formDate,
      dueDate: formDueDate ? formDueDate : undefined,
      isPaid: formType === 'gelir' ? true : formIsPaid,
      type: formType,
      notes: formNotes.trim() || undefined,
    };

    if (onUpdateTransaction) {
      onUpdateTransaction(updated);
    } else {
      onDeleteTransaction(editingTransaction.id);
      onAddTransaction(updated);
    }

    setEditingTransaction(null);
    if (settings.soundEffects) sound.playSuccess();
    if (settings.voiceAssistance) {
      sound.speak(`${updated.title} kaydı başarıyla güncellendi.`);
    }
  };

  // Toggle paid status
  const handleTogglePaidWithVoice = (tx: Transaction) => {
    const nextState = !tx.isPaid;
    if (settings.soundEffects) {
      if (nextState) sound.playSuccess();
      else sound.playClick();
    }
    if (settings.voiceAssistance) {
      sound.speak(
        nextState
          ? `${tx.title} ödendi olarak işaretlendi.`
          : `${tx.title} ödenmedi olarak güncellendi.`
      );
    }
    onTogglePaid(tx.id);
  };

  // Delete transaction handler with confirmation
  const handleConfirmDelete = () => {
    if (!deletingTransaction) return;
    const title = deletingTransaction.title;
    onDeleteTransaction(deletingTransaction.id);
    setDeletingTransaction(null);
    if (settings.soundEffects) sound.playClick();
    if (settings.voiceAssistance) {
      sound.speak(`${title} kaydı defterden silindi.`);
    }
  };

  // Voice Readout of Budget Summary
  const handleSpeakSummary = () => {
    const periodName = getMonthTitle(selectedMonth);
    const speech = `Yeşilçam Muhasebe Özeti (${periodName}): Toplam geliriniz ${monthlyIncome} Türk Lirası. Toplam harcamanız ${monthlyExpense} Lira. Kalan net bakiyeniz ${remainingBalance} Lira. Ödenmeyi bekleyen faturalar tutarı ise ${unpaidBillsTotal} Liradır.`;
    sound.speak(speech);
  };

  // Export data as JSON file (Download backup)
  const handleExportJSON = () => {
    if (settings.soundEffects) sound.playClick();
    const backupData = {
      app: 'Suat Merkezi - Yeşilçam Muhasebe',
      version: '2.0',
      exportedAt: new Date().toISOString(),
      recordCount: transactions.length,
      transactions: transactions,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    const nowStr = new Date().toISOString().split('T')[0];
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `suat_muhasebe_yedek_${nowStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    if (settings.soundEffects) sound.playSuccess();
    if (settings.voiceAssistance) {
      sound.speak('Muhasebe kayıtlarınız JSON yedeği olarak bilgisayarınıza indirildi.');
    }
  };

  // Trigger JSON file selection
  const handleTriggerImport = () => {
    if (settings.soundEffects) sound.playClick();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Process JSON file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        let txList: Transaction[] = [];
        if (Array.isArray(parsed)) {
          txList = parsed;
        } else if (parsed && Array.isArray(parsed.transactions)) {
          txList = parsed.transactions;
        } else {
          throw new Error('Geçersiz JSON formatı.');
        }

        // Validate items
        const validTxs = txList.filter(
          (item) => item && item.id && item.title && typeof item.amount === 'number'
        );

        if (validTxs.length === 0) {
          setImportStatusMessage('Yedek dosyasında geçerli muhasebe kaydı bulunamadı.');
          setShowImportModal(true);
          return;
        }

        setImportedCandidate(validTxs);
        setImportStatusMessage(`${validTxs.length} adet muhasebe kaydı bulundu.`);
        setShowImportModal(true);
      } catch (err) {
        setImportStatusMessage('Seçilen dosya okunamadı veya bozuk bir JSON dosyası.');
        setShowImportModal(true);
      }
    };
    reader.readAsText(file);
  };

  // Execute import: Merge or Replace
  const handleApplyImport = (mode: 'merge' | 'replace') => {
    if (!importedCandidate) return;

    let finalTxs: Transaction[] = [];
    if (mode === 'replace') {
      finalTxs = importedCandidate;
    } else {
      // Merge: avoid duplicate IDs
      const existingIds = new Set(transactions.map((t) => t.id));
      const newItems = importedCandidate.filter((t) => !existingIds.has(t.id));
      finalTxs = [...transactions, ...newItems];
    }

    if (onImportTransactions) {
      onImportTransactions(finalTxs);
    } else {
      finalTxs.forEach((t) => onAddTransaction(t));
    }

    setShowImportModal(false);
    setImportedCandidate(null);
    if (settings.soundEffects) sound.playSuccess();
    if (settings.voiceAssistance) {
      sound.speak(
        mode === 'replace'
          ? 'Yedek kayıtlar başarıyla geri yüklendi.'
          : 'Yedek kayıtlar mevcut defterinize eklendi.'
      );
    }
  };

  // Print view
  const handlePrint = () => {
    if (settings.soundEffects) sound.playClick();
    window.print();
  };

  // Return to Home
  const handleBack = () => {
    if (settings.soundEffects) sound.playClick();
    if (settings.voiceAssistance) {
      sound.speak("Suat Merkezi ana ekranına dönülüyor.");
    }
    if (onBackHome) onBackHome();
  };

  // Calculator Functions
  const handleCalcDigit = (d: string) => {
    if (settings.soundEffects) sound.playClick();
    if (calcDisplay === '0' || calcClearNext) {
      setCalcDisplay(d);
      setCalcClearNext(false);
    } else {
      setCalcDisplay(calcDisplay + d);
    }
  };

  const handleCalcOp = (op: string) => {
    if (settings.soundEffects) sound.playClick();
    const current = parseFloat(calcDisplay);
    if (calcPrev === null) {
      setCalcPrev(current);
    } else if (calcOp) {
      const res = executeCalc(calcPrev, current, calcOp);
      setCalcPrev(res);
      setCalcDisplay(String(res));
    }
    setCalcOp(op);
    setCalcClearNext(true);
  };

  const executeCalc = (a: number, b: number, op: string): number => {
    switch (op) {
      case '+':
        return a + b;
      case '-':
        return a - b;
      case '×':
        return a * b;
      case '÷':
        return b !== 0 ? Math.round((a / b) * 100) / 100 : 0;
      default:
        return b;
    }
  };

  const handleCalcEqual = () => {
    if (settings.soundEffects) sound.playSuccess();
    if (calcPrev !== null && calcOp) {
      const current = parseFloat(calcDisplay);
      const res = executeCalc(calcPrev, current, calcOp);
      setCalcDisplay(String(res));
      setCalcPrev(null);
      setCalcOp(null);
      setCalcClearNext(true);
      if (settings.voiceAssistance) {
        sound.speak(`Hesap sonucu: ${res} Türk Lirası`);
      }
    }
  };

  const handleCalcClear = () => {
    if (settings.soundEffects) sound.playClick();
    setCalcDisplay('0');
    setCalcPrev(null);
    setCalcOp(null);
    setCalcClearNext(false);
  };

  return (
    <div className="max-w-7xl mx-auto py-4 px-3 sm:px-6">
      {/* Hidden File Input for JSON Restore */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".json,application/json"
        className="hidden"
      />

      {/* TOP NAVIGATION BAR: Home Button & Security Badge */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5 no-print">
        {onBackHome && (
          <button
            id="btn-back-home"
            onClick={handleBack}
            className="flex items-center justify-center gap-3 px-6 py-4 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-black text-xl shadow-md border-3 border-emerald-900 active:scale-95 transition-transform"
          >
            <Home className="w-7 h-7 text-amber-300" />
            <span>🏠 Suat Merkezi'ne Dön</span>
          </button>
        )}

        {/* Local Security Assurance */}
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/70 border-2 border-emerald-300 dark:border-emerald-700 rounded-2xl text-emerald-900 dark:text-emerald-200">
          <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-sm sm:text-base font-bold">
            %100 Yerel Muhasebe Defteri • Verileriniz İnternete Gönderilmez
          </span>
        </div>
      </div>

      {/* MAIN BANNER & DASHBOARD CARDS */}
      <div
        className={`p-5 sm:p-7 rounded-3xl border-3 mb-6 shadow-md ${
          settings.highContrast
            ? 'bg-black border-emerald-400 text-white'
            : 'bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/60 border-emerald-300 text-emerald-950'
        }`}
      >
        {/* Banner Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-md shrink-0">
              <Wallet className="w-10 h-10 sm:w-12 sm:h-12" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-emerald-600 text-white text-xs sm:text-sm font-black rounded-lg uppercase tracking-wide">
                  EMEKLİ & EV BÜTÇESİ
                </span>
                <span className="px-3 py-1 bg-amber-500 text-slate-900 text-xs sm:text-sm font-black rounded-lg">
                  {getMonthTitle(selectedMonth)}
                </span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-black mt-1">
                Yeşilçam Muhasebe Defteri
              </h2>
              <p className="text-base sm:text-lg font-bold text-slate-700 dark:text-emerald-200">
                Emekli maaşı, faturalar ve ev harcamalarınızı kolayca takip edin.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto no-print">
            <button
              onClick={handleSpeakSummary}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-base bg-white dark:bg-slate-800 text-emerald-900 dark:text-emerald-200 border-2 border-emerald-400 hover:bg-emerald-100 dark:hover:bg-slate-700 shadow-sm active:scale-95"
              title="Bu ayki bütçe özetini sesli oku"
            >
              <Volume2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
              <span>Sesli Dinle</span>
            </button>

            <button
              onClick={() => setShowPrintModal(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-base bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-2 border-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm active:scale-95"
              title="Muhasebe dökümünü yazdır veya PDF olarak kaydet"
            >
              <Printer className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              <span>Yazdır / PDF</span>
            </button>

            <button
              onClick={handleExportJSON}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-base bg-white dark:bg-slate-800 text-blue-900 dark:text-blue-200 border-2 border-blue-300 hover:bg-blue-50 dark:hover:bg-slate-700 shadow-sm active:scale-95"
              title="Tüm verileri JSON dosyası olarak bilgisayara indir"
            >
              <Download className="w-5 h-5 text-blue-600" />
              <span>Yedekle</span>
            </button>

            <button
              onClick={handleTriggerImport}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-base bg-white dark:bg-slate-800 text-purple-900 dark:text-purple-200 border-2 border-purple-300 hover:bg-purple-50 dark:hover:bg-slate-700 shadow-sm active:scale-95"
              title="Önceden indirilmiş JSON yedeğini geri yükle"
            >
              <Upload className="w-5 h-5 text-purple-600" />
              <span>Geri Yükle</span>
            </button>

            <button
              onClick={() => {
                if (settings.soundEffects) sound.playClick();
                setShowCalcModal(true);
              }}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-base bg-sky-600 hover:bg-sky-700 text-white shadow-md active:scale-95 border-2 border-sky-800"
            >
              <Calculator className="w-5 h-5" />
              <span>Hesap Makinesi</span>
            </button>
          </div>
        </div>

        {/* PERIOD SELECTOR ROW */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-5 p-3.5 bg-white/80 dark:bg-slate-900/80 rounded-2xl border-2 border-emerald-200 dark:border-slate-700 no-print">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-emerald-700 dark:text-emerald-400 shrink-0" />
            <span className="font-black text-lg text-slate-800 dark:text-slate-200">
              Hesap Dönemi:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedMonth('all')}
              className={`px-4 py-2 rounded-xl font-black text-base border-2 transition-all ${
                selectedMonth === 'all'
                  ? 'bg-emerald-600 text-white border-emerald-800 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-200'
              }`}
            >
              Tüm Zamanlar
            </button>
            {availableMonths.map((ym) => (
              <button
                key={ym}
                onClick={() => setSelectedMonth(ym)}
                className={`px-4 py-2 rounded-xl font-black text-base border-2 transition-all ${
                  selectedMonth === ym
                    ? 'bg-emerald-600 text-white border-emerald-800 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-200'
                }`}
              >
                {getMonthTitle(ym)}
              </button>
            ))}
          </div>
        </div>

        {/* 4 GIANT METRIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Kalan Net Bakiye */}
          <div
            className={`p-5 rounded-2xl border-3 shadow-sm ${
              remainingBalance >= 0
                ? 'bg-white dark:bg-slate-900 border-emerald-400'
                : 'bg-red-50 dark:bg-slate-900 border-red-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-slate-600 dark:text-slate-400">
                Kalan Net Bütçe:
              </span>
              <Wallet className={`w-6 h-6 ${remainingBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
            </div>
            <div
              className={`text-3xl sm:text-4xl font-black mt-2 truncate ${
                remainingBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
              }`}
            >
              {formatTL(remainingBalance)}
            </div>
            <div className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
              {remainingBalance >= 0 ? 'Cebinizde kalan net para' : 'Gelirleri aşan harcama'}
            </div>
          </div>

          {/* Card 2: Emekli Maaşı & Gelir */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border-3 border-blue-400 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-slate-600 dark:text-slate-400">
                Toplam Gelirler:
              </span>
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-3xl sm:text-4xl font-black text-blue-600 dark:text-blue-400 mt-2 truncate">
              {formatTL(monthlyIncome)}
            </div>
            <div className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 mt-1">
              Maaş ve ek gelirler toplamı
            </div>
          </div>

          {/* Card 3: Toplam Giderler */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border-3 border-rose-400 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-slate-600 dark:text-slate-400">
                Toplam Harcamalar:
              </span>
              <TrendingDown className="w-6 h-6 text-rose-600" />
            </div>
            <div className="text-3xl sm:text-4xl font-black text-rose-600 dark:text-rose-400 mt-2 truncate">
              {formatTL(monthlyExpense)}
            </div>
            <div className="text-xs sm:text-sm font-semibold text-rose-700 dark:text-rose-300 mt-1">
              Tüm fatura ve harcamalar
            </div>
          </div>

          {/* Card 4: Bekleyen Faturalar */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border-3 border-amber-400 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-slate-600 dark:text-slate-400">
                Bekleyen Faturalar:
              </span>
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <div className="text-3xl sm:text-4xl font-black text-amber-600 dark:text-amber-400 mt-2 truncate">
              {formatTL(unpaidBillsTotal)}
            </div>
            <div className="text-xs sm:text-sm font-semibold text-amber-700 dark:text-amber-300 mt-1">
              {unpaidBillsCount > 0 ? `${unpaidBillsCount} fatura ödenmeyi bekliyor` : 'Bekleyen fatura yok'}
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH, FILTERS & MAIN TRANSACTIONS LIST */}
      <div
        className={`p-5 sm:p-7 rounded-3xl border-3 shadow-lg ${
          settings.highContrast
            ? 'bg-black border-emerald-400 text-white'
            : 'bg-white border-slate-300 text-slate-900'
        }`}
      >
        {/* TOP CONTROLS: Add Button & Search */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 mb-6 no-print">
          {/* Big Add Transaction Button */}
          <button
            id="btn-add-transaction"
            onClick={() => handleOpenAddModal()}
            className="flex items-center justify-center gap-3 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xl shadow-lg border-2 border-emerald-800 active:scale-95 transition-all"
          >
            <Plus className="w-7 h-7" />
            <span>Yeni Gelir veya Fatura Ekle</span>
          </button>

          {/* Search Bar */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
            <input
              type="text"
              placeholder="Fatura, maaş veya tutar ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-3.5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-2xl text-lg font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-600"
                title="Aramayı temizle"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* FILTER CHIPS & CATEGORY SELECTION */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 mb-6 pb-4 border-b-2 border-slate-200 dark:border-slate-800 no-print">
          {/* Status Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2.5 rounded-xl font-black text-base border-2 transition-all ${
                statusFilter === 'all'
                  ? 'bg-slate-800 text-white border-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 hover:bg-slate-200'
              }`}
            >
              Tümü ({periodTransactions.length})
            </button>

            <button
              onClick={() => setStatusFilter('unpaid')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-base border-2 transition-all ${
                statusFilter === 'unpaid'
                  ? 'bg-amber-600 text-white border-amber-700 shadow-sm'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-300 hover:bg-amber-100'
              }`}
            >
              <Clock className="w-5 h-5" />
              <span>Ödenmeyenler ({periodTransactions.filter((t) => t.type === 'gider' && !t.isPaid).length})</span>
            </button>

            <button
              onClick={() => setStatusFilter('paid')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-base border-2 transition-all ${
                statusFilter === 'paid'
                  ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border-emerald-300 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Ödenenler ({periodTransactions.filter((t) => t.isPaid).length})</span>
            </button>

            <button
              onClick={() => setStatusFilter('income')}
              className={`px-4 py-2.5 rounded-xl font-black text-base border-2 transition-all ${
                statusFilter === 'income'
                  ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                  : 'bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 border-blue-300 hover:bg-blue-100'
              }`}
            >
              Gelirler ({periodTransactions.filter((t) => t.type === 'gelir').length})
            </button>

            <button
              onClick={() => setStatusFilter('expense')}
              className={`px-4 py-2.5 rounded-xl font-black text-base border-2 transition-all ${
                statusFilter === 'expense'
                  ? 'bg-rose-600 text-white border-rose-700 shadow-sm'
                  : 'bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border-rose-300 hover:bg-rose-100'
              }`}
            >
              Giderler ({periodTransactions.filter((t) => t.type === 'gider').length})
            </button>
          </div>

          {/* Category Dropdown Filter */}
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-slate-600 dark:text-slate-400 whitespace-nowrap">
              Kategori:
            </span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-bold text-base cursor-pointer"
            >
              <option value="all">Tüm Kategoriler</option>
              <option value="fatura_all">⚡ Tüm Faturalar (Elektrik, Su, Gaz...)</option>
              <option value="emekli_maasi">💰 Emekli Maaşı</option>
              <option value="diger_gelir">💵 Diğer Gelirler</option>
              <option value="elektrik">⚡ Elektrik Faturası</option>
              <option value="su">💧 Su Faturası</option>
              <option value="dogalgaz">🔥 Doğalgaz Faturası</option>
              <option value="telefon_internet">📞 Telefon ve İnternet</option>
              <option value="diger_fatura">📄 Diğer Faturalar (Aidat vb.)</option>
              <option value="market">🛒 Market & Mutfak</option>
              <option value="saglik">💊 Sağlık & Eczane</option>
              <option value="diger">📦 Diğer Harcamalar</option>
            </select>
          </div>
        </div>

        {/* TRANSACTIONS LIST */}
        <div className="space-y-4">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-16 px-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700">
              <AlertTriangle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <div className="text-2xl font-black text-slate-700 dark:text-slate-300">
                Bu filtreye uygun muhasebe kaydı bulunamadı.
              </div>
              <p className="text-lg text-slate-500 mt-1">
                Arama kriterlerinizi değiştirebilir veya yeni bir fatura/gelir ekleyebilirsiniz.
              </p>
              <button
                onClick={() => handleOpenAddModal()}
                className="mt-5 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-lg hover:bg-emerald-700"
              >
                + Yeni Kayıt Ekle
              </button>
            </div>
          ) : (
            filteredTransactions.map((tx) => {
              const catCfg = getCategoryConfig(tx.category);
              const isUnpaidBill = tx.type === 'gider' && !tx.isPaid;

              return (
                <div
                  key={tx.id}
                  className={`p-5 rounded-2xl border-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${
                    isUnpaidBill
                      ? 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-400 shadow-md ring-2 ring-amber-300'
                      : tx.type === 'gelir'
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {/* Left: Icon & Details */}
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm border-2 border-slate-200 dark:border-slate-700 shrink-0 mt-1 sm:mt-0">
                      {catCfg.icon}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                          {tx.title}
                        </h4>

                        {/* Category Badge */}
                        <span
                          className={`px-2.5 py-0.5 text-xs sm:text-sm font-black rounded-md border ${catCfg.badgeColor}`}
                        >
                          {catCfg.shortLabel}
                        </span>

                        {/* Type & Status Badge */}
                        {tx.type === 'gelir' ? (
                          <span className="px-2.5 py-0.5 bg-emerald-600 text-white text-xs sm:text-sm font-black rounded-md uppercase">
                            GELİR (+)
                          </span>
                        ) : (
                          <span
                            className={`px-2.5 py-0.5 text-xs sm:text-sm font-black rounded-md uppercase ${
                              tx.isPaid
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-amber-600 text-white animate-pulse'
                            }`}
                          >
                            {tx.isPaid ? 'ÖDENDİ ✔' : 'ÖDENECEK ⏳'}
                          </span>
                        )}
                      </div>

                      {/* Meta information */}
                      <div className="text-base text-slate-600 dark:text-slate-300 font-semibold mt-1 flex flex-wrap gap-x-4 gap-y-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>Tarih: {formatTRDate(tx.date)}</span>
                        </span>

                        {tx.dueDate && (
                          <span
                            className={`flex items-center gap-1 font-bold ${
                              isUnpaidBill ? 'text-amber-800 dark:text-amber-300 underline' : 'text-slate-600'
                            }`}
                          >
                            <Clock className="w-4 h-4" />
                            <span>Son Gün: {formatTRDate(tx.dueDate)}</span>
                          </span>
                        )}

                        {tx.notes && (
                          <span className="italic text-slate-500 dark:text-slate-400">
                            • {tx.notes}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Action Buttons */}
                  <div className="flex items-center justify-between w-full md:w-auto gap-3 self-stretch md:self-auto border-t-2 md:border-t-0 pt-3 md:pt-0 border-slate-200 dark:border-slate-800">
                    <div className="text-left md:text-right mr-2">
                      <span
                        className={`text-2xl sm:text-3xl font-black ${
                          tx.type === 'gelir'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-rose-700 dark:text-rose-400'
                        }`}
                      >
                        {tx.type === 'gelir' ? '+' : '-'}
                        {formatTL(tx.amount)}
                      </span>
                    </div>

                    {/* Pay / Paid Toggle Button (For expenses/bills) */}
                    {tx.type === 'gider' && (
                      <button
                        onClick={() => handleTogglePaidWithVoice(tx)}
                        className={`flex items-center gap-2 px-4 sm:px-5 py-3 rounded-2xl font-black text-lg border-2 active:scale-95 shadow-sm transition-transform ${
                          tx.isPaid
                            ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
                            : 'bg-amber-500 text-slate-900 border-amber-600 hover:bg-amber-600 font-extrabold'
                        }`}
                        title={tx.isPaid ? 'Ödenmedi olarak işaretle' : 'Ödendi olarak işaretle'}
                      >
                        {tx.isPaid ? (
                          <>
                            <CheckCircle2 className="w-6 h-6" />
                            <span>ÖDENDİ ✔</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-6 h-6 animate-spin" />
                            <span>ÖDE ⏳</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Edit Button */}
                    <button
                      onClick={() => handleStartEdit(tx)}
                      className="p-3 text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl transition-colors border border-transparent hover:border-blue-200"
                      title="Kaydı düzenle"
                    >
                      <Edit3 className="w-6 h-6" />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => {
                        if (settings.soundEffects) sound.playClick();
                        setDeletingTransaction(tx);
                      }}
                      className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-slate-800 rounded-xl transition-colors border border-transparent hover:border-red-200"
                      title="Kaydı sil"
                    >
                      <Trash2 className="w-6 h-6" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL 1: ADD TRANSACTION MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-print">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-8 max-w-xl w-full border-4 border-emerald-600 shadow-2xl text-slate-900 dark:text-white my-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl sm:text-3xl font-black flex items-center gap-2 text-emerald-800 dark:text-emerald-400">
                <Plus className="w-8 h-8" />
                <span>Yeni Fatura / Gelir Ekle</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-7 h-7" />
              </button>
            </div>

            {/* Quick Senior Preset Buttons */}
            <div className="mb-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl">
              <span className="block text-sm font-black text-slate-600 dark:text-slate-300 mb-2">
                Hızlı Seçim (Tek Tuşla Doldur):
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset('Elektrik Faturası (BEDAŞ)', 'elektrik', 'gider')}
                  className="px-3 py-1.5 bg-amber-100 text-amber-900 font-bold text-sm rounded-lg border border-amber-300 hover:bg-amber-200"
                >
                  ⚡ Elektrik
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('Su Faturası (İSKİ)', 'su', 'gider')}
                  className="px-3 py-1.5 bg-cyan-100 text-cyan-900 font-bold text-sm rounded-lg border border-cyan-300 hover:bg-cyan-200"
                >
                  💧 Su
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('Doğalgaz Faturası (İGDAŞ)', 'dogalgaz', 'gider')}
                  className="px-3 py-1.5 bg-orange-100 text-orange-900 font-bold text-sm rounded-lg border border-orange-300 hover:bg-orange-200"
                >
                  🔥 Doğalgaz
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('Ev İnterneti & Telefon (Türk Telekom)', 'telefon_internet', 'gider')}
                  className="px-3 py-1.5 bg-indigo-100 text-indigo-900 font-bold text-sm rounded-lg border border-indigo-300 hover:bg-indigo-200"
                >
                  📞 Telefon/İnternet
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('Emekli Maaşı (SGK)', 'emekli_maasi', 'gelir')}
                  className="px-3 py-1.5 bg-emerald-100 text-emerald-900 font-bold text-sm rounded-lg border border-emerald-300 hover:bg-emerald-200"
                >
                  💰 Emekli Maaşı
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('Apartman Aidatı', 'diger_fatura', 'gider')}
                  className="px-3 py-1.5 bg-purple-100 text-purple-900 font-bold text-sm rounded-lg border border-purple-300 hover:bg-purple-200"
                >
                  📄 Aidat
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveNew} className="space-y-4">
              {/* Type Switcher */}
              <div>
                <label className="block text-lg font-bold mb-2">Kayıt Türü:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setFormType('gider');
                      setFormIsPaid(false);
                    }}
                    className={`py-3.5 rounded-xl font-black text-xl border-3 transition-all ${
                      formType === 'gider'
                        ? 'bg-rose-600 text-white border-rose-800 shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300'
                    }`}
                  >
                    Fatura / Gider (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormType('gelir');
                      setFormIsPaid(true);
                      setFormCategory('emekli_maasi');
                    }}
                    className={`py-3.5 rounded-xl font-black text-xl border-3 transition-all ${
                      formType === 'gelir'
                        ? 'bg-emerald-600 text-white border-emerald-800 shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300'
                    }`}
                  >
                    Maaş / Gelir (+)
                  </button>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-lg font-bold mb-2">Kategori:</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as TransactionCategory)}
                  className="w-full p-3.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-lg"
                >
                  {formType === 'gelir' ? (
                    <>
                      <option value="emekli_maasi">💰 Emekli Maaşı (SGK / Bağ-Kur)</option>
                      <option value="diger_gelir">💵 Diğer Gelirler (Kira geliri, harçlık vb.)</option>
                    </>
                  ) : (
                    <>
                      <option value="elektrik">⚡ Elektrik Faturası</option>
                      <option value="su">💧 Su Faturası</option>
                      <option value="dogalgaz">🔥 Doğalgaz Faturası</option>
                      <option value="telefon_internet">📞 Telefon ve İnternet Faturası</option>
                      <option value="diger_fatura">📄 Diğer Faturalar (Apartman aidatı vb.)</option>
                      <option value="market">🛒 Market & Mutfak & Pazar</option>
                      <option value="saglik">💊 Sağlık & Eczane & İlaç</option>
                      <option value="diger">📦 Diğer Harcamalar</option>
                    </>
                  )}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-lg font-bold mb-2">Başlık / Açıklama:</label>
                <input
                  type="text"
                  required
                  placeholder="Örn: BEDAŞ Elektrik Faturası veya SGK Maaş"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full p-3.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xl font-bold"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-lg font-bold mb-2">Tutar (Türk Lirası ₺):</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-400">
                    ₺
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-3xl font-black text-emerald-600 dark:text-emerald-400"
                  />
                </div>
              </div>

              {/* Dates: Transaction Date & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-base font-bold mb-1.5">Kayıt Tarihi:</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base font-bold"
                  />
                </div>

                {formType === 'gider' && (
                  <div>
                    <label className="block text-base font-bold mb-1.5">
                      Son Ödeme Tarihi (İsteğe Bağlı):
                    </label>
                    <input
                      type="date"
                      value={formDueDate}
                      onChange={(e) => setFormDueDate(e.target.value)}
                      className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base font-bold"
                    />
                  </div>
                )}
              </div>

              {/* Paid Status Toggle for Expenses */}
              {formType === 'gider' && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-between">
                  <span className="font-bold text-lg">Ödeme Durumu:</span>
                  <button
                    type="button"
                    onClick={() => setFormIsPaid(!formIsPaid)}
                    className={`px-5 py-2.5 rounded-xl font-black text-base border-2 ${
                      formIsPaid
                        ? 'bg-emerald-600 text-white border-emerald-700'
                        : 'bg-amber-500 text-slate-900 border-amber-600'
                    }`}
                  >
                    {formIsPaid ? 'ÖDENDİ ✔' : 'HENÜZ ÖDENMEDİ ⏳'}
                  </button>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-base font-bold mb-1.5">Ek Not (İsteğe Bağlı):</label>
                <input
                  type="text"
                  placeholder="Örn: Abone no: 123456 veya PTT gişesinden"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base"
                />
              </div>

              {/* Security Reminder */}
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Banka şifresi veya kart numarası asla girmeyiniz. Veriler yalnızca bu cihazda tutulur.</span>
              </div>

              {/* Form Buttons */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-4 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold text-xl rounded-xl"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xl rounded-xl shadow-lg border-2 border-emerald-800 active:scale-95"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT TRANSACTION MODAL */}
      {editingTransaction && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-print">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-8 max-w-xl w-full border-4 border-blue-600 shadow-2xl text-slate-900 dark:text-white my-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl sm:text-3xl font-black flex items-center gap-2 text-blue-800 dark:text-blue-400">
                <Edit3 className="w-8 h-8" />
                <span>Kaydı Düzenle</span>
              </h3>
              <button
                onClick={() => setEditingTransaction(null)}
                className="p-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-7 h-7" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              {/* Type Switcher */}
              <div>
                <label className="block text-lg font-bold mb-2">Tür:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormType('gider')}
                    className={`py-3 rounded-xl font-black text-xl border-3 ${
                      formType === 'gider'
                        ? 'bg-rose-600 text-white border-rose-800 shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    Gider (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType('gelir')}
                    className={`py-3 rounded-xl font-black text-xl border-3 ${
                      formType === 'gelir'
                        ? 'bg-emerald-600 text-white border-emerald-800 shadow-md'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    Gelir (+)
                  </button>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-lg font-bold mb-2">Kategori:</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as TransactionCategory)}
                  className="w-full p-3.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-lg"
                >
                  <option value="emekli_maasi">💰 Emekli Maaşı</option>
                  <option value="diger_gelir">💵 Diğer Gelirler</option>
                  <option value="elektrik">⚡ Elektrik Faturası</option>
                  <option value="su">💧 Su Faturası</option>
                  <option value="dogalgaz">🔥 Doğalgaz Faturası</option>
                  <option value="telefon_internet">📞 Telefon ve İnternet</option>
                  <option value="diger_fatura">📄 Diğer Faturalar (Aidat vb.)</option>
                  <option value="market">🛒 Market & Mutfak</option>
                  <option value="saglik">💊 Sağlık & Eczane</option>
                  <option value="diger">📦 Diğer Harcamalar</option>
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-lg font-bold mb-2">Başlık / Açıklama:</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full p-3.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xl font-bold"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-lg font-bold mb-2">Tutar (₺):</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  className="w-full p-3.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-3xl font-black text-blue-600 dark:text-blue-400"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-base font-bold mb-1.5">Tarih:</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base font-bold"
                  />
                </div>

                <div>
                  <label className="block text-base font-bold mb-1.5">Son Ödeme Tarihi:</label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base font-bold"
                  />
                </div>
              </div>

              {/* Status */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-between">
                <span className="font-bold text-lg">Ödeme Durumu:</span>
                <button
                  type="button"
                  onClick={() => setFormIsPaid(!formIsPaid)}
                  className={`px-5 py-2.5 rounded-xl font-black text-base border-2 ${
                    formIsPaid
                      ? 'bg-emerald-600 text-white border-emerald-700'
                      : 'bg-amber-500 text-slate-900 border-amber-600'
                  }`}
                >
                  {formIsPaid ? 'ÖDENDİ ✔' : 'HENÜZ ÖDENMEDİ ⏳'}
                </button>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-base font-bold mb-1.5">Ek Not:</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full p-3 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingTransaction(null)}
                  className="flex-1 py-4 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold text-xl rounded-xl"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-xl rounded-xl shadow-lg border-2 border-blue-800 active:scale-95"
                >
                  Güncellemeyi Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DELETE CONFIRMATION MODAL */}
      {deletingTransaction && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 no-print">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border-4 border-rose-600 shadow-2xl text-slate-900 dark:text-white text-center">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-9 h-9" />
            </div>

            <h3 className="text-2xl sm:text-3xl font-black mb-2 text-rose-700 dark:text-rose-400">
              Bu Kaydı Silmek İstiyor Musunuz?
            </h3>

            <p className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">
              "{deletingTransaction.title}"
            </p>
            <p className="text-2xl font-black text-rose-600 mb-6">
              {formatTL(deletingTransaction.amount)}
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeletingTransaction(null)}
                className="flex-1 py-4 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 font-bold text-xl rounded-xl"
              >
                Vazgeç
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-4 bg-rose-600 hover:bg-rose-700 text-white font-black text-xl rounded-xl shadow-lg border-2 border-rose-800 active:scale-95"
              >
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: PRINT PREVIEW & PRINT DIALOG */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-3 sm:p-6 overflow-y-auto no-print">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-4xl w-full border-4 border-slate-700 shadow-2xl text-slate-900 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b-2 border-slate-200">
              <div className="flex items-center gap-3">
                <Printer className="w-8 h-8 text-slate-800" />
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black">Muhasebe Dökümü & Yazdırma</h3>
                  <p className="text-sm font-bold text-slate-600">
                    Dönem: {getMonthTitle(selectedMonth)} • Toplam {filteredTransactions.length} Kayıt
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPrintModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-7 h-7" />
              </button>
            </div>

            {/* Printable Preview Sheet */}
            <div className="flex-1 overflow-y-auto my-4 p-4 border-2 border-slate-300 rounded-xl bg-slate-50 font-serif">
              <div className="text-center pb-4 border-b-2 border-slate-400">
                <h1 className="text-2xl font-black tracking-wide text-slate-900">
                  SUAT MERKEZİ • YEŞİLÇAM MUHASEBE DEFTERİ
                </h1>
                <p className="text-sm text-slate-600 mt-1">
                  Rapor Tarihi: {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} • Dönem: {getMonthTitle(selectedMonth)}
                </p>
              </div>

              {/* Statement Summary Box */}
              <div className="grid grid-cols-4 gap-2 my-4 text-center font-sans">
                <div className="p-2.5 bg-white border border-slate-300 rounded-lg">
                  <div className="text-xs font-bold text-slate-500 uppercase">Toplam Gelir</div>
                  <div className="text-lg font-black text-emerald-700">{formatTL(monthlyIncome)}</div>
                </div>
                <div className="p-2.5 bg-white border border-slate-300 rounded-lg">
                  <div className="text-xs font-bold text-slate-500 uppercase">Toplam Gider</div>
                  <div className="text-lg font-black text-rose-700">{formatTL(monthlyExpense)}</div>
                </div>
                <div className="p-2.5 bg-white border border-slate-300 rounded-lg">
                  <div className="text-xs font-bold text-slate-500 uppercase">Net Kalan</div>
                  <div className="text-lg font-black text-emerald-800">{formatTL(remainingBalance)}</div>
                </div>
                <div className="p-2.5 bg-white border border-slate-300 rounded-lg">
                  <div className="text-xs font-bold text-slate-500 uppercase">Bekleyen Fatura</div>
                  <div className="text-lg font-black text-amber-700">{formatTL(unpaidBillsTotal)}</div>
                </div>
              </div>

              {/* Statement Table */}
              <table className="w-full text-left border-collapse text-sm font-sans">
                <thead>
                  <tr className="bg-slate-200 border-y-2 border-slate-400">
                    <th className="p-2 font-black">Tarih</th>
                    <th className="p-2 font-black">Kategori</th>
                    <th className="p-2 font-black">Açıklama</th>
                    <th className="p-2 font-black">Son Gün</th>
                    <th className="p-2 font-black">Durum</th>
                    <th className="p-2 font-black text-right">Tutar (TL)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx, idx) => {
                    const cfg = getCategoryConfig(tx.category);
                    return (
                      <tr key={tx.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-100'}>
                        <td className="p-2 border-b border-slate-200 font-semibold">
                          {formatTRDate(tx.date)}
                        </td>
                        <td className="p-2 border-b border-slate-200">{cfg.shortLabel}</td>
                        <td className="p-2 border-b border-slate-200 font-bold">
                          {tx.title} {tx.notes && <span className="font-normal text-slate-500 text-xs">({tx.notes})</span>}
                        </td>
                        <td className="p-2 border-b border-slate-200 text-xs">
                          {tx.dueDate ? formatTRDate(tx.dueDate) : '-'}
                        </td>
                        <td className="p-2 border-b border-slate-200 text-xs font-bold">
                          {tx.type === 'gelir' ? 'GELİR' : tx.isPaid ? 'ÖDENDİ' : 'ÖDENECEK'}
                        </td>
                        <td className={`p-2 border-b border-slate-200 text-right font-black ${
                          tx.type === 'gelir' ? 'text-emerald-700' : 'text-rose-700'
                        }`}>
                          {tx.type === 'gelir' ? '+' : '-'} {formatTL(tx.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="mt-8 pt-4 border-t border-slate-300 flex justify-between text-xs text-slate-500 font-sans">
                <div>Bu belge Suat Merkezi Muhasebe Defteri tarafından yerel olarak üretilmiştir.</div>
                <div>İmza / Kontrol: _____________________</div>
              </div>
            </div>

            {/* Print Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="flex-1 py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-lg rounded-xl"
              >
                Kapat
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xl rounded-xl shadow-lg flex items-center justify-center gap-2"
              >
                <Printer className="w-6 h-6" />
                <span>Yazdır / PDF Olarak Kaydet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: IMPORT / RESTORE CONFIRMATION MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 no-print">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-md w-full border-4 border-purple-600 shadow-2xl text-slate-900 dark:text-white">
            <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Upload className="w-9 h-9" />
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-center mb-2 text-purple-800 dark:text-purple-400">
              Yedekten Geri Yükle
            </h3>

            <p className="text-center font-bold text-lg text-slate-700 dark:text-slate-300 mb-6">
              {importStatusMessage}
            </p>

            {importedCandidate && importedCandidate.length > 0 ? (
              <div className="space-y-3">
                <button
                  onClick={() => handleApplyImport('merge')}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg rounded-xl shadow-md border-2 border-emerald-800"
                >
                  Mevcut Kayıtlarla Birleştir
                </button>
                <button
                  onClick={() => handleApplyImport('replace')}
                  className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-black text-lg rounded-xl shadow-md border-2 border-purple-800"
                >
                  Tümünü Değiştir (Yedeği Yükle)
                </button>
                <button
                  onClick={() => {
                    setShowImportModal(false);
                    setImportedCandidate(null);
                  }}
                  className="w-full py-3 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-lg rounded-xl"
                >
                  Vazgeç
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowImportModal(false)}
                className="w-full py-3.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-lg rounded-xl"
              >
                Kapat
              </button>
            )}
          </div>
        </div>
      )}

      {/* MODAL 6: SENIOR BIG KEYPAD CALCULATOR */}
      {showCalcModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 no-print">
          <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 max-w-md w-full border-4 border-sky-500 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-black flex items-center gap-2 text-sky-400">
                <Calculator className="w-7 h-7" />
                <span>Büyük Tuşlu Hesap Makinesi</span>
              </h3>
              <button
                onClick={() => setShowCalcModal(false)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-lg font-bold"
              >
                Kapat
              </button>
            </div>

            {/* Screen Display */}
            <div className="bg-black p-5 rounded-2xl border-2 border-sky-400 mb-6 text-right font-mono">
              <div className="text-sm text-slate-400 h-6">
                {calcPrev !== null ? `${calcPrev} ${calcOp || ''}` : ''}
              </div>
              <div className="text-5xl font-black text-emerald-400 tracking-wider overflow-x-auto">
                {calcDisplay}
              </div>
            </div>

            {/* Huge Keys Grid */}
            <div className="grid grid-cols-4 gap-3 text-2xl font-black">
              <button
                onClick={handleCalcClear}
                className="col-span-2 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl active:scale-95"
              >
                C (TEMİZLE)
              </button>
              <button
                onClick={() => handleCalcOp('÷')}
                className="py-4 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl active:scale-95"
              >
                ÷
              </button>
              <button
                onClick={() => handleCalcOp('×')}
                className="py-4 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl active:scale-95"
              >
                ×
              </button>

              {['7', '8', '9'].map((d) => (
                <button
                  key={d}
                  onClick={() => handleCalcDigit(d)}
                  className="py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl border border-slate-700 active:scale-95"
                >
                  {d}
                </button>
              ))}
              <button
                onClick={() => handleCalcOp('-')}
                className="py-4 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl active:scale-95"
              >
                -
              </button>

              {['4', '5', '6'].map((d) => (
                <button
                  key={d}
                  onClick={() => handleCalcDigit(d)}
                  className="py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl border border-slate-700 active:scale-95"
                >
                  {d}
                </button>
              ))}
              <button
                onClick={() => handleCalcOp('+')}
                className="py-4 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl active:scale-95"
              >
                +
              </button>

              {['1', '2', '3'].map((d) => (
                <button
                  key={d}
                  onClick={() => handleCalcDigit(d)}
                  className="py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl border border-slate-700 active:scale-95"
                >
                  {d}
                </button>
              ))}
              <button
                onClick={handleCalcEqual}
                className="row-span-2 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl flex items-center justify-center text-4xl shadow-lg active:scale-95"
              >
                =
              </button>

              <button
                onClick={() => handleCalcDigit('0')}
                className="col-span-2 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl border border-slate-700 active:scale-95"
              >
                0
              </button>
              <button
                onClick={() => {
                  if (!calcDisplay.includes('.')) handleCalcDigit('.');
                }}
                className="py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl border border-slate-700 active:scale-95"
              >
                ,
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT-ONLY VIEW (Will ONLY appear when window.print() is called) */}
      <div className="print-only p-8 text-black bg-white">
        <div className="text-center pb-6 border-b-2 border-black mb-6">
          <h1 className="text-3xl font-black">SUAT MERKEZİ • YEŞİLÇAM MUHASEBE DEFTERİ</h1>
          <p className="text-base mt-2 font-bold">
            Rapor Tarihi: {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} • Dönem: {getMonthTitle(selectedMonth)}
          </p>
        </div>

        {/* Totals Table */}
        <div className="grid grid-cols-4 gap-4 mb-6 text-center border-2 border-black p-4 rounded-xl">
          <div>
            <div className="text-xs font-bold uppercase">Toplam Gelir</div>
            <div className="text-xl font-black text-black">{formatTL(monthlyIncome)}</div>
          </div>
          <div>
            <div className="text-xs font-bold uppercase">Toplam Gider</div>
            <div className="text-xl font-black text-black">{formatTL(monthlyExpense)}</div>
          </div>
          <div>
            <div className="text-xs font-bold uppercase">Kalan Bakiye</div>
            <div className="text-xl font-black text-black">{formatTL(remainingBalance)}</div>
          </div>
          <div>
            <div className="text-xs font-bold uppercase">Bekleyen Faturalar</div>
            <div className="text-xl font-black text-black">{formatTL(unpaidBillsTotal)}</div>
          </div>
        </div>

        {/* Detailed Records Table */}
        <table className="w-full border-collapse text-sm mb-8">
          <thead>
            <tr className="border-b-2 border-black bg-slate-100">
              <th className="p-2 text-left font-black">Tarih</th>
              <th className="p-2 text-left font-black">Kategori</th>
              <th className="p-2 text-left font-black">Açıklama</th>
              <th className="p-2 text-left font-black">Son Ödeme</th>
              <th className="p-2 text-left font-black">Durum</th>
              <th className="p-2 text-right font-black">Tutar</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.map((tx) => {
              const cfg = getCategoryConfig(tx.category);
              return (
                <tr key={tx.id} className="border-b border-slate-300">
                  <td className="p-2">{formatTRDate(tx.date)}</td>
                  <td className="p-2 font-semibold">{cfg.shortLabel}</td>
                  <td className="p-2 font-bold">{tx.title} {tx.notes && `(${tx.notes})`}</td>
                  <td className="p-2">{tx.dueDate ? formatTRDate(tx.dueDate) : '-'}</td>
                  <td className="p-2 font-bold">{tx.type === 'gelir' ? 'GELİR' : tx.isPaid ? 'ÖDENDİ' : 'ÖDENECEK'}</td>
                  <td className="p-2 text-right font-black">
                    {tx.type === 'gelir' ? '+' : '-'} {formatTL(tx.amount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="flex justify-between text-xs pt-8 border-t border-black">
          <div>Bu belge Suat Merkezi Muhasebe Defteri tarafından yerel olarak üretilmiştir.</div>
          <div>İmza: _______________________</div>
        </div>
      </div>
    </div>
  );
};
