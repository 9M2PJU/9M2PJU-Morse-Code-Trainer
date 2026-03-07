/* ===================================================
   MORSE CODE TRAINER — Core Logic & UI
   9M2PJU Morse Code Trainer
   =================================================== */

(() => {
    'use strict';

    // ─── Morse Code Map ────────────────────────────
    const MORSE_MAP = {
        'A': '.-',    'B': '-...',  'C': '-.-.',  'D': '-..',
        'E': '.',     'F': '..-.',  'G': '--.',   'H': '....',
        'I': '..',    'J': '.---',  'K': '-.-',   'L': '.-..',
        'M': '--',    'N': '-.',    'O': '---',   'P': '.--.',
        'Q': '--.-',  'R': '.-.',   'S': '...',   'T': '-',
        'U': '..-',   'V': '...-',  'W': '.--',   'X': '-..-',
        'Y': '-.--',  'Z': '--..',
        '0': '-----', '1': '.----', '2': '..---', '3': '...--',
        '4': '....-', '5': '.....', '6': '-....', '7': '--...',
        '8': '---..', '9': '----.',
        '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.',
        '!': '-.-.--', '/': '-..-.', '(': '-.--.', ')': '-.--.-',
        '&': '.-...', ':': '---...', ';': '-.-.-.', '=': '-...-',
        '+': '.-.-.', '-': '-....-', '_': '..--.-', '"': '.-..-.',
        '$': '...-..-', '@': '.--.-.', ' ': '/'
    };

    // Reverse map for decoding
    const REVERSE_MAP = {};
    for (const [char, code] of Object.entries(MORSE_MAP)) {
        if (char !== ' ') REVERSE_MAP[code] = char;
    }

    // ─── Audio Engine ──────────────────────────────
    class MorseAudio {
        constructor() {
            this.ctx = null;
            this.isPlaying = false;
            this.scheduledNodes = [];
            this.lampElement = null;
            this.lampTimers = [];
        }

        init() {
            if (!this.ctx) {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }

        getTimings() {
            const wpm = parseInt(document.getElementById('wpm-slider').value, 10);
            const dotDuration = 1.2 / wpm;
            return {
                dot: dotDuration,
                dash: dotDuration * 3,
                symbolGap: dotDuration,
                letterGap: dotDuration * 3,
                wordGap: dotDuration * 7
            };
        }

        getFrequency() {
            return parseInt(document.getElementById('freq-slider').value, 10);
        }

        playTone(startTime, duration) {
            const freq = this.getFrequency();
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);

            // Smooth envelope to avoid clicks
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.6, startTime + 0.005);
            gain.gain.setValueAtTime(0.6, startTime + duration - 0.005);
            gain.gain.linearRampToValueAtTime(0, startTime + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(startTime);
            osc.stop(startTime + duration);

            this.scheduledNodes.push(osc);
            return duration;
        }

        scheduleLamp(lamp, startTime, duration) {
            if (!lamp) return;
            const now = this.ctx.currentTime;
            const onDelay = Math.max(0, (startTime - now) * 1000);
            const offDelay = onDelay + duration * 1000;

            this.lampTimers.push(
                setTimeout(() => lamp.classList.add('signal-lamp--on'), onDelay),
                setTimeout(() => lamp.classList.remove('signal-lamp--on'), offDelay)
            );
        }

        async playMorse(morseString, lampElement) {
            this.init();
            this.stop();
            this.isPlaying = true;
            this.lampElement = lampElement;

            const t = this.getTimings();
            let currentTime = this.ctx.currentTime + 0.05;

            const chars = morseString.replace(/\s+/g, ' ').trim();

            for (let i = 0; i < chars.length; i++) {
                if (!this.isPlaying) break;

                const ch = chars[i];
                if (ch === '.') {
                    this.playTone(currentTime, t.dot);
                    this.scheduleLamp(lampElement, currentTime, t.dot);
                    currentTime += t.dot + t.symbolGap;
                } else if (ch === '-') {
                    this.playTone(currentTime, t.dash);
                    this.scheduleLamp(lampElement, currentTime, t.dash);
                    currentTime += t.dash + t.symbolGap;
                } else if (ch === '/') {
                    currentTime += t.wordGap - t.symbolGap;
                } else if (ch === ' ') {
                    currentTime += t.letterGap - t.symbolGap;
                }
            }

            // Wait for playback to finish
            const totalDuration = (currentTime - this.ctx.currentTime) * 1000;
            return new Promise(resolve => {
                const timerId = setTimeout(() => {
                    this.isPlaying = false;
                    resolve();
                }, totalDuration);
                this.lampTimers.push(timerId);
            });
        }

        stop() {
            this.isPlaying = false;
            this.scheduledNodes.forEach(node => {
                try { node.stop(); } catch (e) { /* already stopped */ }
            });
            this.scheduledNodes = [];
            this.lampTimers.forEach(id => clearTimeout(id));
            this.lampTimers = [];
            if (this.lampElement) {
                this.lampElement.classList.remove('signal-lamp--on');
            }
        }
    }

    const audio = new MorseAudio();

    // ─── Utility Functions ─────────────────────────
    function textToMorse(text) {
        return text
            .toUpperCase()
            .split('')
            .map(ch => MORSE_MAP[ch] || '')
            .filter(Boolean)
            .join(' ')
            .replace(/ \/ /g, ' / ');
    }

    function morseToText(morse) {
        return morse
            .trim()
            .split(/\s*[\/|]\s*/)
            .map(word =>
                word.trim().split(/\s+/)
                    .map(code => REVERSE_MAP[code] || '?')
                    .join('')
            )
            .join(' ');
    }

    function formatMorseHTML(morseStr) {
        if (!morseStr) return '<span class="morse-output__placeholder">Morse code will appear here…</span>';
        return morseStr.split('').map(ch => {
            if (ch === '.') return '<span class="dot">·</span>';
            if (ch === '-') return '<span class="dash">—</span>';
            if (ch === '/') return '<span class="word-break"> / </span>';
            if (ch === ' ') return '<span class="separator"> </span>';
            return ch;
        }).join('');
    }

    function createVisualMorse(morseStr) {
        if (!morseStr) return '';
        return morseStr.split('').map(ch => {
            if (ch === '.') return '<span class="visual-dot"></span>';
            if (ch === '-') return '<span class="visual-dash"></span>';
            if (ch === '/') return '<span class="visual-word-space"></span>';
            if (ch === ' ') return '<span class="visual-space"></span>';
            return '';
        }).join('');
    }

    function showToast(message) {
        let toast = document.querySelector('.toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'toast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        toast.classList.add('toast--visible');
        setTimeout(() => toast.classList.remove('toast--visible'), 2000);
    }

    // ─── Tab Navigation ────────────────────────────
    const tabs = document.querySelectorAll('.tab');
    const panels = document.querySelectorAll('.panel');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            audio.stop();
            tabs.forEach(t => { t.classList.remove('tab--active'); t.setAttribute('aria-selected', 'false'); });
            panels.forEach(p => p.classList.remove('panel--active'));
            tab.classList.add('tab--active');
            tab.setAttribute('aria-selected', 'true');
            const panel = document.getElementById(`panel-${tab.dataset.tab}`);
            if (panel) panel.classList.add('panel--active');
        });
    });

    // ─── Speed & Frequency Controls ────────────────
    const wpmSlider = document.getElementById('wpm-slider');
    const wpmValue = document.getElementById('wpm-value');
    const freqSlider = document.getElementById('freq-slider');
    const freqValue = document.getElementById('freq-value');

    wpmSlider.addEventListener('input', () => {
        wpmValue.textContent = `${wpmSlider.value} WPM`;
    });

    freqSlider.addEventListener('input', () => {
        freqValue.textContent = `${freqSlider.value} Hz`;
    });

    // ─── ENCODER ───────────────────────────────────
    const encoderInput = document.getElementById('encoder-input');
    const encoderOutput = document.getElementById('encoder-output');
    const encoderPlay = document.getElementById('encoder-play');
    const encoderStop = document.getElementById('encoder-stop');
    const encoderCopy = document.getElementById('encoder-copy');
    const encoderClear = document.getElementById('encoder-clear');
    const encoderLamp = document.getElementById('encoder-lamp');

    let lastEncoderMorse = '';

    encoderInput.addEventListener('input', () => {
        const text = encoderInput.value;
        if (!text.trim()) {
            encoderOutput.innerHTML = '<span class="morse-output__placeholder">Morse code will appear here…</span>';
            lastEncoderMorse = '';
            return;
        }
        lastEncoderMorse = textToMorse(text);
        encoderOutput.innerHTML = formatMorseHTML(lastEncoderMorse);
    });

    encoderPlay.addEventListener('click', async () => {
        if (!lastEncoderMorse) return;
        encoderPlay.disabled = true;
        encoderStop.disabled = false;
        await audio.playMorse(lastEncoderMorse, encoderLamp);
        encoderPlay.disabled = false;
        encoderStop.disabled = true;
    });

    encoderStop.addEventListener('click', () => {
        audio.stop();
        encoderPlay.disabled = false;
        encoderStop.disabled = true;
    });

    encoderCopy.addEventListener('click', () => {
        if (!lastEncoderMorse) return;
        navigator.clipboard.writeText(lastEncoderMorse).then(() => showToast('Morse code copied!'));
    });

    encoderClear.addEventListener('click', () => {
        encoderInput.value = '';
        encoderOutput.innerHTML = '<span class="morse-output__placeholder">Morse code will appear here…</span>';
        lastEncoderMorse = '';
        audio.stop();
    });

    // ─── DECODER ───────────────────────────────────
    const decoderInput = document.getElementById('decoder-input');
    const decoderOutput = document.getElementById('decoder-output');
    const decoderPlay = document.getElementById('decoder-play');
    const decoderStop = document.getElementById('decoder-stop');
    const decoderCopy = document.getElementById('decoder-copy');
    const decoderClear = document.getElementById('decoder-clear');
    const decoderLamp = document.getElementById('decoder-lamp');

    let lastDecoderText = '';

    decoderInput.addEventListener('input', () => {
        const morse = decoderInput.value;
        if (!morse.trim()) {
            decoderOutput.innerHTML = '<span class="text-output__placeholder">Decoded text will appear here…</span>';
            lastDecoderText = '';
            return;
        }
        lastDecoderText = morseToText(morse);
        decoderOutput.textContent = lastDecoderText;
    });

    decoderPlay.addEventListener('click', async () => {
        const morse = decoderInput.value.trim();
        if (!morse) return;
        decoderPlay.disabled = true;
        decoderStop.disabled = false;
        await audio.playMorse(morse, decoderLamp);
        decoderPlay.disabled = false;
        decoderStop.disabled = true;
    });

    decoderStop.addEventListener('click', () => {
        audio.stop();
        decoderPlay.disabled = false;
        decoderStop.disabled = true;
    });

    decoderCopy.addEventListener('click', () => {
        if (!lastDecoderText) return;
        navigator.clipboard.writeText(lastDecoderText).then(() => showToast('Decoded text copied!'));
    });

    decoderClear.addEventListener('click', () => {
        decoderInput.value = '';
        decoderOutput.innerHTML = '<span class="text-output__placeholder">Decoded text will appear here…</span>';
        lastDecoderText = '';
        audio.stop();
    });

    // ─── TRAINER ───────────────────────────────────
    const challengeMorse = document.getElementById('challenge-morse');
    const challengeVisual = document.getElementById('challenge-visual');
    const trainerInput = document.getElementById('trainer-input');
    const trainerNew = document.getElementById('trainer-new');
    const trainerCheck = document.getElementById('trainer-check');
    const trainerReplay = document.getElementById('trainer-replay');
    const trainerReveal = document.getElementById('trainer-reveal');
    const trainerLamp = document.getElementById('trainer-lamp');
    const trainerFeedback = document.getElementById('trainer-feedback');
    const difficultyGroup = document.getElementById('difficulty-group');
    const scoreCorrect = document.getElementById('score-correct');
    const scoreWrong = document.getElementById('score-wrong');
    const scoreStreak = document.getElementById('score-streak');
    const scoreAccuracy = document.getElementById('score-accuracy');

    let currentChallenge = '';
    let currentChallengeMorse = '';
    let difficulty = 'letters';
    let stats = { correct: 0, wrong: 0, streak: 0, maxStreak: 0 };

    const COMMON_WORDS = [
        'CQ', 'DE', 'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU',
        'ALL', 'CAN', 'HER', 'WAS', 'ONE', 'OUR', 'OUT', 'DAY', 'HAD',
        'HOT', 'OIL', 'SIT', 'NOW', 'OLD', 'RED', 'RUN', 'EAT', 'TOP',
        'FAR', 'NEW', 'USE', 'SAY', 'LOW', 'MAP', 'TEN', 'SOS', 'QTH',
        'QSO', 'RST', 'ANT', 'RIG', 'HAM', 'DIT', 'DAH', 'KEY', 'CW',
        'HELLO', 'WORLD', 'RADIO', 'MORSE', 'CODE', 'SIGNAL', 'COPY',
        'ROGER', 'OVER', 'BREAK', 'TEST', 'CALL', 'BAND', 'WAVE'
    ];

    const CALLSIGN_PREFIXES = ['9M2', '9W2', 'W', 'K', 'N', 'VE', 'VK', 'JA', 'G', 'F', 'DL', 'OH', 'SM', 'EA'];
    const CALLSIGN_SUFFIXES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    function generateChallenge() {
        switch (difficulty) {
            case 'letters': {
                const count = Math.floor(Math.random() * 3) + 1;
                let result = '';
                for (let i = 0; i < count; i++) {
                    result += String.fromCharCode(65 + Math.floor(Math.random() * 26));
                }
                return result;
            }
            case 'numbers': {
                const count = Math.floor(Math.random() * 3) + 1;
                let result = '';
                for (let i = 0; i < count; i++) {
                    result += Math.floor(Math.random() * 10).toString();
                }
                return result;
            }
            case 'mixed': {
                const count = Math.floor(Math.random() * 4) + 2;
                const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                let result = '';
                for (let i = 0; i < count; i++) {
                    result += chars[Math.floor(Math.random() * chars.length)];
                }
                return result;
            }
            case 'words': {
                return COMMON_WORDS[Math.floor(Math.random() * COMMON_WORDS.length)];
            }
            case 'callsigns': {
                const prefix = CALLSIGN_PREFIXES[Math.floor(Math.random() * CALLSIGN_PREFIXES.length)];
                const numPart = Math.floor(Math.random() * 10).toString();
                const suffLen = Math.floor(Math.random() * 3) + 1;
                let suffix = '';
                for (let i = 0; i < suffLen; i++) {
                    suffix += CALLSIGN_SUFFIXES[Math.floor(Math.random() * CALLSIGN_SUFFIXES.length)];
                }
                // Some prefixes already contain a number
                if (/\d/.test(prefix)) {
                    return prefix + suffix;
                }
                return prefix + numPart + suffix;
            }
            default:
                return 'A';
        }
    }

    function newChallenge() {
        audio.stop();
        currentChallenge = generateChallenge();
        currentChallengeMorse = textToMorse(currentChallenge);
        challengeMorse.innerHTML = formatMorseHTML(currentChallengeMorse);
        challengeVisual.innerHTML = createVisualMorse(currentChallengeMorse);
        trainerInput.value = '';
        trainerInput.disabled = false;
        trainerCheck.disabled = false;
        trainerFeedback.textContent = '';
        trainerFeedback.className = 'trainer__feedback';
        trainerInput.focus();

        // Auto-play
        audio.playMorse(currentChallengeMorse, trainerLamp);
    }

    function checkAnswer() {
        if (!currentChallenge) return;
        const answer = trainerInput.value.trim().toUpperCase();
        const correct = currentChallenge.toUpperCase();

        if (answer === correct) {
            stats.correct++;
            stats.streak++;
            if (stats.streak > stats.maxStreak) stats.maxStreak = stats.streak;
            trainerFeedback.textContent = `✅ Correct! "${correct}"`;
            trainerFeedback.className = 'trainer__feedback trainer__feedback--correct';
            trainerInput.disabled = true;
            trainerCheck.disabled = true;
        } else {
            stats.wrong++;
            stats.streak = 0;
            trainerFeedback.textContent = `❌ Wrong! You typed "${answer}" — correct answer: "${correct}"`;
            trainerFeedback.className = 'trainer__feedback trainer__feedback--wrong';
        }

        updateScore();
    }

    function revealAnswer() {
        if (!currentChallenge) return;
        trainerFeedback.textContent = `👁 Answer: "${currentChallenge}"`;
        trainerFeedback.className = 'trainer__feedback trainer__feedback--reveal';
        trainerInput.disabled = true;
        trainerCheck.disabled = true;
    }

    function updateScore() {
        scoreCorrect.textContent = stats.correct;
        scoreWrong.textContent = stats.wrong;
        scoreStreak.textContent = stats.streak;
        const total = stats.correct + stats.wrong;
        scoreAccuracy.textContent = total > 0 ? `${Math.round((stats.correct / total) * 100)}%` : '—';
    }

    // Difficulty toggling
    difficultyGroup.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-difficulty]');
        if (!btn) return;
        difficultyGroup.querySelectorAll('.btn--toggle').forEach(b => b.classList.remove('btn--toggle--active'));
        btn.classList.add('btn--toggle--active');
        difficulty = btn.dataset.difficulty;
    });

    trainerNew.addEventListener('click', newChallenge);
    trainerCheck.addEventListener('click', checkAnswer);
    trainerReveal.addEventListener('click', revealAnswer);
    trainerReplay.addEventListener('click', () => {
        if (currentChallengeMorse) {
            audio.playMorse(currentChallengeMorse, trainerLamp);
        }
    });

    // Enter key to check answer
    trainerInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !trainerCheck.disabled) {
            checkAnswer();
        }
    });

    // ─── Reference Chart ───────────────────────────
    const chartContainer = document.getElementById('reference-chart');

    function buildReferenceChart() {
        const entries = Object.entries(MORSE_MAP).filter(([ch]) => ch !== ' ');
        chartContainer.innerHTML = entries.map(([char, code]) => `
            <div class="ref-item" data-morse="${code}" title="Click to play">
                <span class="ref-item__char">${char}</span>
                <span class="ref-item__morse">${code}</span>
            </div>
        `).join('');
    }

    chartContainer.addEventListener('click', (e) => {
        const item = e.target.closest('.ref-item');
        if (!item) return;
        const morse = item.dataset.morse;
        audio.init();
        audio.playMorse(morse, null);
    });

    buildReferenceChart();

    // ─── Keyboard Shortcut Hints ───────────────────
    document.addEventListener('keydown', (e) => {
        // Ctrl+1/2/3 to switch tabs
        if (e.ctrlKey && ['1', '2', '3'].includes(e.key)) {
            e.preventDefault();
            const idx = parseInt(e.key) - 1;
            tabs[idx]?.click();
        }
    });

    // ─── Initialize Audio Context on First Interaction ──
    document.addEventListener('click', () => audio.init(), { once: true });
    document.addEventListener('keydown', () => audio.init(), { once: true });

})();
