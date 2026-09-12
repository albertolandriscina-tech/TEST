import { useState } from 'react';
import type { Investment, InvestmentType } from '../../types';
import { INVESTMENT_TYPE_LABELS } from '../../types';
import { Modal } from '../common/Modal';

interface InvestmentFormProps {
  initial?: Investment;
  onSave: (data: Omit<Investment, 'id'>) => void;
  onClose: () => void;
}

export function InvestmentForm({ initial, onSave, onClose }: InvestmentFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [ticker, setTicker] = useState(initial?.ticker ?? '');
  const [type, setType] = useState<InvestmentType>(initial?.type ?? 'etf');
  const [currentPrice, setCurrentPrice] = useState(String(initial?.currentPrice ?? ''));
  const [note, setNote] = useState(initial?.note ?? '');

  const submit = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      ticker: ticker.trim() || undefined,
      type,
      currentPrice: Number(currentPrice) || 0,
      note: note.trim() || undefined,
      archived: initial?.archived ?? false,
    });
    onClose();
  };

  return (
    <Modal title={initial ? 'Modifica strumento' : 'Nuovo strumento finanziario'} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="label">Nome</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Es. iShares Core MSCI World" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Tipo</label>
            <select className="input" value={type} onChange={(e) => setType(e.target.value as InvestmentType)}>
              {Object.entries(INVESTMENT_TYPE_LABELS).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Ticker/ISIN (opz.)</label>
            <input className="input" value={ticker} onChange={(e) => setTicker(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Prezzo corrente per unità</label>
          <input type="number" step="0.0001" className="input" value={currentPrice} onChange={(e) => setCurrentPrice(e.target.value)} />
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
