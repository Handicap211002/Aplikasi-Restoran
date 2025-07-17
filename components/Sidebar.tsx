'use client';
import { FC, useEffect } from 'react';
import Link from 'next/link';

interface SidebarProps {
  isOpen: boolean;
  onSelectCategory: (categoryId: string) => void;
  onClose: () => void;
  currentCategory: string;
}

const foodCategories: Record<string, string> = {
  'ALL SEAFOOD': 'seafood',
  'KIKI SIGNATURE': 'kiki',
  'SOUP': 'soup',
  'MAIN COURSE': 'main',
  'VEGETABLES': 'vegetables',
  'PASTA & PIZZA': 'pasta',
  'SNACK & DESSERT': 'snack',
  'SET LUNCH A': 'luncha',
  'SET LUNCH B': 'lunchb',
  'SEAFOOD SET DINNER': 'seafooddinner',
  'LOBSTER BBQ SET DINNER': 'lobsterbbq',
  'HOT POT DINNER': 'hotpot',
  'TABLE BBQ DINNER': 'tablebbq',
};

const beverageCategories: Record<string, string> = {
  'COCKTAILS & MOCKTAILS': 'cocktail',
  'FRUIT JUICE': 'juice',
  'FRESH YOUNG COCONUT': 'coconut',
  'MILK SHAKE & SMOOTHIES': 'shake',
  'BEER': 'beer',
  'HOT / ICE TEA': 'tea',
  'HOT / ICE COFFEE': 'coffee',
  'GOURMET': 'gourmet',
  'SOFT DRINKS / SODA': 'softdrink',
  'MINERAL WATER': 'water',
};

export const Sidebar: FC<SidebarProps> = ({ isOpen, onSelectCategory, onClose, currentCategory }) => {
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
            {Object.entries(foodCategories).map(([name, id]) => (
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
            {Object.entries(beverageCategories).map(([name, id]) => (
              <li
                key={id}
                onClick={() => {
                  onSelectCategory(id);
                }}
                className={`cursor-pointer rounded px-2 py-1 hover:text-blue-500 ${
                  currentCategory === id ? 'bg-white/70 text-blue-600 font-semibold' : ''
                }`}
              >
                {name}
              </li>
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
