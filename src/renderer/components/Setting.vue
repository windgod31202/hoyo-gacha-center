<template>
  <div class="bg-white py-4 px-6 w-screen h-screen fixed inset-0 overflow-y-auto">
    <div class="flex content-center items-center mb-4 justify-between">
      <h3 class="text-lg">{{text.title}}</h3>
      <el-button icon="close" @click="closeSetting" plain circle type="default" class="w-8 h-8 shadow-md focus:shadow-none focus:outline-none fixed top-4 right-6"></el-button>
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
    <p class="text-gray-600 text-xs mt-1">Github: <a @click="openGithub" class="cursor-pointer text-blue-400">https://github.com/biuuu/star-rail-warp-export</a></p>
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
  items: []
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

const openGithub = () => shell.openExternal('https://github.com/biuuu/star-rail-warp-export')
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
    moduleUpdate.checkedAt = result.checkedAt
    moduleUpdate.items = result.items || []
    const count = moduleUpdate.items.filter(item => item.updateAvailable).length
    if (count) ElMessage.warning(`發現 ${count} 個上游模組有新版本`)
    else ElMessage.success('目前沒有未檢視的上游版本')
  } catch (e) {
    ElMessage.error(`檢查更新失敗：${e.message || e}`)
  } finally {
    moduleUpdate.loading = false
  }
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

onMounted(async () => {
  data.langMap = await ipcRenderer.invoke('LANG_MAP')
  const config = await ipcRenderer.invoke('GET_CONFIG')
  Object.assign(settingForm, config)
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
</style>