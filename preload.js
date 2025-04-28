const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  triggerManualInterruption: (type) => ipcRenderer.send('manual-interruption', type)
});
