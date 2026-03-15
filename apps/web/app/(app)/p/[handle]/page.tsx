import { notFound } from 'next/navigation';
import PerformerPublicCard from '@/components/performers/PerformerPublicCard';
import { getCurrentUser } from '@/lib/auth/session';
import { listPublicAuthorPublicationsByUserId } from '@/lib/marketplace/author-publications';
import { getCatalogAuthorPublications, getMarketplaceSellerByHandle } from '@/lib/marketplace/data';
import type { MarketplaceSeller } from '@/lib/marketplace/types';
import {
  organizationsRepository,
  performerCasesRepository,
  performerPortfolioRepository,
  performerProfilesRepository,
  performerRatingsRepository,
  usersRepository
} from '@collabverse/api';

type PerformerPublicPageProps = {
  params: { handle: string };
};

type PerformerProfilePayload = {
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

type PortfolioPayload = {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  fileUrl: string | null;
  projectId: string | null;
  order: number | null;
  createdAt: string;
};

type CasePayload = {
  id: string;
  title: string;
  description: string | null;
  outcome: string | null;
  projectId: string | null;
  createdAt: string;
};

type ReviewPayload = {
  id: string;
  rating: number;
  review: string | null;
  createdAt: string;
  raterName: string | null;
  projectId: string | null;
};

const ACTIVE_ORG_ROLES = new Set(['owner', 'admin']);

type AuthorProfileRecord = Awaited<ReturnType<typeof performerProfilesRepository.findPublicByHandleOrUserId>>;

function toIsoDate(value?: Date | string | null): string {
  if (!value) {
    return new Date().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return new Date(value).toISOString();
}

function buildCatalogFallbackProfile(seller: MarketplaceSeller): PerformerProfilePayload {
  return {
    userId: `catalog-demo:${seller.handle}`,
    handle: seller.handle,
    specialization: 'Автор каталога',
    skills: [],
    bio: seller.headline,
    rate: null,
    employmentType: null,
    location: seller.location,
    timezone: null,
    languages: [],
    workFormats: [],
    portfolioEnabled: false,
    isPublic: true,
    user: {
      name: seller.name,
      image: seller.avatarUrl
    }
  };
}

function buildAuthorShellProfile(authorProfile: NonNullable<AuthorProfileRecord>, seller: MarketplaceSeller | null): PerformerProfilePayload {
  return {
    userId: authorProfile.userId,
    handle: authorProfile.handle ?? seller?.handle ?? null,
    specialization: 'Автор каталога',
    skills: [],
    bio: seller?.headline ?? null,
    rate: null,
    employmentType: null,
    location: seller?.location ?? null,
    timezone: null,
    languages: [],
    workFormats: [],
    portfolioEnabled: false,
    isPublic: false,
    user: {
      name: seller?.name ?? authorProfile.user.name ?? null,
      image: seller?.avatarUrl ?? authorProfile.user.image ?? null
    }
  };
}

export const dynamic = 'force-dynamic';

export default async function PerformerPublicPage({ params }: PerformerPublicPageProps) {
  const publicProfile = await performerProfilesRepository.findPublicByHandleOrUserId(params.handle);
  const authorProfile = publicProfile ?? (await performerProfilesRepository.findByHandle(params.handle));
  const catalogAuthor = getMarketplaceSellerByHandle(params.handle);
  const realAuthorSolutions = authorProfile ? await listPublicAuthorPublicationsByUserId(authorProfile.userId) : [];
  const catalogAuthorSolutions =
    realAuthorSolutions.length > 0 ? realAuthorSolutions : getCatalogAuthorPublications(params.handle);

  if (!authorProfile && !catalogAuthor) {
    notFound();
  }

  if (!publicProfile) {
    const fallbackSolutions = catalogAuthorSolutions;

    if (authorProfile && (catalogAuthor || fallbackSolutions.length > 0)) {
      return (
        <div className="space-y-6">
          <PerformerPublicCard
            profile={buildAuthorShellProfile(authorProfile, catalogAuthor)}
            authorSolutions={fallbackSolutions}
            portfolio={[]}
            cases={[]}
            ratingSummary={{ average: 0, count: 0 }}
            reviews={[]}
            canInvite={false}
            canReview={false}
          />
        </div>
      );
    }

    if (catalogAuthor) {
      return (
        <div className="space-y-6">
          <PerformerPublicCard
            profile={buildCatalogFallbackProfile(catalogAuthor)}
            authorSolutions={fallbackSolutions}
            portfolio={[]}
            cases={[]}
            ratingSummary={{ average: 0, count: 0 }}
            reviews={[]}
            canInvite={false}
            canReview={false}
          />
        </div>
      );
    }

    notFound();
  }

  const resolvedProfile = publicProfile;

  const [portfolioItems, caseItems, ratings] = await Promise.all([
    performerPortfolioRepository.listByPerformer(resolvedProfile.userId),
    performerCasesRepository.listByPerformer(resolvedProfile.userId),
    performerRatingsRepository.listByPerformer(resolvedProfile.userId)
  ]);

  const ratingCount = ratings.length;
  const ratingTotal = ratings.reduce((sum, rating) => sum + rating.rating, 0);
  const ratingAverage = ratingCount > 0 ? ratingTotal / ratingCount : 0;

  const raterIds = Array.from(new Set(ratings.map((rating) => rating.raterId)));
  const raterEntries = await Promise.all(
    raterIds.map(async (raterId) => [raterId, await usersRepository.findById(raterId)] as const)
  );
  const raterMap = new Map<string, string | null>();
  for (const [raterId, rater] of raterEntries) {
    if (rater) {
      raterMap.set(raterId, rater.name ?? null);
    }
  }

  const user = await getCurrentUser();
  let canInvite = false;
  let canReview = false;

  if (user?.id) {
    canReview = user.id !== resolvedProfile.userId;
    const memberships = await organizationsRepository.listMembershipsForUser(user.id);
    canInvite = memberships.some((membership) => {
      const member = membership.member;
      return member.status === 'active' && ACTIVE_ORG_ROLES.has(member.role);
    });
  }

  const profilePayload: PerformerProfilePayload = {
    userId: resolvedProfile.userId,
    handle: resolvedProfile.handle ?? null,
    specialization: resolvedProfile.specialization ?? null,
    skills: Array.isArray(resolvedProfile.skills) ? resolvedProfile.skills.filter((item): item is string => typeof item === 'string') : [],
    bio: resolvedProfile.bio ?? null,
    rate: resolvedProfile.rate ?? null,
    employmentType: resolvedProfile.employmentType ?? null,
    location: resolvedProfile.location ?? null,
    timezone: resolvedProfile.timezone ?? null,
    languages: Array.isArray(resolvedProfile.languages) ? resolvedProfile.languages : [],
    workFormats: Array.isArray(resolvedProfile.workFormats) ? resolvedProfile.workFormats : [],
    portfolioEnabled: resolvedProfile.portfolioEnabled ?? false,
    isPublic: resolvedProfile.isPublic ?? false,
    user: {
      name: resolvedProfile.user.name ?? null,
      image: resolvedProfile.user.image ?? null
    }
  };

  const authorSolutions = catalogAuthorSolutions;

  const portfolioPayload: PortfolioPayload[] = portfolioItems.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description ?? null,
    url: item.url ?? null,
    fileUrl: item.fileUrl ?? null,
    projectId: item.projectId ?? null,
    order: item.order ?? null,
    createdAt: toIsoDate(item.createdAt)
  }));

  const casePayload: CasePayload[] = caseItems.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description ?? null,
    outcome: item.outcome ?? null,
    projectId: item.projectId ?? null,
    createdAt: toIsoDate(item.createdAt)
  }));

  const reviews: ReviewPayload[] = ratings.map((rating) => ({
    id: rating.id,
    rating: rating.rating,
    review: rating.review ?? null,
    createdAt: toIsoDate(rating.createdAt),
    raterName: raterMap.get(rating.raterId) ?? null,
    projectId: rating.projectId ?? null
  }));

  return (
    <div className="space-y-6">
      <PerformerPublicCard
        profile={profilePayload}
        authorSolutions={authorSolutions}
        portfolio={portfolioPayload}
        cases={casePayload}
        ratingSummary={{ average: ratingAverage, count: ratingCount }}
        reviews={reviews}
        canInvite={canInvite}
        canReview={canReview}
      />
    </div>
  );
}
