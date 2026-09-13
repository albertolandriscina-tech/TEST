import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Category, CategoryKind } from '../../types';
import { getCategoryPath } from '../../utils/ledger';
import { CategoryIconCircle } from './CategoryBadge';

interface CategorySelectProps {
  categories: Category[];
  kind: CategoryKind;
  value: string | null | undefined;
  onChange: (id: string) => void;
  className?: string;
}

export function CategorySelect({ categories, kind, value, onChange, className }: CategorySelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const roots = categories.filter((c) => c.kind === kind && !c.parentId && !c.archived);
  const selected = categories.find((c) => c.id === value) ?? null;

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const select = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className={className ?? 'input flex items-center justify-between gap-2 text-left bg-white'}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex items-center gap-2 min-w-0 flex-1">
          {selected ? (
            <>
              <CategoryIconCircle category={selected} />
              <span className="truncate">{getCategoryPath(selected.id, categories)}</span>
            </>
          ) : (
            <span className="text-slate-400">Seleziona categoria...</span>
          )}
        </span>
        <ChevronDown size={15} className="text-slate-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg py-1">
          {roots.map((root) => {
            const children = categories.filter((c) => c.parentId === root.id && !c.archived);
            return (
              <div key={root.id}>
                <button
                  type="button"
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-50 ${
                    value === root.id ? 'bg-primary-50' : ''
                  }`}
                  onClick={() => select(root.id)}
                >
                  <CategoryIconCircle category={root} />
                  <span className="truncate font-medium text-slate-700">{root.name}</span>
                </button>
                {children.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    className={`w-full flex items-center gap-2 pl-8 pr-3 py-1.5 text-sm text-left hover:bg-slate-50 ${
                      value === child.id ? 'bg-primary-50' : ''
                    }`}
                    onClick={() => select(child.id)}
                  >
                    <CategoryIconCircle category={child} size="sm" />
                    <span className="truncate text-slate-600">{child.name}</span>
                  </button>
                ))}
              </div>
            );
          })}
          {roots.length === 0 && <p className="px-3 py-2 text-sm text-slate-400">Nessuna categoria disponibile</p>}
        </div>
      )}
    </div>
  );
}
