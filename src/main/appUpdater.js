const { ipcMain, app } = require('electron')
const { autoUpdater } = require('electron-updater')
const { version } = require('../../package.json')

let mainWindow = null
let registered = false

let updateInfo = null
let hasUpdate = false
let updateDownloaded = false

autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = false
autoUpdater.allowPrerelease = false
autoUpdater.allowDowngrade = false

function sendUpdateStatus(status, message, extra = {}) {
  if (!mainWindow || mainWindow.isDestroyed()) return

  mainWindow.webContents.send('APP_AUTO_UPDATE_STATUS', {
    status,
    message,
    currentVersion: `v${version}`,
    updateInfo,
    hasUpdate,
    updateDownloaded,
    ...extra,
    time: Date.now()
  })
}

function resetUpdateState() {
  updateInfo = null
  hasUpdate = false
  updateDownloaded = false
}

function registerAppUpdater(win) {
  mainWindow = win

  if (registered) return
  registered = true

  autoUpdater.on('checking-for-update', () => {
    sendUpdateStatus('checking', '正在檢查更新...')
  })

  autoUpdater.on('update-available', info => {
    updateInfo = info
    hasUpdate = true
    updateDownloaded = false

    sendUpdateStatus('available', `發現新版本：v${info.version}`, {
      latestVersion: `v${info.version}`,
      info
    })
  })

  autoUpdater.on('update-not-available', info => {
    updateInfo = null
    hasUpdate = false
    updateDownloaded = false

    sendUpdateStatus('not-available', '目前已是最新版本', {
      latestVersion: `v${version}`,
      info
    })
  })

  autoUpdater.on('download-progress', progress => {
    sendUpdateStatus(
      'downloading',
      `正在下載更新：${Math.round(progress.percent || 0)}%`,
      {
        progress,
        percent: Math.round(progress.percent || 0)
      }
    )
  })

  autoUpdater.on('update-downloaded', info => {
    updateInfo = info || updateInfo
    hasUpdate = true
    updateDownloaded = true

    sendUpdateStatus('downloaded', '更新已下載完成，可以重新啟動並安裝', {
      latestVersion: updateInfo?.version ? `v${updateInfo.version}` : '',
      info: updateInfo
    })
  })

  autoUpdater.on('error', error => {
    sendUpdateStatus('error', error.message || String(error), {
      error: error.message || String(error)
    })
  })
}

ipcMain.handle('APP_AUTO_UPDATE_CHECK', async () => {
  if (!app.isPackaged) {
    sendUpdateStatus(
      'dev-mode',
      '開發模式無法測試完整自動更新，請使用打包後的安裝版測試'
    )

    return {
      devMode: true,
      currentVersion: `v${version}`,
      message: '開發模式無法測試完整自動更新'
    }
  }

  resetUpdateState()

  const result = await autoUpdater.checkForUpdates()

  return {
    currentVersion: `v${version}`,
    latestVersion: result?.updateInfo?.version
      ? `v${result.updateInfo.version}`
      : null,
    hasUpdate,
    updateDownloaded,
    updateInfo: result?.updateInfo || null
  }
})

ipcMain.handle('APP_AUTO_UPDATE_DOWNLOAD', async () => {
  if (!app.isPackaged) {
    throw new Error('開發模式無法下載自動更新，請使用打包後的安裝版測試')
  }

  if (!hasUpdate || !updateInfo) {
    throw new Error('尚未偵測到可下載的新版本，請先檢查更新')
  }

  if (updateDownloaded) {
    return {
      alreadyDownloaded: true,
      updateInfo
    }
  }

  await autoUpdater.downloadUpdate()

  return {
    downloading: true,
    updateInfo
  }
})

ipcMain.handle('APP_AUTO_UPDATE_INSTALL', async () => {
  if (!updateDownloaded) {
    throw new Error('更新尚未下載完成')
  }

  autoUpdater.quitAndInstall(false, true)

  return true
})

ipcMain.handle('APP_AUTO_UPDATE_CHECK_AND_DOWNLOAD', async () => {
  if (!app.isPackaged) {
    sendUpdateStatus(
      'dev-mode',
      '開發模式無法測試完整自動更新，請使用打包後的安裝版測試'
    )

    return {
      devMode: true,
      available: false,
      currentVersion: `v${version}`
    }
  }

  resetUpdateState()

  const result = await autoUpdater.checkForUpdates()

  if (!hasUpdate || !updateInfo) {
    return {
      available: false,
      currentVersion: `v${version}`,
      latestVersion: result?.updateInfo?.version
        ? `v${result.updateInfo.version}`
        : null
    }
  }

  await autoUpdater.downloadUpdate()

  return {
    available: true,
    downloading: true,
    currentVersion: `v${version}`,
    latestVersion: `v${updateInfo.version}`,
    updateInfo
  }
})

module.exports = {
  registerAppUpdater
}