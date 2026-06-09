import { isWeapon, isCharacter } from './utils'

const itemCount = (map, name) => {
  if (!map.has(name)) map.set(name, 1)
  else map.set(name, map.get(name) + 1)
}

const orderMap = {
  genshin: ['301', '400', '302', '500', '200', '100'],
  starrail: ['11', '12', '21', '22', '1', '2'],
  zzz: ['2', '102', '3', '103', '1', '5']
}

const normalizeRank = (rank, game) => {
  const value = `${rank}`
  if (game === 'zzz') {
    if (value === '4') return '5'
    if (value === '3') return '4'
    if (value === '2') return '3'
  }
  return value
}

const normalizeItem = (item, game) => {
  if (Array.isArray(item)) {
    const [time, name, item_type, rank_type, gacha_type, id] = item
    return { time, name, item_type, rank_type: normalizeRank(rank_type, game), gacha_type, id }
  }
  return { ...item, rank_type: normalizeRank(item.rank_type, game) }
}

const gachaDetail = (data, game = 'starrail') => {
  if (!data) return
  const detailMap = new Map()
  const order = orderMap[game] || [...data.keys()]
  const keys = [...order, ...[...data.keys()].filter(key => !order.includes(key))]
  for (let key of keys) {
    if (!data.has(key)) continue
    const value = data.get(key)
    let detail = {
      count3: 0, count4: 0, count5: 0,
      count3w: 0, count4w: 0, count5w: 0, count4c: 0, count5c: 0,
      weapon3: new Map(), weapon4: new Map(), weapon5: new Map(),
      char4: new Map(), char5: new Map(),
      date: [], ssrPos: [], countMio: 0, total: value.length,
    }
    let lastSSR = 0
    let dateMin = 0
    let dateMax = 0
    value.forEach((raw, index) => {
      const item = normalizeItem(raw, game)
      const { time, name, item_type: type, rank_type: rank, gacha_type } = item
      const timestamp = new Date(time).getTime()
      if (!dateMin) dateMin = timestamp
      if (!dateMax) dateMax = timestamp
      if (dateMin > timestamp) dateMin = timestamp
      if (dateMax < timestamp) dateMax = timestamp
      if (rank === '3') {
        detail.count3++
        detail.countMio++
        if (isWeapon(type)) {
          detail.count3w++
          itemCount(detail.weapon3, name)
        }
      } else if (rank === '4') {
        detail.count4++
        detail.countMio++
        if (isWeapon(type)) {
          detail.count4w++
          itemCount(detail.weapon4, name)
        } else if (isCharacter(type)) {
          detail.count4c++
          itemCount(detail.char4, name)
        }
      } else if (rank === '5') {
        detail.ssrPos.push([name, index + 1 - lastSSR, time, gacha_type || key])
        lastSSR = index + 1
        detail.count5++
        detail.countMio = 0
        if (isWeapon(type)) {
          detail.count5w++
          itemCount(detail.weapon5, name)
        } else if (isCharacter(type)) {
          detail.count5c++
          itemCount(detail.char5, name)
        }
      }
    })
    detail.date = [dateMin, dateMax]
    if (detail.total) detailMap.set(key, detail)
  }
  return detailMap
}

export default gachaDetail
