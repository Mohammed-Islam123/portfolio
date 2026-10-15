import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import test from "node:test";
import { heroJourneyDetails } from "../src/config/heroJourney.ts";

test("hero includes every new photo with an empty caption", async () => {
  const files = await readdir(new URL("../public/Images/Hero/", import.meta.url));
  assert.deepEqual(heroJourneyDetails.map(({ file }) => file).sort(), files.sort());
  assert.ok(heroJourneyDetails.every(({ caption }) => caption === ""));
});
