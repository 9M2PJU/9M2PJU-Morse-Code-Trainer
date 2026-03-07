# 📜 Changelog

All notable changes to the **Morse Code Trainer** project will be documented in this file.

## [v2.6.0] - 2026-03-07
### ✨ Added
- **Visual Morse Suite**:
  - **Visual Encoder**: Convert text to real-time signal lamp pulses.
  - **Visual Decoder**: New specialized trainer for receiving and identifying visual light signals.
  - **Signal Lamp UI**: Authentic maritime-style virtual lamp with glow effects.
- **Dedicated Reference Tab**: Moved the Morse Code Reference Chart to its own high-level panel for instant lookup.

### 🎨 UI/UX
- **Localized Settings**: Removed the global Settings tab. All parameters (Speed, Tone, Koch Level, Farnsworth) are now contextually located within their respective training panels.
- **Tab Navigation Overhaul**: Streamlined the focus purely on training and utility tools (Encode, Decode, Audio Decode, Trainer, Contest, Visual Encode, Visual Decode, Reference).

### 🔧 Improvements & Fixes
- **ReferenceError Fix**: Resolved initialization "Temporal Dead Zone" issues to ensure 100% script stability on load.
- **Slider Synchronization**: Real-time sync between speed/tone sliders across all relevant tabs.
- **Persistence Audit**: Ensured all localized settings persist correctly in `localStorage`.

---

## [v2.5.0] - 2026-03-07

---

## [v1.0.0] - 2025
- Original release with basic Encoder, Decoder, and Practice Mode.
