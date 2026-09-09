import React, { useState } from 'react';
import { AppSettings, FontSizeOption } from '../types';
import {
  Settings,
  Type,
  SunMoon,
  Volume2,
  PhoneCall,
  RotateCcw,
  Check,
  Shield,
  HeartHandshake,
} from 'lucide-react';
import { sound } from '../utils/audio';

interface AyarlarProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onResetData: () => void;
}

export const Ayarlar: React.FC<AyarlarProps> = ({
  settings,
  onUpdateSettings,
  onResetData,
}) => {
  const [emergencyName, setEmergencyName] = useState(settings.emergencyName);
  const [emergencyPhone, setEmergencyPhone] = useState(settings.emergencyPhone);
  const [doctorPhone, setDoctorPhone] = useState(settings.doctorPhone);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveContacts = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      emergencyName: emergencyName.trim(),
      emergencyPhone: emergencyPhone.trim(),
      doctorPhone: doctorPhone.trim(),
    });
    setSavedSuccess(true);
    if (settings.soundEffects) sound.playSuccess();
    if (settings.voiceAssistance) {
      sound.speak('Acil durum numaralarınız başarıyla kaydedildi.');
    }
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleFontSize = (size: FontSizeOption) => {
    if (settings.soundEffects) sound.playClick();
    onUpdateSettings({ fontSize: size });
    if (settings.voiceAssistance) {
      sound.speak(
        size === 'normal'
          ? 'Yazı boyutu normal olarak ayarlandı.'
          : size === 'large'
          ? 'Yazı boyutu büyük olarak ayarlandı.'
          : 'Yazı boyutu en büyük boyuta getirildi.'
      );
    }
  };

  const handleToggleContrast = () => {
    if (settings.soundEffects) sound.playClick();
    const newContrast = !settings.highContrast;
    onUpdateSettings({ highContrast: newContrast });
    if (settings.voiceAssistance) {
      sound.speak(
        newContrast
          ? 'Yüksek kontrast sarı siyah modu açıldı.'
          : 'Normal renk moduna geçildi.'
      );
    }
  };

  const handleToggleSoundEffects = () => {
    const nextVal = !settings.soundEffects;
    onUpdateSettings({ soundEffects: nextVal });
    if (nextVal) sound.playClick();
  };

  const handleToggleVoice = () => {
    if (settings.soundEffects) sound.playClick();
    const nextVal = !settings.voiceAssistance;
    onUpdateSettings({ voiceAssistance: nextVal });
    if (nextVal) {
      sound.speak('Sesli okuma yardımcısı açıldı.');
    } else {
      sound.stopSpeaking();
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6">
      {/* Top Banner */}
      <div
        className={`p-6 sm:p-8 rounded-3xl border-3 mb-6 shadow-md flex flex-col md:flex-row items-center justify-between gap-4 ${
          settings.highContrast
            ? 'bg-black border-yellow-400 text-white'
            : 'bg-slate-100 border-slate-300 text-slate-950'
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-800 text-white rounded-2xl flex items-center justify-center shadow-md">
            <Settings className="w-10 h-10 sm:w-12 sm:h-12" />
          </div>
          <div>
            <span className="px-3 py-1 bg-slate-800 text-white text-sm font-black rounded-lg uppercase">
              ERİŞİLEBİLİRLİK & YARDIM
            </span>
            <h2 className="text-3xl sm:text-4xl font-black mt-1">
              Ayarlar ve Kolaylaştırıcı
            </h2>
            <p className="text-lg sm:text-xl font-bold text-slate-600 dark:text-yellow-200">
              Yazı boyutunu, ekran renklerini ve acil telefonları buradan düzenleyin.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Section 1: Yazı Boyutu */}
        <div
          className={`p-6 sm:p-8 rounded-3xl border-3 shadow-md ${
            settings.highContrast
              ? 'bg-black border-yellow-400 text-white'
              : 'bg-white border-slate-300 text-slate-900'
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            <Type className="w-8 h-8 text-blue-600" />
            <h3 className="text-2xl sm:text-3xl font-black">
              1. Yazı Boyutu Ayarı
            </h3>
          </div>
          <p className="text-lg font-medium text-slate-600 dark:text-slate-300 mb-6">
            Ekrandaki yazıları rahatça okuyabilmek için size en uygun boyutu seçin:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => handleFontSize('normal')}
              className={`p-5 rounded-2xl border-3 font-bold text-left transition-all active:scale-98 ${
                settings.fontSize === 'normal'
                  ? 'bg-blue-600 text-white border-blue-800 shadow-md ring-4 ring-blue-300'
                  : 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <div className="text-2xl font-black mb-1">A (Normal Boyut)</div>
              <div className="text-base opacity-90">Standart okuma boyutu (18px)</div>
            </button>

            <button
              onClick={() => handleFontSize('large')}
              className={`p-5 rounded-2xl border-3 font-bold text-left transition-all active:scale-98 ${
                settings.fontSize === 'large'
                  ? 'bg-blue-600 text-white border-blue-800 shadow-md ring-4 ring-blue-300'
                  : 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <div className="text-3xl font-black mb-1">A+ (Büyük Boyut)</div>
              <div className="text-lg opacity-90">Gözü yormayan geniş yazı (22px)</div>
            </button>

            <button
              onClick={() => handleFontSize('xlarge')}
              className={`p-5 rounded-2xl border-3 font-bold text-left transition-all active:scale-98 ${
                settings.fontSize === 'xlarge'
                  ? 'bg-blue-600 text-white border-blue-800 shadow-md ring-4 ring-blue-300'
                  : 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <div className="text-4xl font-black mb-1">A++ (En Büyük)</div>
              <div className="text-xl opacity-90">Gözlüksüz dev okuma boyutu (26px)</div>
            </button>
          </div>
        </div>

        {/* Section 2: Yüksek Kontrast ve Ekran Renkleri */}
        <div
          className={`p-6 sm:p-8 rounded-3xl border-3 shadow-md ${
            settings.highContrast
              ? 'bg-black border-yellow-400 text-white'
              : 'bg-white border-slate-300 text-slate-900'
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            <SunMoon className="w-8 h-8 text-amber-500" />
            <h3 className="text-2xl sm:text-3xl font-black">
              2. Ekran Renkleri ve Yüksek Kontrast
            </h3>
          </div>
          <p className="text-lg font-medium text-slate-600 dark:text-slate-300 mb-6">
            Az gören veya gözleri çabuk yorulan kullanıcılar için sarı-siyah ultra belirgin renk modu:
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-slate-300 dark:border-yellow-400">
            <div>
              <h4 className="text-2xl font-black">
                Yüksek Kontrast Modu (Sarı & Siyah)
              </h4>
              <p className="text-base text-slate-600 dark:text-yellow-200 mt-1">
                {settings.highContrast
                  ? 'Şu anda AÇIK (Yüksek kontrast devrede)'
                  : 'Şu anda KAPALI (Standart temiz renkler)'}
              </p>
            </div>

            <button
              onClick={handleToggleContrast}
              className={`px-8 py-4 rounded-2xl font-black text-xl shadow-md border-2 active:scale-95 transition-all ${
                settings.highContrast
                  ? 'bg-yellow-400 text-black border-white hover:bg-yellow-300'
                  : 'bg-slate-800 text-white border-slate-900 hover:bg-slate-700'
              }`}
            >
              {settings.highContrast ? 'Normal Moda Dön' : 'Yüksek Kontrastı Aç'}
            </button>
          </div>
        </div>

        {/* Section 3: Ses ve Konuşma */}
        <div
          className={`p-6 sm:p-8 rounded-3xl border-3 shadow-md ${
            settings.highContrast
              ? 'bg-black border-yellow-400 text-white'
              : 'bg-white border-slate-300 text-slate-900'
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            <Volume2 className="w-8 h-8 text-emerald-600" />
            <h3 className="text-2xl sm:text-3xl font-black">
              3. Sesli Yardım ve Dokunma Sesleri
            </h3>
          </div>

          <div className="space-y-4">
            {/* Voice Assistance */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-slate-300">
              <div>
                <h4 className="text-2xl font-black">Türkçe Sesli Okuma Asistanı</h4>
                <p className="text-base text-slate-600 dark:text-slate-300">
                  Düğmelere dokunduğunuzda ve sayfalar açıldığında sesli bilgi verir.
                </p>
              </div>
              <button
                onClick={handleToggleVoice}
                className={`px-8 py-4 rounded-2xl font-black text-xl border-2 active:scale-95 ${
                  settings.voiceAssistance
                    ? 'bg-emerald-600 text-white border-emerald-700'
                    : 'bg-slate-200 text-slate-800 border-slate-300'
                }`}
              >
                {settings.voiceAssistance ? 'AÇIK (Aktif)' : 'KAPALI'}
              </button>
            </div>

            {/* Click Sounds */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-slate-300">
              <div>
                <h4 className="text-2xl font-black">Düğme Tıklama Sesleri</h4>
                <p className="text-base text-slate-600 dark:text-slate-300">
                  Tuşlara bastığınızda tatlı ve net bir klik sesi çıkarır.
                </p>
              </div>
              <button
                onClick={handleToggleSoundEffects}
                className={`px-8 py-4 rounded-2xl font-black text-xl border-2 active:scale-95 ${
                  settings.soundEffects
                    ? 'bg-emerald-600 text-white border-emerald-700'
                    : 'bg-slate-200 text-slate-800 border-slate-300'
                }`}
              >
                {settings.soundEffects ? 'AÇIK' : 'KAPALI'}
              </button>
            </div>
          </div>
        </div>

        {/* Section 4: Acil Durum ve Aile Telefon Numaraları */}
        <div
          className={`p-6 sm:p-8 rounded-3xl border-3 shadow-md ${
            settings.highContrast
              ? 'bg-black border-red-400 text-white'
              : 'bg-white border-slate-300 text-slate-900'
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            <PhoneCall className="w-8 h-8 text-red-600" />
            <h3 className="text-2xl sm:text-3xl font-black">
              4. Acil Durum & Yakınlarım Rehberi
            </h3>
          </div>
          <p className="text-lg font-medium text-slate-600 dark:text-slate-300 mb-6">
            Herhangi bir ihtiyaç anında ana ekrandaki <strong>112 ACİL</strong> düğmesinden hemen aranacak kişi bilgileri:
          </p>

          <form onSubmit={handleSaveContacts} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xl font-bold mb-2">
                  Acil Aranacak Yakınınız (Adı):
                </label>
                <input
                  type="text"
                  required
                  value={emergencyName}
                  onChange={(e) => setEmergencyName(e.target.value)}
                  className="w-full p-4 rounded-xl border-2 border-slate-300 text-xl font-semibold"
                />
              </div>

              <div>
                <label className="block text-xl font-bold mb-2">
                  Yakınınızın Telefon Numarası:
                </label>
                <input
                  type="text"
                  required
                  value={emergencyPhone}
                  onChange={(e) => setEmergencyPhone(e.target.value)}
                  className="w-full p-4 rounded-xl border-2 border-slate-300 text-xl font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xl font-bold mb-2">
                Doktor / Aile Hekimi Telefonu:
              </label>
              <input
                type="text"
                value={doctorPhone}
                onChange={(e) => setDoctorPhone(e.target.value)}
                className="w-full p-4 rounded-xl border-2 border-slate-300 text-xl font-semibold"
              />
            </div>

            <div className="flex items-center justify-between pt-4">
              {savedSuccess ? (
                <div className="flex items-center gap-2 text-emerald-600 font-black text-xl">
                  <Check className="w-7 h-7" />
                  <span>Numaralar Başarıyla Kaydedildi!</span>
                </div>
              ) : (
                <span className="text-base text-slate-500">
                  Değişiklikleri kaydetmek için sağdaki düğmeye basın.
                </span>
              )}

              <button
                type="submit"
                className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-black text-xl rounded-2xl shadow-lg border-2 border-red-800 active:scale-95"
              >
                Numaraları Kaydet
              </button>
            </div>
          </form>
        </div>

        {/* Section 5: Sıfırlama */}
        <div
          className={`p-6 rounded-3xl border-3 ${
            settings.highContrast
              ? 'bg-black border-slate-700 text-white'
              : 'bg-slate-50 border-slate-200 text-slate-800'
          } flex flex-col sm:flex-row items-center justify-between gap-4`}
        >
          <div>
            <h4 className="text-xl font-bold">Örnek Verileri Yeniden Yükle</h4>
            <p className="text-base text-slate-600 dark:text-slate-400">
              Kanalları, şarkıları ve defteri ilk açılış haline döndürür.
            </p>
          </div>
          <button
            onClick={() => {
              if (window.confirm('Tüm örnek kayıtlar sıfırlanıp ilk haline getirilsin mi?')) {
                onResetData();
              }
            }}
            className="flex items-center gap-2 px-6 py-3 bg-slate-300 hover:bg-slate-400 text-slate-900 rounded-xl font-bold text-lg"
          >
            <RotateCcw className="w-5 h-5" />
            <span>İlk Haline Getir</span>
          </button>
        </div>
      </div>
    </div>
  );
};
