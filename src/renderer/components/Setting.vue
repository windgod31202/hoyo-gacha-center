<template>
  <div class="setting-overlay bg-white py-4 px-6 w-screen h-screen fixed inset-0 overflow-y-auto">
    <div class="flex content-center items-center mb-4 justify-between">
      <h3 class="text-lg">{{text.title}}</h3>
      <el-button
        icon="close"
        @click="closeSetting"
        plain
        circle
        type="default"
        class="setting-close-button w-8 h-8 shadow-md focus:shadow-none focus:outline-none fixed top-4 right-6"
      />
    </div>
    <el-form :model="settingForm" label-width="120px">
      <el-form-item :label="text.language">
        <el-select @change="saveLang" v-model="settingForm.lang" class="!w-44">
          <el-option v-for="item of data.langMap" :key="item[0]" :label="item[1]" :value="item[0]"></el-option>
        </el-select>
        <p class="text-gray-400 text-xs m-1.5">{{text.languageHint}}</p>
      </el-form-item>
      <el-form-item :label="text.logType">
        <el-radio-group @change="saveSetting" v-model.number="settingForm.logType">
          <el-radio-button :label="0">{{text.auto}}</el-radio-button>
          <el-radio-button :label="1">{{text.cnServer}}</el-radio-button>
          <el-radio-button :label="2">{{text.seaServer}}</el-radio-button>
        </el-radio-group>
        <p class="text-gray-400 text-xs m-1.5">{{text.logTypeHint}}</p>
      </el-form-item>
      <el-form-item :label="common.data">
        <el-button type="primary" plain @click="state.showDataDialog = true">{{common.dataManage}}</el-button>
        <p class="text-gray-400 text-xs m-1.5">{{text.dataManagerHint}}</p>
      </el-form-item>

      <el-form-item label="UIGF v4.2">
        <div class="uigf42-panel">
          <div class="uigf42-header">
            <div>
              <strong>UIGF v4.2 匯入 / 匯出</strong>
              <p>支援 UIGF v4.0 / v4.1 / v4.2 匯入，並預設匯出 v4.2。UIGF API 字典目前用於原神與星鐵的 item_id / 名稱標準化。</p>
            </div>
          </div>

          <div class="uigf42-actions">
            <el-button type="primary" plain :loading="uigf42.importing" @click="importUigfV42">匯入 UIGF JSON</el-button>
            <el-button type="success" plain :loading="uigf42.exporting" @click="exportUigfV42">匯出 UIGF v4.2</el-button>
            <el-button plain :loading="uigf42.updatingDict" @click="updateUigfDict">更新 UIGF 字典</el-button>
            <el-button plain @click="openUigfDictFolder">開啟字典資料夾</el-button>
          </div>

          <el-alert
            class="uigf42-alert"
            type="info"
            :closable="false"
            title="UIGF API 不是抽卡抓取 API；這裡只用來更新原神 / 星鐵字典，協助補 item_id 與多語言名稱。"
          />

          <el-table v-if="uigf42.dictStatus.length" :data="uigf42.dictStatus" border size="small" class="uigf42-table">
            <el-table-column prop="gameName" label="遊戲" min-width="120" />
            <el-table-column label="狀態" min-width="170">
              <template #default="scope">
                <el-tag v-if="!scope.row.supported" type="info">API 字典暫不支援</el-tag>
                <el-tag v-else-if="scope.row.exists" type="success">已下載</el-tag>
                <el-tag v-else type="warning">尚未下載</el-tag>
                <p class="uigf42-small">語言：{{ scope.row.lang || '-' }}</p>
                <p class="uigf42-small">筆數：{{ scope.row.count || 0 }}</p>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-form-item>

      <el-form-item :label="text.autoUpdate">
        <el-switch
          @change="saveSetting"
          v-model="settingForm.autoUpdate">
        </el-switch>
      </el-form-item>
      <el-form-item :label="text.hideNovice">
        <el-switch
          @change="saveSetting"
          v-model="settingForm.hideNovice">
        </el-switch>
      </el-form-item>
      <el-form-item :label="text.fetchFullHistory">
        <el-switch
          @change="saveSetting"
          v-model="settingForm.fetchFullHistory">
        </el-switch>
        <p class="text-gray-400 text-xs m-1.5">{{text.fetchFullHistoryHint}}</p>
      </el-form-item>
      <el-form-item :label="text.proxyMode">
        <el-switch
          @change="saveSetting"
          v-model="settingForm.proxyMode">
        </el-switch>
        <p class="text-gray-400 text-xs m-1.5">{{text.proxyModeHint}}</p>
        <el-button class="focus:outline-none" @click="disableProxy">{{text.closeProxy}}</el-button>
        <p class="text-gray-400 text-xs m-1.5">{{text.closeProxyHint}}</p>
      </el-form-item>

      <el-form-item label="模組更新">
        <div class="module-update-panel">
          <div class="module-update-header">
            <div>
              <strong>半自動更新模組</strong>
              <p>只檢查原神 / 星鐵 / 絕區零上游版本；安全套用時只更新卡池類型等設定檔，不會覆蓋整合 UI 或主程式。</p>
            </div>
            <el-button type="primary" plain :loading="moduleUpdate.loading" @click="checkModuleUpdates">檢查更新</el-button>
          </div>

          <el-alert
            class="module-update-alert"
            type="warning"
            :closable="false"
            title="原作者整包 autoUpdate 已建議關閉。這裡的安全套用只會更新 allowlist 設定檔；核心抓取邏輯仍建議手動合併。"
          />

          <div v-if="moduleUpdate.checkedAt" class="module-update-time">
            上次檢查：{{ new Date(moduleUpdate.checkedAt).toLocaleString() }}
          </div>

          <div v-if="moduleUpdate.app" class="app-update-card">
            <div class="app-update-header">
              <div>
                <strong>HoYo Gacha Center 本體更新</strong>
                <p>{{ moduleUpdate.app.repo }}</p>
              </div>

              <el-tag v-if="moduleUpdate.app.error" type="danger">檢查失敗</el-tag>
              <el-tag v-else-if="moduleUpdate.app.updateAvailable" type="danger">有新版本</el-tag>
              <el-tag v-else type="success">已是最新</el-tag>
            </div>

            <div class="app-update-versions">
              <div>
                <span>目前版本</span>
                <strong>{{ moduleUpdate.app.currentVersion || '-' }}</strong>
              </div>
              <div>
                <span>最新版本</span>
                <strong>{{ moduleUpdate.app.latestVersion || '-' }}</strong>
              </div>
            </div>

            <p v-if="moduleUpdate.app.releaseTitle" class="app-update-title">
              {{ moduleUpdate.app.releaseTitle }}
            </p>
            <p v-if="moduleUpdate.app.error" class="module-update-error">
              {{ moduleUpdate.app.error }}
            </p>

            <div class="app-update-actions">
              <el-button
                type="primary"
                plain
                :loading="moduleUpdate.autoUpdateStatus === 'checking'"
                @click="checkAppAutoUpdate"
              >
                檢查本體更新
              </el-button>

              <el-button
                v-if="moduleUpdate.app?.updateAvailable"
                type="success"
                plain
                :loading="moduleUpdate.autoUpdating"
                @click="oneClickAppUpdate"
              >
                一鍵下載更新
              </el-button>

              <el-button
                v-if="moduleUpdate.autoUpdateStatus === 'available'"
                type="success"
                plain
                :loading="moduleUpdate.autoUpdating"
                @click="downloadAppUpdate"
              >
                下載更新
              </el-button>

              <el-button
                v-if="moduleUpdate.autoDownloaded || moduleUpdate.autoUpdateStatus === 'downloaded'"
                type="danger"
                plain
                @click="installAppUpdate"
              >
                立即重啟並安裝
              </el-button>

              <el-button
                plain
                :disabled="!moduleUpdate.app?.releaseUrl"
                @click="openAppRelease"
              >
                開啟下載頁
              </el-button>
            </div>

            <div v-if="moduleUpdate.autoUpdateMessage" class="app-auto-update-status">
              <p>{{ moduleUpdate.autoUpdateMessage }}</p>

              <el-progress
                v-if="moduleUpdate.autoUpdateStatus === 'downloading'"
                :percentage="moduleUpdate.autoUpdateProgress"
              />
            </div>
          </div>

          <el-empty v-if="moduleUpdate.checkedAt && !moduleUpdate.items.length" description="沒有上游模組資料" />

          <el-table v-if="moduleUpdate.items.length" :data="moduleUpdate.items" border size="small" class="module-update-table">
            <el-table-column prop="name" label="模組" min-width="150" />
            <el-table-column label="狀態" min-width="180">
              <template #default="scope">
                <el-tag v-if="scope.row.error" type="danger">檢查失敗</el-tag>
                <el-tag v-else-if="scope.row.updateAvailable" type="warning">有新版本</el-tag>
                <el-tag v-else type="success">已檢視</el-tag>
                <p class="module-update-small">目前記錄：{{ scope.row.reviewedVersion || '-' }}</p>
                <p class="module-update-small">上游版本：{{ scope.row.latestVersion || '-' }}</p>
                <p v-if="scope.row.error" class="module-update-error">{{ scope.row.error }}</p>
              </template>
            </el-table-column>
            <el-table-column label="安全更新範圍" min-width="170">
              <template #default="scope">
                <span>{{ (scope.row.safeUpdateFiles || []).join('、') || '無' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="310">
              <template #default="scope">
                <el-button size="small" plain @click="openModuleRelease(scope.row.game)">看更新</el-button>
                <el-button size="small" plain type="success" :disabled="!!scope.row.error" @click="applySafeModuleUpdate(scope.row)">安全套用</el-button>
                <el-button size="small" plain type="warning" :disabled="!!scope.row.error" @click="markModuleReviewed(scope.row)">標記已檢視</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-form-item>
    </el-form>
    <h3 class="text-lg my-4">{{about.title}}</h3>
    <p class="text-gray-600 text-xs mt-1">{{text.idVersion}} {{idJson.version}}</p>
    <p class="text-gray-600 text-xs mt-1">{{about.license}}</p>
    <p class="text-gray-600 text-xs mt-1">Github: <a @click="openGithub" class="cursor-pointer text-blue-400">https://github.com/windgod31202/hoyo-gacha-center</a></p>
    <p class="text-gray-600 text-xs mt-1 pb-6">UIGF: <a @click="openUIGF" class="cursor-pointer text-blue-400">https://uigf.org/</a></p>
    <el-dialog v-model="state.showDataDialog" :title="common.dataManage" width="90%">
      <div class="">
        <el-table :data="gachaDataInfo" border stripe>
          <el-table-column property="uid" label="UID" width="128" />
          <el-table-column property="time" :label="common.updateTime">
            <template #default="scope">
              {{ new Date(scope.row.time).toLocaleString() }}
            </template>
          </el-table-column>
          <el-table-column property="deleted" :label="common.status" width="128">
            <template #default="scope">
              <el-tag type="info" size="small" v-if="scope.row.deleted">{{common.deleted}}</el-tag>
              <el-tag type="success" size="small" v-else>{{common.normal}}</el-tag>
            </template>
          </el-table-column>
          <el-table-column property="deleted" :label="common.action" width="128">
            <template #default="scope">
              <el-tooltip :content="scope.row.deleted ? common.restore : common.delete" placement="top">
                <el-button :loading="state.dataActionLoading" size="small" icon="refresh" plain type="success" @click="deleteData(scope.row.uid, false)" v-if="scope.row.deleted"></el-button>
                <el-button :loading="state.dataActionLoading" size="small" icon="delete" plain type="danger" @click="deleteData(scope.row.uid, true)" v-else></el-button>
              </el-tooltip>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>
  </div>

</template>

<script setup>
const { ipcRenderer, shell } = require('electron')
import idJson from '../../idJson.json'
import { reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const emit = defineEmits(['close', 'changeLang', 'refreshData'])

const props = defineProps({
  i18n: Object,
  gachaDataInfo: Array
})

const data = reactive({
  langMap: new Map(),
})

const settingForm = reactive({
  lang: 'zh-cn',
  logType: 1,
  proxyMode: true,
  autoUpdate: false,
  fetchFullHistory: false,
  hideNovice: true
})

const state = reactive({
  showDataDialog: false,
  dataActionLoading: false
})

const moduleUpdate = reactive({
  loading: false,
  applying: false,
  checkedAt: 0,
  app: null,
  items: [],

  autoUpdateStatus: '',
  autoUpdateMessage: '',
  autoUpdateProgress: 0,
  autoUpdating: false,
  autoDownloaded: false
})

const uigf42 = reactive({
  importing: false,
  exporting: false,
  updatingDict: false,
  dictStatus: []
})

const common = computed(() => props.i18n.ui.common)
const text = computed(() => props.i18n.ui.setting)
const about = computed(() => props.i18n.ui.about)

const saveSetting = async () => {
  const keys = ['lang', 'logType', 'proxyMode', 'autoUpdate', 'fetchFullHistory', 'hideNovice']
  for (let key of keys) {
    await ipcRenderer.invoke('SAVE_CONFIG', [key, settingForm[key]])
  }
}

const saveLang = async () => {
  await saveSetting()
  emit('changeLang')
}

const closeSetting = () => emit('close')

const disableProxy = async () => {
  await ipcRenderer.invoke('DISABLE_PROXY')
}

const openGithub = () => shell.openExternal('https://github.com/windgod31202/hoyo-gacha-center')
const openUIGF = () => shell.openExternal('https://uigf.org/')
const openLink = (link) => shell.openExternal(link)

const deleteData = async (uid, action) => {
  state.dataActionLoading = true
  await ipcRenderer.invoke('DELETE_DATA', uid, action)
  state.dataActionLoading = false
  emit('refreshData')
}


const checkModuleUpdates = async () => {
  moduleUpdate.loading = true
  try {
    const result = await ipcRenderer.invoke('MODULE_UPDATE_CHECK')

    moduleUpdate.checkedAt = result.checkedAt || Date.now()
    moduleUpdate.app = result.app || null
    moduleUpdate.items = result.modules || result.items || []

    const appHasUpdate = !!moduleUpdate.app?.updateAvailable
    const moduleCount = moduleUpdate.items.filter(item => item.updateAvailable).length

    if (appHasUpdate && moduleCount) {
      ElMessage.warning(`發現 App 新版本，並有 ${moduleCount} 個上游模組可檢視`)
    } else if (appHasUpdate) {
      ElMessage.warning(`發現 HoYo Gacha Center 新版本：${moduleUpdate.app.latestVersion}`)
    } else if (moduleCount) {
      ElMessage.warning(`發現 ${moduleCount} 個上游模組有新版本`)
    } else {
      ElMessage.success('目前沒有可用更新')
    }

    console.log('MODULE_UPDATE_CHECK result:', result)
  } catch (e) {
    ElMessage.error(`檢查更新失敗：${e.message || e}`)
  } finally {
    moduleUpdate.loading = false
  }
}

const checkAppAutoUpdate = async () => {
  moduleUpdate.autoUpdating = true
  moduleUpdate.autoDownloaded = false
  moduleUpdate.autoUpdateProgress = 0

  try {
    await ipcRenderer.invoke('APP_AUTO_UPDATE_CHECK')
  } catch (e) {
    ElMessage.error(`檢查 App 更新失敗：${e.message || e}`)
  } finally {
    moduleUpdate.autoUpdating = false
  }
}

const downloadAppUpdate = async () => {
  moduleUpdate.autoUpdating = true
  moduleUpdate.autoDownloaded = false
  moduleUpdate.autoUpdateProgress = 0

  try {
    await ipcRenderer.invoke('APP_AUTO_UPDATE_DOWNLOAD')
  } catch (e) {
    ElMessage.error(`下載 App 更新失敗：${e.message || e}`)
    moduleUpdate.autoUpdating = false
  }
}

const oneClickAppUpdate = async () => {
  moduleUpdate.autoUpdating = true
  moduleUpdate.autoDownloaded = false
  moduleUpdate.autoUpdateProgress = 0

  try {
    await ipcRenderer.invoke('APP_AUTO_UPDATE_CHECK_AND_DOWNLOAD')
  } catch (e) {
    ElMessage.error(`一鍵更新失敗：${e.message || e}`)
    moduleUpdate.autoUpdating = false
  }
}

const installAppUpdate = async () => {
  try {
    await ElMessageBox.confirm(
      '程式將重新啟動並安裝新版，是否繼續？',
      '安裝更新',
      {
        confirmButtonText: '立即安裝',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await ipcRenderer.invoke('APP_AUTO_UPDATE_INSTALL')
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error(`安裝更新失敗：${e.message || e}`)
    }
  }
}

const openAppRelease = async () => {
  await ipcRenderer.invoke('APP_UPDATE_OPEN_RELEASE')
}

const openModuleRelease = async (game) => {
  await ipcRenderer.invoke('MODULE_UPDATE_OPEN_RELEASE', game)
}

const markModuleReviewed = async (row) => {
  await ipcRenderer.invoke('MODULE_UPDATE_MARK_REVIEWED', row.game, row.latestVersion, row.releaseUrl)
  ElMessage.success(`${row.name} 已標記為檢視：${row.latestVersion}`)
  await checkModuleUpdates()
}

const applySafeModuleUpdate = async (row) => {
  try {
    await ElMessageBox.confirm(
      `將只更新「${row.name}」的安全設定檔，例如卡池類型對照表；不會覆蓋整合 UI、main.js 或 package.json。更新前會自動備份。是否繼續？`,
      '安全套用模組更新',
      { confirmButtonText: '套用', cancelButtonText: '取消', type: 'warning' }
    )
    moduleUpdate.applying = true
    const result = await ipcRenderer.invoke('MODULE_UPDATE_APPLY_SAFE', row.game)
    await ipcRenderer.invoke('MODULE_UPDATE_MARK_REVIEWED', row.game, row.latestVersion, row.releaseUrl)
    ElMessage.success(`已更新 ${result.changedFiles.length} 個檔案，備份已建立`)
    await checkModuleUpdates()
  } catch (e) {
    if (e !== 'cancel') ElMessage.error(`安全套用失敗：${e.message || e}`)
  } finally {
    moduleUpdate.applying = false
  }
}


const refreshUigfDictStatus = async () => {
  try {
    uigf42.dictStatus = await ipcRenderer.invoke('UIGF_V42_DICT_STATUS', {
      lang: settingForm.lang
    })
  } catch (e) {
    console.error(e)
  }
}

const updateUigfDict = async () => {
  uigf42.updatingDict = true
  try {
    const result = await ipcRenderer.invoke('UIGF_V42_UPDATE_DICT', {
      lang: settingForm.lang,
      games: ['genshin', 'starrail']
    })
    const updated = result.filter(item => item.updated).length
    if (updated) ElMessage.success(`UIGF 字典更新完成：${updated} 個語言包已更新`)
    else ElMessage.success('UIGF 字典已是最新')
    await refreshUigfDictStatus()
  } catch (e) {
    ElMessage.error(`UIGF 字典更新失敗：${e.message || e}`)
  } finally {
    uigf42.updatingDict = false
  }
}

const importUigfV42 = async () => {
  uigf42.importing = true
  try {
    const result = await ipcRenderer.invoke('UIGF_V42_IMPORT')
    if (result?.canceled) return
    const unsupported = result.unsupported?.length ? `，略過：${result.unsupported.join('、')}` : ''
    ElMessage.success(`已匯入 ${result.importedAccounts} 個帳號、${result.importedRecords} 筆紀錄${unsupported}`)
    emit('refreshData')
  } catch (e) {
    ElMessage.error(`UIGF 匯入失敗：${e.message || e}`)
  } finally {
    uigf42.importing = false
  }
}

const exportUigfV42 = async () => {
  uigf42.exporting = true
  try {
    const result = await ipcRenderer.invoke('UIGF_V42_EXPORT')
    if (result?.canceled) return
    const counts = result.counts || {}
    ElMessage.success(`已匯出 UIGF ${result.version}：原神 ${counts.hk4e || 0}、星鐵 ${counts.hkrpg || 0}、絕區零 ${counts.nap || 0} 筆`)
  } catch (e) {
    ElMessage.error(`UIGF 匯出失敗：${e.message || e}`)
  } finally {
    uigf42.exporting = false
  }
}

const openUigfDictFolder = async () => {
  await ipcRenderer.invoke('UIGF_V42_OPEN_DICT_FOLDER')
}

onMounted(async () => {
  ipcRenderer.on('APP_AUTO_UPDATE_STATUS', (event, payload) => {
    moduleUpdate.autoUpdateStatus = payload.status
    moduleUpdate.autoUpdateMessage = payload.message || ''

    if (payload.progress) {
      moduleUpdate.autoUpdateProgress = Math.round(payload.progress.percent || 0)
    }

    if (payload.status === 'checking') {
      moduleUpdate.autoUpdating = true
    }

    if (payload.status === 'available') {
      moduleUpdate.autoUpdating = false
      moduleUpdate.autoDownloaded = false
      ElMessage.warning(payload.message)
    }

    if (payload.status === 'not-available') {
      moduleUpdate.autoUpdating = false
      moduleUpdate.autoDownloaded = false
      ElMessage.success(payload.message)
    }

    if (payload.status === 'downloading') {
      moduleUpdate.autoUpdating = true
    }

    if (payload.status === 'downloaded') {
      moduleUpdate.autoUpdating = false
      moduleUpdate.autoDownloaded = true
      ElMessage.success(payload.message)
    }

    if (payload.status === 'dev-mode') {
      moduleUpdate.autoUpdating = false
      ElMessage.warning(payload.message)
    }

    if (payload.status === 'error') {
      moduleUpdate.autoUpdating = false
      moduleUpdate.autoDownloaded = false
      ElMessage.error(payload.message)
    }
  })
  data.langMap = await ipcRenderer.invoke('LANG_MAP')
  const config = await ipcRenderer.invoke('GET_CONFIG')
  Object.assign(settingForm, config)
  await refreshUigfDictStatus()
})

</script>

<style>
.el-form-item__label {
  line-height: normal !important;
  position: relative;
  top: 6px;
}
.el-form-item__content {
  flex-direction: column;
  align-items: start !important;
}
.el-form-item--default {
  margin-bottom: 14px !important;
}

.uigf42-panel {
  width: 100%;
  max-width: 920px;
  border: 1px solid #d1fae5;
  border-radius: 14px;
  padding: 14px;
  background: linear-gradient(135deg, #f8fffb, #effdf5);
}
.uigf42-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.uigf42-header strong {
  color: #064e3b;
}
.uigf42-header p,
.uigf42-small {
  margin: 4px 0;
  font-size: 12px;
  color: #64748b;
}
.uigf42-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0;
}
.uigf42-alert {
  margin: 12px 0;
}
.uigf42-table {
  margin-top: 10px;
}

.module-update-panel {
  width: 100%;
  max-width: 920px;
  border: 1px solid #dbeafe;
  border-radius: 14px;
  padding: 14px;
  background: linear-gradient(135deg, #f8fbff, #eef6ff);
}
.module-update-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.module-update-header strong {
  color: #0f172a;
}
.module-update-header p,
.module-update-time,
.module-update-small {
  margin: 4px 0;
  font-size: 12px;
  color: #64748b;
}
.module-update-alert {
  margin: 12px 0;
}
.module-update-table {
  margin-top: 10px;
}
.module-update-error {
  margin: 4px 0 0;
  color: #dc2626;
  font-size: 12px;
}

.app-update-card {
  margin: 12px 0;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid #bfdbfe;
  background: linear-gradient(135deg, #eff6ff, #f8fbff);
}
.app-update-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}
.app-update-header strong {
  color: #1e3a8a;
}
.app-update-header p {
  margin: 4px 0;
  font-size: 12px;
  color: #64748b;
}
.app-update-versions {
  margin-top: 12px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.app-update-versions div {
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid #dbeafe;
}
.app-update-versions span {
  display: block;
  font-size: 12px;
  color: #64748b;
}
.app-update-versions strong {
  display: block;
  margin-top: 4px;
  color: #0f172a;
  font-size: 14px;
}
.app-update-title {
  margin: 10px 0 0;
  color: #334155;
  font-size: 13px;
  line-height: 1.6;
}
.app-update-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}
.setting-overlay {
  z-index: 9999;
  background: #ffffff;
}

.setting-close-button {
  z-index: 10050 !important;
  pointer-events: auto;
}

.setting-overlay .el-form,
.setting-overlay .el-dialog,
.setting-overlay .el-table,
.setting-overlay .el-card,
.setting-overlay .module-update-panel,
.setting-overlay .uigf42-panel {
  position: relative;
  z-index: 1;
}
.app-auto-update-status {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid #dbeafe;
}

.app-auto-update-status p {
  margin: 0 0 8px;
  color: #334155;
  font-size: 13px;
}
</style>