import { 
  Bookmark, Link, Rocket, Sparkles, Star, Zap, ExternalLink, Flame, Calendar, BookOpen 
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const CUSTOM_RAIL_ICONS = {
  link: { icon: Link || ExternalLink, label: 'Ссылка' },
  star: { icon: Star || Bookmark, label: 'Избранное' },
  spark: { icon: Sparkles || Star, label: 'Идеи' },
  rocket: { icon: Rocket || Zap, label: 'Запуск' },
  note: { icon: BookOpen || Bookmark, label: 'Заметка' },
  calendar: { icon: Calendar || ExternalLink, label: 'Календарь' },
  flame: { icon: Flame || Zap, label: 'Важное' },
  zap: { icon: Zap || Sparkles, label: 'Быстро' },
  external: { icon: ExternalLink || Link || Bookmark, label: 'Внешняя ссылка' }
} as const satisfies Record<string, { icon: LucideIcon; label: string }>;

export type CustomRailIconKey = keyof typeof CUSTOM_RAIL_ICONS;

export const CUSTOM_RAIL_ICON_KEYS = Object.keys(CUSTOM_RAIL_ICONS) as CustomRailIconKey[];

export const DEFAULT_CUSTOM_RAIL_ICON: CustomRailIconKey = 'link';

export function resolveCustomRailIcon(key: CustomRailIconKey): LucideIcon {
  return CUSTOM_RAIL_ICONS[key]?.icon ?? CUSTOM_RAIL_ICONS[DEFAULT_CUSTOM_RAIL_ICON].icon;
}

export function isCustomRailIconKey(value: unknown): value is CustomRailIconKey {
  return typeof value === 'string' && value in CUSTOM_RAIL_ICONS;
}
