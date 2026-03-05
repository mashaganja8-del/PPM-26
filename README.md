# 🎹 Piano Game

A fully interactive web-based piano game built with HTML5, CSS3, and JavaScript using the Web Audio API for real-time audio synthesis.

## Features

A new **volume knob** control has been added for a more realistic piano feel; drag the circular dial to change volume.

- **Interactive Piano Keyboard**: 24 playable notes spanning 2 octaves
- **Keyboard Control**: Press keys A-Z on your computer keyboard to play notes
- **Volume Knob**: Rotate the on-screen knob to adjust master volume (click and drag)
- **Web Audio API**: Real-time synthesis with smooth oscillators
- **Visual Feedback**: Keys highlight when pressed
- **Statistics**: Track the number of keys you've played
- **Responsive Design**: Works on desktop and tablet devices

## How to Play

### Recording
- Click **Record** to begin capturing key presses. The button will show "Recording..." while active.
- Press **Stop** when finished. Use **Play** to replay your performance.


1. **Open the Game**: Open `index.html` in any modern web browser
2. **Play Notes**: Press keyboard keys A through M and other designated keys
3. **Read Labels**: Each piano key shows which keyboard key corresponds to it
4. **Enjoy**: Create music by pressing different keys in sequence

## Keyboard Layout

The game maps your computer keyboard to piano notes:

```
White Keys:  A  S  D  F  G  H  J  K  L  ;  X  C  V  B  N  M
Black Keys:  W  E  T  Y  U  O  P  Z
```

Notes range from C4 to E6 across two octaves.

## Project Structure

```
Game Piano/
├── index.html           # Main HTML file
├── css/
│   └── styles.css      # Game styling and layout
├── js/
│   └── piano.js        # Game logic and audio synthesis
├── README.md           # This file
└── .github/
    └── copilot-instructions.md  # Workspace instructions
```

## Technical Details

### Audio System - Two Modes

The piano app supports two audio backends:

#### 1. **Audio File Mode** (Recommended) 🎚️
- Plays pre-recorded MP3 piano notes for authentic sound
- Fast, responsive playback
- Professional quality audio
- **Requires**: 24 MP3 files in the `sounds/` folder (one for each note)

**Setup Instructions:**
1. Download or record piano notes for each pitch (C4, C#4, D4, ..., B5)
2. Place all 24 MP3 files in the `sounds/` folder
3. See [sounds/README.md](sounds/README.md) for detailed setup and sources

**Supported Notes:**
```
Octave 1: C4, C#4, D4, D#4, E4, F4, F#4, G4, G#4, A4, A#4, B4
Octave 2: C5, C#5, D5, D#5, E5, F5, F#5, G5, G#5, A5, A#5, B5
```

#### 2. **Web Audio Synthesis Mode** (Fallback) 🔊
- Generates sound mathematically in real-time
- No audio files needed
- Works offline, works anywhere
- Uses selected voice (Grand Piano, Warm Piano, etc.)
- Automatically enabled if MP3 files are missing

### How It Works
1. When you play a note, the app tries to load the MP3 file from `sounds/`
2. If successful, it plays the audio file
3. If the file is missing, it falls back to Web Audio synthesis
4. Transpose works seamlessly with both modes

### Audio File Pre-loading
All audio files are pre-loaded when the app starts (using the "better version" pattern):
```js
const audioFiles = {
    'C4': new Audio('sounds/C4.mp3'),
    'C#4': new Audio('sounds/C#4.mp3'),
    // ... etc
};
```
This ensures fast, click-and-play response when keys are pressed.

### Key Features in Code
- `PianoGame` class handles all game logic
- Dynamic keyboard mapping for easy customization
- Active oscillator tracking to prevent overlapping notes
- Mouse and keyboard event support

## Browser Compatibility

Works on all modern browsers that support Web Audio API:
- Chrome/Chromium (v25+)
- Firefox (v18+)
- Safari (v6+)
- Edge (v79+)
- Opera (v15+)

## Customization

To add or modify notes, edit the `createKeyMapping()` method in `js/piano.js`. Each note object contains:
- `key`: The keyboard key to press
- `note`: The musical note name (e.g. C4, C#4, D4)
- `frequency`: The frequency in Hz
- `black`: Optional flag for black keys (visual styling)

### Audio file naming
Place MP3 samples in `sounds/` using the same note format:
```
C4.mp3  C#4.mp3  D4.mp3  D#4.mp3  E4.mp3
F4.mp3  F#4.mp3  G4.mp3  G#4.mp3  A4.mp3
A#4.mp3 B4.mp3  C5.mp3  ...
```
The loader will only keep files that actually exist, so missing notes are automatically ignored and the synthesizer plays instead.

## Future Enhancements

Potential features to add:
- [x] Note recording and playback (basic start/stop/play)
- [ ] Multiple instrument sounds
- [ ] Scale selector (major, minor, pentatonic, etc.)
- [ ] Visual sheet music display
- [ ] Score/points system
- [ ] MIDI support
- [ ] Sound effects for note press/release

## License

This project is open source and available for educational purposes.

## Author

Created as an interactive music learning tool.

---

**Enjoy playing! 🎵**
