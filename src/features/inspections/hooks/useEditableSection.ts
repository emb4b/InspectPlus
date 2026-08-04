import { useCallback, useState } from 'react';

interface UseEditableSectionOptions<T> {
  value: T;
  onSave: (next: T) => Promise<void>;
}

// Generic per-section edit/draft/save/cancel state, used by every
// independently-editable FormSection on the report detail screen. Each
// section owns only the slice of the record it displays, and `onSave`
// knows how to patch just that slice back into WatermelonDB — so editing
// one section can never clobber an in-flight edit on another.
export function useEditableSection<T>({ value, onSave }: UseEditableSectionOptions<T>) {
  const [editing, setEditing] = useState(false);
  const [draftState, setDraftState] = useState<T | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The effective draft is always defined — `value` while not editing (or
  // before the first edit), the in-progress edit once startEdit has run.
  const draft = draftState ?? value;

  const setDraft = useCallback((update: T | ((prev: T) => T)) => {
    setDraftState(prev => {
      const base = prev ?? value;
      return typeof update === 'function' ? (update as (prev: T) => T)(base) : update;
    });
  }, [value]);

  const startEdit = useCallback(() => {
    setDraftState(value);
    setError(null);
    setEditing(true);
  }, [value]);

  const cancel = useCallback(() => {
    setDraftState(null);
    setError(null);
    setEditing(false);
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(draft);
      setEditing(false);
      setDraftState(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  }, [draft, onSave]);

  return {
    editing,
    draft,
    setDraft,
    startEdit,
    cancel,
    save,
    saving,
    error,
  };
}
