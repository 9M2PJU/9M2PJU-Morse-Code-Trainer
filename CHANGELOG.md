# 📜 Changelog

All notable changes to the **Morse Code Trainer** project will be documented in this file.

## [v2.5.0] - 2026-03-07
### ✨ Added
- **Practice Trainer: Continuous Mode**: Automatically advance to the next challenge after a correct answer (1.5s delay).
- **Practice Trainer: New Difficulties**: Added "Prosigns" (BT, AR, SK) and "Abbreviations" (RST, QTH, 73).
- **Contest Trainer: Continuous Mode**: Auto-advance to next QSO after logging correctly (2s delay).
- **Contest Trainer: QSB (Fading) Simulation**: Realistic slow-drift signal fading with adjustable depth.
- **Koch Method**: Integrated levels (1-40) into the Trainer settings.
- **Farnsworth Timing**: Character speed vs. spacing control for high-speed training.
- **Settings Panel**: Persistent configuration for WPM, Frequency, Farnsworth, and Koch levels.
- **Visual Signal Lamp**: High-visibility real-time feedback for all audio modes.

### 🎨 UI/UX
- **Premium Custom Scrollbars**: Sleek, dark-themed scrollbars for a modern look.
- **Layout Optimization**: Tightened vertical spacing to reduce scrolling in the Audio Decoder and Contest tabs.
- **Centered Toast Notifications**: Visually enhanced warnings for empty inputs.
- **Footer Refinement**: Link "Built by 9M2PJU" to `hamradio.my`.

### 🐛 Fixed
- **Audio Context Suspension**: Robust initialization to prevent silent audio on first load.
- **Horizontal Overflow**: Locked viewport to prevent unexpected page drifting.

---

## [v1.0.0] - 2025
- Original release with basic Encoder, Decoder, and Practice Mode.
