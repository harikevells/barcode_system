const { app, BrowserWindow } = require("electron");
const path = require("path");

const START_URL = "http://localhost:3000";
const RETRY_DELAY_MS = 1200;

// Keep Chromium cache under the project folder to avoid Windows profile permission issues.
const userDataPath = path.join(process.cwd(), ".electron-user-data");
app.setPath("userData", userDataPath);
app.commandLine.appendSwitch("disk-cache-dir", path.join(userDataPath, "cache"));
app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  const loadClient = () => {
    if (!win.isDestroyed()) {
      win.loadURL(START_URL).catch(() => {
        // did-fail-load handles retries; ignore load rejection here.
      });
    }
  };

  win.webContents.on("did-fail-load", (_event, errorCode, errorDesc, url, isMainFrame) => {
    if (!isMainFrame) return;
    console.log(`Renderer load failed (${errorCode}: ${errorDesc}). Retrying in ${RETRY_DELAY_MS}ms...`);
    setTimeout(loadClient, RETRY_DELAY_MS);
  });

  loadClient();
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
