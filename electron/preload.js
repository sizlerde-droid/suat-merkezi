// electron/preload.js
// Güvenli Preload Scripti (Context Isolation & Sandbox Uyumlu)

import { contextBridge, ipcRenderer } from 'electron';

// Renderer dünyasına yalnızca güvenli ve sınırlı Suat Merkezi API'sini aç
contextBridge.exposeInMainWorld('suatDesktop', {
  isElectron: true,
  platform: process.platform,
  
  // Pencere Kontrolleri
  toggleFullscreen: () => ipcRenderer.invoke('desktop:toggle-fullscreen'),
  isFullscreen: () => ipcRenderer.invoke('desktop:is-fullscreen'),
  minimize: () => ipcRenderer.invoke('desktop:minimize'),
  close: () => ipcRenderer.invoke('desktop:close'),

  // Dış Bağlantı Güvenli Açma
  openExternal: (url) => ipcRenderer.invoke('desktop:open-external', url),
  
  // Sistem Bilgisi
  getVersion: () => ipcRenderer.invoke('desktop:get-version')
});
