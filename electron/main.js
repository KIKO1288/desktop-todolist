const { app, BrowserWindow, dialog, ipcMain, Menu, nativeImage, screen, Tray } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const DEFAULT_BOUNDS = { width: 420, height: 640 };
let mainWindow;
let saveBoundsTimer;
let tray;
let isQuitting = false;
let windowMode = 'desktop';
let bridgeQueue = Promise.resolve();
let returnToDesktopTimer;
let interactiveSince = 0;
let showsInTaskbar = false;

app.setName('桌面清单');
app.setAppUserModelId('local.desktop.todolist');
if (process.env.TODOLIST_QA_DIR) {
  app.setPath('userData', process.env.TODOLIST_QA_DIR);
}

function statePath() {
  return path.join(app.getPath('userData'), 'todolist-state.json');
}

function loadState() {
  try {
    const parsed = JSON.parse(fs.readFileSync(statePath(), 'utf8'));
    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      archiveOpen: Boolean(parsed.archiveOpen),
      bounds: parsed.bounds && Number.isFinite(parsed.bounds.x) ? parsed.bounds : null
    };
  } catch {
    if (process.env.TODOLIST_QA === '1') {
      return {
        tasks: [
          { id: 'qa-1', text: '确认首页交互细节', completed: false, createdAt: new Date().toISOString() },
          { id: 'qa-2', text: '整理本周项目资料', completed: false, createdAt: new Date().toISOString() },
          { id: 'qa-3', text: '回复设计评审意见', completed: true, createdAt: new Date().toISOString(), completedAt: new Date().toISOString() }
        ],
        archiveOpen: true,
        bounds: null
      };
    }
    return { tasks: [], archiveOpen: false, bounds: null };
  }
}

function writeState(nextState) {
  const destination = statePath();
  const temporary = `${destination}.tmp`;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(temporary, JSON.stringify(nextState, null, 2), 'utf8');
  fs.renameSync(temporary, destination);
}

function isVisibleBounds(bounds) {
  if (!bounds || !Number.isFinite(bounds.x) || !Number.isFinite(bounds.y)) return false;
  return screen.getAllDisplays().some(({ workArea }) => {
    const horizontal = bounds.x < workArea.x + workArea.width - 80 && bounds.x + bounds.width > workArea.x + 80;
    const vertical = bounds.y < workArea.y + workArea.height - 80 && bounds.y + bounds.height > workArea.y + 80;
    return horizontal && vertical;
  });
}

function nativeHandleAsString(win) {
  const buffer = win.getNativeWindowHandle();
  return process.arch === 'x64' || process.arch === 'arm64'
    ? buffer.readBigUInt64LE(0).toString()
    : buffer.readUInt32LE(0).toString();
}

function desktopScriptPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'scripts', 'attach-desktop.ps1')
    : path.join(__dirname, '..', 'scripts', 'attach-desktop.ps1');
}

function appIconPath() {
  return path.join(__dirname, '..', 'assets', 'app-icon.png');
}

function runDesktopBridge(win, mode) {
  if (!win || win.isDestroyed() || process.platform !== 'win32') {
    return Promise.resolve({ ok: false, message: '仅支持 Windows 桌面窗口模式' });
  }

  return new Promise((resolve) => {
    const expectedMarker = mode === 'Detach' ? 'DETACHED' : 'ATTACHED';
    const child = spawn('powershell.exe', [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      desktopScriptPath(),
      '-Handle',
      nativeHandleAsString(win),
      '-Mode',
      mode
    ], { windowsHide: true });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', () => resolve({ ok: false, message: '无法调用窗口模式程序' }));
    child.on('close', (code) => {
      if (code === 0 && stdout.includes(expectedMarker)) {
        console.info(`[window-mode] ${mode.toLowerCase()}`);
        resolve({
          ok: true,
          message: mode === 'Detach' ? '编辑模式：可输入' : '已贴在桌面层'
        });
      } else {
        console.error(`[window-mode] ${mode.toLowerCase()} failed:`, stderr.trim() || `exit ${code}`);
        resolve({ ok: false, message: stderr.trim() || '窗口模式切换失败' });
      }
    });
  });
}

function queueWindowTransition(task) {
  const pending = bridgeQueue.then(task, task);
  bridgeQueue = pending.catch(() => {});
  return pending;
}

function sendDesktopStatus(status) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('desktop:status', status);
  }
}

function clearDesktopReturnTimer() {
  clearTimeout(returnToDesktopTimer);
  returnToDesktopTimer = undefined;
}

async function showOnDesktop() {
  return queueWindowTransition(async () => {
    if (!mainWindow || mainWindow.isDestroyed()) return { ok: false, message: '便签窗口不可用' };
    clearDesktopReturnTimer();
    const wasVisible = mainWindow.isVisible();
    const result = await runDesktopBridge(mainWindow, 'Attach');
    if (result.ok) {
      windowMode = 'desktop';
      mainWindow.setSkipTaskbar(true);
      showsInTaskbar = false;
      // Reparent a visible interactive window in place. Hiding it during the
      // bridge call and showing it again produced a noticeable flash whenever
      // focus moved to another application. Startup and tray restore still need
      // an explicit reveal because the window begins hidden in those paths.
      if (!wasVisible) mainWindow.showInactive();
    }
    sendDesktopStatus(result);
    refreshTrayMenu();
    return result;
  });
}

async function showInteractive({ focusInput = false } = {}) {
  return queueWindowTransition(async () => {
    if (!mainWindow || mainWindow.isDestroyed()) return { ok: false, message: '便签窗口不可用' };
    clearDesktopReturnTimer();

    // The renderer asks for focus when the add form receives a pointer event.
    // Once the window is already interactive, hiding/showing it again causes a
    // visible flash that looks like a reload and can interrupt the click.
    if (windowMode === 'interactive' && mainWindow.isVisible()) {
      mainWindow.setFocusable(true);
      mainWindow.focus();
      mainWindow.webContents.focus();
      if (focusInput) mainWindow.webContents.send('window:focus-input');
      sendDesktopStatus({ ok: true, message: '编辑模式：可输入' });
      refreshTrayMenu();
      return { ok: true, message: '编辑模式：可输入' };
    }

    mainWindow.hide();

    let result = { ok: true, message: '编辑模式：可输入' };
    if (windowMode === 'desktop') {
      result = await runDesktopBridge(mainWindow, 'Detach');
    }
    if (!result.ok) {
      sendDesktopStatus(result);
      mainWindow.showInactive();
      return result;
    }

    windowMode = 'interactive';
    interactiveSince = Date.now();
    mainWindow.setFocusable(true);
    mainWindow.setSkipTaskbar(false);
    showsInTaskbar = true;
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.focus();
    if (focusInput) mainWindow.webContents.send('window:focus-input');
    sendDesktopStatus({ ok: true, message: '编辑模式：可输入' });
    refreshTrayMenu();
    return { ok: true, message: '编辑模式：可输入' };
  });
}

function hideToTray() {
  clearDesktopReturnTimer();
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  mainWindow.hide();
  mainWindow.setSkipTaskbar(true);
  showsInTaskbar = false;
  refreshTrayMenu();
  return true;
}

function scheduleDesktopReturn() {
  clearDesktopReturnTimer();
  const elapsed = Date.now() - interactiveSince;
  const delay = Math.max(350, 700 - elapsed);
  returnToDesktopTimer = setTimeout(() => {
    if (
      !isQuitting &&
      windowMode === 'interactive' &&
      mainWindow &&
      !mainWindow.isDestroyed() &&
      mainWindow.isVisible() &&
      !mainWindow.isFocused()
    ) {
      void showOnDesktop();
    }
  }, delay);
}

function refreshTrayMenu() {
  if (!tray || tray.isDestroyed()) return;
  const visible = Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible());
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: '打开并输入',
      click: () => { void showInteractive({ focusInput: true }); }
    },
    {
      label: '贴回桌面',
      enabled: windowMode !== 'desktop' || !visible,
      click: () => { void showOnDesktop(); }
    },
    {
      label: '隐藏便签',
      enabled: visible,
      click: () => { hideToTray(); }
    },
    { type: 'separator' },
    {
      label: '退出桌面清单',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]));
}

function createTray() {
  const icon = nativeImage.createFromPath(appIconPath());
  tray = new Tray(icon.resize({ width: 20, height: 20 }));
  tray.setToolTip('桌面清单');
  if (process.platform === 'win32') tray.setIgnoreDoubleClickEvents(true);
  tray.on('click', () => {
    const visible = Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible());
    if (visible && windowMode === 'interactive') {
      hideToTray();
    } else {
      void showInteractive({ focusInput: true });
    }
  });
  refreshTrayMenu();
}

async function runQACapture(win) {
  if (process.env.TODOLIST_QA !== '1') return;

  if (process.env.TODOLIST_QA_CLOSE_TEST === '1') {
    await new Promise((resolve) => setTimeout(resolve, 250));
    await win.webContents.executeJavaScript(`
      window.desktopAPI.close({
        tasks: [{
          id: 'immediate-close',
          text: '立即关闭也要保存',
          completed: true,
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString()
        }],
        archiveOpen: true
      })
    `);
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (process.env.TODOLIST_QA_OUTPUT) {
      fs.mkdirSync(process.env.TODOLIST_QA_OUTPUT, { recursive: true });
      fs.writeFileSync(
        path.join(process.env.TODOLIST_QA_OUTPUT, 'close-lifecycle.json'),
        JSON.stringify({
          windowHidden: !win.isVisible(),
          rendererAlive: !win.webContents.isDestroyed(),
          trayAvailable: Boolean(tray && !tray.isDestroyed())
        }, null, 2)
      );
    }
    isQuitting = true;
    app.quit();
    return;
  }

  if (!process.env.TODOLIST_QA_OUTPUT) return;
  const output = process.env.TODOLIST_QA_OUTPUT;
  fs.mkdirSync(output, { recursive: true });
  await new Promise((resolve) => setTimeout(resolve, 450));

  const interaction = await win.webContents.executeJavaScript(`
    (() => {
      const input = document.querySelector('#task-input');
      input.value = '准备明日计划';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      document.querySelector('#add-form').requestSubmit();
      const rows = [...document.querySelectorAll('#active-list .task-row')];
      rows[0]?.querySelector('.task-check')?.click();
      document.querySelector('#archive-toggle').click();
      document.querySelector('#archive-toggle').click();
      return {
        title: document.querySelector('#app-title')?.textContent,
        activeCount: document.querySelectorAll('#active-list .task-row').length,
        completedCount: Number(document.querySelector('#completed-count')?.textContent),
        progress: document.querySelector('#progress-fraction')?.textContent,
        emptyHidden: document.querySelector('#empty-state')?.hidden,
        archiveExpanded: document.querySelector('#archive-toggle')?.getAttribute('aria-expanded')
      };
    })()
  `);

  await new Promise((resolve) => setTimeout(resolve, 250));
  fs.writeFileSync(path.join(output, 'desktop-420x640.png'), (await win.webContents.capturePage()).toPNG());
  win.setSize(340, 520);
  await new Promise((resolve) => setTimeout(resolve, 250));
  fs.writeFileSync(path.join(output, 'compact-340x520.png'), (await win.webContents.capturePage()).toPNG());
  await win.webContents.executeJavaScript(`
    (() => {
      const status = document.querySelector('#layer-status');
      status.classList.add('is-error');
      status.setAttribute('aria-label', '桌面挂载失败，可单击重试');
      status.title = '桌面挂载失败，可单击重试';
    })()
  `);
  fs.writeFileSync(path.join(output, 'attachment-error-340x520.png'), (await win.webContents.capturePage()).toPNG());
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(interaction, null, 2));
  app.quit();
}

function persistBounds() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  clearTimeout(saveBoundsTimer);
  saveBoundsTimer = setTimeout(() => {
    const current = loadState();
    current.bounds = mainWindow.getBounds();
    writeState(current);
  }, 180);
}

function createWindow() {
  const saved = loadState();
  const bounds = isVisibleBounds(saved.bounds) ? saved.bounds : DEFAULT_BOUNDS;

  mainWindow = new BrowserWindow({
    ...bounds,
    width: bounds.width || DEFAULT_BOUNDS.width,
    height: bounds.height || DEFAULT_BOUNDS.height,
    minWidth: 340,
    minHeight: 480,
    maxWidth: 720,
    maxHeight: 960,
    frame: false,
    transparent: false,
    backgroundColor: '#315C51',
    icon: appIconPath(),
    resizable: true,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    focusable: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile(path.join(__dirname, '..', 'src', 'index.html'));

  mainWindow.once('ready-to-show', async () => {
    const result = await showOnDesktop();
    if (!result.ok) {
      dialog.showErrorBox('无法贴到桌面', 'Windows 桌面层挂载失败。请重新打开桌面清单；如果问题持续，请重启 Windows 资源管理器。');
      isQuitting = true;
      app.quit();
      return;
    }
    await runQACapture(mainWindow);
  });

  mainWindow.on('move', persistBounds);
  mainWindow.on('resize', persistBounds);
  mainWindow.on('focus', () => {
    clearDesktopReturnTimer();
    refreshTrayMenu();
  });
  mainWindow.on('blur', scheduleDesktopReturn);
  mainWindow.on('close', (event) => {
    if (isQuitting) return;
    event.preventDefault();
    hideToTray();
  });
  mainWindow.on('closed', () => { mainWindow = null; });
}

const singleInstance = app.requestSingleInstanceLock();
if (!singleInstance) {
  app.quit();
} else {
  app.on('second-instance', () => {
    void showInteractive({ focusInput: true });
  });

  app.whenReady().then(() => {
    ipcMain.handle('state:load', () => loadState());
    ipcMain.handle('state:save', (_event, data) => {
      const current = loadState();
      writeState({
        ...current,
        tasks: Array.isArray(data.tasks) ? data.tasks : [],
        archiveOpen: Boolean(data.archiveOpen)
      });
      return true;
    });
    ipcMain.handle('desktop:attach', () => showOnDesktop());
    ipcMain.handle('window:focus', () => showInteractive({ focusInput: true }));
    ipcMain.handle('lifecycle:status', () => ({
      mode: windowMode,
      visible: Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible()),
      focused: Boolean(mainWindow && !mainWindow.isDestroyed() && mainWindow.isFocused()),
      showsInTaskbar,
      trayAvailable: Boolean(tray && !tray.isDestroyed())
    }));
    ipcMain.handle('window:close', (_event, data) => {
      const current = loadState();
      writeState({
        ...current,
        tasks: Array.isArray(data?.tasks) ? data.tasks : current.tasks,
        archiveOpen: typeof data?.archiveOpen === 'boolean' ? data.archiveOpen : current.archiveOpen,
        bounds: mainWindow && !mainWindow.isDestroyed() ? mainWindow.getBounds() : current.bounds
      });
      setImmediate(() => hideToTray());
      return true;
    });

    createTray();
    createWindow();
  });
}

app.on('before-quit', () => {
  isQuitting = true;
  clearDesktopReturnTimer();
});

app.on('activate', () => {
  if (!mainWindow) {
    createWindow();
  } else {
    void showInteractive({ focusInput: true });
  }
});

app.on('window-all-closed', () => {});

