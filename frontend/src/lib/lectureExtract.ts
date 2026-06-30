import { api } from './utils';

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const type = file.type;

  if (
    type.startsWith('text/') ||
    name.endsWith('.txt') ||
    name.endsWith('.md') ||
    name.endsWith('.csv') ||
    name.endsWith('.json')
  ) {
    return file.text();
  }

  if (type === 'application/pdf' || name.endsWith('.pdf')) {
    return extractServerText(file);
  }

  if (
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx')
  ) {
    return extractServerText(file);
  }

  if (name.endsWith('.pptx') || name.endsWith('.ppt')) {
    throw new Error('PowerPoint files are not parsed directly. Export slides to PDF or paste the slide text below.');
  }

  if (name.endsWith('.doc')) {
    throw new Error('Legacy .doc files are not supported. Save as .docx or paste the content below.');
  }

  return file.text();
}

async function extractServerText(file: File): Promise<string> {
  const { text } = await api<{ text: string }>('/ai/extract-lecture-text', {
    method: 'POST',
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      base64: await fileToBase64(file),
    }),
  });
  return text;
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read this file.'));
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.slice(result.indexOf(',') + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

export function inferFileType(file: File): string {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return 'pdf';
  if (name.endsWith('.docx')) return 'docx';
  if (name.endsWith('.pptx')) return 'pptx';
  if (name.endsWith('.md')) return 'markdown';
  return 'text';
}
