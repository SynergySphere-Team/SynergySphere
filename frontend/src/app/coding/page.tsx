'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CodingChallengesSection } from '@/components/coding/CodingChallengesSection';

export default function CodingPage() {
  return (
    <DashboardLayout>
      <CodingChallengesSection />
    </DashboardLayout>
  );
}
