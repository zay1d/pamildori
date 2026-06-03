# Ambient sound files

Drop looping audio files here. The app references them by the exact filenames
below (see `web/src/ambient.ts` — the `file` field of each entry):

| file            | sound        |
|-----------------|--------------|
| `rain.mp3`      | Rain 🌧       |
| `fireplace.mp3` | Fireplace 🔥 |
| `noise.mp3`     | White noise 🌫 |

## Requirements
- **Seamlessly loopable** clips (they play on `loop`), ~1–3 min is plenty.
- Keep them small (mono, ~96–128 kbps) — they ship to the browser. Aim < 2 MB each.
- **Royalty-free / CC0** only. Good sources: Pixabay, Freesound (CC0 filter),
  Mixkit. Check the license before committing.

## Notes
- A missing file just means that sound won't play (the toggle still appears);
  nothing else breaks.
- To add a new sound: put `<name>.mp3` here and add a row to `web/src/ambient.ts`.
- Vite copies everything in `public/` to the build root, so these end up at
  `/<base>/sounds/<file>` and are served from GitHub Pages.
