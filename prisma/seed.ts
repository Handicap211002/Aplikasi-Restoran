import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Hapus semua data lama biar clean
  await prisma.menuItem.deleteMany()
  await prisma.category.deleteMany()

  // Buat kategori
  const categories = await prisma.$transaction([
    prisma.category.create({ data: { name: 'ALL SEAFOOD', slug: 'seafood' } }),
    prisma.category.create({ data: { name: 'KIKI SIGNATURE', slug: 'kiki' } }),
    prisma.category.create({ data: { name: 'SOUP', slug: 'soup' } }),
    prisma.category.create({ data: { name: 'MAIN COURSE', slug: 'main' } }),
    prisma.category.create({ data: { name: 'VEGETABLES', slug: 'vegetables' } }),
    prisma.category.create({ data: { name: 'PASTA & PIZZA', slug: 'pasta' } }),
    prisma.category.create({ data: { name: 'SNACK & DESSERT', slug: 'snack' } }),
    prisma.category.create({ data: { name: 'SET LUNCH A', slug: 'luncha' } }),
    prisma.category.create({ data: { name: 'SET LUNCH B', slug: 'lunchb' } }),
    prisma.category.create({ data: { name: 'SEAFOOD SET DINNER', slug: 'seafooddinner' } }),
    prisma.category.create({ data: { name: 'LOBSTER BBQ SET DINNER', slug: 'lobsterbbq' } }),
    prisma.category.create({ data: { name: 'HOT POT DINNER', slug: 'hotpot' } }),
    prisma.category.create({ data: { name: 'TABLE BBQ DINNER', slug: 'tablebbq' } }),
    // Beverage categories
    prisma.category.create({ data: { name: 'COCKTAILS & MOCKTAILS', slug: 'cocktail' } }),
    prisma.category.create({ data: { name: 'FRUIT JUICE', slug: 'juice' } }),
    prisma.category.create({ data: { name: 'FRESH YOUNG COCONUT', slug: 'coconut' } }),
    prisma.category.create({ data: { name: 'MILK SHAKE & SMOOTHIES', slug: 'shake' } }),
    prisma.category.create({ data: { name: 'BEER', slug: 'beer' } }),
    prisma.category.create({ data: { name: 'HOT / ICE TEA', slug: 'tea' } }),
    prisma.category.create({ data: { name: 'HOT / ICE COFFEE', slug: 'coffee' } }),
    prisma.category.create({ data: { name: 'GOURMET', slug: 'gourmet' } }),
    prisma.category.create({ data: { name: 'SOFT DRINKS / SODA', slug: 'softdrink' } }),
    prisma.category.create({ data: { name: 'MINERAL WATER', slug: 'water' } }),
  ])

  // Helper ambil categoryId
  const getCategoryId = (slug: string) => {
    const category = categories.find(c => c.slug === slug)
    if (!category) throw new Error(`Category with slug ${slug} not found`)
    return category.id
  }

  // Buat menu item dengan deskripsi
  await prisma.menuItem.createMany({
    data: [
      // KIKI SIGNATURE
      { name: 'SIGNATURE LOBSTER', price: 850000, image: '/signature1.png', description: 'Stir fried Lobster with Chef sambal Padang style.', categoryId: getCategoryId('kiki') },
      { name: 'SIGNATURE CRAB', price: 950000, image: '/signature2.png', description: 'Sauteed Crab in Chef special sauce.', categoryId: getCategoryId('kiki') },
      { name: 'SIGNATURE PRAWN', price: 750000, image: '/signature3.png', description: 'Grilled prawns with signature butter sauce.', categoryId: getCategoryId('kiki') },
      { name: 'SIGNATURE MIX SEAFOOD', price: 900000, image: '/signature4.png', description: 'Mixed seafood platter with secret sambal.', categoryId: getCategoryId('kiki') },

      // SOUP
      { name: 'TOMYUM SEAFOOD', price: 150000, image: '/soup1.png', description: 'Spicy Thai Tomyum with fresh seafood.', categoryId: getCategoryId('soup') },
      { name: 'CRAB MEAT SOUP', price: 180000, image: '/soup2.png', description: 'Crab meat soup with rich savory broth.', categoryId: getCategoryId('soup') },
      { name: 'FISH HEAD CURRY', price: 160000, image: '/soup3.png', description: 'Classic fish head curry with spices.', categoryId: getCategoryId('soup') },
      { name: 'SEAFOOD CHOWDER', price: 140000, image: '/soup4.png', description: 'Creamy seafood chowder with bread.', categoryId: getCategoryId('soup') },

      // MAIN COURSE
      { name: 'GRILLED SALMON', price: 220000, image: '/main1.png', description: 'Perfectly grilled salmon fillet.', categoryId: getCategoryId('main') },
      { name: 'BUTTER PRAWN', price: 190000, image: '/main2.png', description: 'Crispy butter prawn with curry leaves.', categoryId: getCategoryId('main') },
      { name: 'STEAMED FISH', price: 210000, image: '/main3.png', description: 'Steamed fish with ginger soy sauce.', categoryId: getCategoryId('main') },
      { name: 'SALTED EGG CRAB', price: 250000, image: '/main4.png', description: 'Crab coated with salted egg sauce.', categoryId: getCategoryId('main') },

      // ALL SEAFOOD
      { name: 'LOBSTER 350gr', price: 650000, image: '/allseafood1.png', description: 'Fresh 350gr lobster grilled to perfection.', categoryId: getCategoryId('seafood') },
      { name: 'FLOWER CRAB 1kg', price: 750000, image: '/allseafood1.png', description: '1kg Flower crab with garlic sauce.', categoryId: getCategoryId('seafood') },
      { name: 'IKAN BAKAR', price: 125000, image: '/allseafood1.png', description: 'Grilled fish with sambal belacan.', categoryId: getCategoryId('seafood') },
      { name: 'GONGGONG 1kg', price: 120000, image: '/allseafood1.png', description: 'Local seafood delicacy, Gonggong.', categoryId: getCategoryId('seafood') },
      { name: 'KAPIS / SCALLOP', price: 135000, image: '/allseafood1.png', description: 'Pan-seared scallop with butter.', categoryId: getCategoryId('seafood') },
      { name: 'CEREAL PRAWN', price: 145000, image: '/allseafood1.png', description: 'Prawn cooked with crispy cereal.', categoryId: getCategoryId('seafood') },
      { name: 'SOTONG BUNTING', price: 120000, image: '/allseafood1.png', description: 'Stuffed squid with chili paste.', categoryId: getCategoryId('seafood') },
      { name: 'SOTONG GORENG TEPUNG', price: 120000, image: '/allseafood1.png', description: 'Deep-fried battered squid.', categoryId: getCategoryId('seafood') },
            // VEGETABLES
      { name: 'Tumis Kangkung', price: 50000, image: '/vegetables1.png', description: 'Stir-fried water spinach.', categoryId: getCategoryId('vegetables') },
      { name: 'Capcay Seafood', price: 75000, image: '/vegetables2.png', description: 'Mixed vegetables with seafood.', categoryId: getCategoryId('vegetables') },
      { name: 'Brokoli Saus Tiram', price: 70000, image: '/vegetables3.png', description: 'Broccoli with oyster sauce.', categoryId: getCategoryId('vegetables') },
      { name: 'Baby Kailan Garlic', price: 68000, image: '/vegetables4.png', description: 'Baby kailan with garlic.', categoryId: getCategoryId('vegetables') },

      // PASTA & PIZZA
      { name: 'Spaghetti Aglio Olio', price: 85000, image: '/pasta1.png', description: 'Spaghetti with garlic and chili.', categoryId: getCategoryId('pasta') },
      { name: 'Seafood Pizza', price: 120000, image: '/pasta2.png', description: 'Pizza with mixed seafood topping.', categoryId: getCategoryId('pasta') },
      { name: 'Fettucine Carbonara', price: 95000, image: '/pasta3.png', description: 'Fettucine with creamy sauce.', categoryId: getCategoryId('pasta') },
      { name: 'Salmon Pizza', price: 130000, image: '/pasta4.png', description: 'Pizza topped with smoked salmon.', categoryId: getCategoryId('pasta') },

      // SNACK & DESSERT
      { name: 'Calamari Ring', price: 60000, image: '/snack1.png', description: 'Fried calamari rings.', categoryId: getCategoryId('snack') },
      { name: 'French Fries', price: 45000, image: '/snack2.png', description: 'Crispy french fries.', categoryId: getCategoryId('snack') },
      { name: 'Churros', price: 50000, image: '/snack3.png', description: 'Spanish fried-dough pastry.', categoryId: getCategoryId('snack') },
      { name: 'Chocolate Lava Cake', price: 70000, image: '/snack4.png', description: 'Warm chocolate cake with molten center.', categoryId: getCategoryId('snack') },

      // COCKTAILS & MOCKTAILS
      { name: 'Mojito', price: 85000, image: '/cocktail1.png', description: 'Mint, lime, and rum.', categoryId: getCategoryId('cocktail') },
      { name: 'Virgin Pina Colada', price: 75000, image: '/cocktail2.png', description: 'Coconut and pineapple mocktail.', categoryId: getCategoryId('cocktail') },
      { name: 'Lychee Martini', price: 95000, image: '/cocktail3.png', description: 'Vodka with lychee.', categoryId: getCategoryId('cocktail') },
      { name: 'Fruit Punch', price: 70000, image: '/cocktail4.png', description: 'Mixed tropical fruits drink.', categoryId: getCategoryId('cocktail') },
      // FRUIT JUICE
      { name: 'Orange Juice', price: 40000, image: '/juice1.png', description: 'Freshly squeezed orange juice.', categoryId: getCategoryId('juice') },
      { name: 'Apple Juice', price: 40000, image: '/juice2.png', description: 'Chilled apple juice.', categoryId: getCategoryId('juice') },
      { name: 'Carrot Juice', price: 35000, image: '/juice3.png', description: 'Healthy carrot juice.', categoryId: getCategoryId('juice') },
      { name: 'Mix Fruit Juice', price: 45000, image: '/juice4.png', description: 'Blend of seasonal fruits.', categoryId: getCategoryId('juice') },

      // FRESH YOUNG COCONUT
      { name: 'Coconut Original', price: 35000, image: '/coconut1.png', description: 'Fresh young coconut water.', categoryId: getCategoryId('coconut') },
      { name: 'Coconut Lemon', price: 38000, image: '/coconut2.png', description: 'Coconut water with lemon.', categoryId: getCategoryId('coconut') },
      { name: 'Coconut Ice', price: 37000, image: '/coconut3.png', description: 'Chilled coconut with ice.', categoryId: getCategoryId('coconut') },
      { name: 'Coconut Milkshake', price: 42000, image: '/coconut4.png', description: 'Coconut blended with milk.', categoryId: getCategoryId('coconut') },

      // MILK SHAKE & SMOOTHIES
      { name: 'Vanilla Milkshake', price: 45000, image: '/shake1.png', description: 'Classic vanilla milkshake.', categoryId: getCategoryId('shake') },
      { name: 'Strawberry Smoothie', price: 48000, image: '/shake2.png', description: 'Strawberry yogurt smoothie.', categoryId: getCategoryId('shake') },
      { name: 'Mango Milkshake', price: 47000, image: '/shake3.png', description: 'Mango blended with fresh milk.', categoryId: getCategoryId('shake') },
      { name: 'Choco Banana Smoothie', price: 50000, image: '/shake4.png', description: 'Banana and chocolate blend.', categoryId: getCategoryId('shake') },

      // BEER
      { name: 'Bintang Large', price: 55000, image: '/beer1.png', description: 'Popular Indonesian lager.', categoryId: getCategoryId('beer') },
      { name: 'Heineken', price: 60000, image: '/beer2.png', description: 'International premium beer.', categoryId: getCategoryId('beer') },
      { name: 'Guinness Stout', price: 65000, image: '/beer3.png', description: 'Rich dark stout beer.', categoryId: getCategoryId('beer') },
      { name: 'Carlsberg', price: 58000, image: '/beer4.png', description: 'Crisp and refreshing lager.', categoryId: getCategoryId('beer') },

      // HOT / ICE TEA
      { name: 'Hot Black Tea', price: 25000, image: '/tea1.png', description: 'Hot brewed black tea.', categoryId: getCategoryId('tea') },
      { name: 'Iced Lemon Tea', price: 28000, image: '/tea2.png', description: 'Iced tea with lemon.', categoryId: getCategoryId('tea') },
      { name: 'Hot Jasmine Tea', price: 27000, image: '/tea3.png', description: 'Aromatic jasmine tea.', categoryId: getCategoryId('tea') },
      { name: 'Iced Lychee Tea', price: 30000, image: '/tea4.png', description: 'Iced tea with lychee fruit.', categoryId: getCategoryId('tea') },

      // HOT / ICE COFFEE
      { name: 'Hot Americano', price: 30000, image: '/coffee1.png', description: 'Classic black coffee.', categoryId: getCategoryId('coffee') },
      { name: 'Iced Latte', price: 35000, image: '/coffee2.png', description: 'Chilled milk coffee.', categoryId: getCategoryId('coffee') },
      { name: 'Hot Cappuccino', price: 35000, image: '/coffee3.png', description: 'Espresso with frothed milk.', categoryId: getCategoryId('coffee') },
      { name: 'Iced Caramel Macchiato', price: 40000, image: '/coffee4.png', description: 'Sweet iced coffee with caramel.', categoryId: getCategoryId('coffee') },

      // GOURMET
      { name: 'Grilled Australian Ribeye', price: 250000, image: '/gourmet1.png', description: 'Tender ribeye steak.', categoryId: getCategoryId('gourmet') },
      { name: 'Lamb Chop', price: 230000, image: '/gourmet2.png', description: 'Grilled lamb with rosemary.', categoryId: getCategoryId('gourmet') },
      { name: 'Roast Duck', price: 200000, image: '/gourmet3.png', description: 'Crispy roasted duck.', categoryId: getCategoryId('gourmet') },
      { name: 'Salmon Teriyaki', price: 220000, image: '/gourmet4.png', description: 'Grilled salmon in teriyaki sauce.', categoryId: getCategoryId('gourmet') },

      // SOFT DRINKS / SODA
      { name: 'Coca Cola', price: 25000, image: '/softdrink1.png', description: 'Chilled Coca Cola.', categoryId: getCategoryId('softdrink') },
      { name: 'Sprite', price: 25000, image: '/softdrink2.png', description: 'Lemon lime soda.', categoryId: getCategoryId('softdrink') },
      { name: 'Fanta', price: 25000, image: '/softdrink3.png', description: 'Fruit flavored soda.', categoryId: getCategoryId('softdrink') },
      { name: 'Soda Water', price: 22000, image: '/softdrink4.png', description: 'Sparkling soda water.', categoryId: getCategoryId('softdrink') },

      // MINERAL WATER
      { name: 'Aqua 600ml', price: 12000, image: '/water1.png', description: 'Mineral water 600ml.', categoryId: getCategoryId('water') },
      { name: 'Equil Sparkling', price: 35000, image: '/water2.png', description: 'Premium sparkling water.', categoryId: getCategoryId('water') },
      { name: 'San Pellegrino', price: 45000, image: '/water3.png', description: 'Italian sparkling water.', categoryId: getCategoryId('water') },
      { name: 'Aqua 1500ml', price: 18000, image: '/water4.png', description: 'Large bottled water.', categoryId: getCategoryId('water') },
      //set a
      { name: 'Lunch A Salmon Teriyaki', price: 120000, image: '/luncha1.png', description: 'Grilled salmon with teriyaki sauce.', categoryId: getCategoryId('luncha') },
      { name: 'Lunch A Beef Blackpepper', price: 110000, image: '/luncha2.png', description: 'Stir fried beef with blackpepper sauce.', categoryId: getCategoryId('luncha') },
      { name: 'Lunch A Chicken Katsu', price: 95000, image: '/luncha3.png', description: 'Crispy chicken cutlet.', categoryId: getCategoryId('luncha') },
      { name: 'Lunch A Seafood Hotplate', price: 130000, image: '/luncha4.png', description: 'Mixed seafood on sizzling plate.', categoryId: getCategoryId('luncha') },
      //set b
      { name: 'Lunch B Grilled Prawn', price: 115000, image: '/lunchb1.png', description: 'Grilled prawn with butter sauce.', categoryId: getCategoryId('lunchb') },
      { name: 'Lunch B Fried Fish Fillet', price: 95000, image: '/lunchb2.png', description: 'Crispy fried fish fillet.', categoryId: getCategoryId('lunchb') },
      { name: 'Lunch B Chicken Teriyaki', price: 95000, image: '/lunchb3.png', description: 'Chicken grilled in teriyaki sauce.', categoryId: getCategoryId('lunchb') },
      { name: 'Lunch B Vegetable Delight', price: 85000, image: '/lunchb4.png', description: 'Assorted stir fried vegetables.', categoryId: getCategoryId('lunchb') },
      //seafood set dinner
      { name: 'Seafood Dinner Crab', price: 210000, image: '/seafooddinner1.png', description: 'Whole crab in chef’s sauce.', categoryId: getCategoryId('seafooddinner') },
      { name: 'Seafood Dinner Prawn', price: 190000, image: '/seafooddinner2.png', description: 'Grilled prawn with sambal.', categoryId: getCategoryId('seafooddinner') },
      { name: 'Seafood Dinner Mussel', price: 170000, image: '/seafooddinner3.png', description: 'Stir-fried mussels with chili.', categoryId: getCategoryId('seafooddinner') },
      { name: 'Seafood Dinner Ikan Bakar', price: 180000, image: '/seafooddinner4.png', description: 'Grilled fish with sambal.', categoryId: getCategoryId('seafooddinner') },
      //lobster bbq set dinner
      { name: 'Lobster BBQ Original', price: 350000, image: '/lobsterbbq1.png', description: 'Grilled lobster with garlic butter.', categoryId: getCategoryId('lobsterbbq') },
      { name: 'Lobster BBQ Sweet Spicy', price: 360000, image: '/lobsterbbq2.png', description: 'Grilled lobster with sweet chili sauce.', categoryId: getCategoryId('lobsterbbq') },
      { name: 'Lobster BBQ Honey Soy', price: 355000, image: '/lobsterbbq3.png', description: 'Grilled lobster with honey soy glaze.', categoryId: getCategoryId('lobsterbbq') },
      { name: 'Lobster BBQ Sambal Matah', price: 360000, image: '/lobsterbbq4.png', description: 'Balinese style sambal matah topping.', categoryId: getCategoryId('lobsterbbq') },
      //hotpot dinner
      { name: 'Hot Pot Seafood Combo', price: 250000, image: '/hotpot1.png', description: 'Seafood hot pot with assorted vegetables.', categoryId: getCategoryId('hotpot') },
      { name: 'Hot Pot Beef Slice', price: 220000, image: '/hotpot2.png', description: 'Thinly sliced beef for hot pot.', categoryId: getCategoryId('hotpot') },
      { name: 'Hot Pot Chicken', price: 180000, image: '/hotpot3.png', description: 'Tender chicken pieces for hot pot.', categoryId: getCategoryId('hotpot') },
      { name: 'Hot Pot Vegetable Set', price: 150000, image: '/hotpot4.png', description: 'Assorted vegetables for hot pot.', categoryId: getCategoryId('hotpot') },
      //table bbq dinner
      { name: 'BBQ Beef Rib', price: 260000, image: '/tablebbq1.png', description: 'Grilled marinated beef rib.', categoryId: getCategoryId('tablebbq') },
      { name: 'BBQ Chicken Wing', price: 180000, image: '/tablebbq2.png', description: 'BBQ glazed chicken wings.', categoryId: getCategoryId('tablebbq') },
      { name: 'BBQ Prawn Skewer', price: 200000, image: '/tablebbq3.png', description: 'Skewered grilled prawns.', categoryId: getCategoryId('tablebbq') },
      { name: 'BBQ Vegetable Skewer', price: 150000, image: '/tablebbq4.png', description: 'Assorted grilled vegetables.', categoryId: getCategoryId('tablebbq') },
          ],
          skipDuplicates: true,
        })

        console.log('✅ Semua data + deskripsi berhasil di-seed ke database!')
      }

      main()
        .catch((e) => {
          console.error(e)
          process.exit(1)
        })
        .finally(async () => {
          await prisma.$disconnect()
  })
