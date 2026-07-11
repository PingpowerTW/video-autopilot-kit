import os
import sys
import shutil
import json
import subprocess
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv

# 加載 .env
load_dotenv()

# 防禦性處理 Windows 環境下 pip 安裝可執行檔（如 piper.exe）未加入 PATH 的問題
import site
python_dir = Path(sys.executable).parent
scripts_dirs = [python_dir / "Scripts"]
user_base = site.getuserbase()
if user_base:
    scripts_dirs.append(Path(user_base) / "Scripts")
for sd in scripts_dirs:
    if sd.exists() and str(sd) not in os.environ["PATH"]:
        os.environ["PATH"] = str(sd) + os.path.pathsep + os.environ["PATH"]

# 將當前目錄與 OpenMontage 目錄加入 sys.path
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))
sys.path.insert(0, str(BASE_DIR / "OpenMontage"))

# 導入 video-autopilot-kit 的模組
try:
    from src.capcut_helpers.paths import DRAFTS_ROOT, VIDEOS_DIR, ASSETS_DIR, BGM_DIR, FONTS_DIR, discover_all_draft_jsons
    from src.capcut_helpers.draft_io import load_draft, save_draft_with_sync, verify_sync
    from src.capcut_helpers.caption_broll_matcher import (
        audit_caption_broll_mismatch, auto_sequence_brolls,
        EXAMPLE_KEYWORD_MAP, print_sequence_plan
    )
    from src.capcut_helpers.delivery_qa import final_delivery_qa, detect_long_pauses, contact_sheet
    from src.capcut_helpers.post_export import force_mix_bgm, add_outro_card, trim_to_voice_end
except ImportError as e:
    print(f"警告: 導入 capcut_helpers 失敗: {e}")
    DRAFTS_ROOT = Path.home() / "AppData" / "Local" / "CapCut" / "User Data" / "Projects" / "com.lveditor.draft"

app = FastAPI(title="AI 影音生產力工作台 API", version="1.0.0")

# 允許跨域 (CORS) 供 React 前端調用
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 建立靜態目錄用於存放生成的文件 (如接觸表、臨時影片)
STATIC_DIR = BASE_DIR / "static"
STATIC_DIR.mkdir(exist_ok=True)
CONTACT_SHEETS_DIR = STATIC_DIR / "contact_sheets"
CONTACT_SHEETS_DIR.mkdir(exist_ok=True)
RENDERS_DIR = STATIC_DIR / "renders"
RENDERS_DIR.mkdir(exist_ok=True)

# 掛載靜態文件路徑
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# ─────────────────────────────────────────────────────────────────────
# 數據模型 (Pydantic Models)
# ─────────────────────────────────────────────────────────────────────

class SyncRequest(BaseModel):
    project_name: str

class BrollMatchRequest(BaseModel):
    project_name: str
    allow_reuse: bool = True
    min_segment_sec: float = 5.0
    look_ahead_window: int = 2

class PostProcessRequest(BaseModel):
    video_path: str
    bgm_path: Optional[str] = None
    bgm_volume: float = 0.25
    outro_title: Optional[str] = None
    outro_address: Optional[str] = None
    outro_extra: Optional[str] = None
    trim_voice: bool = True
    tail_pad_sec: float = 5.0

class TTSRequest(BaseModel):
    text: str
    voice_model: str = "en_US-lessac-medium"
    speaker_id: int = 0
    length_scale: float = 1.0

# ─────────────────────────────────────────────────────────────────────
# 1. CapCut Studio API
# ─────────────────────────────────────────────────────────────────────

@app.get("/api/capcut/projects")
def list_capcut_projects():
    """列出本地所有的 CapCut 專案與其同步狀態"""
    if not DRAFTS_ROOT.exists():
        return {
            "success": False,
            "error": f"找不到 CapCut 專案根目錄: {DRAFTS_ROOT}，請在 .env 或設定中調整路徑。"
        }
    
    projects = []
    for item in DRAFTS_ROOT.iterdir():
        if item.is_dir() and not item.name.startswith("_backup_"):
            draft_content = item / "draft_content.json"
            if draft_content.exists():
                sync_status = verify_sync(item.name)
                mtime = os.path.getmtime(draft_content)
                projects.append({
                    "name": item.name,
                    "last_modified": mtime,
                    "sync": sync_status
                })
    
    # 按照最後修改時間排序
    projects.sort(key=lambda x: x["last_modified"], reverse=True)
    return {"success": True, "projects": projects}

@app.post("/api/capcut/force-sync")
def force_sync_project(req: SyncRequest):
    """強制複製主草稿 JSON 到所有備份位置 (M18 同步)"""
    try:
        draft = load_draft(req.project_name)
        written = save_draft_with_sync(req.project_name, draft, backup=True)
        return {
            "success": True,
            "message": f"成功同步了 {len(written)} 個檔案備份！",
            "files": [str(p) for p in written]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/capcut/broll-audit")
def audit_project_brolls(project_name: str):
    """分析草稿中的字幕與 B-roll 匹配程度"""
    try:
        draft = load_draft(project_name)
        report = audit_caption_broll_mismatch(draft, keyword_map=EXAMPLE_KEYWORD_MAP)
        return {"success": True, "report": report}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/capcut/broll-match")
def match_project_brolls(req: BrollMatchRequest):
    """基於字幕內容自動對位/序列化 B-roll 並寫回 CapCut 草稿"""
    try:
        # 1. 讀取草稿
        draft = load_draft(req.project_name)
        
        # 2. 獲取所有字幕段
        texts_by_id = {t.get("id"): t for t in draft.get("materials", {}).get("texts", [])}
        captions = []
        for tr in draft.get("tracks", []):
            if tr.get("type") == "text":
                for seg in tr.get("segments", []):
                    mat = texts_by_id.get(seg.get("material_id", ""), {})
                    try:
                        co = json.loads(mat.get("content", "{}"))
                        text = co.get("text", "")
                        if text:
                            ttr = seg.get("target_timerange", {})
                            captions.append({
                                "text": text,
                                "start_us": ttr.get("start", 0),
                                "duration_us": ttr.get("duration", 0)
                            })
                    except:
                        continue
        
        # 3. 獲取當前專案可用的 B-roll 素材庫
        # 我們掃描專案的 videos 目錄（如果存在）或 assets/ 目錄
        broll_files = []
        broll_dirs = [VIDEOS_DIR, ASSETS_DIR / "broll"]
        for bd in broll_dirs:
            if bd.exists():
                for f in bd.glob("*.mp4"):
                    # 預設估算時長 (可用 ffprobe 獲取)
                    try:
                        r = subprocess.run(
                            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(f)],
                            capture_output=True, text=True
                        )
                        dur_sec = float(r.stdout.strip())
                    except:
                        dur_sec = 10.0 # 預設 fallback
                    broll_files.append({
                        "id": f.name,
                        "path": str(f),
                        "source_duration_us": int(dur_sec * 1_000_000)
                    })
        
        if not broll_files:
            return {
                "success": False,
                "error": f"素材庫中找不到可用的 B-roll 影片檔 (*.mp4)。請放置素材於: {VIDEOS_DIR} 或 {ASSETS_DIR}/broll/"
            }
        
        # 計算總時長 (草稿軌道時長)
        total_duration_us = 0
        for tr in draft.get("tracks", []):
            for seg in tr.get("segments", []):
                ttr = seg.get("target_timerange", {})
                total_duration_us = max(total_duration_us, ttr.get("start", 0) + ttr.get("duration", 0))
        
        if total_duration_us == 0:
            total_duration_us = sum(c["duration_us"] for c in captions) or 10_000_000
            
        # 4. 跑自動對位序列化
        assignments = auto_sequence_brolls(
            captions=captions,
            brolls=broll_files,
            total_duration_us=total_duration_us,
            keyword_map=EXAMPLE_KEYWORD_MAP,
            allow_reuse=req.allow_reuse,
            min_segment_us=int(req.min_segment_sec * 1_000_000),
            look_ahead_window=req.look_ahead_window
        )
        
        # 5. 更新草稿時間軸的影片軌道
        # 尋找第一個影片軌，或者新建影片軌，將 assignments 寫入
        # 注意: 這會直接修改 draft 物件
        video_track = None
        for tr in draft.get("tracks", []):
            if tr.get("type") == "video":
                video_track = tr
                break
        
        if not video_track:
            video_track = {"type": "video", "segments": [], "id": "generated_video_track"}
            draft.setdefault("tracks", []).append(video_track)
            
        # 清空影片軌，改為新匹配的 segments
        video_track["segments"] = []
        
        # 為了能在草稿中正確加載這些影片素材，我們需要將它們加入 materials.videos 中
        materials_videos = draft.setdefault("materials", {}).setdefault("videos", [])
        
        for idx, a in enumerate(assignments):
            # 尋找素材是否已在 materials 裡
            mat_id = f"mat_broll_{idx}"
            # 建立影片素材對象
            # 尋找實際匹配的完整路徑
            full_path = ""
            for bf in broll_files:
                if bf["id"] == a.broll_id:
                    full_path = bf["path"]
                    break
            
            materials_videos.append({
                "id": mat_id,
                "local_material_id": mat_id,
                "material_name": a.broll_id,
                "path": full_path,
                "type": "video"
            })
            
            video_track["segments"].append({
                "id": f"seg_broll_{idx}",
                "material_id": mat_id,
                "target_timerange": {
                    "start": a.start_us,
                    "duration": a.duration_us
                },
                "source_timerange": {
                    "start": a.source_trim_us[0],
                    "duration": a.duration_us
                }
            })
            
        # 寫回並同步
        save_draft_with_sync(req.project_name, draft)
        
        return {
            "success": True,
            "message": "自動 B-roll 對齊與草稿更新成功！",
            "assignments": [
                {
                    "broll_id": a.broll_id,
                    "start_sec": a.start_us / 1e6,
                    "duration_sec": a.duration_us / 1e6,
                    "is_filler": a.is_filler,
                    "topic_label": a.topic_label
                } for a in assignments
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─────────────────────────────────────────────────────────────────────
# 2. Quality Control (QA) API
# ─────────────────────────────────────────────────────────────────────

@app.post("/api/qa/analyze")
async def analyze_video(video: UploadFile = File(...)):
    """檢測影片品質 (頻閃、黑邊、停頓) 並生成接觸表大圖"""
    try:
        # 將上傳的影片存到臨時目錄中
        temp_video_path = RENDERS_DIR / video.filename
        with temp_video_path.open("wb") as buffer:
            shutil.copyfileobj(video.file, buffer)
            
        # 接觸表路徑
        cs_filename = f"cs_{temp_video_path.stem}.png"
        cs_path = CONTACT_SHEETS_DIR / cs_filename
        
        # 跑 QA
        qa_report = final_delivery_qa(temp_video_path, contact_out=cs_path)
        
        # 接觸表的 URL
        cs_url = f"/static/contact_sheets/{cs_filename}"
        
        return {
            "success": True,
            "report": qa_report,
            "contact_sheet_url": cs_url
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─────────────────────────────────────────────────────────────────────
# 3. Post-Process (後製工作流) API
# ─────────────────────────────────────────────────────────────────────

@app.post("/api/post-process/all")
def post_process_video(req: PostProcessRequest):
    """一鍵執行 force-mix BGM -> Add Outro -> Trim to Voice End"""
    video_path = Path(req.video_path)
    if not video_path.exists():
        raise HTTPException(status_code=400, detail=f"找不到影片檔案: {video_path}")
        
    out_dir = RENDERS_DIR / "post_processed"
    out_dir.mkdir(exist_ok=True)
    out_path = out_dir / f"final_{video_path.name}"
    
    current_video = video_path
    
    try:
        # 1. Force Mix BGM
        if req.bgm_path:
            bgm_path = Path(req.bgm_path)
            if bgm_path.exists():
                print("執行 force-mix BGM...")
                bgm_out = out_dir / f"bgm_{video_path.name}"
                force_mix_bgm(current_video, bgm_out, bgm_path, bgm_volume=req.bgm_volume)
                current_video = bgm_out
                
        # 2. Add Outro Card
        if req.outro_title and req.outro_address:
            print("執行 add outro card...")
            outro_out = out_dir / f"outro_{video_path.name}"
            add_outro_card(
                current_video, outro_out, 
                title_line=req.outro_title, 
                address_line=req.outro_address,
                extra_line=req.outro_extra
            )
            # 刪除上一步臨時影片
            if current_video != video_path:
                current_video.unlink(missing_ok=True)
            current_video = outro_out
            
        # 3. Trim to voice end
        trim_info = None
        if req.trim_voice:
            print("執行 trim to voice end...")
            final_out = out_path
            trim_info = trim_to_voice_end(
                current_video, final_out, 
                tail_pad_sec=req.tail_pad_sec,
                player_safe=True
            )
            if current_video != video_path:
                current_video.unlink(missing_ok=True)
        else:
            shutil.copy(current_video, out_path)
            if current_video != video_path:
                current_video.unlink(missing_ok=True)
                
        return {
            "success": True,
            "output_path": str(out_path),
            "output_url": f"/static/renders/post_processed/final_{video_path.name}",
            "trim_info": trim_info
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─────────────────────────────────────────────────────────────────────
# 4. OpenMontage & Remotion API
# ─────────────────────────────────────────────────────────────────────

@app.post("/api/generate/piper-tts")
def generate_piper_tts(req: TTSRequest):
    """離線 Piper TTS 旁白生成"""
    try:
        from OpenMontage.tools.audio.piper_tts import PiperTTS
        
        # 建立語音輸出路徑
        out_wav = RENDERS_DIR / f"tts_{int(time.time())}.wav"
        
        tool = PiperTTS()
        res = tool.execute({
            "text": req.text,
            "model": req.voice_model,
            "speaker_id": req.speaker_id,
            "length_scale": req.length_scale,
            "output_path": str(out_wav)
        })
        
        if res.success:
            return {
                "success": True,
                "audio_url": f"/static/renders/{out_wav.name}",
                "audio_path": str(out_wav),
                "data": res.data
            }
        else:
            return {"success": False, "error": res.error}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate/render-demo")
def run_render_demo(demo_name: str = Form(...)):
    """調用 OpenMontage/render_demo.py 渲染 Remotion 示範影片"""
    try:
        cmd = [sys.executable, "render_demo.py", demo_name]
        cwd_dir = BASE_DIR / "OpenMontage"
        
        # 執行渲染
        r = subprocess.run(cmd, cwd=str(cwd_dir), capture_output=True, text=True)
        if r.returncode != 0:
            return {"success": False, "error": r.stderr}
            
        # 影片輸出路徑
        render_file = cwd_dir / "projects" / "demos" / "renders" / f"{demo_name}.mp4"
        if render_file.exists():
            # 複製到我們的靜態目錄下以便前端預覽
            dest = RENDERS_DIR / f"{demo_name}.mp4"
            shutil.copy(render_file, dest)
            return {
                "success": True,
                "video_url": f"/static/renders/{demo_name}.mp4",
                "message": r.stdout
            }
        else:
            return {"success": False, "error": "渲染成功但找不到生成的 MP4 檔案。"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    import time
    uvicorn.run("server.py:app", host="127.0.0.1", port=8000, reload=True)
