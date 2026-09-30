import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  emptyPanel,
  filePaperId,
  hasPanelRecords,
  normalizePanel,
  slimPanel,
} from "./panel-session.ts";

describe("panel session", () => {
  it("starts empty", () => {
    const panel = emptyPanel();
    assert.equal(panel.tab, "explain");
    assert.equal(panel.explain, null);
    assert.deepEqual(panel.translations, []);
    assert.deepEqual(panel.chat, []);
    assert.equal(panel.summary, "");
    assert.equal(hasPanelRecords(panel), false);
  });

  it("restores every right-panel record type", () => {
    const restored = normalizePanel({
      tab: "notes",
      explain: { title: "解釋", body: "**重點**", selection: "attention" },
      translations: [{ source: "Hello", translation: "你好" }],
      targetLanguage: "Japanese",
      summary: "- 點一",
      threeLine: "三行",
      chat: [
        { id: "u1", role: "user", content: "這篇在做什麼？" },
        { id: "a1", role: "assistant", content: "記憶注意力。" },
        { id: "a2", role: "assistant", content: "" },
      ],
      citation: {
        title: "CMA",
        authors: "A. Author",
        references: [],
      },
      lookedUp: { id: "r1", raw: "[1] Example", index: 1 },
      updatedAt: 99,
    });

    assert.equal(restored.tab, "notes");
    assert.equal(restored.explain?.body, "**重點**");
    assert.equal(restored.translations[0]?.translation, "你好");
    assert.equal(restored.targetLanguage, "Japanese");
    assert.equal(restored.summary, "- 點一");
    assert.equal(restored.threeLine, "三行");
    assert.equal(restored.chat.length, 2);
    assert.equal(restored.citation?.title, "CMA");
    assert.equal(restored.lookedUp?.index, 1);
    assert.equal(hasPanelRecords(restored), true);
  });

  it("falls back when stored JSON is incomplete", () => {
    const restored = normalizePanel({ tab: "nope", chat: "bad" });
    assert.equal(restored.tab, "explain");
    assert.deepEqual(restored.chat, []);
    assert.equal(restored.targetLanguage, "Traditional Chinese");
  });

  it("drops explain images when slimming for localStorage", () => {
    const slim = slimPanel({
      ...emptyPanel(),
      explain: { title: "圖", body: "說明", image: "data:image/png;base64,AAA" },
    });
    assert.equal(slim.explain?.body, "說明");
    assert.equal(slim.explain?.image, undefined);
  });

  it("reuses a stable id so the same upload restores the old session", () => {
    const file = { name: "thesis.pdf", size: 12_345, lastModified: 1700000000000 };
    assert.equal(filePaperId(file), filePaperId({ ...file }));
    assert.notEqual(
      filePaperId(file),
      filePaperId({ ...file, lastModified: file.lastModified + 1 }),
    );
  });
});
