import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

interface DropdownPosition {
  top?: number;
  bottom?: number;
  left: number;
  width: number;
}

export function CategorySelect({ categories, kind, value, onChange, className }: CategorySelectProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<DropdownPosition | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const roots = categories.filter((c) => c.kind === kind && !c.parentId && !c.archived);
  const selected = categories.find((c) => c.id === value) ?? null;

  // Il pannello a tendina (da tablet in su) viene "teletrasportato" con un portal in
  // fondo al <body> e posizionato in position:fixed in base alla posizione reale del
  // pulsante: se restasse dentro il normale flusso del DOM, l'overflow-y-auto della
  // finestra di inserimento (Modal) lo ritagliava non appena il form era più alto
  // dello spazio visibile, facendolo sembrare "sparire" a metà elenco.
  const updatePosition = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const estimatedHeight = 256; // corrisponde a max-h-64
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpward = spaceBelow < estimatedHeight && rect.top > spaceBelow;
    setPosition(
      openUpward
        ? { bottom: window.innerHeight - rect.top + 4, left: rect.left, width: rect.width }
        : { top: rect.bottom + 4, left: rect.left, width: rect.width }
    );
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    // "capture: true" intercetta anche lo scroll di un contenitore interno (come il
    // corpo della Modal), che non fa "bubbling" come evento normale.
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    document.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const select = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
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
              un pannello a schermo intero con icone e testo più grandi. */}
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

          {/* Da tablet in su resta il pannello a tendina compatto, ma "teletrasportato"
              fuori dalla Modal (vedi updatePosition) per non essere mai ritagliato. */}
          {position &&
            createPortal(
              <div
                ref={dropdownRef}
                className="hidden sm:block fixed z-50 max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg py-1"
                style={{ top: position.top, bottom: position.bottom, left: position.left, width: position.width }}
              >
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
              </div>,
              document.body
            )}
        </>
      )}
    </div>
  );
}
