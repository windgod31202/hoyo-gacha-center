const { ipcMain, clipboard, shell } = require('electron')
const config = require('./config')
const i18n = require('./i18n')
const { sendMsg, langMap } = require('./utils')
const { disableProxy } = require('./module/system-proxy')
const genshin = require('./games/genshin/service')
const starrail = require('./games/starrail/service')
const zzz = require('./games/zzz/service')

const services = { genshin, starrail, zzz }

const normalizeGame = (game) => services[game] ? game : (config.game || 'starrail')

const activateGame = (game) => {
  game = normalizeGame(game)
  config.game = game
  if (!config.currentMap) config.currentMap = { genshin: 0, starrail: 0, zzz: 0 }
  config.current = config.currentMap[game] || 0
  return game
}

const persistCurrentForGame = async (game) => {
  if (!config.currentMap) config.currentMap = { genshin: 0, starrail: 0, zzz: 0 }
  config.currentMap[game] = config.current || 0
  await config.save()
}

const getPayload = (game) => {
  game = activateGame(game)
  const svc = services[game]
  const data = svc.getData()
  return {
    game,
    games: [
      { key: 'genshin', name: '原神', noviceType: '100' },
      { key: 'starrail', name: '星穹鐵道', noviceType: '2' },
      { key: 'zzz', name: '絕區零', noviceType: '1' }
    ],
    dataMap: data.dataMap,
    current: data.current || config.current || 0
  }
}

ipcMain.handle('FETCH_DATA', async (event, param, gameArg) => {
  const game = activateGame(gameArg || config.game)
  const svc = services[game]
  try {
    if (param === 'proxy') {
      await svc.fetchDataByProxy()
    } else {
      await svc.fetchData(param)
    }
    await persistCurrentForGame(game)
    return getPayload(game)
  } catch (e) {
    sendMsg(e, 'ERROR')
    console.error(e)
  }
  return false
})

ipcMain.handle('READ_DATA', async (event, gameArg) => {
  const game = activateGame(gameArg || config.game)
  await services[game].readData()
  await persistCurrentForGame(game)
  return getPayload(game)
})

ipcMain.handle('FORCE_READ_DATA', async (event, gameArg) => {
  const game = activateGame(gameArg || config.game)
  await services[game].readData(true)
  await persistCurrentForGame(game)
  return getPayload(game)
})

ipcMain.handle('CHANGE_GAME', async (event, gameArg) => {
  const game = activateGame(gameArg)
  await services[game].readData()
  await persistCurrentForGame(game)
  return getPayload(game)
})

ipcMain.handle('CHANGE_UID', async (event, uid, gameArg) => {
  const game = activateGame(gameArg || config.game)
  await services[game].changeCurrent(uid)
  await persistCurrentForGame(game)
})

ipcMain.handle('GET_CONFIG', () => config.value())

ipcMain.handle('LANG_MAP', () => langMap)

ipcMain.handle('SAVE_CONFIG', (event, [key, value]) => {
  config[key] = value
  config.save()
})

ipcMain.handle('DISABLE_PROXY', async () => {
  await disableProxy()
})

ipcMain.handle('I18N_DATA', () => i18n.data)

ipcMain.handle('OPEN_CACHE_FOLDER', (event, gameArg) => {
  const game = activateGame(gameArg || config.game)
  const folder = services[game].getCacheFolder?.()
  if (folder) shell.openPath(folder)
})

ipcMain.handle('COPY_URL', async (event, gameArg) => {
  const game = activateGame(gameArg || config.game)
  try {
    const url = await services[game].getUrl()
    if (url) {
      clipboard.writeText(url)
      return true
    }
  } catch (e) {
    sendMsg(e, 'ERROR')
  }
  return false
})

ipcMain.handle('DELETE_DATA', async (event, uid, action, gameArg) => {
  const game = activateGame(gameArg || config.game)
  if (services[game].deleteData) {
    await services[game].deleteData(uid, action)
  }
})

exports.getData = (gameArg) => {
  const game = activateGame(gameArg || config.game)
  return services[game].getData()
}

exports.getGame = () => normalizeGame(config.game)
exports.getServices = () => services
