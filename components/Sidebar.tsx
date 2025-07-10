'use client';
import { FC, useEffect } from 'react';
import Link from 'next/link';

interface SidebarProps {
  isOpen: boolean;
  onSelectCategory: (categoryId: string) => void;
  onClose: () => void;
  currentCategory: string;
}

const categoryMap: Record<string, string> = {
  'ALL SEAFOOD': 'seafood',
  'KIKI SIGNATURE': 'kiki',
  'SOUP': 'soup',
  'MAIN COURSE': 'main',
  'VEGETABLES': 'vegetables',
  'PASTA & PIZZA': 'pasta',
  'SNACK & DESSERT': 'snack',
  'SET LUNCH A': 'lunch-a',
  'SET LUNCH B': 'lunch-b',
  'SEAFOOD SET DINNER': 'seafood-dinner',
  'LOBSTER BBQ SET DINNER': 'lobster-bbq',
  'HOT POT DINNER': 'hot-pot',
  'TABLE BBQ DINNER': 'table-bbq',
};

export const Sidebar: FC<SidebarProps> = ({ isOpen, onSelectCategory, onClose, currentCategory }) => {
  // Klik luar untuk tutup sidebar (mobile)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const sidebar = document.getElementById('sidebar');
      if (isOpen && sidebar && !sidebar.contains(e.target as Node)) {
        if (window.innerWidth < 768) onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <>
    {isOpen && (
      <div 
        className="fixed top-16 left-0 right-0 bottom-0 bg-black/30 z-30 md:hidden" 
        onClick={onClose} 
      />
    )}

      <aside
        id="sidebar"
        className={`bg-white md:bg-transparent w-64 p-4 pt-[64px] transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          fixed inset-y-0 left-0 z-40 h-full overflow-y-auto md:relative md:translate-x-0 flex flex-col`}
      >
        <div className="flex-grow">
          <h1 className="text-2xl font-bold mb-6 text-gray-800">FOOD</h1>
          <ul className="space-y-3 text-[15px] font-medium">
            {Object.entries(categoryMap).map(([name, id]) => (
              <li
                key={id}
                onClick={() => {
                  onSelectCategory(id);
                  if (window.innerWidth < 768) onClose();
                }}
                className={`cursor-pointer rounded px-2 py-1 hover:text-blue-500 ${
                  currentCategory === id ? 'bg-white/70 text-blue-600 font-semibold' : ''
                }`}
              >
                {name}
              </li>
            ))}
          </ul>

          <h2 className="text-2xl font-bold mt-6 mb-4 text-gray-800">BEVERAGES</h2>
          <ul className="space-y-3 text-[15px] font-medium">
            {[
              'COCKTAILS & MOCKTAILS',
              'FRUIT JUICE',
              'FRESH YOUNG COCONUT',
              'MILK SHAKE & SMOOTHIES',
              'BEER',
              'HOT / ICE TEA',
              'HOT / ICE COFFEE',
              'GOURMET',
              'SOFT DRINKS / SODA',
              'MINERAL WATER',
            ].map((item) => (
              <li key={item} className="px-2">{item}</li>
            ))}
          </ul>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-300">
          <Link
            href="/kasirlogin"
            className="text-2xl font-bold text-gray-800 block hover:text-blue-600 px-2"
          >
            Kasir
          </Link>
        </div>
      </aside>
    </>
  );
};