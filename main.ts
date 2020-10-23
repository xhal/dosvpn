import { app, BrowserWindow, screen, ipcMain } from "electron";
import * as path from "path";
import * as url from "url";
import * as os from "os";
import * as childProcess from "child_process";

require("update-electron-app")();

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

  // win.webContents.openDevTools();
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

try {
  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  // Added 400 ms to fix the black background issue while using transparent window. More detais at https://github.com/electron/electron/issues/15947
  app.on("ready", () => setTimeout(createWindow, 400));

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
    const libPath = path.join(process.cwd(), !serve ? "resources" : "lib");
    const exePath = path.join(
      libPath,
      os.arch() == "x64" ? "sysproxy64.exe" : "sysproxy.exe"
    );
    const args: any[] = ["set", 1, "-", "-", "-"];
    childProcess.execFile(exePath, args);
  });

  // 接收最小化命令
  ipcMain.on("window-min", function () {
    win.minimize();
  });

  // 接收关闭窗口命令
  ipcMain.on("window-close", function () {
    win.close();
  });
} catch (e) {
  // Catch Error
  // throw e;
}
