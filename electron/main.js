const { app, BrowserWindow } = require("electron");
const path = require("path");
const { fork } = require("child_process");

// Determine the path to the server script.
// In development, it's at ../server/serialServer.js
// In production, it depends on how we package it. We'll include it in the ASAR or outside.
const isDev = !app.isPackaged;
const serverPath = isDev 
  ? path.join(__dirname, "..", "server", "serialServer.js")
  : path.join(process.resourcesPath, "server", "serialServer.js");

let serverProcess = null;

// Keep Chromium cache under the project folder or appData to avoid Windows profile permission issues.
const userDataPath = isDev ? path.join(process.cwd(), ".electron-user-data") : app.getPath("userData");
app.setPath("userData", userDataPath);
app.commandLine.appendSwitch("disk-cache-dir", path.join(userDataPath, "cache"));
app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");

function startServer() {
  console.log("Starting backend server from:", serverPath);
  serverProcess = fork(serverPath, [], {
    env: Object.assign({}, process.env, { PORT: 5001, NODE_ENV: "production" })
  });

  serverProcess.on("error", (err) => {
    console.error("Backend Server Error:", err);
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false, // Don't show until ready to prevent blank white flash
    acceptFirstMouse: true, // Fix: first click triggers button, not just window focus
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Show window only when fully loaded to avoid white flash
  win.once("ready-to-show", () => {
    win.show();
    win.focus();
  });

  // Load the React app.
  // In dev, load localhost. In prod, load the built static file.
  if (isDev) {
    const START_URL = "http://localhost:3000";
    const RETRY_DELAY_MS = 1200;
    const loadClient = () => {
      if (!win.isDestroyed()) {
        win.loadURL(START_URL).catch(() => {});
      }
    };
    win.webContents.on("did-fail-load", (_event, errorCode, errorDesc, url, isMainFrame) => {
      if (!isMainFrame) return;
      setTimeout(loadClient, RETRY_DELAY_MS);
    });
    loadClient();
  } else {
    win.loadFile(path.join(__dirname, "..", "client", "build", "index.html"));
  }
}

app.whenReady().then(() => {
  startServer();
  // Give the server a second to start before loading the UI
  setTimeout(() => {
    createWindow();
  }, 1000);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("before-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
