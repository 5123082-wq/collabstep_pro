'use client';

import { useMemo, useState } from 'react';
import { ContentBlock, ContentBlockTitle } from '@/components/ui/content-block';
import { Button } from '@/components/ui/button';
import { InvitePerformerModal } from '@/components/performers/InvitePerformerModal';
import { PerformerRating } from '@/components/performers/PerformerRating';
import { PerformerReviewForm } from '@/components/performers/PerformerReviewForm';

type PerformerPublicProfile = {
  userId: string;
  handle: string | null;
  specialization: string | null;
  skills: string[];
  bio: string | null;
  rate: number | null;
  employmentType: string | null;
  location: string | null;
  timezone: string | null;
  languages: string[];
  workFormats: string[];
  portfolioEnabled: boolean;
  isPublic: boolean;
  user: { name: string | null; image: string | null };
};

type PortfolioItem = {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  fileUrl: string | null;
  projectId: string | null;
  order: number | null;
  createdAt: string;
};

type CaseItem = {
  id: string;
  title: string;
  description: string | null;
  outcome: string | null;
  projectId: string | null;
  createdAt: string;
};

type ReviewItem = {
  id: string;
  rating: number;
  review: string | null;
  createdAt: string;
  raterName: string | null;
  projectId: string | null;
};

type PerformerPublicCardProps = {
  profile: PerformerPublicProfile;
  portfolio: PortfolioItem[];
  cases: CaseItem[];
  ratingSummary: { average: number; count: number };
  reviews: ReviewItem[];
  canInvite: boolean;
  canReview: boolean;
};

const WORK_FORMAT_LABEL: Record<string, string> = {
  remote: 'Удаленно',
  office: 'В офисе',
  hybrid: 'Гибрид'
};

const EMPLOYMENT_LABEL: Record<string, string> = {
  fulltime: 'Полная занятость',
  parttime: 'Частичная занятость',
  contract: 'Проектная работа'
};

function formatRate(rate: number | null): string {
  if (!rate || rate <= 0) {
    return 'Не указана';
  }
  return `${rate.toLocaleString('ru-RU')} USD/час`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function PerformerPublicCard({
  profile,
  portfolio,
  cases,
  ratingSummary,
  reviews,
  canInvite,
  canReview
}: PerformerPublicCardProps) {
  const [isInviteOpen, setInviteOpen] = useState(false);

  const skills = useMemo(() => (profile.skills.length ? profile.skills : ['Навыки не указаны']), [profile.skills]);
  const languages = useMemo(() => (profile.languages.length ? profile.languages : ['Не указано']), [profile.languages]);
  const workFormats = useMemo(() => {
    if (profile.workFormats.length === 0) {
      return ['remote'];
    }
    return profile.workFormats;
  }, [profile.workFormats]);

  const displayEmployment = profile.employmentType ? (EMPLOYMENT_LABEL[profile.employmentType] ?? profile.employmentType) : 'Не указано';
  const displayName = profile.user.name ?? 'Исполнитель';
  const displayHandle = profile.handle ? `@${profile.handle}` : null;

  return (
    <div className="space-y-6">
      <ContentBlock
        as="section"
        header={
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-indigo-300">Публичная визитка</p>
              <h1 className="mt-2 text-2xl font-semibold text-neutral-50">{displayName}</h1>
              {profile.specialization ? (
                <p className="mt-1 text-sm text-neutral-300">{profile.specialization}</p>
              ) : null}
              {displayHandle ? (
                <p className="mt-1 text-xs text-neutral-500">{displayHandle}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {canInvite ? (
                <Button variant="trendy" onClick={() => setInviteOpen(true)}>
                  Пригласить в команду
                </Button>
              ) : null}
            </div>
          </div>
        }
      >
        <div className="flex flex-wrap gap-2 text-xs text-neutral-400">
          {skills.map((skill) => (
            <span key={skill} className="rounded-full border border-indigo-500/40 bg-indigo-500/10 px-3 py-1 text-indigo-100">
              {skill}
            </span>
          ))}
        </div>
        {profile.bio ? <p className="mt-4 text-sm text-neutral-300">{profile.bio}</p> : null}
      </ContentBlock>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <ContentBlock
            as="section"
            header={<ContentBlockTitle as="h2">Портфолио</ContentBlockTitle>}
          >
            {!profile.portfolioEnabled ? (
              <p className="text-sm text-neutral-400">Портфолио скрыто владельцем профиля.</p>
            ) : portfolio.length === 0 ? (
              <p className="text-sm text-neutral-400">В портфолио пока нет работ.</p>
            ) : (
              <div className="space-y-4">
                {portfolio.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-neutral-900 bg-neutral-950/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-neutral-100">{item.title}</h3>
                      <span className="text-xs text-neutral-500">{formatDate(item.createdAt)}</span>
                    </div>
                    {item.description ? <p className="mt-2 text-sm text-neutral-300">{item.description}</p> : null}
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-indigo-200">
                      {item.url ? (
                        <a href={item.url} className="hover:text-indigo-100" target="_blank" rel="noreferrer">
                          Ссылка на проект
                        </a>
                      ) : null}
                      {item.fileUrl ? (
                        <a href={item.fileUrl} className="hover:text-indigo-100" target="_blank" rel="noreferrer">
                          Файл
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ContentBlock>

          <ContentBlock
            as="section"
            header={<ContentBlockTitle as="h2">Кейсы</ContentBlockTitle>}
          >
            {cases.length === 0 ? (
              <p className="text-sm text-neutral-400">Кейсы пока не добавлены.</p>
            ) : (
              <div className="space-y-4">
                {cases.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-neutral-900 bg-neutral-950/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-neutral-100">{item.title}</h3>
                      <span className="text-xs text-neutral-500">{formatDate(item.createdAt)}</span>
                    </div>
                    {item.description ? <p className="mt-2 text-sm text-neutral-300">{item.description}</p> : null}
                    {item.outcome ? <p className="mt-2 text-xs text-neutral-500">Результат: {item.outcome}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </ContentBlock>

          <PerformerRating average={ratingSummary.average} count={ratingSummary.count} reviews={reviews} />

          {canReview ? (
            <ContentBlock
              as="section"
              header={<ContentBlockTitle as="h2">Оставить отзыв</ContentBlockTitle>}
            >
              <PerformerReviewForm performerId={profile.userId} />
            </ContentBlock>
          ) : null}
        </div>

        <aside className="space-y-6">
          <ContentBlock as="section" size="sm" header={<ContentBlockTitle as="h2">Условия</ContentBlockTitle>}>
            <dl className="space-y-3 text-sm text-neutral-300">
              <div className="flex justify-between gap-3">
                <dt className="text-neutral-400">Ставка</dt>
                <dd className="text-right text-neutral-100">{formatRate(profile.rate)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-neutral-400">Занятость</dt>
                <dd className="text-right text-neutral-100">{displayEmployment}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-neutral-400">Локация</dt>
                <dd className="text-right text-neutral-100">{profile.location ?? 'Не указана'}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-neutral-400">Часовой пояс</dt>
                <dd className="text-right text-neutral-100">{profile.timezone ?? 'UTC'}</dd>
              </div>
            </dl>
          </ContentBlock>

          <ContentBlock as="section" size="sm" header={<ContentBlockTitle as="h2">Языки</ContentBlockTitle>}>
            <div className="flex flex-wrap gap-2 text-xs text-neutral-200">
              {languages.map((language) => (
                <span key={language} className="rounded-full border border-neutral-800 bg-neutral-900/70 px-3 py-1">
                  {language}
                </span>
              ))}
            </div>
          </ContentBlock>

          <ContentBlock as="section" size="sm" header={<ContentBlockTitle as="h2">Форматы работы</ContentBlockTitle>}>
            <div className="flex flex-wrap gap-2 text-xs text-neutral-200">
              {workFormats.map((format) => (
                <span key={format} className="rounded-full border border-neutral-800 bg-neutral-900/70 px-3 py-1">
                  {WORK_FORMAT_LABEL[format] ?? format}
                </span>
              ))}
            </div>
          </ContentBlock>
        </aside>
      </div>

      <InvitePerformerModal
        open={isInviteOpen}
        onOpenChange={setInviteOpen}
        performer={{ id: profile.userId, name: displayName }}
      />
    </div>
  );
}
