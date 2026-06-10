const { UIGF_VERSION, UIGF_GAME_KEYS, INTERNAL_GAME_KEYS, isSupportedImportVersion } = require('./constants')
const { getItemIdFromLocalDict, getNameFromLocalDict } = require('./dictStore')
const { name: appName, version: appVersion } = require('../../../package.json')

function safeString(value, fallback = '') {
  if (value === undefined || value === null) return fallback
  return String(value)
}

function safeTime(value) {
  return safeString(value)
}

function compareByIdOrTime(a, b) {
  const idA = safeString(getRecordId(a))
  const idB = safeString(getRecordId(b))
  if (/^\d+$/.test(idA) && /^\d+$/.test(idB)) {
    const diff = BigInt(idA) - BigInt(idB)
    if (diff > 0) return 1
    if (diff < 0) return -1
  }
  return safeString(getRecordTime(a)).localeCompare(safeString(getRecordTime(b)))
}

function getRecordId(record) {
  if (Array.isArray(record)) return record[5]
  return record?.id
}

function getRecordTime(record) {
  if (Array.isArray(record)) return record[0]
  return record?.time
}

function getRecordUniqueKey(game, uid, gachaType, record) {
  const id = safeString(getRecordId(record))
  if (id) return [game, uid, gachaType, id].join('|')

  if (Array.isArray(record)) {
    return [game, uid, gachaType, record[0], record[1], record[2], record[3]].join('|')
  }
  return [game, uid, gachaType, record?.time, record?.item_id, record?.name, record?.rank_type].join('|')
}

function mergeResultMaps(game, uid, localMap, incomingMap) {
  const result = new Map()
  const allTypes = new Set([...(localMap?.keys?.() || []), ...(incomingMap?.keys?.() || [])])

  for (const type of allTypes) {
    const map = new Map()
    for (const item of (localMap?.get?.(type) || [])) {
      map.set(getRecordUniqueKey(game, uid, type, item), item)
    }
    for (const item of (incomingMap?.get?.(type) || [])) {
      map.set(getRecordUniqueKey(game, uid, type, item), item)
    }
    result.set(type, Array.from(map.values()).sort(compareByIdOrTime))
  }

  return result
}

function mapGenshinUigfGachaType(gachaType) {
  const type = safeString(gachaType)
  if (type === '400') return '301'
  return type
}

function mapZzzGachaType(gachaType) {
  const type = safeString(gachaType)
  if (type === '102') return '2'
  if (type === '103') return '3'
  return type
}

function nativeGenshinRecordToUigf(record, type, context) {
  const [time, name, itemType, rankType, rawGachaType, id, rawItemId] = record
  const gachaType = safeString(rawGachaType || type)
  const lang = context.lang
  const itemId = safeString(rawItemId || getItemIdFromLocalDict({ game: 'genshin', lang, name }))
  return {
    uigf_gacha_type: mapGenshinUigfGachaType(gachaType),
    gacha_type: gachaType,
    item_id: itemId,
    count: '1',
    time: safeTime(time),
    name: safeString(name || getNameFromLocalDict({ game: 'genshin', lang, itemId })),
    item_type: safeString(itemType),
    rank_type: safeString(rankType),
    id: safeString(id)
  }
}

function nativeObjectRecordToUigf(record, game, type, context) {
  const lang = context.lang
  const name = safeString(record.name)
  const itemId = safeString(record.item_id || record.itemId || getItemIdFromLocalDict({ game, lang, name }))
  const gachaType = game === 'zzz'
    ? mapZzzGachaType(record.gacha_type || type)
    : safeString(record.gacha_type || type)

  return {
    gacha_id: safeString(record.gacha_id),
    gacha_type: gachaType,
    item_id: itemId,
    count: safeString(record.count || '1'),
    time: safeTime(record.time),
    name: safeString(name || getNameFromLocalDict({ game, lang, itemId })),
    item_type: safeString(record.item_type),
    rank_type: safeString(record.rank_type),
    id: safeString(record.id)
  }
}

function exportGameAccounts(game, dataMap, langFallback) {
  const accounts = []
  for (const data of dataMap.values()) {
    if (!data || data.deleted) continue
    const lang = safeString(data.lang || langFallback || 'zh-tw').toLowerCase()
    const account = {
      uid: safeString(data.uid),
      timezone: Number.isFinite(Number(data.region_time_zone)) ? Number(data.region_time_zone) : 8,
      lang,
      list: []
    }

    for (const [type, list] of data.result || []) {
      for (const record of list || []) {
        if (game === 'genshin') {
          account.list.push(nativeGenshinRecordToUigf(record, type, { lang }))
        } else {
          account.list.push(nativeObjectRecordToUigf(record, game, type, { lang }))
        }
      }
    }

    account.list.sort((a, b) => compareByIdOrTime(a, b))
    accounts.push(account)
  }
  return accounts
}

function exportAllGamesToUigfV42(services, config) {
  const result = {
    info: {
      export_timestamp: Math.floor(Date.now() / 1000),
      export_app: appName || 'HoYo Gacha Center',
      export_app_version: safeString(appVersion || '1.0.0'),
      version: UIGF_VERSION
    }
  }

  for (const [game, uigfKey] of Object.entries(UIGF_GAME_KEYS)) {
    if (!services[game] || game === 'genshin_ugc') continue
    const { dataMap } = services[game].getData()
    const accounts = exportGameAccounts(game, dataMap, config.lang)
    if (accounts.length) result[uigfKey] = accounts
  }

  return result
}

function uigfRecordToNative(record, game) {
  if (game === 'genshin') {
    return [
      safeTime(record.time),
      safeString(record.name || record.item_name),
      safeString(record.item_type),
      Number(record.rank_type || 0),
      safeString(record.gacha_type),
      safeString(record.id),
      safeString(record.item_id)
    ]
  }

  if (game === 'zzz') {
    return {
      id: safeString(record.id),
      item_id: safeString(record.item_id),
      item_type: safeString(record.item_type),
      name: safeString(record.name || record.item_name),
      rank_type: safeString(record.rank_type),
      time: safeTime(record.time),
      gacha_id: safeString(record.gacha_id),
      gacha_type: mapZzzGachaType(record.gacha_type),
      count: safeString(record.count || '1')
    }
  }

  return {
    id: safeString(record.id),
    item_id: safeString(record.item_id),
    item_type: safeString(record.item_type),
    name: safeString(record.name || record.item_name),
    rank_type: safeString(record.rank_type),
    time: safeTime(record.time),
    gacha_id: safeString(record.gacha_id),
    gacha_type: safeString(record.gacha_type),
    count: safeString(record.count || '1')
  }
}

function importAccountToNativeData(account, game, existingData) {
  const uid = safeString(account.uid)
  const lang = safeString(account.lang || existingData?.lang || 'zh-tw').toLowerCase()
  const timezone = Number.isFinite(Number(account.timezone)) ? Number(account.timezone) : (existingData?.region_time_zone || 8)
  const incomingMap = new Map()

  for (const record of account.list || []) {
    const type = game === 'genshin'
      ? safeString(record.gacha_type || record.uigf_gacha_type)
      : game === 'zzz'
        ? mapZzzGachaType(record.gacha_type)
        : safeString(record.gacha_type)
    if (!incomingMap.has(type)) incomingMap.set(type, [])
    incomingMap.get(type).push(uigfRecordToNative(record, game))
  }

  const mergedResult = mergeResultMaps(game, uid, existingData?.result, incomingMap)
  const typeMap = existingData?.typeMap instanceof Map ? existingData.typeMap : new Map()
  for (const type of incomingMap.keys()) {
    if (!typeMap.has(type)) typeMap.set(type, type)
  }

  return {
    ...(existingData || {}),
    result: mergedResult,
    typeMap,
    time: Date.now(),
    uid,
    lang,
    region_time_zone: timezone,
    deleted: false
  }
}

function parseUigfV42(data) {
  const version = data?.info?.version
  if (!isSupportedImportVersion(version)) {
    throw new Error(`不支援的 UIGF 版本：${version || 'unknown'}，目前支援 v4.0 / v4.1 / v4.2`)
  }

  const sections = []
  for (const [uigfKey, game] of Object.entries(INTERNAL_GAME_KEYS)) {
    if (!data[uigfKey]) continue
    if (game === 'genshin_ugc') {
      sections.push({ game, accounts: data[uigfKey], unsupported: true })
    } else {
      sections.push({ game, accounts: data[uigfKey] || [], unsupported: false })
    }
  }
  return { version, sections }
}

module.exports = {
  exportAllGamesToUigfV42,
  importAccountToNativeData,
  parseUigfV42,
  mergeResultMaps,
  mapZzzGachaType,
  mapGenshinUigfGachaType
}
