import { marketingMenu } from '@/config/MarketingMenu.config';

describe('marketingMenu config', () => {
  it('содержит ожидаемые верхние пункты меню', () => {
    const topLevelIds = marketingMenu.map((item) => item.id);
    expect(topLevelIds).toEqual([
      'product',
      'audience',
      'projects',
      'specialists',
      'contractors',
      'pricing',
      'blog',
      'auth'
    ]);
  });

  it('каждый подпункт имеет валидный href', () => {
    const hrefPattern = /^\/[\w/-]+(#?[\w-]+)?$/i;
    marketingMenu.forEach((item) => {
      if (item.href) {
        expect(item.href).toMatch(/^\//);
      }

      item.children?.forEach((child) => {
        expect(child.href).toMatch(hrefPattern);
        child.cta && expect(child.cta.href).toMatch(hrefPattern);
      });
    });
  });

  it('href подпунктов уникальны', () => {
    const hrefs = marketingMenu.flatMap((item) => item.children?.map((child) => child.href) ?? []);
    const unique = new Set(hrefs);
    expect(unique.size).toBe(hrefs.length);
  });
});
