'use client'
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { MenuItem } from '@/types'
import { Navbar } from '../../components/Navbar'
import { Sidebar } from '../../components/Sidebar'
import { OrderPanel } from '../../components/OrderPanel'
import { ModalDetail } from '../../components/ModalDetail'
import { MenuCard } from '../../components/MenuCard'
import { supabase } from '@/lib/supabaseClient'

export default function MainMenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [orderItems, setOrderItems] = useState<MenuItem[]>([])
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [showOrderPanel, setShowOrderPanel] = useState(false)
  const [currentCategory, setCurrentCategory] = useState<string>('')

  const kikiRef = useRef<HTMLDivElement>(null)
  const soupRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLDivElement>(null)
  const seafoodRef = useRef<HTMLDivElement>(null)
  const vegetablesRef = useRef<HTMLDivElement>(null)
  const pastaRef = useRef<HTMLDivElement>(null)
  const snackRef = useRef<HTMLDivElement>(null)
  const lunchaRef = useRef<HTMLDivElement>(null)
  const lunchbRef = useRef<HTMLDivElement>(null)
  const seafooddinnerRef = useRef<HTMLDivElement>(null)
  const lobsterbbqRef = useRef<HTMLDivElement>(null)
  const hotpotRef = useRef<HTMLDivElement>(null)
  const tablebbqRef = useRef<HTMLDivElement>(null)
  const cocktailRef = useRef<HTMLDivElement>(null)
  const juiceRef = useRef<HTMLDivElement>(null)
  const coconutRef = useRef<HTMLDivElement>(null)
  const shakeRef = useRef<HTMLDivElement>(null)
  const beerRef = useRef<HTMLDivElement>(null)
  const teaRef = useRef<HTMLDivElement>(null)
  const coffeeRef = useRef<HTMLDivElement>(null)
  const gourmetRef = useRef<HTMLDivElement>(null)
  const softdrinkRef = useRef<HTMLDivElement>(null)
  const waterRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setCurrentCategory(entry.target.getAttribute('data-category') || '')
          }
        })
      },
      { threshold: 0.5 }
    )

  const refs = [
    { ref: seafoodRef, id: 'seafood' },
    { ref: kikiRef, id: 'kiki' },
    { ref: soupRef, id: 'soup' },
    { ref: mainRef, id: 'main' },
    { ref: vegetablesRef, id: 'vegetables' },
    { ref: pastaRef, id: 'pasta' },
    { ref: snackRef, id: 'snack' },
    { ref: lunchaRef, id: 'luncha' },
    { ref: lunchbRef, id: 'lunchb' },
    { ref: seafooddinnerRef, id: 'seafooddinner' },
    { ref: lobsterbbqRef, id: 'lobsterbbq' },
    { ref: hotpotRef, id: 'hotpot' },
    { ref: tablebbqRef, id: 'tablebbq' },
    { ref: cocktailRef, id: 'cocktail' },
    { ref: juiceRef, id: 'juice' },
    { ref: coconutRef, id: 'coconut' },
    { ref: shakeRef, id: 'shake' },
    { ref: beerRef, id: 'beer' },
    { ref: teaRef, id: 'tea' },
    { ref: coffeeRef, id: 'coffee' },
    { ref: gourmetRef, id: 'gourmet' },
    { ref: softdrinkRef, id: 'softdrink' },
    { ref: waterRef, id: 'water' },
  ]

    refs.forEach(({ ref }) => {
      if (ref.current) observer.observe(ref.current)
    })

    return () => {
      refs.forEach(({ ref }) => {
        if (ref.current) observer.unobserve(ref.current)
      })
    }
  }, [])

  const categoryRefs = {
    seafood: seafoodRef,
    kiki: kikiRef,
    soup: soupRef,
    main: mainRef,
    vegetables: vegetablesRef,
    pasta: pastaRef,
    snack: snackRef,
    luncha: lunchaRef,
    lunchb: lunchbRef,
    seafooddinner: seafooddinnerRef,
    lobsterbbq: lobsterbbqRef,
    hotpot: hotpotRef,
    tablebbq: tablebbqRef,
    cocktail: cocktailRef,
    juice: juiceRef,
    coconut: coconutRef,
    shake: shakeRef,
    beer: beerRef,
    tea: teaRef,
    coffee: coffeeRef,
    gourmet: gourmetRef,
    softdrink: softdrinkRef,
    water: waterRef,
  }

  const handleScrollToCategory = (categoryId: string) => {
    setCurrentCategory(categoryId)
    const ref = categoryRefs[categoryId as keyof typeof categoryRefs]
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const openModal = (item: MenuItem) => {
    setSelectedItem({ ...item, quantity: 1 })
    setShowModal(true)
  }

  const closeModal = () => {
    setSelectedItem(null)
    setShowModal(false)
  }

  const addToOrder = (item: MenuItem) => {
    const index = orderItems.findIndex((i) => i.id === item.id)
    if (index !== -1) {
      const updated = [...orderItems]
      updated[index].quantity += 1
      setOrderItems(updated)
    } else {
      setOrderItems([
        ...orderItems,
        {
          ...item,
          quantity: 1,
          note: 'Jangan pedas, garam sedikit',
        },
      ])
    }
    setShowOrderPanel(true)
  }

  const handleToggleSidebar = () => {
    setShowSidebar((prev) => {
      if (!prev) setShowOrderPanel(false)
      return !prev
    })
  }

  const handleToggleOrderPanel = () => {
    setShowOrderPanel((prev) => {
      if (!prev) setShowSidebar(false)
      return !prev
    })
  }

  const handleIncrease = (index: number) => {
    const updated = [...orderItems]
    updated[index].quantity += 1
    setOrderItems(updated)
  }

  const handleDecrease = (index: number) => {
    const updated = [...orderItems]
    if (updated[index].quantity > 1) {
      updated[index].quantity -= 1
    } else {
      updated.splice(index, 1)
    }
    setOrderItems(updated)
  }

  const handleRemove = (index: number) => {
    const updated = [...orderItems]
    updated.splice(index, 1)
    setOrderItems(updated)
  }

  const menuByCategory = menuItems.reduce((acc, item) => {
    const categoryName = item.category?.name || 'OTHER'
    if (!acc[categoryName]) {
      acc[categoryName] = []
    }
    acc[categoryName].push(item)
    return acc
  }, {} as Record<string, MenuItem[]>)

  // Fetch menu dari Supabase
  useEffect(() => {
    const fetchMenuItems = async () => {
      const { data, error } = await supabase
        .from('MenuItem')
        .select(`
          id,
          name,
          price,
          image,
          description,
          category:Category (
            id,
            name,
            slug
          )
        `)

      if (error) {
        console.error('Error fetching menu items:', error)
      } else {
        // mapping biar cocok sama MenuItem (tambah quantity & note)
        const mappedItems = (data as any[]).map((item) => ({
          ...item,
          quantity: 1,
          note: '',
        }))
        setMenuItems(mappedItems)
      }
    }

    fetchMenuItems()
  }, [])

  return (
    <div className="h-screen overflow-hidden relative">
      <Image
        src="/bg.png"
        alt="Background"
        fill
        className="object-cover -z-10"
        priority
      />
      <div className="absolute inset-0 bg-white/70 z-0" />
      <div className="z-50">
        <Navbar
          onToggleSidebar={handleToggleSidebar}
          onToggleOrderPanel={handleToggleOrderPanel}
        />
      </div>
      <div className="flex h-[calc(100%-64px)] relative z-10">
        {showSidebar && (
          <div className="z-40">
            <Sidebar
              isOpen={showSidebar}
              onSelectCategory={handleScrollToCategory}
              onClose={() => setShowSidebar(false)}
              currentCategory={currentCategory}
            />
          </div>
        )}

      <main className="flex-1 overflow-y-auto p-6 space-y-10">
        {[
          'ALL SEAFOOD',
          'KIKI SIGNATURE',
          'SOUP',
          'MAIN COURSE',
          'VEGETABLES',
          'PASTA & PIZZA',
          'SNACK & DESSERT',
          'SET LUNCH A',
          'SET LUNCH B',
          'SEAFOOD SET DINNER',
          'LOBSTER BBQ SET DINNER',
          'HOT POT DINNER',
          'TABLE BBQ DINNER',
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
        ].map((categoryName) => (
          <section
            key={categoryName}
            ref={
              categoryName === 'ALL SEAFOOD'
                ? seafoodRef
                : categoryName === 'KIKI SIGNATURE'
                ? kikiRef
                : categoryName === 'SOUP'
                ? soupRef
                : categoryName === 'MAIN COURSE'
                ? mainRef
                : categoryName === 'VEGETABLES'
                ? vegetablesRef
                : categoryName === 'PASTA & PIZZA'
                ? pastaRef
                : categoryName === 'SNACK & DESSERT'
                ? snackRef
                : categoryName === 'SET LUNCH A'
                ? lunchaRef
                : categoryName === 'SET LUNCH B'
                ? lunchbRef
                : categoryName === 'SEAFOOD SET DINNER'
                ? seafooddinnerRef
                : categoryName === 'LOBSTER BBQ SET DINNER'
                ? lobsterbbqRef
                : categoryName === 'HOT POT DINNER'
                ? hotpotRef
                : categoryName === 'TABLE BBQ DINNER'
                ? tablebbqRef
                : categoryName === 'COCKTAILS & MOCKTAILS'
                ? cocktailRef
                : categoryName === 'FRUIT JUICE'
                ? juiceRef
                : categoryName === 'FRESH YOUNG COCONUT'
                ? coconutRef
                : categoryName === 'MILK SHAKE & SMOOTHIES'
                ? shakeRef
                : categoryName === 'BEER'
                ? beerRef
                : categoryName === 'HOT / ICE TEA'
                ? teaRef
                : categoryName === 'HOT / ICE COFFEE'
                ? coffeeRef
                : categoryName === 'GOURMET'
                ? gourmetRef
                : categoryName === 'SOFT DRINKS / SODA'
                ? softdrinkRef
                : waterRef
            }
            data-category={categoryName.toLowerCase().replace(/\s/g, '')}
            className="scroll-mt-12"
          >
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">
              {categoryName}
            </h2>
            <div
              className={`grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 ${
                showSidebar || showOrderPanel
                  ? 'xl:grid-cols-4 2xl:grid-cols-5'
                  : 'xl:grid-cols-6 2xl:grid-cols-7'
              }`}
            >
              {menuByCategory[categoryName]?.map((item) => (
                <MenuCard
                  key={item.id}
                  item={item}
                  onAdd={() => openModal(item)}
                />
              ))}
            </div>
          </section>
        ))}
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
            addToOrder(selectedItem)
            closeModal()
          }}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
