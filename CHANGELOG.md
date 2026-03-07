# 📜 Changelog

All notable changes to the **Morse Code Trainer** project will be documented in this file.

## [v2.6.0] - 2026-03-07
### ✨ Added
- **Visual Morse Suite**:
  - **Visual Encoder**: Convert text to real-time signal lamp pulses.
  - **Visual Decoder**: New specialized trainer for receiving and identifying visual light signals.
  - **Signal Lamp UI**: Authentic maritime-style virtual lamp with glow effects.
- **Reference Chart**: Collapsible Morse reference chart always accessible at the bottom of the page.

### 🎨 UI/UX
- **Localized Settings**: Removed the global Settings tab. All parameters (Speed, Tone, Koch Level, Farnsworth) are now contextually located within their respective training panels.
- **Tab Navigation Overhaul**: Streamlined the focus purely on training and utility tools (Encode, Decode, Audio Decode, Trainer, Contest, Visual Encode, Visual Decode).

### 🔧 Improvements & Fixes
- **ReferenceError Fix**: Resolved initialization "Temporal Dead Zone" issues to ensure 100% script stability on load.
- **Slider Synchronization**: Real-time sync between speed/tone sliders across all relevant tabs.
- **Lamp Class Fix**: Unified signal lamp CSS class usage preventing lamp from not turning off.
- **Persistence Audit**: Ensured all localized settings persist correctly in `localStorage`.

---

## [v2.5.0] - 2026-03-07
### ✨ Added
- **Practice Trainer: Continuous Mode**: Automatically advance to the next challenge after a correct answer (1.5s delay).
- **Practice Trainer: New Difficulties**: Added "Prosigns" (BT, AR, SK) and "Abbreviations" (RST, QTH, 73).
- **Contest Trainer: Continuous Mode**: Auto-advance to next QSO after logging correctly (2s delay).
- **Contest Trainer: QSB (Fading) Simulation**: Realistic slow-drift signal fading with adjustable depth.
- **Koch Method**: Integrated levels (1-40) into the Trainer settings.
- **Farnsworth Timing**: Character speed vs. spacing control for high-speed training.
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
