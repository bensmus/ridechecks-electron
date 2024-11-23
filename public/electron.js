// Taken from https://mmazzarolo.com/blog/2021-08-12-building-an-electron-application-using-create-react-app/

// Module to control the application lifecycle and the native browser window.
const { app, BrowserWindow, protocol, ipcMain, dialog } = require("electron");
const path = require("path");
const url = require("url");
const fs = require("fs");
 
const userData = app.getPath('userData');
let mainWindow;

// Create the native browser window.
function createWindow() {
   mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    // Set the path of an additional "preload" script that can be used to
    // communicate between node-land and browser-land.
    webPreferences: {
      preload: path.join(__dirname, "preload.js")
    },
  });
 
  // In production, set the initial browser path to the local bundle generated
  // by the Create React App build process.
  // In development, set it to localhost to allow live/hot-reloading.
  const appURL = app.isPackaged
    ? url.format({
        pathname: path.join(__dirname, "index.html"),
        protocol: "file:",
        slashes: true,
      })
    : "http://localhost:3000";
  mainWindow.loadURL(appURL);
 
  // Automatically open Chrome's DevTools in development mode.
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
}
 
// Setup a local proxy to adjust the paths of requested files when loading
// them from the local production bundle (e.g.: local fonts, etc...).
function setupLocalFilesNormalizerProxy() {
  protocol.registerHttpProtocol(
    "file",
    (request, callback) => {
      const url = request.url.substr(8);
      callback({ path: path.normalize(`${__dirname}/${url}`) });
    },
    (error) => {
      if (error) console.error("Failed to register protocol");
    },
  );
}
 
// This method will be called when Electron has finished its initialization and
// is ready to create the browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();
  setupLocalFilesNormalizerProxy();
 
  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
 
// Quit when all windows are closed, except on macOS.
// There, it's common for applications and their menu bar to stay active until
// the user quits  explicitly with Cmd + Q.
app.on("window-all-closed", function () {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
 
// If your app has no need to navigate or only needs to navigate to known pages,
// it is a good idea to limit navigation outright to that known scope,
// disallowing any other kinds of navigation.
const allowedNavigationDestinations = "https://my-electron-app.com";
app.on("web-contents-created", (event, contents) => {
  contents.on("will-navigate", (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
 
    if (!allowedNavigationDestinations.includes(parsedUrl.origin)) {
      event.preventDefault();
    }
  });
});
 
// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

// -- Handle file-related events originating from a renderer process --

ipcMain.handle('appStateStore', async (event, appState) => {
    try {
        fs.writeFileSync(path.join(userData, 'state.json'), appState);
        return { success: true };
    } catch (err) {
        console.error('Error writing file:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('appStateLoad', async (event) => {
    try {
        const filePath = path.join(userData, 'state.json');
        if (!fs.existsSync(filePath)) { // First time app is opened on computer.
            fs.writeFileSync(filePath, 'default state', 'utf-8');
        }
        const appState = fs.readFileSync(filePath, 'utf-8');
        return { success: true, appState };
    } catch (err) {
        console.error('Error reading file:', err);
        return { success: false, error: err.message };
    }
});

ipcMain.handle('ridechecksSave', async (event, ridechecks) => {
    const {cancelled, filePath} = await dialog.showSaveDialog();
    if (!cancelled) {
        fs.writeFileSync(filePath, ridechecks);
    }
})

// Let the App component know that electron is quitting
app.on('before-quit', () => {
    mainWindow.webContents.send('before-quit'); // 'before-quit' is the channel, ipcRenderer can listen 'on' that channel.
})