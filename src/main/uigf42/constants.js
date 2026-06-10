const UIGF_VERSION = 'v4.2'

const UIGF_GAME_KEYS = {
  genshin: 'hk4e',
  starrail: 'hkrpg',
  zzz: 'nap',
  genshin_ugc: 'hk4e_ugc'
}

const INTERNAL_GAME_KEYS = {
  hk4e: 'genshin',
  hkrpg: 'starrail',
  nap: 'zzz',
  hk4e_ugc: 'genshin_ugc'
}

const GAME_DISPLAY_NAMES = {
  genshin: '原神',
  starrail: '崩壞：星穹鐵道',
  zzz: '絕區零',
  genshin_ugc: '原神：千星奇域'
}

// UIGF API is a translation/dictionary service, not a gacha history API.
// The public API currently supports genshin and starrail dictionaries.
const UIGF_API_GAME_KEYS = {
  genshin: 'genshin',
  starrail: 'starrail'
}

const APP_LANG_TO_UIGF_API_LANG = {
  'zh-cn': 'chs',
  'zh-tw': 'cht',
  'de-de': 'de',
  'en-us': 'en',
  'es-es': 'es',
  'fr-fr': 'fr',
  'id-id': 'id',
  'ja-jp': 'jp',
  'ko-kr': 'kr',
  'pt-pt': 'pt',
  'ru-ru': 'ru',
  'th-th': 'th',
  'vi-vn': 'vi'
}

const UIGF_API_LANG_TO_APP_LANG = Object.fromEntries(
  Object.entries(APP_LANG_TO_UIGF_API_LANG).map(([appLang, apiLang]) => [apiLang, appLang])
)

function normalizeAppLang(lang) {
  return String(lang || 'zh-tw').toLowerCase()
}

function toUigfApiLang(lang) {
  const key = normalizeAppLang(lang)
  return APP_LANG_TO_UIGF_API_LANG[key] || key || 'cht'
}

function toUigfApiGame(game) {
  return UIGF_API_GAME_KEYS[game] || null
}

function isSupportedImportVersion(version) {
  return ['v4.0', 'v4.1', 'v4.2'].includes(String(version || ''))
}

function normalizeUigfVersion(version) {
  const text = String(version || '').trim()
  if (!text) return ''
  return text.startsWith('v') ? text : `v${text}`
}

module.exports = {
  UIGF_VERSION,
  UIGF_GAME_KEYS,
  INTERNAL_GAME_KEYS,
  GAME_DISPLAY_NAMES,
  UIGF_API_GAME_KEYS,
  APP_LANG_TO_UIGF_API_LANG,
  UIGF_API_LANG_TO_APP_LANG,
  normalizeAppLang,
  toUigfApiLang,
  toUigfApiGame,
  isSupportedImportVersion,
  normalizeUigfVersion
}
