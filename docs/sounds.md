# Sounds

The site's sounds (`DESIGN.md` section 12): which file makes each one, where
it came from and under what licence, and how to replace one. A sound without
a clear licence doesn't go in.

## The files

Each moment has one source file in `sounds/`, named after it. `pnpm sounds`
builds them into what the site plays:

| Moment                                             | File in `sounds/` | Plays as                              |
| -------------------------------------------------- | ----------------- | ------------------------------------- |
| Send a question                                    | `send`            | a slice of the sprite                 |
| Press a suggested question                         | `suggestion`      | a slice of the sprite                 |
| An answer types itself out                         | `typing`          | its own file, looping, while it types |
| An answer ends (its last word)                     | `answer-end`      | a slice of the sprite                 |
| Open the sources under an answer                   | `sources`         | a slice of the sprite                 |
| Tap the cow, or end the entrance with a tap or key | `moo`             | a slice of the sprite                 |
| A contact message is sent                          | `moo`             | a slice of the sprite                 |
| Theme toggle                                       | `theme`           | a slice of the sprite                 |
| Language toggle                                    | `language`        | a slice of the sprite                 |
| Open the gear's panel                              | `panel-open`      | a slice of the sprite                 |
| Close the gear's panel                             | `panel-close`     | a slice of the sprite                 |
| Release a slider in the gear's panel               | `slider`          | a slice of the sprite                 |
| Download the CV                                    | `cv`              | a slice of the sprite                 |
| Heavy rain (7 or more)                             | `rain`            | its own file, looping, while it lasts |

The file's extension can be `.wav`, `.flac`, `.ogg`, `.mp3` or `.aiff`. A
moment with no file stays silent, so the site works with any of them missing.

## Sources and licences

Every sound is CC0 (public domain), so none needs attribution; each is
credited here anyway. Kenney's licence is the pack's `License.txt`; each
Freesound licence is the one on the sound's page.

| File in `sounds/` | Source                                                                                          | Author           | Licence |
| ----------------- | ----------------------------------------------------------------------------------------------- | ---------------- | ------- |
| `send.ogg`        | `drop_002.ogg`, [Interface Sounds](https://kenney.nl/assets/interface-sounds)                   | Kenney           | CC0 1.0 |
| `suggestion.ogg`  | `select_001.ogg`, [Interface Sounds](https://kenney.nl/assets/interface-sounds)                 | Kenney           | CC0 1.0 |
| `answer-end.ogg`  | `glass_001.ogg`, [Interface Sounds](https://kenney.nl/assets/interface-sounds)                  | Kenney           | CC0 1.0 |
| `sources.ogg`     | `click_004.ogg`, [Interface Sounds](https://kenney.nl/assets/interface-sounds)                  | Kenney           | CC0 1.0 |
| `theme.ogg`       | `switch_002.ogg`, [Interface Sounds](https://kenney.nl/assets/interface-sounds)                 | Kenney           | CC0 1.0 |
| `language.ogg`    | `tick_002.ogg`, [Interface Sounds](https://kenney.nl/assets/interface-sounds)                   | Kenney           | CC0 1.0 |
| `panel-open.ogg`  | `tick_004.ogg`, [Interface Sounds](https://kenney.nl/assets/interface-sounds)                   | Kenney           | CC0 1.0 |
| `panel-close.ogg` | `tick_001.ogg`, [Interface Sounds](https://kenney.nl/assets/interface-sounds)                   | Kenney           | CC0 1.0 |
| `slider.ogg`      | `click_001.ogg`, [Interface Sounds](https://kenney.nl/assets/interface-sounds)                  | Kenney           | CC0 1.0 |
| `moo.wav`         | [moo](https://freesound.org/people/Bird_man/sounds/275154/), Freesound 275154                   | Bird_man         | CC0 1.0 |
| `rain.ogg`        | [rain001](https://freesound.org/people/lennyboy/sounds/244028/), Freesound 244028               | lennyboy         | CC0 1.0 |
| `cv.wav`          | [page rustle](https://freesound.org/people/Tomoyo%20Ichijouji/sounds/211246/), Freesound 211246 | Tomoyo Ichijouji | CC0 1.0 |
| `typing.mp3`      | [keyboard typing](https://freesound.org/people/Trollarch2/sounds/331656/), Freesound 331656     | Trollarch2       | CC0 1.0 |

## Replacing a sound

1. Put the new file in `sounds/` under the moment's name, replacing the old
   one. A good file is:
   - mono or stereo (it's made mono), at 44.1 or 48 kHz;
   - short: under about 1.5s, with no silence at either end needed, since the
     script trims it. The loops (`rain`, `typing`) are the exception: a few
     seconds that join up seamlessly, which the script doesn't trim;
   - at any level: the script brings every file to the same peak.
2. Run `pnpm sounds`, then commit `sounds/`, `public/sounds/` and
   `src/lib/sound/sprite.json`. No code changes.
3. If it plays too loud or too soft next to the others, change its volume in
   `src/lib/sound/moments.ts` (`VOLUMES`, from 0 to 1, with the loudest at
   0.5). That's the only place to trim one by ear.
4. Add or update its row in "Sources and licences" above.

## How `pnpm sounds` builds them

`scripts/sounds/build.ts` needs [ffmpeg](https://ffmpeg.org/) on the machine:
`brew install ffmpeg` on a Mac. Without it, the script stops with
"ffmpeg not found: brew install ffmpeg". It isn't an npm package here: the
packages that bundle ffmpeg are GPL or LGPL, which would need a decision of
its own.

For each file, it:

1. makes it mono at 48 kHz;
2. trims the silence at both ends, or, for a loop, fades it in and out over
   15ms, so its seam dips instead of clicking;
3. brings it to a peak of −1 dBFS.

It normalises by peak, not by EBU R128 loudness (`loudnorm`). R128 measures in
400ms blocks, and most of these sounds are shorter: a 0.08s click and a 0.3s
pop both measure as `-inf LUFS`. The volumes in `moments.ts` set how loud
each plays.

Then it joins the short sounds into one sprite, with 250ms of silence
between slices, so MP3's encoder delay never bleeds one into the next. Each
slice plays 50ms of the silence after it too: some clicks are under 10ms once
trimmed, and a browser that doesn't skip MP3's encoder delay (about 25ms)
would otherwise play only the silence before them. It writes:

- `public/sounds/sprite.webm` (Opus) and `public/sounds/sprite.mp3`, the
  fallback for browsers without WebM;
- `public/sounds/rain.webm`, `typing.webm` and their MP3s, each loop on its
  own, since a looping slice of a sprite clicks at its seams;
- `src/lib/sound/sprite.json`: each slice's start and length, and which
  loops were built.

`pnpm sounds -- --in <dir> --out <dir>` tries files out without touching the
repo.

## How the site plays them

`src/components/sound/Sound.tsx` holds the rules:

- the sprite loads with use-sound once the page is idle, or at the first
  tap, click or key if that comes first, never on the critical path; a sound
  asked for before it has loaded plays if it loads within a second;
- nothing plays before the visitor's first tap, click or key;
- a tap, click or key that ends the entrance moos, unless it's on a control
  marked `data-silent-press`: pressing the mute button never makes a sound;
- no sound plays within 150ms of another, and the moo at most once every 3s
  (`src/lib/sound/gate.ts`);
- the rain loop loads only the first time sound is on, the visitor has
  interacted and the rain is heavy;
- the typing loop loads the first time an answer is on its way with sound on,
  and plays while the answer types itself out; with reduced motion it never
  loads, since nothing types itself out;
- both loops pause while the tab is hidden;
- the `sound` cookie (`on` or `off`, a year) keeps the mute toggle's choice,
  and the server reads it so the toggle's icon renders right.
