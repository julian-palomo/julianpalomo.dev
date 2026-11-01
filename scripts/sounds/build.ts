/**
 * `pnpm sounds`: builds the site's audio from one source file per moment in
 * sounds/ (docs/sounds.md). The short sounds go into one sprite,
 * public/sounds/sprite.webm (Opus) and sprite.mp3, with each slice's place
 * written to src/lib/sound/sprite.json; each loop (the rain, the typing)
 * becomes its own public/sounds/<loop>.webm and .mp3. Rerun it after
 * replacing a file, and commit what it writes. It needs ffmpeg, which isn't an npm package here:
 * the ones that bundle it are GPL or LGPL.
 *
 * Every file is mono 48 kHz, trimmed of silence at both ends and brought to
 * the same peak. A loop isn't trimmed, so it still loops; it fades in and out
 * over 15ms instead, so its seam dips rather than clicks. Peak, not
 * EBU R128 loudness: R128 measures in 400ms blocks, longer than most of these
 * clicks, so it can't measure them. src/lib/sound/moments.ts's volumes set
 * how loud each one plays.
 *
 * `--in <dir>` and `--out <dir>` try files out without touching the repo.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const root = fileURLToPath(new URL("../..", import.meta.url));

// The moments and their files, from the module the site uses. Loaded by URL,
// because Node needs the file's extension, which the site's imports leave out.
const { SPRITE_MOMENTS, LOOPS, SOURCE_FILES } = z
  .object({
    SPRITE_MOMENTS: z.array(z.string()),
    LOOPS: z.array(z.string()),
    SOURCE_FILES: z.record(z.string(), z.string()),
  })
  .parse(await import(new URL("../../src/lib/sound/names.ts", import.meta.url).href));
const fileOf = (moment: string) => {
  const name = SOURCE_FILES[moment];
  if (!name) throw new Error(`No source file named for ${moment}`);
  return name;
};
const arg = (name: string) => {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
};
const sources = arg("--in") ?? join(root, "sounds");
const out = arg("--out") ?? root;
const publicDir = join(out, "public/sounds");
const spriteJson = arg("--out")
  ? join(out, "sprite.json")
  : join(root, "src/lib/sound/sprite.json");

const RATE = 48_000;
// Between slices, so one never bleeds into the next, even through MP3's
// encoder delay (about 25ms).
const GAP_S = 0.25;
// Each slice plays this much of the silence after it. Some clicks are under
// 10ms once trimmed, and a browser that doesn't skip MP3's encoder delay
// would otherwise play the silence before them and nothing else. Keep it
// well under GAP_S.
const SLICE_TAIL_S = 0.05;
// Every file's peak, a little under full scale.
const PEAK_DB = -1;
// A loop's fade at each end, short enough not to hear as a dip.
const LOOP_FADE_S = 0.015;
const EXTENSIONS = [".wav", ".flac", ".ogg", ".mp3", ".aiff", ".aif"];

function run(command: string, args: string[]): string {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.error || result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed:\n${result.stderr || result.error}`);
  }
  return `${result.stdout}${result.stderr}`;
}

if (spawnSync("ffmpeg", ["-version"]).error) {
  console.error("ffmpeg not found: brew install ffmpeg");
  process.exit(1);
}

/** The source file for a moment, whatever its audio extension, or undefined without one. */
async function sourceOf(name: string): Promise<string | undefined> {
  const files = await readdir(sources).catch(() => []);
  const file = files.find((entry) =>
    EXTENSIONS.some((extension) => entry.toLowerCase() === `${name}${extension}`),
  );
  return file && join(sources, file);
}

/** How many dB to add so the file's peak lands at PEAK_DB. */
function peakGain(file: string): number {
  const report = run("ffmpeg", [
    "-hide_banner",
    "-i",
    file,
    "-af",
    "volumedetect",
    "-f",
    "null",
    "-",
  ]);
  const peak = Number(/max_volume: (-?[\d.]+) dB/.exec(report)?.[1]);
  if (Number.isNaN(peak)) throw new Error(`Couldn't read the peak of ${file}`);
  return PEAK_DB - peak;
}

/** The file as mono 48 kHz PCM at the shared peak: trimmed, or faded at both ends if it loops. */
function prepare(file: string, target: string, { loop }: { loop: boolean }): void {
  const silence =
    "silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse";
  const fades = `afade=t=in:d=${LOOP_FADE_S},areverse,afade=t=in:d=${LOOP_FADE_S},areverse`;
  const mono = ["-ac", "1", "-ar", String(RATE)];
  const trimmed = `${target}.trimmed.wav`;
  run("ffmpeg", [
    "-y",
    "-hide_banner",
    "-i",
    file,
    ...mono,
    "-af",
    loop ? fades : silence,
    trimmed,
  ]);
  const gain = peakGain(trimmed);
  run("ffmpeg", ["-y", "-hide_banner", "-i", trimmed, "-af", `volume=${gain}dB`, target]);
}

function duration(file: string): number {
  const seconds = run("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "csv=p=0",
    file,
  ]);
  return Number(seconds.trim());
}

/** WebM (Opus, mono) and MP3 copies of a prepared file. */
function encode(file: string, name: string): void {
  run("ffmpeg", [
    "-y",
    "-hide_banner",
    "-i",
    file,
    "-c:a",
    "libopus",
    "-b:a",
    "48k",
    join(publicDir, `${name}.webm`),
  ]);
  run("ffmpeg", [
    "-y",
    "-hide_banner",
    "-i",
    file,
    "-c:a",
    "libmp3lame",
    "-b:a",
    "64k",
    join(publicDir, `${name}.mp3`),
  ]);
}

const work = await mkdtemp(join(tmpdir(), "sounds-"));
try {
  await mkdir(publicDir, { recursive: true });

  // The sprite: each moment's prepared file, one after another with a gap.
  const slices: Record<string, [number, number]> = {};
  const parts: string[] = [];
  let at = 0;
  for (const moment of SPRITE_MOMENTS) {
    const file = await sourceOf(fileOf(moment));
    if (!file) {
      console.warn(`no sounds/${fileOf(moment)}.*: ${moment} stays silent`);
      continue;
    }
    const prepared = join(work, `${moment}.wav`);
    prepare(file, prepared, { loop: false });
    const length = duration(prepared);
    slices[moment] = [Math.round(at * 1000), Math.round((length + SLICE_TAIL_S) * 1000)];
    parts.push(prepared);
    at += length + GAP_S;
  }

  if (parts.length > 0) {
    const gap = join(work, "gap.wav");
    run("ffmpeg", [
      "-y",
      "-hide_banner",
      "-f",
      "lavfi",
      "-i",
      `anullsrc=r=${RATE}:cl=mono`,
      "-t",
      String(GAP_S),
      gap,
    ]);
    const list = join(work, "list.txt");
    await writeFile(list, parts.flatMap((part) => [`file '${part}'`, `file '${gap}'`]).join("\n"));
    const joined = join(work, "sprite.wav");
    run("ffmpeg", [
      "-y",
      "-hide_banner",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      list,
      "-c",
      "copy",
      joined,
    ]);
    encode(joined, "sprite");
  }

  // Each loop: its own file, untrimmed, so it loops without a seam.
  const loops: string[] = [];
  for (const loop of LOOPS) {
    const source = await sourceOf(fileOf(loop));
    if (!source) {
      console.warn(`no sounds/${fileOf(loop)}.*: the ${loop} loop stays silent`);
      continue;
    }
    const prepared = join(work, `${loop}.wav`);
    prepare(source, prepared, { loop: true });
    encode(prepared, loop);
    loops.push(loop);
  }

  // Laid out as Biome formats it, so `pnpm check` passes on the file as written.
  const lines = Object.entries(slices).map(([moment, [start, length]]) => {
    return `    "${moment}": [${start}, ${length}]`;
  });
  const body = lines.length > 0 ? `{\n${lines.join(",\n")}\n  }` : "{}";
  const built = loops.map((loop) => `"${loop}"`).join(", ");
  await writeFile(spriteJson, `{\n  "slices": ${body},\n  "loops": [${built}]\n}\n`);
  for (const name of ["sprite", ...LOOPS].flatMap((file) => [`${file}.webm`, `${file}.mp3`])) {
    const path = join(publicDir, name);
    if (existsSync(path)) {
      const size = Number(run("wc", ["-c", path]).trim().split(/\s+/)[0]);
      console.log(`${name}: ${Math.round(size / 1024)} KB`);
    }
  }
} finally {
  await rm(work, { recursive: true, force: true });
}
