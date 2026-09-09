import React from 'react';
import { TabType, AppSettings } from '../types';
import { Tv, Music, Wallet, Lock, Folder, Settings, ArrowRight, Globe } from 'lucide-react';
import { sound } from '../utils/audio';
import { useTVHomeGridNavigation } from '../platform';

interface HomeGridProps {
  onNavigate: (tab: TabType) => void;
  settings: AppSettings;
}

export const HomeGrid: React.FC<HomeGridProps> = ({ onNavigate, settings }) => {
  const menuItems = [
    {
      id: 'iptv' as TabType,
      title: '📺 SuatiPTV',
      subtitle: 'Televizyon, Canlı Haberler ve Yeşilçam Filmleri',
      badge: '7 Canlı Kanal',
      icon: Tv,
      bgLight: 'bg-red-50 hover:bg-red-100 border-red-400 text-red-950',
      iconBg: 'bg-red-600 text-white',
      highContrastStyle: 'bg-black text-white border-4 border-red-500 hover:bg-red-950',
      speechText: 'Suat iPTV. Televizyon kanalları ve Yeşilçam filmlerini izlemek için dokunun.',
    },
    {
      id: 'muzik' as TabType,
      title: '🎵 SuatMuzik',
      subtitle: 'Klasik Türk Sanat Müziği, Türküler ve Alaturka Radyo',
      badge: 'Zeki Müren & Barış Manço',
      icon: Music,
      bgLight: 'bg-amber-50 hover:bg-amber-100 border-amber-400 text-amber-950',
      iconBg: 'bg-amber-600 text-white',
      highContrastStyle: 'bg-black text-white border-4 border-amber-400 hover:bg-amber-950',
      speechText: 'Suat Müzik. Nostaljik şarkıları ve türküleri dinlemek için dokunun.',
    },
    {
      id: 'internet_medya' as TabType,
      title: '🌐 İnternet & Medya',
      subtitle: 'YouTube, Facebook, Müzik, Medya Araçları ve İndirilenler',
      badge: 'Video, Müzik & Araçlar',
      icon: Globe,
      bgLight: 'bg-indigo-50 hover:bg-indigo-100 border-indigo-400 text-indigo-950',
      iconBg: 'bg-indigo-600 text-white',
      highContrastStyle: 'bg-black text-white border-4 border-indigo-400 hover:bg-indigo-950',
      speechText: 'İnternet ve Medya. YouTube, Facebook, Medya Araçları ve İndirilenleri açmak için dokunun.',
    },
    {
      id: 'muhasebe' as TabType,
      title: '💰 Yeşilçam Muhasebe',
      subtitle: 'Emekli Maaşı, Elektrik, Su ve Gaz Faturaları Defteri',
      badge: 'Bakiye & Kolay Hesap',
      icon: Wallet,
      bgLight: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-400 text-emerald-950',
      iconBg: 'bg-emerald-600 text-white',
      highContrastStyle: 'bg-black text-white border-4 border-emerald-400 hover:bg-emerald-950',
      speechText: 'Yeşilçam Muhasebe. Emekli maaşınızı ve faturalarınızı hesaplamak için dokunun.',
    },
    {
      id: 'sifre' as TabType,
      title: '🔐 Yeşilçam Şifre Merkezi',
      subtitle: 'Mail, Wi-Fi, Telefon, TV, Banka ve Diğer Şifreler Kasanız',
      badge: 'Güvenli Şifre Kasası',
      icon: Lock,
      bgLight: 'bg-sky-50 hover:bg-sky-100 border-sky-400 text-sky-950',
      iconBg: 'bg-sky-600 text-white',
      highContrastStyle: 'bg-black text-white border-4 border-sky-400 hover:bg-sky-950',
      speechText: 'Yeşilçam Şifre Merkezi. Kilitli şifre kasanızı güvenle açmak için dokunun.',
    },
    {
      id: 'dosyalar' as TabType,
      title: '📁 Dosyalarım',
      subtitle: 'Aile & Torun Fotoğrafları, Doktor Raporları ve Evraklar',
      badge: 'Fotoğrafları Büyüt',
      icon: Folder,
      bgLight: 'bg-purple-50 hover:bg-purple-100 border-purple-400 text-purple-950',
      iconBg: 'bg-purple-600 text-white',
      highContrastStyle: 'bg-black text-white border-4 border-purple-400 hover:bg-purple-950',
      speechText: 'Dosyalarım. Fotoğraflarınızı ve sağlık raporlarınızı görmek için dokunun.',
    },
    {
      id: 'ayarlar' as TabType,
      title: '⚙️ Ayarlar',
      subtitle: 'Yazı Boyutu, Yüksek Kontrast ve Kolaylaştırıcı Seçenekler',
      badge: 'Büyük Yazı & Ses',
      icon: Settings,
      bgLight: 'bg-slate-100 hover:bg-slate-200 border-slate-400 text-slate-950',
      iconBg: 'bg-slate-700 text-white',
      highContrastStyle: 'bg-black text-white border-4 border-yellow-300 hover:bg-slate-900',
      speechText: 'Ayarlar. Yazı boyutunu büyütmek veya renkleri değiştirmek için dokunun.',
    },
  ];

  const handleSelect = (tab: TabType, speechText: string) => {
    if (settings.soundEffects) {
      sound.playClick();
    }
    if (settings.voiceAssistance) {
      sound.speak(speechText);
    }
    onNavigate(tab);
  };

  const { focusedIndex, isRemoteActive, setFocusedIndex, setItemRef } = useTVHomeGridNavigation({
    itemCount: menuItems.length,
    isActive: true,
    onSelect: (index) => {
      const item = menuItems[index];
      if (item) {
        handleSelect(item.id, item.speechText);
      }
    },
  });

  return (
    <main id="home-view" className="w-full py-6 sm:py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Welcome Greeting Banner */}
        <div
          className={`mb-6 p-6 sm:p-8 rounded-3xl border-3 shadow-md transition-all ${
            settings.highContrast
              ? 'bg-black border-yellow-400 text-yellow-300'
              : 'bg-gradient-to-r from-amber-100 via-orange-50 to-amber-100 border-amber-300 text-amber-950'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-amber-200/80 text-amber-900 font-extrabold text-sm mb-2">
                HUZURLU & GÜVENLİ MERKEZ
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-2">
                Hoş Geldiniz Suat Bey
              </h2>
              <p className="text-xl sm:text-2xl font-medium text-slate-700 dark:text-yellow-100">
                Aşağıdaki büyük düğmelerden yapmak istediğiniz işlemi seçiniz:
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-2 bg-white/70 backdrop-blur-xs px-4 py-3 rounded-2xl border border-amber-200 shadow-sm text-slate-800">
              <span className="text-3xl">👓</span>
              <span className="text-lg font-bold">Kolay Okunur Ekran</span>
            </div>
          </div>
        </div>

        {/* The 6 Big Buttons Grid */}
        <div
          id="main-navigation-grid"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6"
        >
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const isFocused = isRemoteActive && focusedIndex === index;

            return (
              <button
                key={item.id}
                id={`btn-menu-${item.id}`}
                ref={(el) => setItemRef(index, el)}
                onClick={() => {
                  setFocusedIndex(index);
                  handleSelect(item.id, item.speechText);
                }}
                onFocus={() => {
                  setFocusedIndex(index);
                }}
                className={`group relative flex flex-col justify-between p-6 sm:p-8 rounded-3xl border-3 shadow-md transition-all duration-200 transform text-left cursor-pointer ${
                  isFocused
                    ? settings.highContrast
                      ? 'ring-4 ring-yellow-400 ring-offset-4 ring-offset-black scale-[1.02] shadow-2xl z-10'
                      : 'ring-4 ring-amber-500 ring-offset-2 ring-offset-white scale-[1.02] shadow-2xl z-10'
                    : 'hover:-translate-y-1 hover:shadow-xl active:scale-98'
                } ${
                  settings.highContrast
                    ? item.highContrastStyle
                    : `${item.bgLight} border-2`
                }`}
              >
                {/* Top Row: Icon + Badge */}
                <div className="flex items-center justify-between w-full mb-4">
                  <div
                    className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center shadow-md ${
                      settings.highContrast
                        ? 'bg-yellow-400 text-black'
                        : item.iconBg
                    }`}
                  >
                    <Icon className="w-10 h-10 sm:w-12 sm:h-12" />
                  </div>

                  <span
                    className={`px-3 py-1.5 rounded-xl font-black text-sm sm:text-base uppercase tracking-wide border shadow-xs ${
                      settings.highContrast
                        ? 'bg-yellow-400 text-black border-yellow-200'
                        : 'bg-white/90 text-slate-800 border-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                </div>

                {/* Middle: Title & Subtitle */}
                <div className="my-2">
                  <h3 className="text-2xl sm:text-3xl font-black tracking-tight mb-2 group-hover:underline">
                    {item.title}
                  </h3>
                  <p className="text-lg sm:text-xl font-semibold opacity-90 leading-relaxed">
                    {item.subtitle}
                  </p>
                </div>

                {/* Bottom Row: Tap prompt with arrow */}
                <div className="mt-4 pt-3 border-t-2 border-current/20 flex items-center justify-between font-black text-lg sm:text-xl">
                  <span>{isFocused ? 'AÇMAK İÇİN [OK] / DOKUN' : 'AÇMAK İÇİN DOKUN'}</span>
                  <div
                    className={`w-10 h-10 rounded-xl bg-current/10 flex items-center justify-center transition-transform ${
                      isFocused ? 'scale-110 translate-x-1' : 'group-hover:translate-x-1'
                    }`}
                  >
                    <ArrowRight className="w-6 h-6" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Senior Friendly Quick Help Strip */}
        <div
          className={`mt-8 p-5 rounded-2xl border-2 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left ${
            settings.highContrast
              ? 'bg-slate-950 border-yellow-400 text-yellow-200'
              : 'bg-sky-50 border-sky-200 text-sky-900'
          }`}
        >
          <div className="flex items-center gap-3">
            <span className="text-3xl">💡</span>
            <span className="text-lg sm:text-xl font-bold">
              İpucu: Sayfaları ve yazıları daha büyük görmek için sağ üstteki <strong>A+</strong> düğmesine basabilirsiniz.
            </span>
          </div>
          <button
            onClick={() => {
              if (settings.soundEffects) sound.playClick();
              handleSelect('ayarlar', 'Ayarlar açılıyor');
            }}
            className="px-5 py-2.5 rounded-xl font-black text-lg bg-sky-600 hover:bg-sky-700 text-white shadow-sm shrink-0"
          >
            Yazıyı Büyüt
          </button>
        </div>
      </div>
    </main>
  );
};
