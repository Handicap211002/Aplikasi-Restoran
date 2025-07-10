'use client';
import Image from 'next/image';

type Props = {
  item: {
    id: number;
    name: string;
    price: number;
    image: string;
  };
  onAdd: () => void;
};

export function MenuCard({ item, onAdd }: Props) {
  return (
    <div
      className="bg-white rounded-xl shadow-lg p-3 flex flex-col items-center hover:scale-105 transition cursor-pointer"
      onClick={onAdd}
    >
      {/* Gambar berbentuk kotak dengan border-radius 10px */}
      <div className="relative w-44 h-34 mb-2">
        <Image
          src={item.image}
          alt={item.name}
          fill
          className="object-cover rounded-[10px]"
        />
      </div>
      <h3 className="text-center text-sm font-bold text-gray-800">{item.name}</h3>
      <p className="text-center text-gray-600 text-xs mt-1">
        Rp. {item.price.toLocaleString('id-ID')}
      </p>
    </div>
  );
}
