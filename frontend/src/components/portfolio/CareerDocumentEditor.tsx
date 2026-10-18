'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DOC_BLOCK_LABELS,
  createBlock,
  type DocBlock,
  type DocBlockType,
} from '@/lib/careerDocument';

interface CareerDocumentEditorProps {
  blocks: DocBlock[];
  editing: boolean;
  onChange: (blocks: DocBlock[]) => void;
}

const BLOCK_TYPES = Object.keys(DOC_BLOCK_LABELS) as DocBlockType[];

const TYPE_CLASSES: Record<DocBlockType, string> = {
  title: 'text-2xl font-bold tracking-tight text-gray-900',
  subtitle: 'text-xl font-bold text-gray-900',
  section:
    'mt-5 border-b-2 border-gray-700 pb-1 text-sm font-bold uppercase tracking-wider text-gray-900',
  subsection: 'mt-3 text-sm font-bold text-gray-900',
  strong: 'text-sm font-semibold text-gray-900',
  meta: 'text-sm italic text-gray-600',
  text: 'text-sm text-gray-800',
  bullet: 'text-sm text-gray-800',
};

function AutoTextarea({
  value,
  className,
  blockId,
  onChange,
  onKeyDown,
}: {
  value: string;
  className: string;
  blockId: string;
  onChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      data-block-id={blockId}
      rows={1}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\n/g, ' '))}
      onKeyDown={onKeyDown}
      spellCheck
      className={`block w-full resize-none overflow-hidden rounded border border-transparent bg-transparent px-1.5 py-0.5 leading-6 outline-none transition hover:border-gray-300 focus:border-emerald-500 focus:bg-emerald-50/40 ${className}`}
    />
  );
}

export function CareerDocumentEditor({ blocks, editing, onChange }: CareerDocumentEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  useEffect(() => {
    if (!focusId) return;
    const el = containerRef.current?.querySelector<HTMLTextAreaElement>(
      `textarea[data-block-id="${focusId}"]`,
    );
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
    setFocusId(null);
  }, [focusId, blocks]);

  const updateBlock = useCallback(
    (id: string, patch: Partial<DocBlock>) => {
      onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    },
    [blocks, onChange],
  );

  const removeBlock = useCallback(
    (id: string) => {
      onChange(blocks.filter((b) => b.id !== id));
    },
    [blocks, onChange],
  );

  const moveBlock = useCallback(
    (index: number, direction: -1 | 1) => {
      const target = index + direction;
      if (target < 0 || target >= blocks.length) return;
      const next = [...blocks];
      [next[index], next[target]] = [next[target], next[index]];
      onChange(next);
    },
    [blocks, onChange],
  );

  const insertAfter = useCallback(
    (index: number, type: DocBlockType) => {
      const created = createBlock(type);
      const next = [...blocks];
      next.splice(index + 1, 0, created);
      onChange(next);
      setFocusId(created.id);
    },
    [blocks, onChange],
  );

  const appendBlock = useCallback(
    (type: DocBlockType) => {
      const created = createBlock(type);
      onChange([...blocks, created]);
      setFocusId(created.id);
    },
    [blocks, onChange],
  );

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>, index: number) {
    const block = blocks[index];
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      insertAfter(index, block.type === 'bullet' ? 'bullet' : 'text');
    } else if (e.key === 'Backspace' && block.text === '' && blocks.length > 1) {
      e.preventDefault();
      const previous = blocks[index - 1] ?? blocks[index + 1];
      removeBlock(block.id);
      if (previous) setFocusId(previous.id);
    }
  }

  if (blocks.length === 0 && !editing) {
    return (
      <div className="rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-muted-foreground">
        This document is empty. Switch to edit mode to add content.
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-3">
      <div className="rounded-xl bg-white px-6 py-7 shadow-lg md:px-10" data-testid="career-document">
        {blocks.map((block, index) => {
          const classes = TYPE_CLASSES[block.type];

          if (!editing) {
            if (!block.text.trim()) return null;
            if (block.type === 'bullet') {
              return (
                <div key={block.id} className={`flex gap-2 pl-3 ${classes}`}>
                  <span aria-hidden="true">&bull;</span>
                  <span className="min-w-0 break-words">{block.text}</span>
                </div>
              );
            }
            return (
              <div key={block.id} className={`break-words ${classes}`}>
                {block.text}
              </div>
            );
          }

          return (
            <div key={block.id} className="group relative -mx-1 mb-1 rounded-md px-1 py-0.5 hover:bg-gray-50">
              <div className="flex items-start gap-1.5">
                <div className={`min-w-0 flex-1 ${block.type === 'bullet' ? 'flex items-start gap-1 pl-3' : ''}`}>
                  {block.type === 'bullet' && (
                    <span className="mt-0.5 text-sm leading-6 text-gray-800" aria-hidden="true">
                      &bull;
                    </span>
                  )}
                  <AutoTextarea
                    value={block.text}
                    blockId={block.id}
                    className={classes}
                    onChange={(value) => updateBlock(block.id, { text: value })}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                  />
                </div>
                <div className="flex shrink-0 items-center gap-0.5 opacity-60 transition group-focus-within:opacity-100 group-hover:opacity-100">
                  <select
                    value={block.type}
                    aria-label="Line style"
                    onChange={(e) => updateBlock(block.id, { type: e.target.value as DocBlockType })}
                    className="h-7 rounded border border-gray-300 bg-white px-1 text-[11px] text-gray-700 focus:border-emerald-500 focus:outline-none"
                  >
                    {BLOCK_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {DOC_BLOCK_LABELS[t]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    title="Move up"
                    aria-label="Move line up"
                    disabled={index === 0}
                    onClick={() => moveBlock(index, -1)}
                    className="rounded p-1 text-gray-500 hover:bg-gray-200 disabled:opacity-30"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Move down"
                    aria-label="Move line down"
                    disabled={index === blocks.length - 1}
                    onClick={() => moveBlock(index, 1)}
                    className="rounded p-1 text-gray-500 hover:bg-gray-200 disabled:opacity-30"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Add a line below"
                    aria-label="Add a line below"
                    onClick={() => insertAfter(index, block.type === 'bullet' ? 'bullet' : 'text')}
                    className="rounded p-1 text-gray-500 hover:bg-emerald-100 hover:text-emerald-700"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Delete line"
                    aria-label="Delete line"
                    onClick={() => removeBlock(block.id)}
                    className="rounded p-1 text-gray-500 hover:bg-rose-100 hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Add to document:</span>
          <Button type="button" size="sm" variant="secondary" className="h-7 text-xs" onClick={() => appendBlock('section')}>
            <Plus className="mr-1 h-3 w-3" /> Section
          </Button>
          <Button type="button" size="sm" variant="secondary" className="h-7 text-xs" onClick={() => appendBlock('subsection')}>
            <Plus className="mr-1 h-3 w-3" /> Sub-heading
          </Button>
          <Button type="button" size="sm" variant="secondary" className="h-7 text-xs" onClick={() => appendBlock('text')}>
            <Plus className="mr-1 h-3 w-3" /> Paragraph
          </Button>
          <Button type="button" size="sm" variant="secondary" className="h-7 text-xs" onClick={() => appendBlock('bullet')}>
            <Plus className="mr-1 h-3 w-3" /> Bullet
          </Button>
        </div>
      )}
    </div>
  );
}
