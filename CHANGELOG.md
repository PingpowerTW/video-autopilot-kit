# Changelog

All notable changes to **video-autopilot-kit** are documented here.
Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [0.1.1] — 2026-06-02

Onboarding + positioning fixes from early adopter feedback.

### Changed
- **CapCut is now correctly framed as the primary editing path; ffmpeg is secondary.**
  Requirements previously listed ffmpeg as required and CapCut as optional — inverted.
  `silent_vlog_maker` (ffmpeg) is now clearly labelled "silent vlogs + post-export only".
- **Computer Use is now documented as a hard requirement.** CapCut has no public API;
  `capcut_helpers` automation works by an AI assistant driving the CapCut GUI via Computer
  Use. README + SETUP now state this up front (it previously wasn't mentioned at all).
- **`SETUP.md` onboarding sped up.** Added a "5-minute minimum start" (3 ★required sections
  vs 3 ⭕optional), and made "let the AI interview you" the recommended low-effort path —
  so adopters can start without filling the entire questionnaire first.

### Fixed
- Removed a broken `docs/` reference in README (the folder doesn't exist).

## [0.1.0] — 2026-06-01

Initial public release — extracted + sanitized from a real, battle-tested personal
creator system into a reusable framework.

### Added
- **`src/capcut_helpers/`** — CapCut Desktop JSON automation library
  - draft I/O with 7-file sync, 4-level mute, text presets, effects swap
  - `post_export` ffmpeg helpers: voice-end trim, **BGM loop-fill (crossfade seam)**,
    player-safe re-encode, outro card
  - AI-subtitle correction dictionary
  - **b-roll audit** (`broll_audit`): generic-vs-main ratio + narration↔visual sync
  - caption↔b-roll matcher + auto-sequencer
- **`src/silent_vlog_maker/`** — ffmpeg-only pipeline utilities
  - 11-dimension raw-clip audit (GPS / capture-time / camera / audio)
  - scene clustering, hi-res frame audit, KenBurns + cinematic grade
  - screen-rec auto-cleanup, b-roll intake normalize, quality check
- **`SETUP.md`** — 6-section onboarding questionnaire (fill-your-own-data)
- **`templates/`** — voice / brand / algorithm / community / content-pipeline / context
- `config.example.py` — path config via env vars (auto-detects current user)

### Security / Privacy
- De-personalized: **no PII, no secrets, no business-sensitive data, no personal
  voice profiles**. `voice_profiles.json` ships as an empty skeleton.
- Paths auto-detect the current user (no hardcoded usernames).
- `.gitignore` excludes all media, `profiles/`, and `config.py`.

### Not included (by design)
- The original creator-specific orchestration layer (personal pipeline rules,
  brand, community config) — define your own via `templates/content_pipeline.template.md`.
