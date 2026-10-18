/**
 * Career document model.
 *
 * The backend generates resumes / CVs / LinkedIn kits as Markdown. Rendering that
 * Markdown verbatim leaves raw `**`, `###`, `---` and emoji in the document, which
 * looks broken and is hostile to ATS parsers. This module converts the Markdown into
 * a small, editable block model that the Studio renders as a clean document and that
 * can be serialised back to Markdown, plain text or print-ready HTML.
 */

export type DocBlockType =
  | 'title'
  | 'subtitle'
  | 'section'
  | 'subsection'
  | 'strong'
  | 'meta'
  | 'text'
  | 'bullet';

export interface DocBlock {
  id: string;
  type: DocBlockType;
  text: string;
}

export const DOC_BLOCK_LABELS: Record<DocBlockType, string> = {
  title: 'Title',
  subtitle: 'Name',
  section: 'Section heading',
  subsection: 'Sub-heading',
  strong: 'Bold line',
  meta: 'Italic note',
  text: 'Paragraph',
  bullet: 'Bullet',
};

let blockCounter = 0;

export function createBlockId(): string {
  blockCounter += 1;
  return `blk-${Date.now().toString(36)}-${blockCounter}`;
}

export function createBlock(type: DocBlockType, text = ''): DocBlock {
  return { id: createBlockId(), type, text };
}

const EMOJI_PATTERN = /[\p{Extended_Pictographic}\uFE0F\u200D]/gu;
const HORIZONTAL_RULE_PATTERN = /^\s*([-*_=])(\s*\1){2,}\s*$/;
const FENCE_PATTERN = /^\s*```/;
const BULLET_PATTERN = /^\s*[-\u2022\u25E6\u25AA*+]\s+(.*)$/;

/** Removes inline Markdown syntax, stray asterisks/dashes, and emoji so only clean text remains. */
export function stripInlineMarkdown(input: string): string {
  return input
    .replace(EMOJI_PATTERN, '')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
    .replace(/_{1,3}([^_]+)_{1,3}/g, '$1')
    .replace(/\*+/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[ \]\s*/g, '\u2610 ')
    .replace(/\[x\]\s*/gi, '\u2611 ')
    .replace(/\s*-{2,}\s*/g, ' · ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[-–—\s|·]+|[-–—\s|·]+$/g, '')
    .trim();
}

function hasNoLowercase(text: string): boolean {
  return !/[a-z]/.test(text);
}

function isSectionHeading(text: string): boolean {
  return /^\d+\.\s/.test(text) || hasNoLowercase(text);
}

/** Converts generated Markdown into editable document blocks. */
export function parseDocument(markdown: string): DocBlock[] {
  const blocks: DocBlock[] = [];
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim() || HORIZONTAL_RULE_PATTERN.test(line) || FENCE_PATTERN.test(line)) {
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      const text = stripInlineMarkdown(heading[2]);
      if (!text) continue;
      if (level === 1) {
        blocks.push(createBlock('title', text));
      } else if (level === 2) {
        blocks.push(createBlock(hasNoLowercase(text) ? 'section' : 'subtitle', text));
      } else {
        blocks.push(createBlock(isSectionHeading(text) ? 'section' : 'subsection', text));
      }
      continue;
    }

    const bullet = line.match(BULLET_PATTERN);
    if (bullet) {
      const text = stripInlineMarkdown(bullet[1]);
      if (text) blocks.push(createBlock('bullet', text));
      continue;
    }

    const trimmed = line.trim();
    if (/^\*\*[^*].*\*\*$/.test(trimmed) && !trimmed.slice(2, -2).includes('**')) {
      const text = stripInlineMarkdown(trimmed);
      if (text) blocks.push(createBlock('strong', text));
      continue;
    }
    if (/^\*[^*].*\*$/.test(trimmed)) {
      const text = stripInlineMarkdown(trimmed);
      if (text) blocks.push(createBlock('meta', text));
      continue;
    }

    const text = stripInlineMarkdown(trimmed);
    if (text) blocks.push(createBlock('text', text));
  }

  return blocks;
}

const MARKDOWN_PREFIX: Record<DocBlockType, (text: string) => string> = {
  title: (t) => `# ${t}`,
  subtitle: (t) => `## ${t}`,
  section: (t) => `## ${t}`,
  subsection: (t) => `### ${t}`,
  strong: (t) => `**${t}**`,
  meta: (t) => `*${t}*`,
  text: (t) => t,
  bullet: (t) => `- ${t}`,
};

/** Serialises blocks back to Markdown (used for the .md download). */
export function serializeToMarkdown(blocks: DocBlock[]): string {
  return blocks
    .filter((b) => b.text.trim())
    .map((b, idx, arr) => {
      const line = MARKDOWN_PREFIX[b.type](b.text.trim());
      const next = arr[idx + 1];
      const keepTight = b.type === 'bullet' && next?.type === 'bullet';
      return keepTight ? line : `${line}\n`;
    })
    .join('\n')
    .trim();
}

/** Serialises blocks to clean plain text (used for copy-to-clipboard). */
export function serializeToPlainText(blocks: DocBlock[]): string {
  const out: string[] = [];
  blocks
    .filter((b) => b.text.trim())
    .forEach((b) => {
      const text = b.text.trim();
      switch (b.type) {
        case 'title':
        case 'section':
          out.push('', text.toUpperCase());
          break;
        case 'bullet':
          out.push(`\u2022 ${text}`);
          break;
        case 'subtitle':
        case 'subsection':
          out.push('', text);
          break;
        default:
          out.push(text);
      }
    });
  return out.join('\n').trim();
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const PRINT_STYLES = `
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111827; margin: 0; padding: 36px 44px; line-height: 1.5; font-size: 13px; }
  .doc { max-width: 780px; margin: 0 auto; }
  h1 { font-size: 26px; margin: 0 0 4px 0; letter-spacing: 0.01em; }
  h2.name { font-size: 22px; margin: 6px 0 2px 0; }
  h2.section { font-size: 14px; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1.5px solid #374151; padding-bottom: 3px; margin: 20px 0 8px 0; }
  h3 { font-size: 14px; margin: 12px 0 2px 0; }
  p { margin: 2px 0; }
  p.strong { font-weight: 700; }
  p.meta { font-style: italic; color: #4b5563; }
  ul { margin: 2px 0 2px 0; padding-left: 20px; }
  li { margin: 2px 0; }
  @media print { body { padding: 0; } }
`;

/** Serialises blocks to a self-contained, print-ready HTML document. */
export function serializeToHtml(blocks: DocBlock[], title: string): string {
  const parts: string[] = [];
  let openList = false;
  const closeList = () => {
    if (openList) {
      parts.push('</ul>');
      openList = false;
    }
  };

  blocks
    .filter((b) => b.text.trim())
    .forEach((b) => {
      const text = escapeHtml(b.text.trim());
      if (b.type === 'bullet') {
        if (!openList) {
          parts.push('<ul>');
          openList = true;
        }
        parts.push(`<li>${text}</li>`);
        return;
      }
      closeList();
      switch (b.type) {
        case 'title':
          parts.push(`<h1>${text}</h1>`);
          break;
        case 'subtitle':
          parts.push(`<h2 class="name">${text}</h2>`);
          break;
        case 'section':
          parts.push(`<h2 class="section">${text}</h2>`);
          break;
        case 'subsection':
          parts.push(`<h3>${text}</h3>`);
          break;
        case 'strong':
          parts.push(`<p class="strong">${text}</p>`);
          break;
        case 'meta':
          parts.push(`<p class="meta">${text}</p>`);
          break;
        default:
          parts.push(`<p>${text}</p>`);
      }
    });
  closeList();

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" /><title>${escapeHtml(
    title,
  )}</title><style>${PRINT_STYLES}</style></head><body><div class="doc">${parts.join(
    '',
  )}</div></body></html>`;
}
