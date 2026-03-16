import { getCurrentUser } from '@/lib/auth/session';
import { MARKETPLACE_PUBLICATION_RUNTIME_ENABLED, listManagedAuthorPublications } from '@/lib/marketplace/author-publications';
import MarketSellerClient from '@/components/marketplace/author/MarketSellerClient';
import { performerProfilesRepository } from '@collabverse/api';

export const dynamic = 'force-dynamic';

export default async function MarketSellerPage() {
  const user = await getCurrentUser();
  if (!user?.id) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-neutral-50">Мои публикации</h1>
            <p className="text-sm text-neutral-400">Нужна активная сессия автора, чтобы открыть кабинет публикаций.</p>
          </div>
        </div>
      </div>
    );
  }

  const [profile, items] = await Promise.all([
    performerProfilesRepository.findByUserId(user.id),
    listManagedAuthorPublications(user.id)
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-50">Мои публикации</h1>
          <p className="text-sm text-neutral-400">
            Единый кабинет автора для PM-публикаций, шаблонов и услуг. PM-публикации теперь управляются по author entity, а team-owned items не подмешиваются в person-route `/p/:handle`.
          </p>
        </div>
      </div>
      {!MARKETPLACE_PUBLICATION_RUNTIME_ENABLED ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Publication-layer временно отключён, пока PM listings и author publications не переведены на БД.
        </div>
      ) : null}
      <MarketSellerClient
        authorHandle={profile?.handle ?? null}
        authorProfilePublic={profile?.isPublic ?? false}
        items={items}
      />
    </div>
  );
}
