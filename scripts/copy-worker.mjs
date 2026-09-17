import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const workerSrc = require.resolve("pdfjs-dist/build/pdf.worker.min.mjs");
const dest = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "pdf.worker.min.mjs");
mkdirSync(dirname(dest), { recursive: true });
copyFileSync(workerSrc, dest);
console.log(`Copied PDF.js worker to ${dest}`);
