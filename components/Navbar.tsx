'use client';
import Image from 'next/image';
import { FC } from 'react';

interface NavbarProps {
  onToggleSidebar: () => void;
  onToggleOrderPanel: () => void;
  onSearch: (query: string) => void;
}

export const Navbar: FC<NavbarProps> = ({ onToggleSidebar, onToggleOrderPanel, onSearch }) => {
  return (
    <header className="w-full flex items-center justify-between bg-white px-6 py-1 shadow-md z-50 sticky top-0">
      {/* Kiri: Hamburger + Logo */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="text-2xl text-gray-700 hover:text-black focus:outline-none transition-transform"
          aria-label="Toggle sidebar"
        >
          ☰
        </button>
        <div className="flex items-center gap-1">
          <Image
            src="/logo.png"
            alt="Logo"
            width={95}
            height={95}
            className="w-auto h-auto"
          />
        </div>
      </div>

      {/* Kanan: Search + Keranjang */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="flex items-center bg-gray-100 px-4 py-3 rounded-full w-64 sm:w-80">
          {/* Ikon lebih polos (pakai SVG) */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 text-black mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35M10.5 17a6.5 6.5 0 100-13 6.5 6.5 0 000 13z"
            />
          </svg>

          <input
            type="text"
            placeholder="Search"
            className="bg-transparent outline-none text-sm placeholder:text-gray-400 w-full"
            onChange={(e) => onSearch(e.target.value)} />
        </div>

        {/* Keranjang */}
        <button
          onClick={onToggleOrderPanel}
          className="text-2xl text-gray-700 hover:text-black focus:outline-none"
          title="Lihat pesanan"
        >
          🛒
        </button>
      </div>
    </header>
  );
};