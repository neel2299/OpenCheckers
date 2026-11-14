# Sound assets: source and licence

The six original interface cues in this folder come from **Kenney, "Interface Sounds" (v1.0, 2020)**.

- Original: https://kenney.nl/assets/interface-sounds
- Mirror used: https://github.com/Calinou/kenney-interface-sounds (`addons/kenney_interface_sounds/`)
- **Licence: Creative Commons Zero (CC0 1.0), public domain.** Free for personal, educational and commercial use. Crediting is not required, but it's appreciated: "Sounds by Kenney (www.kenney.nl)".

The files were converted to 44.1 kHz, 16-bit mono WAV. `capture.wav` is a mix of two source files.

| App cue | File | Kenney source |
|---|---|---|
| Piece selected | `select.wav` | `select_002.wav` |
| Move | `move.wav` | `drop_003.wav` |
| Capture | `capture.wav` | `drop_002.wav` + `drop_003.wav` delayed 70 ms, mixed at 0.75 gain |
| Promotion (crowning) | `promotion.wav` | `confirmation_001.wav` |
| Game start | `start.wav` | `maximize_006.wav` |
| Game finish | `finish.wav` | `confirmation_004.wav` |

## Victory bell (CC0-1.0)

`victory.wav` is an original, three-strike synthesized bell for Draughts Club.
The sound and its synthesis code in `scripts/generate-victory.mjs` are dedicated
to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).
To the extent possible under law, the authors waive all copyright and related
rights in these two files. Anyone may use, modify, and redistribute them for
any purpose, including commercially, without attribution. No sampled recordings
or third-party sound assets are used. Rebuild with `node scripts/generate-victory.mjs`.

The bell plays on a player's victory or a solved puzzle. Other game endings use
the quieter finish cue. Both respect sound, volume, and app activity settings.

To rebuild the files, run `npm run sounds:download`. It needs network access and `ffmpeg`, and it stops if the upstream licence is no longer CC0.

> The original synthesised set can still be regenerated with `node scripts/generate-sounds.mjs`. It is entirely original code, so it carries no third-party rights.
>
> **Do not** use the Lichess `public/sound/standard` files. Lichess's `COPYING.md` lists them under "Exceptions (non-free)".
