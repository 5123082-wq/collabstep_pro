import type { MarketplaceTemplate } from '@/lib/marketplace/types';
import { ContentBlock } from '@/components/ui/content-block';

const categoryLabels: Record<string, string> = {
  logo: 'Логотипы',
  landing: 'Лендинги',
  ui_kit: 'UI-киты',
  presentation: 'Презентации'
};

export default function TemplateMetaGrid({ template }: { template: MarketplaceTemplate }) {
  return (
    <ContentBlock as="section" size="sm" className="grid gap-6 sm:grid-cols-2">
      <div>
        <p className="text-xs uppercase tracking-[0.32em] text-neutral-500">Категория</p>
        <p className="text-base font-semibold text-neutral-100">{categoryLabels[template.category]}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.32em] text-neutral-500">Совместимость</p>
        <p className="text-sm text-neutral-300">{template.compatibility.join(', ')}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.32em] text-neutral-500">Рейтинг</p>
        <p className="text-base font-semibold text-neutral-100">
          {template.rating.toFixed(1)} ★
          <span className="ml-2 text-sm font-normal text-neutral-500">({template.ratingCount} оценок)</span>
        </p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.32em] text-neutral-500">Продажи</p>
        <p className="text-base font-semibold text-neutral-100">{template.salesCount}</p>
      </div>
    </ContentBlock>
  );
}
