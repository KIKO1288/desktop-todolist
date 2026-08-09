const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  load: () => ipcRenderer.invoke('state:load'),
  save: (data) => ipcRenderer.invoke('state:save', data),
  close: (data) => ipcRenderer.invoke('window:close', data),
  focus: () => ipcRenderer.invoke('window:focus'),
  reattach: () => ipcRenderer.invoke('desktop:attach'),
  lifecycleStatus: () => ipcRenderer.invoke('lifecycle:status'),
  onFocusInput: (callback) => {
    ipcRenderer.on('window:focus-input', () => callback());
  },
  onDesktopStatus: (callback) => {
    ipcRenderer.on('desktop:status', (_event, status) => callback(status));
  }
});
