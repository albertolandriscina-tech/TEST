import type { Category, CategoryKind } from '../../types';

interface CategorySelectProps {
  categories: Category[];
  kind: CategoryKind;
  value: string | null | undefined;
  onChange: (id: string) => void;
  className?: string;
}

export function CategorySelect({ categories, kind, value, onChange, className }: CategorySelectProps) {
  const roots = categories.filter((c) => c.kind === kind && !c.parentId && !c.archived);

  return (
    <select
      className={className ?? 'input'}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="" disabled>
        Seleziona categoria...
      </option>
      {roots.map((root) => {
        const children = categories.filter((c) => c.parentId === root.id && !c.archived);
        if (children.length === 0) {
          return (
            <option key={root.id} value={root.id}>
              {root.name}
            </option>
          );
        }
        return (
          <optgroup key={root.id} label={root.name}>
            <option value={root.id}>{root.name} (generale)</option>
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {'  '}{child.name}
              </option>
            ))}
          </optgroup>
        );
      })}
    </select>
  );
}
