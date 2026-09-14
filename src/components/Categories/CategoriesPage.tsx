import { useState } from 'react';
import { Plus, Trash2, Pencil, CornerDownRight, Check, ChevronUp, ChevronDown } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { Category, CategoryKind, ExpenseNature } from '../../types';
import { EXPENSE_NATURE_COLORS, EXPENSE_NATURE_LABELS } from '../../types';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { CategoryIconCircle } from '../common/CategoryBadge';
import { getEffectiveCategoryNature } from '../../utils/ledger';
import {
  CATEGORY_COLOR_PALETTE,
  CATEGORY_ICONS,
  CATEGORY_ICON_KEYS,
  CATEGORY_ICON_SEARCH_TERMS,
  getCategoryColor,
  getCategoryIconKey,
} from '../../utils/categoryStyle';

function NatureBadge({ nature, inherited = false }: { nature: ExpenseNature; inherited?: boolean }) {
  return (
    <span
      className="badge shrink-0"
      style={{ backgroundColor: `${EXPENSE_NATURE_COLORS[nature]}1a`, color: EXPENSE_NATURE_COLORS[nature] }}
      title={inherited ? 'Ereditata dalla categoria principale' : undefined}
    >
      {EXPENSE_NATURE_LABELS[nature]}
      {inherited ? ' (ered.)' : ''}
    </span>
  );
}

function CategoryForm({
  kind,
  parentOptions,
  initial,
  onSave,
  onClose,
}: {
  kind: CategoryKind;
  parentOptions: Category[];
  initial?: Category;
  onSave: (data: Omit<Category, 'id'>) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [parentId, setParentId] = useState<string>(initial?.parentId ?? '');
  const [icon, setIcon] = useState<string>(getCategoryIconKey(initial));
  const [color, setColor] = useState<string>(getCategoryColor(initial ?? { id: 'new-category' }));
  const [nature, setNature] = useState<ExpenseNature | ''>(initial?.nature ?? '');
  const [iconSearch, setIconSearch] = useState('');

  const filteredIconKeys = CATEGORY_ICON_KEYS.filter((key) => {
    const query = iconSearch.trim().toLowerCase();
    if (!query) return true;
    return key.includes(query) || (CATEGORY_ICON_SEARCH_TERMS[key] ?? '').includes(query);
  });

  const handleParentChange = (value: string) => {
    setParentId(value);
    if (!initial && value) {
      const parent = parentOptions.find((p) => p.id === value);
      if (parent) {
        setIcon(getCategoryIconKey(parent));
        setColor(getCategoryColor(parent));
      }
    }
  };

  const submit = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      kind,
      parentId: parentId || null,
      icon,
      color,
      nature: kind === 'expense' && nature ? nature : undefined,
      archived: initial?.archived ?? false,
    });
    onClose();
  };

  return (
    <Modal title={initial ? 'Modifica categoria' : `Nuova categoria (${kind === 'income' ? 'Entrata' : 'Uscita'})`} onClose={onClose}>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <CategoryIconCircle category={{ id: initial?.id ?? 'new-category', icon, color }} size="lg" />
          <div className="flex-1 min-w-0">
            <label className="label">Nome</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
        </div>

        <div>
          <label className="label">Categoria principale (opzionale, per creare una sottocategoria)</label>
          <select className="input" value={parentId} onChange={(e) => handleParentChange(e.target.value)}>
            <option value="">Nessuna (categoria principale)</option>
            {parentOptions
              .filter((p) => p.id !== initial?.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </div>

        {kind === 'expense' && (
          <div>
            <label className="label">Natura della spesa</label>
            <select className="input" value={nature} onChange={(e) => setNature(e.target.value as ExpenseNature | '')}>
              <option value="">Non specificata</option>
              {(Object.keys(EXPENSE_NATURE_LABELS) as ExpenseNature[]).map((n) => (
                <option key={n} value={n}>
                  {EXPENSE_NATURE_LABELS[n]}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1">
              Se non specificata, una sottocategoria eredita la natura della categoria principale.
            </p>
          </div>
        )}

        <div>
          <label className="label">Colore</label>
          <div className="flex flex-wrap gap-2 items-center">
            {CATEGORY_COLOR_PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
                aria-label={c}
              >
                {color.toLowerCase() === c.toLowerCase() && <Check size={14} className="text-white" />}
              </button>
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-7 h-7 rounded-full border border-slate-200 cursor-pointer p-0 overflow-hidden shrink-0"
              title="Colore personalizzato"
            />
          </div>
        </div>

        <div>
          <label className="label">Icona</label>
          <input
            className="input mb-1.5"
            value={iconSearch}
            onChange={(e) => setIconSearch(e.target.value)}
            placeholder="Cerca icona... (es. casa, auto, sport)"
          />
          <div className="grid grid-cols-8 gap-1.5 max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2">
            {filteredIconKeys.length === 0 && (
              <p className="col-span-8 text-center text-xs text-slate-400 py-3">Nessuna icona trovata.</p>
            )}
            {filteredIconKeys.map((key) => {
              const Icon = CATEGORY_ICONS[key];
              const selected = icon === key;
              return (
                <button
                  key={key}
                  type="button"
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    selected ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                  onClick={() => setIcon(key)}
                  title={key}
                >
                  <Icon size={16} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-secondary" onClick={onClose}>
            Annulla
          </button>
          <button className="btn-primary" onClick={submit}>
            Salva
          </button>
        </div>
      </div>
    </Modal>
  );
}

function CategoryColumn({ kind, title }: { kind: CategoryKind; title: string }) {
  const categories = useStore((s) => s.categories);
  const addCategory = useStore((s) => s.addCategory);
  const updateCategory = useStore((s) => s.updateCategory);
  const deleteCategory = useStore((s) => s.deleteCategory);
  const moveCategory = useStore((s) => s.moveCategory);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const roots = categories.filter((c) => c.kind === kind && !c.parentId);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-slate-700">{title}</h2>
        <button className="btn-secondary" onClick={() => setShowForm(true)}>
          <Plus size={15} /> Aggiungi
        </button>
      </div>
      <ul className="space-y-1">
        {roots.map((root, rootIndex) => {
          const children = categories.filter((c) => c.parentId === root.id);
          return (
            <li key={root.id}>
              <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50">
                <span className="flex items-center gap-2 text-sm font-medium text-slate-700 truncate min-w-0">
                  <CategoryIconCircle category={root} />
                  <span className="truncate">{root.name}</span>
                  {root.system && <span className="badge bg-slate-100 text-slate-500 shrink-0">sistema</span>}
                  {root.nature && <NatureBadge nature={root.nature} />}
                </span>
                <div className="flex items-center shrink-0">
                  <div className="flex flex-col">
                    <button
                      className="btn-ghost !p-0 !h-4 !w-5 flex items-center justify-center disabled:opacity-25 disabled:pointer-events-none"
                      onClick={() => moveCategory(root.id, 'up')}
                      disabled={rootIndex === 0}
                      title="Sposta su"
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button
                      className="btn-ghost !p-0 !h-4 !w-5 flex items-center justify-center disabled:opacity-25 disabled:pointer-events-none"
                      onClick={() => moveCategory(root.id, 'down')}
                      disabled={rootIndex === roots.length - 1}
                      title="Sposta giù"
                    >
                      <ChevronDown size={12} />
                    </button>
                  </div>
                  {!root.system && (
                    <div className="flex gap-0.5 ml-1">
                      <button className="btn-ghost !p-1" onClick={() => setEditing(root)}>
                        <Pencil size={13} />
                      </button>
                      <button className="btn-ghost !p-1 text-red-500" onClick={() => setDeleting(root)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {children.length > 0 && (
                <ul className="ml-4 border-l border-slate-200 pl-2">
                  {children.map((child, childIndex) => {
                    const effectiveNature = getEffectiveCategoryNature(child.id, categories);
                    return (
                      <li key={child.id} className="flex items-center justify-between gap-2 px-2 py-1 rounded-lg hover:bg-slate-50">
                        <span className="text-sm text-slate-600 flex items-center gap-1.5 min-w-0">
                          <CornerDownRight size={12} className="text-slate-300 shrink-0" />
                          <CategoryIconCircle category={child} />
                          <span className="truncate">{child.name}</span>
                          {effectiveNature && <NatureBadge nature={effectiveNature} inherited={!child.nature} />}
                        </span>
                        <div className="flex items-center shrink-0">
                          <div className="flex flex-col">
                            <button
                              className="btn-ghost !p-0 !h-4 !w-5 flex items-center justify-center disabled:opacity-25 disabled:pointer-events-none"
                              onClick={() => moveCategory(child.id, 'up')}
                              disabled={childIndex === 0}
                              title="Sposta su"
                            >
                              <ChevronUp size={12} />
                            </button>
                            <button
                              className="btn-ghost !p-0 !h-4 !w-5 flex items-center justify-center disabled:opacity-25 disabled:pointer-events-none"
                              onClick={() => moveCategory(child.id, 'down')}
                              disabled={childIndex === children.length - 1}
                              title="Sposta giù"
                            >
                              <ChevronDown size={12} />
                            </button>
                          </div>
                          <div className="flex gap-0.5 ml-1">
                            <button className="btn-ghost !p-1" onClick={() => setEditing(child)}>
                              <Pencil size={13} />
                            </button>
                            <button className="btn-ghost !p-1 text-red-500" onClick={() => setDeleting(child)}>
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
        {roots.length === 0 && <li className="text-sm text-slate-400 py-4 text-center">Nessuna categoria</li>}
      </ul>

      {showForm && (
        <CategoryForm kind={kind} parentOptions={roots} onClose={() => setShowForm(false)} onSave={addCategory} />
      )}
      {editing && (
        <CategoryForm
          kind={kind}
          parentOptions={roots}
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(data) => updateCategory(editing.id, data)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Elimina categoria"
          message={`Eliminare "${deleting.name}"? Le eventuali sottocategorie e i budget collegati verranno rimossi; i movimenti resteranno senza categoria.`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            deleteCategory(deleting.id);
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}

export function CategoriesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">Categorie</h1>
        <p className="text-sm text-slate-500">Organizza entrate e uscite in categorie e sottocategorie.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CategoryColumn kind="income" title="Entrate" />
        <CategoryColumn kind="expense" title="Uscite" />
      </div>
    </div>
  );
}
