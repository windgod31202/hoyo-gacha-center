# HoYo Gacha Center

HoYo Gacha Center 是一個整合多款 miHoYo / HoYoverse 遊戲的抽卡紀錄分析系統，目標是將不同遊戲、不同工具產生的抽卡紀錄資料整合到同一個桌面應用程式中，方便玩家查詢、統計、備份與分析抽卡資料。

> 本專案目前主要整合並支援：原神、崩壞：星穹鐵道、絕區零。

## 作者

* 整合與二次開發：WindGod
* GitHub：[WindGod](https://github.com/windgod31202)

## 專案定位

本專案是基於多個既有開源抽卡紀錄工具進行整合、介面優化與功能擴充，目標是建立一個統一的 HoYoverse 抽卡分析中心。

目前整合方向包含：

* 原神祈願紀錄分析
* 崩壞：星穹鐵道躍遷紀錄分析
* 絕區零調頻紀錄分析
* 多遊戲資料切換
* 本地抽卡紀錄保存
* 抽卡統計與保底分析
* Excel / JSON 匯出
* 未來支援資料匯入、去重融合與半自動模組更新

## 主要功能

### 多遊戲整合

支援在同一個桌面應用程式中管理不同 HoYoverse 遊戲的抽卡紀錄。

目前規劃與整合遊戲包含：

* Genshin Impact / 原神
* Honkai: Star Rail / 崩壞：星穹鐵道
* Zenless Zone Zero / 絕區零

### 抽卡紀錄分析

可讀取遊戲抽卡 API 回傳資料，並整理成可視化紀錄與統計資訊。

功能包含：

* 抽卡紀錄列表
* 稀有度統計
* 卡池類型分類
* 保底進度分析
* 角色 / 武器 / 音擎資料統計
* 多 UID 資料保存

### 本地資料保存

抽卡紀錄會保存在本機資料中，方便後續查詢、備份或匯出。

未來規劃支援：

* 匯入原作者工具輸出的 JSON
* 匯入 UIGF / SRGF / ZZZGF 格式
* 自動合併不同來源資料
* 根據唯一鍵去除重複紀錄

### 匯出功能

支援將抽卡紀錄匯出成常見格式，例如：

* JSON
* Excel
* UIGF / SRGF / ZZZGF 格式，依後續版本實作狀況調整

### 半自動更新模組

本專案規劃以半自動方式追蹤原始開源專案更新，而不是直接覆蓋整個整合版專案。

半自動更新的目標是：

* 檢查上游原作者專案是否更新
* 顯示可更新模組
* 僅更新安全範圍內的設定檔或資料檔
* 避免覆蓋整合版 UI、主程式架構與自訂邏輯

## 技術架構

本專案使用 Electron + Vue 建構桌面應用程式。

主要技術包含：

* Electron
* Vue 3
* Vite
* Element Plus
* Node.js
* electron-builder
* JSON 本地資料儲存
* Excel 匯出處理

## 開發環境

建議使用：

* Node.js 22 LTS
* npm 10+
* Windows 10 / Windows 11

安裝依賴：

```bash
npm install
```

開發模式啟動：

```bash
npm run dev
```

打包 Windows x64 安裝版：

```bash
npm run build:win64
```

打包完成後，輸出檔案會在：

```text
release/
```

或依 `package.json` 中 `build.directories.output` 設定為準。

## Windows 安裝包

若使用 NSIS 打包，會產生類似以下檔案：

```text
HoYo Gacha Center Setup 1.0.0-merged.exe
```

此檔案即為一般使用者可直接下載並安裝的 Windows 安裝包。

## 專案來源與致謝

本專案整合與參考了以下開源專案的架構與功能概念：

* [biuuu/genshin-wish-export](https://github.com/biuuu/genshin-wish-export)
* [biuuu/star-rail-warp-export](https://github.com/biuuu/star-rail-warp-export)
* [earthjasonlin/zzz-signal-search-export](https://github.com/earthjasonlin/zzz-signal-search-export)

感謝上述專案作者提供優秀的開源工具與實作基礎。

本專案為學習、研究與個人資料管理用途開發，並非 miHoYo、HoYoverse、COGNOSPHERE 或相關官方單位之官方產品。

## 免責聲明

本專案僅用於玩家個人抽卡紀錄整理與分析。

使用者應自行確認使用方式符合各遊戲服務條款。
本專案不提供、收集或上傳使用者帳號密碼。
若使用抽卡紀錄 URL、authkey 或其他驗證資訊，請妥善保管，避免公開分享。

## 授權

本專案保留原始開源專案之來源標註。

若本專案包含或修改自其他開源專案內容，請依原專案授權條款使用。
整合與二次開發部分由 WindGod 維護。

## 未來規劃

* 支援更多資料格式匯入
* 支援跨工具資料融合與去重
* 改善 UI / UX
* 研究更多遊戲的抽卡紀錄 API 支援可能性
