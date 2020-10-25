import { app, BrowserWindow, screen, ipcMain } from "electron";
import * as path from "path";
import * as url from "url";
import * as os from "os";
import * as childProcess from "child_process";
const log = require("electron-log");
const { autoUpdater } = require("electron-updater");
log.transports.file.level = "info";
// autoUpdater.requestHeaders = { "PRIVATE-TOKEN": "Personal access Token" };
autoUpdater.logger = log;
autoUpdater.autoDownload = false;
let win: BrowserWindow = null;
const args = process.argv.slice(1),
  serve = args.some((val) => val === "--serve");

function createWindow(): BrowserWindow {
  // 全屏
  // size.width
  // size.height
  // const size = screen.getPrimaryDisplay().workAreaSize;

  // Create the browser window.
  win = new BrowserWindow({
    width: 700,
    height: 500,
    resizable: false,
    fullscreenable: false,
    icon: "./src/assets/icons/favicon.ico",
    backgroundColor: "#231f20",
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      allowRunningInsecureContent: serve ? true : false,
      contextIsolation: false, // false if you want to run 2e2 test with Spectron
      enableRemoteModule: true, // true if you want to run 2e2 test  with Spectron or use remote module in renderer context (ie. Angular)
    },
  });
  updaterHandler();
  win.webContents.openDevTools();
  if (serve) {
    win.webContents.openDevTools();

    require("electron-reload")(__dirname, {
      electron: require(`${__dirname}/node_modules/electron`),
    });
    win.loadURL("http://localhost:4200");
  } else {
    win.loadURL(
      url.format({
        pathname: path.join(__dirname, "dist/index.html"),
        protocol: "file:",
        slashes: true,
      })
    );
  }

  // Emitted when the window is closed.
  win.on("closed", () => {
    // Dereference the window object, usually you would store window
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null;
  });

  return win;
}

function updaterHandler() {
  autoUpdater.on("checking-for-update", function (e) {
    sendStatusToWindow("checking-for-update", "正在检查新版本...");
  });

  autoUpdater.on("update-available", function (info) {
    sendStatusToWindow(
      "update-available",
      `发现新版本 v ${info.version}`,
      info
    );
  });

  autoUpdater.on("update-not-available", function (info) {
    sendStatusToWindow("update-not-available", "当前已是最新版", info);
  });

  autoUpdater.on("error", function (err) {
    sendStatusToWindow("error", "检查更新失败");
  });

  autoUpdater.on("download-progress", function (progressObj) {
    let log_message = "Download speed: " + progressObj.bytesPerSecond;
    log_message =
      log_message + " - Downloaded " + parseInt(progressObj.percent) + "%";
    log_message =
      log_message +
      " (" +
      progressObj.transferred +
      "/" +
      progressObj.total +
      ")";
    sendStatusToWindow("download-progress", log_message, progressObj);
  });

  autoUpdater.on("update-downloaded", function (info) {
    sendStatusToWindow("update-downloaded", "新版本准备就绪", info);
  });
}

function sendStatusToWindow(status, message, data?) {
  win.webContents.send("updater-handler", { status, message, data });
}

try {
  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  // Added 400 ms to fix the black background issue while using transparent window. More detais at https://github.com/electron/electron/issues/15947
  app.on("ready", () => {
    setTimeout(createWindow, 400);
  });

  // Quit when all windows are closed.
  app.on("window-all-closed", () => {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
      createWindow();
    }
  });

  app.on("will-quit", () => {
    const exePath = path.join(
      process.cwd(),
      "resources",
      os.arch() == "x64" ? "sysproxy64.exe" : "sysproxy.exe"
    );
    const args: any[] = ["set", 1, "-", "-", "-"];
    childProcess.execFile(exePath, args);
  });

  // 接收最小化指令
  ipcMain.on("window-min", function () {
    win.minimize();
  });

  // 接收关闭窗口指令
  ipcMain.on("window-close", function () {
    win.close();
  });

  // 接收检查更新指令
  ipcMain.on("check-update", function () {
    autoUpdater.checkForUpdates();
  });

  // 开始下载
  ipcMain.on("updating", function () {
    autoUpdater.downloadUpdate();
  });

  // 重启更新
  ipcMain.on("quit-install", function () {
    setTimeout(function () {
      autoUpdater.quitAndInstall();
    }, 1000);
  });
} catch (e) {
  // Catch Error
  // throw e;
}
