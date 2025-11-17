import type { CSSProperties, ReactNode } from 'react';
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';

type MarketingCardProps = {
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  accent?: 'primary' | 'neutral';
  columns?: 1 | 2 | 3 | 4;
};

export default function MarketingCard({
  title,
  description,
  children,
  footer,
  accent = 'neutral',
  columns = 1
}: MarketingCardProps) {
  const minWidthByColumns: Record<1 | 2 | 3 | 4, string> = {
    1: '100%',
    2: '320px',
    3: '280px',
    4: '220px'
  };

  const gridStyle = {
    '--cs-grid-min': minWidthByColumns[columns],
    '--cs-grid-gap': '12px'
  } as CSSProperties;

  return (
    <ContentBlock
      variant={accent === 'primary' ? 'primary' : 'default'}
      header={
        <ContentBlockTitle description={description}>
          {title}
        </ContentBlockTitle>
      }
      footer={footer ? <div className="text-xs text-[color:var(--text-tertiary)]">{footer}</div> : undefined}
    >
      {children ? (
        <div className="cs-auto-grid" style={gridStyle}>
          {children}
        </div>
      ) : null}
    </ContentBlock>
  );
}
