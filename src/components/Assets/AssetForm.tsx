import { useState } from 'react';
import type { AssetCategory, PatrimonioAsset } from '../../types';
import { ASSET_CATEGORY_LABELS } from '../../types';
import { Modal } from '../common/Modal';

interface Props {
  initial?: PatrimonioAsset;
  onSave: (data: Omit<PatrimonioAsset, 'id'>) => void;
  onClose: () => void;
}

export function AssetForm({ initial, onSave, onClose }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState<AssetCategory>(initial?.category ?? 'real_estate');
  const [value, setValue] = useState(String(initial?.value ?? ''));
  const [purchaseValue, setPurchaseValue] = useState(String(initial?.purchaseValue ?? ''));
  const [purchaseDate, setPurchaseDate] = useState(initial?.purchaseDate ?? '');
  const [note, setNote] = useState(initial?.note ?? '');

  const submit = () => {
    if (!name.trim() || !value) return;
    onSave({
      name: name.trim(),
      category,
      value: Number(value) || 0,
      purchaseValue: purchaseValue ? Number(purchaseValue) : undefined,
      purchaseDate: purchaseDate || undefined,
      note: note.trim() || undefined,
    });
    onClose();
  };

  return (
    <Modal title={initial ? 'Modifica bene' : 'Nuovo bene patrimoniale'} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="label">Nome</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. Appartamento, Auto Fiat Panda..." />
        </div>
        <div>
          <label className="label">Categoria</label>
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value as AssetCategory)}>
            {Object.entries(ASSET_CATEGORY_LABELS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Valore attuale stimato</label>
            <input type="number" step="0.01" className="input" value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
          <div>
            <label className="label">Valore di acquisto (opz.)</label>
            <input type="number" step="0.01" className="input" value={purchaseValue} onChange={(e) => setPurchaseValue(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Data acquisto (opz.)</label>
          <input type="date" className="input" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Note</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
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
