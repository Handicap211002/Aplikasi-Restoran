'use client';
import Image from 'next/image';
import { motion } from 'framer-motion';

type Props = {
  item: {
    id: number | string;
    name: string;
    price: number;
    image: string;
    description?: string;
    stock: number;
  };
  onAdd: () => void;
};

export function MenuCard({ item, onAdd }: Props) {
  const isSoldOut = item.stock === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.1, 
        ease: [0.25, 0.1, 0.25, 1], 
      }}
      viewport={{ once: true, amount: 0.3 }}
      style={{ willChange: 'opacity, transform' }}
      className={`bg-white rounded-xl shadow-lg p-3 flex flex-col items-center transition-all duration-300 ease-in-out relative ${
        isSoldOut
          ? 'cursor-not-allowed opacity-50'
          : 'hover:scale-105 cursor-pointer'
      }`}
      onClick={() => {
        if (!isSoldOut) onAdd();
      }}
    >
      <div className="relative w-full aspect-[4/3] mb-2">
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
        {isSoldOut && (
          <div className="absolute inset-0 bg-gray-300 bg-opacity-60 flex items-center justify-center rounded-[10px]">
            <span className="text-white font-bold text-lg">Sold Out</span>
          </div>
        )}
      </div>

      <h3 className="text-center text-sm font-bold text-gray-800">{item.name}</h3>
      <p className="text-center text-gray-600 text-xs mt-1">
        Rp. {item.price.toLocaleString('id-ID')}
      </p>
    </motion.div>
  );
}