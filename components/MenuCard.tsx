'use client';
import Image from 'next/image';

type Props = {
  item: {
    id: number | string;
    name: string;
    price: number;
    image: string;
    description?: string;
    stock: number; // ✅ Tambahkan ini
  };
  onAdd: () => void;
};

export function MenuCard({ item, onAdd }: Props) {
  const isSoldOut = item.stock === 0;

  return (
    <div
      className={`bg-white rounded-xl shadow-lg p-3 flex flex-col items-center transition relative ${
        isSoldOut ? 'cursor-not-allowed opacity-50' : 'hover:scale-105 cursor-pointer'
      }`}
      onClick={() => {
        if (!isSoldOut) onAdd();
      }}
    >
      <div className="relative w-full aspect-[4/3] mb-2">
        <Image
          src={item.image}
          alt={item.name}
          fill
          className="object-cover rounded-[10px]"
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
        />
        {isSoldOut && (
          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center rounded-[10px]">
            <span className="text-white font-bold text-lg">Sold Out</span>
          </div>
        )}
      </div>

      <h3 className="text-center text-sm font-bold text-gray-800">{item.name}</h3>
      <p className="text-center text-gray-600 text-xs mt-1">
        Rp. {item.price.toLocaleString('id-ID')}
      </p>
    </div>
  );
}
