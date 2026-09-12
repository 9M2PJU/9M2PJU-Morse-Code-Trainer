# 📜 Changelog

All notable changes to **9M2PJU Morse Code Lab** will be documented in this file.

## [v2.8.0] - 2026-09-12
### ✨ Added
- **Comprehensive SEO & Meta Suite**:
  - Full OpenGraph (`og:site_name`, `og:image`, `og:locale`, `og:url`, `og:title`, `og:description`) and Twitter Cards metadata targeting amateur radio, CW practice, and Morse tools.
  - Canonical URL (`https://morse.hamradio.my/`) and crawler robots directives.
  - Standard `robots.txt` and `sitemap.xml` for search index discovery.
- **Answer Engine Optimization (AEO) & Schema.org JSON-LD**:
  - `WebApplication` / `SoftwareApplication` schema with feature listings, zero-cost, and offline capabilities.
  - `FAQPage` schema addressing the Koch method, Farnsworth timing, Goertzel audio decoding, and Morse ITU timing standards for AI engines (Google Gemini/AI Overview, Perplexity, ChatGPT Search, Bing Copilot).
  - `HowTo` schema detailing the step-by-step Koch method CW mastery process.
  - On-page semantic CW Knowledge Base & FAQ section matching the dark cyberpunk console aesthetic.
- **Service Worker Cache Upgrade**:
  - Upgraded cache suite to `v8`.

## [v2.7.0] - 2026-09-12
### ✨ Added
- **Official Brand Logo & Vector PWA Icons**:
  - High-precision official 9M2PJU brand logo SVG with dual-paddle straight key, CW RF sine wave, and Morse pulse accents.
  - High-resolution standalone PWA icons (512x512, 192x192) with maskable support.
- **Enhanced PWA Installation Suite**:
  - One-click PWA installation button in header.
  - In-app iOS Safari "Add to Home Screen" step-by-step guidance modal.
  - Service worker cache version bump to `v7` with full offline shell support.
- **Master Sidetone Volume Control**:
  - Header master volume slider (0% to 100%) connected to a Web Audio Master Gain node.
  - Raised-cosine clickless envelope (3.5ms attack/decay) eliminating key clicks at high WPM.
- **Interactive Searchable Reference Chart**:
  - Category tabs: Alphabet (A–Z), Numbers (0–9), Punctuation, and Prosigns & Abbreviations.
  - Real-time search filter by character, code pattern (e.g. `.-`), or meaning.
  - Phonetic Dit-Dah vocalization mnemonics displayed on each tile.
  - Click any tile to listen to its CW tone.
- **Live Audio VU Level Meter**:
  - Real-time input signal level meter in Audio Morse Decoder for easy microphone sensitivity calibration against ambient noise.
- **Contest Simulator Enhancements**:
  - N1MM-style smart field navigation (<kbd>Space</kbd> / <kbd>Tab</kbd> / <kbd>Enter</kbd> between Callsign, RST, and Exchange).
  - Quick `599` RST fill button.
  - Real-time Run Rate calculation (QSOs/Hour).
  - One-click CSV log export (`Export CSV`) and Clear Log actions.
  - Independent Auto-Advance toggle.
- **Practice Trainer Upgrades**:
  - Independent Auto-Advance toggle switch.
  - Manual step-by-step mode with explicit Next Challenge workflow.
  - Interactive Koch character tiles (click any letter to preview its sound).
  - Score reset action and Best Streak tracking.
- **Visual Decoder Full Workflow**:
  - Complete control suite: Check, Replay, Reveal, and Next buttons.
  - Dedicated score tracking (Correct, Wrong, Streak, Accuracy).
  - 4 difficulty tiers: Letters, Numbers, Words, Callsigns.
  - Authentic maritime signal lamp styling with warm incandescent glow.
- **Keyboard Shortcuts Dialog**:
  - Press <kbd>?</kbd> or <kbd>Ctrl</kbd>+<kbd>/</kbd> to view full keyboard shortcuts.
  - <kbd>Space</kbd> to replay audio, <kbd>Enter</kbd> to check/advance, <kbd>Ctrl</kbd>+<kbd>R</kbd> to reveal.

### 🐛 Fixed & Polished
- **Signal Lamp CSS Cascade Fix**: Scoped maritime lamps separately from compact 14px LED sync indicators across all panels.
- **Contest Form Submission Trap Fix**: Eliminated premature loss on Enter in Callsign field.
- **CSS Cleanup**: Removed duplicate table rules and dead `.settings` styles.

---

## [v2.6.0] - 2026-03-07
### ✨ Added
- **Visual Morse Suite**:
  - **Visual Encoder**: Convert text to real-time signal lamp pulses.
  - **Visual Decoder**: New specialized trainer for receiving and identifying visual light signals.
  - **Signal Lamp UI**: Authentic maritime-style virtual lamp with glow effects.
- **Reference Chart**: Collapsible Morse reference chart always accessible at the bottom of the page.

### 🎨 UI/UX
- **Localized Settings**: Removed the global Settings tab. All parameters are contextually located within their respective training panels.
- **Tab Navigation Overhaul**: Streamlined the focus purely on training and utility tools.

---

## [v2.5.0] - 2026-03-07
### ✨ Added
- **Practice Trainer: Continuous Mode**: Automatically advance to the next challenge after a correct answer.
- **Practice Trainer: New Difficulties**: Added "Prosigns" and "Abbreviations".
- **Contest Trainer: Continuous Mode**: Auto-advance to next QSO after logging correctly.
- **Contest Trainer: QSB (Fading) Simulation**: Realistic slow-drift signal fading with adjustable depth.
- **Koch Method**: Integrated levels (1-40) into the Trainer settings.
- **Farnsworth Timing**: Character speed vs. spacing control for high-speed training.

---

## [v1.0.0] - 2025
- Original release with basic Encoder, Decoder, and Practice Mode.
