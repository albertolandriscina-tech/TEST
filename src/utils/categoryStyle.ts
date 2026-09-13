import {
  Home,
  Building2,
  Landmark,
  ShoppingCart,
  ShoppingBag,
  ShoppingBasket,
  Utensils,
  Coffee,
  Car,
  Fuel,
  Bus,
  Train,
  Bike,
  Plane,
  Wifi,
  Phone,
  Smartphone,
  Zap,
  Droplet,
  Flame,
  Wrench,
  Hammer,
  Heart,
  Stethoscope,
  Pill,
  Dumbbell,
  Gamepad2,
  Film,
  Music,
  Book,
  GraduationCap,
  Briefcase,
  Wallet,
  PiggyBank,
  CreditCard,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Gift,
  Baby,
  Dog,
  Cat,
  Shirt,
  Scissors,
  Palette,
  Camera,
  Umbrella,
  Package,
  Tag,
  Star,
  Leaf,
  Sun,
  Snowflake,
  Plug,
  Users,
  User,
  MapPin,
  Calendar,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import type { Category } from '../types';

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  home: Home,
  building: Building2,
  landmark: Landmark,
  cart: ShoppingCart,
  bag: ShoppingBag,
  basket: ShoppingBasket,
  utensils: Utensils,
  coffee: Coffee,
  car: Car,
  fuel: Fuel,
  bus: Bus,
  train: Train,
  bike: Bike,
  plane: Plane,
  wifi: Wifi,
  phone: Phone,
  smartphone: Smartphone,
  zap: Zap,
  droplet: Droplet,
  flame: Flame,
  wrench: Wrench,
  hammer: Hammer,
  heart: Heart,
  stethoscope: Stethoscope,
  pill: Pill,
  dumbbell: Dumbbell,
  gamepad: Gamepad2,
  film: Film,
  music: Music,
  book: Book,
  graduation: GraduationCap,
  briefcase: Briefcase,
  wallet: Wallet,
  piggybank: PiggyBank,
  creditcard: CreditCard,
  dollar: DollarSign,
  trendingup: TrendingUp,
  trendingdown: TrendingDown,
  gift: Gift,
  baby: Baby,
  dog: Dog,
  cat: Cat,
  shirt: Shirt,
  scissors: Scissors,
  palette: Palette,
  camera: Camera,
  umbrella: Umbrella,
  package: Package,
  tag: Tag,
  star: Star,
  leaf: Leaf,
  sun: Sun,
  snowflake: Snowflake,
  plug: Plug,
  users: Users,
  user: User,
  mappin: MapPin,
  calendar: Calendar,
  sparkles: Sparkles,
};

export const CATEGORY_ICON_KEYS = Object.keys(CATEGORY_ICONS);

export const DEFAULT_CATEGORY_ICON = 'tag';

export const CATEGORY_COLOR_PALETTE = [
  '#6366f1', // indigo
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#ef4444', // red
  '#8b5cf6', // violet
  '#14b8a6', // teal
  '#f97316', // orange
  '#84cc16', // lime
  '#06b6d4', // cyan
  '#d946ef', // fuchsia
  '#eab308', // yellow
  '#22c55e', // green
  '#0ea5e9', // sky
  '#f43f5e', // rose
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

/** Colore deterministico (stabile) per una qualsiasi chiave testuale, es. una valuta. */
export function colorForKey(key: string): string {
  return CATEGORY_COLOR_PALETTE[hashString(key) % CATEGORY_COLOR_PALETTE.length];
}

/** Colore assegnato alla categoria, oppure uno deterministico (stabile) se non impostato. */
export function getCategoryColor(category: Pick<Category, 'id' | 'color'> | null | undefined): string {
  if (!category) return CATEGORY_COLOR_PALETTE[0];
  if (category.color) return category.color;
  return CATEGORY_COLOR_PALETTE[hashString(category.id) % CATEGORY_COLOR_PALETTE.length];
}

/** Icona assegnata alla categoria, oppure quella di default se non impostata. */
export function getCategoryIconKey(category: Pick<Category, 'icon'> | null | undefined): string {
  return category?.icon && CATEGORY_ICONS[category.icon] ? category.icon : DEFAULT_CATEGORY_ICON;
}

export function getCategoryIconComponent(category: Pick<Category, 'icon'> | null | undefined): LucideIcon {
  return CATEGORY_ICONS[getCategoryIconKey(category)];
}
