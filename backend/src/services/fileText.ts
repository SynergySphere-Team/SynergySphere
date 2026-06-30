import { createRequire } from 'node:module';

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const require = createRequire(import.meta.url);

type ExtractTextInput = {
  fileName: string;
  fileType: string;
  base64: string;
};

type PdfItem = {
  page?: number;
  text?: string;
  x?: number;
  y?: number;
};

type PdfReaderCtor = new () => {
  parseBuffer(buffer: Buffer, callback: (err: unknown, item?: PdfItem | null) => void): void;
};

function loadPdfReader(): PdfReaderCtor {
  try {
    return (require('pdfreader') as { PdfReader: PdfReaderCtor }).PdfReader;
  } catch {
    throw new Error('PDF parsing is not installed. Run npm install pdfreader --workspace=backend, or paste the lecture text manually.');
  }
}

function loadUnzipSync(): (data: Uint8Array) => Record<string, Uint8Array> {
  try {
    return (require('fflate') as { unzipSync: (data: Uint8Array) => Record<string, Uint8Array> }).unzipSync;
  } catch {
    throw new Error('Word document parsing is not installed. Run npm install fflate --workspace=backend, or paste the lecture text manually.');
  }
}

export async function extractTextFromUpload(input: ExtractTextInput): Promise<string> {
  const buffer = Buffer.from(input.base64, 'base64');
  if (buffer.byteLength === 0) {
    throw new Error('The uploaded file was empty.');
  }
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw new Error('Files over 8MB are too large for lecture extraction. Paste the key text instead.');
  }

  const fileName = input.fileName.toLowerCase();
  const mime = input.fileType.toLowerCase();

  if (isTextFile(fileName, mime)) {
    return buffer.toString('utf8').trim();
  }

  if (mime === 'application/pdf' || fileName.endsWith('.pdf')) {
    return extractPdfText(buffer);
  }

  if (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileName.endsWith('.docx')
  ) {
    return extractDocxText(buffer);
  }

  if (fileName.endsWith('.ppt') || fileName.endsWith('.pptx')) {
    throw new Error('PowerPoint files are not parsed directly. Export slides to PDF or paste the slide text below.');
  }

  if (fileName.endsWith('.doc')) {
    throw new Error('Legacy .doc files are not supported. Save as .docx or paste the content below.');
  }

  return buffer.toString('utf8').trim();
}

function isTextFile(fileName: string, mime: string): boolean {
  return (
    mime.startsWith('text/') ||
    fileName.endsWith('.txt') ||
    fileName.endsWith('.md') ||
    fileName.endsWith('.csv') ||
    fileName.endsWith('.json')
  );
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const pages = new Map<number, Map<number, Array<{ x: number; text: string }>>>();
  let currentPage = 0;
  const PdfReader = loadPdfReader();

  await new Promise<void>((resolve, reject) => {
    new PdfReader().parseBuffer(buffer, (err, item) => {
      if (err) {
        reject(new Error(String(err)));
        return;
      }

      if (!item) {
        resolve();
        return;
      }

      if (item.page !== undefined) {
        currentPage = item.page;
        if (!pages.has(currentPage)) pages.set(currentPage, new Map<number, Array<{ x: number; text: string }>>());
      }

      if (!item.text || item.y === undefined || item.x === undefined || currentPage === 0) return;

      const page = pages.get(currentPage) || new Map<number, Array<{ x: number; text: string }>>();
      const rowKey = Math.round(item.y * 10);
      const row = page.get(rowKey) || [];
      row.push({ x: item.x, text: item.text });
      page.set(rowKey, row);
      pages.set(currentPage, page);
    });
  });

  const text = [...pages.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, rows]) =>
      [...rows.entries()]
        .sort(([a], [b]) => a - b)
        .map(([, items]) =>
          items
            .sort((a, b) => a.x - b.x)
            .map((item) => item.text)
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim(),
        )
        .filter(Boolean)
        .join('\n'),
    )
    .filter(Boolean)
    .join('\n\n')
    .trim();

  if (!text) {
    throw new Error('No readable text found in this PDF. Try a text-based PDF or paste the content manually.');
  }

  return text;
}

function extractDocxText(buffer: Buffer): string {
  const unzipSync = loadUnzipSync();
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(new Uint8Array(buffer));
  } catch {
    throw new Error('This Word document could not be opened. Save it again as .docx and retry.');
  }

  const xmlFiles = Object.keys(files)
    .filter((name) => /^word\/(document|footnotes|endnotes|header\d+|footer\d+)\.xml$/i.test(name))
    .sort((a, b) => scoreDocxPart(a) - scoreDocxPart(b));

  const sections = xmlFiles
    .map((name) => extractTextFromWordXml(new TextDecoder('utf-8').decode(files[name])))
    .filter(Boolean);

  const text = sections.join('\n\n').trim();
  if (!text) {
    throw new Error('No readable text found in this Word document.');
  }
  return text;
}

function scoreDocxPart(name: string): number {
  if (name === 'word/document.xml') return 0;
  if (name.includes('footnotes')) return 1;
  if (name.includes('endnotes')) return 2;
  if (name.includes('header')) return 3;
  return 4;
}

function extractTextFromWordXml(xml: string): string {
  const withBreaks = xml
    .replace(/<w:tab\b[^>]*\/>/gi, '\t')
    .replace(/<w:(br|cr)\b[^>]*\/>/gi, '\n')
    .replace(/<\/w:tc>/gi, '\t')
    .replace(/<\/w:(p|tr)>/gi, '\n');

  return decodeXmlEntities(withBreaks.replace(/<[^>]+>/g, ''))
    .split(/\n+/)
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

function decodeXmlEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|amp|lt|gt|quot|apos);/gi, (entity, code: string) => {
    switch (code.toLowerCase()) {
      case 'amp':
        return '&';
      case 'lt':
        return '<';
      case 'gt':
        return '>';
      case 'quot':
        return '"';
      case 'apos':
        return "'";
      default:
        if (code.startsWith('#x')) return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
        if (code.startsWith('#')) return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
        return entity;
    }
  });
}
