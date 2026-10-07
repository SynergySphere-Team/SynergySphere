'use client';

import React, { memo, useMemo, useState } from 'react';
import { Check, Copy } from 'lucide-react';

type InlineToken =
  | { type: 'text'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'italic'; text: string }
  | { type: 'code'; text: string };

type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'code_block'; language?: string; code: string }
  | { type: 'bullet'; text: string; indent: number }
  | { type: 'numbered'; number: string; text: string; indent: number }
  | { type: 'quote'; text: string }
  | { type: 'divider' }
  | { type: 'paragraph'; text: string };

function parseInline(raw: string): InlineToken[] {
  if (!raw) return [];
  const tokens: InlineToken[] = [];
  let index = 0;
  const len = raw.length;

  while (index < len) {
    // 1. Inline code: `code`
    if (raw[index] === '`') {
      const end = raw.indexOf('`', index + 1);
      if (end !== -1) {
        tokens.push({ type: 'code', text: raw.slice(index + 1, end) });
        index = end + 1;
        continue;
      }
    }

    // 2. Bold: **bold** or __bold__
    if (
      (raw[index] === '*' && raw[index + 1] === '*') ||
      (raw[index] === '_' && raw[index + 1] === '_')
    ) {
      const marker = raw.slice(index, index + 2);
      const end = raw.indexOf(marker, index + 2);
      if (end !== -1) {
        tokens.push({ type: 'bold', text: raw.slice(index + 2, end) });
        index = end + 2;
        continue;
      }
    }

    // 3. Italic: *italic* or _italic_
    if (
      raw[index] === '*' ||
      (raw[index] === '_' && (index === 0 || /\s/.test(raw[index - 1])))
    ) {
      const marker = raw[index];
      const end = raw.indexOf(marker, index + 1);
      if (end !== -1 && end > index + 1 && raw[end - 1] !== ' ') {
        tokens.push({ type: 'italic', text: raw.slice(index + 1, end) });
        index = end + 1;
        continue;
      }
    }

    // Accumulate regular text
    let nextSpecial = len;
    for (let j = index; j < len; j++) {
      if (
        raw[j] === '`' ||
        (raw[j] === '*' && raw[j + 1] === '*') ||
        (raw[j] === '_' && raw[j + 1] === '_') ||
        raw[j] === '*' ||
        raw[j] === '_'
      ) {
        nextSpecial = j;
        break;
      }
    }

    if (nextSpecial > index) {
      tokens.push({ type: 'text', text: raw.slice(index, nextSpecial) });
      index = nextSpecial;
    } else {
      tokens.push({ type: 'text', text: raw[index] });
      index++;
    }
  }

  return tokens;
}

function parseBlocks(markdown: string): Block[] {
  if (!markdown) return [];
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];

  let inCode = false;
  let codeLang = '';
  let codeLines: string[] = [];
  let currentParagraphLines: string[] = [];

  const flushParagraph = () => {
    if (currentParagraphLines.length > 0) {
      const joined = currentParagraphLines.join('\n').trim();
      if (joined) {
        blocks.push({ type: 'paragraph', text: joined });
      }
      currentParagraphLines = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Code block fences: ```
    if (trimmed.startsWith('```')) {
      if (!inCode) {
        flushParagraph();
        inCode = true;
        codeLang = trimmed.slice(3).trim();
        codeLines = [];
      } else {
        inCode = false;
        blocks.push({
          type: 'code_block',
          language: codeLang,
          code: codeLines.join('\n'),
        });
        codeLines = [];
      }
      continue;
    }

    if (inCode) {
      codeLines.push(rawLine);
      continue;
    }

    // Blank line
    if (!trimmed) {
      flushParagraph();
      continue;
    }

    // Divider: --- or ***
    if (/^[-*_]{3,}$/.test(trimmed)) {
      flushParagraph();
      blocks.push({ type: 'divider' });
      continue;
    }

    // Heading: #, ##, ###, ####, #####, ######
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      continue;
    }

    // Blockquote: > text
    const quoteMatch = trimmed.match(/^>\s*(.+)$/);
    if (quoteMatch) {
      flushParagraph();
      blocks.push({
        type: 'quote',
        text: quoteMatch[1].trim(),
      });
      continue;
    }

    // Bullet item: * item, - item, + item, • item
    const bulletMatch = rawLine.match(/^(\s*)[*\-+•]\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      blocks.push({
        type: 'bullet',
        indent: Math.floor(bulletMatch[1].length / 2),
        text: bulletMatch[2].trim(),
      });
      continue;
    }

    // Numbered item: 1. item, 2) item
    const numberedMatch = rawLine.match(/^(\s*)(\d+)[.)]\s+(.+)$/);
    if (numberedMatch) {
      flushParagraph();
      blocks.push({
        type: 'numbered',
        number: numberedMatch[2],
        indent: Math.floor(numberedMatch[1].length / 2),
        text: numberedMatch[3].trim(),
      });
      continue;
    }

    // Regular line in paragraph
    currentParagraphLines.push(trimmed);
  }

  flushParagraph();
  if (inCode && codeLines.length > 0) {
    blocks.push({
      type: 'code_block',
      language: codeLang,
      code: codeLines.join('\n'),
    });
  }

  return blocks;
}

function InlineTextRenderer({ text }: { text: string }) {
  const tokens = useMemo(() => parseInline(text), [text]);

  return (
    <span>
      {tokens.map((token, i) => {
        if (token.type === 'bold') {
          return (
            <strong key={i} className="font-semibold text-white">
              {token.text}
            </strong>
          );
        }
        if (token.type === 'italic') {
          return (
            <em key={i} className="italic text-slate-300">
              {token.text}
            </em>
          );
        }
        if (token.type === 'code') {
          return (
            <code
              key={i}
              className="rounded border border-sky-500/20 bg-sky-950/40 px-1.5 py-0.5 font-mono text-xs text-sky-300"
            >
              {token.text}
            </code>
          );
        }
        return <span key={i}>{token.text}</span>;
      })}
    </span>
  );
}

function CodeBlockRenderer({ language, code }: { language?: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(code);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="my-2.5 overflow-hidden rounded-lg border border-white/[0.08] bg-[#050a0d]">
      <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.03] px-3 py-1.5">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-sky-400">
          {language || 'CODE'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] font-medium text-slate-400 transition hover:text-white"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-5 text-sky-300 whitespace-pre-wrap">
        <code>{code}</code>
      </pre>
    </div>
  );
}

interface MarkdownViewProps {
  content: string;
  className?: string;
}

export const MarkdownView = memo(function MarkdownView({
  content,
  className = '',
}: MarkdownViewProps) {
  const blocks = useMemo(() => parseBlocks(content), [content]);

  if (!content) return null;

  return (
    <div className={`space-y-2 text-xs leading-6 text-slate-300 ${className}`}>
      {blocks.map((block, idx) => {
        if (block.type === 'heading') {
          if (block.level === 1) {
            return (
              <h3
                key={idx}
                className="mt-4 mb-2 flex items-center gap-2 text-base font-bold text-white tracking-tight"
              >
                <span className="h-3.5 w-1 rounded bg-primary" />
                <InlineTextRenderer text={block.text} />
              </h3>
            );
          }
          if (block.level === 2) {
            return (
              <h4
                key={idx}
                className="mt-3.5 mb-1.5 flex items-center gap-2 text-sm font-bold text-sky-400"
              >
                <span className="h-2.5 w-1 rounded bg-sky-400" />
                <InlineTextRenderer text={block.text} />
              </h4>
            );
          }
          return (
            <h5
              key={idx}
              className="mt-3 mb-1 flex items-center gap-2 text-xs font-bold text-slate-200"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              <InlineTextRenderer text={block.text} />
            </h5>
          );
        }

        if (block.type === 'paragraph') {
          return (
            <p key={idx} className="my-1.5 leading-6">
              <InlineTextRenderer text={block.text} />
            </p>
          );
        }

        if (block.type === 'bullet') {
          return (
            <div
              key={idx}
              className="my-1 flex items-start gap-2.5"
              style={{ marginLeft: `${block.indent * 14}px` }}
            >
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
              <div className="flex-1 leading-6">
                <InlineTextRenderer text={block.text} />
              </div>
            </div>
          );
        }

        if (block.type === 'numbered') {
          return (
            <div
              key={idx}
              className="my-1 flex items-start gap-2"
              style={{ marginLeft: `${block.indent * 14}px` }}
            >
              <span className="font-mono text-xs font-bold text-sky-400 shrink-0">
                {block.number}.
              </span>
              <div className="flex-1 leading-6">
                <InlineTextRenderer text={block.text} />
              </div>
            </div>
          );
        }

        if (block.type === 'code_block') {
          return (
            <CodeBlockRenderer
              key={idx}
              language={block.language}
              code={block.code}
            />
          );
        }

        if (block.type === 'quote') {
          return (
            <blockquote
              key={idx}
              className="my-2 rounded-r-lg border-l-2 border-primary bg-primary/[0.04] py-1.5 pr-3 pl-3 text-xs italic text-slate-300"
            >
              <InlineTextRenderer text={block.text} />
            </blockquote>
          );
        }

        if (block.type === 'divider') {
          return <hr key={idx} className="my-3 border-white/[0.08]" />;
        }

        return null;
      })}
    </div>
  );
});
