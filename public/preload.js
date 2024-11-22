// Taken from https://mmazzarolo.com/blog/2021-08-12-building-an-electron-application-using-create-react-app/

// Using older version of electron store that supports CommonJS.
// https://www.npmjs.com/package/electron-store/v/8.1.0

// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
const { contextBridge, ipcRenderer } = require("electron");

// As an example, here we use the exposeInMainWorld API to expose the browsers
// and node versions to the main window.
// They'll be accessible at "window.versions".
process.once("loaded", () => {
    console.log('preload.js loaded')
    contextBridge.exposeInMainWorld('file', {
        // relpath is relative to app.getPath('appData')
        write: (relpath, content) => ipcRenderer.invoke('write', relpath, content),
        read: (relpath) => ipcRenderer.invoke('read', relpath),
    })
});