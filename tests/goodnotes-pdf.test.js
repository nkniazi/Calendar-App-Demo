import { describe, it, expect, beforeAll } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PDF_PATH = path.resolve(__dirname, '..', 'dist', 'etsy', 'GoodNotes-Companion-Planner.pdf');

describe('GoodNotes Companion Planner PDF', () => {
  let doc;
  let pageCount;
  let linkCount = 0;

  beforeAll(async () => {
    if (!fs.existsSync(PDF_PATH)) {
      throw new Error('PDF not found - run npm run build:pdfs first');
    }
    const bytes = fs.readFileSync(PDF_PATH);
    doc = await PDFDocument.load(bytes);
    pageCount = doc.getPageCount();

    for (let i = 0; i < pageCount; i++) {
      const page = doc.getPage(i);
      const annotsRaw = page.node.get(page.node.context.obj('Annots'));
      if (!annotsRaw) continue;
      const annots = page.node.context.lookup(annotsRaw);
      if (!annots || !annots.asArray) continue;
      linkCount += annots.asArray().length;
    }
  });

  it('has at least 20 pages', () => {
    expect(pageCount).toBeGreaterThanOrEqual(20);
  });

  it('has landscape dimensions (1366x1024)', () => {
    const page = doc.getPage(0);
    const { width, height } = page.getSize();
    expect(width).toBe(1366);
    expect(height).toBe(1024);
  });

  it('has link annotations', () => {
    expect(linkCount).toBeGreaterThan(0);
  });

  it('has side tab links on most content pages', () => {
    expect(linkCount).toBeGreaterThan(100);
  });

  it('every link annotation Dest points to a valid page ref', () => {
    const pageRefs = new Set();
    for (let i = 0; i < pageCount; i++) {
      pageRefs.add(doc.getPage(i).ref.toString());
    }

    let invalidCount = 0;
    for (let i = 0; i < pageCount; i++) {
      const page = doc.getPage(i);
      const annotsRaw = page.node.get(page.node.context.obj('Annots'));
      if (!annotsRaw) continue;
      const annots = page.node.context.lookup(annotsRaw);
      if (!annots || !annots.asArray) continue;
      for (const annotRef of annots.asArray()) {
        const annot = page.node.context.lookup(annotRef);
        if (!annot || !annot.get) continue;
        const dest = annot.get(page.node.context.obj('Dest'));
        if (!dest) continue;
        const destLookup = page.node.context.lookup(dest);
        if (!destLookup || !destLookup.asArray) continue;
        const arr = destLookup.asArray();
        if (arr.length > 0) {
          const targetRef = arr[0].toString();
          if (!pageRefs.has(targetRef)) invalidCount++;
        }
      }
    }
    expect(invalidCount).toBe(0);
  });

  it('file size is between 30 KB and 12 MB', () => {
    const size = fs.statSync(PDF_PATH).size;
    const sizeMB = size / 1024 / 1024;
    expect(sizeMB).toBeGreaterThan(0.03);
    expect(sizeMB).toBeLessThan(12);
  });

  it('report summary', () => {
    const size = fs.statSync(PDF_PATH).size;
    console.log(`\n=== GoodNotes PDF Report ===`);
    console.log(`Pages: ${pageCount}`);
    console.log(`Links: ${linkCount}`);
    console.log(`Size: ${(size / 1024).toFixed(1)} KB`);
    console.log(`===========================\n`);
    expect(true).toBe(true);
  });
});
