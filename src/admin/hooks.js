// Hooks and helpers shared by the admin sections (components live in ui.jsx).
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api";

export const ToastContext = createContext(() => {});
export const useToast = () => useContext(ToastContext);

/** Runs a save/delete, keeps a busy flag, and reports the result as a toast. */
export function useAction() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async (fn, success) => {
      setBusy(true);
      try {
        const result = await fn();
        if (success) toast(success);
        return result;
      } catch (err) {
        toast(err.message, "error");
        return undefined;
      } finally {
        setBusy(false);
      }
    },
    [toast]
  );
  return [busy, run];
}

/* ---------- Site content ---------- */

/** All site content, fresh from the API, plus a reload after edits. */
export function useSiteData() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const reload = useCallback(
    () =>
      api("/content")
        .then((d) => {
          setData(d);
          setError(null);
        })
        .catch((e) => setError(e.message)),
    []
  );
  useEffect(() => {
    reload();
  }, [reload]);
  return { data, error, reload };
}

/** Form state for an object: [values, set(field, value)]. */
export function useForm(initial) {
  const [values, setValues] = useState(initial);
  const set = useCallback((field, value) => setValues((v) => ({ ...v, [field]: value })), []);
  return [values, set, setValues];
}

/** Moves `id` one step up (-1) or down (+1) and returns the new id order. */
export function moved(items, id, dir) {
  const ids = items.map((i) => i.id);
  const at = ids.indexOf(id);
  const to = at + dir;
  if (at < 0 || to < 0 || to >= ids.length) return null;
  [ids[at], ids[to]] = [ids[to], ids[at]];
  return ids;
}
