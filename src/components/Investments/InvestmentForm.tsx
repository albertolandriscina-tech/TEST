import { useState } from 'react';
import type { Investment, InvestmentRegion, InvestmentSector, InvestmentType } from '../../types';
import { INVESTMENT_REGION_LABELS, INVESTMENT_SECTOR_LABELS, INVESTMENT_TYPE_LABELS } from '../../types';
import { Modal } from '../common/Modal';

interface InvestmentFormProps {
  initial?: Investment;
  onSave: (data: Omit<Investment, 'id'>) => void;
  onClose: () => void;
}

const CURRENCY_OPTIONS = ['EUR', 'USD', 'GBP', 'CHF', 'JPY'];

export function InvestmentForm({ initial, onSave, onClose }: InvestmentFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [ticker, setTicker] = useState(initial?.ticker ?? '');
  const [type, setType] = useState<InvestmentType>(initial?.type ?? 'etf');
  const [currentPrice, setCurrentPrice] = useState(String(initial?.currentPrice ?? ''));
  const [region, setRegion] = useState<InvestmentRegion | ''>(initial?.region ?? '');
  const [sector, setSector] = useState<InvestmentSector | ''>(initial?.sector ?? '');
  const [currency, setCurrency] = useState(initial?.currency ?? 'EUR');
  const [note, setNote] = useState(initial?.note ?? '');

  const submit = () => {
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      ticker: ticker.trim() || undefined,
      type,
      currentPrice: Number(currentPrice) || 0,
      region: region || undefined,
      sector: sector || undefined,
      currency: currency.trim() || 'EUR',
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label">Area geografica</label>
            <select className="input" value={region} onChange={(e) => setRegion(e.target.value as InvestmentRegion | '')}>
              <option value="">Non specificata</option>
              {Object.entries(INVESTMENT_REGION_LABELS).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Settore</label>
            <select className="input" value={sector} onChange={(e) => setSector(e.target.value as InvestmentSector | '')}>
              <option value="">Non specificato</option>
              {Object.entries(INVESTMENT_SECTOR_LABELS).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Valuta</label>
            <input className="input" list="currency-options" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={6} />
            <datalist id="currency-options">
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
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
