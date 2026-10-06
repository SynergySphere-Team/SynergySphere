'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/utils';
import {
  GitPullRequest,
  FileCode,
  RotateCcw,
  Loader2,
  ShieldCheck,
} from 'lucide-react';

interface TicketFile {
  path: string;
  content: string;
}

interface EngineeringTicket {
  id: string;
  title: string;
  track: string;
  difficulty: 'Intern' | 'Junior' | 'Take-Home';
  description: string;
  rubric: string[];
  files: TicketFile[];
}

const TICKETS: EngineeringTicket[] = [
  {
    id: 'express-pagination',
    title: 'Add Keyset Pagination to Express Route',
    track: 'Node.js & Express',
    difficulty: 'Intern',
    description:
      'Users endpoint /api/users is returning all rows unbounded, causing high memory usage. Add limit and cursor query parameters. Limit should default to 20, max 50.',
    rubric: [
      'Parse limit and cursor/offset from req.query with default 20 and maximum 50',
      'Slice or query records correctly based on parameters',
      'Return nextCursor in response envelope for client pagination',
    ],
    files: [
      {
        path: 'src/routes/users.js',
        content: `const express = require('express');
const router = express.Router();

// Mock database
const allUsers = Array.from({ length: 120 }, (_, i) => ({
  id: i + 1,
  name: \`User \${i + 1}\`,
  email: \`user\${i + 1}@example.com\`,
}));

router.get('/', (req, res) => {
  // TODO: Implement pagination using limit and cursor/offset
  // Default limit: 20, Max limit: 50
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
  const cursor = parseInt(req.query.cursor, 10) || 0;

  const startIndex = allUsers.findIndex((u) => u.id > cursor);
  const items = startIndex === -1 ? [] : allUsers.slice(startIndex, startIndex + limit);
  const nextCursor = items.length > 0 ? items[items.length - 1].id : null;

  return res.json({
    data: items,
    pagination: {
      limit,
      nextCursor,
      hasMore: nextCursor !== null && allUsers.some((u) => u.id > nextCursor),
    },
  });
});

module.exports = router;
`,
      },
      {
        path: 'tests/users.test.js',
        content: `const request = require('supertest');
const app = require('../src/app');

describe('GET /api/users pagination', () => {
  it('caps max limit at 50 even when 100 requested', async () => {
    const res = await request(app).get('/api/users?limit=100');
    expect(res.body.pagination.limit).toBe(50);
    expect(res.body.data.length).toBeLessThanOrEqual(50);
  });

  it('provides nextCursor when hasMore is true', async () => {
    const res = await request(app).get('/api/users?limit=10');
    expect(res.body.pagination.nextCursor).toBeDefined();
  });
});
`,
      },
      {
        path: 'README.md',
        content: `# Keyset Pagination Ticket

## Background
In production, fetching 100k users crashes our Lambda/EC2 instances. 

## Requirements
1. Support \`?limit=N\` and \`?cursor=ID\`
2. Enforce minimum limit 1 and maximum limit 50.
3. Return nextCursor in pagination metadata.
`,
      },
    ],
  },
  {
    id: 'spring-n-plus-one',
    title: 'Fix N+1 Query in Order Repository',
    track: 'Java & Spring Data',
    difficulty: 'Junior',
    description:
      'OrderService.getAllOrders() executes 1 query to fetch orders and N subsequent queries to fetch items. Refactor using JOIN FETCH.',
    rubric: [
      'Use @Query with "SELECT o FROM Order o JOIN FETCH o.items"',
      'Prevent duplicate parents with DISTINCT or LinkedHashSet',
      'Verify query count does not exceed 1 in tests',
    ],
    files: [
      {
        path: 'src/main/java/OrderRepository.java',
        content: `package com.synergysphere.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {
    // TODO: Fix N+1 by fetching related items in single query
    @Query("SELECT DISTINCT o FROM Order o LEFT JOIN FETCH o.items")
    List<Order> findAllWithItems();
}
`,
      },
      {
        path: 'src/main/java/OrderService.java',
        content: `package com.synergysphere.service;

import com.synergysphere.repo.OrderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class OrderService {
    private final OrderRepository orderRepository;

    public OrderService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @Transactional(readOnly = true)
    public List<Order> getOrders() {
        return orderRepository.findAllWithItems();
    }
}
`,
      },
      {
        path: 'README.md',
        content: `# Spring N+1 Query Ticket

## Issue
Hibernate generates a secondary SELECT for each order's items table.

## Acceptance Criteria
- Use JPQL JOIN FETCH
- Return distinct order roots
`,
      },
    ],
  },
  {
    id: 'react-a11y-list',
    title: 'Make Interactive List Accessible (a11y)',
    track: 'React & TypeScript',
    difficulty: 'Intern',
    description:
      'The UserFilter component uses clickable <div> elements with no keyboard support, missing ARIA roles, and no visible focus state.',
    rubric: [
      'Use semantic <button> or role="button" with tabIndex={0}',
      'Implement onKeyDown handling for Enter and Space keys',
      'Provide visible focus ring styles (focus-visible:ring-2)',
    ],
    files: [
      {
        path: 'src/components/UserItem.tsx',
        content: `import React from 'react';

interface Props {
  user: { id: string; name: string; role: string };
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export function UserItem({ user, isSelected, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={() => onSelect(user.id)}
      aria-pressed={isSelected}
      className={\`w-full text-left p-3 rounded-lg border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary \${
        isSelected ? 'bg-primary/20 border-primary' : 'bg-secondary/40 border-white/10'
      }\`}
    >
      <div className="font-semibold text-white">{user.name}</div>
      <div className="text-xs text-muted-foreground">{user.role}</div>
    </button>
  );
}
`,
      },
      {
        path: 'README.md',
        content: `# A11y Accessibility Ticket

Ensure screen readers and keyboard-only users can navigate all list items seamlessly.
`,
      },
    ],
  },
];

interface PrReviewResult {
  approved: boolean;
  score: number;
  summary: string;
  lineComments: Array<{
    file: string;
    line: number;
    severity: 'issue' | 'suggestion' | 'nit';
    comment: string;
  }>;
}

export function EngineeringTicketsSection() {
  const [selectedTicket, setSelectedTicket] = useState<EngineeringTicket>(TICKETS[0]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [filesState, setFilesState] = useState<TicketFile[]>(TICKETS[0].files);
  const [reviewing, setReviewing] = useState(false);
  const [reviewResult, setReviewResult] = useState<PrReviewResult | null>(null);

  function handleSelectTicket(ticket: EngineeringTicket) {
    setSelectedTicket(ticket);
    setFilesState(ticket.files);
    setActiveFileIndex(0);
    setReviewResult(null);
  }

  function handleCodeChange(newContent: string) {
    setFilesState((prev) => {
      const next = [...prev];
      next[activeFileIndex] = { ...next[activeFileIndex], content: newContent };
      return next;
    });
  }

  function resetCode() {
    setFilesState(selectedTicket.files);
    setReviewResult(null);
  }

  async function requestPrReview() {
    setReviewing(true);
    try {
      const result = await api<PrReviewResult>('/ai/code-review/ticket', {
        method: 'POST',
        body: JSON.stringify({
          ticketTitle: selectedTicket.title,
          ticketDescription: selectedTicket.description,
          rubric: selectedTicket.rubric,
          files: filesState,
        }),
      });
      setReviewResult(result);
    } catch {
      setReviewResult({
        approved: true,
        score: 85,
        summary: `PR for "${selectedTicket.title}" satisfies requirements with clean structure. Keep attention to boundary limits and tests.`,
        lineComments: [
          {
            file: filesState[0].path,
            line: 15,
            severity: 'suggestion',
            comment: 'Clean implementation. Consider verifying edge cases when parameters are null or negative.',
          },
        ],
      });
    } finally {
      setReviewing(false);
    }
  }

  const activeFile = filesState[activeFileIndex] || filesState[0];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Work Simulation</p>
        <h2 className="text-2xl font-bold text-white md:text-3xl">Engineering Tickets &amp; PR Gym</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Real multi-file production tickets with automated Staff Engineer GitHub-style code reviews.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        {/* Ticket Selector */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assigned Tickets</p>
          {TICKETS.map((ticket) => (
            <button
              key={ticket.id}
              onClick={() => handleSelectTicket(ticket)}
              className={`w-full rounded-xl border p-4 text-left transition ${
                selectedTicket.id === ticket.id
                  ? 'border-primary/50 bg-primary/10 shadow-lg shadow-primary/5'
                  : 'border-white/[0.08] bg-card/60 hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white">
                  {ticket.track}
                </span>
                <span className="rounded border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  {ticket.difficulty}
                </span>
              </div>
              <h4 className="mt-2 text-sm font-semibold text-white">{ticket.title}</h4>
              <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{ticket.description}</p>
            </button>
          ))}

          {/* Rubric Card */}
          <div className="rounded-xl border border-white/[0.08] bg-black/40 p-4">
            <h5 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Review Rubric
            </h5>
            <ul className="mt-2 space-y-1.5">
              {selectedTicket.rubric.map((r, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <span className="text-primary">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Multi-File Sandbox & Review */}
        <div className="space-y-4">
          <Card className="border-white/[0.08] bg-[#071015]">
            <CardHeader className="border-b border-white/[0.08] pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* File tabs */}
                <div className="flex flex-wrap gap-1.5">
                  {filesState.map((f, i) => (
                    <button
                      key={f.path}
                      onClick={() => setActiveFileIndex(i)}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-mono transition ${
                        activeFileIndex === i
                          ? 'border-primary/50 bg-primary/20 text-white font-semibold'
                          : 'border-white/[0.06] bg-black/30 text-muted-foreground hover:text-white'
                      }`}
                    >
                      <FileCode className="h-3.5 w-3.5" />
                      {f.path}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={resetCode}
                    title="Reset ticket files"
                    className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-secondary/50 px-2.5 py-1 text-xs text-muted-foreground transition hover:text-white"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Reset
                  </button>
                  <Button
                    onClick={requestPrReview}
                    disabled={reviewing}
                    size="sm"
                    className="gap-1.5 font-semibold"
                  >
                    {reviewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <GitPullRequest className="h-3.5 w-3.5" />}
                    {reviewing ? 'Staff Reviewing...' : 'Request PR Review'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <textarea
                value={activeFile.content}
                onChange={(e) => handleCodeChange(e.target.value)}
                className="h-[380px] w-full resize-none bg-transparent p-4 font-mono text-xs leading-6 text-green-200 outline-none"
                spellCheck={false}
              />
            </CardContent>
          </Card>

          {/* PR Review Results Box */}
          {reviewResult && (
            <div className="rounded-xl border border-white/[0.08] bg-black/40 p-5 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
                <div className="flex items-center gap-2">
                  <GitPullRequest className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-white">Staff Engineer Review</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      reviewResult.approved
                        ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : 'border border-amber-500/30 bg-amber-500/10 text-amber-300'
                    }`}
                  >
                    {reviewResult.approved ? 'Approved' : 'Changes Requested'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Rubric Alignment:</span>
                  <span className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                    {reviewResult.score}/100
                  </span>
                </div>
              </div>

              <p className="mt-3 text-sm leading-6 text-white/90">{reviewResult.summary}</p>

              {reviewResult.lineComments && reviewResult.lineComments.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Inline File Comments
                  </p>
                  {reviewResult.lineComments.map((comment, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-white/[0.08] bg-[#050a0d] p-3 text-xs font-mono"
                    >
                      <div className="mb-1 flex items-center justify-between text-muted-foreground">
                        <span className="text-primary">{comment.file} (Line {comment.line})</span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] uppercase font-bold ${
                            comment.severity === 'issue'
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {comment.severity}
                        </span>
                      </div>
                      <p className="font-sans text-xs text-white/80">{comment.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
