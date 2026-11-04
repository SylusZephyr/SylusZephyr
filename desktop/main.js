// Revive desktop shell (Windows / macOS / Linux).
// Serves the bundled web app from a private app:// origin so storage and modules behave
// exactly like the web build, and handles revive:// links for sign-in callbacks.
const { app, BrowserWindow, protocol, net, shell, ipcMain, Menu } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

const WEB_ROOT = path.join(__dirname, 'www');
const ORIGIN = 'app://revive';
const DEEP_LINK_SCHEME = 'revive';

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

// Windows passes deep links as command-line arguments; keep one instance and forward them.
if (!app.requestSingleInstanceLock()) { app.quit(); }

if (process.defaultApp) {
  app.setAsDefaultProtocolClient(DEEP_LINK_SCHEME, process.execPath, [path.resolve(process.argv[1])]);
} else {
  app.setAsDefaultProtocolClient(DEEP_LINK_SCHEME);
}

let win = null;
let pendingLink = process.argv.find((a) => a.startsWith(`${DEEP_LINK_SCHEME}://`)) || null;

function sendDeepLink(url) {
  if (!url) return;
  if (win && !win.webContents.isLoading()) win.webContents.send('deep-link', url);
  else pendingLink = url;
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 380,
    minHeight: 640,
    backgroundColor: '#0b0f1a',
    title: 'Revive',
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  win.once('ready-to-show', () => win.show());
  win.webContents.on('did-finish-load', () => { if (pendingLink) { win.webContents.send('deep-link', pendingLink); pendingLink = null; } });

  // Anything that isn't the app itself opens in the user's browser.
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith(ORIGIN)) { e.preventDefault(); shell.openExternal(url); }
  });

  win.loadURL(`${ORIGIN}/index.html`);
}

app.on('second-instance', (_e, argv) => {
  sendDeepLink(argv.find((a) => a.startsWith(`${DEEP_LINK_SCHEME}://`)));
  if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
});
app.on('open-url', (e, url) => { e.preventDefault(); sendDeepLink(url); }); // macOS

ipcMain.handle('open-external', (_e, url) => {
  if (typeof url === 'string' && /^(https:|mailto:|tel:)/.test(url)) return shell.openExternal(url);
  return false;
});

app.whenReady().then(() => {
  protocol.handle('app', (request) => {
    const { pathname } = new URL(request.url);
    const file = path.normalize(path.join(WEB_ROOT, decodeURIComponent(pathname)));
    if (!file.startsWith(WEB_ROOT)) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });
  if (process.platform !== 'darwin') Menu.setApplicationMenu(null);
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
