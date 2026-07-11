import os
import sys
import time
import subprocess
import webbrowser
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

def find_command(name):
    import shutil
    return shutil.which(name)

def main():
    print("=" * 60)
    print("🚀 啟動 AI 影音生產力工作台 (AI Video Autopilot Workspace)...")
    print("=" * 60)

    # 1. 驗證後端環境
    print("\n[1/4] 檢查後端環境...")
    requirements_file = BASE_DIR / "requirements_gui.txt"
    try:
        import fastapi
        import uvicorn
        print("  ✓ 後端核心依賴已安裝。")
    except ImportError:
        print("  ⚠️ 缺少後端依賴，正在進行安裝...")
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", str(requirements_file)], check=True)

    # 2. 啟動後端伺服器 (Port 8000)
    print("\n[2/4] 正在背景啟動 FastAPI 後端服務...")
    backend_process = subprocess.Popen(
        [sys.executable, "server.py"],
        cwd=str(BASE_DIR),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    print("  ✓ 後端服務啟動中 (Port 8000)。")
    time.sleep(2)  # 等待後端啟動

    # 3. 前端依賴檢查與安裝
    print("\n[3/4] 檢查前端環境...")
    gui_dir = BASE_DIR / "gui"
    node_modules = gui_dir / "node_modules"
    
    npm_cmd = find_command("npm.cmd") or find_command("npm")
    if not npm_cmd:
        print("  ❌ 錯誤: 找不到 npm，請先安裝 Node.js (https://nodejs.org/)。")
        backend_process.terminate()
        sys.exit(1)

    if not node_modules.exists():
        print("  ⚠️ 發現 gui/node_modules 不存在，正在執行 npm install 安裝前端依賴...")
        # 針對 Windows 下 npm install 可能遇到的卡死，使用非互動式 shell 呼叫
        subprocess.run([npm_cmd, "install"], cwd=str(gui_dir), shell=True, check=True)
        # 安裝 lucide-react (用於 Icon)
        print("  Installing lucide-react...")
        subprocess.run([npm_cmd, "install", "lucide-react"], cwd=str(gui_dir), shell=True, check=True)
        print("  ✓ 前端依賴安裝完成。")
    else:
        print("  ✓ 前端依賴已安裝。")

    # 4. 啟動前端開發服務
    print("\n[4/4] 正在啟動 Vite 前端開發伺服器...")
    
    # 執行 npm run dev
    frontend_process = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=str(gui_dir),
        shell=True
    )
    
    print("\n" + "=" * 60)
    print("🎉 工作台啟動成功！")
    print("  👉 後端 API：http://127.0.0.1:8000")
    print("  👉 前端 Web：http://localhost:5173")
    print("=" * 60)
    
    # 自動在瀏覽器打開網頁
    time.sleep(3)
    webbrowser.open("http://localhost:5173")

    try:
        # 保持腳本運行，並在 Ctrl+C 時優雅關閉子進程
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n正在關閉服務...")
        backend_process.terminate()
        frontend_process.terminate()
        print("工作台已安全關閉。")

if __name__ == "__main__":
    main()
