const ExcelJS = require('./module/exceljs.min.js')
const { getData, getGame } = require('./getData')
const { app, ipcMain, dialog } = require('electron')
const fs = require('fs-extra')
const path = require('path')

function pad(num) { return `${num}`.padStart(2, '0') }
function getTimeString() {
  const d = new Date()
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

const gameNames = {
  genshin: 'Genshin_Wish',
  starrail: 'StarRail_Warp',
  zzz: 'ZZZ_Signal_Search'
}

const normalizeLog = (log) => {
  if (Array.isArray(log)) {
    return {
      time: log[0],
      name: log[1],
      item_type: log[2],
      rank_type: `${log[3]}`,
      gacha_type: log[4],
      id: log[5],
      count: '1'
    }
  }
  return {
    time: log.time,
    name: log.name,
    item_type: log.item_type,
    rank_type: `${log.rank_type}`,
    gacha_type: log.gacha_type,
    id: log.id,
    item_id: log.item_id,
    gacha_id: log.gacha_id,
    count: log.count || '1'
  }
}

const styleHeader = (row) => {
  row.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FF374151' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
      right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
    }
  })
}

const styleBody = (row, rankType) => {
  const rankColor = { '2': 'FF6B7280', '3': 'FF8B5CF6', '4': 'FFD97706', '5': 'FFD97706' }
  row.eachCell(cell => {
    cell.font = { color: { argb: rankColor[rankType] || 'FF374151' }, bold: rankType !== '3' }
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
    }
  })
}

const start = async (gameArg) => {
  const game = gameArg || getGame()
  const { dataMap, current } = getData(game)
  const data = dataMap.get(current)
  if (!data) return

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'HoYo Gacha Center'
  workbook.created = new Date()

  for (let [key, value] of data.result) {
    const sheetName = (data.typeMap?.get?.(key) || key).replace(/[*?:/\\]/g, ' ').slice(0, 31)
    const sheet = workbook.addWorksheet(sheetName, { views: [{ state: 'frozen', ySplit: 1 }] })
    sheet.columns = [
      { header: '時間', key: 'time', width: 24 },
      { header: '名稱', key: 'name', width: 24 },
      { header: '類型', key: 'item_type', width: 16 },
      { header: '星級', key: 'rank_type', width: 8 },
      { header: '總抽數', key: 'total', width: 10 },
      { header: '保底', key: 'pity', width: 10 },
      { header: 'ID', key: 'id', width: 24 }
    ]
    styleHeader(sheet.getRow(1))
    let total = 0
    let pity = 0
    for (const raw of value) {
      const log = normalizeLog(raw)
      total += Number(log.count || 1)
      pity += Number(log.count || 1)
      const row = sheet.addRow({ ...log, total, pity })
      styleBody(row, log.rank_type)
      if ((game === 'zzz' && log.rank_type === '4') || (game !== 'zzz' && log.rank_type === '5')) pity = 0
    }
  }

  const rawSheet = workbook.addWorksheet('rawData', { views: [{ state: 'frozen', ySplit: 1 }] })
  rawSheet.columns = [
    { header: 'game', key: 'game', width: 14 },
    { header: 'uid', key: 'uid', width: 14 },
    { header: 'gacha_type', key: 'gacha_type', width: 14 },
    { header: 'time', key: 'time', width: 24 },
    { header: 'name', key: 'name', width: 24 },
    { header: 'item_type', key: 'item_type', width: 16 },
    { header: 'rank_type', key: 'rank_type', width: 10 },
    { header: 'id', key: 'id', width: 24 }
  ]
  styleHeader(rawSheet.getRow(1))
  for (let [key, value] of data.result) {
    for (const raw of value) rawSheet.addRow({ game, uid: data.uid, ...normalizeLog(raw), gacha_type: key })
  }

  const buffer = await workbook.xlsx.writeBuffer()
  const defaultName = `${gameNames[game] || 'HoYo_Gacha'}_${data.uid || current}_${getTimeString()}`
  const filePath = dialog.showSaveDialogSync({
    defaultPath: path.join(app.getPath('downloads'), defaultName),
    filters: [{ name: 'Excel', extensions: ['xlsx'] }]
  })
  if (filePath) {
    await fs.ensureFile(filePath)
    await fs.writeFile(filePath, buffer)
  }
}

ipcMain.handle('SAVE_EXCEL', async (event, gameArg) => {
  await start(gameArg)
})
