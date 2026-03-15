'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMarketplaceStore } from '@/lib/marketplace/store';
import { getTemplateById } from '@/lib/marketplace/data';
import TemplatePurchaseActions from './TemplatePurchaseActions';
import TemplateFileList from './TemplateFileList';
import TemplateMetaGrid from './TemplateMetaGrid';
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';
import LargeContentModal from '@/components/ui/large-content-modal';

export default function TemplateDetailModal() {
  const selectedTemplateId = useMarketplaceStore((state) => state.selectedTemplateId);
  const closeTemplateDetail = useMarketplaceStore((state) => state.closeTemplateDetail);

  const template = selectedTemplateId ? getTemplateById(selectedTemplateId) : null;
  const isOpen = !!selectedTemplateId;

  if (!template || !isOpen) {
    return null;
  }

  return (
    <LargeContentModal isOpen={isOpen} onClose={closeTemplateDetail}>
      <div className="grid gap-8 p-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:gap-12 xl:p-8">
          <section className="space-y-6">
            <header className="space-y-3">
              <h1 className="text-2xl font-semibold text-neutral-50">{template.title}</h1>
              <p className="text-sm text-neutral-400">{template.description}</p>
              <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/60 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-neutral-500">Автор</p>
                <Link href={`/p/${template.seller.handle}`} className="mt-2 block text-base font-semibold text-neutral-100 transition hover:text-indigo-300">
                  {template.seller.name}
                </Link>
                <p className="mt-1 text-sm text-neutral-400">{template.seller.headline}</p>
              </div>
            </header>
            <div className="grid gap-3 sm:grid-cols-2">
              {template.gallery.map((image) => (
                <div
                  key={image}
                  className="relative aspect-video overflow-hidden rounded-2xl border border-neutral-800/80"
                >
                  <Image
                    src={image}
                    alt={template.title}
                    fill
                    className="object-cover"
                    sizes="(min-width: 1280px) 480px, 100vw"
                  />
                </div>
              ))}
            </div>
            <TemplateMetaGrid template={template} />
            <ContentBlock
              as="section"
              header={<ContentBlockTitle>Описание</ContentBlockTitle>}
            >
              <p className="text-neutral-300">{template.description}</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-neutral-400">
                {template.requirements.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </ContentBlock>
            <TemplateFileList files={template.files} />
          </section>
          <ContentBlock as="aside" size="sm" className="space-y-6">
            <TemplatePurchaseActions template={template} />
            <div className="space-y-3 text-sm text-neutral-400">
              <p>
                Поверхность шаблона теперь ведёт в reuse-flow: сначала оценка решения, затем сохранение, отправка в проект или запрос на адаптацию.
              </p>
              <p>
                Корзина и оформление остаются вторичным сценарием и не заменяют связь шаблона с проектным контуром.
              </p>
            </div>
          </ContentBlock>
      </div>
    </LargeContentModal>
  );
}
