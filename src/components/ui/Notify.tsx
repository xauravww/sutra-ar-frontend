"use client";

/**
 * App-wide notifications: toast messages + a promise-based confirm dialog.
 *
 * Replaces the browser-native alert()/confirm() with styled, non-blocking
 * UI that matches the mediation surface. Mounted once in ClientProviders.
 *
 *   const { toast, confirm } = useNotify();
 *   toast("Saved", "success");
 *   if (await confirm({ message: "Delete this case?", tone: "danger" })) { ... }
 */

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
}

interface NotifyApi {
  toast: (message: string, type?: ToastType) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const NotifyContext = createContext<NotifyApi | null>(null);

export function useNotify(): NotifyApi {
  const ctx = useContext(NotifyContext);
  if (!ctx) throw new Error("useNotify must be used within <NotifyProvider>");
  return ctx;
}

export function NotifyProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState>({ open: false, message: "" });
  const idRef = useRef(0);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    setConfirmState({ ...options, open: true });
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const closeConfirm = useCallback((result: boolean) => {
    setConfirmState((s) => ({ ...s, open: false }));
    resolverRef.current?.(result);
    resolverRef.current = null;
  }, []);

  return (
    <NotifyContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Toast stack */}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2">
          {toasts.map((t) => (
            <div key={t.id} className="animate-in">
              <div
                className={`flex items-center gap-2.5 px-4 sm:px-5 py-3 rounded-xl shadow-lg border max-w-[92vw] ${
                  t.type === "error"
                    ? "bg-red-50 border-red-200 text-red-700"
                    : t.type === "success"
                    ? "bg-green-50 border-green-200 text-green-700"
                    : "bg-white border-sutra-line text-sutra-ink"
                }`}
              >
                {t.type === "error" ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4 flex-none"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                ) : t.type === "success" ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4 flex-none"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4 flex-none"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                )}
                <span className="text-[13px] sm:text-[14px] font-semibold">{t.message}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm dialog */}
      {confirmState.open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-in"
            onClick={() => closeConfirm(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl border border-sutra-line w-full max-w-md p-6 animate-in">
            {confirmState.title && (
              <h3 className="text-[17px] font-bold text-sutra-ink mb-1.5">{confirmState.title}</h3>
            )}
            <p className="text-[14px] text-sutra-ink-2 leading-relaxed">{confirmState.message}</p>
            <div className="flex justify-end gap-2.5 mt-6">
              <button
                onClick={() => closeConfirm(false)}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold text-sutra-ink border border-sutra-line hover:bg-tint transition-colors cursor-pointer"
              >
                {confirmState.cancelLabel || "إلغاء"}
              </button>
              <button
                onClick={() => closeConfirm(true)}
                className={`px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition-colors cursor-pointer ${
                  confirmState.tone === "danger"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-navy hover:opacity-90"
                }`}
              >
                {confirmState.confirmLabel || "تأكيد"}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotifyContext.Provider>
  );
}
