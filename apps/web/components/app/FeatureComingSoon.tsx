import { ContentBlock } from '@/components/ui/content-block';

type FeatureComingSoonProps = {
  title: string;
  description?: string;
};

export function FeatureComingSoon({ title, description }: FeatureComingSoonProps) {
  return (
    <ContentBlock variant="dashed" className="flex min-h-[240px] flex-col items-center justify-center gap-4 p-8 text-center text-neutral-400">
      <p className="text-sm font-medium text-neutral-200">Функция «{title}» скоро появится</p>
      {description ? <p className="max-w-2xl text-sm text-neutral-500">{description}</p> : null}
    </ContentBlock>
  );
}

