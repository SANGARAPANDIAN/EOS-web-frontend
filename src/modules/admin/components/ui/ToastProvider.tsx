"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils/cn";

export type ToastTone = "success" | "error" | "info";

interface Toast {
  id: number;
  title?: string;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  show: (message: string, tone?: ToastTone) => void;
  showDetailed: (title: string, message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_ICON: Record<ToastTone, string> = {
  success: "check_circle",
  error: "error",
  info: "info",
};

const DISMISS_AFTER_MS: Record<ToastTone, number> = {
  success: 4000,
  info: 4000,
  error: 6000,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  // Mirrors `toasts` synchronously so the dedup check below can read the
  // current list without waiting for a render — setState updaters must stay
  // pure, so both the dedup check and the setTimeout side effect live here.
  const toastsRef = useRef<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => {
      const next = current.filter((toast) => toast.id !== id);
      toastsRef.current = next;
      return next;
    });
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, "id">) => {
      const isDuplicate = toastsRef.current.some(
        (t) => t.message === toast.message && t.tone === toast.tone && t.title === toast.title,
      );
      if (isDuplicate) return;

      const id = nextId.current++;
      const next = [...toastsRef.current, { id, ...toast }];
      toastsRef.current = next;
      setToasts(next);
      setTimeout(() => dismiss(id), DISMISS_AFTER_MS[toast.tone]);
    },
    [dismiss],
  );

  const show = useCallback((message: string, tone: ToastTone = "info") => addToast({ message, tone }), [addToast]);
  const showDetailed = useCallback(
    (title: string, message: string, tone: ToastTone = "success") => addToast({ title, message, tone }),
    [addToast],
  );

  return (
    <ToastContext.Provider value={{ show, showDetailed }}>
      {children}
      <div className="pointer-events-none fixed bottom-8 left-1/2 z-[70] flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto flex items-center gap-2.5 rounded-admin-lg px-5 py-3.5 text-sm font-semibold text-white shadow-admin-toast",
              toast.tone === "error" ? "bg-admin-danger" : "bg-admin-primary-deep",
            )}
          >
            <Icon name={TONE_ICON[toast.tone]} size={20} />
            <div>
              {toast.title && <div className="font-bold">{toast.title}</div>}
              <div>{toast.message}</div>
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss"
              className="ml-1 cursor-pointer text-white/70 hover:text-white"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
