'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileSpreadsheet,
  Download,
  Users,
  LifeBuoy,
  AlertTriangle,
  Activity,
  Calendar,
  RefreshCw,
  Loader2,
  Table,
} from 'lucide-react';

type ReportType = 'users' | 'tickets' | 'complaints' | 'audit' | 'events';

export default function AdminReportsPage() {
  const [reportType, setReportType] = useState<ReportType>('users');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchReport();
  }, [reportType]);

  async function fetchReport() {
    try {
      setLoading(true);
      const res = await api<any[]>(`/admin/reports?type=${reportType}`);
      setData(res || []);
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleExportCsv() {
    // Direct browser navigation to triggering CSV download
    window.location.href = `/api/admin/reports?type=${reportType}&format=csv`;
  }

  const reportsMeta: Record<ReportType, { title: string; desc: string; icon: any }> = {
    users: {
      title: 'Users & Identity Register',
      desc: 'All registered platform accounts, roles, statuses, and student identifiers.',
      icon: Users,
    },
    tickets: {
      title: 'Support Tickets Register',
      desc: 'Technical issues, inquiries, priority matrix, and resolution notes.',
      icon: LifeBuoy,
    },
    complaints: {
      title: 'Community Complaints & Misconduct',
      desc: 'Violation reports, targets, reasons, and enforced determinations.',
      icon: AlertTriangle,
    },
    audit: {
      title: 'Administrative Activity Audit Trail',
      desc: 'Immutable chronological ledger of staff decisions, status changes, and role promotions.',
      icon: Activity,
    },
    events: {
      title: 'Events & Hackathons Schedule',
      desc: 'Workshop agendas, venue locations, participant capacities, and statuses.',
      icon: Calendar,
    },
  };

  const currentMeta = reportsMeta[reportType];
  const Icon = currentMeta.icon;

  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  return (
    <div className="space-y-6">
      {/* ─── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <FileSpreadsheet className="h-6 w-6 text-emerald-400" />
            System & Compliance Reports
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Generate and export official tabular datasets, audit trails, and compliance reports for accreditation and governance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleExportCsv}
            className="gap-1.5 text-xs bg-emerald-500 hover:bg-emerald-600 text-black font-bold shadow-lg shadow-emerald-500/20"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchReport}
            className="h-9 gap-1.5 text-xs border-white/[0.1] bg-black/40 hover:bg-white/[0.05]"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </Button>
        </div>
      </div>

      {/* ─── Report Selection Pills ──────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(Object.keys(reportsMeta) as ReportType[]).map((type) => {
          const isSelected = reportType === type;
          const meta = reportsMeta[type];
          const TabIcon = meta.icon;
          return (
            <button
              key={type}
              onClick={() => setReportType(type)}
              className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition whitespace-nowrap ${
                isSelected
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-md shadow-emerald-500/10'
                  : 'border-white/[0.08] bg-[#071118]/80 text-muted-foreground hover:border-white/20 hover:text-white'
              }`}
            >
              <TabIcon className="h-4 w-4" />
              <span>{meta.title}</span>
            </button>
          );
        })}
      </div>

      {/* ─── Table View ──────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-primary" />
              <h2 className="text-sm sm:text-base font-bold text-white">
                {currentMeta.title} ({data.length} records)
              </h2>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{currentMeta.desc}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="h-8 text-xs border-white/[0.1] bg-black/40 hover:bg-white/[0.05] gap-1.5 self-start sm:self-auto shrink-0"
          >
            <Download className="h-3.5 w-3.5 text-primary" />
            Download CSV
          </Button>
        </div>

        <Card className="border-white/[0.08] bg-[#071015]/85 overflow-hidden shadow-lg">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : data.length === 0 ? (
              <div className="p-12 text-center text-xs text-muted-foreground font-mono">
                No data records available for this report type.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-[#060c10] z-10">
                    <tr className="border-b border-white/[0.08] text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {columns.map((col) => (
                        <th key={col} className="py-2.5 px-4 whitespace-nowrap">
                          {col.replace(/([A-Z])/g, ' $1').trim()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {data.map((row, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02] transition">
                        {columns.map((col) => {
                          const val = row[col];
                          const displayVal =
                            val == null
                              ? '—'
                              : typeof val === 'object'
                              ? JSON.stringify(val)
                              : String(val);

                          return (
                            <td key={col} className="py-2.5 px-4 whitespace-nowrap font-mono text-[11px] text-white/90">
                              {displayVal}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
