import { notFound } from 'next/navigation';
import VacancyDetail from '@/components/marketplace/VacancyDetail';
import type { Vacancy } from '@/lib/schemas/marketplace-vacancy';

type VacancyDetailPageProps = {
  params: { id: string };
};

export default function PerformersVacancyDetailPage({ params }: VacancyDetailPageProps) {
  // TODO: Подключить к реальному API вакансий
  const items: Vacancy[] = [];
  const vacancy = items.find((item) => item.id === params.id || item.slug === params.id);

  if (!vacancy) {
    notFound();
  }

  // TODO: Получить полные данные вакансии из API
  return <VacancyDetail vacancy={vacancy} />;
}

export function generateStaticParams() {
  // TODO: Подключить к реальному API для генерации статических параметров
  return [];
}
