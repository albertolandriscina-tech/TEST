import type { ReactNode } from 'react';
import { GripVertical, X } from 'lucide-react';

interface WidgetCardProps {
  title: string;
  editMode: boolean;
  onRemove?: () => void;
  headerExtra?: ReactNode;
  children: ReactNode;
}

export function WidgetCard({ title, editMode, onRemove, headerExtra, children }: WidgetCardProps) {
  return (
    <div className={`card !p-0 h-full flex flex-col overflow-hidden ${editMode ? 'ring-2 ring-indigo-200' : ''}`}>
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {editMode && (
            <span className="widget-drag-handle cursor-move text-slate-300 hover:text-slate-500 shrink-0">
              <GripVertical size={16} />
            </span>
          )}
          <h2 className="font-semibold text-slate-700 text-sm truncate">{title}</h2>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {headerExtra}
          {editMode && onRemove && (
            <button
              className="btn-ghost !p-1 text-slate-400 hover:text-red-500"
              onClick={onRemove}
              title="Rimuovi widget"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 min-h-0">{children}</div>
    </div>
  );
}
