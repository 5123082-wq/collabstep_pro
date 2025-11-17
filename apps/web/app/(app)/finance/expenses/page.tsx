import FinanceExpensesPageClient from './page-client';

type FinanceExpensesPageProps = {
  searchParams: Record<string, string | string[] | undefined>;
};

export default function FinanceExpensesPage({ searchParams }: FinanceExpensesPageProps) {
  return <FinanceExpensesPageClient searchParams={searchParams} />;
}
