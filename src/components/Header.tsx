import React, { useState, useEffect } from 'react';
import { TabType, AppSettings } from '../types';
import { Home, Volume2, VolumeX, PhoneCall, Sparkles, HelpCircle } from 'lucide-react';
import { sound } from '../utils/audio';

interface HeaderProps {
  currentTab: TabType;
  onNavigate: (tab: TabType) => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onNavigate,
  settings,
  onUpdateSettings,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      // Turkish date formatting: 9 Eylül 2026 Çarşamba
      const optionsDate: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        weekday: 'long',
      };
      setCurrentDate(now.toLocaleDateString('tr-TR', optionsDate));
      setCurrentTime(
        now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
      );
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSpeechRead = () => {
    if (settings.soundEffects) sound.playClick();
    let text = `Suat Merkezi. Tarih: ${currentDate}. Saat: ${currentTime}. `;
    if (currentTab === 'home') {
      text += 'Ana sayfadasınız. Televizyon, Müzik, Muhasebe, Şifreler, Dosyalarım veya Ayarlar düğmelerine dokunabilirsiniz.';
    } else if (currentTab === 'iptv') {
      text += 'Suat iPTV Televizyon bölümündesiniz. Kanalları yukarı aşağı düğmeleriyle değiştirebilirsiniz.';
    } else if (currentTab === 'muzik') {
      text += 'Suat Müzik bölümündesiniz. Yeşilçam ve Klasik Türk Sanat Müziği eserlerini dinleyebilirsiniz.';
    } else if (currentTab === 'muhasebe') {
      text += 'Yeşilçam Muhasebe bölümündesiniz. Emekli maaşınızı ve faturalarınızı kontrol edebilirsiniz.';
    } else if (currentTab === 'sifre') {
      text += 'Yeşilçam Şifre Merkezi bölümündesiniz. e-Devlet ve banka şifrelerinizi güvenle görebilirsiniz.';
    } else if (currentTab === 'dosyalar') {
      text += 'Dosyalarım bölümündesiniz. Aile fotoğraflarınızı ve sağlık raporlarınızı inceleyebilirsiniz.';
    } else if (currentTab === 'ayarlar') {
      text += 'Ayarlar bölümündesiniz. Yazı boyutunu ve sesleri buradan ayarlayabilirsiniz.';
    } else if (currentTab === 'internet_medya') {
      text += 'İnternet ve Medya bölümündesiniz. YouTube, Facebook, Müzik, Medya Araçları ve İndirilenlerinize buradan ulaşabilirsiniz.';
    }
    sound.speak(text);
  };

  const getPageTitle = () => {
    switch (currentTab) {
      case 'iptv':
        return '📺 SuatiPTV - Canlı Televizyon';
      case 'muzik':
        return '🎵 SuatMuzik - Nostalji Müzik Çalar';
      case 'muhasebe':
        return '💰 Yeşilçam Muhasebe & Emekli Defteri';
      case 'sifre':
        return '🔐 Yeşilçam Şifre Merkezi';
      case 'dosyalar':
        return '📂 Dosyalarım & Aile Albümü';
      case 'ayarlar':
        return '⚙️ Ayarlar & Kolaylaştırıcı';
      case 'internet_medya':
        return '🌐 İnternet & Medya Merkezi';
      default:
        return 'Suat Merkezi';
    }
  };

  return (
    <>
      <header
        id="app-header"
        className={`w-full border-b-4 transition-colors ${
          settings.highContrast
            ? 'bg-black border-yellow-400 text-yellow-300'
            : 'bg-white border-slate-200 text-slate-900 shadow-sm'
        } py-3 px-4 sm:px-6`}
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Left: Brand or Back to Home */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            {currentTab !== 'home' ? (
              <button
                id="btn-back-to-home"
                onClick={() => {
                  if (settings.soundEffects) sound.playClick();
                  onNavigate('home');
                }}
                className={`flex items-center gap-3 px-5 py-3 rounded-2xl font-bold text-xl sm:text-2xl border-2 transition-all transform active:scale-95 shadow-md ${
                  settings.highContrast
                    ? 'bg-yellow-400 text-black border-white hover:bg-yellow-300'
                    : 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
                }`}
                title="Ana Sayfaya Dön"
              >
                <Home className="w-8 h-8" />
                <span>ANA SAYFAYA DÖN</span>
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl flex items-center justify-center font-black text-2xl shadow-inner ${
                  settings.highContrast ? 'bg-yellow-400 text-black' : 'bg-gradient-to-br from-amber-500 to-red-600 text-white'
                }`}>
                  🏠
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    Suat Merkezi
                  </h1>
                  <p className={`text-sm sm:text-base font-semibold ${
                    settings.highContrast ? 'text-yellow-200' : 'text-slate-500'
                  }`}>
                    Kolay ve Huzurlu Dijital Yaşam
                  </p>
                </div>
              </div>
            )}

            {/* If on subpage, show current title */}
            {currentTab !== 'home' && (
              <div className="hidden lg:block ml-4 pl-4 border-l-2 border-slate-300 dark:border-yellow-400">
                <span className="text-xl font-bold">{getPageTitle()}</span>
              </div>
            )}
          </div>

          {/* Center: Clock & Turkish Date */}
          <div className={`text-center py-1 px-4 rounded-xl border ${
            settings.highContrast
              ? 'bg-slate-900 border-yellow-400 text-yellow-300'
              : 'bg-amber-50 border-amber-200 text-amber-950'
          }`}>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-wider font-mono">
              {currentTime || '--:--'}
            </div>
            <div className="text-sm sm:text-base font-bold capitalize">
              {currentDate || 'Yükleniyor...'}
            </div>
          </div>

          {/* Right: Quick Accessibility Controls */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center md:justify-end">
            {/* Read Aloud Button */}
            <button
              id="btn-read-aloud"
              onClick={handleSpeechRead}
              className={`flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-base sm:text-lg border-2 transition-all ${
                settings.highContrast
                  ? 'bg-yellow-300 text-black border-white hover:bg-yellow-200'
                  : 'bg-sky-100 text-sky-900 border-sky-300 hover:bg-sky-200'
              }`}
              title="Bu sayfayı sesli oku"
            >
              <Volume2 className="w-6 h-6" />
              <span className="hidden sm:inline">Sesli Oku</span>
            </button>

            {/* Font Size Quick Switcher */}
            <div className="flex items-center bg-slate-100 rounded-xl p-1 border-2 border-slate-300">
              <button
                id="btn-font-normal"
                onClick={() => {
                  if (settings.soundEffects) sound.playClick();
                  onUpdateSettings({ fontSize: 'normal' });
                }}
                className={`px-2.5 py-1 rounded-lg font-bold text-base ${
                  settings.fontSize === 'normal'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
                title="Normal Yazı Boyutu"
              >
                A
              </button>
              <button
                id="btn-font-large"
                onClick={() => {
                  if (settings.soundEffects) sound.playClick();
                  onUpdateSettings({ fontSize: 'large' });
                }}
                className={`px-2.5 py-1 rounded-lg font-bold text-lg ${
                  settings.fontSize === 'large'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
                title="Büyük Yazı Boyutu"
              >
                A+
              </button>
              <button
                id="btn-font-xlarge"
                onClick={() => {
                  if (settings.soundEffects) sound.playClick();
                  onUpdateSettings({ fontSize: 'xlarge' });
                }}
                className={`px-2.5 py-1 rounded-lg font-black text-xl ${
                  settings.fontSize === 'xlarge'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-200'
                }`}
                title="En Büyük Yazı Boyutu"
              >
                A++
              </button>
            </div>

            {/* Quick 112 Emergency Button */}
            <button
              id="btn-emergency-call"
              onClick={() => {
                if (settings.soundEffects) sound.playClick();
                setShowEmergencyModal(true);
              }}
              className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-base sm:text-lg border-2 border-red-800 shadow-md transition-all active:scale-95"
              title="Acil Durum Yardımı"
            >
              <PhoneCall className="w-5 h-5 animate-pulse" />
              <span>112 ACİL</span>
            </button>

            {/* Quick Help Guide Button */}
            <button
              id="btn-quick-help"
              onClick={() => {
                if (settings.soundEffects) sound.playClick();
                setShowHelpModal(true);
              }}
              className={`p-2 rounded-xl border-2 transition-all ${
                settings.highContrast
                  ? 'border-yellow-400 text-yellow-300'
                  : 'border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
              title="Nasıl Kullanılır? Yardım"
            >
              <HelpCircle className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Emergency Modal */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full border-4 border-red-600 shadow-2xl text-slate-900">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <PhoneCall className="w-12 h-12 animate-bounce" />
              <h2 className="text-3xl font-black">ACİL İLETİŞİM</h2>
            </div>
            <p className="text-xl font-medium mb-6 text-slate-700">
              Herhangi bir sağlık veya acil durumda aşağıdaki numaraları arayabilirsiniz:
            </p>

            <div className="space-y-4 mb-6">
              <a
                href="tel:112"
                className="block w-full text-center py-4 bg-red-600 text-white font-black text-2xl rounded-2xl hover:bg-red-700 border-2 border-red-800 shadow-lg"
              >
                🚨 112 ACİL ÇAĞRI MERKEZİ (Ambulans / Polis / İtfaiye)
              </a>

              {settings.emergencyPhone && (
                <a
                  href={`tel:${settings.emergencyPhone.replace(/\s/g, '')}`}
                  className="block w-full text-center py-4 bg-emerald-600 text-white font-black text-xl rounded-2xl hover:bg-emerald-700 border-2 border-emerald-800 shadow-lg"
                >
                  📞 {settings.emergencyName || 'Kayıtlı Yakınım'}: {settings.emergencyPhone}
                </a>
              )}

              {settings.doctorPhone && (
                <a
                  href={`tel:${settings.doctorPhone.replace(/\s/g, '')}`}
                  className="block w-full text-center py-4 bg-sky-600 text-white font-black text-xl rounded-2xl hover:bg-sky-700 border-2 border-sky-800 shadow-lg"
                >
                  🩺 Aile Hekimi: {settings.doctorPhone}
                </a>
              )}
            </div>

            <button
              onClick={() => {
                if (settings.soundEffects) sound.playClick();
                setShowEmergencyModal(false);
              }}
              className="w-full py-3 bg-slate-200 hover:bg-slate-300 text-slate-900 font-bold text-xl rounded-xl"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full border-4 border-emerald-500 shadow-2xl text-slate-900 max-h-[90vh] overflow-y-auto">
            <h2 className="text-3xl font-extrabold mb-4 text-emerald-800 flex items-center gap-3">
              <Sparkles className="w-8 h-8" />
              Suat Merkezi Kullanım Kılavuzu
            </h2>
            <div className="space-y-4 text-lg text-slate-800">
              <div className="p-3 bg-red-50 rounded-xl border-l-4 border-red-500">
                <strong>📺 SuatiPTV:</strong> Sevdiğiniz televizyon kanallarını ve Kemal Sunal, Münir Özkul gibi Yeşilçam filmlerini izleyebilirsiniz.
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border-l-4 border-amber-500">
                <strong>🎵 SuatMuzik:</strong> Zeki Müren, Barış Manço, Neşet Ertaş türküleri ve Alaturka Radyo dinleyebilirsiniz.
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border-l-4 border-emerald-500">
                <strong>💰 Yeşilçam Muhasebe:</strong> Emekli maaşınızı, elektrik ve su faturalarınızı kolayca takip edip tek tıkla ödendi yapabilirsiniz.
              </div>
              <div className="p-3 bg-sky-50 rounded-xl border-l-4 border-sky-500">
                <strong>🔐 Yeşilçam Şifre Merkezi:</strong> e-Devlet ve banka şifrelerinizi unutmamak için dev yazıyla gözlüksüz okuyabilirsiniz.
              </div>
              <div className="p-3 bg-purple-50 rounded-xl border-l-4 border-purple-500">
                <strong>📂 Dosyalarım:</strong> Aile ve torun fotoğraflarını büyütebilir, sağlık tahlillerinizi görebilirsiniz.
              </div>
              <div className="p-3 bg-slate-100 rounded-xl border-l-4 border-slate-500">
                <strong>⚙️ Ayarlar:</strong> Yazı boyutunu büyütebilir veya yüksek kontrast moduna geçebilirsiniz.
              </div>
            </div>

            <button
              onClick={() => {
                if (settings.soundEffects) sound.playClick();
                setShowHelpModal(false);
              }}
              className="mt-6 w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-2xl rounded-2xl shadow-md"
            >
              Anladım, Kapat
            </button>
          </div>
        </div>
      )}
    </>
  );
};
