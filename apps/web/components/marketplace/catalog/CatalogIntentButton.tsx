'use client';

import { useState } from 'react';
import clsx from 'clsx';
import CatalogApplyModal from './CatalogApplyModal';
import CatalogInquiryModal from './CatalogInquiryModal';
import type { CatalogSourceKind } from '@/lib/marketplace/types';

type CatalogIntentVariant = 'primary' | 'secondary' | 'ghost';

type CatalogIntentButtonBaseProps = {
  sourceId: string;
  sourceTitle: string;
  label: string;
  className?: string;
  variant?: CatalogIntentVariant;
};

type CatalogProjectIntentButtonProps = CatalogIntentButtonBaseProps & {
  intent: 'project';
  sourceKind: 'template' | 'solution';
};

type CatalogAdaptationIntentButtonProps = CatalogIntentButtonBaseProps & {
  intent: 'adaptation';
  sourceKind: CatalogSourceKind;
};

type CatalogIntentButtonProps = CatalogProjectIntentButtonProps | CatalogAdaptationIntentButtonProps;

const VARIANT_STYLES: Record<CatalogIntentVariant, string> = {
  primary:
    'bg-indigo-500 text-white hover:bg-indigo-400 focus-visible:outline-indigo-300',
  secondary:
    'border border-neutral-700 bg-neutral-950/70 text-neutral-100 hover:border-neutral-500 hover:text-neutral-50 focus-visible:outline-indigo-300',
  ghost:
    'border border-transparent bg-transparent text-neutral-300 hover:border-neutral-800 hover:bg-neutral-900/70 hover:text-neutral-100 focus-visible:outline-indigo-300'
};

export default function CatalogIntentButton({
  intent,
  sourceKind,
  sourceId,
  sourceTitle,
  label,
  className,
  variant = 'primary'
}: CatalogIntentButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={clsx(
          'rounded-xl px-4 py-2 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
          VARIANT_STYLES[variant],
          className
        )}
      >
        {label}
      </button>

      {intent === 'project' ? (
        <CatalogApplyModal
          open={open}
          onOpenChange={setOpen}
          sourceKind={sourceKind}
          sourceId={sourceId}
          sourceTitle={sourceTitle}
        />
      ) : (
        <CatalogInquiryModal
          open={open}
          onOpenChange={setOpen}
          sourceKind={sourceKind}
          sourceId={sourceId}
          sourceTitle={sourceTitle}
        />
      )}
    </>
  );
}
