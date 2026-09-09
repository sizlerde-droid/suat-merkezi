# Suat Merkezi – Paketleme Kılavuzu

Bu paket, mevcut Suat Merkezi React/Vite çekirdeğini korur ve masaüstü + Android paketleme altyapısını hazırlar.

## Android Debug APK
Gerekli ortam: Node 22+, JDK 21, Android SDK, Gradle 8.14.3.

```bash
bash scripts/build-android-debug.sh
```

Çıktı:
`android/app/build/outputs/apk/debug/app-debug.apk`

## Windows / Linux
Electron paketleme:

```bash
bash scripts/build-electron.sh
```

Windows'ta `.exe`, Linux'ta uygun Electron çıktısı oluşturulur.

## ChromeOS Flex
Tarayıcı/PWA sürümü doğrudan kullanılabilir. Linux geliştirme ortamı mevcutsa Electron ve Android derlemeleri de yapılabilir.

## Bulut derleme
`.github/workflows/android.yml` GitHub Actions üzerinden Android Debug APK üretir.
`.github/workflows/desktop.yml` Windows ve Linux Electron paketleri üretir.

> Not: Bu paket içinde `node_modules` bulunmaz. İlk çalıştırmada `npm install` yapılmalıdır.
