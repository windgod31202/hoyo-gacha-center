const fetch = require('electron-fetch').default
const { toUigfApiGame, toUigfApiLang } = require('./constants')

const UIGF_API_BASE = 'https://api.uigf.org'
const REQUEST_TIMEOUT = 15 * 1000

function assertApiGame(game) {
  const apiGame = toUigfApiGame(game)
  if (!apiGame) {
    throw new Error(`UIGF API 目前只支援原神與星穹鐵道字典，不支援：${game}`)
  }
  return apiGame
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    timeout: REQUEST_TIMEOUT,
    ...options
  })
  if (!response.ok) {
    throw new Error(`UIGF API 請求失敗：HTTP ${response.status}`)
  }
  return response.json()
}

async function getRemoteMd5(game) {
  const apiGame = assertApiGame(game)
  return requestJson(`${UIGF_API_BASE}/md5/${apiGame}`)
}

async function downloadDict(game, lang) {
  const apiGame = assertApiGame(game)
  const apiLang = toUigfApiLang(lang)
  return requestJson(`${UIGF_API_BASE}/dict/${apiGame}/${apiLang}.json`)
}

async function translateNameToItemId({ game, lang, itemName }) {
  const apiGame = assertApiGame(game)
  const apiLang = toUigfApiLang(lang)
  const data = await requestJson(`${UIGF_API_BASE}/translate/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lang: apiLang,
      type: 'normal',
      game: apiGame,
      item_name: itemName
    })
  })
  return data.item_id ? String(data.item_id) : ''
}

async function translateItemIdToName({ game, lang, itemId }) {
  const apiGame = assertApiGame(game)
  const apiLang = toUigfApiLang(lang)
  const data = await requestJson(`${UIGF_API_BASE}/translate/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      lang: apiLang,
      type: 'reverse',
      game: apiGame,
      item_id: String(itemId)
    })
  })
  return data.item_name || ''
}

async function identifyItem({ game, text }) {
  const apiGame = assertApiGame(game)
  return requestJson(`${UIGF_API_BASE}/identify/${apiGame}/${encodeURIComponent(text)}`)
}

module.exports = {
  UIGF_API_BASE,
  getRemoteMd5,
  downloadDict,
  translateNameToItemId,
  translateItemIdToName,
  identifyItem
}
