"use client";

interface ToastProps {
  message: string;
}

export function Toast({ message }: ToastProps) {
  if (!message) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-primary)] px-5 py-3 text-sm font-medium text-white shadow-[var(--shadow-float)]"
    >
      {message}
    </div>
  );
}
