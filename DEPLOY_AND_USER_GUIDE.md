# AI 影音生產力工作台 - 部署與操作手冊

本工作台深度整合了 **`video-autopilot-kit`**（CapCut 草稿自動化與影片品質 QA 審計）與 **`OpenMontage`**（AI 代理化影片生成與 React/Remotion 渲染）的核心能力，並提供了一個現代化的 Web UI Dashboard 與一鍵啟動腳本。

---

## ⚙️ 一、 環境依賴與準備工作

在執行本工作台之前，請確保您的系統中已安裝並配置好以下環境：

### 1. Python 環境 (3.9+)
- 確保系統已安裝 Python，可使用 `python --version` 驗證。
- 本工作台會使用 Python 的 `FastAPI` 與 `uvicorn` 跑後端 API。

### 2. Node.js 環境 (18+)
- 影片渲染（Remotion）與前端儀表板（Vite+React）需要 Node.js。
- 請確保能在終端機中使用 `node -v`、`npm -v` 與 `npx -v`。

### 3. FFmpeg 多媒體工具
- 影片品質檢測與後製拼接極度依賴 `ffmpeg` 與 `ffprobe`。
- **請確保 `ffmpeg` 與 `ffprobe` 已經加入系統環境變數 (PATH) 中**。可在終端機執行 `ffmpeg -version` 驗證。

---

## 🚀 二、 部署步驟

當前工作目錄下已經自動為您生成了所有必需的程式碼和配置。若要在新的環境或本地重新部署，請遵循以下步驟：

### 步驟 1：配置環境變數
專案根目錄下設有 `.env` 檔案，請在其中寫入您的 API 金鑰（已為您配置好 Pixabay 金鑰）：
```env
PIXABAY_API_KEY=9771331-0d494591ab6b48f9308dacfd8
```

### 步驟 2：執行一鍵啟動腳本
在專案根目錄（`d:\AI\VS\autovedio`）打開終端機，執行以下指令：
```powershell
python run_dashboard.py
```
此腳本將自動執行以下引導動作：
1. **補全安裝後端 Python 依賴**（若尚未安裝）。
2. **在背景啟動 FastAPI 後端服務** (Port 8000)。
3. **檢查並安裝前端 Node.js 依賴**（包含 `lucide-react`）。
4. **啟動前端 Vite 開發伺服器** (Port 5173)。
5. **自動在瀏覽器中開啟** `http://localhost:5173`。

---

## 🎨 三、 介面與功能操作說明

工作台採用 **極致暗黑玻璃微光 (Dark Glassmorphism)** 視覺風格，主要分為三大功能模組：

### 💻 1. CapCut Studio（CapCut 草稿輔助工具）
本模組直接讀取並操作您本地的剪映/CapCut 草稿檔案：
- **健康度同步**：列出本地專案的同步健康度。若顯示不同步（紅燈），可點擊「一鍵同步 (M18)」將主 JSON 同步到其他 6 個備份位置，防止被 CapCut 覆寫。
- **B-roll 智能匹配與對位**：
  - 在「B-roll 自動對齊設定」中，設定是否允許素材重複、最小片段長度（秒）與預判視窗 (Look-ahead window)。
  - 點擊「執行對齊並同步寫回草稿」，系統會掃描 `videos/current` 與 `assets/broll` 下的素材，利用 zero-config 詞幹對位演算法（M75）自動為您草稿中的字幕匹配最貼合的素材，並在網頁上展示時序時間軸。
  - **草稿審計 (Audit)**：點擊後會顯示字幕-畫面錯位報告，標出當前草稿中哪些字幕內容與播出的影片畫面不符，並給出建議更換的 B-roll 素材。

### 🧠 2. AI Auto-Gen（Remotion 影片渲染）
本模組基於 OpenMontage，進行完全自動化、無人值守的影片生成：
- **離線 Piper TTS**：在文字框中輸入旁白，點擊「生成語音旁白」，系統會直接在本地調用 Piper 合成高品質 WAV 語音，並可在網頁端點擊播放與下載。
- **Remotion React 渲染**：
  - 提供三款經典解說影片 React 範本（世界數據庫、開發者腳本、新創募資簡報）。
  - 點擊「開始渲染」，後台將在無頭瀏覽器中將 React DOM 元件、動畫、語音和素材編譯，一鍵生成 MP4 影片，並直接在網頁端提供預覽與下載。

### 🛡️ 3. Quality Control (QA 品檢與後製)
影片出貨前的最後一關，採用機械式 QA 與後製工作流：
- **交付前品質審計**：上傳您的影片（.mp4），系統會調用 FFmpeg 在背景檢測頻閃 (M93)、死黑邊 (M92) 與長停頓 (M95)。
- **接觸表大圖 (Contact Sheet)**：審計完成後會自動生成並展示網格接觸表大圖。您可以快速走讀，人工檢查是否有 Chrome 網址列隱私洩露 (M91) 或圖片排版錯位 (M92)。
- **後製加速打包**：
  - 輸入本地影片絕對路徑、BGM 路徑、音量大小。
  - 於下方輸入結尾 Outro card（店名、地址、聯絡電話）。
  - 點擊「一鍵執行後製打包」，系統會自動進行 BGM 音軌強混 (M55，剔除素材漏音)、追加 outro 漸變字卡 (M56) 以及自動裁剪人聲真實結尾 (M82)，一步產出 final player-safe 影片。

---

## 🔍 四、 常見問題排除 (Troubleshooting)

### 1. 執行 `run_dashboard.py` 時提示找不到 `npm` 或 `node`
- **原因**：系統尚未安裝 Node.js，或者 Node.js 未加入系統 PATH。
- **解法**：請至 [Node.js 官網](https://nodejs.org/) 下載並安裝 LTS 版本，並重啟終端機。

### 2. 離線語音合成時提示 `piper CLI NOT found on PATH!`
- **原因**：`piper-tts` 雖已由 pip 安裝，但 Windows 的 Scripts 目錄未在環境變數中。
- **解法**：我們已經在 `server.py` 中加入了防禦性 Scripts 路徑動態補全，若仍失效，請手動將 `C:\Users\<您的用戶名>\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.11_qbz5n2kfra8p0\LocalCache\local-packages\Python311\Scripts` 加入 Windows 的 PATH 環境變數中。

### 3. CapCut Studio 中提示「找不到可用的 B-roll 影片檔」
- **原因**：匹配引擎找不到素材影片。
- **解法**：請建立並將您的 .mp4 素材放置在專案目錄下的 `videos/current/` 或 `assets/broll/` 目錄中，再次執行匹配即可。

### 4. 交付品質審計上傳影片時提示「ffprobe 讀不到時長」
- **原因**：檔案可能損毀，或是系統中沒有安裝 `ffprobe` / `ffmpeg`。
- **解法**：請在終端機中執行 `ffmpeg`，確保能印出版本資訊。若無，請至 [Gyan.dev](https://www.gyan.dev/ffmpeg/builds/) 下載 Windows 建置版並配置 PATH。
