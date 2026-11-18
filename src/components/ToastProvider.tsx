"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import { AlertIcon, CheckIcon, XIcon } from "./icons";

type ToastKind = "success" | "error";

type Toast = {
  id: number;
  message: string;
  kind: ToastKind;
};

type ToastContextValue = {
  show: (message: string, kind?: ToastKind) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error("useToast must be used inside <ToastProvider>.");
  }
  return value;
}

export default function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (message: string, kind: ToastKind = "success") => {
      nextId.current += 1;
      const id = nextId.current;
      setToasts((current) => [...current, { id, message, kind }]);
      window.setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-4 sm:left-auto sm:right-4 sm:items-end sm:px-0"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.kind === "error" ? "alert" : "status"}
            className="ui-toast pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-2xl border border-line bg-surface px-3.5 py-3 text-[12.5px] shadow-raised"
          >
            <span
              className={`mt-px grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                toast.kind === "error"
                  ? "border-danger-line bg-danger-soft text-danger"
                  : "border-success-line bg-success-soft text-success"
              }`}
            >
              {toast.kind === "error" ? (
                <AlertIcon className="h-3.5 w-3.5" />
              ) : (
                <CheckIcon className="h-3.5 w-3.5" />
              )}
            </span>
            <span className="min-w-0 flex-1 pt-0.5 leading-relaxed text-ink">
              {toast.message}
            </span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
              className="ui-icon-btn h-6 w-6 shrink-0 text-faint hover:text-ink"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
