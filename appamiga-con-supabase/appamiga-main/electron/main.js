const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

const isDev = !app.isPackaged;
const PORT = 3005;

let mainWindow;
let nextProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    title: 'AppAmiga - Gestión de Donaciones',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    show: false, // Don't show until ready
  });

  const url = `http://localhost:${PORT}`;

  const pollServer = () => {
    const http = require('http');
    const req = http.get(url, (res) => {
      if (res.statusCode === 200 || res.statusCode === 404) {
        mainWindow.loadURL(url);
        mainWindow.show();
      } else {
        setTimeout(pollServer, 300);
      }
    });
    
    req.on('error', () => {
      setTimeout(pollServer, 300);
    });
    
    req.end();
  };

  pollServer();

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url: linkUrl }) => {
    shell.openExternal(linkUrl);
    return { action: 'deny' };
  });

  // Open DevTools in development mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startNextServer() {
  // In production (packaged), start the Next.js server
  const nextBin = path.join(__dirname, '../node_modules/next/dist/bin/next');

  // Load .env.local from extraResources if packaged
  let cwd = path.join(__dirname, '..');
  if (!isDev) {
    // When packaged, the app root is inside resources/app
    // .env.local is copied to resources via extraResources
    const envPath = path.join(process.resourcesPath, '.env.local');
    const fs = require('fs');
    if (fs.existsSync(envPath)) {
      // Read and parse .env.local, inject into environment
      const envContent = fs.readFileSync(envPath, 'utf-8');
      envContent.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIndex = trimmed.indexOf('=');
          if (eqIndex > 0) {
            const key = trimmed.substring(0, eqIndex).trim();
            const value = trimmed.substring(eqIndex + 1).trim();
            process.env[key] = value;
          }
        }
      });
    }
  }

  // Utilizamos process.execPath (el propio binario de Electron) como si fuera Node.js
  // configurando la variable de entorno ELECTRON_RUN_AS_NODE.
  // Esto asegura que funcione en computadoras que no tienen Node.js instalado.
  nextProcess = spawn(process.execPath, [nextBin, 'start', '-p', String(PORT)], {
    cwd,
    env: { ...process.env, NODE_ENV: 'production', ELECTRON_RUN_AS_NODE: '1' },
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  nextProcess.stdout.on('data', (data) => {
    console.log(`NextServer: ${data}`);
  });

  nextProcess.stderr.on('data', (data) => {
    console.error(`NextServer Error: ${data}`);
  });

  nextProcess.on('close', (code) => {
    console.log(`Next.js server exited with code ${code}`);
  });
}

app.on('ready', () => {
  if (!isDev) {
    startNextServer();
  }
  createWindow();
});

app.on('window-all-closed', () => {
  if (nextProcess) {
    nextProcess.kill();
  }
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// Graceful shutdown
app.on('before-quit', () => {
  if (nextProcess) {
    nextProcess.kill();
  }
});
