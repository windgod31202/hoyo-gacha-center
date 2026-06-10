const fs = require('fs-extra')
const path = require('path')
const crypto = require('crypto')
const { userDataPath } = require('../utils')
const { getRemoteMd5, downloadDict } = require('./api')
const { toUigfApiLang, toUigfApiGame, GAME_DISPLAY_NAMES } = require('./constants')

function getDictRoot() {
  return path.join(userDataPath, 'uigf-dict')
}

function getDictPath(game, lang) {
  return path.join(getDictRoot(), game, `${toUigfApiLang(lang)}.json`)
}

function getMetaPath(game) {
  return path.join(getDictRoot(), game, 'meta.json')
}

function calcFileMd5(filePath) {
  if (!fs.existsSync(filePath)) return ''
  const buffer = fs.readFileSync(filePath)
  return crypto.createHash('md5').update(buffer).digest('hex')
}

function readJsonSafe(filePath, fallback = null) {
  try {
    if (!fs.existsSync(filePath)) return fallback
    return fs.readJsonSync(filePath)
  } catch (e) {
    return fallback
  }
}

function loadDict(game, lang) {
  return readJsonSafe(getDictPath(game, lang), {}) || {}
}

function reverseDict(dict) {
  const result = {}
  for (const [name, id] of Object.entries(dict || {})) {
    result[String(id)] = name
  }
  return result
}

function getItemIdFromLocalDict({ game, lang, name }) {
  if (!name || !toUigfApiGame(game)) return ''
  const dict = loadDict(game, lang)
  return String(dict[name] || dict[String(name).trim()] || '')
}

function getNameFromLocalDict({ game, lang, itemId }) {
  if (!itemId || !toUigfApiGame(game)) return ''
  const dict = loadDict(game, lang)
  const reversed = reverseDict(dict)
  return reversed[String(itemId)] || ''
}

async function updateDictIfNeeded(game, lang) {
  if (!toUigfApiGame(game)) {
    return {
      game,
      gameName: GAME_DISPLAY_NAMES[game] || game,
      lang,
      supported: false,
      updated: false,
      message: 'UIGF API 字典目前只支援原神與星穹鐵道'
    }
  }

  const apiLang = toUigfApiLang(lang)
  const dictPath = getDictPath(game, lang)
  const metaPath = getMetaPath(game)
  const remoteMd5 = await getRemoteMd5(game)
  const expectedMd5 = remoteMd5[apiLang]

  if (!expectedMd5) {
    throw new Error(`UIGF API 未提供 ${game}/${apiLang} 的 MD5`)
  }

  const localMd5 = calcFileMd5(dictPath)
  if (localMd5 === expectedMd5) {
    return {
      game,
      gameName: GAME_DISPLAY_NAMES[game] || game,
      lang: apiLang,
      supported: true,
      updated: false,
      path: dictPath,
      md5: localMd5
    }
  }

  const dict = await downloadDict(game, lang)
  await fs.ensureDir(path.dirname(dictPath))
  await fs.writeJson(dictPath, dict, { spaces: 2 })
  await fs.writeJson(metaPath, {
    game,
    checkedAt: Date.now(),
    remoteMd5
  }, { spaces: 2 })

  return {
    game,
    gameName: GAME_DISPLAY_NAMES[game] || game,
    lang: apiLang,
    supported: true,
    updated: true,
    path: dictPath,
    md5: calcFileMd5(dictPath),
    count: Object.keys(dict || {}).length
  }
}

function getDictStatus(game, lang) {
  if (!toUigfApiGame(game)) {
    return {
      game,
      gameName: GAME_DISPLAY_NAMES[game] || game,
      lang,
      supported: false,
      exists: false
    }
  }
  const dictPath = getDictPath(game, lang)
  const dict = loadDict(game, lang)
  return {
    game,
    gameName: GAME_DISPLAY_NAMES[game] || game,
    lang: toUigfApiLang(lang),
    supported: true,
    exists: fs.existsSync(dictPath),
    path: dictPath,
    md5: calcFileMd5(dictPath),
    count: Object.keys(dict || {}).length
  }
}

module.exports = {
  getDictRoot,
  getDictPath,
  loadDict,
  reverseDict,
  getItemIdFromLocalDict,
  getNameFromLocalDict,
  updateDictIfNeeded,
  getDictStatus
}
