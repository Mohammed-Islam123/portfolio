import assert from "node:assert/strict";
import { readdir, stat } from "node:fs/promises";
import sharp from "sharp";
import test from "node:test";
import { heroJourneyDetails } from "../src/config/heroJourney.ts";

test("hero includes every photo and allows configured captions", async () => {
  const files = (await readdir(new URL("../public/Images/Hero/", import.meta.url))).filter((name) => name.endsWith(".webp"));
  assert.deepEqual(heroJourneyDetails.map(({ file }) => file).sort(), files.sort());
  assert.ok(heroJourneyDetails.every(({ caption }) => typeof caption === "string"));
});

test("every journey photograph has a smaller thumbnail with the original aspect ratio", async () => {
  for (const { file } of heroJourneyDetails) {
    const original = new URL("../public/Images/Hero/" + file, import.meta.url);
    const thumbnail = new URL("../public/Images/Hero/thumbnails/" + file, import.meta.url);
    const before = await sharp(original.pathname).metadata();
    const after = await sharp(thumbnail.pathname).metadata();
    assert.ok(after.width <= 512 && after.height > 0, file);
    assert.ok(Math.abs(before.width / before.height - after.width / after.height) < 0.01, file);
    assert.ok((await stat(thumbnail)).size < (await stat(original)).size, file);
  }
});
