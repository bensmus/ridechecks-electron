// Taken from https://mmazzarolo.com/blog/2021-08-12-building-an-electron-application-using-create-react-app/

// Using older version of electron store that supports CommonJS.
// https://www.npmjs.com/package/electron-store/v/8.1.0

// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const { contextBridge, ipcRenderer } = require("electron");

process.once("loaded", () => {
    console.log('preload.js loaded')
    contextBridge.exposeInMainWorld('appState', { // IO with userData file.
        store: (state) => ipcRenderer.invoke('appStateStore', state),
        load: (defaultState) => ipcRenderer.invoke('appStateLoad', defaultState),
    });
    contextBridge.exposeInMainWorld('ridechecksSave', { // Opens OS save dialog.
        ridechecksSave: (ridechecks) => ipcRenderer.invoke('ridechecksSave', ridechecks)
    });
    contextBridge.exposeInMainWorld('ridecheckGenerate', { // Spawns Python process to generate one ridecheck.
        ridecheckGenerate: (problemData) => ipcRenderer.invoke('ridecheckGenerate', problemData)
    });
});