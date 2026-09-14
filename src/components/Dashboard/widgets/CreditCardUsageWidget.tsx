import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { addMonths, endOfMonth, format, startOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, CreditCard } from 'lucide-react';
import { useStore } from '../../../store/useStore';
import { formatCurrency, formatNumber, MONTH_NAMES_IT } from '../../../utils/format';

export function CreditCardUsageWidget() {
  const accounts = useStore((s) => s.accounts);
  const transactions = useStore((s) => s.transactions);
  const [anchor, setAnchor] = useState(() => new Date());

  const cards = useMemo(
    () => accounts.filter((a) => a.type === 'credit_card' && !a.archived && a.creditLimit != null && a.creditLimit > 0),
    [accounts]
  );

  const rows = useMemo(() => {
    const monthStartISO = format(startOfMonth(anchor), 'yyyy-MM-dd');
    const monthEndISO = format(endOfMonth(anchor), 'yyyy-MM-dd');
    return cards.map((card) => {
      const used = transactions
        .filter((t) => t.type === 'expense' && t.accountId === card.id && t.date >= monthStartISO && t.date <= monthEndISO)
        .reduce((s, t) => s + t.amount, 0);
      const limit = card.creditLimit ?? 0;
      const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
      return { card, used, limit, pct, over: used > limit };
    });
  }, [cards, transactions, anchor]);

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-400">Spesa del mese sulle carte rispetto al limite: si azzera a ogni nuovo mese.</p>
        <div className="flex items-center gap-1 shrink-0">
          <button className="btn-ghost !p-1" onClick={() => setAnchor((d) => addMonths(d, -1))} title="Mese precedente">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-slate-700 min-w-[7rem] text-center">
            {MONTH_NAMES_IT[anchor.getMonth()]} {anchor.getFullYear()}
          </span>
          <button className="btn-ghost !p-1" onClick={() => setAnchor((d) => addMonths(d, 1))} title="Mese successivo">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-6">
          <CreditCard size={28} className="text-slate-300" />
          <p className="text-sm text-slate-400">Nessuna carta di credito con limite impostato.</p>
          <Link to="/conti" className="text-xs font-medium text-primary-600 hover:underline">
            Imposta un limite nella pagina Conti →
          </Link>
        </div>
      ) : (
        <ul className="flex-1 overflow-auto space-y-3 min-h-0">
          {rows.map(({ card, used, limit, pct, over }) => (
            <li key={card.id}>
              <div className="flex items-center justify-between gap-2 text-sm mb-1">
                <Link to={`/conti/${card.id}`} className="font-medium text-slate-700 hover:text-primary-600 truncate">
                  {card.name}
                </Link>
                <span className={`whitespace-nowrap shrink-0 ${over ? 'text-red-600 font-semibold' : 'text-slate-500'}`}>
                  {formatCurrency(used, card.currency)} / {formatCurrency(limit, card.currency)}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${over ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                <span>{over ? 'Limite superato' : `${formatNumber(pct, 0)}% utilizzato`}</span>
                <span>{formatCurrency(Math.max(0, limit - used), card.currency)} disponibile</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
