import { useNotifications } from "../context/NotificationContext";

const VARIANT_CLASS: Record<string, string> = {
  success: "bg-accent text-foreground",
  error: "bg-danger text-white",
  info: "bg-foreground text-white",
};

export function ToastViewport() {
  const { toasts, dismiss } = useNotifications();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex max-w-md items-center gap-3 rounded-full px-5 py-3 text-sm font-semibold shadow-lg ${VARIANT_CLASS[toast.variant]}`}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => dismiss(toast.id)}
            aria-label="Dismiss notification"
            className="rounded-full p-1 opacity-80 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
