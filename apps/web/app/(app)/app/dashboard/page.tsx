import dynamic from 'next/dynamic';
import { FeatureComingSoon } from '@/components/app/FeatureComingSoon';
import { isFeatureEnabled } from '@/lib/feature-flags';

const dashboardEnabled = isFeatureEnabled('projectDashboard');
const DashboardPageContent = dynamic(() => import('./_wip/dashboard-page'), { ssr: false });

export default function DashboardPage() {
  if (!dashboardEnabled) {
    return <FeatureComingSoon title="Дашборд проекта" />;
  }

  return <DashboardPageContent />;
}
