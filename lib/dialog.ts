// In-app messages: alerts become a toast, confirms a modal. Rendered by <DialogHost /> in the root layout,
// so nothing goes through the browser's window.alert/confirm or the native Alert.

export type Toast = { id: number; title: string; message?: string };
export type Confirm = {
  title: string;
  message: string;
  confirmText: string;
  destructive: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
};
export type DialogState = { toast: Toast | null; confirm: Confirm | null };

let state: DialogState = { toast: null, confirm: null };
let nextId = 1;
const listeners = new Set<(s: DialogState) => void>();

const set = (patch: Partial<DialogState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l(state));
};

export const subscribeDialogs = (listener: (s: DialogState) => void) => {
  listeners.add(listener);
  listener(state);
  return () => {
    listeners.delete(listener);
  };
};

export const dismissToast = (id: number) => {
  if (state.toast?.id === id) set({ toast: null });
};

export const closeConfirm = () => set({ confirm: null });

export const showAlert = (title: string, message?: string) => set({ toast: { id: nextId++, title, message } });

export const showConfirm = (title: string, message: string, onConfirm: () => void, onCancel?: () => void) =>
  set({ confirm: { title, message, confirmText: 'Confirmar', destructive: false, onConfirm, onCancel } });

export const showDestructiveConfirm = (
  title: string,
  message: string,
  confirmText: string,
  onConfirm: () => void,
  onCancel?: () => void
) => set({ confirm: { title, message, confirmText, destructive: true, onConfirm, onCancel } });
