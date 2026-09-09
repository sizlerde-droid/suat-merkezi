#!/usr/bin/env bash
set -euo pipefail
npm install
npm run build
npx cap sync android
cd android
gradle assembleDebug
echo
echo "APK: android/app/build/outputs/apk/debug/app-debug.apk"
