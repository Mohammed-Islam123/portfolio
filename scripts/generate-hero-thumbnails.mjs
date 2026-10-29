// Run after changing hero originals; public images bypass Astro transforms.
import assert from "node:assert/strict";
import { mkdir, readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const originals = new URL("../public/Images/Hero/", import.meta.url);
const thumbnails = new URL("thumbnails/", originals);
await mkdir(thumbnails, { recursive: true });
const files = (await readdir(originals)).filter((name) => name.endsWith(".webp")).sort();
assert.ok(files.length > 0, "No hero photographs found");
let before = 0;
let after = 0;
for (const name of files) {
  const input = fileURLToPath(new URL(name, originals));
  const output = fileURLToPath(new URL(name, thumbnails));
  const info = await sharp(input).resize({ width: 512, withoutEnlargement: true })
    .webp({ quality: 80 }).toFile(output);
  const originalBytes = (await stat(input)).size;
  assert.ok(info.width <= 512 && info.size < originalBytes, name);
  before += originalBytes;
  after += info.size;
  console.log(name + ": " + originalBytes + " → " + info.size + " bytes");
}
console.log(files.length + " thumbnails: " + before + " → " + after + " bytes");
