import { existsSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";

// Ticket #12 acceptance criterion "zero audio asset files in the build": the
// soundscape is synthesized entirely at runtime with the Web Audio API, so
// neither the source tree nor public/ (which Vite copies verbatim into the
// build) may contain audio files. Integrity seam (ADR-0004): a dataset-level
// guard like the catalog tests — it pins a deliverable constraint, not an
// implementation detail. The synthesis internals themselves are out of test
// scope.

const AUDIO_EXTENSIONS = new Set([
  ".aac",
  ".aif",
  ".aiff",
  ".flac",
  ".m4a",
  ".mp3",
  ".ogg",
  ".opus",
  ".wav",
  ".wma"
]);

function collectFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectFiles(full, out);
    else out.push(full);
  }
  return out;
}

describe("soundscape ships no audio assets (ticket #12)", () => {
  it("the source tree and public dir contain no audio files", () => {
    const root = process.cwd();
    const roots = ["src", "public"].filter((dir) => existsSync(join(root, dir)));
    const audioFiles = roots
      .flatMap((dir) => collectFiles(join(root, dir)))
      .filter((file) => AUDIO_EXTENSIONS.has(extname(file).toLowerCase()));
    expect(audioFiles).toEqual([]);
  });
});
