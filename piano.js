// MASHA Professional Piano Masha 26 (PPM 26)
console.log('piano.js loaded');
class ProfessionalWorkstation {
    constructor() {
        console.log('ProfessionalWorkstation constructor');
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch(e) {
            console.error('AudioContext error', e);
            // audio context unavailable, continue without sound
            this.audioContext = null;
            alert('Warning: Web Audio API unavailable. Piano will display keys but no sound will play.');
        }
        this.keys = this.createKeyMapping();
        this.activeOscillators = new Map(); // key is unique id per physical key
        this.keyCount = 0;
        this.transpose = 0;
        this.currentVoice = 'grandPiano';
        this.metronomeActive = false;
        this.metronomeTempo = 120;
        this.masterVolume = 0.7;
        this.reverbAmount = 0.5;
        this.chorusAmount = 0;
        this.sustain = false;
        this.sustainedNotes = new Set();
        this.mode = 'dual'; // 'single', 'dual', '2p'

        // Recording state
        this.recording = false;
        this.recordedNotes = [];
        this.recordStartTime = 0;
        
        // Scheduling state
        this.schedulerId = null;
        this.currentBeatIndex = 0;
        this.beatPatternName = 'none';
        
        // Effects nodes
        this.masterGain = this.audioContext ? this.audioContext.createGain() : null;
        if (this.masterGain) {
            this.masterGain.gain.value = this.masterVolume;
            this.masterGain.connect(this.audioContext.destination);
        }
        
        // Frequency multiplier for transposition
        this.semitoneMultiplier = Math.pow(2, 1/12);
        
        // Audio files cache
        this.audioFiles = {};
        this.loadAudioFiles();
        
        this.init();
    }

    loadAudioFiles() {
        // Pre-load piano note mp3 files; missing files will generate errors at play time
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octaves = [4, 5];

        octaves.forEach(octave => {
            noteNames.forEach(noteName => {
                const noteKey = `${noteName}${octave}`;
                const fileName = `sounds/${noteKey}.mp3`;
                const audio = new Audio(fileName);
                audio.preload = 'auto';
                audio.addEventListener('error', () => {
                    console.warn(`Unable to load audio file: ${fileName}`);
                    // keep the entry anyway so playAudioNote can attempt and fail gracefully
                });
                this.audioFiles[noteKey] = audio;
            });
        });
    }

    playAudioNote(noteLabel) {
        const originalAudio = this.audioFiles[noteLabel];
        if (!originalAudio) {
            console.warn(`Audio file not available for note: ${noteLabel}`);
            return false;
        }
        try {
            // Clone the preloaded audio for polyphony (multiple simultaneous notes)
            const sound = originalAudio.cloneNode();
            sound.currentTime = 0;
            const playPromise = sound.play();
            console.log(`Attempting to play MP3 for ${noteLabel}`);
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log(`Successfully playing MP3 for ${noteLabel}`);
                }).catch(err => {
                    console.warn(`Failed to play ${noteLabel}:`, err);
                });
                return true;
            }
            return false;
        } catch (e) {
            console.warn(`Error playing ${noteLabel}:`, e);
            return false;
        }
    }

    createKeyMapping() {
        const notes = [
            // Octave 1 - C4 to B4
            { key: 'A', note: 'C4', frequency: 261.63, octave: 1, position: 0 },
            { key: 'W', note: 'C#4', frequency: 277.18, octave: 1, position: 0.5, black: true },
            { key: 'S', note: 'D4', frequency: 293.66, octave: 1, position: 1 },
            { key: 'E', note: 'D#4', frequency: 311.13, octave: 1, position: 1.5, black: true },
            { key: 'D', note: 'E4', frequency: 329.63, octave: 1, position: 2 },
            { key: 'F', note: 'F4', frequency: 349.23, octave: 1, position: 3 },
            { key: 'T', note: 'F#4', frequency: 369.99, octave: 1, position: 3.5, black: true },
            { key: 'G', note: 'G4', frequency: 392.00, octave: 1, position: 4 },
            { key: 'Y', note: 'G#4', frequency: 415.30, octave: 1, position: 4.5, black: true },
            { key: 'H', note: 'A4', frequency: 440.00, octave: 1, position: 5 },
            { key: 'U', note: 'A#4', frequency: 466.16, octave: 1, position: 5.5, black: true },
            { key: 'J', note: 'B4', frequency: 493.88, octave: 1, position: 6 },
            
            // Octave 2 - C5 to B5
            { key: 'K', note: 'C5', frequency: 523.25, octave: 2, position: 0 },
            { key: 'O', note: 'C#5', frequency: 554.37, octave: 2, position: 0.5, black: true },
            { key: 'L', note: 'D5', frequency: 587.33, octave: 2, position: 1 },
            { key: 'P', note: 'D#5', frequency: 622.25, octave: 2, position: 1.5, black: true },
            { key: ';', note: 'E5', frequency: 659.25, octave: 2, position: 2 },
            { key: 'X', note: 'F5', frequency: 698.46, octave: 2, position: 3 },
            { key: 'C', note: 'F#5', frequency: 739.99, octave: 2, position: 3.5, black: true },
            { key: 'V', note: 'G5', frequency: 783.99, octave: 2, position: 4 },
            { key: 'B', note: 'G#5', frequency: 830.61, octave: 2, position: 4.5, black: true },
            { key: 'N', note: 'A5', frequency: 880.00, octave: 2, position: 5 },
            { key: 'M', note: 'A#5', frequency: 932.33, octave: 2, position: 5.5, black: true },
            { key: 'Z', note: 'B5', frequency: 987.77, octave: 2, position: 6 }
        ];
        
        return notes;
    }

    init() {
        this.createKeyboardUI();
        this.attachEventListeners();
        this.setupControlListeners();
        this.setupVolumeKnob();
        // Position black keys correctly after rendering
        this.updateBlackKeyPositions();
        window.addEventListener('resize', () => this.updateBlackKeyPositions());
        const keyboard = document.getElementById('keyboard');
        if (keyboard) keyboard.addEventListener('scroll', () => this.updateBlackKeyPositions());
        // track mouse dragging
        this.mouseDown = false;
        document.addEventListener('mousedown', () => this.mouseDown = true);
        document.addEventListener('mouseup', () => this.mouseDown = false);
        document.addEventListener('touchstart', () => this.mouseDown = true);
        document.addEventListener('touchend', () => this.mouseDown = false);
        
        // Disable right-click context menu
        document.addEventListener('contextmenu', e => e.preventDefault());
        
        // Block browser shortcuts (Ctrl/Alt)
        window.addEventListener('keydown', e => {
            if (e.ctrlKey || e.altKey) e.preventDefault();
        });
        
        // start scheduler if needed
        this.updateScheduler();
    }

    createKeyboardUI() {
        console.log('build keyboard UI');
        const keyboard = document.getElementById('keyboard');
        if (!keyboard) {
            console.warn('keyboard container not found');
            return;
        }
        keyboard.innerHTML = '';
        
        const octaves = {};
        this.keys.forEach(keyData => {
            if (!octaves[keyData.octave]) {
                octaves[keyData.octave] = { white: [], black: [] };
            }
            if (keyData.black) {
                octaves[keyData.octave].black.push(keyData);
            } else {
                octaves[keyData.octave].white.push(keyData);
            }
        });
        const sorted = Object.keys(octaves).sort((a, b) => a - b);
        let toRender = sorted;
        if (this.mode === 'single') toRender = sorted.slice(0,1);
        
        toRender.forEach(octaveNum => {
            const octaveData = octaves[octaveNum];
            const octaveContainer = document.createElement('div');
            octaveContainer.className = 'octave';
            
            const whiteKeysContainer = document.createElement('div');
            whiteKeysContainer.className = 'white-keys';
            octaveData.white.forEach(keyData => {
                whiteKeysContainer.appendChild(this.createKeyElement(keyData));
            });
            
            const blackKeysContainer = document.createElement('div');
            blackKeysContainer.className = 'black-keys';
            octaveData.black.forEach(keyData => {
                blackKeysContainer.appendChild(this.createKeyElement(keyData));
            });
            
            octaveContainer.appendChild(whiteKeysContainer);
            octaveContainer.appendChild(blackKeysContainer);
            keyboard.appendChild(octaveContainer);
        });
    }
    
    createKeyElement(keyData) {
        const keyElement = document.createElement('div');
        keyElement.className = `piano-key ${keyData.black ? 'black' : 'white'}`;
        keyElement.dataset.key = keyData.key;
        keyElement.dataset.frequency = keyData.frequency;
        keyElement.dataset.note = keyData.note;
        keyElement.dataset.octave = keyData.octave;
        if (keyData.black) {
            keyElement.style.setProperty('--position', keyData.position);
            keyElement.dataset.position = keyData.position;
        }
        
        const label = document.createElement('span');
        label.className = 'key-label';
        label.textContent = keyData.key;
        keyElement.appendChild(label);
        
        keyElement.addEventListener('mousedown', () => this.playNote(keyData, keyElement));
        keyElement.addEventListener('mouseup', () => this.stopNote(keyData, keyElement));
        keyElement.addEventListener('mouseleave', () => this.stopNote(keyData, keyElement));
        keyElement.addEventListener('mouseenter', () => {
            if (this.mouseDown) this.playNote(keyData, keyElement);
        });
        keyElement.addEventListener('mousemove', () => {
            if (this.mouseDown && !keyElement.classList.contains('active')) {
                this.playNote(keyData, keyElement);
            }
        });
        // touch move support
        keyElement.addEventListener('touchmove', (e) => {
            const touch = e.touches[0];
            const elem = document.elementFromPoint(touch.clientX, touch.clientY);
            if (elem === keyElement && !keyElement.classList.contains('active')) {
                this.playNote(keyData, keyElement);
            }
        });
        
        return keyElement;
    }

    attachEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }

    setupControlListeners() {
        // Voice selector
        document.getElementById('voice-select').addEventListener('change', (e) => {
            this.currentVoice = e.target.value;
            const voiceNames = {
                'grandPiano': 'Grand Piano',
                'pianoWarm': 'Warm Piano',
                'brightnePiano': 'Bright Piano',
                'electricPiano': 'Electric Piano',
                'rhodes': 'Rhodes Piano',
                'harpsichord': 'Harpsichord',
                'organ': 'Organ',
                'strings': 'Strings',
                'pad': 'Pad/Synth',
                'vibraphone': 'Vibraphone'
            };
            document.getElementById('voice-display').textContent = voiceNames[this.currentVoice];
        });

        // Master volume handled by knob (see setupVolumeKnob)

        // Reverb
        document.getElementById('reverb-control').addEventListener('input', (e) => {
            this.reverbAmount = parseInt(e.target.value) / 100;
            document.getElementById('reverb-value').textContent = e.target.value + '%';
        });

        // Chorus
        document.getElementById('chorus-control').addEventListener('input', (e) => {
            this.chorusAmount = parseInt(e.target.value) / 100;
            document.getElementById('chorus-value').textContent = e.target.value + '%';
        });

        // Metronome
        const metronomeBtn = document.getElementById('metronome-btn');
        const tempoInput = document.getElementById('tempo-bpm');
        
        metronomeBtn.addEventListener('click', () => {
            this.toggleMetronome();
            metronomeBtn.textContent = this.metronomeActive ? 'STOP' : 'START';
            metronomeBtn.classList.toggle('active');
            this.updateScheduler();
        });

        tempoInput.addEventListener('change', (e) => {
            this.metronomeTempo = parseInt(e.target.value);
            document.getElementById('tempo-display').textContent = this.metronomeTempo;
            this.updateScheduler();
        });

        // Transpose
        document.getElementById('transpose-up').addEventListener('click', () => {
            this.transpose = Math.min(this.transpose + 1, 12);
            this.updateTransposeDisplay();
        });

        document.getElementById('transpose-down').addEventListener('click', () => {
            this.transpose = Math.max(this.transpose - 1, -12);
            this.updateTransposeDisplay();
        });

        // Power controls
        const powerOffBtn = document.getElementById('power-off');
        const powerOnBtn = document.getElementById('power-on');
        if (powerOffBtn) powerOffBtn.addEventListener('click', () => this.powerOff());
        if (powerOnBtn) powerOnBtn.addEventListener('click', () => this.powerOn());

        // Sustain
        const sustainBtn = document.getElementById('sustain-btn');
        if (sustainBtn) sustainBtn.addEventListener('click', () => {
            this.sustain = !this.sustain;
            sustainBtn.textContent = this.sustain ? 'Sustain On' : 'Sustain Off';
            sustainBtn.classList.toggle('active', this.sustain);
            if (!this.sustain) {
                // release all sustained keys
                Array.from(this.sustainedNotes).forEach(id => {
                    this.stopSynthesisById(id);
                    const [kc,oc] = id.split('_');
                    const el = document.querySelector(`[data-key="${kc}"][data-octave="${oc}"]`);
                    if (el) el.classList.remove('active');
                });
                this.sustainedNotes.clear();
            }
        });

        // Keyboard scroll buttons
        const scrollLeft = document.getElementById('scroll-left');
        const scrollRight = document.getElementById('scroll-right');
        const keyboard = document.getElementById('keyboard');
        if (scrollLeft && keyboard) scrollLeft.addEventListener('click', () => { keyboard.scrollBy({ left: -300, behavior: 'smooth' }); });
        if (scrollRight && keyboard) scrollRight.addEventListener('click', () => { keyboard.scrollBy({ left: 300, behavior: 'smooth' }); });

        // (other controls continue as before...)

        // Beat selector
        const beatSelect = document.getElementById('beat-select');
        if (beatSelect) beatSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val === 'none') {
                this.stopBeatPattern();
            } else {
                this.startBeatPattern(val);
            }
            this.updateScheduler();
        });

        // Recording controls
        const recStart = document.getElementById('record-start');
        const recStop = document.getElementById('record-stop');
        const recPlay = document.getElementById('record-play');
        if (recStart) recStart.addEventListener('click', () => {
            this.recordedNotes = [];
            this.recording = true;
            this.recordStartTime = performance.now();
            recStart.textContent = 'Recording...';
            recStart.classList.add('active');
        });
        if (recStop) recStop.addEventListener('click', () => {
            this.recording = false;
            recStart.textContent = 'Record';
            recStart.classList.remove('active');
        });
        if (recPlay) recPlay.addEventListener('click', () => {
            this.playbackRecording();
        });

        // Additional listeners can go here


        // Mode buttons
        const modeSingle = document.getElementById('mode-single');
        const modeDual = document.getElementById('mode-dual');
        const mode2p = document.getElementById('mode-2p');
        if (modeSingle) modeSingle.addEventListener('click', () => this.setMode('single'));
        if (modeDual) modeDual.addEventListener('click', () => this.setMode('dual'));
        if (mode2p) mode2p.addEventListener('click', () => this.setMode('2p'));
    }

    setupVolumeKnob() {
        const knob = document.getElementById('volume-knob');
        const display = document.getElementById('volume-value');
        if (!knob || !display) return;
        let dragging = false;
        let centerX, centerY;

        const updateAngle = (angle) => {
            if (angle < -135) angle = -135;
            if (angle > 135) angle = 135;
            knob.dataset.angle = angle;
            const indicator = knob.querySelector('.indicator');
            if (indicator) indicator.style.transform = `translateX(-50%) rotate(${angle}deg)`;
            const value = Math.round(((angle + 135) / 270) * 100);
            this.masterVolume = value / 100;
            if (this.masterGain) this.masterGain.gain.value = this.masterVolume;
            display.textContent = value + '%';
        };

        const calculateAngle = (x, y) => {
            const dx = x - centerX;
            const dy = y - centerY;
            let deg = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
            if (deg > 180) deg -= 360;
            return deg;
        };

        const onMouseMove = (e) => {
            if (!dragging) return;
            const angle = calculateAngle(e.clientX, e.clientY);
            updateAngle(angle);
        };
        const onMouseUp = () => { dragging = false; document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onMouseUp); };
        const onMouseDown = (e) => {
            dragging = true;
            const rect = knob.getBoundingClientRect();
            centerX = rect.left + rect.width / 2;
            centerY = rect.top + rect.height / 2;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        knob.addEventListener('mousedown', onMouseDown);
        knob.addEventListener('touchstart', (e) => { e.preventDefault(); onMouseDown(e.touches[0]); });
        knob.addEventListener('touchmove', (e) => { e.preventDefault(); if (dragging) { const touch = e.touches[0]; const angle = calculateAngle(touch.clientX, touch.clientY); updateAngle(angle);} });
        knob.addEventListener('touchend', (e) => { dragging = false; });

        // set initial angle
        const initialAngle = (this.masterVolume * 270) - 135;
        updateAngle(initialAngle);
    }

    setMode(mode) {
        this.mode = mode;
        // update button active states
        ['mode-single','mode-dual','mode-2p'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.toggle('active', id === `mode-${mode === '2p' ? '2p' : mode}`);
        });
        // Recreate keyboard UI to reflect mode
        this.createKeyboardUI();
        this.updateBlackKeyPositions();
    }

    startBeatPattern(name) {
        this.beatPatternName = name;
        this.currentBeatIndex = 0;
        // scheduler will handle pattern steps
    }

    playbackRecording() {
        if (this.recordedNotes.length === 0) return;
        this.playingBack = true;
        // schedule playback of recorded notes
        this.recordedNotes.forEach(item => {
            setTimeout(() => {
                const el = document.querySelector(`[data-key="${item.keyData.key}"][data-octave="${item.keyData.octave}"]`);
                if (el) {
                    this.playNote(item.keyData, el);
                    // automatically release after short duration
                    setTimeout(() => this.stopNote(item.keyData, el), 300);
                }
            }, item.time);
        });
        // clear playing flag after last note
        const lastTime = Math.max(...this.recordedNotes.map(n => n.time));
        setTimeout(() => { this.playingBack = false; }, lastTime + 400);
    }

    stopBeatPattern() {
        this.beatPatternName = 'none';
        this.currentBeatIndex = 0;
    }

    playPercussion(type) {
        const now = this.audioContext.currentTime;
        if (!this.masterGain) return;

        if (type === 'kick') {
            const o = this.audioContext.createOscillator();
            const g = this.audioContext.createGain();
            o.type = 'sine';
            o.frequency.setValueAtTime(150, now);
            o.frequency.exponentialRampToValueAtTime(50, now + 0.1);
            g.gain.setValueAtTime(0.9, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
            o.connect(g);
            g.connect(this.masterGain);
            o.start(now);
            o.stop(now + 0.6);
        } else if (type === 'snare') {
            // white noise snare
            const bufferSize = this.audioContext.sampleRate * 0.2;
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random()*2-1;
            const noise = this.audioContext.createBufferSource();
            noise.buffer = buffer;
            const g = this.audioContext.createGain();
            g.gain.setValueAtTime(0.5, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            noise.connect(g);
            g.connect(this.masterGain);
            noise.start(now);
            noise.stop(now + 0.2);
        } else if (type === 'hat') {
            const o = this.audioContext.createOscillator();
            const g = this.audioContext.createGain();
            o.type = 'square';
            o.frequency.setValueAtTime(8000, now);
            g.gain.setValueAtTime(0.3, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
            o.connect(g);
            g.connect(this.masterGain);
            o.start(now);
            o.stop(now + 0.12);
        }
    }

    powerOff() {
        // Immediately stop and disconnect all active oscillators and silence master
        try {
            this.activeOscillators.forEach(({ oscillators, gain }, freq) => {
                try {
                    oscillators.forEach(osc => {
                        try { osc.stop(); } catch (e) {}
                        try { osc.disconnect(); } catch (e) {}
                    });
                } catch (e) {}
                try { gain.disconnect(); } catch (e) {}
            });
        } catch (e) {}
        this.activeOscillators.clear();
        this.sustainedNotes.clear();
        if (this.schedulerId) {
            clearInterval(this.schedulerId);
            this.schedulerId = null;
        }
        try { this.masterGain.gain.setValueAtTime(0, this.audioContext.currentTime); } catch(e) {}
        if (this.audioContext.state === 'running') {
            this.audioContext.suspend();
        }
    }

    powerOn() {
        if (this.audioContext.state !== 'running') {
            this.audioContext.resume();
        }
        try { this.masterGain.gain.setValueAtTime(this.masterVolume, this.audioContext.currentTime); } catch(e) {}
    }

    stopSynthesisById(id, defaultFade = 0.15) {
        const voiceSynthesis = this.activeOscillators.get(id);
        if (!voiceSynthesis) return;
        
        // Handle audio files (no synthesis to stop)
        if (voiceSynthesis.isAudioFile) {
            this.activeOscillators.delete(id);
            const [kc,oc] = id.split('_');
            const el = document.querySelector(`[data-key="${kc}"][data-octave="${oc}"]`);
            if (el) el.classList.remove('active');
            return;
        }
        
        const { oscillators, gain, releaseTime } = voiceSynthesis;
        const fadeTime = releaseTime != null ? releaseTime : defaultFade;

        try {
            if (gain && gain.gain && this.audioContext) {
                gain.gain.cancelScheduledValues(this.audioContext.currentTime);
                gain.gain.setValueAtTime(gain.gain.value, this.audioContext.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + fadeTime);
            }
        } catch(e) {}

        setTimeout(() => {
            try {
                oscillators.forEach(osc => {
                    try { osc.stop(); } catch(e) {}
                    try { osc.disconnect(); } catch(e) {}
                });
            } catch(e) {}
            try { gain.disconnect(); } catch(e) {}
            this.activeOscillators.delete(id);
            const [kc,oc] = id.split('_');
            const el = document.querySelector(`[data-key="${kc}"][data-octave="${oc}"]`);
            if (el) el.classList.remove('active');
        }, fadeTime * 1000);
    }

    updateTransposeDisplay() {
        document.getElementById('transpose-value').textContent = this.transpose;
    }

    toggleMetronome() {
        this.metronomeActive = !this.metronomeActive;
        this.updateScheduler();
    }

    updateScheduler() {
        if (this.schedulerId) {
            clearInterval(this.schedulerId);
            this.schedulerId = null;
        }
        if (!this.metronomeActive && this.beatPatternName === 'none') return;
        const beatDurationMs = (60 / this.metronomeTempo) * 1000;
        this.schedulerId = setInterval(() => this.schedulerTick(), beatDurationMs);
    }

    schedulerTick() {
        const now = this.audioContext.currentTime;
        if (this.metronomeActive) {
            this.playMetronomeClick();
        }
        if (this.beatPatternName !== 'none') {
            const patterns = {
                rock: [
                    {k:'kick'},{h:'hat'},{s:'snare'},{h:'hat'},
                    {k:'kick'},{h:'hat'},{s:'snare'},{h:'hat'}
                ],
                amapiano: [
                    {k:'kick'},{},{h:'hat'},{},{k:'kick'},{h:'hat'},{},{h:'hat'}
                ],
                seben: [
                    {k:'kick'},{},{s:'snare'},{h:'hat'},
                    {k:'kick'},{h:'hat'},{s:'snare'},{h:'hat'}
                ],
                worship: [
                    {k:'kick'},{},{},{h:'hat'},
                    {k:'kick'},{},{},{h:'hat'}
                ],
                afrobeats: [
                    {k:'kick'},{h:'hat'},{},{h:'hat'},
                    {k:'kick'},{},{s:'snare'},{h:'hat'}
                ]
            };
            const pattern = patterns[this.beatPatternName] || [];
            const step = pattern[this.currentBeatIndex % pattern.length] || {};
            if (step.k) this.playPercussion('kick');
            if (step.s) this.playPercussion('snare');
            if (step.h) this.playPercussion('hat');
            this.currentBeatIndex++;
        }
    }

    playMetronomeClick() {
        const now = this.audioContext.currentTime;
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        osc.frequency.value = 800;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.05);
    }

    handleKeyDown(event) {
        const keyChar = event.key.toUpperCase();
        const keyData = this.keys.find(k => k.key === keyChar);
        
        if (keyData && !event.repeat) {
            event.preventDefault();
            const keyElement = document.querySelector(`[data-key="${keyChar}"]`);
            if (keyElement) {
                this.playNote(keyData, keyElement);
            }
        }
    }

    handleKeyUp(event) {
        const keyChar = event.key.toUpperCase();
        const keyData = this.keys.find(k => k.key === keyChar);
        
        if (keyData) {
            event.preventDefault();
            const keyElement = document.querySelector(`[data-key="${keyChar}"]`);
            if (keyElement) {
                this.stopNote(keyData, keyElement);
            }
        }
    }

    getTransposedFrequency(frequency) {
        return frequency * Math.pow(this.semitoneMultiplier, this.transpose);
    }

    getTransposedNote(noteLabel) {
        // noteLabel is like "C4", "C#4", "D5", etc.
        const noteSequence = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const noteName = noteLabel.slice(0, -1); // "C#" from "C#4"
        const octave = parseInt(noteLabel[noteLabel.length - 1]); // 4 from "C#4"
        
        const noteIndex = noteSequence.indexOf(noteName);
        if (noteIndex === -1) return noteLabel; // fallback if not found
        
        const transposedIndex = noteIndex + this.transpose;
        const newNoteIndex = ((transposedIndex % 12) + 12) % 12; // handle negative wrapping
        const octaveOffset = Math.floor((noteIndex + this.transpose) / 12);
        const newOctave = octave + octaveOffset;
        
        // Clamp to available octaves (4-5)
        if (newOctave < 4 || newOctave > 5) {
            return noteLabel; // out of range, use original
        }
        
        return noteSequence[newNoteIndex] + newOctave;
    }

    playNote(keyData, keyElement) {
        const id = `${keyData.key}_${keyData.octave}`;
        if (this.activeOscillators.has(id)) {
            return; // already holding that key
        }

        // Try to play audio file first if available
        let audioPlayed = false;
        if (Object.keys(this.audioFiles).length > 0) {
            const transposedNote = this.getTransposedNote(keyData.note);
            audioPlayed = this.playAudioNote(transposedNote);
        }
        
        // Resume audio context if suspended (required for synthesis)
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        
        // Always use synthesis (with or without audio)
        const transposedFreq = this.getTransposedFrequency(keyData.frequency);
        const voiceSynthesis = this.createVoiceSynthesis(transposedFreq);
        this.activeOscillators.set(id, { ...voiceSynthesis, freq: transposedFreq });
        console.log(`Playing synthesis for ${id} at ${transposedFreq}Hz`);
        
        keyElement.classList.add('active');
        
        if (!this.playingBack) {
            this.keyCount++;
            document.getElementById('keyCount').textContent = this.keyCount;
        }

        // recording logic
        if (this.recording) {
            const now = performance.now();
            this.recordedNotes.push({ keyData, time: now - this.recordStartTime });
        }
    }

    createVoiceSynthesis(frequency) {
        if (!this.audioContext) {
            // no audio available, return dummy object so UI can proceed
            return { oscillators: [], gain: { gain: { value: 0 } }, releaseTime: 0 };
        }
        const now = this.audioContext.currentTime;
        const gainNode = this.audioContext.createGain();
        gainNode.gain.setValueAtTime(0, now);
        // lowpass filter for warmth
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2200, now);
        filter.Q.value = 0.8;
        gainNode.connect(filter);
        filter.connect(this.masterGain);
        
        let oscillators = [];
        let baseGain = 0.25 * (0.8 + Math.random() * 0.4); // random velocity variation
        let releaseTime = 0.5;

        const addOsc = (type, freq, vol) => {
            const osc = this.audioContext.createOscillator();
            osc.type = type;
            osc.frequency.value = freq;
            osc.detune.value = (Math.random() - 0.5) * 20; // slight detune
            const g = this.audioContext.createGain();
            g.gain.value = baseGain * vol;
            osc.connect(g);
            g.connect(gainNode);
            osc.start(now);
            return osc;
        };

        // optional noise body for acoustic piano voices
        const addNoise = () => {
            const bufferSize = this.audioContext.sampleRate * 0.3;
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = (Math.random()*2 - 1) * 0.2;
            const noise = this.audioContext.createBufferSource();
            noise.buffer = buffer;
            const ng = this.audioContext.createGain();
            ng.gain.setValueAtTime(0.15, now);
            noise.connect(ng);
            ng.connect(gainNode);
            noise.start(now);
            return noise;
        };

        switch(this.currentVoice) {
            case 'grandPiano':
                oscillators = [
                    addOsc('sine', frequency, 1),
                    addOsc('sine', frequency * 1.002, 0.75),
                    addOsc('triangle', frequency * 2, 0.6)
                ];
                addNoise();
                releaseTime = 1.2;
                break;
            case 'pianoWarm':
                oscillators = [
                    addOsc('sine', frequency, 1.1),
                    addOsc('sine', frequency * 0.5, 0.6)
                ];
                addNoise();
                releaseTime = 1.0;
                break;
            case 'brightnePiano':
                oscillators = [
                    addOsc('sine', frequency, 1),
                    addOsc('triangle', frequency * 2, 0.9),
                    addOsc('sine', frequency * 3, 0.6)
                ];
                releaseTime = 0.8;
                break;
            case 'electricPiano':
                oscillators = [
                    addOsc('sine', frequency, 1),
                    addOsc('sine', frequency * 2, 0.8),
                    addOsc('sine', frequency * 1.5, 0.5)
                ];
                releaseTime = 0.5;
                break;
            case 'rhodes':
                oscillators = [
                    addOsc('sine', frequency, 1.2),
                    addOsc('sine', frequency * 2, 0.8),
                    addOsc('sine', frequency * 3, 0.5)
                ];
                releaseTime = 0.6;
                break;
            case 'harpsichord':
                oscillators = [
                    addOsc('triangle', frequency, 1.3),
                    addOsc('sine', frequency * 2, 0.7)
                ];
                gainNode.gain.setValueAtTime(0.4, now);
                gainNode.gain.exponentialRampToValueAtTime(0.1, now + 0.15);
                releaseTime = 0.3;
                break;
            case 'organ':
                oscillators = [
                    addOsc('sine', frequency, 1),
                    addOsc('sine', frequency * 2, 1),
                    addOsc('sine', frequency * 3, 0.8)
                ];
                releaseTime = 0.7;
                break;
            case 'strings':
                oscillators = [
                    addOsc('sawtooth', frequency, 0.8),
                    addOsc('sawtooth', frequency * 0.995, 1)
                ];
                releaseTime = 1.0;
                break;
            case 'pad':
                oscillators = [
                    addOsc('sawtooth', frequency, 0.7),
                    addOsc('sine', frequency * 0.5, 0.8)
                ];
                releaseTime = 1.2;
                break;
            case 'vibraphone':
                oscillators = [
                    addOsc('sine', frequency, 1),
                    addOsc('sine', frequency * 2, 0.6)
                ];
                releaseTime = 0.9;
                break;
            default:
                oscillators = [addOsc('sine', frequency, 1)];
        }

        // simple attack/decay envelope
        gainNode.gain.linearRampToValueAtTime(baseGain, now + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(baseGain * 0.7, now + 0.2);

        return { oscillators, gain: gainNode, releaseTime };
    }
    createOsc(type, frequency, volume, gainNode, baseGain) {
        const osc = this.audioContext.createOscillator();
        osc.type = type;
        osc.frequency.value = frequency;
        
        const gain = this.audioContext.createGain();
        gain.gain.value = baseGain * volume;
        
        osc.connect(gain);
        gain.connect(gainNode);
        osc.start();
        
        return osc;
    }

    stopNote(keyData, keyElement) {
        const id = `${keyData.key}_${keyData.octave}`;
        const stored = this.activeOscillators.get(id);
        if (!stored) return;
        const transposedFreq = stored.freq;
        // If sustain pedal is down, add to held set
        if (this.sustain) {
            this.sustainedNotes.add(id);
            if (keyElement) keyElement.classList.remove('active');
            return;
        }
        // if sustain had previously held this key and now it's being released normally
        if (this.sustainedNotes.has(id)) {
            this.sustainedNotes.delete(id);
        }
        this.stopSynthesisById(id);
        if (keyElement) keyElement.classList.remove('active');
    }

    updateBlackKeyPositions() {
        const keyboard = document.getElementById('keyboard');
        if (!keyboard) return;
        const octaveContainers = keyboard.querySelectorAll('.octave');
        octaveContainers.forEach(octave => {
            const whiteKeysContainer = octave.querySelector('.white-keys');
            const blackKeysContainer = octave.querySelector('.black-keys');
            if (!whiteKeysContainer || !blackKeysContainer) return;

            const whiteKeys = Array.from(whiteKeysContainer.querySelectorAll('.piano-key.white'));
            if (whiteKeys.length === 0) return;

            const octaveRect = octave.getBoundingClientRect();

            blackKeysContainer.querySelectorAll('.piano-key.black').forEach(blackKey => {
                const pos = parseFloat(blackKey.dataset.position || 0);
                const leftIndex = Math.floor(pos);
                const leftWhite = whiteKeys[leftIndex];
                const rightWhite = whiteKeys[leftIndex + 1];
                if (!leftWhite || !rightWhite) return;

                const leftRect = leftWhite.getBoundingClientRect();
                const rightRect = rightWhite.getBoundingClientRect();
                const centerX = (leftRect.right + rightRect.left) / 2;
                const blackRect = blackKey.getBoundingClientRect();
                const leftPx = centerX - octaveRect.left - (blackRect.width / 2);
                blackKey.style.setProperty('--leftPx', `${leftPx}px`);
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        new ProfessionalWorkstation();
        console.log('ProfessionalWorkstation instantiated');
    } catch (err) {
        console.error('failed to init workstation', err);
        alert('Error initializing piano. See console for details.');
    }
});
