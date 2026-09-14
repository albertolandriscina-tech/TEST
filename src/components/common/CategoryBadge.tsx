import { Split } from 'lucide-react';
import type { Category, TransactionSplit } from '../../types';
import { getCategoryColor, getCategoryIconComponent } from '../../utils/categoryStyle';
import { getCategoryPath } from '../../utils/ledger';
import { formatCurrency } from '../../utils/format';

interface CategoryIconCircleProps {
  category: Pick<Category, 'id' | 'color' | 'icon'> | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const DIM = { sm: 20, md: 26, lg: 34 };
const ICON_SIZE = { sm: 12, md: 15, lg: 18 };

export function CategoryIconCircle({ category, size = 'sm', className = '' }: CategoryIconCircleProps) {
  const Icon = getCategoryIconComponent(category);
  const color = getCategoryColor(category);
  const dim = DIM[size];
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full shrink-0 ${className}`}
      style={{ width: dim, height: dim, backgroundColor: `${color}22`, color }}
    >
      <Icon size={ICON_SIZE[size]} />
    </span>
  );
}

interface CategoryBadgeProps {
  categoryId?: string | null;
  categories: Category[];
  /** Se presente (movimento frazionato), mostra un riepilogo "N categorie" al posto di una sola. */
  splits?: TransactionSplit[] | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  fallbackLabel?: string;
}

export function CategoryBadge({ categoryId, categories, splits, size = 'sm', className = '', fallbackLabel = '—' }: CategoryBadgeProps) {
  if (splits && splits.length > 0) {
    const dim = DIM[size];
    const iconSize = ICON_SIZE[size];
    const title = splits
      .map((s) => `${getCategoryPath(s.categoryId, categories)}: ${formatCurrency(s.amount)}`)
      .join('\n');
    return (
      <span className={`inline-flex items-center gap-1.5 min-w-0 ${className}`} title={title}>
        <span
          className="inline-flex items-center justify-center rounded-full shrink-0 bg-slate-100 text-slate-500"
          style={{ width: dim, height: dim }}
        >
          <Split size={iconSize} />
        </span>
        <span className="truncate">{splits.length} categorie</span>
      </span>
    );
  }

  const category = categoryId ? categories.find((c) => c.id === categoryId) : null;

  if (!category) {
    return <span className={`text-slate-400 ${className}`}>{fallbackLabel}</span>;
  }

  const path = getCategoryPath(categoryId, categories);

  return (
    <span className={`inline-flex items-center gap-1.5 min-w-0 ${className}`}>
      <CategoryIconCircle category={category} size={size} />
      <span className="truncate">{path}</span>
    </span>
  );
}
