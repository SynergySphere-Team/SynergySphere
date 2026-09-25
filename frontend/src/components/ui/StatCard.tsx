import React from 'react';
import { Card, CardContent } from './card';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  caption?: string;
  icon?: LucideIcon;
  badge?: string;
}

export function StatCard({ label, value, caption, icon: Icon, badge }: StatCardProps) {
  return (
    <Card className="overflow-hidden border border-white/[0.08] bg-[#071015]/90 hover:border-primary/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {Icon && (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/[0.08] text-primary">
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <p className="text-2xl font-bold tracking-tight text-white">{value}</p>
          {badge && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {badge}
            </span>
          )}
        </div>
        {caption && <p className="mt-1 text-[11px] text-muted-foreground">{caption}</p>}
      </CardContent>
    </Card>
  );
}
