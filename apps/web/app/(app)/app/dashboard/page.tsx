import dynamic from 'next/dynamic';
import { FeatureComingSoon } from '@/components/app/FeatureComingSoon';
import { isFeatureEnabled } from '@/lib/feature-flags';

const workspaceDashboardEnabled = isFeatureEnabled('workspaceDashboard');
const projectDashboardEnabled = isFeatureEnabled('projectDashboard');
const DashboardPageContent = dynamic(() => import('./_wip/dashboard-page'), { ssr: false });

export default function DashboardPage() {
  if (!workspaceDashboardEnabled) {
    if (projectDashboardEnabled) {
      return <FeatureComingSoon title="Дашборд проекта" />;
    }

    return <FeatureComingSoon title="Рабочий стол" />;
  }

  return <DashboardPageContent />;
}
