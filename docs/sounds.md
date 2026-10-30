# Sounds

The site's sounds (`DESIGN.md` section 12): which file makes each one, where
it came from and under what licence, and how to replace one. A sound without
a clear licence doesn't go in.

## The files

Each moment has one source file in `sounds/`, named after it. `pnpm sounds`
builds them into what the site plays:

| Moment                               | File in `sounds/` | Plays as                              |
| ------------------------------------ | ----------------- | ------------------------------------- |
| Send a question                      | `send`            | a slice of the sprite                 |
| An answer starts (its first word)    | `answer-start`    | a slice of the sprite                 |
| An answer ends (its last word)       | `answer-end`      | a slice of the sprite                 |
| Tap the cow                          | `moo`             | a slice of the sprite                 |
| Theme toggle                         | `theme`           | a slice of the sprite                 |
| Language toggle                      | `language`        | a slice of the sprite                 |
| Release a slider in the gear's panel | `slider`          | a slice of the sprite                 |
| Download the CV                      | `cv`              | a slice of the sprite                 |
| Heavy rain (7 or more)               | `rain`            | its own file, looping, while it lasts |

The file's extension can be `.wav`, `.flac`, `.ogg`, `.mp3` or `.aiff`. A
moment with no file stays silent, so the site works with any of them missing.

## Sources and licences

| File | Source page | Author | Licence |
| ---- | ----------- | ------ | ------- |

No sound is in yet.

## Replacing a sound

1. Put the new file in `sounds/` under the moment's name, replacing the old
   one. A good file is:
   - mono or stereo (it's made mono), at 44.1 or 48 kHz;
   - short: under about 1.5s, with no silence at either end needed, since the
     script trims it. The rain is the exception: a loop of a few seconds that
     joins up seamlessly, which the script doesn't trim;
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
2. trims the silence at both ends, except for the rain loop;
3. brings it to a peak of −1 dBFS.

It normalises by peak, not by EBU R128 loudness (`loudnorm`). R128 measures in
400ms blocks, and most of these sounds are shorter: a 0.08s click and a 0.3s
pop both measure as `-inf LUFS`. The volumes in `moments.ts` set how loud
each plays.

Then it joins every moment but the rain into one sprite, with 250ms of
silence between slices, so MP3's encoder delay never bleeds one into the
next. It writes:

- `public/sounds/sprite.webm` (Opus) and `public/sounds/sprite.mp3`, the
  fallback for browsers without WebM;
- `public/sounds/rain.webm` and `rain.mp3`, the rain loop on its own, since a
  looping slice of a sprite clicks at its seams;
- `src/lib/sound/sprite.json`: each slice's start and length, and whether
  the rain loop was built.

`pnpm sounds -- --in <dir> --out <dir>` tries files out without touching the
repo.

## How the site plays them

`src/components/sound/Sound.tsx` holds the rules:

- the sprite loads with use-sound once the page is idle, never on the
  critical path;
- nothing plays before the visitor's first tap, click or key;
- no sound plays within 150ms of another, and the moo at most once every 3s
  (`src/lib/sound/gate.ts`);
- the rain loop loads only the first time sound is on, the visitor has
  interacted and the rain is heavy, and it stops while the tab is hidden;
- the `sound` cookie (`on` or `off`, a year) keeps the mute toggle's choice,
  and the server reads it so the toggle's icon renders right.
