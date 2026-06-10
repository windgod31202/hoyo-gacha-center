const { ipcMain, dialog, app, shell } = require('electron')
const fs = require('fs-extra')
const path = require('path')
const config = require('../config')
const { sendMsg } = require('../utils')
const { getServices } = require('../getData')
const { exportAllGamesToUigfV42, importAccountToNativeData, parseUigfV42 } = require('./nativeAdapter')
const { updateDictIfNeeded, getDictStatus, getDictRoot } = require('./dictStore')
const { GAME_DISPLAY_NAMES } = require('./constants')

function getTimeString() {
  return new Date().toLocaleString('sv').replace(/[- :]/g, '').slice(0, 14)
}

async function ensureServicesLoaded(services) {
  for (const service of Object.values(services)) {
    if (service?.readData) await service.readData(true)
  }
}

async function exportUigfV42() {
  const services = getServices()
  await ensureServicesLoaded(services)
  const data = exportAllGamesToUigfV42(services, config)
  const defaultPath = path.join(app.getPath('downloads'), `UIGF_v4.2_${getTimeString()}.json`)
  const filePath = dialog.showSaveDialogSync({
    defaultPath,
    filters: [{ name: 'UIGF JSON', extensions: ['json'] }]
  })
  if (!filePath) return { canceled: true }
  await fs.outputJson(filePath, data, { spaces: 2 })
  return {
    canceled: false,
    filePath,
    version: data.info.version,
    counts: {
      hk4e: data.hk4e?.reduce((sum, account) => sum + account.list.length, 0) || 0,
      hkrpg: data.hkrpg?.reduce((sum, account) => sum + account.list.length, 0) || 0,
      nap: data.nap?.reduce((sum, account) => sum + account.list.length, 0) || 0
    }
  }
}

async function importUigfV42() {
  const filePaths = dialog.showOpenDialogSync({
    properties: ['openFile'],
    filters: [{ name: 'UIGF JSON', extensions: ['json'] }]
  })
  if (!filePaths || !filePaths.length) return { canceled: true }

  const jsonData = await fs.readJson(filePaths[0])
  const { version, sections } = parseUigfV42(jsonData)
  const services = getServices()
  await ensureServicesLoaded(services)

  const summary = {
    canceled: false,
    version,
    importedAccounts: 0,
    importedRecords: 0,
    unsupported: []
  }

  for (const section of sections) {
    if (section.unsupported) {
      summary.unsupported.push(GAME_DISPLAY_NAMES[section.game] || section.game)
      continue
    }
    const service = services[section.game]
    if (!service) continue
    const { dataMap } = service.getData()
    for (const account of section.accounts || []) {
      const existing = dataMap.get(String(account.uid))
      const nativeData = importAccountToNativeData(account, section.game, existing)
      dataMap.set(String(account.uid), nativeData)
      if (service.changeCurrent) await service.changeCurrent(String(account.uid))
      if (service.saveData) await service.saveData(nativeData)
      summary.importedAccounts += 1
      summary.importedRecords += (account.list || []).length
    }
  }

  await config.save()
  return summary
}

ipcMain.handle('UIGF_V42_EXPORT', async () => {
  try {
    return await exportUigfV42()
  } catch (e) {
    sendMsg(e, 'ERROR')
    throw e
  }
})

ipcMain.handle('UIGF_V42_IMPORT', async () => {
  try {
    return await importUigfV42()
  } catch (e) {
    sendMsg(e, 'ERROR')
    throw e
  }
})

ipcMain.handle('UIGF_V42_UPDATE_DICT', async (event, payload = {}) => {
  const lang = payload.lang || config.lang
  const games = payload.games || ['genshin', 'starrail']
  const result = []
  for (const game of games) {
    result.push(await updateDictIfNeeded(game, lang))
  }
  return result
})

ipcMain.handle('UIGF_V42_DICT_STATUS', async (event, payload = {}) => {
  const lang = payload.lang || config.lang
  return ['genshin', 'starrail', 'zzz'].map(game => getDictStatus(game, lang))
})

ipcMain.handle('UIGF_V42_OPEN_DICT_FOLDER', async () => {
  await fs.ensureDir(getDictRoot())
  shell.openPath(getDictRoot())
})

module.exports = {
  exportUigfV42,
  importUigfV42
}
