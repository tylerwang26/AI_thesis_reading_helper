import type { PaperHighlight, PaperPanelSession, StoredPaper } from "./types";

const DB_NAME = "thesis-helper";
const STORE = "papers";
const SESSION_STORE = "sessions";
const VERSION = 2;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(SESSION_STORE)) {
        db.createObjectStore(SESSION_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function listLibrary(): Promise<Omit<StoredPaper, "blob">[]> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readonly");
  const req = tx.objectStore(STORE).getAll();
  const rows = await new Promise<StoredPaper[]>((resolve, reject) => {
    req.onsuccess = () => resolve((req.result as StoredPaper[]) || []);
    req.onerror = () => reject(req.error);
  });
  await txDone(tx);
  db.close();
  return rows
    .map((row) => ({
      id: row.id,
      name: row.name,
      addedAt: row.addedAt,
      lastOpened: row.lastOpened,
      pageCount: row.pageCount,
      isSample: row.isSample,
      highlights: row.highlights,
    }))
    .sort((a, b) => b.lastOpened - a.lastOpened);
}

export async function savePaper(paper: StoredPaper) {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put(paper);
  await txDone(tx);
  db.close();
}

export async function getPaper(id: string): Promise<StoredPaper | null> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readonly");
  const req = tx.objectStore(STORE).get(id);
  const row = await new Promise<StoredPaper | undefined>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as StoredPaper | undefined);
    req.onerror = () => reject(req.error);
  });
  await txDone(tx);
  db.close();
  return row ?? null;
}

export async function deletePaper(id: string) {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).delete(id);
  await txDone(tx);
  db.close();
}

export async function updateHighlights(id: string, highlights: PaperHighlight[]) {
  const existing = await getPaper(id);
  if (!existing) return;
  await savePaper({ ...existing, highlights, lastOpened: Date.now() });
}

export async function savePanel(id: string, panel: PaperPanelSession) {
  const db = await openDb();
  const tx = db.transaction(SESSION_STORE, "readwrite");
  tx.objectStore(SESSION_STORE).put({ id, ...panel });
  await txDone(tx);
  db.close();
}

export async function getPanel(id: string): Promise<PaperPanelSession | null> {
  const db = await openDb();
  if (!db.objectStoreNames.contains(SESSION_STORE)) {
    db.close();
    return null;
  }
  const tx = db.transaction(SESSION_STORE, "readonly");
  const req = tx.objectStore(SESSION_STORE).get(id);
  const row = await new Promise<(PaperPanelSession & { id: string }) | undefined>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result as (PaperPanelSession & { id: string }) | undefined);
    req.onerror = () => reject(req.error);
  });
  await txDone(tx);
  db.close();
  if (!row) return null;
  const { id: _id, ...panel } = row;
  return panel;
}
