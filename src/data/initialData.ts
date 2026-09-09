import { IPTVChannel, MusicTrack, Transaction, PasswordItem, DocumentItem, AppSettings } from '../types';

export const initialSettings: AppSettings = {
  fontSize: 'large', // 'normal' | 'large' | 'xlarge'
  highContrast: false,
  soundEffects: true,
  voiceAssistance: true,
  emergencyName: 'Oğlu Ahmet Bey',
  emergencyPhone: '0532 555 01 23',
  doctorPhone: '0212 555 99 88',
};

export const initialChannels: IPTVChannel[] = [];

export const initialMusic: MusicTrack[] = [
  {
    id: 'm1',
    title: 'Şimdi Uzaklardasın',
    artist: 'Zeki Müren',
    category: 'Sanat Müziği',
    duration: 215,
    audioMelodyKey: 'zeki_muren',
    coverEmoji: '🌹',
    lyrics: [
      'Şimdi uzaklardasın, gönül hicranla doldu',
      'Hiç ayrılamam derken, kavuşmak hayal oldu',
      'Sevda bahçelerinin gülleri bir bir soldu',
      'Hiç ayrılamam derken, kavuşmak hayal oldu...'
    ]
  },
  {
    id: 'm2',
    title: 'Gülpembe',
    artist: 'Barış Manço',
    category: 'Nostalji Yeşilçam',
    duration: 240,
    audioMelodyKey: 'baris_manco',
    coverEmoji: '🌸',
    lyrics: [
      'Sen gülünce güller açar Gülpembe',
      'Bülbüller seni dinler derinden de',
      'Özlem dolu gözler seni arar her yerde',
      'Güz yağmurlarıyla bir gün dönersin diye...'
    ]
  },
  {
    id: 'm3',
    title: 'Gönül Dağı',
    artist: 'Neşet Ertaş',
    category: 'Halk Müziği',
    duration: 260,
    audioMelodyKey: 'neset_ertas',
    coverEmoji: '🌾',
    lyrics: [
      'Gönül dağı yağmur boran olunca',
      'Akar can özümden sel gizli gizli',
      'Bir tenhada can cananı bulunca',
      'Sinemi yaralar yar gizli gizli...'
    ]
  },
  {
    id: 'm4',
    title: 'Fikrimin İnce Gülü',
    artist: 'Müzeyyen Senar',
    category: 'Sanat Müziği',
    duration: 195,
    audioMelodyKey: 'fikrimin_gulu',
    coverEmoji: '🌷',
    lyrics: [
      'Fikrimin ince gülü, kalbimin şen bülbülü',
      'O gün ki gördüm seni, yaktın ah yaktın beni',
      'Gördüğüm günden beri, olmuşum aşık sana',
      'O gün ki gördüm seni, yaktın ah yaktın beni...'
    ]
  },
  {
    id: 'm5',
    title: 'Yeşilçam Hatıraları (Film Melodisi)',
    artist: 'Cahit Berkay & Film Orkestrası',
    category: 'Nostalji Yeşilçam',
    duration: 180,
    audioMelodyKey: 'yesilcam_theme',
    coverEmoji: '🎬',
    lyrics: [
      '(Enstrümantal Yeşilçam Klasiği)',
      'Selvi Boylum Al Yazmalım & Çiçek Abbas Hatıraları',
      'Eski İstanbul sokakları, sıcacık komşuluklar ve nostalji...'
    ]
  },
  {
    id: 'm6',
    title: 'Radyo Alaturka Canlı Yayın',
    artist: 'TRT Nağme & Alaturka Radyo',
    category: 'Radyo',
    duration: 3600,
    audioMelodyKey: 'alaturka_radio',
    coverEmoji: '📻',
    lyrics: [
      'Radyo Alaturka Canlı Yayındasınız.',
      'Sizler için seçilmiş en güzel klasik eserler çalmaktadır.',
      'Radyonun sesini açıp keyifle dinleyebilirsiniz.'
    ]
  }
];

export const initialTransactions: Transaction[] = [
  {
    id: 't1',
    title: 'Emekli Maaşı (SGK)',
    category: 'emekli_maasi',
    amount: 19500,
    date: '2026-09-01',
    isPaid: true,
    type: 'gelir',
    notes: 'Ziraat Bankası hesabına yattı.'
  },
  {
    id: 't2',
    title: 'Elektrik Faturası (BEDAŞ)',
    category: 'elektrik',
    amount: 580,
    date: '2026-09-03',
    dueDate: '2026-09-15',
    isPaid: false,
    type: 'gider',
    notes: 'Son ödeme gününe az kaldı, otomatik ödemede değil.'
  },
  {
    id: 't3',
    title: 'Doğalgaz Faturası (İGDAŞ)',
    category: 'dogalgaz',
    amount: 940,
    date: '2026-09-04',
    dueDate: '2026-09-20',
    isPaid: false,
    type: 'gider',
    notes: 'Kış hazırlığı kombi bakımı ve kullanım.'
  },
  {
    id: 't4',
    title: 'Su Faturası (İSKİ)',
    category: 'su',
    amount: 235,
    date: '2026-09-02',
    dueDate: '2026-09-12',
    isPaid: true,
    type: 'gider',
    notes: 'PTT gişesinden ödendi.'
  },
  {
    id: 't5',
    title: 'Ev İnterneti & Telefon (Türk Telekom)',
    category: 'telefon_internet',
    amount: 420,
    date: '2026-09-05',
    dueDate: '2026-09-18',
    isPaid: false,
    type: 'gider',
    notes: 'Sabit hat ve limitsiz ev interneti faturası.'
  },
  {
    id: 't6',
    title: 'Apartman Aidatı & Merdiven Temizliği',
    category: 'diger_fatura',
    amount: 350,
    date: '2026-09-06',
    dueDate: '2026-09-15',
    isPaid: true,
    type: 'gider',
    notes: 'Yönetici Rıza Bey’e elden ödendi.'
  },
  {
    id: 't7',
    title: 'Eczane & Tansiyon İlaçları',
    category: 'saglik',
    amount: 320,
    date: '2026-09-05',
    isPaid: true,
    type: 'gider',
    notes: '3 aylık tansiyon ve vitamin ilaçları alındı.'
  },
  {
    id: 't8',
    title: 'Haftalık Pazar & Manav Alışverişi',
    category: 'market',
    amount: 1450,
    date: '2026-09-07',
    isPaid: true,
    type: 'gider',
    notes: 'Domates, peynir, zeytin, taze sebzeler.'
  }
];

export const initialPasswords: PasswordItem[] = [
  {
    id: 'p1',
    title: 'Gmail / E-Posta Hesabım',
    category: 'Mail',
    username: 'suat.yesilcam53@gmail.com',
    password: 'Posta*2026!Suat',
    secret: 'Posta*2026!Suat',
    description: 'Aile mektupları ve fatura bildirimleri için kullanılan e-posta.',
    notes: 'Aile mektupları ve fatura bildirimleri için kullanılan e-posta.',
    updatedAt: '15 Ağustos 2026'
  },
  {
    id: 'p2',
    title: 'Evdeki Wi-Fi İnternet Ağı',
    category: 'Wi-Fi',
    username: 'TurkTelekom_Suat',
    password: 'yesilcam_wifi_1954',
    secret: 'yesilcam_wifi_1954',
    description: 'Evdeki kablosuz modem şifresi, torunlar sorunca verilir.',
    notes: 'Evdeki kablosuz modem şifresi, torunlar sorunca verilir.',
    updatedAt: '1 Mayıs 2026'
  },
  {
    id: 'p3',
    title: 'Cep Telefonu Ekran Kilidi',
    category: 'Telefon',
    username: '0532 000 00 00',
    password: '1954',
    secret: '1954',
    description: 'Telefon açılırken sorulan 4 haneli kolay PIN kodu.',
    notes: 'Telefon açılırken sorulan 4 haneli kolay PIN kodu.',
    updatedAt: '22 Haziran 2026'
  },
  {
    id: 'p4',
    title: 'Salondaki Akıllı Televizyon',
    category: 'TV',
    username: 'Oturma Odası Smart TV',
    password: '0000',
    secret: '0000',
    description: 'Televizyonda uygulama indirirken veya kilit açarken girilen PIN.',
    notes: 'Televizyonda uygulama indirirken veya kilit açarken girilen PIN.',
    updatedAt: '10 Temmuz 2026'
  },
  {
    id: 'p5',
    title: 'Emekli Banka Kartı Hatırlatıcı',
    category: 'Banka',
    username: 'Ziraat Bankası',
    password: '1954',
    secret: '1954',
    pinOrCardNo: 'Kart Sonu: 4218',
    description: 'Maaş çekerken bankamatikte kullanılan 4 haneli hatırlatma kodu.',
    notes: 'Maaş çekerken bankamatikte kullanılan 4 haneli hatırlatma kodu.',
    updatedAt: '25 Nisan 2026'
  },
  {
    id: 'p6',
    title: 'e-Devlet Kapısı Notu',
    category: 'Diğer',
    username: '34892184912',
    password: 'Suat53*Ankara',
    secret: 'Suat53*Ankara',
    description: 'Emeklilik evrakları ve hastane tahlilleri için kullanılır.',
    notes: 'Emeklilik evrakları ve hastane tahlilleri için kullanılır.',
    updatedAt: '10 Ağustos 2026'
  }
];

export const initialDocuments: DocumentItem[] = [
  {
    id: 'd1',
    title: 'Torun Can ve Elif - Bayram Hatırası',
    category: '👶 Torunlar',
    folder: '👶 Torunlar',
    date: 'Kurban Bayramı 2026',
    type: 'image',
    contentUrl: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=800&q=80',
    description: 'Torunlarım Can ve Elif\'in bayram ziyaretindeki güzel gülücükleri.',
    voiceNote: 'Torunlarım bayramda geldi, çok neşeli bir gündü.',
    fileSize: '1.2 MB',
    fileName: 'can_ve_elif_bayram.jpg',
  },
  {
    id: 'd2',
    title: 'Tansiyon & Şeker Doktor Raporu',
    category: '🩺 Raporlar',
    folder: '🩺 Raporlar',
    date: '28 Ağustos 2026',
    type: 'text',
    contentUrl: '',
    description: 'Dr. Mehmet Bey kontrolü: Tansiyon 12/8 normal. Açlık şekeri 105 gayet iyi çıktı. İlaçlara aynen devam edilecek.',
    voiceNote: 'Doktor değerlerin çok iyi olduğunu söyledi.',
    fileSize: '45 KB',
    fileName: 'doktor_tahlil_raporu.pdf',
  },
  {
    id: 'd3',
    title: 'Ev Elektrik ve Su Abonelik Numaraları',
    category: '📄 Evraklar',
    folder: '📄 Evraklar',
    date: '2026 Güncel',
    type: 'text',
    contentUrl: '',
    description: 'BEDAŞ Elektrik Sözleşme No: 48921820\nİSKİ Su Abone No: 02194821\nİGDAŞ Doğalgaz No: 8841294',
    voiceNote: 'Faturaları öderken bu numaralar kullanılır.',
    fileSize: '18 KB',
    fileName: 'abonelik_evraklari.txt',
  },
  {
    id: 'd4',
    title: 'Aile Pikniği - Karadeniz Gezisi',
    category: '👨‍👩‍👧 Aile',
    folder: '👨‍👩‍👧 Aile',
    date: 'Temmuz 2026',
    type: 'image',
    contentUrl: 'https://images.unsplash.com/photo-1470246973918-29a93221c455?auto=format&fit=crop&w=800&q=80',
    description: 'Yaylada ailece çay içip piknik yaptığımız günün hatıra fotoğrafı.',
    fileSize: '2.4 MB',
    fileName: 'aile_piknik_karadeniz.jpg',
  },
  {
    id: 'd5',
    title: 'Ağustos Ayı İSKİ Su Makbuzu (Ödendi)',
    category: '📄 Evraklar',
    folder: '📄 Evraklar',
    date: '15 Ağustos 2026',
    type: 'text',
    contentUrl: '',
    description: 'Tutar: 210 TL - PTT Şubesinden makbuz alındı. İşlem No: 9812491.',
    fileSize: '28 KB',
    fileName: 'iski_su_makbuzu.pdf',
  },
  {
    id: 'd6',
    title: 'Bahçedeki Çiçekler Hatırası',
    category: '📷 Fotoğraflar',
    folder: '📷 Fotoğraflar',
    date: '10 Haziran 2026',
    type: 'image',
    contentUrl: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80',
    description: 'Balkondaki sardunyalar ve güller bu yaz çok güzel açtı.',
    fileSize: '1.8 MB',
    fileName: 'bahce_cicekler.jpg',
  }
];
