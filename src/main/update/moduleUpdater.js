const { ipcMain, shell } = require('electron')
const fetch = require('electron-fetch').default
const fs = require('fs-extra')
const path = require('path')
const semver = require('semver')
const config = require('../config')
const { appRoot, userDataPath, sendMsg } = require('../utils')

const { version, name } = require('../../../package.json')

const APP_UPDATE_SOURCE = {
  name: 'HoYo Gacha Center',
  repo: 'windgod31202/hoyo-gacha-center',
  releaseUrl: 'https://github.com/windgod31202/hoyo-gacha-center/releases'
}

const SOURCES = {
  genshin: {
    game: 'genshin',
    name: '原神祈願模組',
    repo: 'biuuu/genshin-wish-export',
    releaseUrl: 'https://github.com/biuuu/genshin-wish-export/releases',
    safeFiles: [
      {
        label: '卡池類型對照表',
        rawUrl: 'https://raw.githubusercontent.com/biuuu/genshin-wish-export/main/src/gachaType.json',
        validate: data => data && typeof data === 'object' && !Array.isArray(data),
        targets: [
          'src/main/games/genshin/gachaType.json',
          'src/renderer/games/genshinGachaType.json'
        ]
      }
    ]
  },
  starrail: {
    game: 'starrail',
    name: '星穹鐵道躍遷模組',
    repo: 'biuuu/star-rail-warp-export',
    releaseUrl: 'https://github.com/biuuu/star-rail-warp-export/releases',
    safeFiles: [
      {
        label: '卡池類型對照表',
        rawUrl: 'https://raw.githubusercontent.com/biuuu/star-rail-warp-export/main/src/gachaType.json',
        validate: data => Array.isArray(data),
        targets: [
          'src/main/games/starrail/gachaType.json',
          'src/renderer/games/starrailGachaType.json'
        ]
      }
    ]
  },
  zzz: {
    game: 'zzz',
    name: '絕區零調頻模組',
    repo: 'earthjasonlin/zzz-signal-search-export',
    releaseUrl: 'https://github.com/earthjasonlin/zzz-signal-search-export/releases',
    safeFiles: [
      {
        label: '卡池類型對照表',
        rawUrl: 'https://raw.githubusercontent.com/earthjasonlin/zzz-signal-search-export/main/src/gachaType.json',
        validate: data => Array.isArray(data),
        targets: [
          'src/main/games/zzz/gachaType.json',
          'src/renderer/games/zzzGachaType.json'
        ]
      }
    ]
  }
}

const toVersion = value => {
  const parsed = semver.coerce(String(value || '').replace(/^v/i, ''))
  return parsed ? parsed.version : null
}

const getUpdateConfig = () => {
  const current = config.value().moduleUpdates || {}
  const normalized = {
    enabled: current.enabled !== false,
    checkedAt: current.checkedAt || 0,
    games: Object.assign({
      genshin: { reviewedVersion: '0.0.0', reviewedAt: 0 },
      starrail: { reviewedVersion: '0.0.0', reviewedAt: 0 },
      zzz: { reviewedVersion: '0.0.0', reviewedAt: 0 }
    }, current.games || {})
  }
  return normalized
}

const saveUpdateConfig = async updateConfig => {
  config.set('moduleUpdates', updateConfig)
  await config.save()
}

const fetchJson = async url => {
  const response = await fetch(url, {
    timeout: 20 * 1000,
    headers: {
      'User-Agent': 'HoYo-Gacha-Center',
      'Accept': 'application/vnd.github+json, application/json'
    }
  })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
  return response.json()
}

const fetchText = async url => {
  const response = await fetch(url, {
    timeout: 20 * 1000,
    headers: { 'User-Agent': 'HoYo-Gacha-Center' }
  })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
  return response.text()
}

const getLatestRelease = async source => {
  try {
    const latest = await fetchJson(`https://api.github.com/repos/${source.repo}/releases/latest`)
    return {
      version: latest.tag_name || latest.name || 'unknown',
      title: latest.name || latest.tag_name || 'Latest release',
      url: latest.html_url || source.releaseUrl,
      publishedAt: latest.published_at || latest.created_at || '',
      body: latest.body || ''
    }
  } catch (releaseError) {
    const tags = await fetchJson(`https://api.github.com/repos/${source.repo}/tags?per_page=1`)
    const first = Array.isArray(tags) ? tags[0] : null
    if (!first) throw releaseError
    return {
      version: first.name,
      title: first.name,
      url: source.releaseUrl,
      publishedAt: '',
      body: ''
    }
  }
}

const checkAppUpdate = async () => {
  try {
    const latest = await getLatestRelease(APP_UPDATE_SOURCE)

    const currentVersion = toVersion(version)
    const latestVersion = toVersion(latest.version)

    const updateAvailable = latestVersion && currentVersion
      ? semver.gt(latestVersion, currentVersion)
      : latest.version !== version

    return {
      name: APP_UPDATE_SOURCE.name,
      repo: APP_UPDATE_SOURCE.repo,
      currentVersion: `v${version}`,
      latestVersion: latest.version,
      updateAvailable,
      releaseTitle: latest.title,
      releaseUrl: latest.url,
      publishedAt: latest.publishedAt,
      body: latest.body.slice(0, 1200),
      mode: 'app-release'
    }
  } catch (e) {
    return {
      name: APP_UPDATE_SOURCE.name,
      repo: APP_UPDATE_SOURCE.repo,
      currentVersion: `v${version}`,
      latestVersion: null,
      updateAvailable: false,
      error: e.message,
      releaseUrl: APP_UPDATE_SOURCE.releaseUrl,
      mode: 'app-release'
    }
  }
}

const checkModuleUpdates = async () => {
  const updateConfig = getUpdateConfig()
  const results = []

  for (const source of Object.values(SOURCES)) {
    try {
      const latest = await getLatestRelease(source)
      const reviewedVersion = updateConfig.games[source.game]?.reviewedVersion || '0.0.0'
      const latestSemver = toVersion(latest.version)
      const reviewedSemver = toVersion(reviewedVersion)
      const updateAvailable = latestSemver && reviewedSemver
        ? semver.gt(latestSemver, reviewedSemver)
        : latest.version !== reviewedVersion

      results.push({
        game: source.game,
        name: source.name,
        repo: source.repo,
        latestVersion: latest.version,
        reviewedVersion,
        updateAvailable,
        releaseTitle: latest.title,
        releaseUrl: latest.url,
        publishedAt: latest.publishedAt,
        body: latest.body.slice(0, 1200),
        safeUpdateFiles: source.safeFiles.map(item => item.label),
        mode: 'safe-config-only'
      })
    } catch (e) {
      results.push({
        game: source.game,
        name: source.name,
        repo: source.repo,
        latestVersion: null,
        reviewedVersion: updateConfig.games[source.game]?.reviewedVersion || '0.0.0',
        updateAvailable: false,
        error: e.message,
        releaseUrl: source.releaseUrl,
        safeUpdateFiles: source.safeFiles.map(item => item.label),
        mode: 'safe-config-only'
      })
    }
  }

  updateConfig.checkedAt = Date.now()
  await saveUpdateConfig(updateConfig)
  return { checkedAt: updateConfig.checkedAt, items: results }
}

const checkAllUpdates = async () => {
  const app = await checkAppUpdate()
  const modules = await checkModuleUpdates()

  return {
    checkedAt: Date.now(),
    app,
    modules: modules.items
  }
}

const createBackup = async game => {
  const source = SOURCES[game]
  if (!source) throw new Error(`Unknown game: ${game}`)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupRoot = path.join(userDataPath, 'module-backups', `${game}-${timestamp}`)

  const targets = new Set()
  source.safeFiles.forEach(item => item.targets.forEach(target => targets.add(target)))
  targets.add(`src/main/games/${game}/service.js`)

  for (const relativePath of targets) {
    const from = path.join(appRoot, relativePath)
    if (await fs.pathExists(from)) {
      await fs.copy(from, path.join(backupRoot, relativePath))
    }
  }
  await fs.outputJSON(path.join(backupRoot, 'backup-info.json'), {
    game,
    source: source.repo,
    createdAt: Date.now(),
    files: [...targets]
  }, { spaces: 2 })
  return backupRoot
}

const applySafeModuleUpdate = async game => {
  const source = SOURCES[game]
  if (!source) throw new Error(`Unknown game: ${game}`)
  const backupPath = await createBackup(game)
  const changedFiles = []

  for (const safeFile of source.safeFiles) {
    const text = await fetchText(safeFile.rawUrl)
    let data
    try {
      data = JSON.parse(text)
    } catch (e) {
      throw new Error(`${safeFile.label} 不是有效 JSON：${e.message}`)
    }
    if (!safeFile.validate(data)) {
      throw new Error(`${safeFile.label} 格式不符合預期，已取消更新`)
    }
    const output = JSON.stringify(data, null, 2) + '\n'
    for (const target of safeFile.targets) {
      const targetPath = path.join(appRoot, target)
      await fs.outputFile(targetPath, output, 'utf8')
      changedFiles.push(target)
    }
  }

  sendMsg(`${source.name} 已套用安全設定更新，備份位置：${backupPath}`, 'UPDATE_HINT')
  return { game, backupPath, changedFiles }
}

const markModuleUpdateReviewed = async (game, version, releaseUrl = '') => {
  if (!SOURCES[game]) throw new Error(`Unknown game: ${game}`)
  const updateConfig = getUpdateConfig()
  updateConfig.games[game] = {
    reviewedVersion: version || updateConfig.games[game]?.reviewedVersion || '0.0.0',
    reviewedAt: Date.now(),
    releaseUrl
  }
  await saveUpdateConfig(updateConfig)
  return updateConfig.games[game]
}

ipcMain.handle('MODULE_UPDATE_CHECK', checkAllUpdates)
ipcMain.handle('MODULE_UPDATE_APPLY_SAFE', async (event, game) => applySafeModuleUpdate(game))
ipcMain.handle('MODULE_UPDATE_MARK_REVIEWED', async (event, game, version, releaseUrl) => markModuleUpdateReviewed(game, version, releaseUrl))
ipcMain.handle('MODULE_UPDATE_BACKUP', async (event, game) => createBackup(game))
ipcMain.handle('MODULE_UPDATE_OPEN_RELEASE', async (event, game) => {
  const source = SOURCES[game]
  if (!source) return false
  await shell.openExternal(source.releaseUrl)
  return true
})
ipcMain.handle('APP_UPDATE_OPEN_RELEASE', async () => {
  await shell.openExternal(APP_UPDATE_SOURCE.releaseUrl)
  return true
})

module.exports = {
  checkAppUpdate,
  checkAllUpdates,
  checkModuleUpdates,
  applySafeModuleUpdate,
  markModuleUpdateReviewed,
  createBackup
}
