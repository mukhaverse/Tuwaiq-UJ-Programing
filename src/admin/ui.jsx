// Small building blocks shared by the admin sections.
import { useCallback, useEffect, useRef, useState } from "react";
import { ToastContext } from "./hooks";

/* ---------- Toasts ---------- */

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const timer = useRef();
  const show = useCallback((text, kind = "ok") => {
    clearTimeout(timer.current);
    setToast({ text, kind, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), kind === "error" ? 6000 : 2500);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="adm-toasts" role="status" aria-live="polite">
        {toast && (
          <p key={toast.id} className={`adm-toast adm-toast--${toast.kind}`}>
            {toast.text}
          </p>
        )}
      </div>
    </ToastContext.Provider>
  );
}

/* ---------- Form pieces ---------- */

export function Field({ label, hint, children, wide = false }) {
  return (
    <label className={`adm-field${wide ? " adm-field--wide" : ""}`}>
      <span className="adm-field__label">{label}</span>
      {children}
      {hint && <span className="adm-field__hint">{hint}</span>}
    </label>
  );
}

export function Button({ variant = "plain", className = "", ...rest }) {
  return <button type="button" className={`adm-btn adm-btn--${variant} ${className}`} {...rest} />;
}

/** A delete button that asks for a second click before it does anything. */
export function ConfirmButton({ onConfirm, children, disabled }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3500);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <Button
      variant="danger"
      disabled={disabled}
      onClick={() => {
        if (armed) {
          setArmed(false);
          onConfirm();
        } else setArmed(true);
      }}
    >
      {armed ? "Click again to confirm" : children}
    </Button>
  );
}

/* ---------- Lists ---------- */

/**
 * The left-hand list in each section: pick an item to edit it, reorder with the arrows.
 * `onMove` is optional (leave it out when order doesn't matter or a filter is on).
 */
export function ItemList({ items, selected, onSelect, onMove, render, empty = "Nothing here yet.", label }) {
  if (!items.length) return <p className="adm-muted adm-list__empty">{empty}</p>;
  return (
    <ul className="adm-list" aria-label={label}>
      {items.map((item, i) => (
        <li key={item.id} className={`adm-list__row${item.id === selected ? " is-selected" : ""}`}>
          <button type="button" className="adm-list__pick" onClick={() => onSelect(item.id)} aria-current={item.id === selected}>
            {render(item)}
          </button>
          {onMove && (
            <span className="adm-list__move">
              <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => onMove(item.id, -1)}>
                ↑
              </button>
              <button type="button" aria-label="Move down" disabled={i === items.length - 1} onClick={() => onMove(item.id, 1)}>
                ↓
              </button>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
