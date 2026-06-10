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
          :class="['game-button', { active: state.game === game.key, pending: state.pendingGame === game.key }]"
          :disabled="state.status === 'loading'"
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
      <div v-if="pageLoading" class="page-loading-mask">
        <div class="loading-card">
          <div class="loading-spinner"></div>
          <strong>{{ loadingTitle }}</strong>
          <span>{{ loadingText }}</span>
        </div>
      </div>

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

      <section v-if="pageLoading" class="pool-grid">
        <article class="pool-card skeleton-card" v-for="i in 6" :key="`skeleton-${i}`">
          <div class="skeleton-line skeleton-title"></div>
          <div class="skeleton-line skeleton-short"></div>
          <div class="skeleton-chart"></div>
          <div class="skeleton-line"></div>
          <div class="skeleton-line skeleton-wide"></div>
          <div class="skeleton-line skeleton-short"></div>
        </article>
      </section>

      <TransitionGroup v-else-if="detail" name="pool-fade" tag="section" class="pool-grid">
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
      </TransitionGroup>

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
      @changeLang="handleLangChanged"
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
import { reactive, computed, onMounted, shallowRef, watch, nextTick } from 'vue'
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
  pendingGame: '',
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

const detailData = shallowRef(null)
const detailLoading = shallowRef(false)
const detailCache = new Map()

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
const waitFrame = () => new Promise(resolve => requestAnimationFrame(resolve))

const ui = computed(() => state.i18n?.ui)
const currentGameMeta = computed(() => games.find(item => item.key === state.game) || games[1])
const pendingGameMeta = computed(() => games.find(item => item.key === state.pendingGame) || currentGameMeta.value)
const pageTitle = computed(() => currentGameMeta.value.title)
const pageLoading = computed(() => state.status === 'loading' || detailLoading.value)
const loadingTitle = computed(() => {
  if (state.pendingGame) return `正在切換到 ${pendingGameMeta.value.name}`
  if (detailLoading.value) return '正在整理統計資料'
  return `正在載入 ${currentGameMeta.value.name}`
})
const loadingText = computed(() => state.log || (detailLoading.value ? '正在重新計算卡池、稀有度與保底資料...' : '請稍候，正在讀取抽卡紀錄...'))
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

const getDetailCacheKey = () => {
  const data = gachaData.value
  if (!data) return ''

  return [
    state.game,
    state.current,
    data.time || 0,
    state.config.hideNovice ? 'hideNovice' : 'showNovice'
  ].join(':')
}

const clearDetailCache = () => {
  detailCache.clear()
}

watch(
  () => [gachaData.value, state.game, state.current, state.config.hideNovice],
  async () => {
    const data = gachaData.value

    if (!data) {
      detailData.value = null
      detailLoading.value = false
      return
    }

    const key = getDetailCacheKey()
    if (detailCache.has(key)) {
      detailData.value = detailCache.get(key)
      detailLoading.value = false
      return
    }

    detailLoading.value = true
    await nextTick()
    await waitFrame()

    const result = gachaDetail(data.result, state.game)
    detailCache.set(key, result)
    detailData.value = result
    detailLoading.value = false
  },
  { immediate: true }
)

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

const detail = computed(() => detailData.value)

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
  if (state.status === 'loading') return

  state.log = ''
  state.status = 'loading'

  await nextTick()
  await waitFrame()

  const start = Date.now()
  const data = await ipcRenderer.invoke('FETCH_DATA', url, state.game)

  const elapsed = Date.now() - start
  if (elapsed < 300) await sleep(300 - elapsed)

  clearDetailCache()

  if (applyPayload(data)) state.status = 'loaded'
  else state.status = 'failed'
}

const readData = async () => {
  state.status = 'loading'
  await nextTick()
  await waitFrame()

  const data = await ipcRenderer.invoke('READ_DATA', state.game)
  applyPayload(data)
}

const changeGame = async (game) => {
  if (state.game === game || state.status === 'loading') return

  state.pendingGame = game
  state.status = 'loading'
  state.log = `正在切換到 ${games.find(item => item.key === game)?.name || game}...`

  await nextTick()
  await waitFrame()

  const start = Date.now()
  const data = await ipcRenderer.invoke('CHANGE_GAME', game)

  const elapsed = Date.now() - start
  if (elapsed < 300) await sleep(300 - elapsed)

  applyPayload(data)
  state.pendingGame = ''
}

const getI18nData = async () => {
  const data = await ipcRenderer.invoke('I18N_DATA')
  if (data) {
    state.i18n = data
    setTitle()
  }
}

const handleLangChanged = async () => {
  await getI18nData()
  await updateConfig()
  clearDetailCache()
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

<style>
:root {
  --hoyo-bg: #070b18;
  --hoyo-card: rgba(255, 255, 255, 0.92);
  --hoyo-panel: rgba(15, 23, 42, 0.72);
  --hoyo-line: rgba(148, 163, 184, 0.18);
  --hoyo-text: #f8fafc;
  --hoyo-muted: #94a3b8;
  --hoyo-cyan: #67e8f9;
  --hoyo-blue: #60a5fa;
  --hoyo-purple: #a78bfa;
  --hoyo-gold: #facc15;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--hoyo-bg);
}

.app-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 292px minmax(0, 1fr);
  color: var(--hoyo-text);
  background:
    radial-gradient(circle at 12% 8%, rgba(103, 232, 249, 0.28), transparent 30%),
    radial-gradient(circle at 82% 0%, rgba(167, 139, 250, 0.25), transparent 28%),
    linear-gradient(135deg, #020617 0%, #0f172a 46%, #111827 100%);
  isolation: isolate;
}

.app-shell::before {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image:
    linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: linear-gradient(to bottom, rgba(0,0,0,0.65), transparent 72%);
  z-index: -1;
}

.sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  padding: 24px;
  border-right: 1px solid var(--hoyo-line);
  background: rgba(2, 6, 23, 0.56);
  backdrop-filter: blur(20px);
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  border-radius: 24px;
  border: 1px solid rgba(255,255,255,0.09);
  background: rgba(15, 23, 42, 0.58);
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}

.brand-icon {
  width: 48px;
  height: 48px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: 18px;
  color: white;
  font-size: 24px;
  font-weight: 950;
  background: linear-gradient(135deg, #06b6d4, #6366f1 58%, #a855f7);
  box-shadow: 0 14px 36px rgba(99, 102, 241, 0.38);
}

.brand-block h1 {
  margin: 0;
  font-size: 17px;
  line-height: 1.2;
  font-weight: 950;
  letter-spacing: -0.02em;
}

.brand-block p {
  margin: 4px 0 0;
  color: var(--hoyo-muted);
  font-size: 12px;
}

.game-switcher,
.side-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.game-button {
  position: relative;
  width: 100%;
  min-height: 48px;
  border: 1px solid rgba(148, 163, 184, 0.17);
  border-radius: 18px;
  padding: 12px 14px;
  color: #cbd5e1;
  background: rgba(15, 23, 42, 0.52);
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 900;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
}

.game-button::after {
  content: '';
  position: absolute;
  inset: 0;
  opacity: 0;
  background: linear-gradient(90deg, rgba(103,232,249,0.18), rgba(167,139,250,0.16));
  transition: opacity 0.18s ease;
}

.game-button > * {
  position: relative;
  z-index: 1;
}

.game-button:hover {
  transform: translateY(-1px);
  color: #ffffff;
  border-color: rgba(103, 232, 249, 0.5);
  box-shadow: 0 16px 42px rgba(2, 6, 23, 0.28);
}

.game-button:hover::after,
.game-button.active::after {
  opacity: 1;
}

.game-button.active {
  color: white;
  border-color: rgba(103, 232, 249, 0.75);
  background: rgba(8, 145, 178, 0.22);
  box-shadow: 0 16px 48px rgba(8, 145, 178, 0.18);
}

.game-dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: #64748b;
  box-shadow: 0 0 0 5px rgba(100, 116, 139, 0.12);
}

.game-button.active .game-dot {
  background: var(--hoyo-cyan);
  box-shadow: 0 0 0 5px rgba(103, 232, 249, 0.18), 0 0 18px rgba(103, 232, 249, 0.8);
}

.side-panel {
  padding: 16px;
  border-radius: 22px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(15, 23, 42, 0.46);
}

.side-label {
  margin: 0 0 10px;
  color: var(--hoyo-muted);
  font-size: 12px;
  font-weight: 900;
}

.current-uid {
  min-height: 38px;
  padding: 10px 12px;
  border-radius: 14px;
  color: #e2e8f0;
  background: rgba(2, 6, 23, 0.42);
  font-weight: 900;
}

.account-select,
.action-button {
  width: 100%;
}

.side-actions {
  margin-top: auto;
}

.side-actions .el-button + .el-button {
  margin-left: 0;
}

.main-content {
  position: relative;
  min-width: 0;
  padding: 28px;
}

.hero-card {
  min-height: 168px;
  padding: 30px;
  border-radius: 32px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background:
    linear-gradient(135deg, rgba(14, 165, 233, 0.26), rgba(139, 92, 246, 0.2)),
    rgba(15, 23, 42, 0.76);
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.28);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 18px;
  overflow: hidden;
}

.hero-card::after {
  content: '';
  position: absolute;
  width: 320px;
  height: 320px;
  right: 4%;
  top: -160px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(103, 232, 249, 0.24), transparent 62%);
  pointer-events: none;
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--hoyo-cyan);
  font-size: 13px;
  font-weight: 950;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.hero-card h2 {
  position: relative;
  margin: 0;
  color: white;
  font-size: clamp(30px, 4vw, 48px);
  line-height: 1.04;
  font-weight: 950;
  letter-spacing: -0.04em;
}

.hero-hint {
  margin: 14px 0 0;
  color: #cbd5e1;
  font-size: 14px;
}

.header-actions {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.stat-grid {
  margin-top: 22px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.stat-card {
  position: relative;
  padding: 20px;
  border-radius: 26px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(15, 23, 42, 0.67);
  box-shadow: 0 22px 70px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.stat-card::after {
  content: '';
  position: absolute;
  inset: auto -20px -48px auto;
  width: 120px;
  height: 120px;
  border-radius: 999px;
  background: rgba(103, 232, 249, 0.09);
}

.stat-card:hover {
  transform: translateY(-2px);
  border-color: rgba(103, 232, 249, 0.28);
  background: rgba(15, 23, 42, 0.78);
}

.stat-card span {
  color: var(--hoyo-muted);
  font-size: 12px;
  font-weight: 950;
}

.stat-card strong {
  display: block;
  margin-top: 9px;
  color: white;
  font-size: 36px;
  line-height: 1;
  font-weight: 950;
}

.stat-card small {
  display: block;
  margin-top: 9px;
  color: #94a3b8;
  font-size: 12px;
}

.stat-card.gold strong { color: var(--hoyo-gold); }
.stat-card.purple strong { color: #c084fc; }
.stat-card.cyan strong { color: var(--hoyo-cyan); }

.pool-grid {
  margin-top: 22px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 18px;
}

.pool-card {
  min-width: 0;
  padding: 20px;
  border-radius: 28px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: var(--hoyo-card);
  color: #0f172a;
  box-shadow: 0 26px 80px rgba(0, 0, 0, 0.22);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.pool-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 32px 90px rgba(0, 0, 0, 0.26);
}

.pool-card.hidden {
  display: none;
}

.pool-header p {
  margin: 0;
  color: #0f172a;
  font-size: 18px;
  font-weight: 950;
}

.pool-header span {
  display: block;
  margin-top: 6px;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.empty-card {
  margin-top: 22px;
  padding: 46px;
  border-radius: 32px;
  border: 1px dashed rgba(148, 163, 184, 0.42);
  background: rgba(15, 23, 42, 0.58);
  text-align: center;
}

.empty-card h3 {
  margin: 0;
  color: white;
  font-size: 22px;
  font-weight: 950;
}

.empty-card p {
  margin: 12px auto 0;
  max-width: 560px;
  color: var(--hoyo-muted);
  line-height: 1.8;
}

.page-loading-mask {
  position: fixed;
  inset: 0 0 0 292px;
  z-index: 80;
  display: grid;
  place-items: center;
  background: rgba(2, 6, 23, 0.44);
  backdrop-filter: blur(12px);
  animation: hoyoFadeIn 0.16s ease-out;
}

.loading-card {
  min-width: 284px;
  padding: 24px 28px;
  border-radius: 26px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: rgba(15, 23, 42, 0.94);
  box-shadow: 0 24px 84px rgba(0, 0, 0, 0.38);
  color: #e2e8f0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}

.loading-card strong {
  font-size: 16px;
  font-weight: 950;
}

.loading-card span {
  color: var(--hoyo-muted);
  font-size: 12px;
}

.loading-spinner {
  width: 38px;
  height: 38px;
  border: 3px solid rgba(148, 163, 184, 0.25);
  border-top-color: var(--hoyo-cyan);
  border-radius: 999px;
  animation: hoyoSpin 0.8s linear infinite;
}

.game-button.pending {
  color: #ecfeff;
  border-color: rgba(103, 232, 249, 0.95);
  background: rgba(8, 145, 178, 0.34);
  box-shadow: 0 0 0 4px rgba(103, 232, 249, 0.08);
}

.game-button.pending .game-dot {
  background: var(--hoyo-cyan);
  box-shadow: 0 0 0 4px rgba(103, 232, 249, 0.16);
}

.skeleton-card {
  min-height: 320px;
  pointer-events: none;
}

.skeleton-line,
.skeleton-chart {
  position: relative;
  overflow: hidden;
  background: #e2e8f0;
}

.skeleton-line {
  height: 12px;
  margin-bottom: 12px;
  border-radius: 999px;
}

.skeleton-title { width: 48%; height: 18px; }
.skeleton-short { width: 68%; }
.skeleton-wide { width: 88%; }

.skeleton-chart {
  width: 132px;
  height: 132px;
  margin: 24px auto;
  border-radius: 999px;
}

.skeleton-line::after,
.skeleton-chart::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.72), transparent);
  animation: shimmer 1.15s infinite;
}

.pool-fade-enter-active { transition: all 0.22s ease; }
.pool-fade-enter-from { opacity: 0; transform: translateY(10px) scale(0.98); }
.pool-fade-enter-to { opacity: 1; transform: translateY(0) scale(1); }
.pool-fade-leave-active { transition: all 0.14s ease; }
.pool-fade-leave-to { opacity: 0; transform: translateY(6px) scale(0.99); }

@keyframes shimmer {
  100% { transform: translateX(100%); }
}

.el-button {
  font-weight: 800;
  border-radius: 12px !important;
}

.el-select .el-input__wrapper,
.el-textarea__inner {
  border-radius: 14px !important;
}

@keyframes hoyoSpin {
  to { transform: rotate(360deg); }
}

@keyframes hoyoFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@media (max-width: 1180px) {
  .stat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .pool-grid { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
}

@media (max-width: 960px) {
  .app-shell { grid-template-columns: 1fr; }
  .sidebar { position: relative; height: auto; }
  .main-content { padding: 18px; }
  .page-loading-mask { inset: 0; }
  .hero-card { flex-direction: column; }
  .header-actions { justify-content: flex-start; }
}

@media (max-width: 640px) {
  .stat-grid, .pool-grid { grid-template-columns: 1fr; }
  .hero-card { padding: 22px; border-radius: 24px; }
  .empty-card { padding: 28px 20px; }
}
</style>
