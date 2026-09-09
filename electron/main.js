// electron/main.js
// Suat Merkezi - Masaüstü Platform Giriş Noktası (Windows, Linux, ChromeOS Flex)

import { app, BrowserWindow, shell, ipcMain, Menu } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Medya oynatma izinleri (Canlı TV, Radyo ve Yeşilçam Müzik için)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

// Tekil çalıştırma kilidi (Aynı anda birden fazla pencere açılmasını engeller)
const singleInstanceLock = app.requestSingleInstanceLock();
let mainWindow = null;

if (!singleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(createWindow);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    title: 'Suat Merkezi',
    backgroundColor: '#09090b', // Koyu tema arka plan uyumu
    autoHideMenuBar: true,      // Sade TV ve dokunmatik dostu görünüm
    show: false,                // Hazır olunca göster (beyaz ekran parlamasını önler)
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,  // Güvenlik: renderer dünyası izole
      nodeIntegration: false,  // Güvenlik: doğrudan Node.js erişimi kapalı
      sandbox: true,           // Güvenlik: Chromium sandbox aktif
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  // Pencere hazır olunca pürüzsüzce göster
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Geliştirme veya Prodüksiyon URL belirleme
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  const distHtmlPath = path.join(__dirname, '../dist/index.html');

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else if (fs.existsSync(distHtmlPath)) {
    mainWindow.loadFile(distHtmlPath);
  } else {
    // Geliştirme ortamında dist henüz derlenmemişse yerel porta bağlan
    mainWindow.loadURL('http://localhost:3000');
  }

  // Dış bağlantıların (Haberler, web siteleri) sistem tarayıcısında güvenle açılması
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Uygulama içi harici navigasyonları engelle (Suat Merkezi içinde tut)
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const isLocal =
      navigationUrl.startsWith('file://') ||
      navigationUrl.startsWith('http://localhost') ||
      navigationUrl.startsWith('http://127.0.0.1');

    if (!isLocal) {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });

  // Menü ve Kısayollar (F11 ile Tam Ekran geçişi)
  setupApplicationMenu();
}

function setupApplicationMenu() {
  const template = [
    {
      label: 'Görünüm',
      submenu: [
        {
          label: 'Tam Ekran (Aç/Kapat)',
          accelerator: 'F11',
          click: () => {
            if (mainWindow) {
              mainWindow.setFullScreen(!mainWindow.isFullScreen());
            }
          },
        },
        {
          label: 'Yenile',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) mainWindow.reload();
          },
        },
        { type: 'separator' },
        {
          label: 'Çıkış',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Kanalları (Güvenli Renderer Köprüsü)
ipcMain.handle('desktop:toggle-fullscreen', () => {
  if (mainWindow) {
    const nextState = !mainWindow.isFullScreen();
    mainWindow.setFullScreen(nextState);
    return nextState;
  }
  return false;
});

ipcMain.handle('desktop:is-fullscreen', () => {
  return mainWindow ? mainWindow.isFullScreen() : false;
});

ipcMain.handle('desktop:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('desktop:close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('desktop:open-external', async (_, url) => {
  if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});

ipcMain.handle('desktop:get-version', () => {
  return app.getVersion();
});

// Platform Kapanma Davranışları
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
