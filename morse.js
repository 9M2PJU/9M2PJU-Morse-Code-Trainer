/* ===================================================
   9M2PJU Morse Code Lab — Core Logic & UI
   Morse and CW practice console by 9M2PJU
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

    // ─── Persistence ───────────────────────────────
    class AppPersistence {
        constructor() {
            this.STORAGE_KEY = 'morse_trainer_data';
            this.defaults = {
                wpm: 20,
                freq: 600,
                farnsworth: 20,
                kochLevel: 1,
                kochSession: { correct: 0, wrong: 0 },
                noiseEnabled: false,
                noiseVol: 5,
                qsbEnabled: false,
                qsbLevel: 5,
                contestWpm: 25,
                contestFreq: 600,
                visualWpm: 10,
                stats: { correct: 0, wrong: 0, streak: 0 },
                contestStats: { qsos: 0, busted: 0, streak: 0 }
            };
        }

        save(data) {
            try {
                const current = this.load();
                const updated = { ...current, ...data };
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
            } catch (e) {
                console.error('Failed to save settings:', e);
            }
        }

        load() {
            try {
                const data = localStorage.getItem(this.STORAGE_KEY);
                return data ? JSON.parse(data) : this.defaults;
            } catch (e) {
                return this.defaults;
            }
        }
    }

    const persistence = new AppPersistence();

    // ─── Audio Engine ──────────────────────────────
    class MorseAudio {
        constructor() {
            this.ctx = null;
            this.isPlaying = false;
            this.scheduledNodes = [];
            this.lampElement = null;
            this.lampTimers = [];
            
            // HF Noise components
            this.noiseGain = null;
            this.isNoiseEnabled = false;

            // QSB (Fading) components
            this.qsbGain = null;
            this.qsbModulator = null;
            this.qsbDepthGain = null;
            this.isQSBEnabled = false;
        }

        init() {
            if (!this.ctx) {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }

        // Get effective settings based on active panel
        getSettings(lampElement) {
            let panelId = '';
            if (lampElement) {
                const panel = lampElement.closest('.panel') || lampElement.closest('section');
                if (panel) panelId = panel.id;
            } else {
                const activePanel = document.querySelector('.panel--active');
                if (activePanel) panelId = activePanel.id;
            }

            let wpmSlider, freqSlider;
            const farnsworthSlider = document.getElementById('farnsworth-slider');

            if (panelId === 'panel-contest') {
                wpmSlider = document.getElementById('contest-wpm-slider');
                freqSlider = document.getElementById('contest-freq-slider');
            } else if (panelId === 'panel-trainer') {
                wpmSlider = document.getElementById('wpm-slider-trainer');
                freqSlider = document.getElementById('freq-slider-trainer');
            } else if (panelId === 'panel-audio-decoder') {
                wpmSlider = document.getElementById('wpm-slider-trainer'); // Fallback or sync
                freqSlider = document.getElementById('freq-slider-decoder');
            } else if (panelId === 'panel-visual-encode' || panelId === 'panel-visual-decode') {
                wpmSlider = document.getElementById('wpm-slider-v-encode');
                freqSlider = null; // Visual mode — no audio freq needed
            } else {
                // Default to encoder
                wpmSlider = document.getElementById('wpm-slider-encoder') || document.getElementById('wpm-slider-trainer');
                freqSlider = document.getElementById('freq-slider-encoder') || document.getElementById('freq-slider-trainer');
            }

            const wpm = wpmSlider ? parseInt(wpmSlider.value, 10) : 20;
            const freq = freqSlider ? parseInt(freqSlider.value, 10) : 600;
            const fwpm = farnsworthSlider ? parseInt(farnsworthSlider.value, 10) : wpm;
            
            const dotDuration = 1.2 / wpm;
            const fDotDuration = 1.2 / Math.min(wpm, fwpm);

            return {
                wpm,
                freq,
                dot: dotDuration,
                dash: dotDuration * 3,
                symbolGap: dotDuration,
                letterGap: fDotDuration * 3,
                wordGap: fDotDuration * 7
            };
        }

        playTone(startTime, duration, freq) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);

            // Smooth envelope to avoid clicks
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(0.6, startTime + 0.002);
            gain.gain.setValueAtTime(0.6, startTime + duration - 0.002);
            gain.gain.linearRampToValueAtTime(0, startTime + duration);

            osc.connect(gain);
            
            // Connect to QSB gain if enabled, otherwise directly to destination
            if (this.isQSBEnabled && this.qsbGain) {
                gain.connect(this.qsbGain);
                this.qsbGain.connect(this.ctx.destination);
            } else {
                gain.connect(this.ctx.destination);
            }

            osc.start(startTime);
            osc.stop(startTime + duration);

            this.scheduledNodes.push(osc);
            return duration;
        }

        // --- HF Noise Simulation ---
        setupNoise() {
            this.init();
            if (this.noiseNode) return;

            const bufferSize = 2 * this.ctx.sampleRate;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            
            // Simple white noise
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            this.noiseNode = this.ctx.createBufferSource();
            this.noiseNode.buffer = buffer;
            this.noiseNode.loop = true;

            this.noiseGain = this.ctx.createGain();
            this.noiseGain.gain.value = 0;

            // Optional: Bandpass filter for more realistic HF sound
            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 800;
            filter.Q.value = 0.5;

            this.noiseNode.connect(filter);
            filter.connect(this.noiseGain);
            
            // Connect noise through QSB as well for atmospheric realism
            if (this.isQSBEnabled && this.qsbGain) {
                this.noiseGain.connect(this.qsbGain);
            } else {
                this.noiseGain.connect(this.ctx.destination);
            }
            
            this.noiseNode.start();
        }

        updateNoise(enabled, volumePercent) {
            if (enabled) {
                this.setupNoise();
                this.noiseGain.gain.setTargetAtTime((volumePercent / 100) * 0.15, this.ctx.currentTime, 0.1);
                this.isNoiseEnabled = true;
            } else if (this.noiseGain) {
                this.noiseGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
                this.isNoiseEnabled = false;
            }
        }

        // --- QSB (Fading) Simulation ---
        setupQSB() {
            this.init();
            if (this.qsbGain) return;

            // Create a gain node for fading
            this.qsbGain = this.ctx.createGain();
            this.qsbGain.gain.value = 1.0;

            // Create a slow modulator (Sine wave at ~0.2Hz to 0.5Hz)
            this.qsbModulator = this.ctx.createOscillator();
            this.qsbModulator.type = 'sine';
            this.qsbModulator.frequency.value = 0.3; // Very slow fade
            
            // Modulation gain (controls depth)
            this.qsbDepthGain = this.ctx.createGain();
            this.qsbDepthGain.gain.value = 0; // Default no depth

            this.qsbModulator.connect(this.qsbDepthGain);
            this.qsbDepthGain.connect(this.qsbGain.gain);
            
            this.qsbModulator.start();
        }

        updateQSB(enabled, depthPercent) {
            if (enabled) {
                this.setupQSB();
                this.isQSBEnabled = true;
                
                // depth 100% means signal can drop to almost zero.
                // Variation depth around the baseline.
                const depth = (depthPercent / 100) * 0.8; 
                const baseline = 1.0 - (depth / 2);
                
                this.qsbGain.gain.setTargetAtTime(baseline, this.ctx.currentTime, 0.2);
                this.qsbDepthGain.gain.setTargetAtTime(depth / 2, this.ctx.currentTime, 0.2);
            } else if (this.qsbGain) {
                this.isQSBEnabled = false;
                this.qsbGain.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.2);
                this.qsbDepthGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
            }
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

        async playMorse(morseString, lampElement, options = {}) {
            this.init();
            this.stop();
            this.isPlaying = true;
            this.lampElement = lampElement;
            const muted = !!options.muted;

            const s = this.getSettings(lampElement);
            let currentTime = this.ctx.currentTime + 0.05;

            const chars = morseString.replace(/\s+/g, ' ').trim();

            for (let i = 0; i < chars.length; i++) {
                if (!this.isPlaying) break;

                const ch = chars[i];
                if (ch === '.') {
                    if (!muted) this.playTone(currentTime, s.dot, s.freq);
                    if (lampElement) this.scheduleLamp(lampElement, currentTime, s.dot);
                    currentTime += s.dot + s.symbolGap;
                } else if (ch === '-') {
                    if (!muted) this.playTone(currentTime, s.dash, s.freq);
                    if (lampElement) this.scheduleLamp(lampElement, currentTime, s.dash);
                    currentTime += s.dash + s.symbolGap;
                } else if (ch === '/') {
                    currentTime += s.wordGap - s.symbolGap;
                } else if (ch === ' ') {
                    currentTime += s.letterGap - s.symbolGap;
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
    
    // ─── Global State ──────────────────────────────
    let stats = { correct: 0, wrong: 0, streak: 0, maxStreak: 0 };
    let contestStats = { qsos: 0, busted: 0, streak: 0 };
    let currentChallenge = '';
    let currentChallengeMorse = '';
    let difficulty = 'koch';
    let isContinuous = false;
    let autoNextTimeout = null;
    let deferredInstallPrompt = null;

    let currentContestQSO = { callsign: '', rst: '', exchange: '', morse: '' };
    let visualChallenge = '';
    let visualChallengeMorse = '';
    let contestType = 'general';
    let qsoHistory = [];
    let isContestContinuous = false;
    let autoNextContestTimeout = null;

    const KOCH_SEQUENCE = "KMRSUAPTLOWI.NJEF0Y,VG5/Q9ZH38B?427C1D6X@";
    const CALLSIGN_PREFIXES = ['K', 'W', 'N', 'A', 'G', 'M', '2', '9V', '9M2', 'YB', 'DU', 'JA', 'HS', 'DL', 'F', 'I', 'EA', 'HL', 'VR2', 'XX9'];
    const CALLSIGN_SUFFIXES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    // ─── DOM Elements ──────────────────────────────
    // Nav
    const tabs = document.querySelectorAll('.tab');
    const panels = document.querySelectorAll('.panel');

    // Global Settings (Sync-linked)
    const encoderWpm = document.getElementById('wpm-slider-encoder');
    const encoderFreq = document.getElementById('freq-slider-encoder');
    const decoderFreq = document.getElementById('freq-slider-decoder');
    const trainerWpm = document.getElementById('wpm-slider-trainer');
    const trainerFreq = document.getElementById('freq-slider-trainer');
    
    // App Settings
    const kochLevelSlider = document.getElementById('koch-level-slider');
    const farnsworthSlider = document.getElementById('farnsworth-slider');

    // Contest Settings & Effects
    const contestWpmSlider = document.getElementById('contest-wpm-slider');
    const contestWpmValue = document.getElementById('contest-wpm-value');
    const contestFreqSlider = document.getElementById('contest-freq-slider');
    const contestFreqValue = document.getElementById('contest-freq-value');
    const noiseToggle = document.getElementById('noise-toggle');
    const noiseVolume = document.getElementById('noise-volume');
    const qsbToggle = document.getElementById('qsb-toggle');
    const qsbLevel = document.getElementById('qsb-level');

    // Visual Morse Elements
    const vEncodeLamp = document.getElementById('v-encode-lamp');
    const vEncodeInput = document.getElementById('v-encode-input');
    const vEncodePlay = document.getElementById('v-encode-play');
    const vEncodeStop = document.getElementById('v-encode-stop');
    const vEncodeWpm = document.getElementById('wpm-slider-v-encode');
    const vEncodeWpmValue = document.getElementById('wpm-value-v-encode');

    const vDecodeLamp = document.getElementById('v-decode-lamp');
    const vDecodeInput = document.getElementById('v-decode-input');
    const vDecodeFeedback = document.getElementById('v-decode-feedback');
    const vDecodeNew = document.getElementById('v-decode-new');
    const vDecodeReplay = document.getElementById('v-decode-replay');
    const vDecodeWpm = document.getElementById('wpm-slider-v-decode');
    const vDecodeWpmValue = document.getElementById('wpm-value-v-decode');
    const vEncodeSoundToggle = document.getElementById('v-encode-sound');
    const vDecodeSoundToggle = document.getElementById('v-decode-sound');
    const installAppBtn = document.getElementById('install-app');

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

    // ─── PWA Install ──────────────────────────────
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js').catch(err => {
                console.warn('Service worker registration failed:', err);
            });
        });
    }

    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        deferredInstallPrompt = event;
        if (installAppBtn) installAppBtn.hidden = false;
    });

    window.addEventListener('appinstalled', () => {
        deferredInstallPrompt = null;
        if (installAppBtn) installAppBtn.hidden = true;
        showToast('App installed for offline practice!');
    });

    if (installAppBtn) {
        installAppBtn.addEventListener('click', async () => {
            if (!deferredInstallPrompt) return;
            deferredInstallPrompt.prompt();
            await deferredInstallPrompt.userChoice;
            deferredInstallPrompt = null;
            installAppBtn.hidden = true;
        });
    }

    // ─── Tab Navigation ────────────────────────────
    function activateTab(tab) {
        if (!tab) return;
        audio.stop();
        if (tab.dataset.tab !== 'contest') {
            audio.updateNoise(false, 0);
            if (noiseToggle) noiseToggle.checked = false;
        }
        tabs.forEach(t => { t.classList.remove('tab--active'); t.setAttribute('aria-selected', 'false'); });
        panels.forEach(p => p.classList.remove('panel--active'));
        tab.classList.add('tab--active');
        tab.setAttribute('aria-selected', 'true');
        const panel = document.getElementById(`panel-${tab.dataset.tab}`);
        if (panel) panel.classList.add('panel--active');

        if (tab.dataset.tab === 'visual-decode') {
            vDecodeInput.value = '';
            vDecodeFeedback.textContent = '';
        }
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => activateTab(tab));
    });

    // ─── Speed & Frequency Controls ────────────────
    // ─── Global Sync Logic ────────────────────────
    function syncGlobalSettings(type, value) {
        if (type === 'wpm') {
            const sliders = ['wpm-slider-encoder', 'wpm-slider-trainer'];
            sliders.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.value = value;
                    const valEl = document.getElementById(id.replace('slider', 'value'));
                    if (valEl) valEl.textContent = `${value} WPM`;
                }
            });
        } else if (type === 'freq') {
            const sliders = ['freq-slider-encoder', 'freq-slider-decoder', 'freq-slider-trainer'];
            sliders.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.value = value;
                    const valEl = document.getElementById(id.replace('slider', 'value'));
                    if (valEl) valEl.textContent = `${value} Hz`;
                }
            });
        }
        saveAllSettings();
    }

    // no-op (moved to top)

    if (encoderWpm) encoderWpm.addEventListener('input', (e) => syncGlobalSettings('wpm', e.target.value));
    if (encoderFreq) encoderFreq.addEventListener('input', (e) => syncGlobalSettings('freq', e.target.value));
    if (decoderFreq) decoderFreq.addEventListener('input', (e) => syncGlobalSettings('freq', e.target.value));
    if (trainerWpm) trainerWpm.addEventListener('input', (e) => syncGlobalSettings('wpm', e.target.value));
    if (trainerFreq) trainerFreq.addEventListener('input', (e) => syncGlobalSettings('freq', e.target.value));

    if (farnsworthSlider) {
        farnsworthSlider.addEventListener('input', () => {
            const fv = document.getElementById('farnsworth-value');
            if (fv) fv.textContent = farnsworthSlider.value;
            saveAllSettings();
        });
    }

    if (kochLevelSlider) {
        kochLevelSlider.addEventListener('input', () => {
            const kv = document.getElementById('koch-level-value');
            if (kv) kv.textContent = kochLevelSlider.value;
            kochSession = { correct: 0, wrong: 0 };
            updateKochPanel();
            saveAllSettings();
        });
    }

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
        if (!lastEncoderMorse) {
            showToast('Please enter some text to encode first!');
            return;
        }
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
        if (!morse) {
            showToast('Please enter some Morse code to decode first!');
            return;
        }
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
    const scoreAccuracy = document.getElementById('score-accuracy');
    const scoreStreak = document.getElementById('score-streak');
    const trainerStop = document.getElementById('trainer-stop');
    const kochPanel = document.getElementById('koch-panel');
    const kochLessonTitle = document.getElementById('koch-lesson-title');
    const kochLessonHelp = document.getElementById('koch-lesson-help');
    const kochCharacters = document.getElementById('koch-characters');
    const kochSessionCorrect = document.getElementById('koch-session-correct');
    const kochSessionAccuracy = document.getElementById('koch-session-accuracy');
    const kochPromote = document.getElementById('koch-promote');
    let kochSession = { correct: 0, wrong: 0 };

    function saveAllSettings() {
        persistence.save({
            wpm: parseInt(encoderWpm.value, 10),
            freq: parseInt(encoderFreq.value, 10),
            farnsworth: parseInt(farnsworthSlider.value, 10),
            kochLevel: parseInt(kochLevelSlider.value, 10),
            kochSession: kochSession,
            noiseEnabled: noiseToggle.checked,
            noiseVol: parseInt(noiseVolume.value, 10),
            qsbEnabled: qsbToggle.checked,
            qsbLevel: parseInt(qsbLevel.value, 10),
            contestWpm: parseInt(contestWpmSlider.value, 10),
            contestFreq: parseInt(contestFreqSlider.value, 10),
            visualWpm: parseInt(vEncodeWpm.value, 10), // Save visual WPM
            stats: stats,
            contestStats: contestStats
        });
    }

    function loadAllSettings() {
        const data = persistence.load();
        
        const wpm = data.wpm || 20;
        const freq = data.freq || 600;

        syncGlobalSettings('wpm', wpm);
        syncGlobalSettings('freq', freq);

        if (farnsworthSlider) farnsworthSlider.value = data.farnsworth || 20;
        if (kochLevelSlider) kochLevelSlider.value = data.kochLevel || 1;
        
        const fv = document.getElementById('farnsworth-value');
        if (fv) fv.textContent = farnsworthSlider.value;
        const kv = document.getElementById('koch-level-value');
        if (kv) kv.textContent = kochLevelSlider.value;

        // Audio effects
        noiseToggle.checked = !!data.noiseEnabled;
        noiseVolume.value = data.noiseVol || 5;
        qsbToggle.checked = !!data.qsbEnabled;
        qsbLevel.value = data.qsbLevel || 5;

        // Contest settings
        if (contestWpmSlider) contestWpmSlider.value = data.contestWpm || 25;
        if (contestFreqSlider) contestFreqSlider.value = data.contestFreq || 600;
        if (contestWpmValue) contestWpmValue.textContent = `${contestWpmSlider.value} WPM`;
        if (contestFreqValue) contestFreqValue.textContent = `${contestFreqSlider.value} Hz`;

        // Load stats
        if (data.stats) Object.assign(stats, data.stats);
        if (data.contestStats) Object.assign(contestStats, data.contestStats);
        if (data.kochSession) Object.assign(kochSession, data.kochSession);
        
        updateScore();
        updateContestStats();
        updateKochPanel();
        updateHFNoise();
        updateQSB();
    }


    const COMMON_WORDS = [
        'CQ', 'DE', 'THE', 'AND', 'FOR', 'ARE', 'BUT', 'NOT', 'YOU',
        'ALL', 'CAN', 'HER', 'WAS', 'ONE', 'OUR', 'OUT', 'DAY', 'HAD',
        'HOT', 'OIL', 'SIT', 'NOW', 'OLD', 'RED', 'RUN', 'EAT', 'TOP',
        'FAR', 'NEW', 'USE', 'SAY', 'LOW', 'MAP', 'TEN', 'SOS', 'QTH',
        'QSO', 'RST', 'ANT', 'RIG', 'HAM', 'DIT', 'DAH', 'KEY', 'CW',
        'HELLO', 'WORLD', 'RADIO', 'MORSE', 'CODE', 'SIGNAL', 'COPY',
        'ROGER', 'OVER', 'BREAK', 'TEST', 'CALL', 'BAND', 'WAVE'
    ];


    const PROSIGNS = [
        { text: 'BT', meaning: 'Break' },
        { text: 'AR', meaning: 'End of message' },
        { text: 'K', meaning: 'Go ahead' },
        { text: 'KN', meaning: 'Go ahead (specific station)' },
        { text: 'SK', meaning: 'End of contact' },
        { text: 'R', meaning: 'Roger/Received' },
        { text: 'AS', meaning: 'Wait' }
    ];

    const ABBREVIATIONS = [
        'RST', 'QTH', 'RIG', 'ANT', 'WX', 'TEMP', 'NAME', 'OP', 'HW', 'CPY',
        'FB', 'OM', 'XYL', 'YL', 'GM', 'GA', 'GE', 'GN', '73', '88', 'GL',
        'SKED', 'FER', 'AGN', 'SNR', 'TU', 'UR', 'VY', 'WID', 'ES'
    ];

    function getKochChars() {
        const level = parseInt(kochLevelSlider.value, 10);
        const charCount = Math.min(Math.max(level + 1, 2), KOCH_SEQUENCE.length);
        return KOCH_SEQUENCE.slice(0, charCount).split('');
    }

    function updateKochPanel() {
        if (!kochPanel) return;
        const chars = getKochChars();
        const newest = chars[chars.length - 1];
        const total = kochSession.correct + kochSession.wrong;
        const accuracy = total ? `${Math.round((kochSession.correct / total) * 100)}%` : '—';

        kochPanel.hidden = difficulty !== 'koch';
        kochLessonTitle.textContent = `Lesson ${kochLevelSlider.value} · New: ${newest}`;
        kochLessonHelp.textContent = `Active set: ${chars.length} characters. Copy the sound first; use Replay only after one honest attempt.`;
        kochCharacters.innerHTML = chars.map((ch, index) => {
            const className = index === chars.length - 1 ? 'koch-char koch-char--new' : 'koch-char';
            return `<span class="${className}" title="${textToMorse(ch)}">${ch}</span>`;
        }).join('');
        kochSessionCorrect.textContent = kochSession.correct;
        kochSessionAccuracy.textContent = accuracy;
    }

    function generateKochChallenge() {
        const chars = getKochChars();
        const newest = chars[chars.length - 1];
        const weightedChars = chars.concat([newest, newest, newest]);
        const groups = [];

        for (let group = 0; group < 5; group++) {
            let segment = '';
            for (let i = 0; i < 5; i++) {
                segment += weightedChars[Math.floor(Math.random() * weightedChars.length)];
            }
            groups.push(segment);
        }

        return groups.join(' ');
    }

    function normalizeTrainerAnswer(value) {
        const normalized = value.trim().toUpperCase();
        return difficulty === 'koch' ? normalized.replace(/\s+/g, '') : normalized;
    }

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
            case 'koch': {
                return generateKochChallenge();
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
            case 'prosigns': {
                return PROSIGNS[Math.floor(Math.random() * PROSIGNS.length)].text;
            }
            case 'abbreviations': {
                return ABBREVIATIONS[Math.floor(Math.random() * ABBREVIATIONS.length)];
            }
            default:
                return 'A';
        }
    }

    function stopContinuous() {
        isContinuous = false;
        if (autoNextTimeout) {
            clearTimeout(autoNextTimeout);
            autoNextTimeout = null;
        }
        trainerStop.style.display = 'none';
        trainerNew.style.display = 'inline-flex';
    }

    function newChallenge() {
        audio.stop();
        if (autoNextTimeout) {
            clearTimeout(autoNextTimeout);
            autoNextTimeout = null;
        }
        
        // Show stop button if in continuous mode
        if (isContinuous) {
            trainerStop.style.display = 'inline-flex';
            trainerNew.style.display = 'none';
        }

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
        const answer = normalizeTrainerAnswer(trainerInput.value);
        const correct = normalizeTrainerAnswer(currentChallenge);

        if (answer === correct) {
            stats.correct++;
            stats.streak++;
            if (stats.streak > stats.maxStreak) stats.maxStreak = stats.streak;
            trainerFeedback.className = 'trainer__feedback trainer__feedback--correct';
            trainerFeedback.textContent = 'Correct.';
            trainerInput.disabled = true;
            trainerCheck.disabled = true;
            if (difficulty === 'koch') {
                kochSession.correct++;
                const total = kochSession.correct + kochSession.wrong;
                const accuracy = Math.round((kochSession.correct / total) * 100);
                trainerFeedback.textContent = accuracy >= 90 && kochSession.correct >= 10
                    ? 'Correct. You are ready for the next Koch lesson.'
                    : 'Correct.';
                updateKochPanel();
            }

            if (isContinuous) {
                autoNextTimeout = setTimeout(newChallenge, 1500);
            }
        } else {
            stats.wrong++;
            stats.streak = 0;
            trainerFeedback.textContent = `❌ Wrong! You typed "${answer}" — correct answer: "${correct}"`;
            trainerFeedback.className = 'trainer__feedback trainer__feedback--wrong';
            if (difficulty === 'koch') {
                kochSession.wrong++;
                updateKochPanel();
            }
        }

        updateScore();
        saveAllSettings();
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
        updateKochPanel();
    });

    if (kochPromote) {
        kochPromote.addEventListener('click', () => {
            const current = parseInt(kochLevelSlider.value, 10);
            kochLevelSlider.value = Math.min(parseInt(kochLevelSlider.max, 10), current + 1);
            kochSession = { correct: 0, wrong: 0 };
            const kv = document.getElementById('koch-level-value');
            if (kv) kv.textContent = kochLevelSlider.value;
            updateKochPanel();
            saveAllSettings();
            showToast(`Koch lesson ${kochLevelSlider.value}`);
        });
    }

    trainerNew.addEventListener('click', () => {
        isContinuous = true;
        newChallenge();
    });

    trainerStop.addEventListener('click', stopContinuous);
    
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

    // ─── AUDIO MORSE DECODER ────────────────────────
    const audioStartBtn = document.getElementById('audio-start');
    const audioStopBtn = document.getElementById('audio-stop');
    const audioClearBtn = document.getElementById('audio-clear');
    const audioLamp = document.getElementById('audio-lamp');
    const audioStatus = document.getElementById('audio-status');
    const audioMagnitude = document.getElementById('audio-magnitude');
    const audioMorseOutput = document.getElementById('audio-morse-output');
    const audioTextOutput = document.getElementById('audio-text-output');
    const audioCopyMorse = document.getElementById('audio-copy-morse');
    const audioCopyText = document.getElementById('audio-copy-text');
    const detectFreqSlider = document.getElementById('freq-slider-decoder');
    const detectFreqValue = document.getElementById('freq-value-decoder');
    const thresholdSlider = document.getElementById('threshold-slider');
    const thresholdValue = document.getElementById('threshold-value');
    const waveformCanvas = document.getElementById('audio-waveform');
    const waveformCtx = waveformCanvas.getContext('2d');

    let audioDecoderCtx = null;
    let micStream = null;
    let analyserNode = null;
    let audioProcessorInterval = null;
    let waveformAnimFrame = null;
    let isListening = false;

    // Decoder state machine
    let decoderState = {
        morseBuffer: '',     // current character being built (dots/dashes)
        fullMorse: '',       // complete morse string
        decodedText: '',     // decoded text
        toneOn: false,
        toneStartTime: 0,
        silenceStartTime: 0,
        lastProcessTime: 0,
        dotDuration: 80,     // will be auto-calibrated
        samples: []          // recent tone durations for calibration
    };

    // Slider events
    detectFreqSlider.addEventListener('input', () => {
        detectFreqValue.textContent = `${detectFreqSlider.value} Hz`;
    });

    thresholdSlider.addEventListener('input', () => {
        thresholdValue.textContent = thresholdSlider.value;
    });

    // Goertzel algorithm — detect energy at a specific frequency
    function goertzelMagnitude(samples, targetFreq, sampleRate) {
        const N = samples.length;
        const k = Math.round(N * targetFreq / sampleRate);
        const w = (2 * Math.PI * k) / N;
        const cosW = Math.cos(w);
        const coeff = 2 * cosW;

        let s0 = 0, s1 = 0, s2 = 0;
        for (let i = 0; i < N; i++) {
            s0 = samples[i] + coeff * s1 - s2;
            s2 = s1;
            s1 = s0;
        }

        const power = s1 * s1 + s2 * s2 - coeff * s1 * s2;
        return Math.sqrt(Math.abs(power)) / N;
    }

    function resetDecoderState() {
        decoderState = {
            morseBuffer: '',
            fullMorse: '',
            decodedText: '',
            toneOn: false,
            toneStartTime: 0,
            silenceStartTime: 0,
            lastProcessTime: 0,
            dotDuration: 80,
            samples: []
        };
    }

    function updateAudioOutputs() {
        const morseDisplay = decoderState.fullMorse + (decoderState.morseBuffer ? ' ' + decoderState.morseBuffer : '');
        if (morseDisplay.trim()) {
            audioMorseOutput.innerHTML = formatMorseHTML(morseDisplay.trim());
        } else {
            audioMorseOutput.innerHTML = '<span class="morse-output__placeholder">Start listening to detect Morse code…</span>';
        }

        if (decoderState.decodedText.trim()) {
            // Also try to decode the current buffer
            let liveText = decoderState.decodedText;
            if (decoderState.morseBuffer) {
                const partial = REVERSE_MAP[decoderState.morseBuffer];
                if (partial) liveText += partial;
            }
            audioTextOutput.textContent = liveText;
        } else {
            audioTextOutput.innerHTML = '<span class="text-output__placeholder">Decoded text will appear here…</span>';
        }
    }

    function flushCurrentChar() {
        if (decoderState.morseBuffer) {
            const char = REVERSE_MAP[decoderState.morseBuffer] || '?';
            decoderState.decodedText += char;
            decoderState.fullMorse += (decoderState.fullMorse ? ' ' : '') + decoderState.morseBuffer;
            decoderState.morseBuffer = '';
        }
    }

    function processAudioFrame() {
        if (!isListening || !analyserNode) return;

        const bufferLength = analyserNode.fftSize;
        const dataArray = new Float32Array(bufferLength);
        analyserNode.getFloatTimeDomainData(dataArray);

        const targetFreq = parseInt(detectFreqSlider.value, 10);
        const threshold = parseInt(thresholdSlider.value, 10);
        const sampleRate = audioDecoderCtx.sampleRate;

        const magnitude = goertzelMagnitude(dataArray, targetFreq, sampleRate) * 1000;
        const isTonePresent = magnitude > threshold;
        const now = performance.now();

        audioMagnitude.textContent = `Level: ${magnitude.toFixed(1)}`;

        // Update lamp
        if (isTonePresent) {
            audioLamp.classList.add('signal-lamp--on');
        } else {
            audioLamp.classList.remove('signal-lamp--on');
        }

        // State machine
        if (isTonePresent && !decoderState.toneOn) {
            // Tone just started
            decoderState.toneOn = true;
            decoderState.toneStartTime = now;

            // Check silence duration (gap analysis)
            if (decoderState.silenceStartTime > 0) {
                const silenceDur = now - decoderState.silenceStartTime;
                const dotRef = decoderState.dotDuration;

                if (silenceDur > dotRef * 5) {
                    // Word gap
                    flushCurrentChar();
                    decoderState.fullMorse += ' /';
                    decoderState.decodedText += ' ';
                    updateAudioOutputs();
                } else if (silenceDur > dotRef * 2) {
                    // Letter gap
                    flushCurrentChar();
                    updateAudioOutputs();
                }
                // else: symbol gap (within same character), do nothing
            }
        } else if (!isTonePresent && decoderState.toneOn) {
            // Tone just ended
            decoderState.toneOn = false;
            decoderState.silenceStartTime = now;

            const toneDur = now - decoderState.toneStartTime;
            const dotRef = decoderState.dotDuration;

            // Classify as dot or dash
            if (toneDur < dotRef * 2) {
                decoderState.morseBuffer += '.';
                // Calibrate dot duration
                decoderState.samples.push(toneDur);
                if (decoderState.samples.length > 10) decoderState.samples.shift();
            } else {
                decoderState.morseBuffer += '-';
                // Calibrate: dash ≈ 3× dot
                decoderState.samples.push(toneDur / 3);
                if (decoderState.samples.length > 10) decoderState.samples.shift();
            }

            // Recalibrate dot duration from samples
            if (decoderState.samples.length >= 3) {
                const avg = decoderState.samples.reduce((a, b) => a + b, 0) / decoderState.samples.length;
                decoderState.dotDuration = Math.max(30, Math.min(300, avg));
            }

            updateAudioOutputs();
        } else if (!isTonePresent && !decoderState.toneOn && decoderState.silenceStartTime > 0) {
            // Extended silence — auto-flush character
            const silenceDur = now - decoderState.silenceStartTime;
            const dotRef = decoderState.dotDuration;

            if (decoderState.morseBuffer && silenceDur > dotRef * 3) {
                flushCurrentChar();
                updateAudioOutputs();
            }
        }

        decoderState.lastProcessTime = now;
    }

    // Waveform visualization
    function drawWaveform() {
        if (!isListening || !analyserNode) return;

        const canvas = waveformCanvas;
        const ctx = waveformCtx;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        canvas.width = width * (window.devicePixelRatio || 1);
        canvas.height = height * (window.devicePixelRatio || 1);
        ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserNode.getByteTimeDomainData(dataArray);

        ctx.clearRect(0, 0, width, height);

        // Visualizer background
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, 'rgba(29, 33, 31, 0.94)');
        gradient.addColorStop(1, 'rgba(18, 21, 19, 0.94)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Center line
        ctx.strokeStyle = 'rgba(39, 197, 179, 0.14)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        // Waveform
        const isToneOn = audioLamp.classList.contains('signal-lamp--on');
        ctx.lineWidth = 2;
        ctx.strokeStyle = isToneOn ? '#27c5b3' : '#7f8a83';
        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * height / 2;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();

        // Glow effect when tone detected
        if (isToneOn) {
            ctx.shadowColor = '#27c5b3';
            ctx.shadowBlur = 10;
            ctx.strokeStyle = 'rgba(39, 197, 179, 0.32)';
            ctx.lineWidth = 4;
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        waveformAnimFrame = requestAnimationFrame(drawWaveform);
    }

    async function startListening() {
        try {
            audioDecoderCtx = new (window.AudioContext || window.webkitAudioContext)();
            micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

            const source = audioDecoderCtx.createMediaStreamSource(micStream);
            analyserNode = audioDecoderCtx.createAnalyser();
            analyserNode.fftSize = 2048;
            analyserNode.smoothingTimeConstant = 0.3;
            source.connect(analyserNode);

            isListening = true;
            resetDecoderState();
            updateAudioOutputs();

            audioStartBtn.disabled = true;
            audioStopBtn.disabled = false;
            audioStatus.textContent = '🎧 Listening…';
            audioStatus.classList.add('audio-decoder__status--listening');

            // Process audio at ~60fps
            audioProcessorInterval = setInterval(processAudioFrame, 16);
            drawWaveform();

        } catch (err) {
            showToast('Microphone access denied or unavailable');
            console.error('Mic error:', err);
        }
    }

    function stopListening() {
        isListening = false;

        if (audioProcessorInterval) {
            clearInterval(audioProcessorInterval);
            audioProcessorInterval = null;
        }
        if (waveformAnimFrame) {
            cancelAnimationFrame(waveformAnimFrame);
            waveformAnimFrame = null;
        }
        if (micStream) {
            micStream.getTracks().forEach(t => t.stop());
            micStream = null;
        }
        if (audioDecoderCtx) {
            audioDecoderCtx.close().catch(() => {});
            audioDecoderCtx = null;
        }
        analyserNode = null;

        // Flush any remaining buffer
        flushCurrentChar();
        updateAudioOutputs();

        audioLamp.classList.remove('signal-lamp--on');
        audioStartBtn.disabled = false;
        audioStopBtn.disabled = true;
        audioStatus.textContent = 'Stopped';
        audioStatus.classList.remove('audio-decoder__status--listening');
        audioMagnitude.textContent = 'Level: —';
    }

    audioStartBtn.addEventListener('click', startListening);
    audioStopBtn.addEventListener('click', stopListening);

    audioClearBtn.addEventListener('click', () => {
        resetDecoderState();
        audioMorseOutput.innerHTML = '<span class="morse-output__placeholder">Start listening to detect Morse code…</span>';
        audioTextOutput.innerHTML = '<span class="text-output__placeholder">Decoded text will appear here…</span>';
    });

    audioCopyMorse.addEventListener('click', () => {
        const morse = decoderState.fullMorse.trim();
        if (morse) navigator.clipboard.writeText(morse).then(() => showToast('Morse code copied!'));
    });

    audioCopyText.addEventListener('click', () => {
        const text = decoderState.decodedText.trim();
        if (text) navigator.clipboard.writeText(text).then(() => showToast('Decoded text copied!'));
    });

    // ─── CONTEST TRAINER ───────────────────────────
    const contestTypeGroup = document.getElementById('contest-type-group');
    const contestMorse = document.getElementById('contest-morse');
    const contestVisual = document.getElementById('contest-visual');
    const contestCallsignInput = document.getElementById('contest-callsign');
    const contestRstInput = document.getElementById('contest-rst');
    const contestExchangeInput = document.getElementById('contest-exchange');
    const contestNewBtn = document.getElementById('contest-new');
    const contestLogBtn = document.getElementById('contest-log');
    const contestStopBtn = document.getElementById('contest-stop');
    const contestReplayBtn = document.getElementById('contest-replay');
    const contestRevealBtn = document.getElementById('contest-reveal');
    const contestLamp = document.getElementById('contest-lamp');
    const contestFeedback = document.getElementById('contest-feedback');
    const contestQSOsValue = document.getElementById('contest-qsos');
    const contestBustedValue = document.getElementById('contest-busted');
    const contestStreakValue = document.getElementById('contest-streak');
    const contestAccuracyValue = document.getElementById('contest-accuracy');
    const contestLogBody = document.getElementById('contest-log-body');
    // no-op (moved to top)

    contestWpmSlider.addEventListener('input', () => {
        contestWpmValue.textContent = `${contestWpmSlider.value} WPM`;
    });

    contestFreqSlider.addEventListener('input', () => {
        contestFreqValue.textContent = `${contestFreqSlider.value} Hz`;
    });

    const updateHFNoise = () => {
        audio.updateNoise(noiseToggle.checked, parseInt(noiseVolume.value, 10));
    };

    noiseToggle.addEventListener('change', () => { updateHFNoise(); saveAllSettings(); });
    noiseVolume.addEventListener('input', () => { updateHFNoise(); saveAllSettings(); });

    const updateQSB = () => {
        audio.updateQSB(qsbToggle.checked, parseInt(qsbLevel.value, 10));
        saveAllSettings();
    };

    qsbToggle.addEventListener('change', () => { updateQSB(); saveAllSettings(); });
    qsbLevel.addEventListener('input', () => { updateQSB(); saveAllSettings(); });

    // no-op (moved to top)

    const US_STATES = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];
    const FIELD_DAY_CLASSES = ['1A', '2A', '3A', '4A', '5A', '1B', '2B', '1C', '1D', '1E', '1F'];
    const SOTA_REFS = ['SP/BA-001', 'G/LD-001', 'W6/SC-001', 'VK2/HU-001', 'JA/SO-001'];

    function generateContestQSO() {
        // Generate a random callsign
        const prefix = CALLSIGN_PREFIXES[Math.floor(Math.random() * CALLSIGN_PREFIXES.length)];
        const num = Math.floor(Math.random() * 10);
        const suffLen = Math.floor(Math.random() * 3) + 1;
        let suffix = '';
        for (let i = 0; i < suffLen; i++) suffix += CALLSIGN_SUFFIXES[Math.floor(Math.random() * CALLSIGN_SUFFIXES.length)];
        const callsign = prefix + (/\d/.test(prefix) ? '' : num) + suffix;

        let rst = (Math.random() > 0.8) ? '5nn' : '599';
        if (Math.random() > 0.95) rst = (Math.floor(Math.random() * 3) + 3) + '99';

        let exchange = '';
        switch (contestType) {
            case 'dx':
                exchange = (Math.floor(Math.random() * 40) + 1).toString().padStart(2, '0'); // Zone
                break;
            case 'fieldday':
                exchange = FIELD_DAY_CLASSES[Math.floor(Math.random() * FIELD_DAY_CLASSES.length)] + ' ' + US_STATES[Math.floor(Math.random() * US_STATES.length)];
                break;
            case 'sota':
                exchange = SOTA_REFS[Math.floor(Math.random() * SOTA_REFS.length)];
                break;
            default: // general
                exchange = (Math.floor(Math.random() * 999) + 1).toString().padStart(3, '0');
        }

        const morse = `${callsign} ${rst} ${exchange}`;
        return { callsign, rst: rst.replace(/n/g, '9'), exchange, morse: textToMorse(morse) };
    }

    function stopContestContinuous() {
        isContestContinuous = false;
        if (autoNextContestTimeout) {
            clearTimeout(autoNextContestTimeout);
            autoNextContestTimeout = null;
        }
        contestStopBtn.style.display = 'none';
        contestNewBtn.style.display = 'inline-flex';
    }

    function startNewQSO() {
        audio.stop();
        if (autoNextContestTimeout) {
            clearTimeout(autoNextContestTimeout);
            autoNextContestTimeout = null;
        }

        // Show stop button if in continuous mode
        if (isContestContinuous) {
            contestStopBtn.style.display = 'inline-flex';
            contestNewBtn.style.display = 'none';
        }

        currentContestQSO = generateContestQSO();
        
        contestMorse.innerHTML = formatMorseHTML(currentContestQSO.morse);
        contestVisual.innerHTML = createVisualMorse(currentContestQSO.morse);
        
        contestCallsignInput.value = '';
        contestRstInput.value = '';
        contestExchangeInput.value = '';
        contestLogBtn.disabled = false;
        contestFeedback.textContent = '';
        contestFeedback.className = 'trainer__feedback';
        
        contestCallsignInput.focus();
        audio.playMorse(currentContestQSO.morse, contestLamp);
    }

    function logQSO() {
        if (!currentContestQSO.callsign) return;

        const typedCall = contestCallsignInput.value.trim().toUpperCase();
        const typedRst = contestRstInput.value.trim().toUpperCase().replace(/N/g, '9');
        const typedExch = contestExchangeInput.value.trim().toUpperCase();

        const correctCall = currentContestQSO.callsign.toUpperCase();
        const correctRst = currentContestQSO.rst.toUpperCase();
        const correctExch = currentContestQSO.exchange.toUpperCase();

        const isCorrect = (typedCall === correctCall && typedRst === correctRst && typedExch === correctExch);

        if (isCorrect) {
            contestStats.qsos++;
            contestStats.streak++;
            contestFeedback.textContent = `✅ QSO Logged! ${correctCall} ${correctRst} ${correctExch}`;
            contestFeedback.className = 'trainer__feedback trainer__feedback--correct';
            addQSOToHistory(currentContestQSO, 'Correct');

            if (isContestContinuous) {
                autoNextContestTimeout = setTimeout(startNewQSO, 2000);
            }
        } else {
            contestStats.busted++;
            contestStats.streak = 0;
            contestFeedback.textContent = `❌ Busted! Expected: ${correctCall} ${correctRst} ${correctExch}`;
            contestFeedback.className = 'trainer__feedback trainer__feedback--wrong';
            addQSOToHistory(currentContestQSO, 'Busted');
        }

        updateContestStats();
        contestLogBtn.disabled = true;
        saveAllSettings();
    }

    function addQSOToHistory(qso, result) {
        qsoHistory.unshift({ ...qso, result, id: qsoHistory.length + 1 });
        if (qsoHistory.length > 50) qsoHistory.pop();
        renderQSOLog();
    }

    function renderQSOLog() {
        contestLogBody.innerHTML = qsoHistory.map(h => `
            <tr>
                <td>${h.id}</td>
                <td>${h.callsign}</td>
                <td>${h.rst}</td>
                <td>${h.exchange}</td>
                <td class="${h.result === 'Correct' ? 'result--correct' : 'result--wrong'}">${h.result}</td>
            </tr>
        `).join('');
    }

    function updateContestStats() {
        contestQSOsValue.textContent = contestStats.qsos;
        contestBustedValue.textContent = contestStats.busted;
        contestStreakValue.textContent = contestStats.streak;
        const total = contestStats.qsos + contestStats.busted;
        contestAccuracyValue.textContent = total > 0 ? `${Math.round((contestStats.qsos / total) * 100)}%` : '—';
    }

    contestTypeGroup.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-contest]');
        if (!btn) return;
        contestTypeGroup.querySelectorAll('.btn--toggle').forEach(b => b.classList.remove('btn--toggle--active'));
        btn.classList.add('btn--toggle--active');
        contestType = btn.dataset.contest;
    });

    contestNewBtn.addEventListener('click', () => {
        isContestContinuous = true;
        startNewQSO();
    });

    contestStopBtn.addEventListener('click', stopContestContinuous);

    contestLogBtn.addEventListener('click', logQSO);
    contestReplayBtn.addEventListener('click', () => {
        if (currentContestQSO.morse) audio.playMorse(currentContestQSO.morse, contestLamp);
    });
    contestRevealBtn.addEventListener('click', () => {
        if (!currentContestQSO.callsign) return;
        contestFeedback.textContent = `👁 Exchange: ${currentContestQSO.callsign} ${currentContestQSO.rst} ${currentContestQSO.exchange}`;
        contestFeedback.className = 'trainer__feedback trainer__feedback--reveal';
    });

    // Enter key to log
    [contestCallsignInput, contestRstInput, contestExchangeInput].forEach(input => {
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !contestLogBtn.disabled) logQSO();
        });
    });

    // ─── Keyboard Shortcut Hints ───────────────────
    document.addEventListener('keydown', (e) => {
        // Ctrl+1 through Ctrl+7 to switch tabs
        if (e.ctrlKey && ['1', '2', '3', '4', '5', '6', '7'].includes(e.key)) {
            e.preventDefault();
            const idx = parseInt(e.key) - 1;
            activateTab(tabs[idx]);
        }
    });

    // ─── Initialize Audio Context on First Interaction ──
    document.addEventListener('click', () => audio.init(), { once: true });
    document.addEventListener('keydown', () => audio.init(), { once: true });

    // ─── Load Persistence ──
    loadAllSettings();
    const requestedTab = new URLSearchParams(window.location.search).get('tab');
    if (requestedTab) {
        activateTab(document.querySelector(`.tab[data-tab="${requestedTab}"]`));
    }

    // ─── Visual Morse Logic ────────────────────────
    vEncodeWpm.addEventListener('input', () => {
        const val = vEncodeWpm.value;
        vEncodeWpmValue.textContent = `${val} WPM`;
        vDecodeWpm.value = val;
        vDecodeWpmValue.textContent = `${val} WPM`;
        saveAllSettings();
    });

    vDecodeWpm.addEventListener('input', () => {
        const val = vDecodeWpm.value;
        vDecodeWpmValue.textContent = `${val} WPM`;
        vEncodeWpm.value = val;
        vEncodeWpmValue.textContent = `${val} WPM`;
        saveAllSettings();
    });

    vEncodePlay.addEventListener('click', async () => {
        const text = vEncodeInput.value.trim();
        if (!text) return;

        vEncodePlay.disabled = true;
        vEncodeStop.disabled = false;
        
        const morse = textToMorse(text);
        const muted = !vEncodeSoundToggle.checked;
        await audio.playMorse(morse, vEncodeLamp, { muted });
        
        vEncodePlay.disabled = false;
        vEncodeStop.disabled = true;
    });

    vEncodeStop.addEventListener('click', () => {
        audio.stop();
        vEncodePlay.disabled = false;
        vEncodeStop.disabled = true;
    });

    function startNewVisualChallenge() {
        audio.stop();
        const words = ['SOS', 'HELLO', 'MORSE', 'SIGNAL', 'CQ', 'TEST', 'NAVY', '9M2PJU'];
        visualChallenge = words[Math.floor(Math.random() * words.length)];
        visualChallengeMorse = textToMorse(visualChallenge);
        
        vDecodeInput.value = '';
        vDecodeInput.focus();
        vDecodeFeedback.textContent = 'Signaling...';
        vDecodeFeedback.className = 'feedback-msg';
        
        audio.playMorse(visualChallengeMorse, vDecodeLamp, { muted: !vDecodeSoundToggle.checked });
    }

    vDecodeNew.addEventListener('click', startNewVisualChallenge);
    vDecodeReplay.addEventListener('click', () => {
        if (visualChallengeMorse) {
            audio.stop();
            audio.playMorse(visualChallengeMorse, vDecodeLamp, { muted: !vDecodeSoundToggle.checked });
        }
    });

    vDecodeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const typed = vDecodeInput.value.trim().toUpperCase();
            if (typed === visualChallenge.trim().toUpperCase()) {
                vDecodeFeedback.textContent = '✓ Correct!';
                vDecodeFeedback.className = 'feedback-msg feedback-msg--success';
                setTimeout(startNewVisualChallenge, 1500);
            } else {
                vDecodeFeedback.textContent = '✗ Try again';
                vDecodeFeedback.className = 'feedback-msg feedback-msg--error';
            }
        }
    });

    // ─── Initialize Visual Settings ────────────────
    function loadVisualSettings() {
        const s = persistence.load();
        vEncodeWpm.value = s.visualWpm || 10;
        vEncodeWpmValue.textContent = `${vEncodeWpm.value} WPM`;
        vDecodeWpm.value = vEncodeWpm.value;
        vDecodeWpmValue.textContent = `${vEncodeWpm.value} WPM`;
    }
    
    loadVisualSettings();

})();
