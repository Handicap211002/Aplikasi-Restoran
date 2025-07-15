'use client';
import Image from 'next/image';
import { FC } from 'react';
import { MenuItem } from '@/types';

interface ModalDetailProps {
  item: MenuItem;
  onAdd: () => void;
  onClose: () => void;
    onQuantityChange?: (quantity: number) => void;
}

export const ModalDetail: FC<ModalDetailProps> = ({ item, onAdd, onClose }) => {
  return (
    <div className="fixed inset-0 bg-[#C8C8C8]/60 z-50 flex items-center justify-center">
      <div className="bg-white w-[90%] max-w-md rounded-xl shadow-xl p-4 relative border border-blue-200">
        
        {/* Tombol X */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-red-600 hover:text-red-800 text-xl font-bold"
        >
          ×
        </button>

        {/* Nama Makanan */}
        <h3 className="text-2xl font-bold text-center text-blue-900 mb-3">{item.name}</h3>

        {/* Gambar */}
        <div className="w-full h-48 relative mb-4 rounded-lg overflow-hidden">
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover"
          />
        </div>

        {/* Deskripsi */}
        <p className="text-sm text-center text-gray-700 mb-1">
            {item.description}
        </p>

        {/* Harga */}
        <p className="text-center text-gray-600 font-semibold text-xl mb-3">
          Rp. {item.price.toLocaleString()}
        </p>

        {/* Catatan */}
        <div className="relative mb-4">
          <span className="absolute left-3 top-2.5 text-gray-400">
            📝
          </span>
          <input
            type="text"
            placeholder="Catatan"
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-[#F2F2F2] placeholder-gray-500"
          />
        </div>

        {/* Tombol Add */}
        <button
          onClick={onAdd}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2"
        >
          🛒 <span>add</span>
        </button>
      </div>
    </div>
  );
};