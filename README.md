# 📡 Morse Code Trainer

A free, interactive **Morse Code Trainer, Encoder, and Decoder** — built as a static web app, hosted on GitHub Pages.

🔗 **Live Demo:** [https://9m2pju.github.io/9M2PJU-Morse-Code-Trainer/](https://9m2pju.github.io/9M2PJU-Morse-Code-Trainer/)

![Morse Code Trainer](https://img.shields.io/badge/Morse-Code%20Trainer-blue?style=for-the-badge)

---

## ✨ Features

### 🔤 Encoder (Text → Morse)
- Real-time text-to-Morse conversion as you type
- Audio playback with adjustable speed (WPM) and tone frequency
- Visual signal lamp that lights up with each dit/dah
- Copy Morse code to clipboard

### 📖 Decoder (Morse → Text)
- Convert Morse code back to readable text
- Supports dots (`.`), dashes (`-`), spaces for letter separation, and `/` or `|` for word breaks
- Audio playback of the entered Morse code
- Copy decoded text to clipboard

### 🎯 Trainer (Practice Mode)
- **5 Difficulty Levels:**
  - **Letters** — Random 1–3 letter combinations
  - **Numbers** — Random 1–3 digit sequences
  - **Mixed** — Random alphanumeric strings
  - **Words** — Common CW/ham radio words (CQ, SOS, QTH, etc.)
  - **Callsigns** — Realistic amateur radio callsigns (9M2, W, VK, JA, etc.)
- Auto-plays challenge audio on new round
- Visual Morse code display with animated dots and dashes
- Score tracking: Correct, Wrong, Streak, and Accuracy
- Replay and Reveal buttons

### 📋 Reference Chart
- Complete Morse code reference (A–Z, 0–9, punctuation)
- Click any character to hear it played

### ⚙️ Audio Controls
- **Speed:** 5–40 WPM (words per minute)
- **Tone:** 400–900 Hz frequency
- Smooth audio envelope (no clicks)

---

## 🚀 Getting Started

### GitHub Pages (Recommended)
This app is designed to be hosted on GitHub Pages. Simply enable Pages in your repository settings and point it to the `main` branch.

### Local Development
```bash
# Clone the repository
git clone https://github.com/9M2PJU/9M2PJU-Morse-Code-Trainer.git
cd 9M2PJU-Morse-Code-Trainer

# Open in browser
open index.html
# or
python3 -m http.server 8000
```

---

## 📁 Project Structure

```
├── index.html    # Main HTML structure
├── style.css     # Design system & responsive styles
├── morse.js      # Core logic, audio engine, UI controllers
└── README.md     # This file
```

---

## 📱 Mobile Support

Fully responsive design optimized for:
- Desktop browsers
- Tablets
- Mobile phones (portrait & landscape)

---

## 🛠 Tech Stack

- **HTML5** — Semantic structure
- **CSS3** — Custom properties, Grid, Flexbox, animations
- **Vanilla JavaScript** — No dependencies
- **Web Audio API** — Real-time Morse code audio synthesis

---

## 👨‍💻 Author

**9M2PJU** — Amateur Radio Operator  
[GitHub](https://github.com/9M2PJU)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
