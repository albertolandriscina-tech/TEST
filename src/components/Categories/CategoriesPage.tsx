import { useState } from 'react';
import { Plus, Trash2, Pencil, CornerDownRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { Category, CategoryKind } from '../../types';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';

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

  const submit = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), kind, parentId: parentId || null, archived: initial?.archived ?? false });
    onClose();
  };

  return (
    <Modal title={initial ? 'Modifica categoria' : `Nuova categoria (${kind === 'income' ? 'Entrata' : 'Uscita'})`} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="label">Nome</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <div>
          <label className="label">Categoria principale (opzionale, per creare una sottocategoria)</label>
          <select className="input" value={parentId} onChange={(e) => setParentId(e.target.value)}>
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
        {roots.map((root) => {
          const children = categories.filter((c) => c.parentId === root.id);
          return (
            <li key={root.id}>
              <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-50">
                <span className="text-sm font-medium text-slate-700">
                  {root.name}
                  {root.system && <span className="badge bg-slate-100 text-slate-500 ml-2">sistema</span>}
                </span>
                {!root.system && (
                  <div className="flex gap-1">
                    <button className="btn-ghost !p-1" onClick={() => setEditing(root)}>
                      <Pencil size={13} />
                    </button>
                    <button className="btn-ghost !p-1 text-red-500" onClick={() => setDeleting(root)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
              {children.length > 0 && (
                <ul className="ml-4 border-l border-slate-200 pl-2">
                  {children.map((child) => (
                    <li key={child.id} className="flex items-center justify-between px-2 py-1 rounded-lg hover:bg-slate-50">
                      <span className="text-sm text-slate-600 flex items-center gap-1">
                        <CornerDownRight size={12} className="text-slate-300" />
                        {child.name}
                      </span>
                      <div className="flex gap-1">
                        <button className="btn-ghost !p-1" onClick={() => setEditing(child)}>
                          <Pencil size={13} />
                        </button>
                        <button className="btn-ghost !p-1 text-red-500" onClick={() => setDeleting(child)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </li>
                  ))}
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
        <h1 className="text-xl font-semibold text-slate-800">Categorie</h1>
        <p className="text-sm text-slate-500">Organizza entrate e uscite in categorie e sottocategorie.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CategoryColumn kind="income" title="Entrate" />
        <CategoryColumn kind="expense" title="Uscite" />
      </div>
    </div>
  );
}
