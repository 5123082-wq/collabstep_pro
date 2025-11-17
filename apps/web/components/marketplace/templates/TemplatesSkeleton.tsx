import { ContentBlock } from '@/components/ui/content-block';

export default function TemplatesSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <ContentBlock
          key={index}
          size="sm"
          className="flex flex-col gap-4 p-5"
        >
          <div className="aspect-[4/3] w-full animate-pulse rounded-xl bg-neutral-800/70" />
          <div className="h-4 w-24 animate-pulse rounded bg-neutral-800/60" />
          <div className="h-5 w-3/4 animate-pulse rounded bg-neutral-800/60" />
          <div className="h-5 w-2/3 animate-pulse rounded bg-neutral-800/60" />
          <div className="mt-auto flex gap-3">
            <div className="h-10 w-full animate-pulse rounded-xl bg-neutral-800/60" />
            <div className="h-10 w-16 animate-pulse rounded-xl bg-neutral-800/60" />
          </div>
        </ContentBlock>
      ))}
    </div>
  );
}
