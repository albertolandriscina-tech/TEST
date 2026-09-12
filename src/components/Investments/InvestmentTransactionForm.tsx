import { useState } from 'react';
import type { Investment, InvestmentOpType } from '../../types';
import { useStore } from '../../store/useStore';
import { todayISO } from '../../utils/id';
import { Modal } from '../common/Modal';

interface Props {
  investment: Investment;
  onClose: () => void;
}

export function InvestmentTransactionForm({ investment, onClose }: Props) {
  const accounts = useStore((s) => s.accounts.filter((a) => !a.archived));
  const addInvestmentTransaction = useStore((s) => s.addInvestmentTransaction);

  const [type, setType] = useState<InvestmentOpType>('buy');
  const [date, setDate] = useState(todayISO());
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState(String(investment.currentPrice || ''));
  const [fees, setFees] = useState('0');
  const [cashAccountId, setCashAccountId] = useState(
    accounts.find((a) => a.type === 'investment')?.id ?? accounts[0]?.id ?? ''
  );
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const qty = Number(quantity);
    const prc = Number(price);
    if (!qty || qty <= 0) return setError('Inserisci una quantità valida.');
    if (!prc || prc <= 0) return setError('Inserisci un prezzo valido.');
    if (!cashAccountId) return setError('Seleziona il conto corrente titoli da cui movimentare i fondi.');

    addInvestmentTransaction({
      investmentId: investment.id,
      date,
      type,
      quantity: qty,
      price: prc,
      fees: Number(fees) || 0,
      cashAccountId,
    });
    onClose();
  };

  return (
    <Modal title={`${type === 'buy' ? 'Acquista' : 'Vendi'} — ${investment.name}`} onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            className={`btn justify-center ${type === 'buy' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            onClick={() => setType('buy')}
          >
            Acquisto
          </button>
          <button
            className={`btn justify-center ${type === 'sell' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            onClick={() => setType('sell')}
          >
            Vendita
          </button>
        </div>
        <div>
          <label className="label">Data</label>
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Quantità</label>
            <input type="number" step="0.0001" className="input" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div>
            <label className="label">Prezzo unitario</label>
            <input type="number" step="0.0001" className="input" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Commissioni</label>
            <input type="number" step="0.01" className="input" value={fees} onChange={(e) => setFees(e.target.value)} />
          </div>
          <div>
            <label className="label">Conto corrente titoli</label>
            <select className="input" value={cashAccountId} onChange={(e) => setCashAccountId(e.target.value)}>
              <option value="" disabled>
                Seleziona conto...
              </option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {quantity && price && (
          <p className="text-xs text-slate-500">
            Totale {type === 'buy' ? 'da addebitare' : 'da accreditare'}:{' '}
            <strong>{(Number(quantity) * Number(price) + (type === 'buy' ? Number(fees || 0) : -Number(fees || 0))).toFixed(2)} €</strong>
          </p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button className="btn-secondary" onClick={onClose}>
            Annulla
          </button>
          <button className="btn-primary" onClick={submit}>
            Conferma
          </button>
        </div>
      </div>
    </Modal>
  );
}
