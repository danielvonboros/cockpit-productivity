import { createContext, useContext } from 'react';

export interface ToastOptions {
  action?: { label: string; run: () => void };
  tone?: 'default' | 'success';
}

export type ShowToast = (message: string, options?: ToastOptions) => void;

export const ToastContext = createContext<ShowToast>(() => {});

export function useToast(): ShowToast {
  return useContext(ToastContext);
}
