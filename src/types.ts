export type TabType = 'home' | 'iptv' | 'muzik' | 'muhasebe' | 'sifre' | 'dosyalar' | 'ayarlar' | 'internet_medya';

export type FontSizeOption = 'normal' | 'large' | 'xlarge';

export interface AppSettings {
  fontSize: FontSizeOption;
  highContrast: boolean;
  soundEffects: boolean;
  voiceAssistance: boolean;
  emergencyName: string;
  emergencyPhone: string;
  doctorPhone: string;
}

export interface IPTVChannel {
  id: string;
  number: number;
  name: string;
  category: string; // Group title or category
  group?: string;
  description?: string;
  streamUrl: string;
  badge?: string;
  iconName?: string;
  currentProgram?: string;
  logo?: string;
  tvgId?: string;
  isFavorite?: boolean;
}

export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  category: 'Sanat Müziği' | 'Halk Müziği' | 'Nostalji Yeşilçam' | 'Radyo';
  duration: number; // in seconds
  audioMelodyKey: string; // for web audio melodic playback
  lyrics: string[];
  coverEmoji: string;
}

export type TransactionCategory =
  | 'emekli_maasi'
  | 'diger_gelir'
  | 'elektrik'
  | 'su'
  | 'dogalgaz'
  | 'telefon_internet'
  | 'diger_fatura'
  | 'market'
  | 'saglik'
  | 'diger'
  | 'fatura'
  | 'maas';

export interface Transaction {
  id: string;
  title: string;
  category: TransactionCategory;
  amount: number;
  date: string;
  dueDate?: string;
  isPaid: boolean;
  type: 'gelir' | 'gider';
  notes?: string;
}

export type PasswordCategory = 'Mail' | 'Wi-Fi' | 'Telefon' | 'TV' | 'Banka' | 'Diğer';

export interface PasswordItem {
  id: string;
  title: string;
  category: PasswordCategory;
  username: string;
  password?: string;
  secret?: string; // backwards compatibility
  description: string;
  notes?: string; // backwards compatibility
  pinOrCardNo?: string;
  updatedAt: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  category: string;
  folder?: string;
  date: string;
  type: 'image' | 'text' | 'pdf';
  contentUrl: string;
  description: string;
  voiceNote?: string;
  fileSize?: string;
  fileName?: string;
}

export interface DownloadedMediaItem {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'document' | 'other';
  size: string;
  date: string;
  blobUrl?: string;
  source: string;
}
