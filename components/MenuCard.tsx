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
      {/* Gambar responsif dengan aspect ratio */}
      <div className="relative w-full aspect-[4/3] mb-2">
        <Image
          src={item.image}
          alt={item.name}
          fill
          className="object-cover rounded-[10px]"
          sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
        />
      </div>
      <h3 className="text-center text-sm font-bold text-gray-800">{item.name}</h3>
      <p className="text-center text-gray-600 text-xs mt-1">
        Rp. {item.price.toLocaleString('id-ID')}
      </p>
    </div>
  );
}
