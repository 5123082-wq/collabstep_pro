import { getCurrentUser } from '@/lib/auth/session';
import {
  MARKETPLACE_PUBLICATION_RUNTIME_ENABLED,
  listManagedAuthorPublications,
  listPublishableProjectSources,
  listPublishableTemplateSources
} from '@/lib/marketplace/author-publications';
import MarketPublishClient from '@/components/marketplace/author/MarketPublishClient';
import { performerProfilesRepository } from '@collabverse/api';

export const dynamic = 'force-dynamic';

export default async function MarketPublishPage() {
  const user = await getCurrentUser();
  if (!user?.id) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-neutral-50">Опубликовать в каталог</h1>
            <p className="text-sm text-neutral-400">Для управления публикациями нужна активная авторская сессия.</p>
          </div>
        </div>
      </div>
    );
  }

  const [profile, projectSources, templateSources, existingPublications] = await Promise.all([
    performerProfilesRepository.findByUserId(user.id),
    listPublishableProjectSources(user.id),
    listPublishableTemplateSources(user.id),
    listManagedAuthorPublications(user.id)
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-neutral-50">Опубликовать в каталог</h1>
          <p className="text-sm text-neutral-400">
            Управляемый C3 publish-flow: проекты, шаблоны и услуги получают отдельный publication-layer, а PM авторство теперь определяется по owner-vs-team contract.
          </p>
        </div>
      </div>
      {!MARKETPLACE_PUBLICATION_RUNTIME_ENABLED ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          Publication-layer временно отключён, пока PM listings и author publications не переведены на БД.
        </div>
      ) : null}
      <MarketPublishClient
        authorHandle={profile?.handle ?? null}
        authorProfilePublic={profile?.isPublic ?? false}
        projectSources={projectSources}
        templateSources={templateSources}
        existingPublicationsCount={existingPublications.length}
      />
    </div>
  );
}
