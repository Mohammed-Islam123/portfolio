import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import test from "node:test";
import { technologies } from "../src/config/technologies.ts";
import { toolGroups } from "../src/config/toolkit.ts";
import { projects } from "../src/config/projects.ts";

test("toolkit covers the requested sections without repeating technologies", () => {
  const groups = toolGroups.map((group) => group.id);
  for (const required of ["backend", "frontend", "databases", "apis", "devops", "mobile", "robotics-iot", "ai-tools"]) {
    assert.ok(groups.includes(required), `Missing section: ${required}`);
  }
  assert.equal(new Set(groups).size, groups.length);
  assert.ok(!groups.includes("ai-development"));
  assert.ok(!groups.includes("developer-tools"));
  assert.ok(["git", "github", "linux", "bash"].every((id) => toolGroups.find((group) => group.id === "devops").tools.includes(id)));
  const tools = toolGroups.flatMap((group) => group.tools);
  assert.equal(new Set(tools).size, tools.length);
  for (const id of [...tools, ...projects.flatMap((project) => project.tech)]) {
    assert.ok(Object.hasOwn(technologies, id), `Unknown technology: ${id}`);
  }
});

test("every selected logo has a source and every local asset exists", async () => {
  for (const [id, { icon }] of Object.entries(technologies)) {
    if (!icon) continue;
    assert.equal(new URL(icon.source).protocol, "https:", `Missing logo source: ${id}`);
    if ("src" in icon) {
      for (const src of [icon.src, icon.lightSrc].filter(Boolean)) {
        assert.ok(src.startsWith("/icons/tech/"));
        await access(new URL(`../public${src}`, import.meta.url));
      }
    } else {
      assert.ok(icon.path.length > 0, `Empty logo: ${id}`);
    }
  }
});
