import { useState } from 'react';
import { Plus, Trash2, Pencil, Car, Building2, Package } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { AssetCategory, PatrimonioAsset } from '../../types';
import { ASSET_CATEGORY_LABELS } from '../../types';
import { formatCurrency, formatDate } from '../../utils/format';
import { AssetForm } from './AssetForm';
import { ConfirmDialog } from '../common/ConfirmDialog';

const categoryIcon: Record<AssetCategory, JSX.Element> = {
  real_estate: <Building2 size={16} className="text-indigo-500" />,
  vehicle: <Car size={16} className="text-indigo-500" />,
  other: <Package size={16} className="text-indigo-500" />,
};

export function AssetsPage() {
  const assets = useStore((s) => s.patrimonioAssets);
  const addAsset = useStore((s) => s.addAsset);
  const updateAsset = useStore((s) => s.updateAsset);
  const deleteAsset = useStore((s) => s.deleteAsset);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<PatrimonioAsset | null>(null);
  const [deleting, setDeleting] = useState<PatrimonioAsset | null>(null);

  const total = assets.reduce((s, a) => s + a.value, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Patrimonio</h1>
          <p className="text-sm text-slate-500">Auto, immobili e altri beni che contribuiscono al patrimonio netto.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> Nuovo bene
        </button>
      </div>

      <div className="card flex items-center justify-between flex-wrap gap-2">
        <span className="text-sm text-slate-500">Valore totale beni patrimoniali</span>
        <span className="text-xl font-semibold text-indigo-600">{formatCurrency(total)}</span>
      </div>

      {assets.length === 0 && (
        <div className="card text-center text-slate-400 py-6">Nessun bene patrimoniale registrato.</div>
      )}

      {/* Vista a card: sotto sm */}
      <div className="sm:hidden space-y-2">
        {assets.map((a) => {
          const delta = a.purchaseValue !== undefined ? a.value - a.purchaseValue : null;
          return (
            <div key={a.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex items-center gap-2 font-medium text-slate-700">
                  {categoryIcon[a.category]}
                  <span className="truncate">{a.name}</span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button className="btn-ghost !p-1.5" onClick={() => setEditing(a)}>
                    <Pencil size={14} />
                  </button>
                  <button className="btn-ghost !p-1.5 text-red-500" onClick={() => setDeleting(a)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {ASSET_CATEGORY_LABELS[a.category]}
                {a.purchaseDate && ` · acquistato il ${formatDate(a.purchaseDate)}`}
              </div>
              <div className="flex items-center justify-between mt-2 text-sm">
                <span className="font-semibold text-slate-700">{formatCurrency(a.value)}</span>
                {delta !== null && (
                  <span className={delta >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                    {delta >= 0 ? '+' : ''}
                    {formatCurrency(delta)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Vista a tabella: da sm in su */}
      <div className="hidden sm:block card !p-0 overflow-x-auto">
        <table className="table-base">
          <thead>
            <tr>
              <th>Bene</th>
              <th>Categoria</th>
              <th>Data acquisto</th>
              <th className="text-right">Valore acquisto</th>
              <th className="text-right">Valore attuale</th>
              <th className="text-right">Variazione</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => {
              const delta = a.purchaseValue !== undefined ? a.value - a.purchaseValue : null;
              return (
                <tr key={a.id}>
                  <td>
                    <div className="flex items-center gap-2 font-medium text-slate-700">
                      {categoryIcon[a.category]}
                      {a.name}
                    </div>
                  </td>
                  <td>{ASSET_CATEGORY_LABELS[a.category]}</td>
                  <td>{a.purchaseDate ? formatDate(a.purchaseDate) : '—'}</td>
                  <td className="text-right">{a.purchaseValue !== undefined ? formatCurrency(a.purchaseValue) : '—'}</td>
                  <td className="text-right font-semibold">{formatCurrency(a.value)}</td>
                  <td className={`text-right ${delta === null ? 'text-slate-400' : delta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {delta === null ? '—' : formatCurrency(delta)}
                  </td>
                  <td>
                    <div className="flex justify-end gap-1">
                      <button className="btn-ghost !p-1.5" onClick={() => setEditing(a)}>
                        <Pencil size={14} />
                      </button>
                      <button className="btn-ghost !p-1.5 text-red-500" onClick={() => setDeleting(a)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm && <AssetForm onClose={() => setShowForm(false)} onSave={addAsset} />}
      {editing && <AssetForm initial={editing} onClose={() => setEditing(null)} onSave={(data) => updateAsset(editing.id, data)} />}
      {deleting && (
        <ConfirmDialog
          title="Elimina bene"
          message={`Eliminare "${deleting.name}" dal patrimonio?`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            deleteAsset(deleting.id);
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}
