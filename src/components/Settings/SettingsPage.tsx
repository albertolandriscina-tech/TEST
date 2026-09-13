import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useStore } from '../../store/useStore';
import {
  APP_THEME_LABELS,
  COLOR_THEME_LABELS,
  CURRENCY_OPTIONS,
  FONT_FAMILY_LABELS,
  type AppTheme,
  type ColorTheme,
  type FontFamily,
} from '../../types';
import { COLOR_THEME_SCALES, FONT_STACKS } from '../../utils/theme';

const THEME_ICONS: Record<AppTheme, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

export function SettingsPage() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Impostazioni</h1>
        <p className="text-sm text-slate-500">Personalizza l'aspetto dell'app e la valuta usata in tutti i calcoli e i report.</p>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-slate-700 mb-1">Tema</h3>
        <p className="text-xs text-slate-500 mb-3">Scegli l'aspetto chiaro, scuro, oppure segui automaticamente le impostazioni del sistema.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {(Object.keys(APP_THEME_LABELS) as AppTheme[]).map((theme) => {
            const Icon = THEME_ICONS[theme];
            const selected = settings.theme === theme;
            return (
              <button
                key={theme}
                onClick={() => updateSettings({ theme })}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                  selected
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon size={18} className="shrink-0" />
                <span className="flex-1 text-left">{APP_THEME_LABELS[theme]}</span>
                {selected && <Check size={16} className="shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-slate-700 mb-1">Tema colori</h3>
        <p className="text-xs text-slate-500 mb-3">Il colore d'accento usato per pulsanti, voci attive e grafici principali.</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {(Object.keys(COLOR_THEME_LABELS) as ColorTheme[]).map((theme) => {
            const selected = settings.colorTheme === theme;
            const hex = COLOR_THEME_SCALES[theme][600];
            return (
              <button
                key={theme}
                onClick={() => updateSettings({ colorTheme: theme })}
                className="flex flex-col items-center gap-1.5 group"
                title={COLOR_THEME_LABELS[theme]}
              >
                <span
                  className="w-10 h-10 rounded-full flex items-center justify-center ring-offset-2 ring-offset-white dark:ring-offset-slate-800 transition-shadow"
                  style={{ backgroundColor: hex, boxShadow: selected ? `0 0 0 2px ${hex}` : undefined }}
                >
                  {selected && <Check size={18} className="text-white" />}
                </span>
                <span className="text-xs text-slate-600 group-hover:text-slate-800">{COLOR_THEME_LABELS[theme]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-slate-700 mb-1">Carattere</h3>
        <p className="text-xs text-slate-500 mb-3">Il font usato in tutta l'applicazione.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(Object.keys(FONT_FAMILY_LABELS) as FontFamily[]).map((font) => {
            const selected = settings.fontFamily === font;
            return (
              <button
                key={font}
                onClick={() => updateSettings({ fontFamily: font })}
                className={`flex items-center justify-between gap-2 px-4 py-3 rounded-xl border text-left transition-colors ${
                  selected
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>
                  <span className="block text-xs text-slate-500">{FONT_FAMILY_LABELS[font]}</span>
                  <span className="block text-base text-slate-800" style={{ fontFamily: FONT_STACKS[font] }}>
                    Aa Bb Cc — Finanza Personale
                  </span>
                </span>
                {selected && <Check size={16} className="shrink-0 text-primary-600" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold text-slate-700 mb-1">Valuta</h3>
        <p className="text-xs text-slate-500 mb-3">
          La valuta usata per formattare tutti gli importi dell'app (saldi, movimenti, budget, investimenti, patrimonio).
        </p>
        <select
          className="input sm:max-w-xs"
          value={settings.currency}
          onChange={(e) => updateSettings({ currency: e.target.value })}
        >
          {CURRENCY_OPTIONS.map((c) => (
            <option key={c.code} value={c.code}>
              {c.symbol} — {c.label} ({c.code})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
