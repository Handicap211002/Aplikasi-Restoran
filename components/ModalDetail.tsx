'use client';
import Image from 'next/image';
import { FC, useState, useRef, useEffect } from 'react';
import { MenuItem } from '@/types';

interface ModalDetailProps {
  item: MenuItem;
  onAdd: (note: string) => void;
  onClose: () => void;
}

export const ModalDetail: FC<ModalDetailProps> = ({ item, onAdd, onClose }) => {
  const [note, setNote] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onAdd(note);
        }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-[90%] max-w-md rounded-xl shadow-xl p-4 relative border border-blue-200"
      >
        <button
          onClick={onClose}
          type="button"
          className="absolute top-3 right-3 text-red-600 hover:text-red-800 text-xl font-bold"
        >
          ×
        </button>

        <h3 className="text-2xl font-bold text-center text-blue-900 mb-3">{item.name}</h3>

        <div className="w-full h-48 relative mb-4 rounded-lg overflow-hidden">
          {item.image ? (
            <Image
              src={item.image}
              alt={item.name}
              fill
              className="object-cover rounded-[10px]"
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
            />
          ) : (
            <div className="bg-gray-200 w-full h-full flex items-center justify-center rounded-[10px] text-gray-500 text-xs">
              No image
            </div>
          )}
        </div>

        <p className="text-sm text-center text-gray-700 mb-1">{item.description}</p>

        <p className="text-center text-gray-600 font-semibold text-xl mb-3">
          Rp. {item.price.toLocaleString()}
        </p>

        <div className="relative mb-4">
          <span className="absolute left-3 top-2.5 text-grey-500">📝</span>
          <input
            ref={inputRef}
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Catatan"
            className="w-full pl-9 pr-3 py-2 border text-black-500 rounded-lg text-sm bg-[#F2F2F2] placeholder-gray-500"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2"
        >
          🛒 <span>add</span>
        </button>
      </form>
    </div>
  );
};
