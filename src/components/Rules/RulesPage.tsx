import { useState } from 'react';
import { shallow } from 'zustand/shallow';
import { Plus, Trash2, Pencil, ChevronUp, ChevronDown, Wand2, Power } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { CategorizationRule, TransactionType } from '../../types';
import { Modal } from '../common/Modal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { CategorySelect } from '../common/CategorySelect';
import { CategoryIconCircle } from '../common/CategoryBadge';

type RuleKind = Extract<TransactionType, 'income' | 'expense'>;

function RuleForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: CategorizationRule;
  onSave: (data: Omit<CategorizationRule, 'id' | 'createdAt'>) => void;
  onClose: () => void;
}) {
  const categories = useStore((s) => s.categories);
  const accounts = useStore((s) => s.accounts.filter((a) => !a.archived), shallow);

  const [name, setName] = useState(initial?.name ?? '');
  const [matchType, setMatchType] = useState<RuleKind>(initial?.matchType === 'income' ? 'income' : 'expense');
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '');
  const [keywordsText, setKeywordsText] = useState(initial?.keywords.join(', ') ?? '');
  const [accountId, setAccountId] = useState(initial?.accountId ?? '');
  const [active, setActive] = useState(initial?.active ?? true);
  const [error, setError] = useState<string | null>(null);

  const changeType = (kind: RuleKind) => {
    setMatchType(kind);
    const current = categories.find((c) => c.id === categoryId);
    if (current && current.kind !== kind) setCategoryId('');
  };

  const submit = () => {
    const keywords = keywordsText
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    if (!name.trim()) {
      setError('Inserisci un nome per la regola.');
      return;
    }
    if (keywords.length === 0) {
      setError('Inserisci almeno una parola chiave (separate da virgola).');
      return;
    }
    if (!categoryId) {
      setError('Seleziona la categoria da assegnare.');
      return;
    }
    onSave({
      name: name.trim(),
      active,
      matchType,
      keywords,
      accountId: accountId || null,
      categoryId,
    });
    onClose();
  };

  return (
    <Modal title={initial ? 'Modifica regola' : 'Nuova regola automatica'} onClose={onClose}>
      <div className="space-y-3">
        <div>
          <label className="label">Nome regola</label>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Es. Supermercato"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(['expense', 'income'] as RuleKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => changeType(k)}
              className={`btn justify-center ${
                matchType === k ? (k === 'income' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white') : 'bg-slate-100 text-slate-600'
              }`}
            >
              {k === 'income' ? 'Entrata' : 'Uscita'}
            </button>
          ))}
        </div>

        <div>
          <label className="label">Parole chiave nella descrizione</label>
          <input
            className="input"
            value={keywordsText}
            onChange={(e) => setKeywordsText(e.target.value)}
            placeholder="Es. esselunga, coop, conad"
          />
          <p className="text-xs text-slate-400 mt-1">
            Separale con una virgola: la regola scatta se la descrizione del movimento contiene almeno una di queste parole
            (maiuscole/minuscole e accenti non fanno differenza).
          </p>
        </div>

        <div>
          <label className="label">Categoria da assegnare</label>
          <CategorySelect categories={categories} kind={matchType} value={categoryId} onChange={setCategoryId} />
        </div>

        <div>
          <label className="label">Conto (opzionale)</label>
          <select className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">Qualsiasi conto</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-400 mt-1">Limita la regola ai movimenti registrati su questo conto.</p>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="rounded" />
          Regola attiva
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

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

export function RulesPage() {
  const rules = useStore((s) => s.categorizationRules);
  const categories = useStore((s) => s.categories);
  const accounts = useStore((s) => s.accounts, shallow);
  const addRule = useStore((s) => s.addCategorizationRule);
  const updateRule = useStore((s) => s.updateCategorizationRule);
  const deleteRule = useStore((s) => s.deleteCategorizationRule);
  const moveRule = useStore((s) => s.moveCategorizationRule);
  const applyRulesToUncategorized = useStore((s) => s.applyRulesToUncategorized);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CategorizationRule | null>(null);
  const [deleting, setDeleting] = useState<CategorizationRule | null>(null);
  const [applyResult, setApplyResult] = useState<string | null>(null);

  const runRules = () => {
    const count = applyRulesToUncategorized();
    setApplyResult(
      count > 0
        ? `${count} movimento${count === 1 ? '' : 'i'} categorizzat${count === 1 ? 'o' : 'i'} automaticamente.`
        : 'Nessun movimento da categorizzare: tutti i movimenti sono già categorizzati o nessuna regola corrisponde.'
    );
    setTimeout(() => setApplyResult(null), 5000);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">Regole automatiche</h1>
          <p className="text-sm text-slate-500">
            Categorizza automaticamente i movimenti in base a parole chiave nella descrizione. Vengono applicate in
            ordine: la prima regola che corrisponde vince.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button className="btn-secondary" onClick={runRules} disabled={rules.length === 0}>
            <Wand2 size={15} /> Applica ai movimenti senza categoria
          </button>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={15} /> Nuova regola
          </button>
        </div>
      </div>

      {applyResult && (
        <div className="rounded-lg bg-primary-50 text-primary-700 text-sm px-3 py-2">{applyResult}</div>
      )}

      <div className="card">
        {rules.length === 0 ? (
          <div className="text-center py-10 text-sm text-slate-400">
            <Wand2 size={28} className="mx-auto mb-2 text-slate-300" />
            Nessuna regola configurata. Crea una regola per categorizzare automaticamente i movimenti in base alla
            descrizione, ad esempio "supermercato" o "netflix".
          </div>
        ) : (
          <ul className="space-y-1">
            {rules.map((rule, index) => {
              const category = categories.find((c) => c.id === rule.categoryId);
              const account = rule.accountId ? accounts.find((a) => a.id === rule.accountId) : null;
              return (
                <li
                  key={rule.id}
                  className={`flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-slate-50 ${
                    rule.active ? '' : 'opacity-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="flex flex-col shrink-0">
                      <button
                        className="btn-ghost !p-0 !h-4 !w-5 flex items-center justify-center disabled:opacity-25 disabled:pointer-events-none"
                        onClick={() => moveRule(rule.id, 'up')}
                        disabled={index === 0}
                        title="Sposta su"
                      >
                        <ChevronUp size={12} />
                      </button>
                      <button
                        className="btn-ghost !p-0 !h-4 !w-5 flex items-center justify-center disabled:opacity-25 disabled:pointer-events-none"
                        onClick={() => moveRule(rule.id, 'down')}
                        disabled={index === rules.length - 1}
                        title="Sposta giù"
                      >
                        <ChevronDown size={12} />
                      </button>
                    </div>
                    <span
                      className={`badge shrink-0 ${
                        rule.matchType === 'income' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {rule.matchType === 'income' ? 'Entrata' : 'Uscita'}
                    </span>
                    {category && <CategoryIconCircle category={category} size="sm" />}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{rule.name}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {rule.keywords.join(', ')}
                        {category ? ` → ${category.name}` : ''}
                        {account ? ` · ${account.name}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      className={`btn-ghost !p-1 ${rule.active ? 'text-primary-600' : 'text-slate-300'}`}
                      onClick={() => updateRule(rule.id, { active: !rule.active })}
                      title={rule.active ? 'Disattiva regola' : 'Attiva regola'}
                    >
                      <Power size={14} />
                    </button>
                    <button className="btn-ghost !p-1" onClick={() => setEditing(rule)} title="Modifica">
                      <Pencil size={13} />
                    </button>
                    <button className="btn-ghost !p-1 text-red-500" onClick={() => setDeleting(rule)} title="Elimina">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {showForm && <RuleForm onClose={() => setShowForm(false)} onSave={addRule} />}
      {editing && (
        <RuleForm
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={(data) => updateRule(editing.id, data)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title="Elimina regola"
          message={`Eliminare la regola "${deleting.name}"? I movimenti già categorizzati non verranno modificati.`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            deleteRule(deleting.id);
            setDeleting(null);
          }}
        />
      )}
    </div>
  );
}
