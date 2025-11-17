'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { MarketplaceTemplate, MarketplaceCategory } from '@/lib/marketplace/types';
import TemplateCard from './TemplateCard';
import TemplatesToolbar from './TemplatesToolbar';
import TemplatesSkeleton from './TemplatesSkeleton';
import EmptyTemplatesState from './EmptyTemplatesState';
import TemplateDetailModal from './TemplateDetailModal';

const CATEGORY_LABELS: Record<MarketplaceCategory, string> = {
  logo: 'Логотипы',
  landing: 'Лендинги',
  ui_kit: 'UI-киты',
  presentation: 'Презентации'
};

type TemplatesCatalogProps = {
  templates: MarketplaceTemplate[];
};

type SortKey = 'featured' | 'price_asc' | 'price_desc' | 'rating_desc';

function sortTemplates(templates: MarketplaceTemplate[], sort: SortKey) {
  switch (sort) {
    case 'price_asc':
      return [...templates].sort((a, b) => a.price - b.price);
    case 'price_desc':
      return [...templates].sort((a, b) => b.price - a.price);
    case 'rating_desc':
      return [...templates].sort((a, b) => b.rating - a.rating);
    default:
      return templates;
  }
}

function filterTemplates(
  templates: MarketplaceTemplate[],
  query: string,
  category: MarketplaceCategory | 'all'
) {
  const normalizedQuery = query.trim().toLowerCase();

  return templates.filter((template) => {
    const matchesCategory = category === 'all' ? true : template.category === category;
    const matchesQuery =
      normalizedQuery.length === 0 ||
      template.title.toLowerCase().includes(normalizedQuery) ||
      template.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery));

    return matchesCategory && matchesQuery;
  });
}

export default function TemplatesCatalog({ templates }: TemplatesCatalogProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<MarketplaceCategory | 'all'>('all');
  const [sort, setSort] = useState<SortKey>('featured');
  const [isLoading, setIsLoading] = useState(true);
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const q = searchParams.get('q');
    const cat = searchParams.get('category');
    const sortParam = searchParams.get('sort') as SortKey | null;

    if (q) {
      setQuery(q);
    }

    if (cat && ['logo', 'landing', 'ui_kit', 'presentation'].includes(cat)) {
      setCategory(cat as MarketplaceCategory);
    }

    if (sortParam && ['featured', 'price_asc', 'price_desc', 'rating_desc'].includes(sortParam)) {
      setSort(sortParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const timeout = setTimeout(() => setIsLoading(false), 200);
    return () => clearTimeout(timeout);
  }, [templates]);

  const filtered = useMemo(() => {
    const filteredTemplates = filterTemplates(templates, query, category);
    return sortTemplates(filteredTemplates, sort);
  }, [templates, query, category, sort]);

  const handleSearchChange = (value: string) => {
    setQuery(value);
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set('q', value);
    } else {
      params.delete('q');
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleCategoryChange = (value: MarketplaceCategory | 'all') => {
    setCategory(value);
    const params = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
      params.set('category', value);
    } else {
      params.delete('category');
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleSortChange = (value: SortKey) => {
    setSort(value);
    const params = new URLSearchParams(searchParams);
    if (value && value !== 'featured') {
      params.set('sort', value);
    } else {
      params.delete('sort');
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleResetFilters = () => {
    setQuery('');
    setCategory('all');
    setSort('featured');
    router.replace(pathname, { scroll: false });
  };

  const totalCount = filtered.length;

  return (
    <>
      <div className="space-y-6">
        <TemplatesToolbar
          query={query}
          onQueryChange={handleSearchChange}
          category={category}
          onCategoryChange={handleCategoryChange}
          sort={sort}
          onSortChange={handleSortChange}
          totalCount={totalCount}
          categoryLabels={CATEGORY_LABELS}
        />
        {isLoading ? (
          <TemplatesSkeleton />
        ) : totalCount === 0 ? (
          <EmptyTemplatesState onReset={handleResetFilters} />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        )}
      </div>
      <TemplateDetailModal />
    </>
  );
}
