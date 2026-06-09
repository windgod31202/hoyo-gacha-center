<template>
  <div v-if="ui" class="app-shell min-h-screen text-slate-100">
    <aside class="sidebar">
      <div class="brand-block">
        <div class="brand-icon">H</div>
        <div>
          <h1>HoYo Gacha Center</h1>
          <p>Wish / Warp Exporter</p>
        </div>
      </div>

      <div class="game-switcher">
        <button
          v-for="game in games"
          :key="game.key"
          :class="['game-button', { active: state.game === game.key }]"
          @click="changeGame(game.key)"
        >
          <span class="game-dot"></span>
          <span>{{ game.name }}</span>
        </button>
      </div>

      <div class="side-panel">
        <p class="side-label">目前帳號</p>
        <el-select
          v-if="state.status !== 'loading' && dataMap && (dataMap.size > 1 || (dataMap.size === 1 && state.current === 0))"
          class="account-select"
          @change="changeCurrent"
          v-model="uidSelectText"
        >
          <el-option
            v-for="item of dataMap"
            :key="item[0]"
            :label="maskUid(item[0])"
            :value="item[0]"
          />
        </el-select>
        <div v-else class="current-uid">{{ state.current ? maskUid(state.current) : '尚未載入' }}</div>
      </div>

      <div class="side-actions">
        <el-button class="action-button" type="primary" :disabled="!allowClick()" :loading="state.status === 'loading'" @click="fetchData()">
          {{ state.status === 'init' ? '載入紀錄' : '更新紀錄' }}
        </el-button>
        <el-button class="action-button" type="success" :disabled="!gachaData" @click="saveExcel">
          匯出 Excel
        </el-button>
        <el-button class="action-button" type="info" plain @click="state.showUrlDlg = true">
          手動貼上 URL
        </el-button>
        <el-button class="action-button" type="warning" plain :disabled="!allowClick() || state.status === 'loading'" @click="fetchData('proxy')">
          代理模式取得 URL
        </el-button>
      </div>
    </aside>

    <main class="main-content">
      <header class="hero-card">
        <div>
          <p class="eyebrow">{{ currentGameMeta.name }}</p>
          <h2>{{ pageTitle }}</h2>
          <p class="hero-hint">{{ hint }}</p>
        </div>
        <div class="header-actions">
          <el-button plain @click="newUser" :disabled="state.status === 'loading'">新增帳號</el-button>
          <el-dropdown @command="optionCommand">
            <el-button plain>更多操作</el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="setting">設定</el-dropdown-item>
                <el-dropdown-item command="copyUrl">複製目前 URL</el-dropdown-item>
                <el-dropdown-item command="cache">開啟快取資料夾</el-dropdown-item>
                <el-dropdown-item command="relaunch">重啟程式</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <section class="stat-grid">
        <div class="stat-card">
          <span>總抽數</span>
          <strong>{{ summary.total }}</strong>
          <small>目前遊戲全部卡池</small>
        </div>
        <div class="stat-card gold">
          <span>{{ rarityLabels.top }}</span>
          <strong>{{ summary.five }}</strong>
          <small>{{ rarityLabels.avg }}：{{ summary.avg5 || '-' }}</small>
        </div>
        <div class="stat-card purple">
          <span>{{ rarityLabels.mid }}</span>
          <strong>{{ summary.four }}</strong>
          <small>{{ summary.fourRate }}%</small>
        </div>
        <div class="stat-card cyan">
          <span>目前保底</span>
          <strong>{{ summary.currentPity }}</strong>
          <small>{{ rarityLabels.pity }}</small>
        </div>
      </section>

      <section v-if="detail" class="pool-grid">
        <article class="pool-card" v-for="item of detail" :key="item[0]" :class="{ hidden: state.config.hideNovice && item[0] === currentGameMeta.noviceType }">
          <div class="pool-header">
            <div>
              <p>{{ typeMap.get(item[0]) || item[0] }}</p>
              <span>{{ item[1].total }} 抽 · {{ rarityLabels.top }} {{ item[1].count5 }} · 目前保底 {{ item[1].countMio }}</span>
            </div>
          </div>
          <pie-chart :data="item" :i18n="state.i18n" :typeMap="typeMap" />
          <gacha-detail :i18n="state.i18n" :data="item" :typeMap="typeMap" />
        </article>
      </section>

      <section v-else class="empty-card">
        <h3>尚未載入{{ currentGameMeta.name }}紀錄</h3>
        <p>可以直接按「載入紀錄」，或使用「手動貼上 URL / 代理模式」取得抽卡紀錄。</p>
      </section>
    </main>

    <Setting
      v-show="state.showSetting"
      :i18n="state.i18n"
      :gacha-data-info="dataInfo"
      @refreshData="readData()"
      @changeLang="getI18nData()"
      @close="showSetting(false)"
    />

    <el-dialog :title="ui.urlDialog?.title || '手動貼上 URL'" v-model="state.showUrlDlg" width="90%" class="max-w-md">
      <p class="mb-4 text-gray-500">請貼上目前遊戲的祈願 / 躍遷紀錄 URL，程式會依照左側選擇的遊戲匯入。</p>
      <el-input type="textarea" :autosize="{ minRows: 4, maxRows: 7 }" placeholder="https://...authkey=..." v-model="state.urlInput" spellcheck="false" />
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="state.showUrlDlg = false">取消</el-button>
          <el-button type="primary" @click="state.showUrlDlg = false; fetchData(state.urlInput)">開始匯入</el-button>
        </span>
      </template>
    </el-dialog>

    <el-dialog title="AuthKey 過期處理" v-model="state.showCacheCleanDlg" width="90%" class="max-w-md cache-clean-dialog">
      <el-button plain icon="folder" type="success" @click="openCacheFolder">開啟快取資料夾</el-button>
      <p class="my-2 flex flex-col text-teal-800 text-[13px]">
        <span class="my-1" v-for="txt of cacheCleanTextList" :key="txt">{{ txt }}</span>
      </p>
      <template #footer>
        <div class="dialog-footer text-center">
          <el-button type="primary" @click="state.showCacheCleanDlg = false">確定</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
const { ipcRenderer } = require('electron')
import { reactive, computed, onMounted } from 'vue'
import PieChart from './components/PieChart.vue'
import GachaDetail from './components/GachaDetail.vue'
import Setting from './components/Setting.vue'
import gachaDetail from './gachaDetail'
import { version } from '../../package.json'
import genshinGachaType from './games/genshinGachaType.json'
import starrailGachaType from './games/starrailGachaType.json'
import zzzGachaType from './games/zzzGachaType.json'
import { ElMessage } from 'element-plus'

const games = [
  { key: 'genshin', name: '原神', title: '原神祈願紀錄', noviceType: '100' },
  { key: 'starrail', name: '星穹鐵道', title: '星穹鐵道躍遷紀錄', noviceType: '2' },
  { key: 'zzz', name: '絕區零', title: '絕區零調頻紀錄', noviceType: '1' }
]

const state = reactive({
  game: 'starrail',
  status: 'init',
  log: '',
  dataMap: new Map(),
  current: 0,
  showSetting: false,
  i18n: null,
  showUrlDlg: false,
  showCacheCleanDlg: false,
  urlInput: '',
  authkeyTimeout: false,
  config: {}
})

const ui = computed(() => state.i18n?.ui)
const currentGameMeta = computed(() => games.find(item => item.key === state.game) || games[1])
const pageTitle = computed(() => currentGameMeta.value.title)
const rarityLabels = computed(() => state.game === 'zzz'
  ? { top: 'S 級', mid: 'A 級', avg: '平均 S 級抽數', pity: '距離最近 S 級' }
  : { top: '五星', mid: '四星', avg: '平均五星抽數', pity: '距離最近五星' }
)

const dataMap = computed(() => {
  const result = new Map()
  for (let [uid, data] of state.dataMap) {
    if (!data.deleted) result.set(uid, data)
  }
  return result
})

const dataInfo = computed(() => {
  const result = []
  for (let [uid, data] of state.dataMap) result.push({ uid, time: data.time, deleted: data.deleted })
  return result
})

const gachaData = computed(() => dataMap.value.get(state.current))

const uidSelectText = computed(() => state.current === 0 ? '新增帳號' : state.current)

const cacheCleanTextList = computed(() => ui.value?.extra?.cacheClean?.split('\n') || [])

const allowClick = () => {
  const data = state.dataMap.get(state.current)
  if (!data) return true
  return Date.now() - data.time >= 1000 * 10
}

const hint = computed(() => {
  const data = state.dataMap.get(state.current)
  if (!state.i18n) return 'Loading...'
  const text = state.i18n.ui.hint
  const colon = state.i18n.symbol.colon
  if (state.status === 'init') return `選擇 ${currentGameMeta.value.name} 後載入資料。`
  if (state.status === 'loaded' && data) return `${text.lastUpdate}${colon}${new Date(data.time).toLocaleString()}`
  if (state.status === 'loading') return state.log || 'Loading...'
  if (state.status === 'updated') return state.log
  if (state.status === 'failed') return `${state.log} - ${text.failed}`
  return '　'
})

const detail = computed(() => {
  const data = gachaData.value
  if (data) return gachaDetail(data.result, state.game)
})

const typeMap = computed(() => {
  const lang = state.config.lang || 'zh-tw'
  const result = new Map()
  let list = []
  if (state.game === 'genshin') {
    list = genshinGachaType[lang] || genshinGachaType['zh-tw'] || genshinGachaType['zh-cn'] || []
  } else if (state.game === 'zzz') {
    const gachaTypeMap = new Map(zzzGachaType)
    list = gachaTypeMap.get(lang) || gachaTypeMap.get('zh-tw') || gachaTypeMap.get('zh-cn') || []
  } else {
    const gachaTypeMap = new Map(starrailGachaType)
    list = gachaTypeMap.get(lang) || gachaTypeMap.get('zh-tw') || gachaTypeMap.get('zh-cn') || []
  }
  for (let { key, name } of list) result.set(key, name)
  return result
})

const summary = computed(() => {
  const result = { total: 0, five: 0, four: 0, currentPity: 0, avg5: 0, fourRate: 0 }
  if (!detail.value) return result
  const fivePities = []
  for (let [, item] of detail.value) {
    result.total += item.total
    result.five += item.count5
    result.four += item.count4
    result.currentPity = Math.max(result.currentPity, item.countMio)
    item.ssrPos.forEach(pos => fivePities.push(pos[1]))
  }
  result.avg5 = fivePities.length ? Math.round((fivePities.reduce((a, b) => a + b, 0) / fivePities.length) * 10) / 10 : 0
  result.fourRate = result.total ? Math.round((result.four / result.total) * 1000) / 10 : 0
  return result
})

const applyPayload = (data) => {
  if (!data) return false
  state.game = data.game || state.game
  state.dataMap = data.dataMap || new Map()
  state.current = data.current || 0
  state.status = state.dataMap.get(state.current) ? 'loaded' : 'init'
  return true
}

const fetchData = async (url) => {
  state.log = ''
  state.status = 'loading'
  const data = await ipcRenderer.invoke('FETCH_DATA', url, state.game)
  if (applyPayload(data)) state.status = 'loaded'
  else state.status = 'failed'
}

const readData = async () => {
  const data = await ipcRenderer.invoke('READ_DATA', state.game)
  applyPayload(data)
}

const changeGame = async (game) => {
  state.game = game
  state.status = 'loading'
  const data = await ipcRenderer.invoke('CHANGE_GAME', game)
  applyPayload(data)
}

const getI18nData = async () => {
  const data = await ipcRenderer.invoke('I18N_DATA')
  if (data) {
    state.i18n = data
    setTitle()
  }
}

const saveExcel = async () => ipcRenderer.invoke('SAVE_EXCEL', state.game)
const openCacheFolder = async () => ipcRenderer.invoke('OPEN_CACHE_FOLDER', state.game)

const changeCurrent = async (uid) => {
  state.status = uid === 0 ? 'init' : 'loaded'
  state.current = uid
  await ipcRenderer.invoke('CHANGE_UID', uid, state.game)
}
const newUser = async () => changeCurrent(0)
const relaunch = async () => ipcRenderer.invoke('RELAUNCH')
const maskUid = (uid) => `${uid}`.replace(/(.{3})(.+)(.{3})$/, '$1***$3')

const showSetting = (show) => {
  state.showSetting = show
  if (!show) updateConfig()
}

const optionCommand = (type) => {
  if (type === 'setting') showSetting(true)
  else if (type === 'copyUrl') copyUrl()
  else if (type === 'cache') openCacheFolder()
  else if (type === 'relaunch') relaunch()
}

const setTitle = () => { document.title = `HoYo Gacha Center - v${version}` }
const updateConfig = async () => { state.config = await ipcRenderer.invoke('GET_CONFIG') }
const copyUrl = async () => {
  const successed = await ipcRenderer.invoke('COPY_URL', state.game)
  if (successed) ElMessage.success('已複製 URL')
  else ElMessage.error(state.i18n?.log?.url?.notFound || '找不到 URL')
}

onMounted(async () => {
  await getI18nData()
  await updateConfig()
  state.game = state.config.game || 'starrail'
  await readData()

  ipcRenderer.on('LOAD_DATA_STATUS', (event, message) => { state.log = message })
  ipcRenderer.on('ERROR', (event, err) => { console.error(err) })
  ipcRenderer.on('UPDATE_HINT', (event, message) => {
    state.log = message
    state.status = 'updated'
  })
  ipcRenderer.on('AUTHKEY_TIMEOUT', (event, message) => { state.authkeyTimeout = message })
})
</script>
