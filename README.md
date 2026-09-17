# Thesis Helper — AI Thesis Reading Helper

Open a research PDF and get AI help in the same window: translation, explanation, chat, summary, citations, auto-highlights, and markup. Papers stay in the browser until you choose to send selected text (or a figure crop) to a model you configure.

This is an independent product. It is not affiliated with any commercial paper reader.

## Features

- **PDF reader** with zoom, page indicator, download, and fullscreen
- **Select → Explain / Translate** from a floating control
- **Explain image** by dragging a region over a figure, table, or equation
- **AI chat** about the open paper, including continue-from-explanation
- **Summary** (3-line or longer key points)
- **Citation** cards for the paper and `[n]` references
- **Auto highlight** of innovation / method / result spans
- **Manual highlights and margin notes**
- **Library** saved in IndexedDB (reopen in this browser)

Without an API key, PDFs, markup, and the library still work. AI actions show a clear empty/error state.

## Quick start

Requires Node.js 20+.

```bash
npm install
cp .env.example .env.local
# optional: put your key in .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Click **Get started free** or go to `/reader?sample=1` for the bundled sample paper.

Or upload any PDF from the left **Open** control (or drag a file onto the reader).

## Environment variables

Copy `.env.example` to `.env.local`. Secrets never belong in the repo.

| Variable | Required | Description |
| --- | --- | --- |
| `OPENAI_API_KEY` | for AI | API key for an OpenAI-compatible Chat Completions endpoint |
| `OPENAI_BASE_URL` | no | Default `https://api.openai.com/v1` |
| `OPENAI_MODEL` | no | Default `gpt-4o-mini`. Vision-capable models work better for **Explain image** |
| `MODEL` | no | Alias for `OPENAI_MODEL` |

Keys are read only on the server (`app/api/ai`). The browser never sees them.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Copy the PDF.js worker, then start Next.js on port 3000 |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run sample-pdf` | Regenerate `public/sample-paper.pdf` |
| `npm run lint` | ESLint |

## Sample paper

`public/sample-paper.pdf` is a short original methods sketch used as the demo document. It includes an abstract, equation, architecture figure, results, and a numbered reference list so explain / highlight / citation have something to attach to.

## Stack

Next.js (App Router) + TypeScript + Tailwind CSS + react-pdf (PDF.js) + OpenAI-compatible Chat Completions.

## Privacy

PDF bytes are stored locally (memory + IndexedDB library). Model requests send paper text excerpts, a selection, and optionally a cropped image of a page region.
