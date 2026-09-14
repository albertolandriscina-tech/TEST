import { useEffect, useRef, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
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
        <>
          {/* Su smartphone il menu a tendina è scomodo da leggere e toccare: al suo posto
              un pannello a schermo intero con icone e testo più grandi. Il markup vive
              comunque dentro containerRef, così il click-outside sopra non lo richiude. */}
          <div className="sm:hidden fixed inset-0 z-50 flex flex-col bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 shrink-0">
              <h2 className="text-base font-semibold text-slate-800">Seleziona categoria</h2>
              <button type="button" className="btn-ghost !p-1.5" onClick={() => setOpen(false)} aria-label="Chiudi">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {roots.map((root) => {
                const children = categories.filter((c) => c.parentId === root.id && !c.archived);
                return (
                  <div key={root.id} className="mb-1">
                    <button
                      type="button"
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left ${
                        value === root.id ? 'bg-primary-50' : 'hover:bg-slate-50'
                      }`}
                      onClick={() => select(root.id)}
                    >
                      <CategoryIconCircle category={root} size="lg" />
                      <span className="truncate text-base font-medium text-slate-700">{root.name}</span>
                    </button>
                    {children.map((child) => (
                      <button
                        key={child.id}
                        type="button"
                        className={`w-full flex items-center gap-3 pl-11 pr-3 py-2.5 rounded-xl text-left ${
                          value === child.id ? 'bg-primary-50' : 'hover:bg-slate-50'
                        }`}
                        onClick={() => select(child.id)}
                      >
                        <CategoryIconCircle category={child} />
                        <span className="truncate text-base text-slate-600">{child.name}</span>
                      </button>
                    ))}
                  </div>
                );
              })}
              {roots.length === 0 && <p className="px-3 py-2 text-sm text-slate-400">Nessuna categoria disponibile</p>}
            </div>
          </div>

          {/* Da tablet in su resta il pannello a tendina compatto. */}
          <div className="hidden sm:block absolute z-20 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg py-1">
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
        </>
      )}
    </div>
  );
}
