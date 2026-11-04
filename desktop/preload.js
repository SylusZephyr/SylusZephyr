// Minimal, safe bridge between the desktop shell and the web app.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('reviveDesktop', {
  platform: process.platform,
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  onDeepLink: (callback) => ipcRenderer.on('deep-link', (_event, url) => callback(url)),
});
