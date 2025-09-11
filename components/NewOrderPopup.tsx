// components/NewOrderPopup.tsx
'use client';
import React, { useEffect, useRef } from 'react';

type Props = {
  open: boolean;
  customerName?: string | null;
  roomNumber?: string | null;
  onClose: () => void;
  onReplay: () => void;
  onEnableSound?: () => void;
  showEnableSound?: boolean;
  muted?: boolean;
  onToggleMute?: () => void;
};

export default function NewOrderPopup({
  open, customerName, roomNumber, onClose, onReplay,
  onEnableSound, showEnableSound, muted, onToggleMute
}: Props) {
  const firstBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (open && firstBtnRef.current) firstBtnRef.current.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] grid place-items-center p-4"
         role="dialog" aria-modal="true" aria-labelledby="new-order-title">
      <div className="bg-white w-full max-w-md rounded-xl shadow-xl p-6 text-blue-900">
        <h3 id="new-order-title" className="text-xl font-bold mb-2">Order baru masuk!</h3>
        <p className="mb-4">
          {customerName ? <>Dari: {customerName} • Room: {roomNumber ?? '-'}</> : 'Ada order baru yang masuk.'}
        </p>

        {showEnableSound && onEnableSound && (
          <div className="mb-4 rounded border border-amber-300 bg-amber-50 p-3 text-amber-800">
            Browser memblokir suara otomatis. Klik <b>Aktifkan Suara</b> agar bel bisa berbunyi.
          </div>
        )}

        <div className="flex flex-wrap gap-3 justify-between items-center">
          <button
            ref={firstBtnRef}
            onClick={onReplay}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-black"
          >
            Bunyi lagi
          </button>

          <div className="flex gap-2 items-center">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded bg-red-500 hover:bg-red-600 text-white"
            >
              Matikan bunyi & Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}