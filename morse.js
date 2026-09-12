/* ===================================================
   9M2PJU Morse Code Lab — Core Logic & UI
   Professional CW practice console by 9M2PJU
   =================================================== */

(() => {
    'use strict';

    // ─── Morse Code Map & Phonetics ──────────────────
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

    const PHONETICS = {
        'A': 'di-dah', 'B': 'dah-di-di-dit', 'C': 'dah-di-dah-dit', 'D': 'dah-di-dit',
        'E': 'dit', 'F': 'di-di-dah-dit', 'G': 'dah-dah-dit', 'H': 'di-di-di-dit',
        'I': 'di-dit', 'J': 'di-dah-dah-dah', 'K': 'dah-di-dah', 'L': 'di-dah-di-dit',
        'M': 'dah-dah', 'N': 'dah-dit', 'O': 'dah-dah-dah', 'P': 'di-dah-dah-dit',
        'Q': 'dah-dah-di-dah', 'R': 'di-dah-dit', 'S': 'di-di-dit', 'T': 'dah',
        'U': 'di-di-dah', 'V': 'di-di-di-dah', 'W': 'di-dah-dah', 'X': 'dah-di-di-dah',
        'Y': 'dah-di-dah-dah', 'Z': 'dah-dah-di-dit',
        '0': 'dah-dah-dah-dah-dah', '1': 'di-dah-dah-dah-dah', '2': 'di-di-dah-dah-dah',
        '3': 'di-di-di-dah-dah', '4': 'di-di-di-di-dah', '5': 'di-di-di-di-dit',
        '6': 'dah-di-di-di-dit', '7': 'dah-dah-di-di-dit', '8': 'dah-dah-dah-di-dit',
        '9': 'dah-dah-dah-dah-dit',
        '.': 'di-dah-di-dah-di-dah', ',': 'dah-dah-di-di-dah-dah', '?': 'di-di-dah-dah-di-dit',
        '/': 'dah-di-di-dah-dit', '=': 'dah-di-di-di-dah', '+': 'di-dah-di-dah-dit',
        '-': 'dah-di-di-di-di-dah', '@': 'di-dah-dah-di-dah-dit'
    };

    const PROSIGNS_LIST = [
        { char: 'BT', code: '-...-', meaning: 'Break / New section', phonetic: 'dah-di-di-di-dah' },
        { char: 'AR', code: '.-.-.', meaning: 'End of message / Over', phonetic: 'di-dah-di-dah-dit' },
        { char: 'K',  code: '-.-',   meaning: 'Go ahead / Over to any station', phonetic: 'dah-di-dah' },
        { char: 'KN', code: '-.--.', meaning: 'Go ahead specific station only', phonetic: 'dah-di-dah-dah-dit' },
        { char: 'SK', code: '...-.-', meaning: 'End of contact / Silent Key', phonetic: 'di-di-di-dah-di-dah' },
        { char: 'AS', code: '.-...', meaning: 'Wait / Stand by', phonetic: 'di-dah-di-di-dit' },
        { char: 'HH', code: '........', meaning: 'Error / Correction', phonetic: '8 dits' },
        { char: 'SOS', code: '...---...', meaning: 'Distress signal', phonetic: 'di-di-di-dah-dah-dah-di-di-dit' }
    ];

    // Reverse map for decoding
    const REVERSE_MAP = {};
    for (const [char, code] of Object.entries(MORSE_MAP)) {
        if (char !== ' ') REVERSE_MAP[code] = char;
    }
    PROSIGNS_LIST.forEach(p => { REVERSE_MAP[p.code] = `<${p.char}>`; });

    // ─── Persistence ─────────────────────────────────
    class AppPersistence {
        constructor() {
            this.STORAGE_KEY = 'morse_trainer_data_v2';
            this.defaults = {
                wpm: 20,
                freq: 600,
                volume: 80,
                farnsworth: 20,
                kochLevel: 1,
                kochSession: { correct: 0, wrong: 0 },
                trainerContinuous: true,
                contestContinuous: true,
                visualContinuous: true,
                noiseEnabled: false,
                noiseVol: 25,
                qsbEnabled: false,
                qsbLevel: 40,
                contestWpm: 25,
                contestFreq: 600,
                visualWpm: 10,
                stats: { correct: 0, wrong: 0, streak: 0, maxStreak: 0 },
                contestStats: { qsos: 0, busted: 0, streak: 0 },
                visualStats: { correct: 0, wrong: 0, streak: 0 }
            };
        }

        save(data) {
            try {
                const current = this.load();
                const updated = { ...current, ...data };
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
            } catch (e) {
                console.warn('Failed to save settings:', e);
            }
        }

        load() {
            try {
                const data = localStorage.getItem(this.STORAGE_KEY);
                return data ? { ...this.defaults, ...JSON.parse(data) } : this.defaults;
            } catch (e) {
                return this.defaults;
            }
        }
    }

    const persistence = new AppPersistence();

    // ─── Audio Engine ────────────────────────────────
    class MorseAudio {
        constructor() {
            this.ctx = null;
            this.masterGain = null;
            this.isPlaying = false;
            this.isPaused = false;
            this.activeOsc = null;
            this.activeGain = null;
            this.activeLamp = null;
            this.activeTimers = [];
            this.resumeResolver = null;
            this.playbackQueue = [];
            this.playbackIndex = 0;
            this.masterVolume = 0.8;
            this.pendingResolvers = [];

            // HF Noise
            this.noiseNode = null;
            this.noiseGain = null;
            this.isNoiseEnabled = false;

            // QSB (Fading)
            this.qsbGain = null;
            this.qsbModulator = null;
            this.qsbDepthGain = null;
            this.isQSBEnabled = false;
        }

        async init() {
            if (!this.ctx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                this.ctx = new AudioCtx();
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
                this.masterGain.connect(this.ctx.destination);
            }
            if (this.ctx.state === 'suspended') {
                try {
                    await this.ctx.resume();
                } catch (e) {
                    console.warn('AudioContext resume failed:', e);
                }
            }
        }

        setMasterVolume(percent) {
            this.masterVolume = Math.max(0, Math.min(100, percent)) / 100;
            if (this.masterGain && this.ctx) {
                this.masterGain.gain.setTargetAtTime(this.masterVolume, this.ctx.currentTime, 0.04);
            }
        }

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
            } else if (panelId === 'panel-visual-encode') {
                wpmSlider = document.getElementById('wpm-slider-v-encode');
                freqSlider = null;
            } else if (panelId === 'panel-visual-decode') {
                wpmSlider = document.getElementById('wpm-slider-v-decode');
                freqSlider = null;
            } else {
                wpmSlider = document.getElementById('wpm-slider-encoder') || document.getElementById('wpm-slider-trainer');
                freqSlider = document.getElementById('freq-slider-encoder') || document.getElementById('freq-slider-trainer');
            }

            const wpm = wpmSlider ? Math.max(4, parseInt(wpmSlider.value, 10)) : 20;
            const freq = freqSlider ? parseInt(freqSlider.value, 10) : 600;
            const fwpm = (panelId === 'panel-trainer' && farnsworthSlider) ? Math.max(4, parseInt(farnsworthSlider.value, 10)) : wpm;
            
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

        sleep(ms) {
            if (ms <= 0) return Promise.resolve();
            return new Promise(resolve => {
                const timerId = setTimeout(() => {
                    const idx = this.activeTimers.indexOf(timerId);
                    if (idx !== -1) this.activeTimers.splice(idx, 1);
                    resolve();
                }, ms);
                this.activeTimers.push(timerId);
            });
        }

        playTone(duration, freq) {
            if (!this.ctx || duration <= 0) return;
            try {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

                const now = this.ctx.currentTime;
                const attack = 0.003;
                gain.gain.setValueAtTime(0, now);
                gain.gain.linearRampToValueAtTime(0.75, now + attack);
                gain.gain.setValueAtTime(0.75, Math.max(now + attack, now + duration - attack));
                gain.gain.linearRampToValueAtTime(0, now + duration);

                osc.connect(gain);
                if (this.isQSBEnabled && this.qsbGain) {
                    gain.connect(this.qsbGain);
                    this.qsbGain.connect(this.masterGain);
                } else {
                    gain.connect(this.masterGain);
                }

                osc.start(now);
                osc.stop(now + duration + 0.01);
                this.activeOsc = osc;
                this.activeGain = gain;
            } catch (e) {
                console.warn('Tone error:', e);
            }
        }

        stopTone() {
            if (this.activeOsc) {
                try {
                    this.activeOsc.stop();
                    this.activeOsc.disconnect();
                } catch (e) {}
                this.activeOsc = null;
            }
            if (this.activeGain) {
                try { this.activeGain.disconnect(); } catch (e) {}
                this.activeGain = null;
            }
        }

        setupNoise() {
            if (!this.ctx) return;
            if (this.noiseNode) return;

            const bufferSize = 2 * this.ctx.sampleRate;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            this.noiseNode = this.ctx.createBufferSource();
            this.noiseNode.buffer = buffer;
            this.noiseNode.loop = true;

            this.noiseGain = this.ctx.createGain();
            this.noiseGain.gain.value = 0;

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 750;
            filter.Q.value = 0.8;

            this.noiseNode.connect(filter);
            filter.connect(this.noiseGain);

            if (this.isQSBEnabled && this.qsbGain) {
                this.noiseGain.connect(this.qsbGain);
            } else {
                this.noiseGain.connect(this.masterGain);
            }
            this.noiseNode.start();
        }

        updateNoise(enabled, volumePercent) {
            if (enabled) {
                this.setupNoise();
                if (this.noiseGain && this.ctx) {
                    this.noiseGain.gain.setTargetAtTime((volumePercent / 100) * 0.12, this.ctx.currentTime, 0.1);
                    this.isNoiseEnabled = true;
                }
            } else if (this.noiseGain && this.ctx) {
                this.noiseGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
                this.isNoiseEnabled = false;
            }
        }

        setupQSB() {
            if (!this.ctx) return;
            if (this.qsbGain) return;

            this.qsbGain = this.ctx.createGain();
            this.qsbGain.gain.value = 1.0;

            this.qsbModulator = this.ctx.createOscillator();
            this.qsbModulator.type = 'sine';
            this.qsbModulator.frequency.value = 0.25;

            this.qsbDepthGain = this.ctx.createGain();
            this.qsbDepthGain.gain.value = 0;

            this.qsbModulator.connect(this.qsbDepthGain);
            this.qsbDepthGain.connect(this.qsbGain.gain);
            this.qsbModulator.start();
        }

        updateQSB(enabled, depthPercent) {
            if (enabled) {
                this.setupQSB();
                this.isQSBEnabled = true;
                if (this.qsbGain && this.ctx) {
                    const depth = (depthPercent / 100) * 0.75;
                    const baseline = 1.0 - (depth / 2);
                    this.qsbGain.gain.setTargetAtTime(baseline, this.ctx.currentTime, 0.2);
                    this.qsbDepthGain.gain.setTargetAtTime(depth / 2, this.ctx.currentTime, 0.2);
                }
            } else if (this.qsbGain && this.ctx) {
                this.isQSBEnabled = false;
                this.qsbGain.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.2);
                this.qsbDepthGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
            }
        }

        async playMorse(morseString, lampElement, options = {}) {
            await this.init();
            this.stop();

            this.isPlaying = true;
            this.isPaused = false;
            this.activeLamp = lampElement || null;
            const muted = !!options.muted;

            const chars = morseString.replace(/\s+/g, ' ').trim();
            this.playbackQueue = chars.split('');
            this.playbackIndex = 0;

            return new Promise(async (resolve) => {
                this.pendingResolvers.push(resolve);

                while (this.isPlaying && this.playbackIndex < this.playbackQueue.length) {
                    if (this.isPaused) {
                        await new Promise(r => { this.resumeResolver = r; });
                    }
                    if (!this.isPlaying) break;

                    const ch = this.playbackQueue[this.playbackIndex];
                    const s = this.getSettings(lampElement);

                    if (ch === '.') {
                        if (lampElement) lampElement.classList.add('signal-lamp--on');
                        if (!muted) this.playTone(s.dot, s.freq);
                        await this.sleep(s.dot * 1000);
                        if (lampElement) lampElement.classList.remove('signal-lamp--on');
                        this.stopTone();
                        if (this.isPlaying && !this.isPaused) await this.sleep(s.symbolGap * 1000);
                    } else if (ch === '-') {
                        if (lampElement) lampElement.classList.add('signal-lamp--on');
                        if (!muted) this.playTone(s.dash, s.freq);
                        await this.sleep(s.dash * 1000);
                        if (lampElement) lampElement.classList.remove('signal-lamp--on');
                        this.stopTone();
                        if (this.isPlaying && !this.isPaused) await this.sleep(s.symbolGap * 1000);
                    } else if (ch === ' ') {
                        const gap = Math.max(0, s.letterGap - s.symbolGap);
                        await this.sleep(gap * 1000);
                    } else if (ch === '/') {
                        const gap = Math.max(0, s.wordGap - s.symbolGap);
                        await this.sleep(gap * 1000);
                    }

                    if (this.isPlaying && !this.isPaused) {
                        this.playbackIndex++;
                    }
                }

                this.isPlaying = false;
                this.isPaused = false;
                if (lampElement) lampElement.classList.remove('signal-lamp--on');
                this.stopTone();

                const idx = this.pendingResolvers.indexOf(resolve);
                if (idx !== -1) this.pendingResolvers.splice(idx, 1);
                resolve();
            });
        }

        pause() {
            if (!this.isPlaying || this.isPaused) return;
            this.isPaused = true;
            this.stopTone();
            if (this.activeLamp) this.activeLamp.classList.remove('signal-lamp--on');
            this.activeTimers.forEach(id => clearTimeout(id));
            this.activeTimers = [];
        }

        resume() {
            if (!this.isPlaying || !this.isPaused) return;
            this.isPaused = false;
            if (this.resumeResolver) {
                const res = this.resumeResolver;
                this.resumeResolver = null;
                res();
            }
        }

        stop() {
            this.isPlaying = false;
            this.isPaused = false;
            if (this.resumeResolver) {
                const res = this.resumeResolver;
                this.resumeResolver = null;
                res();
            }
            this.stopTone();
            this.activeTimers.forEach(id => clearTimeout(id));
            this.activeTimers = [];
            if (this.activeLamp) this.activeLamp.classList.remove('signal-lamp--on');
            this.activeLamp = null;
            this.playbackQueue = [];
            this.playbackIndex = 0;

            while (this.pendingResolvers.length > 0) {
                const res = this.pendingResolvers.shift();
                if (res) res();
            }
        }
    }

    const audio = new MorseAudio();

    // ─── State Variables ─────────────────────────────
    let stats = { correct: 0, wrong: 0, streak: 0, maxStreak: 0 };
    let contestStats = { qsos: 0, busted: 0, streak: 0 };
    let visualStats = { correct: 0, wrong: 0, streak: 0 };
    
    let currentChallenge = '';
    let currentChallengeMorse = '';
    let difficulty = 'koch';
    let autoNextTimeout = null;

    let currentContestQSO = { callsign: '', rst: '', exchange: '', morse: '' };
    let autoNextContestTimeout = null;
    let contestType = 'general';
    let qsoHistory = [];
    let contestStartTime = null;

    let visualChallenge = '';
    let visualChallengeMorse = '';
    let visualDifficulty = 'letters';
    let autoNextVisualTimeout = null;

    let deferredInstallPrompt = null;

    const KOCH_SEQUENCE = "KMRSUAPTLOWI.NJEF0Y,VG5/Q9ZH38B?427C1D6X@";
    const CALLSIGN_PREFIXES = ['K', 'W', 'N', 'A', 'G', 'M', '2', '9V', '9M2', 'YB', 'DU', 'JA', 'HS', 'DL', 'F', 'I', 'EA', 'HL', 'VR2', 'XX9'];
    const CALLSIGN_SUFFIXES = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

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
        { text: 'KN', meaning: 'Go ahead (station only)' },
        { text: 'SK', meaning: 'End of contact' },
        { text: 'R', meaning: 'Roger / Received' },
        { text: 'AS', meaning: 'Wait' }
    ];

    const ABBREVIATIONS = [
        'RST', 'QTH', 'RIG', 'ANT', 'WX', 'TEMP', 'NAME', 'OP', 'HW', 'CPY',
        'FB', 'OM', 'XYL', 'YL', 'GM', 'GA', 'GE', 'GN', '73', '88', 'GL',
        'SKED', 'FER', 'AGN', 'SNR', 'TU', 'UR', 'VY', 'WID', 'ES'
    ];

    // ─── DOM Elements ────────────────────────────────
    const tabs = document.querySelectorAll('.tab');
    const panels = document.querySelectorAll('.panel');
    const installAppBtn = document.getElementById('install-app');
    const masterVolumeSlider = document.getElementById('master-volume-slider');
    const masterVolumeVal = document.getElementById('master-volume-val');
    const shortcutsBtn = document.getElementById('shortcuts-btn');
    const shortcutsModal = document.getElementById('shortcuts-modal');
    const shortcutsClose = document.getElementById('shortcuts-close');
    const shortcutsBackdrop = document.getElementById('shortcuts-modal-backdrop');
    const iosInstallModal = document.getElementById('ios-install-modal');
    const iosInstallClose = document.getElementById('ios-install-close');
    const iosBackdrop = document.getElementById('ios-modal-backdrop');

    // Session Summary Modal
    const sessionSummaryModal = document.getElementById('session-summary-modal');
    const sessionSummaryBackdrop = document.getElementById('session-summary-backdrop');
    const sessionSummaryClose = document.getElementById('session-summary-close');
    const sessionSummaryBody = document.getElementById('session-summary-body');
    const modalSummaryTitle = document.getElementById('modal-summary-title');

    // Encoder / Decoder
    const encoderInput = document.getElementById('encoder-input');
    const encoderOutput = document.getElementById('encoder-output');
    const encoderPlay = document.getElementById('encoder-play');
    const encoderPause = document.getElementById('encoder-pause');
    const encoderStop = document.getElementById('encoder-stop');
    const encoderCopy = document.getElementById('encoder-copy');
    const encoderClear = document.getElementById('encoder-clear');
    const encoderLamp = document.getElementById('encoder-lamp');
    const encoderWpm = document.getElementById('wpm-slider-encoder');
    const encoderFreq = document.getElementById('freq-slider-encoder');

    const decoderInput = document.getElementById('decoder-input');
    const decoderOutput = document.getElementById('decoder-output');
    const decoderPlay = document.getElementById('decoder-play');
    const decoderPause = document.getElementById('decoder-pause');
    const decoderStop = document.getElementById('decoder-stop');
    const decoderCopy = document.getElementById('decoder-copy');
    const decoderClear = document.getElementById('decoder-clear');
    const decoderLamp = document.getElementById('decoder-lamp');

    // Practice Trainer
    const trainerWpm = document.getElementById('wpm-slider-trainer');
    const trainerFreq = document.getElementById('freq-slider-trainer');
    const farnsworthSlider = document.getElementById('farnsworth-slider');
    const farnsworthValue = document.getElementById('farnsworth-value');
    const kochLevelSlider = document.getElementById('koch-level-slider');
    const kochLevelValue = document.getElementById('koch-level-value');
    const trainerContinuousToggle = document.getElementById('trainer-continuous-toggle');
    const difficultyGroup = document.getElementById('difficulty-group');
    const kochPanel = document.getElementById('koch-panel');
    const kochLessonTitle = document.getElementById('koch-lesson-title');
    const kochLessonHelp = document.getElementById('koch-lesson-help');
    const kochCharacters = document.getElementById('koch-characters');
    const kochSessionCorrect = document.getElementById('koch-session-correct');
    const kochSessionAccuracy = document.getElementById('koch-session-accuracy');
    const kochPromote = document.getElementById('koch-promote');
    const challengeStatus = document.getElementById('challenge-status');
    const challengeMorse = document.getElementById('challenge-morse');
    const challengeVisual = document.getElementById('challenge-visual');
    const trainerLamp = document.getElementById('trainer-lamp');
    const trainerInput = document.getElementById('trainer-input');
    const trainerNew = document.getElementById('trainer-new');
    const trainerCheck = document.getElementById('trainer-check');
    const trainerNext = document.getElementById('trainer-next');
    const trainerReplay = document.getElementById('trainer-replay');
    const trainerReveal = document.getElementById('trainer-reveal');
    const trainerStop = document.getElementById('trainer-stop');
    const trainerResetStats = document.getElementById('trainer-reset-stats');
    const scoreCorrect = document.getElementById('score-correct');
    const scoreWrong = document.getElementById('score-wrong');
    const scoreStreak = document.getElementById('score-streak');
    const scoreAccuracy = document.getElementById('score-accuracy');
    const trainerFeedback = document.getElementById('trainer-feedback');

    // Trainer Session Bar
    const trainerSessionBar = document.getElementById('trainer-session-bar');
    const trainerSessionBadge = document.getElementById('trainer-session-badge');
    const trainerSessionTimer = document.getElementById('trainer-session-timer');
    const trainerSessionRate = document.getElementById('trainer-session-rate');
    const trainerSessionStart = document.getElementById('trainer-session-start');
    const trainerSessionPause = document.getElementById('trainer-session-pause');
    const trainerSessionEnd = document.getElementById('trainer-session-end');

    // Contest Trainer
    const contestWpmSlider = document.getElementById('contest-wpm-slider');
    const contestWpmValue = document.getElementById('contest-wpm-value');
    const contestFreqSlider = document.getElementById('contest-freq-slider');
    const contestFreqValue = document.getElementById('contest-freq-value');
    const noiseToggle = document.getElementById('noise-toggle');
    const noiseVolume = document.getElementById('noise-volume');
    const qsbToggle = document.getElementById('qsb-toggle');
    const qsbLevel = document.getElementById('qsb-level');
    const contestTypeGroup = document.getElementById('contest-type-group');
    const contestContinuousToggle = document.getElementById('contest-continuous-toggle');
    const contestMorse = document.getElementById('contest-morse');
    const contestVisual = document.getElementById('contest-visual');
    const contestLamp = document.getElementById('contest-lamp');
    const contestCallsign = document.getElementById('contest-callsign');
    const contestRst = document.getElementById('contest-rst');
    const contestQuick599 = document.getElementById('contest-quick-599');
    const contestExchange = document.getElementById('contest-exchange');
    const contestNew = document.getElementById('contest-new');
    const contestLog = document.getElementById('contest-log');
    const contestNext = document.getElementById('contest-next');
    const contestReplay = document.getElementById('contest-replay');
    const contestReveal = document.getElementById('contest-reveal');
    const contestStop = document.getElementById('contest-stop');
    const contestExportCsv = document.getElementById('contest-export-csv');
    const contestClearLog = document.getElementById('contest-clear-log');
    const contestQSOsVal = document.getElementById('contest-qsos');
    const contestBustedVal = document.getElementById('contest-busted');
    const contestRateVal = document.getElementById('contest-rate');
    const contestAccuracyVal = document.getElementById('contest-accuracy');
    const contestFeedback = document.getElementById('contest-feedback');
    const contestLogBody = document.getElementById('contest-log-body');

    // Contest Session Bar
    const contestSessionBar = document.getElementById('contest-session-bar');
    const contestSessionBadge = document.getElementById('contest-session-badge');
    const contestSessionTimer = document.getElementById('contest-session-timer');
    const contestRateHeader = document.getElementById('contest-rate-header');
    const contestSessionStart = document.getElementById('contest-session-start');
    const contestSessionPause = document.getElementById('contest-session-pause');
    const contestSessionEnd = document.getElementById('contest-session-end');

    // Visual Encode & Decode
    const vEncodeLamp = document.getElementById('v-encode-lamp');
    const vEncodeInput = document.getElementById('v-encode-input');
    const vEncodePlay = document.getElementById('v-encode-play');
    const vEncodePause = document.getElementById('v-encode-pause');
    const vEncodeStop = document.getElementById('v-encode-stop');
    const vEncodeClear = document.getElementById('v-encode-clear');
    const vEncodeWpm = document.getElementById('wpm-slider-v-encode');
    const vEncodeWpmValue = document.getElementById('wpm-value-v-encode');
    const vEncodeSound = document.getElementById('v-encode-sound');

    const vDecodeLamp = document.getElementById('v-decode-lamp');
    const vDecodeInput = document.getElementById('v-decode-input');
    const vDecodeNew = document.getElementById('v-decode-new');
    const vDecodeCheck = document.getElementById('v-decode-check');
    const vDecodeNext = document.getElementById('v-decode-next');
    const vDecodeReplay = document.getElementById('v-decode-replay');
    const vDecodeReveal = document.getElementById('v-decode-reveal');
    const vDecodeStop = document.getElementById('v-decode-stop');
    const vDecodeContinuousToggle = document.getElementById('v-decode-continuous-toggle');
    const vDecodeFeedback = document.getElementById('v-decode-feedback');
    const vDecodeWpm = document.getElementById('wpm-slider-v-decode');
    const vDecodeWpmValue = document.getElementById('wpm-value-v-decode');
    const vDecodeSound = document.getElementById('v-decode-sound');
    const vDecodeDiffGroup = document.getElementById('v-decode-diff-group');
    const vScoreCorrect = document.getElementById('v-score-correct');
    const vScoreWrong = document.getElementById('v-score-wrong');
    const vScoreStreak = document.getElementById('v-score-streak');
    const vScoreAccuracy = document.getElementById('v-score-accuracy');

    // Audio Morse Decoder
    const audioStartBtn = document.getElementById('audio-start');
    const audioPauseBtn = document.getElementById('audio-pause');
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
    const audioVuBar = document.getElementById('audio-vu-bar');
    const waveformCtx = waveformCanvas ? waveformCanvas.getContext('2d') : null;

    // Reference Chart
    const refSearchInput = document.getElementById('ref-search-input');
    const refCategories = document.getElementById('ref-categories');
    const refChart = document.getElementById('reference-chart');

    let kochSession = { correct: 0, wrong: 0 };
    let lastEncoderMorse = '';
    let lastDecoderText = '';

    // ─── Helpers ─────────────────────────────────────
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
        setTimeout(() => toast.classList.remove('toast--visible'), 2200);
    }

    async function copyText(text, successMessage) {
        if (!text) return;
        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(text);
                showToast(successMessage);
                return;
            } catch (err) {
                console.warn('Clipboard API failed, fallback:', err);
            }
        }
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showToast(successMessage);
        } catch (err) {
            showToast('Unable to copy to clipboard');
        } finally {
            document.body.removeChild(textarea);
        }
    }

    function formatDuration(ms) {
        const totalSecs = Math.max(0, Math.floor(ms / 1000));
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    function showSessionSummary(title, statsList, extraActionBtn = null) {
        if (!sessionSummaryModal || !sessionSummaryBody) return;
        if (modalSummaryTitle) modalSummaryTitle.textContent = title;

        let statsGridHTML = '<div class="summary-stat-grid">';
        statsList.forEach(stat => {
            statsGridHTML += `
                <div class="summary-stat">
                    <span class="summary-stat__label">${stat.label}</span>
                    <span class="summary-stat__val ${stat.className || ''}">${stat.value}</span>
                </div>
            `;
        });
        statsGridHTML += '</div>';

        sessionSummaryBody.innerHTML = statsGridHTML;
        if (extraActionBtn) {
            sessionSummaryBody.appendChild(extraActionBtn);
        }
        sessionSummaryModal.setAttribute('aria-hidden', 'false');
    }

    function closeSessionSummary() {
        if (sessionSummaryModal) sessionSummaryModal.setAttribute('aria-hidden', 'true');
    }

    if (sessionSummaryClose) sessionSummaryClose.addEventListener('click', closeSessionSummary);
    if (sessionSummaryBackdrop) sessionSummaryBackdrop.addEventListener('click', closeSessionSummary);

    // ─── Settings Synchronization ────────────────────
    function syncGlobalSettings(type, value) {
        if (type === 'wpm') {
            ['wpm-slider-encoder', 'wpm-slider-trainer'].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.value = value;
                    const valEl = document.getElementById(id.replace('slider', 'value'));
                    if (valEl) valEl.textContent = `${value} WPM`;
                }
            });
        } else if (type === 'freq') {
            ['freq-slider-encoder', 'freq-slider-decoder', 'freq-slider-trainer'].forEach(id => {
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

    function saveAllSettings() {
        persistence.save({
            wpm: parseInt(encoderWpm.value, 10),
            freq: parseInt(encoderFreq.value, 10),
            volume: parseInt(masterVolumeSlider.value, 10),
            farnsworth: parseInt(farnsworthSlider.value, 10),
            kochLevel: parseInt(kochLevelSlider.value, 10),
            kochSession,
            trainerContinuous: trainerContinuousToggle ? trainerContinuousToggle.checked : true,
            contestContinuous: contestContinuousToggle ? contestContinuousToggle.checked : true,
            visualContinuous: vDecodeContinuousToggle ? vDecodeContinuousToggle.checked : true,
            noiseEnabled: noiseToggle.checked,
            noiseVol: parseInt(noiseVolume.value, 10),
            qsbEnabled: qsbToggle.checked,
            qsbLevel: parseInt(qsbLevel.value, 10),
            contestWpm: parseInt(contestWpmSlider.value, 10),
            contestFreq: parseInt(contestFreqSlider.value, 10),
            visualWpm: parseInt(vEncodeWpm.value, 10),
            stats,
            contestStats,
            visualStats
        });
    }

    function loadAllSettings() {
        const data = persistence.load();
        
        syncGlobalSettings('wpm', data.wpm || 20);
        syncGlobalSettings('freq', data.freq || 600);

        if (masterVolumeSlider) {
            masterVolumeSlider.value = data.volume !== undefined ? data.volume : 80;
            masterVolumeVal.textContent = `${masterVolumeSlider.value}%`;
            audio.setMasterVolume(masterVolumeSlider.value);
        }

        if (farnsworthSlider) {
            farnsworthSlider.value = data.farnsworth || 20;
            farnsworthValue.textContent = farnsworthSlider.value;
        }

        if (kochLevelSlider) {
            kochLevelSlider.value = data.kochLevel || 1;
            kochLevelValue.textContent = kochLevelSlider.value;
        }

        if (trainerContinuousToggle) trainerContinuousToggle.checked = data.trainerContinuous !== false;
        if (contestContinuousToggle) contestContinuousToggle.checked = data.contestContinuous !== false;
        if (vDecodeContinuousToggle) vDecodeContinuousToggle.checked = data.visualContinuous !== false;

        noiseToggle.checked = !!data.noiseEnabled;
        noiseVolume.value = data.noiseVol || 25;
        qsbToggle.checked = !!data.qsbEnabled;
        qsbLevel.value = data.qsbLevel || 40;

        if (contestWpmSlider) contestWpmSlider.value = data.contestWpm || 25;
        if (contestFreqSlider) contestFreqSlider.value = data.contestFreq || 600;
        if (contestWpmValue) contestWpmValue.textContent = `${contestWpmSlider.value} WPM`;
        if (contestFreqValue) contestFreqValue.textContent = `${contestFreqSlider.value} Hz`;

        if (vEncodeWpm) {
            vEncodeWpm.value = data.visualWpm || 10;
            vEncodeWpmValue.textContent = `${vEncodeWpm.value} WPM`;
            vDecodeWpm.value = vEncodeWpm.value;
            vDecodeWpmValue.textContent = `${vEncodeWpm.value} WPM`;
        }

        if (data.stats) Object.assign(stats, data.stats);
        if (data.contestStats) Object.assign(contestStats, data.contestStats);
        if (data.visualStats) Object.assign(visualStats, data.visualStats);
        if (data.kochSession) Object.assign(kochSession, data.kochSession);

        updateScore();
        updateContestStats();
        updateVisualScore();
        updateKochPanel();
        updateHFNoise();
        updateQSB();
    }

    // ─── Master Volume Slider ────────────────────────
    if (masterVolumeSlider) {
        masterVolumeSlider.addEventListener('input', () => {
            const val = masterVolumeSlider.value;
            masterVolumeVal.textContent = `${val}%`;
            audio.setMasterVolume(val);
            saveAllSettings();
        });
    }

    // ─── Tab Navigation ──────────────────────────────
    function activateTab(tab) {
        if (!tab) return;
        audio.stop();

        // Clear background timeouts from previous tab
        if (autoNextTimeout) { clearTimeout(autoNextTimeout); autoNextTimeout = null; }
        if (autoNextContestTimeout) { clearTimeout(autoNextContestTimeout); autoNextContestTimeout = null; }
        if (autoNextVisualTimeout) { clearTimeout(autoNextVisualTimeout); autoNextVisualTimeout = null; }

        if (tab.dataset.tab !== 'contest') {
            audio.updateNoise(false, 0);
            audio.updateQSB(false, 0);
        } else {
            if (noiseToggle.checked) updateHFNoise();
            if (qsbToggle.checked) updateQSB();
        }

        tabs.forEach(t => { t.classList.remove('tab--active'); t.setAttribute('aria-selected', 'false'); });
        panels.forEach(p => p.classList.remove('panel--active'));

        tab.classList.add('tab--active');
        tab.setAttribute('aria-selected', 'true');
        const panel = document.getElementById(`panel-${tab.dataset.tab}`);
        if (panel) panel.classList.add('panel--active');

        // Initialize state if empty
        if (tab.dataset.tab === 'trainer' && !currentChallenge) {
            newChallenge();
        } else if (tab.dataset.tab === 'contest' && !currentContestQSO.callsign) {
            startNewQSO();
        } else if (tab.dataset.tab === 'visual-decode' && !visualChallenge) {
            startVisualChallenge();
        }

        tab.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    tabs.forEach(tab => tab.addEventListener('click', () => activateTab(tab)));

    // ─── Keyboard Shortcuts Modal ────────────────────
    function openShortcuts() {
        shortcutsModal.setAttribute('aria-hidden', 'false');
    }
    function closeShortcuts() {
        shortcutsModal.setAttribute('aria-hidden', 'true');
    }

    if (shortcutsBtn) shortcutsBtn.addEventListener('click', openShortcuts);
    if (shortcutsClose) shortcutsClose.addEventListener('click', closeShortcuts);
    if (shortcutsBackdrop) shortcutsBackdrop.addEventListener('click', closeShortcuts);

    // ─── PWA Installation ────────────────────────────
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').catch(err => console.warn('SW failed:', err));
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
        showToast('🎉 9M2PJU Morse Lab installed for offline practice!');
    });

    if (installAppBtn) {
        installAppBtn.addEventListener('click', async () => {
            if (deferredInstallPrompt) {
                deferredInstallPrompt.prompt();
                const choice = await deferredInstallPrompt.userChoice;
                if (choice.outcome === 'accepted') {
                    installAppBtn.hidden = true;
                }
                deferredInstallPrompt = null;
            } else {
                const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
                if (isIOS) {
                    iosInstallModal.setAttribute('aria-hidden', 'false');
                } else {
                    showToast('To install: click browser menu (⋮) and select "Install app".');
                }
            }
        });
    }

    if (iosInstallClose) iosInstallClose.addEventListener('click', () => iosInstallModal.setAttribute('aria-hidden', 'true'));
    if (iosBackdrop) iosBackdrop.addEventListener('click', () => iosInstallModal.setAttribute('aria-hidden', 'true'));

    // ─── Sliders Event Listeners ─────────────────────
    if (encoderWpm) encoderWpm.addEventListener('input', (e) => syncGlobalSettings('wpm', e.target.value));
    if (encoderFreq) encoderFreq.addEventListener('input', (e) => syncGlobalSettings('freq', e.target.value));
    if (trainerWpm) trainerWpm.addEventListener('input', (e) => syncGlobalSettings('wpm', e.target.value));
    if (trainerFreq) trainerFreq.addEventListener('input', (e) => syncGlobalSettings('freq', e.target.value));
    if (detectFreqSlider) detectFreqSlider.addEventListener('input', (e) => syncGlobalSettings('freq', e.target.value));

    if (farnsworthSlider) {
        farnsworthSlider.addEventListener('input', () => {
            farnsworthValue.textContent = farnsworthSlider.value;
            saveAllSettings();
        });
    }

    if (kochLevelSlider) {
        kochLevelSlider.addEventListener('input', () => {
            kochLevelValue.textContent = kochLevelSlider.value;
            kochSession = { correct: 0, wrong: 0 };
            updateKochPanel();
            saveAllSettings();
            newChallenge();
        });
    }

    // ─── 1. ENCODER ──────────────────────────────────
    function setEncoderState(state) {
        if (state === 'playing') {
            encoderPlay.style.display = 'none';
            if (encoderPause) {
                encoderPause.style.display = 'inline-flex';
                encoderPause.querySelector('span').textContent = 'Pause';
            }
            encoderStop.disabled = false;
        } else if (state === 'paused') {
            encoderPlay.style.display = 'none';
            if (encoderPause) {
                encoderPause.style.display = 'inline-flex';
                encoderPause.querySelector('span').textContent = 'Resume';
            }
            encoderStop.disabled = false;
        } else {
            encoderPlay.style.display = 'inline-flex';
            encoderPlay.disabled = false;
            if (encoderPause) encoderPause.style.display = 'none';
            encoderStop.disabled = true;
        }
    }

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
            showToast('Type some text in the box above to encode first.');
            return;
        }
        setEncoderState('playing');
        await audio.playMorse(lastEncoderMorse, encoderLamp);
        setEncoderState('idle');
    });

    if (encoderPause) {
        encoderPause.addEventListener('click', () => {
            if (audio.isPlaying && !audio.isPaused) {
                audio.pause();
                setEncoderState('paused');
            } else if (audio.isPlaying && audio.isPaused) {
                audio.resume();
                setEncoderState('playing');
            }
        });
    }

    encoderStop.addEventListener('click', () => {
        audio.stop();
        setEncoderState('idle');
    });

    encoderCopy.addEventListener('click', () => {
        if (!lastEncoderMorse) return;
        copyText(lastEncoderMorse, 'Morse code copied to clipboard!');
    });

    encoderClear.addEventListener('click', () => {
        encoderInput.value = '';
        encoderOutput.innerHTML = '<span class="morse-output__placeholder">Morse code will appear here…</span>';
        lastEncoderMorse = '';
        audio.stop();
        setEncoderState('idle');
    });

    // ─── 2. DECODER ──────────────────────────────────
    function setDecoderState(state) {
        if (state === 'playing') {
            decoderPlay.style.display = 'none';
            if (decoderPause) {
                decoderPause.style.display = 'inline-flex';
                decoderPause.querySelector('span').textContent = 'Pause';
            }
            decoderStop.disabled = false;
        } else if (state === 'paused') {
            decoderPlay.style.display = 'none';
            if (decoderPause) {
                decoderPause.style.display = 'inline-flex';
                decoderPause.querySelector('span').textContent = 'Resume';
            }
            decoderStop.disabled = false;
        } else {
            decoderPlay.style.display = 'inline-flex';
            decoderPlay.disabled = false;
            if (decoderPause) decoderPause.style.display = 'none';
            decoderStop.disabled = true;
        }
    }

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
            showToast('Enter dots and dashes to decode and play.');
            return;
        }
        setDecoderState('playing');
        await audio.playMorse(morse, decoderLamp);
        setDecoderState('idle');
    });

    if (decoderPause) {
        decoderPause.addEventListener('click', () => {
            if (audio.isPlaying && !audio.isPaused) {
                audio.pause();
                setDecoderState('paused');
            } else if (audio.isPlaying && audio.isPaused) {
                audio.resume();
                setDecoderState('playing');
            }
        });
    }

    decoderStop.addEventListener('click', () => {
        audio.stop();
        setDecoderState('idle');
    });

    decoderCopy.addEventListener('click', () => {
        if (!lastDecoderText) return;
        copyText(lastDecoderText, 'Decoded text copied!');
    });

    decoderClear.addEventListener('click', () => {
        decoderInput.value = '';
        decoderOutput.innerHTML = '<span class="text-output__placeholder">Decoded text will appear here…</span>';
        lastDecoderText = '';
        audio.stop();
        setDecoderState('idle');
    });

    // ─── 4. PRACTICE TRAINER ─────────────────────────
    let trainerSession = {
        active: false,
        paused: false,
        startTime: 0,
        pausedAt: 0,
        totalPausedMs: 0,
        timerInterval: null,
        startCorrect: 0,
        startWrong: 0
    };

    function tickTrainerSession() {
        if (!trainerSession.active) return;
        let elapsed = 0;
        if (trainerSession.paused) {
            elapsed = trainerSession.pausedAt - trainerSession.startTime - trainerSession.totalPausedMs;
        } else {
            elapsed = Date.now() - trainerSession.startTime - trainerSession.totalPausedMs;
        }
        if (trainerSessionTimer) trainerSessionTimer.textContent = `⏱ ${formatDuration(elapsed)}`;

        const elapsedMins = elapsed / (1000 * 60);
        const sessionCopies = (stats.correct - trainerSession.startCorrect) + (stats.wrong - trainerSession.startWrong);
        const rate = elapsedMins > 0.05 ? (sessionCopies / elapsedMins).toFixed(1) : '0.0';
        if (trainerSessionRate) trainerSessionRate.textContent = `${rate} copies/min`;
    }

    function startTrainerSession() {
        if (trainerSession.active && !trainerSession.paused) return;
        if (trainerSession.paused) {
            // Resume from pause
            trainerSession.paused = false;
            trainerSession.totalPausedMs += (Date.now() - trainerSession.pausedAt);
            if (trainerSessionBadge) {
                trainerSessionBadge.textContent = '● ACTIVE';
                trainerSessionBadge.className = 'session-badge session-badge--active';
            }
            if (trainerSessionPause) trainerSessionPause.querySelector('span').textContent = 'Pause';
            if (trainerInput) trainerInput.disabled = false;
            if (!currentChallenge) newChallenge();
            showToast('Training session resumed.');
            return;
        }

        // New session start
        trainerSession.active = true;
        trainerSession.paused = false;
        trainerSession.startTime = Date.now();
        trainerSession.pausedAt = 0;
        trainerSession.totalPausedMs = 0;
        trainerSession.startCorrect = stats.correct;
        trainerSession.startWrong = stats.wrong;

        if (trainerSessionBadge) {
            trainerSessionBadge.textContent = '● ACTIVE';
            trainerSessionBadge.className = 'session-badge session-badge--active';
        }
        if (trainerSessionStart) trainerSessionStart.style.display = 'none';
        if (trainerSessionPause) {
            trainerSessionPause.style.display = 'inline-flex';
            trainerSessionPause.querySelector('span').textContent = 'Pause';
        }
        if (trainerSessionEnd) trainerSessionEnd.style.display = 'inline-flex';
        if (trainerStop) trainerStop.style.display = 'inline-flex';

        if (trainerSession.timerInterval) clearInterval(trainerSession.timerInterval);
        trainerSession.timerInterval = setInterval(tickTrainerSession, 500);
        tickTrainerSession();

        newChallenge();
        showToast('🚀 Timed practice session started!');
    }

    function pauseTrainerSession() {
        if (!trainerSession.active) return;
        if (!trainerSession.paused) {
            trainerSession.paused = true;
            trainerSession.pausedAt = Date.now();
            audio.stop();
            if (autoNextTimeout) { clearTimeout(autoNextTimeout); autoNextTimeout = null; }
            if (trainerSessionBadge) {
                trainerSessionBadge.textContent = '❚❚ PAUSED';
                trainerSessionBadge.className = 'session-badge session-badge--paused';
            }
            if (trainerSessionPause) trainerSessionPause.querySelector('span').textContent = 'Resume';
            if (trainerInput) trainerInput.disabled = true;
            trainerFeedback.textContent = 'Session paused. Click Resume to continue.';
            trainerFeedback.className = 'trainer__feedback';
        } else {
            startTrainerSession();
        }
    }

    function endTrainerSession() {
        if (!trainerSession.active) return;
        const elapsed = (trainerSession.paused ? trainerSession.pausedAt : Date.now()) - trainerSession.startTime - trainerSession.totalPausedMs;

        if (trainerSession.timerInterval) {
            clearInterval(trainerSession.timerInterval);
            trainerSession.timerInterval = null;
        }
        trainerSession.active = false;
        trainerSession.paused = false;

        if (trainerSessionBadge) {
            trainerSessionBadge.textContent = '● IDLE';
            trainerSessionBadge.className = 'session-badge session-badge--idle';
        }
        if (trainerSessionStart) trainerSessionStart.style.display = 'inline-flex';
        if (trainerSessionPause) trainerSessionPause.style.display = 'none';
        if (trainerSessionEnd) trainerSessionEnd.style.display = 'none';

        const sessionCorrect = stats.correct - trainerSession.startCorrect;
        const sessionWrong = stats.wrong - trainerSession.startWrong;
        const totalCopies = sessionCorrect + sessionWrong;
        const accuracy = totalCopies > 0 ? `${Math.round((sessionCorrect / totalCopies) * 100)}%` : '—';
        const elapsedMins = elapsed / (1000 * 60);
        const rate = elapsedMins > 0.05 ? (totalCopies / elapsedMins).toFixed(1) : '0.0';

        showSessionSummary('🎓 Training Session Summary', [
            { label: 'Mode', value: difficulty.toUpperCase(), className: 'summary-stat__val--accent' },
            { label: 'Session Duration', value: formatDuration(elapsed) },
            { label: 'Correct Copies', value: sessionCorrect, className: 'summary-stat__val--correct' },
            { label: 'Missed Copies', value: sessionWrong },
            { label: 'Session Accuracy', value: accuracy, className: 'summary-stat__val--accent' },
            { label: 'Copy Rate', value: `${rate} /min` }
        ]);
    }

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
        kochLessonHelp.textContent = `Active set (${chars.length} chars). Click any letter to hear its tone. Reach ≥90% accuracy over 10+ copies to advance.`;
        
        kochCharacters.innerHTML = chars.map((ch, index) => {
            const isNew = index === chars.length - 1;
            const code = textToMorse(ch);
            return `<span class="koch-char ${isNew ? 'koch-char--new' : ''}" data-morse="${code}" title="${ch}: ${code}">${ch}</span>`;
        }).join('');

        kochSessionCorrect.textContent = kochSession.correct;
        kochSessionAccuracy.textContent = accuracy;
    }

    if (kochCharacters) {
        kochCharacters.addEventListener('click', (e) => {
            const item = e.target.closest('.koch-char');
            if (!item) return;
            const morse = item.dataset.morse;
            audio.playMorse(morse, trainerLamp);
        });
    }

    // Scaled progressive challenge groups
    function generateKochChallenge() {
        const level = parseInt(kochLevelSlider.value, 10);
        const chars = getKochChars();
        const newest = chars[chars.length - 1];
        const weighted = chars.concat([newest, newest, newest]);

        // Progressive group count based on level
        let numGroups = 1;
        let groupLen = 3;
        if (level <= 3) {
            numGroups = 1;
            groupLen = 3;
        } else if (level <= 8) {
            numGroups = 2;
            groupLen = 3;
        } else if (level <= 15) {
            numGroups = 2;
            groupLen = 4;
        } else {
            numGroups = 3;
            groupLen = 5;
        }

        const groups = [];
        for (let g = 0; g < numGroups; g++) {
            let seg = '';
            for (let i = 0; i < groupLen; i++) {
                seg += weighted[Math.floor(Math.random() * weighted.length)];
            }
            groups.push(seg);
        }
        return groups.join(' ');
    }

    function generateChallenge() {
        switch (difficulty) {
            case 'letters': {
                const count = Math.floor(Math.random() * 3) + 1;
                let r = '';
                for (let i = 0; i < count; i++) r += String.fromCharCode(65 + Math.floor(Math.random() * 26));
                return r;
            }
            case 'numbers': {
                const count = Math.floor(Math.random() * 3) + 1;
                let r = '';
                for (let i = 0; i < count; i++) r += Math.floor(Math.random() * 10).toString();
                return r;
            }
            case 'mixed': {
                const count = Math.floor(Math.random() * 4) + 2;
                const pool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
                let r = '';
                for (let i = 0; i < count; i++) r += pool[Math.floor(Math.random() * pool.length)];
                return r;
            }
            case 'koch':
                return generateKochChallenge();
            case 'words':
                return COMMON_WORDS[Math.floor(Math.random() * COMMON_WORDS.length)];
            case 'callsigns': {
                const prefix = CALLSIGN_PREFIXES[Math.floor(Math.random() * CALLSIGN_PREFIXES.length)];
                const numPart = Math.floor(Math.random() * 10).toString();
                const suffLen = Math.floor(Math.random() * 3) + 1;
                let suffix = '';
                for (let i = 0; i < suffLen; i++) suffix += CALLSIGN_SUFFIXES[Math.floor(Math.random() * CALLSIGN_SUFFIXES.length)];
                return (/\d/.test(prefix)) ? prefix + suffix : prefix + numPart + suffix;
            }
            case 'prosigns':
                return PROSIGNS[Math.floor(Math.random() * PROSIGNS.length)].text;
            case 'abbreviations':
                return ABBREVIATIONS[Math.floor(Math.random() * ABBREVIATIONS.length)];
            default:
                return 'A';
        }
    }

    function normalizeTrainerAnswer(value) {
        const normalized = value.trim().toUpperCase().replace(/[<>\.\,\/]/g, '');
        return (difficulty === 'koch') ? normalized.replace(/\s+/g, '') : normalized.replace(/\s+/g, ' ');
    }

    function newChallenge() {
        audio.stop();
        if (autoNextTimeout) {
            clearTimeout(autoNextTimeout);
            autoNextTimeout = null;
        }

        trainerNext.style.display = 'none';
        trainerCheck.style.display = 'inline-flex';
        trainerCheck.disabled = false;
        if (trainerStop) trainerStop.style.display = 'inline-flex';
        
        currentChallenge = generateChallenge();
        currentChallengeMorse = textToMorse(currentChallenge);

        challengeStatus.textContent = `Challenge Active (${difficulty.toUpperCase()})`;
        challengeMorse.innerHTML = formatMorseHTML(currentChallengeMorse);
        challengeVisual.innerHTML = createVisualMorse(currentChallengeMorse);

        trainerInput.value = '';
        trainerInput.disabled = false;
        trainerFeedback.textContent = '';
        trainerFeedback.className = 'trainer__feedback';
        trainerInput.focus();

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
            trainerFeedback.textContent = '✅ Correct!';
            trainerInput.disabled = true;
            trainerCheck.disabled = true;

            if (difficulty === 'koch') {
                kochSession.correct++;
                const total = kochSession.correct + kochSession.wrong;
                const accuracy = Math.round((kochSession.correct / total) * 100);
                if (accuracy >= 90 && kochSession.correct >= 10) {
                    trainerFeedback.textContent = `🎯 Correct! Accuracy is ${accuracy}% — Ready for Lesson ${parseInt(kochLevelSlider.value, 10) + 1}!`;
                }
                updateKochPanel();
            }

            if (trainerContinuousToggle.checked) {
                autoNextTimeout = setTimeout(newChallenge, 1400);
            } else {
                trainerCheck.style.display = 'none';
                trainerNext.style.display = 'inline-flex';
                trainerNext.focus();
            }
        } else {
            stats.wrong++;
            stats.streak = 0;
            trainerFeedback.className = 'trainer__feedback trainer__feedback--wrong';
            trainerFeedback.textContent = `❌ Wrong: "${answer || 'empty'}" · Expected: "${correct}"`;
            if (difficulty === 'koch') {
                kochSession.wrong++;
                updateKochPanel();
            }
            trainerInput.select();
        }

        updateScore();
        if (trainerSession.active) tickTrainerSession();
        saveAllSettings();
    }

    function revealAnswer() {
        if (!currentChallenge) return;
        trainerFeedback.textContent = `👁 Answer: "${currentChallenge}" (${currentChallengeMorse})`;
        trainerFeedback.className = 'trainer__feedback trainer__feedback--reveal';
        trainerInput.disabled = true;
        trainerCheck.disabled = true;
        if (!trainerContinuousToggle.checked) {
            trainerCheck.style.display = 'none';
            trainerNext.style.display = 'inline-flex';
        }
    }

    function updateScore() {
        scoreCorrect.textContent = stats.correct;
        scoreWrong.textContent = stats.wrong;
        scoreStreak.textContent = `${stats.streak} (Best: ${stats.maxStreak || stats.streak})`;
        const total = stats.correct + stats.wrong;
        scoreAccuracy.textContent = total > 0 ? `${Math.round((stats.correct / total) * 100)}%` : '—';
    }

    difficultyGroup.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-difficulty]');
        if (!btn) return;
        difficultyGroup.querySelectorAll('.btn--toggle').forEach(b => b.classList.remove('btn--toggle--active'));
        btn.classList.add('btn--toggle--active');
        difficulty = btn.dataset.difficulty;
        updateKochPanel();
        newChallenge();
    });

    if (kochPromote) {
        kochPromote.addEventListener('click', () => {
            const current = parseInt(kochLevelSlider.value, 10);
            if (current < 40) {
                kochLevelSlider.value = current + 1;
                kochLevelValue.textContent = kochLevelSlider.value;
                kochSession = { correct: 0, wrong: 0 };
                updateKochPanel();
                saveAllSettings();
                showToast(`Promoted to Koch Lesson ${kochLevelSlider.value}!`);
                newChallenge();
            }
        });
    }

    trainerNew.addEventListener('click', newChallenge);
    trainerCheck.addEventListener('click', checkAnswer);
    trainerNext.addEventListener('click', newChallenge);
    trainerReveal.addEventListener('click', revealAnswer);
    trainerReplay.addEventListener('click', () => {
        if (currentChallengeMorse) audio.playMorse(currentChallengeMorse, trainerLamp);
    });

    if (trainerStop) {
        trainerStop.addEventListener('click', () => {
            audio.stop();
            if (autoNextTimeout) { clearTimeout(autoNextTimeout); autoNextTimeout = null; }
            trainerFeedback.textContent = 'Audio stopped.';
            trainerFeedback.className = 'trainer__feedback';
        });
    }

    if (trainerSessionStart) trainerSessionStart.addEventListener('click', startTrainerSession);
    if (trainerSessionPause) trainerSessionPause.addEventListener('click', pauseTrainerSession);
    if (trainerSessionEnd) trainerSessionEnd.addEventListener('click', endTrainerSession);

    trainerResetStats.addEventListener('click', () => {
        if (confirm('Reset practice score and streak?')) {
            stats = { correct: 0, wrong: 0, streak: 0, maxStreak: 0 };
            kochSession = { correct: 0, wrong: 0 };
            updateScore();
            updateKochPanel();
            saveAllSettings();
            showToast('Practice stats reset.');
        }
    });

    trainerInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            if (!trainerCheck.disabled && trainerCheck.style.display !== 'none') {
                checkAnswer();
            } else if (trainerNext.style.display !== 'none') {
                newChallenge();
            }
        }
    });

    trainerContinuousToggle.addEventListener('change', () => {
        saveAllSettings();
    });

    // ─── 5. CONTEST TRAINER ──────────────────────────
    const US_STATES = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];
    const FIELD_DAY_CLASSES = ['1A', '2A', '3A', '4A', '5A', '1B', '2B', '1C', '1D', '1E', '1F'];
    const SOTA_REFS = ['SP/BA-001', 'G/LD-001', 'W6/SC-001', 'VK2/HU-001', 'JA/SO-001'];

    let contestSession = {
        active: false,
        paused: false,
        startTime: 0,
        pausedAt: 0,
        totalPausedMs: 0,
        timerInterval: null,
        startQsos: 0,
        startBusted: 0
    };

    function tickContestSession() {
        if (!contestSession.active) return;
        let elapsed = 0;
        if (contestSession.paused) {
            elapsed = contestSession.pausedAt - contestSession.startTime - contestSession.totalPausedMs;
        } else {
            elapsed = Date.now() - contestSession.startTime - contestSession.totalPausedMs;
        }
        if (contestSessionTimer) contestSessionTimer.textContent = `⏱ ${formatDuration(elapsed)}`;

        const elapsedHours = elapsed / (1000 * 60 * 60);
        const sessionQsos = contestStats.qsos - contestSession.startQsos;
        const rate = elapsedHours > 0.005 ? Math.round(sessionQsos / elapsedHours) : 0;
        if (contestRateHeader) contestRateHeader.textContent = `${rate} QSOs/hr`;
        if (contestRateVal) contestRateVal.textContent = `${rate} /hr`;
    }

    function startContestSession() {
        if (contestSession.active && !contestSession.paused) return;
        if (contestSession.paused) {
            contestSession.paused = false;
            contestSession.totalPausedMs += (Date.now() - contestSession.pausedAt);
            if (contestSessionBadge) {
                contestSessionBadge.textContent = '● RUNNING';
                contestSessionBadge.className = 'session-badge session-badge--active';
            }
            if (contestSessionPause) contestSessionPause.querySelector('span').textContent = 'Pause';
            if (contestCallsign) contestCallsign.disabled = false;
            if (!currentContestQSO.callsign) startNewQSO();
            showToast('Contest run resumed.');
            return;
        }

        contestSession.active = true;
        contestSession.paused = false;
        contestSession.startTime = Date.now();
        contestSession.pausedAt = 0;
        contestSession.totalPausedMs = 0;
        contestSession.startQsos = contestStats.qsos;
        contestSession.startBusted = contestStats.busted;

        if (contestSessionBadge) {
            contestSessionBadge.textContent = '● RUNNING';
            contestSessionBadge.className = 'session-badge session-badge--active';
        }
        if (contestSessionStart) contestSessionStart.style.display = 'none';
        if (contestSessionPause) {
            contestSessionPause.style.display = 'inline-flex';
            contestSessionPause.querySelector('span').textContent = 'Pause';
        }
        if (contestSessionEnd) contestSessionEnd.style.display = 'inline-flex';
        if (contestStop) contestStop.style.display = 'inline-flex';

        if (contestSession.timerInterval) clearInterval(contestSession.timerInterval);
        contestSession.timerInterval = setInterval(tickContestSession, 500);
        tickContestSession();

        startNewQSO();
        showToast('🏆 Contest run started!');
    }

    function pauseContestSession() {
        if (!contestSession.active) return;
        if (!contestSession.paused) {
            contestSession.paused = true;
            contestSession.pausedAt = Date.now();
            audio.stop();
            if (autoNextContestTimeout) { clearTimeout(autoNextContestTimeout); autoNextContestTimeout = null; }
            if (contestSessionBadge) {
                contestSessionBadge.textContent = '❚❚ PAUSED';
                contestSessionBadge.className = 'session-badge session-badge--paused';
            }
            if (contestSessionPause) contestSessionPause.querySelector('span').textContent = 'Resume';
            if (contestCallsign) contestCallsign.disabled = true;
            contestFeedback.textContent = 'Contest run paused. Click Resume to continue.';
            contestFeedback.className = 'trainer__feedback';
        } else {
            startContestSession();
        }
    }

    function endContestSession() {
        if (!contestSession.active) return;
        const elapsed = (contestSession.paused ? contestSession.pausedAt : Date.now()) - contestSession.startTime - contestSession.totalPausedMs;

        if (contestSession.timerInterval) {
            clearInterval(contestSession.timerInterval);
            contestSession.timerInterval = null;
        }
        contestSession.active = false;
        contestSession.paused = false;

        if (contestSessionBadge) {
            contestSessionBadge.textContent = '● READY';
            contestSessionBadge.className = 'session-badge session-badge--idle';
        }
        if (contestSessionStart) contestSessionStart.style.display = 'inline-flex';
        if (contestSessionPause) contestSessionPause.style.display = 'none';
        if (contestSessionEnd) contestSessionEnd.style.display = 'none';

        const sessionQsos = contestStats.qsos - contestSession.startQsos;
        const sessionBusted = contestStats.busted - contestSession.startBusted;
        const total = sessionQsos + sessionBusted;
        const accuracy = total > 0 ? `${Math.round((sessionQsos / total) * 100)}%` : '—';
        const elapsedHours = elapsed / (1000 * 60 * 60);
        const rate = elapsedHours > 0.005 ? Math.round(sessionQsos / elapsedHours) : 0;

        const exportBtn = document.createElement('button');
        exportBtn.className = 'btn btn--primary';
        exportBtn.style.width = '100%';
        exportBtn.style.marginTop = '16px';
        exportBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Download Contest Log (CSV)</span>
        `;
        exportBtn.addEventListener('click', () => {
            if (contestExportCsv) contestExportCsv.click();
        });

        showSessionSummary('🏆 Contest Run Summary', [
            { label: 'Contest Type', value: contestType.toUpperCase(), className: 'summary-stat__val--accent' },
            { label: 'Run Duration', value: formatDuration(elapsed) },
            { label: 'QSOs Logged', value: sessionQsos, className: 'summary-stat__val--correct' },
            { label: 'Busted QSOs', value: sessionBusted },
            { label: 'Accuracy', value: accuracy, className: 'summary-stat__val--accent' },
            { label: 'QSO Rate', value: `${rate} /hr` }
        ], exportBtn);
    }

    function generateContestQSO() {
        const prefix = CALLSIGN_PREFIXES[Math.floor(Math.random() * CALLSIGN_PREFIXES.length)];
        const num = Math.floor(Math.random() * 10);
        const suffLen = Math.floor(Math.random() * 3) + 1;
        let suffix = '';
        for (let i = 0; i < suffLen; i++) suffix += CALLSIGN_SUFFIXES[Math.floor(Math.random() * CALLSIGN_SUFFIXES.length)];
        const callsign = prefix + (/\d/.test(prefix) ? '' : num) + suffix;

        let rst = (Math.random() > 0.8) ? '5nn' : '599';
        let exchange = '';
        switch (contestType) {
            case 'dx':
                exchange = (Math.floor(Math.random() * 40) + 1).toString().padStart(2, '0');
                break;
            case 'fieldday':
                exchange = FIELD_DAY_CLASSES[Math.floor(Math.random() * FIELD_DAY_CLASSES.length)] + ' ' + US_STATES[Math.floor(Math.random() * US_STATES.length)];
                break;
            case 'sota':
                exchange = SOTA_REFS[Math.floor(Math.random() * SOTA_REFS.length)];
                break;
            default:
                exchange = (Math.floor(Math.random() * 999) + 1).toString().padStart(3, '0');
        }

        const morse = `${callsign} ${rst} ${exchange}`;
        return { callsign, rst: rst.replace(/n/g, '9'), exchange, morse: textToMorse(morse) };
    }

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

    contestWpmSlider.addEventListener('input', () => {
        contestWpmValue.textContent = `${contestWpmSlider.value} WPM`;
        saveAllSettings();
    });
    contestFreqSlider.addEventListener('input', () => {
        contestFreqValue.textContent = `${contestFreqSlider.value} Hz`;
        saveAllSettings();
    });

    // CSV Log Exporter
    contestExportCsv.addEventListener('click', () => {
        if (!qsoHistory.length) {
            showToast('No QSOs to export yet.');
            return;
        }
        let csv = 'ID,Time,Callsign,RST,Exchange,Result\n';
        qsoHistory.forEach(q => {
            csv += `${q.id},"${q.time || ''}","${q.callsign}","${q.rst}","${q.exchange}","${q.result}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `9M2PJU-Morse-Contest-Log-${new Date().toISOString().slice(0,10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        showToast('QSO Log exported as CSV!');
    });

    contestClearLog.addEventListener('click', () => {
        if (confirm('Clear the entire QSO history log?')) {
            qsoHistory = [];
            contestStats = { qsos: 0, busted: 0, streak: 0 };
            contestStartTime = Date.now();
            renderQSOLog();
            updateContestStats();
            saveAllSettings();
            showToast('Contest log cleared.');
        }
    });

    // ─── 6 & 7. VISUAL MORSE ─────────────────────────
    function setVEncodeState(state) {
        if (state === 'playing') {
            vEncodePlay.style.display = 'none';
            if (vEncodePause) {
                vEncodePause.style.display = 'inline-flex';
                vEncodePause.querySelector('span').textContent = 'Pause';
            }
            vEncodeStop.disabled = false;
        } else if (state === 'paused') {
            vEncodePlay.style.display = 'none';
            if (vEncodePause) {
                vEncodePause.style.display = 'inline-flex';
                vEncodePause.querySelector('span').textContent = 'Resume';
            }
            vEncodeStop.disabled = false;
        } else {
            vEncodePlay.style.display = 'inline-flex';
            vEncodePlay.disabled = false;
            if (vEncodePause) vEncodePause.style.display = 'none';
            vEncodeStop.disabled = true;
        }
    }

    document.querySelectorAll('.btn-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            const preset = btn.dataset.vpreset;
            if (preset && vEncodeInput) {
                vEncodeInput.value = preset;
                showToast(`Maritime preset "${preset}" loaded.`);
            }
        });
    });

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
        if (!text) {
            showToast('Type a message to signal with the lamp.');
            return;
        }
        setVEncodeState('playing');
        const morse = textToMorse(text);
        await audio.playMorse(morse, vEncodeLamp, { muted: !vEncodeSound.checked });
        setVEncodeState('idle');
    });

    if (vEncodePause) {
        vEncodePause.addEventListener('click', () => {
            if (audio.isPlaying && !audio.isPaused) {
                audio.pause();
                setVEncodeState('paused');
            } else if (audio.isPlaying && audio.isPaused) {
                audio.resume();
                setVEncodeState('playing');
            }
        });
    }

    vEncodeStop.addEventListener('click', () => {
        audio.stop();
        setVEncodeState('idle');
    });

    if (vEncodeClear) {
        vEncodeClear.addEventListener('click', () => {
            vEncodeInput.value = '';
            audio.stop();
            setVEncodeState('idle');
        });
    }

    function generateVisualChallenge() {
        switch (visualDifficulty) {
            case 'numbers': {
                const count = Math.floor(Math.random() * 2) + 1;
                let r = '';
                for (let i = 0; i < count; i++) r += Math.floor(Math.random() * 10).toString();
                return r;
            }
            case 'words':
                return COMMON_WORDS[Math.floor(Math.random() * COMMON_WORDS.length)];
            case 'callsigns': {
                const prefix = CALLSIGN_PREFIXES[Math.floor(Math.random() * CALLSIGN_PREFIXES.length)];
                const suff = CALLSIGN_SUFFIXES[Math.floor(Math.random() * CALLSIGN_SUFFIXES.length)] + CALLSIGN_SUFFIXES[Math.floor(Math.random() * CALLSIGN_SUFFIXES.length)];
                return prefix + '1' + suff;
            }
            default: // letters
                return String.fromCharCode(65 + Math.floor(Math.random() * 26));
        }
    }

    function startVisualChallenge() {
        audio.stop();
        if (autoNextVisualTimeout) {
            clearTimeout(autoNextVisualTimeout);
            autoNextVisualTimeout = null;
        }

        visualChallenge = generateVisualChallenge();
        visualChallengeMorse = textToMorse(visualChallenge);

        vDecodeNext.style.display = 'none';
        vDecodeCheck.style.display = 'inline-flex';
        vDecodeCheck.disabled = false;
        if (vDecodeStop) vDecodeStop.style.display = 'inline-flex';

        vDecodeInput.value = '';
        vDecodeInput.disabled = false;
        vDecodeFeedback.textContent = 'Lamp signaling… watch closely!';
        vDecodeFeedback.className = 'trainer__feedback';
        vDecodeInput.focus();

        audio.playMorse(visualChallengeMorse, vDecodeLamp, { muted: !vDecodeSound.checked });
    }

    function checkVisualAnswer() {
        if (!visualChallenge) return;
        const typed = vDecodeInput.value.trim().toUpperCase();
        const expected = visualChallenge.toUpperCase();

        if (typed === expected) {
            visualStats.correct++;
            visualStats.streak++;
            vDecodeFeedback.textContent = `✅ Correct! "${expected}"`;
            vDecodeFeedback.className = 'trainer__feedback trainer__feedback--correct';
            vDecodeInput.disabled = true;

            if (vDecodeContinuousToggle && vDecodeContinuousToggle.checked) {
                autoNextVisualTimeout = setTimeout(startVisualChallenge, 1500);
            } else {
                vDecodeCheck.style.display = 'none';
                vDecodeNext.style.display = 'inline-flex';
                vDecodeNext.focus();
            }
        } else {
            visualStats.wrong++;
            visualStats.streak = 0;
            vDecodeFeedback.textContent = `❌ Try again! Expected "${expected}"`;
            vDecodeFeedback.className = 'trainer__feedback trainer__feedback--wrong';
            vDecodeInput.select();
        }
        updateVisualScore();
        saveAllSettings();
    }

    function updateVisualScore() {
        vScoreCorrect.textContent = visualStats.correct;
        vScoreWrong.textContent = visualStats.wrong;
        vScoreStreak.textContent = visualStats.streak;
        const total = visualStats.correct + visualStats.wrong;
        vScoreAccuracy.textContent = total > 0 ? `${Math.round((visualStats.correct / total) * 100)}%` : '—';
    }

    vDecodeNew.addEventListener('click', startVisualChallenge);
    vDecodeCheck.addEventListener('click', checkVisualAnswer);
    vDecodeNext.addEventListener('click', startVisualChallenge);
    vDecodeReplay.addEventListener('click', () => {
        if (visualChallengeMorse) {
            audio.stop();
            audio.playMorse(visualChallengeMorse, vDecodeLamp, { muted: !vDecodeSound.checked });
        }
    });

    if (vDecodeStop) {
        vDecodeStop.addEventListener('click', () => {
            audio.stop();
            if (autoNextVisualTimeout) { clearTimeout(autoNextVisualTimeout); autoNextVisualTimeout = null; }
            vDecodeFeedback.textContent = 'Flashing stopped.';
            vDecodeFeedback.className = 'trainer__feedback';
        });
    }

    vDecodeReveal.addEventListener('click', () => {
        if (!visualChallenge) return;
        vDecodeFeedback.textContent = `👁 Answer: "${visualChallenge}" (${visualChallengeMorse})`;
        vDecodeFeedback.className = 'trainer__feedback trainer__feedback--reveal';
        vDecodeCheck.style.display = 'none';
        vDecodeNext.style.display = 'inline-flex';
    });

    vDecodeInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            if (!vDecodeCheck.disabled && vDecodeCheck.style.display !== 'none') {
                checkVisualAnswer();
            } else if (vDecodeNext.style.display !== 'none') {
                startVisualChallenge();
            }
        }
    });

    if (vDecodeContinuousToggle) {
        vDecodeContinuousToggle.addEventListener('change', saveAllSettings);
    }

    if (vDecodeDiffGroup) {
        vDecodeDiffGroup.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-vdiff]');
            if (!btn) return;
            vDecodeDiffGroup.querySelectorAll('.btn--toggle').forEach(b => b.classList.remove('btn--toggle--active'));
            btn.classList.add('btn--toggle--active');
            visualDifficulty = btn.dataset.vdiff;
            startVisualChallenge();
        });
    }

    // ─── 3. AUDIO MORSE DECODER ──────────────────────
    let audioDecoderCtx = null;
    let micStream = null;
    let analyserNode = null;
    let audioProcessorInterval = null;
    let waveformAnimFrame = null;
    let isListening = false;
    let isListeningPaused = false;

    let decoderState = {
        morseBuffer: '',
        fullMorse: '',
        decodedText: '',
        toneOn: false,
        toneStartTime: 0,
        silenceStartTime: 0,
        dotDuration: 80,
        samples: []
    };

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

    function updateAudioOutputs() {
        const morseDisplay = decoderState.fullMorse + (decoderState.morseBuffer ? ' ' + decoderState.morseBuffer : '');
        if (morseDisplay.trim()) {
            audioMorseOutput.innerHTML = formatMorseHTML(morseDisplay.trim());
        } else {
            audioMorseOutput.innerHTML = '<span class="morse-output__placeholder">Start listening to detect incoming Morse code…</span>';
        }

        if (decoderState.decodedText.trim()) {
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
        if (!isListening || isListeningPaused || !analyserNode) return;
        const bufferLength = analyserNode.fftSize;
        const dataArray = new Float32Array(bufferLength);
        analyserNode.getFloatTimeDomainData(dataArray);

        let sumSquares = 0;
        for (let i = 0; i < bufferLength; i++) {
            sumSquares += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sumSquares / bufferLength);
        const vuPercent = Math.min(100, Math.round(rms * 400));
        if (audioVuBar) audioVuBar.style.height = `${vuPercent}%`;

        const targetFreq = parseInt(detectFreqSlider.value, 10);
        const threshold = parseInt(thresholdSlider.value, 10);
        const sampleRate = audioDecoderCtx.sampleRate;

        const magnitude = goertzelMagnitude(dataArray, targetFreq, sampleRate) * 1000;
        const isTonePresent = magnitude > threshold;
        const now = performance.now();

        audioMagnitude.textContent = `Level: ${magnitude.toFixed(1)}`;

        if (isTonePresent) {
            audioLamp.classList.add('signal-lamp--on');
        } else {
            audioLamp.classList.remove('signal-lamp--on');
        }

        if (isTonePresent && !decoderState.toneOn) {
            decoderState.toneOn = true;
            decoderState.toneStartTime = now;
            if (decoderState.silenceStartTime > 0) {
                const silenceDur = now - decoderState.silenceStartTime;
                const dotRef = decoderState.dotDuration;
                if (silenceDur > dotRef * 5) {
                    flushCurrentChar();
                    decoderState.fullMorse += ' /';
                    decoderState.decodedText += ' ';
                    updateAudioOutputs();
                } else if (silenceDur > dotRef * 2) {
                    flushCurrentChar();
                    updateAudioOutputs();
                }
            }
        } else if (!isTonePresent && decoderState.toneOn) {
            decoderState.toneOn = false;
            decoderState.silenceStartTime = now;
            const toneDur = now - decoderState.toneStartTime;
            const dotRef = decoderState.dotDuration;

            if (toneDur < dotRef * 2) {
                decoderState.morseBuffer += '.';
                decoderState.samples.push(toneDur);
                if (decoderState.samples.length > 10) decoderState.samples.shift();
            } else {
                decoderState.morseBuffer += '-';
                decoderState.samples.push(toneDur / 3);
                if (decoderState.samples.length > 10) decoderState.samples.shift();
            }

            if (decoderState.samples.length >= 3) {
                const avg = decoderState.samples.reduce((a, b) => a + b, 0) / decoderState.samples.length;
                decoderState.dotDuration = Math.max(30, Math.min(300, avg));
            }
            updateAudioOutputs();
        } else if (!isTonePresent && !decoderState.toneOn && decoderState.silenceStartTime > 0) {
            const silenceDur = now - decoderState.silenceStartTime;
            if (decoderState.morseBuffer && silenceDur > decoderState.dotDuration * 3) {
                flushCurrentChar();
                updateAudioOutputs();
            }
        }
    }

    function drawWaveform() {
        if (!isListening || !analyserNode || !waveformCanvas) return;
        const width = waveformCanvas.clientWidth;
        const height = waveformCanvas.clientHeight;
        waveformCanvas.width = width * (window.devicePixelRatio || 1);
        waveformCanvas.height = height * (window.devicePixelRatio || 1);
        waveformCtx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

        const bufferLength = analyserNode.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserNode.getByteTimeDomainData(dataArray);

        waveformCtx.clearRect(0, 0, width, height);

        const grad = waveformCtx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, '#151917');
        grad.addColorStop(1, '#0e1110');
        waveformCtx.fillStyle = grad;
        waveformCtx.fillRect(0, 0, width, height);

        waveformCtx.strokeStyle = 'rgba(39, 197, 179, 0.12)';
        waveformCtx.lineWidth = 1;
        waveformCtx.beginPath();
        waveformCtx.moveTo(0, height / 2);
        waveformCtx.lineTo(width, height / 2);
        waveformCtx.stroke();

        const isToneOn = audioLamp.classList.contains('signal-lamp--on');
        waveformCtx.lineWidth = 2;
        waveformCtx.strokeStyle = (isListeningPaused ? '#e5c07b' : (isToneOn ? '#27c5b3' : '#6b7771'));
        waveformCtx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;
        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = (v * height) / 2;
            if (i === 0) waveformCtx.moveTo(x, y);
            else waveformCtx.lineTo(x, y);
            x += sliceWidth;
        }
        waveformCtx.lineTo(width, height / 2);
        waveformCtx.stroke();

        if (isToneOn && !isListeningPaused) {
            waveformCtx.shadowColor = '#27c5b3';
            waveformCtx.shadowBlur = 12;
            waveformCtx.strokeStyle = 'rgba(39, 197, 179, 0.4)';
            waveformCtx.lineWidth = 4;
            waveformCtx.stroke();
            waveformCtx.shadowBlur = 0;
        }

        waveformAnimFrame = requestAnimationFrame(drawWaveform);
    }

    async function startListening() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showToast('Microphone input is not supported in this browser.');
            audioStatus.textContent = 'Microphone unavailable';
            return;
        }

        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            audioDecoderCtx = new AudioCtx();
            micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const source = audioDecoderCtx.createMediaStreamSource(micStream);
            analyserNode = audioDecoderCtx.createAnalyser();
            analyserNode.fftSize = 2048;
            analyserNode.smoothingTimeConstant = 0.3;
            source.connect(analyserNode);

            isListening = true;
            isListeningPaused = false;
            decoderState = {
                morseBuffer: '', fullMorse: '', decodedText: '',
                toneOn: false, toneStartTime: 0, silenceStartTime: 0,
                dotDuration: 80, samples: []
            };
            updateAudioOutputs();

            audioStartBtn.disabled = true;
            if (audioPauseBtn) {
                audioPauseBtn.style.display = 'inline-flex';
                audioPauseBtn.querySelector('span').textContent = 'Pause';
            }
            audioStopBtn.disabled = false;
            audioStatus.textContent = '🎧 Listening… (Tone detection active)';
            audioStatus.classList.add('audio-decoder__status--listening');

            audioProcessorInterval = setInterval(processAudioFrame, 16);
            drawWaveform();
        } catch (err) {
            showToast('Microphone access denied or unavailable.');
            console.error('Mic error:', err);
        }
    }

    function toggleAudioPause() {
        if (!isListening) return;
        if (!isListeningPaused) {
            isListeningPaused = true;
            if (audioPauseBtn) audioPauseBtn.querySelector('span').textContent = 'Resume';
            audioStatus.textContent = '❚❚ Paused · Microphone suspended';
            audioStatus.classList.remove('audio-decoder__status--listening');
            audioLamp.classList.remove('signal-lamp--on');
            if (audioVuBar) audioVuBar.style.height = '0%';
            showToast('Microphone listening paused.');
        } else {
            isListeningPaused = false;
            if (audioPauseBtn) audioPauseBtn.querySelector('span').textContent = 'Pause';
            audioStatus.textContent = '🎧 Listening… (Tone detection active)';
            audioStatus.classList.add('audio-decoder__status--listening');
            showToast('Microphone listening resumed.');
        }
    }

    function stopListening() {
        isListening = false;
        isListeningPaused = false;
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

        flushCurrentChar();
        updateAudioOutputs();

        audioLamp.classList.remove('signal-lamp--on');
        audioStartBtn.disabled = false;
        if (audioPauseBtn) audioPauseBtn.style.display = 'none';
        audioStopBtn.disabled = true;
        audioStatus.textContent = 'Stopped · Idle';
        audioStatus.classList.remove('audio-decoder__status--listening');
        audioMagnitude.textContent = 'Level: —';
        if (audioVuBar) audioVuBar.style.height = '0%';
    }

    audioStartBtn.addEventListener('click', startListening);
    if (audioPauseBtn) audioPauseBtn.addEventListener('click', toggleAudioPause);
    audioStopBtn.addEventListener('click', stopListening);
    audioClearBtn.addEventListener('click', () => {
        decoderState = {
            morseBuffer: '', fullMorse: '', decodedText: '',
            toneOn: false, toneStartTime: 0, silenceStartTime: 0,
            dotDuration: 80, samples: []
        };
        updateAudioOutputs();
    });

    audioCopyMorse.addEventListener('click', () => {
        const m = decoderState.fullMorse.trim();
        if (m) copyText(m, 'Morse code copied!');
    });
    audioCopyText.addEventListener('click', () => {
        const t = decoderState.decodedText.trim();
        if (t) copyText(t, 'Decoded text copied!');
    });

    // ─── 8. INTERACTIVE REFERENCE CHART ──────────────
    let activeRefCategory = 'all';

    function buildReferenceChart() {
        if (!refChart) return;
        const filter = (refSearchInput ? refSearchInput.value.trim().toUpperCase() : '');

        const allEntries = [];

        // Letters
        for (let i = 65; i <= 90; i++) {
            const ch = String.fromCharCode(i);
            allEntries.push({ char: ch, code: MORSE_MAP[ch], category: 'letters', mnemonic: PHONETICS[ch] || '' });
        }
        // Numbers
        for (let i = 0; i <= 9; i++) {
            const ch = i.toString();
            allEntries.push({ char: ch, code: MORSE_MAP[ch], category: 'numbers', mnemonic: PHONETICS[ch] || '' });
        }
        // Punctuation
        const puncts = ['.', ',', '?', '/', '=', '+', '-', '@', '!', '$', ':', ';'];
        puncts.forEach(p => {
            if (MORSE_MAP[p]) {
                allEntries.push({ char: p, code: MORSE_MAP[p], category: 'punctuation', mnemonic: PHONETICS[p] || '' });
            }
        });
        // Prosigns
        PROSIGNS_LIST.forEach(p => {
            allEntries.push({ char: `<${p.char}>`, code: p.code, category: 'prosigns', mnemonic: p.meaning || p.phonetic });
        });

        const filtered = allEntries.filter(item => {
            const matchesCat = (activeRefCategory === 'all' || item.category === activeRefCategory);
            const matchesSearch = !filter ||
                item.char.toUpperCase().includes(filter) ||
                item.code.includes(filter) ||
                item.mnemonic.toUpperCase().includes(filter);
            return matchesCat && matchesSearch;
        });

        if (!filtered.length) {
            refChart.innerHTML = '<div class="table-empty" style="grid-column: 1 / -1;">No matching Morse characters found.</div>';
            return;
        }

        refChart.innerHTML = filtered.map(item => `
            <div class="ref-item" data-morse="${item.code}" title="Click to play ${item.char}">
                <div class="ref-item__left">
                    <span class="ref-item__char">${item.char}</span>
                    <span class="ref-item__mnemonic">${item.mnemonic}</span>
                </div>
                <span class="ref-item__morse">${item.code}</span>
            </div>
        `).join('');
    }

    if (refChart) {
        refChart.addEventListener('click', (e) => {
            const item = e.target.closest('.ref-item');
            if (!item) return;
            const morse = item.dataset.morse;
            audio.playMorse(morse, null);
        });
    }

    if (refSearchInput) {
        refSearchInput.addEventListener('input', buildReferenceChart);
    }

    if (refCategories) {
        refCategories.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-refcat]');
            if (!btn) return;
            refCategories.querySelectorAll('.btn--toggle').forEach(b => b.classList.remove('btn--toggle--active'));
            btn.classList.add('btn--toggle--active');
            activeRefCategory = btn.dataset.refcat;
            buildReferenceChart();
        });
    }

    buildReferenceChart();

    // ─── Global Keyboard Shortcuts ───────────────────
    document.addEventListener('keydown', (e) => {
        const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);

        // Ctrl+1 through Ctrl+7 for tab switching
        if (e.ctrlKey && ['1', '2', '3', '4', '5', '6', '7'].includes(e.key)) {
            e.preventDefault();
            const idx = parseInt(e.key, 10) - 1;
            if (tabs[idx]) activateTab(tabs[idx]);
            return;
        }

        // Ctrl+/ or '?' for Shortcuts dialog
        if ((e.ctrlKey && e.key === '/') || (e.key === '?' && !isInput)) {
            e.preventDefault();
            openShortcuts();
            return;
        }

        // Escape closes modals or stops audio
        if (e.key === 'Escape') {
            closeShortcuts();
            closeSessionSummary();
            if (iosInstallModal) iosInstallModal.setAttribute('aria-hidden', 'true');
            audio.stop();
            return;
        }

        // Spacebar to replay current Morse challenge (if not typing in text input)
        if (e.key === ' ' && !isInput) {
            e.preventDefault();
            const activePanel = document.querySelector('.panel--active');
            if (activePanel) {
                if (activePanel.id === 'panel-trainer' && currentChallengeMorse) {
                    audio.playMorse(currentChallengeMorse, trainerLamp);
                } else if (activePanel.id === 'panel-contest' && currentContestQSO.morse) {
                    audio.playMorse(currentContestQSO.morse, contestLamp);
                } else if (activePanel.id === 'panel-visual-decode' && visualChallengeMorse) {
                    audio.playMorse(visualChallengeMorse, vDecodeLamp, { muted: !vDecodeSound.checked });
                }
            }
            return;
        }

        // Ctrl+R to reveal answer
        if (e.ctrlKey && (e.key === 'r' || e.key === 'R')) {
            const activePanel = document.querySelector('.panel--active');
            if (activePanel) {
                e.preventDefault();
                if (activePanel.id === 'panel-trainer') revealAnswer();
                else if (activePanel.id === 'panel-contest') contestReveal.click();
                else if (activePanel.id === 'panel-visual-decode') vDecodeReveal.click();
            }
        }
    });

    // ─── Initialize Audio & Settings ─────────────────
    document.addEventListener('click', () => audio.init(), { once: true });
    document.addEventListener('keydown', () => audio.init(), { once: true });

    loadAllSettings();

    // Check URL parameters for tab routing
    const requestedTab = new URLSearchParams(window.location.search).get('tab');
    if (requestedTab) {
        activateTab(document.querySelector(`.tab[data-tab="${requestedTab}"]`));
    }

})();
