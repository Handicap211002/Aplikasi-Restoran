'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { MenuItem } from '@/types';
import { Navbar } from '../../components/Navbar';
import { Sidebar } from '../../components/Sidebar';
import { OrderPanel } from '../../components/OrderPanel';
import { ModalDetail } from '../../components/ModalDetail';
import { MenuCard } from '../../components/MenuCard';

const menuItems: MenuItem[] = [
  // KIKI SIGNATURE (4 items)
  { id: 101, name: 'SIGNATURE LOBSTER', price: 850000, image: '/signature1.png', quantity: 1, category: 'KIKI SIGNATURE' },
  { id: 102, name: 'SIGNATURE CRAB', price: 950000, image: '/signature2.png', quantity: 1, category: 'KIKI SIGNATURE' },
  { id: 103, name: 'SIGNATURE PRAWN', price: 750000, image: '/signature3.png', quantity: 1, category: 'KIKI SIGNATURE' },
  { id: 104, name: 'SIGNATURE MIX SEAFOOD', price: 900000, image: '/signature4.png', quantity: 1, category: 'KIKI SIGNATURE' },
  
  // SOUP (4 items)
  { id: 201, name: 'TOMYUM SEAFOOD', price: 150000, image: '/soup1.png', quantity: 1, category: 'SOUP' },
  { id: 202, name: 'CRAB MEAT SOUP', price: 180000, image: '/soup2.png', quantity: 1, category: 'SOUP' },
  { id: 203, name: 'FISH HEAD CURRY', price: 160000, image: '/soup3.png', quantity: 1, category: 'SOUP' },
  { id: 204, name: 'SEAFOOD CHOWDER', price: 140000, image: '/soup4.png', quantity: 1, category: 'SOUP' },
  
  // MAIN COURSE (4 items)
  { id: 301, name: 'GRILLED SALMON', price: 220000, image: '/main1.png', quantity: 1, category: 'MAIN COURSE' },
  { id: 302, name: 'BUTTER PRAWN', price: 190000, image: '/main2.png', quantity: 1, category: 'MAIN COURSE' },
  { id: 303, name: 'STEAMED FISH', price: 210000, image: '/main3.png', quantity: 1, category: 'MAIN COURSE' },
  { id: 304, name: 'SALTED EGG CRAB', price: 250000, image: '/main4.png', quantity: 1, category: 'MAIN COURSE' },
  
  // ALL SEAFOOD (original items)
  { id: 1, name: 'LOBSTER 350gr', price: 650000, image: '/allseafood1.png', quantity: 1, category: 'ALL SEAFOOD' },
  { id: 2, name: 'FLOWER CRAB 1kg', price: 750000, image: '/allseafood1.png', quantity: 1, category: 'ALL SEAFOOD' },
  { id: 3, name: 'IKAN BAKAR', price: 125000, image: '/allseafood1.png', quantity: 1, category: 'ALL SEAFOOD' },
  { id: 4, name: 'GONGGONG 1kg', price: 120000, image: '/allseafood1.png', quantity: 1, category: 'ALL SEAFOOD' },
  { id: 5, name: 'KAPIS / SCALLOP', price: 135000, image: '/allseafood1.png', quantity: 1, category: 'ALL SEAFOOD' },
  { id: 6, name: 'CEREAL PRAWN', price: 145000, image: '/allseafood1.png', quantity: 1, category: 'ALL SEAFOOD' },
  { id: 7, name: 'SOTONG BUNTING', price: 120000, image: '/allseafood1.png', quantity: 1, category: 'ALL SEAFOOD' },
  { id: 8, name: 'SOTONG GORENG TEPUNG', price: 120000, image: '/allseafood1.png', quantity: 1, category: 'ALL SEAFOOD' },
  { id: 9, name: 'KAPIS / SCALLOP', price: 135000, image: '/allseafood1.png', quantity: 1, category: 'ALL SEAFOOD' },
  { id: 10, name: 'CEREAL PRAWN', price: 145000, image: '/allseafood1.png', quantity: 1, category: 'ALL SEAFOOD' },
  { id: 11, name: 'SOTONG BUNTING', price: 120000, image: '/allseafood1.png', quantity: 1, category: 'ALL SEAFOOD' },
  { id: 12, name: 'SOTONG GORENG TEPUNG', price: 120000, image: '/allseafood1.png', quantity: 1, category: 'ALL SEAFOOD' },
  { id: 13, name: 'KAPIS / SCALLOP', price: 135000, image: '/allseafood1.png', quantity: 1, category: 'ALL SEAFOOD' },
  { id: 14, name: 'CEREAL PRAWN', price: 145000, image: '/allseafood1.png', quantity: 1, category: 'ALL SEAFOOD' },
  { id: 15, name: 'SOTONG BUNTING', price: 120000, image: '/allseafood1.png', quantity: 1, category: 'ALL SEAFOOD' },
  { id: 16, name: 'SOTONG GORENG TEPUNG', price: 120000, image: '/allseafood1.png', quantity: 1, category: 'ALL SEAFOOD' },
];

export default function MainMenuPage() {
  const [orderItems, setOrderItems] = useState<MenuItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [showOrderPanel, setShowOrderPanel] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<string>('');

  const kikiRef = useRef<HTMLDivElement>(null);
  const soupRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const seafoodRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setCurrentCategory(entry.target.getAttribute('data-category') || '');
          }
        });
      },
      {
        threshold: 0.5,
      }
    );

    const refs = [
      { ref: seafoodRef, id: 'seafood' },
      { ref: kikiRef, id: 'kiki' },
      { ref: soupRef, id: 'soup' },
      { ref: mainRef, id: 'main' },
    ];

    refs.forEach(({ ref }) => {
      if (ref.current) observer.observe(ref.current);
    });

    return () => {
      refs.forEach(({ ref }) => {
        if (ref.current) observer.unobserve(ref.current);
      });
    };
  }, []);

    const categoryRefs = {
      seafood: seafoodRef,
      kiki: kikiRef,
      soup: soupRef,
      main: mainRef,
      // Tambahkan semua kategori lain jika ada
    };

    const handleScrollToCategory = (categoryId: string) => {
      setCurrentCategory(categoryId); // langsung highlight
      const ref = categoryRefs[categoryId as keyof typeof categoryRefs];
      if (ref?.current) {
        ref.current.scrollIntoView({ behavior: 'smooth' });
      }
    };

  const openModal = (item: MenuItem) => {
    setSelectedItem({ ...item, quantity: 1 });
    setShowModal(true);
  };

  const closeModal = () => {
    setSelectedItem(null);
    setShowModal(false);
  };

  const addToOrder = (item: MenuItem) => {
    const index = orderItems.findIndex((i) => i.id === item.id);
    if (index !== -1) {
      const updated = [...orderItems];
      updated[index].quantity += 1;
      setOrderItems(updated);
    } else {
      setOrderItems([
        ...orderItems,
        {
          ...item,
          quantity: 1,
          note: 'Jangan pedas, garam sedikit',
        },
      ]);
    }
    setShowOrderPanel(true);
  };

  const handleToggleSidebar = () => {
    setShowSidebar((prev) => {
      if (!prev) setShowOrderPanel(false);
      return !prev;
    });
  };

  const handleToggleOrderPanel = () => {
    setShowOrderPanel((prev) => {
      if (!prev) setShowSidebar(false);
      return !prev;
    });
  };

  const handleIncrease = (index: number) => {
    const updated = [...orderItems];
    updated[index].quantity += 1;
    setOrderItems(updated);
  };

  const handleDecrease = (index: number) => {
    const updated = [...orderItems];
    if (updated[index].quantity > 1) {
      updated[index].quantity -= 1;
    } else {
      updated.splice(index, 1);
    }
    setOrderItems(updated);
  };

  const handleRemove = (index: number) => {
    const updated = [...orderItems];
    updated.splice(index, 1);
    setOrderItems(updated);
  };

  const menuByCategory = menuItems.reduce((acc, item) => {
    const category = item.category || 'OTHER';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  return (
    <div className="h-screen overflow-hidden relative">
      <Image src="/bg.png" alt="Background" fill className="object-cover -z-10" priority />
      <div className="absolute inset-0 bg-white/70 z-0" />

      <Navbar
        onToggleSidebar={handleToggleSidebar}
        onToggleOrderPanel={handleToggleOrderPanel}
      />

      <div className="flex h-[calc(100%-64px)] relative z-10">
        {showSidebar && (
          <Sidebar
            isOpen={showSidebar}
            onSelectCategory={handleScrollToCategory}
            onClose={() => setShowSidebar(true)}
            currentCategory={currentCategory}
          />
        )}

        <main className="flex-1 overflow-y-auto p-6 space-y-10">
          <section ref={seafoodRef} data-category="seafood" className="scroll-mt-12">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">ALL SEAFOOD</h2>
            <div className={`grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 ${showSidebar || showOrderPanel ? 'xl:grid-cols-4 2xl:grid-cols-5' : 'xl:grid-cols-6 2xl:grid-cols-7'}`}>
              {menuByCategory['ALL SEAFOOD']?.map((item) => (
                <MenuCard key={item.id} item={item} onAdd={() => openModal(item)} />
              ))}
            </div>
          </section>

          <section ref={kikiRef} data-category="kiki" className="scroll-mt-12">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">KIKI SIGNATURE</h2>
            <div className={`grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 ${showSidebar || showOrderPanel ? 'xl:grid-cols-4 2xl:grid-cols-5' : 'xl:grid-cols-6 2xl:grid-cols-7'}`}>
              {menuByCategory['KIKI SIGNATURE']?.map((item) => (
                <MenuCard key={item.id} item={item} onAdd={() => openModal(item)} />
              ))}
            </div>
          </section>

          <section ref={soupRef} data-category="soup" className="scroll-mt-12">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">SOUP</h2>
            <div className={`grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 ${showSidebar || showOrderPanel ? 'xl:grid-cols-4 2xl:grid-cols-5' : 'xl:grid-cols-6 2xl:grid-cols-7'}`}>
              {menuByCategory['SOUP']?.map((item) => (
                <MenuCard key={item.id} item={item} onAdd={() => openModal(item)} />
              ))}
            </div>
          </section>

          <section ref={mainRef} data-category="main">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">MAIN COURSE</h2>
            <div className={`grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 ${showSidebar || showOrderPanel ? 'xl:grid-cols-4 2xl:grid-cols-5' : 'xl:grid-cols-6 2xl:grid-cols-7'}`}>
              {menuByCategory['MAIN COURSE']?.map((item) => (
                <MenuCard key={item.id} item={item} onAdd={() => openModal(item)} />
              ))}
            </div>
          </section>
        </main>

        {showOrderPanel && (
          <OrderPanel
            isOpen={showOrderPanel}
            orderItems={orderItems}
            onClose={() => setShowOrderPanel(false)}
            onIncrease={handleIncrease}
            onDecrease={handleDecrease}
            onRemove={handleRemove}
          />
        )}
      </div>

      {showModal && selectedItem && (
        <ModalDetail
          item={selectedItem}
          onAdd={() => {
            addToOrder(selectedItem);
            closeModal();
          }}
          onClose={closeModal}
        />
      )}
    </div>
  );
}