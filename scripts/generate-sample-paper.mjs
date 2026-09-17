import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, PDFHexString, PDFName, StandardFonts, rgb } from "pdf-lib";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_X = 72;
const MARGIN_TOP = 64;
const MARGIN_BOTTOM = 64;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

const ink = rgb(0.12, 0.1, 0.18);
const muted = rgb(0.32, 0.3, 0.38);
const rule = rgb(0.55, 0.45, 0.78);
const boxFill = rgb(0.96, 0.94, 1);
const boxStroke = rgb(0.42, 0.28, 0.72);
const accent = rgb(0.45, 0.27, 0.78);

function wrap(font, text, size, width) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= width) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function main() {
  const doc = await PDFDocument.create();
  const times = await doc.embedFont(StandardFonts.TimesRoman);
  const timesBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const timesItalic = await doc.embedFont(StandardFonts.TimesRomanItalic);
  const courier = await doc.embedFont(StandardFonts.Courier);

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN_TOP;
  let pageNumber = 1;

  const ensure = (need) => {
    if (y - need < MARGIN_BOTTOM) {
      drawFooter();
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      pageNumber += 1;
      y = PAGE_HEIGHT - MARGIN_TOP;
    }
  };

  const drawFooter = () => {
    page.drawLine({
      start: { x: MARGIN_X, y: 44 },
      end: { x: PAGE_WIDTH - MARGIN_X, y: 44 },
      thickness: 0.4,
      color: rgb(0.75, 0.75, 0.8),
    });
    const label = `Chen, Rivera, and Okonkwo — Contextual Memory Attention    ${pageNumber}`;
    page.drawText(label, {
      x: MARGIN_X,
      y: 30,
      size: 8,
      font: timesItalic,
      color: muted,
    });
  };

  const addCentered = (text, font, size, gap = 14, color = ink) => {
    ensure(size + gap);
    const w = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: (PAGE_WIDTH - w) / 2,
      y: y - size,
      size,
      font,
      color,
    });
    y -= size + gap;
  };

  const addParagraph = (text, { font = times, size = 11, leading = 15, indent = 18, gap = 10 } = {}) => {
    const lines = wrap(font, text, size, CONTENT_WIDTH - indent);
    ensure(lines.length * leading + gap);
    lines.forEach((line, i) => {
      page.drawText(line, {
        x: MARGIN_X + (i === 0 ? indent : 0),
        y: y - size,
        size,
        font,
        color: ink,
      });
      y -= leading;
    });
    y -= gap;
  };

  const bookmarks = [];

  const addHeading = (text, level = 1) => {
    const size = level === 1 ? 13 : 12;
    const font = timesBold;
    ensure(size + 20);
    y -= 8;
    bookmarks.push({ title: text, level, pageIndex: pageNumber - 1, y: y + 6 });
    page.drawText(text, { x: MARGIN_X, y: y - size, size, font, color: ink });
    y -= size + 10;
  };

  const addBullet = (text) => {
    const lines = wrap(times, text, 11, CONTENT_WIDTH - 18);
    ensure(lines.length * 15 + 4);
    page.drawText("•", { x: MARGIN_X, y: y - 11, size: 11, font: times, color: accent });
    lines.forEach((line) => {
      page.drawText(line, { x: MARGIN_X + 16, y: y - 11, size: 11, font: times, color: ink });
      y -= 15;
    });
    y -= 2;
  };

  addCentered("Contextual Memory Attention for Long Scientific Documents", timesBold, 16, 12);
  addCentered("A. Chen, M. Rivera, and J. Okonkwo", times, 12, 8);
  addCentered("Institute for Document Intelligence", timesItalic, 11, 6, muted);
  addCentered("Correspondence: a.chen@example.edu", times, 10, 16, muted);

  addHeading("Abstract");
  addParagraph(
    "Keeping up with the rapid growth of scientific literature is difficult when papers mix dense prose, equations, tables, and figures. We propose Contextual Memory Attention (CMA), an encoder–decoder reader architecture that stores a compact memory of earlier sections and retrieves it while interpreting later pages. CMA is designed for long documents: it preserves local fidelity for formulas while maintaining a global summary of claims, methods, and results. On a suite of paper-understanding tasks—claim identification, equation explanation, and cross-section question answering—CMA improves over a strong Transformer baseline by 12.4% exact-match and 9.1% ROUGE-L. We release a small annotated sample and describe how an interactive reading interface can surface these signals as highlights, translations, and citations without leaving the page.",
  );

  addHeading("1  Introduction");
  addParagraph(
    "In recent years, the academic world has been reshaped by generative models, yet the unit of scientific communication remains the PDF. Researchers still scroll, highlight, and copy fragments into a separate chat window. That context switch is costly: a selected equation loses the paragraph that defines its symbols, and a citation marker loses the bibliographic record a few pages later.",
  );
  addParagraph(
    "This paper introduces a reading-centric attention mechanism and, equally important, a user-facing loop around it. Our main contribution is a retrieval-based memory bank that is updated after every section and queried by later tokens. We argue that paper reading is not generic long-context modeling. It is a structured activity with recurring moves: check a reference, reread a figure caption, translate a dense methods sentence, and ask whether a result actually supports the abstract’s claim.",
  );
  addParagraph(
    "We make three claims. First, section-level memory is more sample-efficient than unrestricted full-document attention for scientific PDFs. Second, key-point highlighting can be treated as a span tagging problem conditioned on the abstract and the contribution paragraph. Third, an interface that keeps translation, explanation, and citation beside the page reduces the copy-and-paste loop that currently dominates AI-assisted reading.",
  );

  addHeading("2  Related Work");
  addParagraph(
    "Transformer architectures popularized stacked self-attention for both the encoder and the decoder [1]. Follow-on work on efficient attention, including kernelized and memory-compressed variants [2, 3], targets sequence length rather than the rhetorical structure of a paper. Document QA systems often retrieve passages from a corpus [4], whereas a reader already has the document open and instead needs alignment: which sentence on this page is the operational definition of a symbol introduced on page two?",
  );
  addParagraph(
    "Interactive PDF tools have added comments and colored highlights, but they rarely couple those marks to a model that can explain a figure or a table in context. We position CMA as a model plus a reading loop: the model proposes spans, and the interface lets a person accept, reject, or continue in chat.",
  );

  addHeading("3  Method");
  addHeading("3.1  Encoder and Memory Bank", 2);
  addParagraph(
    "Let a paper be a sequence of sections S = (s1, …, sN). Each section is encoded independently by a Transformer encoder with hidden size d = 768. After encoding si we write a memory slot mi = Pool(si), where Pool is a learned attention pool over tokens. The memory bank M_i = (m1, …, mi) is therefore causal: later sections may read earlier ones, but not the reverse. This matches how a human reads a paper for the first time.",
  );
  addParagraph(
    "Decoder blocks attend to the current section and to M_i through a gated sum. Informally, local attention protects formulas and table cells, while memory attention restores the research question when the prose becomes local and procedural.",
  );

  ensure(70);
  const eq = "CMA(Q, K, V, M) = softmax( QK^T / sqrt(d) + g(Q, M) ) V";
  const eqWidth = courier.widthOfTextAtSize(eq, 10);
  page.drawRectangle({
    x: MARGIN_X,
    y: y - 36,
    width: CONTENT_WIDTH,
    height: 40,
    color: boxFill,
    borderColor: boxStroke,
    borderWidth: 0.8,
  });
  page.drawText(eq, {
    x: MARGIN_X + Math.max(8, (CONTENT_WIDTH - eqWidth) / 2),
    y: y - 24,
    size: 10,
    font: courier,
    color: ink,
  });
  y -= 52;
  addParagraph(
    "Equation (1): gated memory attention. The gate g(Q, M) is a bilinear score between the current query and each memory slot, passed through a sigmoid and added to the scaled dot-product logits. When a token is a citation marker or a figure reference, the gate tends to open; when the token is a local operator inside a formula, the gate stays near zero.",
    { indent: 0, font: timesItalic, size: 10, leading: 13, gap: 12 },
  );

  addHeading("3.2  Key-point tagging", 2);
  addParagraph(
    "Auto-highlighting is implemented as span classification over sentences. We label three categories that matter to first-pass reading: Innovation (what is new), Method (how it is done), and Result (what was measured). Training uses distant supervision from contribution bullets and from sentences that the abstract entails. At inference time the model returns short verbatim quotes so a viewer can underline the same glyphs on the page.",
  );

  addHeading("4  Interactive reading loop");
  addParagraph(
    "The accompanying interface keeps a PDF in the center, a library and file controls on the left, and a contextual AI panel on the right. A selection on the page—text, or a dragged region over a figure—can trigger Explain or Translate without leaving the reader. Chat may continue from an explanation so a follow-up question retains the selected span. Citation lookup parses in-text markers such as [1] against the References section, so bibliographic details appear beside the paragraph that cited them.",
  );
  addParagraph(
    "Translation is paragraph-aligned: each visible block is translated independently, then shown in the side panel in reading order. This is slower than whole-page machine translation, but it preserves the mapping a skimming reader needs. Manual markup (highlights and margin notes) is stored with the local library entry so a paper can be reopened with the same marks.",
  );

  // Figure
  addHeading("Figure 1.  CMA reader architecture.", 2);
  ensure(210);
  const figY = y - 190;
  page.drawRectangle({
    x: MARGIN_X,
    y: figY,
    width: CONTENT_WIDTH,
    height: 190,
    color: rgb(0.99, 0.98, 1),
    borderColor: boxStroke,
    borderWidth: 1,
  });

  const boxes = [
    { label: "PDF tokens", x: 90, y: figY + 140, w: 88, color: rgb(0.85, 0.9, 1) },
    { label: "Section encoder", x: 210, y: figY + 140, w: 100, color: rgb(0.88, 0.82, 1) },
    { label: "Memory bank M", x: 350, y: figY + 140, w: 110, color: rgb(1, 0.9, 0.78) },
    { label: "CMA block", x: 210, y: figY + 78, w: 100, color: rgb(0.78, 0.93, 0.84) },
    { label: "Explain / Translate", x: 90, y: figY + 20, w: 120, color: rgb(1, 0.86, 0.9) },
    { label: "Highlights", x: 230, y: figY + 20, w: 90, color: rgb(1, 0.94, 0.72) },
    { label: "Citation card", x: 340, y: figY + 20, w: 100, color: rgb(0.86, 0.92, 1) },
  ];
  for (const b of boxes) {
    page.drawRectangle({
      x: b.x,
      y: b.y,
      width: b.w,
      height: 28,
      color: b.color,
      borderColor: boxStroke,
      borderWidth: 0.7,
    });
    const lw = timesBold.widthOfTextAtSize(b.label, 8);
    page.drawText(b.label, {
      x: b.x + (b.w - lw) / 2,
      y: b.y + 10,
      size: 8,
      font: timesBold,
      color: ink,
    });
  }
  const arrow = (x1, y1, x2, y2) => {
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 1, color: rule });
  };
  arrow(178, 154 + figY, 210, 154 + figY);
  arrow(310, 154 + figY, 350, 154 + figY);
  arrow(260, 140 + figY, 260, 106 + figY);
  arrow(400, 140 + figY, 260, 106 + figY);
  arrow(260, 78 + figY, 150, 48 + figY);
  arrow(260, 78 + figY, 275, 48 + figY);
  arrow(260, 78 + figY, 390, 48 + figY);
  y = figY - 14;
  addParagraph(
    "Figure 1: The encoder writes section memories; CMA reads them while decoding. Downstream heads emit explanations, translations, highlight spans, and citation cards for the side panel. Inputs flow left to right; outputs fan out along the bottom row.",
    { indent: 0, font: timesItalic, size: 10, leading: 13, gap: 12 },
  );

  addHeading("5  Experiments");
  addParagraph(
    "We evaluate on 1,200 research PDFs split across machine learning, biology, and economics. Tasks include (i) three-line summary quality judged by expert raters, (ii) equation explanation faithfulness, and (iii) citation linking from in-text markers to reference strings. The baseline is a 350M encoder–decoder Transformer with full attention truncated at 8,192 tokens. CMA uses the same backbone plus a 64-slot memory.",
  );
  addParagraph(
    "Results show a 12.4% improvement in exact-match on citation linking and a 9.1% gain in ROUGE-L on section summaries. Human raters preferred CMA explanations of figures in 68% of pairwise comparisons, citing fewer hallucinated axis labels. Ablating the gate g(Q, M) drops equation faithfulness by 7 points, which supports the claim that local attention should remain protected.",
  );

  addBullet("Innovation spans are recovered at 81.3 F1 when the abstract is provided as extra context.");
  addBullet("Method spans are noisier (74.0 F1) because procedural language repeats across related work.");
  addBullet("Result spans reach 86.2 F1, largely because numeric claims are distinctive on the page.");
  y -= 6;

  addHeading("6  Discussion and limitations");
  addParagraph(
    "CMA is not a substitute for reading. It is a way to keep assistance aligned with the glyphs a person is looking at. Two limitations remain. First, scanned PDFs without a text layer force the system to rely on region capture and a vision encoder; we support that path, but quality depends on the upstream OCR. Second, bibliographic parsing still fails on unusual citation styles. We therefore always show the raw reference string alongside any structured fields.",
  );
  addParagraph(
    "Privacy follows from the interface design: papers can live in a browser library, and only the context needed for a request is sent to a model endpoint the operator configures. If no API key is present, reading, manual markup, and local library save/reopen still work; model-backed actions surface a clear empty state instead of a silent failure.",
  );

  addHeading("7  Conclusion");
  addParagraph(
    "We presented Contextual Memory Attention and a reading interface that treats explanation, translation, chat, summary, citation, and highlighting as one loop around an open PDF. The architecture is intentionally small: a section memory, a gate, and span heads that quote the page. We hope this sample document is useful both as a methods sketch and as a bundled demo paper for trying those interactions end to end.",
  );

  addHeading("References");
  const refs = [
    "[1] Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., Kaiser, L., and Polosukhin, I. Attention is all you need. In Advances in Neural Information Processing Systems, 2017.",
    "[2] Kitaeva, N., Kaiser, L., and Levskaya, A. Reformer: The efficient Transformer. In International Conference on Learning Representations, 2020.",
    "[3] Choromanski, K., Likhosherstov, V., Dohan, D., Song, X., Gane, A., Sarlos, T., Hawkins, P., Davis, J., Mohiuddin, A., Kaiser, L., Belanger, D., Colwell, L., and Weller, A. Rethinking attention with performers. In International Conference on Learning Representations, 2021.",
    "[4] Karpukhin, V., Oguz, B., Min, S., Lewis, P., Wu, L., Edunov, S., Chen, D., and Yih, W. Dense passage retrieval for open-domain question answering. In Proceedings of EMNLP, 2020.",
    "[5] Beltagy, I., Peters, M. E., and Cohan, A. Longformer: The long-document Transformer. arXiv:2004.05150, 2020.",
  ];
  for (const ref of refs) {
    const lines = wrap(times, ref, 10, CONTENT_WIDTH);
    ensure(lines.length * 13 + 6);
    lines.forEach((line, i) => {
      page.drawText(line, {
        x: MARGIN_X + (i === 0 ? 0 : 18),
        y: y - 10,
        size: 10,
        font: times,
        color: ink,
      });
      y -= 13;
    });
    y -= 4;
  }

  drawFooter();
  writeOutline(doc, bookmarks);

  const bytes = await doc.save();
  const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "sample-paper.pdf");
  writeFileSync(out, bytes);
  console.log(`Wrote ${out} (${bytes.length} bytes, ${doc.getPageCount()} pages)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

function nestBookmarks(bookmarks) {
  const root = [];
  const stack = [];
  for (const item of bookmarks) {
    const node = { ...item, children: [] };
    while (stack.length && stack[stack.length - 1].level >= item.level) stack.pop();
    if (!stack.length) root.push(node);
    else stack[stack.length - 1].node.children.push(node);
    stack.push({ level: item.level, node });
  }
  return root;
}

function descendantCount(node) {
  return node.children.reduce((n, child) => n + 1 + descendantCount(child), 0);
}

function writeOutline(doc, bookmarks) {
  const tree = nestBookmarks(bookmarks);
  if (!tree.length) return;
  const pages = doc.getPages();
  const assignRefs = (nodes) =>
    nodes.map((node) => ({
      ...node,
      ref: doc.context.nextRef(),
      children: assignRefs(node.children),
    }));
  const rooted = assignRefs(tree);
  const outlinesRef = doc.context.nextRef();

  const writeNode = (node, parentRef, prevRef, nextRef) => {
    const kids = node.children;
    const dict = {
      Title: PDFHexString.fromText(node.title),
      Parent: parentRef,
      Dest: [pages[node.pageIndex].ref, "XYZ", null, node.y, null],
    };
    if (prevRef) dict.Prev = prevRef;
    if (nextRef) dict.Next = nextRef;
    if (kids.length) {
      dict.First = kids[0].ref;
      dict.Last = kids[kids.length - 1].ref;
      dict.Count = descendantCount(node);
    }
    doc.context.assign(node.ref, doc.context.obj(dict));
    kids.forEach((child, i) => {
      writeNode(
        child,
        node.ref,
        i > 0 ? kids[i - 1].ref : undefined,
        i < kids.length - 1 ? kids[i + 1].ref : undefined,
      );
    });
  };

  rooted.forEach((node, i) => {
    writeNode(
      node,
      outlinesRef,
      i > 0 ? rooted[i - 1].ref : undefined,
      i < rooted.length - 1 ? rooted[i + 1].ref : undefined,
    );
  });

  const total = rooted.reduce((n, node) => n + 1 + descendantCount(node), 0);
  doc.context.assign(
    outlinesRef,
    doc.context.obj({
      Type: "Outlines",
      First: rooted[0].ref,
      Last: rooted[rooted.length - 1].ref,
      Count: total,
    }),
  );
  doc.catalog.set(PDFName.of("Outlines"), outlinesRef);
  doc.catalog.set(PDFName.of("PageMode"), PDFName.of("UseOutlines"));
}
