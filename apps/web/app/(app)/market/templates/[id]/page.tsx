import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { templates, getTemplateById, getTemplatesByCategory } from '@/lib/marketplace/data';
import TemplatePurchaseActions from '@/components/marketplace/templates/TemplatePurchaseActions';
import TemplateFileList from '@/components/marketplace/templates/TemplateFileList';
import TemplateMetaGrid from '@/components/marketplace/templates/TemplateMetaGrid';

export async function generateStaticParams() {
  return templates.map((template) => ({ id: template.id }));
}

type TemplateDetailPageProps = {
  params: { id: string };
};

export function generateMetadata({ params }: TemplateDetailPageProps): Metadata {
  const template = getTemplateById(params.id);
  if (!template) {
    return {
      title: 'Шаблон не найден — Collabverse Market'
    };
  }

  return {
    title: `${template.title} — Collabverse Market`,
    description: template.description,
    openGraph: {
      title: `${template.title} — Collabverse Market`,
      description: template.description,
      images: template.gallery.slice(0, 1).map((url) => ({ url })),
      url: `/market/templates/${template.id}`
    }
  } satisfies Metadata;
}

export default function TemplateDetailPage({ params }: TemplateDetailPageProps) {
  const template = getTemplateById(params.id);

  if (!template) {
    notFound();
  }

  const related = getTemplatesByCategory(template.category, template.id).slice(0, 4);

  return (
    <div className="space-y-12">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-8">
          <header className="space-y-4">
            <h1 className="text-xl font-semibold text-neutral-50">{template.title}</h1>
            <p className="text-sm text-neutral-400">{template.description}</p>
          </header>
          <div className="cs-auto-grid gap-4">
            {template.gallery.map((image) => (
              <div key={image} className="relative aspect-video overflow-hidden rounded-2xl border border-neutral-800/80">
                <Image src={image} alt={template.title} fill className="object-cover" sizes="(min-width: 1280px) 480px, 100vw" />
              </div>
            ))}
          </div>
          <TemplateMetaGrid template={template} />
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Описание</h2>
            <p className="text-neutral-300">{template.description}</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-400">
              {template.requirements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
          <TemplateFileList files={template.files} />
        </section>
        <aside className="space-y-6 rounded-2xl border border-neutral-800/80 bg-neutral-900/60 p-6">
          <TemplatePurchaseActions template={template} />
          <div className="space-y-3 text-sm text-neutral-400">
            <p>
              После оплаты шаблон появится в ваших заказах. Файлы будут доступны по защищённым ссылкам в течение
              72 часов.
            </p>
            <p>
              Для совместной работы можно добавить шаблон в существующий проект и поделиться доступом с командой.
            </p>
          </div>
        </aside>
      </div>
      {related.length > 0 ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-neutral-100">Похожие шаблоны</h2>
            <Link
              href={`/market/templates?category=${template.category}`}
              className="text-sm font-medium text-indigo-300 transition hover:text-indigo-200"
            >
              Смотреть все
            </Link>
          </div>
          <div className="cs-auto-grid gap-4">
            {related.map((item) => (
              <Link
                key={item.id}
                href={`/market/templates/${item.id}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-900/40 transition hover:border-neutral-700"
              >
                <div className="relative aspect-video">
                  <Image
                    src={item.previewUrl}
                    alt={item.title}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="(min-width: 1280px) 260px, 100vw"
                  />
                </div>
                <div className="space-y-2 p-4">
                  <h3 className="line-clamp-2 text-sm font-semibold text-neutral-100">{item.title}</h3>
                  <p className="text-xs text-neutral-500">{item.rating.toFixed(1)} ★ · {item.salesCount} продаж</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
