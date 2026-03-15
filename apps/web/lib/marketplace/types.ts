export type MarketplaceCategory = 'logo' | 'landing' | 'ui_kit' | 'presentation';

export type MarketplaceFile = {
  name: string;
  size: string;
  mime: string;
};

export type MarketplaceSeller = {
  id: string;
  handle: string;
  name: string;
  avatarUrl: string;
  portfolioCount: number;
  headline: string;
  location: string;
};

export type CatalogDemoMetrics = {
  likes: number;
  views: number;
  uses: number;
};

export type CatalogAuthorPublicationKind = 'template' | 'solution' | 'service';
export type CatalogSourceKind = CatalogAuthorPublicationKind;

export type CatalogAuthorPublication = {
  id: string;
  sourceId: string;
  kind: CatalogAuthorPublicationKind;
  title: string;
  description: string;
  href: string;
  tags: string[];
  meta: string;
};

export type MarketplaceInquiry = {
  id: string;
  sourceKind: CatalogSourceKind;
  sourceId: string;
  sourceTitle: string;
  brief: string;
  desiredOutcome: string;
  linkedProjectId?: string;
  linkedProjectTitle?: string;
  createdAt: string;
};

export type TemplatePricingType = 'free' | 'subscription' | 'paid';

export type MarketplaceTemplate = {
  id: string;
  title: string;
  description: string;
  category: MarketplaceCategory;
  price: number;
  pricingType: TemplatePricingType;
  subscriptionTier?: string;
  rating: number;
  ratingCount: number;
  salesCount: number;
  seller: MarketplaceSeller;
  previewUrl: string;
  gallery: string[];
  videoUrl?: string;
  license: string;
  compatibility: string[];
  requirements: string[];
  files: MarketplaceFile[];
  tags: string[];
};

export type CatalogSpotlightKind = 'solution' | 'service';

export type CatalogSpotlight = {
  id: string;
  kind: CatalogSpotlightKind;
  title: string;
  description: string;
  href: string;
  previewUrl: string;
  seller: MarketplaceSeller;
  tags: string[];
  highlight: string;
  meta: string;
  demoMetrics: CatalogDemoMetrics;
};

export type CatalogCollection = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  stat: string;
};
