import type {
  CatalogAuthorPublication,
  CatalogCollection,
  CatalogSpotlight,
  MarketplaceSeller,
  MarketplaceTemplate
} from './types';

const sellers: MarketplaceSeller[] = [
  {
    id: 'studio-nova',
    handle: 'studio-nova',
    name: 'Studio Nova',
    avatarUrl: '/placeholders/avatar-1.svg',
    portfolioCount: 24,
    headline: 'Лендинги и launch-системы для digital-продуктов',
    location: 'Berlin, CET'
  },
  {
    id: 'pixel-foundry',
    handle: 'pixel-foundry',
    name: 'Pixel Foundry',
    avatarUrl: '/placeholders/avatar-2.svg',
    portfolioCount: 31,
    headline: 'Айдентика и бренд-системы для малых команд',
    location: 'Warsaw, CET'
  },
  {
    id: 'orbit-labs',
    handle: 'orbit-labs',
    name: 'Orbit Labs',
    avatarUrl: '/placeholders/avatar-3.svg',
    portfolioCount: 18,
    headline: 'Продуктовые dashboard-решения и data UX',
    location: 'Tallinn, EET'
  },
  {
    id: 'north-dsgn',
    handle: 'north-dsgn',
    name: 'North DSGN',
    avatarUrl: '/placeholders/avatar-1.svg',
    portfolioCount: 27,
    headline: 'Системы запуска для growth- и content-команд',
    location: 'Riga, EET'
  },
  {
    id: 'vector-squad',
    handle: 'vector-squad',
    name: 'Vector Squad',
    avatarUrl: '/placeholders/avatar-2.svg',
    portfolioCount: 15,
    headline: 'Мобильные UI-киты и сервисные сценарии',
    location: 'Lisbon, WET'
  },
  {
    id: 'boldline',
    handle: 'boldline',
    name: 'Boldline',
    avatarUrl: '/placeholders/avatar-3.svg',
    portfolioCount: 22,
    headline: 'Фирменные пакеты и визуальные гайды для B2B',
    location: 'Prague, CET'
  }
];

const templateGallery = {
  neon: ['/placeholders/gallery-1.svg', '/placeholders/gallery-2.svg', '/placeholders/gallery-3.svg'],
  desert: ['/placeholders/gallery-2.svg', '/placeholders/gallery-3.svg', '/placeholders/gallery-1.svg'],
  orbit: ['/placeholders/gallery-3.svg', '/placeholders/gallery-1.svg', '/placeholders/gallery-2.svg'],
  ocean: ['/placeholders/gallery-2.svg', '/placeholders/gallery-1.svg', '/placeholders/gallery-3.svg'],
  dawn: ['/placeholders/gallery-1.svg', '/placeholders/gallery-3.svg', '/placeholders/gallery-2.svg'],
  skyline: ['/placeholders/gallery-3.svg', '/placeholders/gallery-2.svg', '/placeholders/gallery-1.svg']
} as const satisfies Record<string, readonly string[]>;

const getSeller = (index: number) => sellers[index]!;
const getGallery = (key: keyof typeof templateGallery) => [...templateGallery[key]];

export const marketplaceSellers = sellers;

export const templates: MarketplaceTemplate[] = [
  {
    id: 'neo-landing-kit',
    title: 'NEO Landing Kit',
    description: 'Яркий лендинг в неоновой стилистике с 12 готовыми секциями и системой компонентов.',
    category: 'landing',
    price: 1490,
    pricingType: 'subscription',
    subscriptionTier: 'Pro',
    rating: 4.8,
    ratingCount: 198,
    salesCount: 1240,
    seller: getSeller(0),
    previewUrl: templateGallery.neon[0],
    gallery: getGallery('neon'),
    license: 'Коммерческая лицензия, 1 проект',
    compatibility: ['Figma', 'Sketch'],
    requirements: ['Figma 2022.10+', 'Шрифты: Inter, Rubik'],
    files: [
      { name: 'neo-kit.fig', size: '24.3 МБ', mime: 'application/octet-stream' },
      { name: 'marketing-assets.zip', size: '12.8 МБ', mime: 'application/zip' },
      { name: 'usage-guide.pdf', size: '4.1 МБ', mime: 'application/pdf' }
    ],
    tags: ['landing', 'startup', 'gradient']
  },
  {
    id: 'minimal-logo-pack',
    title: 'Minimal Logo Pack',
    description: 'Подборка из 40 минималистичных логотипов с вариативностью по цвету и композиции.',
    category: 'logo',
    price: 0,
    pricingType: 'free',
    rating: 4.7,
    ratingCount: 142,
    salesCount: 870,
    seller: getSeller(1),
    previewUrl: templateGallery.dawn[1],
    gallery: getGallery('dawn'),
    license: 'Коммерческая лицензия, 1 проект',
    compatibility: ['SVG', 'Illustrator'],
    requirements: ['Adobe Illustrator 2021+', 'Шрифты: Montserrat'],
    files: [
      { name: 'minimal-logo-pack.ai', size: '18.6 МБ', mime: 'application/postscript' },
      { name: 'logo-variants.svg', size: '6.4 МБ', mime: 'image/svg+xml' },
      { name: 'brand-guidelines.pdf', size: '8.2 МБ', mime: 'application/pdf' }
    ],
    tags: ['logo', 'brand', 'minimal']
  },
  {
    id: 'orbit-saas-dashboard',
    title: 'Orbit SaaS Dashboard',
    description: 'UI-kit панели управления с графиками, таблицами и готовыми сценариями для SaaS.',
    category: 'ui_kit',
    price: 2990,
    pricingType: 'paid',
    rating: 4.9,
    ratingCount: 264,
    salesCount: 640,
    seller: getSeller(2),
    previewUrl: templateGallery.orbit[0],
    gallery: getGallery('orbit'),
    license: 'Коммерческая лицензия, 1 проект',
    compatibility: ['Figma'],
    requirements: ['Figma 2023.1+', 'Плагин Charts'],
    files: [
      { name: 'orbit-dashboard.fig', size: '32.1 МБ', mime: 'application/octet-stream' },
      { name: 'data-widgets.fig', size: '8.6 МБ', mime: 'application/octet-stream' },
      { name: 'handoff-kit.zip', size: '14.2 МБ', mime: 'application/zip' }
    ],
    tags: ['dashboard', 'analytics', 'saas']
  },
  {
    id: 'pitch-deck-elevate',
    title: 'Elevate Pitch Deck',
    description: 'Презентация для стартапов с 30 адаптивными слайдами и динамичной типографикой.',
    category: 'presentation',
    price: 1490,
    pricingType: 'paid',
    rating: 4.6,
    ratingCount: 98,
    salesCount: 420,
    seller: getSeller(3),
    previewUrl: templateGallery.ocean[0],
    gallery: getGallery('ocean'),
    license: 'Коммерческая лицензия, 1 проект',
    compatibility: ['Keynote', 'PowerPoint', 'Figma'],
    requirements: ['Keynote 12+', 'PowerPoint 2019+'],
    files: [
      { name: 'elevate-keynote.key', size: '27.4 МБ', mime: 'application/x-iwork-keynote-sffkey' },
      { name: 'elevate-pptx.pptx', size: '19.7 МБ', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
      { name: 'brand-visuals.zip', size: '11.3 МБ', mime: 'application/zip' }
    ],
    tags: ['presentation', 'startup', 'pitch']
  },
  {
    id: 'aurora-mobile-ui',
    title: 'Aurora Mobile UI',
    description: 'Светлый UI-kit для мобильных приложений с 90 экранами и темной темой.',
    category: 'ui_kit',
    price: 2990,
    pricingType: 'subscription',
    subscriptionTier: 'Team',
    rating: 4.8,
    ratingCount: 186,
    salesCount: 980,
    seller: getSeller(4),
    previewUrl: templateGallery.ocean[1],
    gallery: getGallery('ocean'),
    license: 'Коммерческая лицензия, 1 проект',
    compatibility: ['Figma'],
    requirements: ['Figma 2022.6+', 'Font: SF Pro'],
    files: [
      { name: 'aurora-mobile.fig', size: '41.2 МБ', mime: 'application/octet-stream' },
      { name: 'aurora-icons.svg', size: '5.6 МБ', mime: 'image/svg+xml' },
      { name: 'handoff-pack.zip', size: '9.8 МБ', mime: 'application/zip' }
    ],
    tags: ['mobile', 'ui kit', 'light']
  },
  {
    id: 'brand-starter-kit',
    title: 'Brand Starter Kit',
    description: 'Комплект фирменного стиля: логотипы, цвета, типографика, презентация и гайдбук.',
    category: 'logo',
    price: 2990,
    pricingType: 'paid',
    rating: 4.7,
    ratingCount: 156,
    salesCount: 720,
    seller: getSeller(5),
    previewUrl: templateGallery.dawn[0],
    gallery: getGallery('dawn'),
    license: 'Коммерческая лицензия, 1 проект',
    compatibility: ['Illustrator', 'Figma'],
    requirements: ['Adobe Illustrator 2020+', 'Figma 2023.0+'],
    files: [
      { name: 'brand-assets.ai', size: '22.5 МБ', mime: 'application/postscript' },
      { name: 'brand-guide.pdf', size: '14.1 МБ', mime: 'application/pdf' },
      { name: 'presentation.pptx', size: '16.7 МБ', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }
    ],
    tags: ['brand', 'logo', 'guide']
  },
  {
    id: 'noir-presentation',
    title: 'Noir Presentation Pack',
    description: 'Минималистичная презентация в темной теме с акцентными цветами и графикой.',
    category: 'presentation',
    price: 1490,
    pricingType: 'paid',
    rating: 4.5,
    ratingCount: 76,
    salesCount: 312,
    seller: getSeller(0),
    previewUrl: templateGallery.neon[1],
    gallery: getGallery('neon'),
    license: 'Коммерческая лицензия, 1 проект',
    compatibility: ['Keynote', 'PowerPoint'],
    requirements: ['Keynote 11+', 'PowerPoint 2016+'],
    files: [
      { name: 'noir-deck.key', size: '21.4 МБ', mime: 'application/x-iwork-keynote-sffkey' },
      { name: 'noir-slides.pptx', size: '17.9 МБ', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
      { name: 'noir-assets.zip', size: '10.2 МБ', mime: 'application/zip' }
    ],
    tags: ['presentation', 'dark', 'minimal']
  },
  {
    id: 'venture-metrics-dashboard',
    title: 'Venture Metrics Dashboard',
    description: 'Готовая система аналитики для трекинга продуктовых метрик и воронок.',
    category: 'ui_kit',
    price: 2990,
    pricingType: 'subscription',
    subscriptionTier: 'Pro',
    rating: 4.9,
    ratingCount: 204,
    salesCount: 542,
    seller: getSeller(2),
    previewUrl: templateGallery.orbit[1],
    gallery: getGallery('orbit'),
    license: 'Коммерческая лицензия, 1 проект',
    compatibility: ['Figma'],
    requirements: ['Figma 2023.2+', 'Плагин Datavizer'],
    files: [
      { name: 'venture-dashboard.fig', size: '29.6 МБ', mime: 'application/octet-stream' },
      { name: 'venture-illustrations.svg', size: '7.4 МБ', mime: 'image/svg+xml' },
      { name: 'handoff-files.zip', size: '11.5 МБ', mime: 'application/zip' }
    ],
    tags: ['dashboard', 'metrics', 'venture']
  },
  {
    id: 'startup-landing-flow',
    title: 'Startup Landing Flow',
    description: 'Серия лендингов для стартапа с адаптивной сеткой, готовыми формами и A/B версиями.',
    category: 'landing',
    price: 1490,
    pricingType: 'paid',
    rating: 4.8,
    ratingCount: 182,
    salesCount: 684,
    seller: getSeller(3),
    previewUrl: templateGallery.desert[0],
    gallery: getGallery('desert'),
    license: 'Коммерческая лицензия, 1 проект',
    compatibility: ['Figma', 'Webflow'],
    requirements: ['Figma 2022.9+', 'Webflow CMS'],
    files: [
      { name: 'startup-landing.fig', size: '25.3 МБ', mime: 'application/octet-stream' },
      { name: 'landing-components.fig', size: '10.1 МБ', mime: 'application/octet-stream' },
      { name: 'marketing-kit.zip', size: '7.9 МБ', mime: 'application/zip' }
    ],
    tags: ['landing', 'startup', 'marketing']
  },
  {
    id: 'product-launch-presentation',
    title: 'Product Launch Presentation',
    description: 'Темплейт презентации запуска продукта с инфографикой и storytelling блоками.',
    category: 'presentation',
    price: 0,
    pricingType: 'free',
    rating: 4.7,
    ratingCount: 134,
    salesCount: 512,
    seller: getSeller(4),
    previewUrl: templateGallery.skyline[0],
    gallery: getGallery('skyline'),
    license: 'Коммерческая лицензия, 1 проект',
    compatibility: ['Keynote', 'PowerPoint'],
    requirements: ['Keynote 11+', 'PowerPoint 2019+'],
    files: [
      { name: 'launch-deck.key', size: '24.1 МБ', mime: 'application/x-iwork-keynote-sffkey' },
      { name: 'launch-deck.pptx', size: '18.4 МБ', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
      { name: 'launch-assets.zip', size: '9.7 МБ', mime: 'application/zip' }
    ],
    tags: ['presentation', 'launch', 'product']
  },
  {
    id: 'hypergrowth-branding',
    title: 'Hypergrowth Branding Pack',
    description: 'Современная айдентика с наборами логотипов, социальными шаблонами и презентацией.',
    category: 'logo',
    price: 2990,
    pricingType: 'paid',
    rating: 4.8,
    ratingCount: 176,
    salesCount: 436,
    seller: getSeller(5),
    previewUrl: templateGallery.dawn[2],
    gallery: getGallery('dawn'),
    license: 'Коммерческая лицензия, 1 проект',
    compatibility: ['Illustrator', 'Figma'],
    requirements: ['Adobe Illustrator 2021+', 'Figma 2023.1+'],
    files: [
      { name: 'hypergrowth-brand.ai', size: '28.4 МБ', mime: 'application/postscript' },
      { name: 'social-templates.fig', size: '12.3 МБ', mime: 'application/octet-stream' },
      { name: 'brand-guide.pdf', size: '9.2 МБ', mime: 'application/pdf' }
    ],
    tags: ['brand', 'logo', 'social']
  },
  {
    id: 'collabverse-presenter',
    title: 'Collabverse Presenter',
    description: 'Тематический шаблон презентации с иллюстрациями и сценарием рассказа о команде.',
    category: 'presentation',
    price: 1490,
    pricingType: 'subscription',
    subscriptionTier: 'Starter',
    rating: 4.6,
    ratingCount: 88,
    salesCount: 288,
    seller: getSeller(0),
    previewUrl: templateGallery.neon[2],
    gallery: getGallery('neon'),
    license: 'Коммерческая лицензия, 1 проект',
    compatibility: ['Keynote', 'PowerPoint'],
    requirements: ['PowerPoint 2019+', 'Шрифт: Manrope'],
    files: [
      { name: 'collabverse.key', size: '19.6 МБ', mime: 'application/x-iwork-keynote-sffkey' },
      { name: 'collabverse.pptx', size: '16.2 МБ', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
      { name: 'illustrations.zip', size: '8.8 МБ', mime: 'application/zip' }
    ],
    tags: ['presentation', 'team', 'story']
  },
  {
    id: 'horizon-landing-pages',
    title: 'Horizon Landing Pages',
    description: 'Набор адаптивных лендингов с 3 темами, состояниями форм и блоками интеграций.',
    category: 'landing',
    price: 1490,
    pricingType: 'paid',
    rating: 4.9,
    ratingCount: 208,
    salesCount: 792,
    seller: getSeller(3),
    previewUrl: templateGallery.desert[1],
    gallery: getGallery('desert'),
    license: 'Коммерческая лицензия, 1 проект',
    compatibility: ['Figma', 'Webflow'],
    requirements: ['Figma 2023.0+', 'Webflow CMS'],
    files: [
      { name: 'horizon-landing.fig', size: '27.8 МБ', mime: 'application/octet-stream' },
      { name: 'components-library.fig', size: '9.4 МБ', mime: 'application/octet-stream' },
      { name: 'marketing-assets.zip', size: '6.7 МБ', mime: 'application/zip' }
    ],
    tags: ['landing', 'conversion', 'webflow']
  }
];

export const readySolutions: CatalogSpotlight[] = [
  {
    id: 'ops-sprint-os',
    kind: 'solution',
    title: 'Operations Sprint OS',
    description: 'Публичное решение на базе PM-проекта для запуска ops-команды с недельным ритмом, шаблонами созвонов и dashboard-ритуалами.',
    href: '/market/projects',
    previewUrl: templateGallery.orbit[2],
    seller: getSeller(2),
    tags: ['ops', 'workflow', 'dashboard'],
    highlight: 'Готовое решение',
    meta: 'Reuse-first публикация из PM',
    demoMetrics: { likes: 126, views: 3800, uses: 48 }
  },
  {
    id: 'growth-campaign-canvas',
    kind: 'solution',
    title: 'Growth Campaign Canvas',
    description: 'Готовая структура проекта для growth-команд: гипотезы, спринты, контент и weekly review в одном публичном решении.',
    href: '/market/projects',
    previewUrl: templateGallery.skyline[1],
    seller: getSeller(3),
    tags: ['growth', 'campaigns', 'playbook'],
    highlight: 'Готовое решение',
    meta: 'Подходит для старта нового PM-контура',
    demoMetrics: { likes: 94, views: 2900, uses: 34 }
  },
  {
    id: 'brand-launch-playbook',
    kind: 'solution',
    title: 'Brand Launch Playbook',
    description: 'Собранный public layer проекта запуска бренда: этапы, deliverables, рабочие документы и handoff в продакшн-команду.',
    href: '/market/projects',
    previewUrl: templateGallery.dawn[0],
    seller: getSeller(5),
    tags: ['brand', 'launch', 'playbook'],
    highlight: 'Готовое решение',
    meta: 'Публикация отдельна от исходного PM-проекта',
    demoMetrics: { likes: 112, views: 3400, uses: 41 }
  }
];

export const serviceOffers: CatalogSpotlight[] = [
  {
    id: 'launch-sprint-embed',
    kind: 'service',
    title: 'Launch Sprint с автором',
    description: 'Команда автора адаптирует логику каталожного решения под ваш продукт, собирает бриф и переводит работу в проектный контур.',
    href: '/market/services',
    previewUrl: templateGallery.neon[0],
    seller: getSeller(0),
    tags: ['launch', 'adaptation', 'delivery'],
    highlight: 'Услуга',
    meta: 'Brief -> inquiry -> проект',
    demoMetrics: { likes: 67, views: 2100, uses: 16 }
  },
  {
    id: 'brand-system-retainer',
    kind: 'service',
    title: 'Brand System Retainer',
    description: 'Сервис сопровождения по айдентике и бренд-пакетам с настройкой шаблонов, ревью артефактов и внедрением в рабочий процесс команды.',
    href: '/market/services',
    previewUrl: templateGallery.dawn[2],
    seller: getSeller(1),
    tags: ['brand', 'retainer', 'review'],
    highlight: 'Услуга',
    meta: 'Не instant checkout, а согласование scope',
    demoMetrics: { likes: 58, views: 1800, uses: 12 }
  },
  {
    id: 'mobile-ui-adaptation',
    kind: 'service',
    title: 'Адаптация Mobile UI под ваш контур',
    description: 'Автор переносит UI-kit в существующий проект, помогает с handoff и подготавливает команду к следующему спринту разработки.',
    href: '/market/services',
    previewUrl: templateGallery.ocean[1],
    seller: getSeller(4),
    tags: ['mobile', 'handoff', 'support'],
    highlight: 'Услуга',
    meta: 'Ведёт к проекту и договорённости, а не только в корзину',
    demoMetrics: { likes: 73, views: 2400, uses: 19 }
  }
];

export const catalogCollections: CatalogCollection[] = [
  {
    id: 'launch-in-a-week',
    eyebrow: 'Подборка',
    title: 'Для запуска за 7 дней',
    description: 'Сценарии, где нужен быстрый старт: лендинги, питч-деки и готовые проектные контуры для запуска.',
    href: '/market/categories',
    stat: '12 решений'
  },
  {
    id: 'author-led-systems',
    eyebrow: 'Авторские системы',
    title: 'Решения с сильным автором',
    description: 'Публикации, где особенно важны доверие, узнаваемый стиль и возможность запросить адаптацию напрямую у автора.',
    href: '/market/categories',
    stat: '8 авторов'
  },
  {
    id: 'project-ready-bases',
    eyebrow: 'Reuse flow',
    title: 'Что можно быстро отправить в проект',
    description: 'Шаблоны, готовые решения и сервисные предложения, которые удобно использовать как стартовую базу для PM-проекта.',
    href: '/market/categories',
    stat: '19 отправок'
  }
];

export function getTemplateById(id: string) {
  return templates.find((template) => template.id === id);
}

export function getTemplatesByCategory(category: string, excludeId?: string) {
  return templates.filter((template) => template.category === category && template.id !== excludeId);
}

export function getMarketplaceSellerByHandle(handle: string): MarketplaceSeller | null {
  return sellers.find((seller) => seller.handle === handle) ?? null;
}

export function getCatalogAuthorPublications(handle: string): CatalogAuthorPublication[] {
  const authorTemplates = templates
    .filter((template) => template.seller.handle === handle)
    .map<CatalogAuthorPublication>((template) => ({
      id: `template:${template.id}`,
      sourceId: template.id,
      kind: 'template',
      title: template.title,
      description: template.description,
      href: `/market/templates/${template.id}`,
      tags: template.tags,
      meta: 'Публичный шаблон каталога'
    }));

  const authorSolutions = readySolutions
    .filter((solution) => solution.seller.handle === handle)
    .map<CatalogAuthorPublication>((solution) => ({
      id: `solution:${solution.id}`,
      sourceId: solution.id,
      kind: 'solution',
      title: solution.title,
      description: solution.description,
      href: solution.href,
      tags: solution.tags,
      meta: solution.meta
    }));

  const authorServices = serviceOffers
    .filter((service) => service.seller.handle === handle)
    .map<CatalogAuthorPublication>((service) => ({
      id: `service:${service.id}`,
      sourceId: service.id,
      kind: 'service',
      title: service.title,
      description: service.description,
      href: service.href,
      tags: service.tags,
      meta: service.meta
    }));

  return [...authorSolutions, ...authorTemplates, ...authorServices];
}
