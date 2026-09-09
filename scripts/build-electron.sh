#!/usr/bin/env bash
set -euo pipefail
npm install
npm run build
npx electron-builder --win --linux
