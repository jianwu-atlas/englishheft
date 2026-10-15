// Extract source sentences for a set of section numbers (as strings) into a work file.
// Usage: node _extract_work.js <out.json> <sec1> <sec2> ...
const fs = require("fs");
const path = require("path");
global.window = globalThis;
let src = fs.readFileSync(path.join(__dirname, "../assets/js/data/english.js"), "utf8");
src = src.replace(/(const|window)\s+([A-Z][A-Z_0-9]*)/g, "globalThis.$2");
(0, eval)(src);

const [, , outFile, ...targets] = process.argv;
const out = [];
ENGLISH.sections.forEach((sec) => {
  if (!targets.includes(sec.no)) return;
  (sec.parts || []).forEach((part) => {
    (part.scenes || []).forEach((scene) => {
      (scene.sentences || []).forEach((s, idx) => {
        out.push({ key: scene.no + ":" + idx, en: s.en, zh: s.zh || "" });
      });
    });
  });
});
fs.writeFileSync(path.join(__dirname, "../", outFile), JSON.stringify(out, null, 1));
const bysec = {};
out.forEach((o) => { const s = o.key.split(".")[0]; bysec[s] = (bysec[s] || 0) + 1; });
console.log("extracted:", out.length, JSON.stringify(bysec), "->", outFile);
