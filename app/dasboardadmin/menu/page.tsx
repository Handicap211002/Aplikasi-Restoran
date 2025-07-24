'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Pencil, Trash2, LogOut } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

type MenuItem = {
  id: number;
  name: string;
  price: number;
  image: string;
  description: string;
  stock: number;
  categoryId: number;
  category: {
    name: string;
    slug: string;
  };
};

type Category = {
  id: number;
  name: string;
  slug: string;
};


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

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState<'FOOD' | 'BEVERAGES'>('FOOD');
  const [menuData, setMenuData] = useState<Record<string, MenuItem[]>>({});
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [form, setForm] = useState({
    name: '', price: '', image: '', description: '', stock: '', file: null as File | null,
  });
  const [orderToDelete, setOrderToDelete] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [formCategorySlug, setFormCategorySlug] = useState<string>('');

  const categoryMap = activeCategory === 'FOOD' ? foodCategories : beverageCategories;

  const fetchMenu = async () => {
    const { data: categories, error: categoryError } = await supabase.from('Category').select('id, name, slug');
    if (categoryError || !categories) return;
    setAllCategories(categories);

    const { data: menuItems, error: menuError } = await supabase.from('MenuItem').select('*').order('id');
    if (menuError || !menuItems) return;

    const combinedData = menuItems.map(item => ({
      ...item,
      category: categories.find(cat => cat.id === item.categoryId) || { name: '', slug: '' }
    }));

    const result: Record<string, MenuItem[]> = {};
    for (const label of Object.keys(categoryMap)) {
      result[label] = combinedData.filter(item => item.category.slug === categoryMap[label]);
    }
    setMenuData(result);
  };

  useEffect(() => { fetchMenu(); }, [activeCategory]);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push('/kasirlogin');
      } else {
        setLoading(false);
      }
    };
    checkSession();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/kasirlogin');
  };

  const handleAddMenu = () => {
    setEditingItem(null);
    setForm({ name: '', price: '', image: '', description: '', stock: '', file: null });
    setShowModal(true);
  };

  const handleEditMenu = (item: MenuItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      price: item.price.toString(),
      image: item.image,
      description: item.description,
      stock: item.stock.toString(),
      file: null,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    let imageUrl = form.image;

    if (form.file) {
      const { data, error } = await supabase
        .storage
        .from('menu-images')
        .upload(`menu/${Date.now()}_${form.file.name}`, form.file);

      if (error) return console.error('Upload error:', error);

      const { data: publicUrl } = supabase
        .storage
        .from('menu-images')
        .getPublicUrl(data.path);
      imageUrl = publicUrl.publicUrl;
    }

    const payload = {
      name: form.name.trim(),
      price: parseInt(form.price),
      image: imageUrl || '',
      description: form.description.trim(),
      stock: parseInt(form.stock),
      categoryId: editingItem?.categoryId || (() => {
        const matched = allCategories.find(cat => cat.slug === formCategorySlug);
        return matched?.id || 1;
      })(),
    };

    console.log("DEBUG PAYLOAD:", payload);
    console.log("Payload insert:", payload);

    if (
      form.name.trim() === '' ||
      isNaN(parseInt(form.price)) ||
      form.description.trim() === '' ||
      isNaN(parseInt(form.stock))
    ) {
      alert('Semua field wajib diisi dengan benar.');
      return;
    }

    if (editingItem) {
      await supabase.from('MenuItem').update(payload).eq('id', editingItem.id);
    } else {
      await supabase.from('MenuItem').insert(payload);
    }
    setShowModal(false);
    fetchMenu();
  };

  const deleteMenu = async (id: number) => {
    await supabase.from('MenuItem').delete().eq('id', id);
    fetchMenu();
  };

  return (
    <div className="relative pt-24 min-h-screen bg-cover bg-center p-4" style={{ backgroundImage: "url('/bg.png')" }}>
      <div className="absolute inset-0 bg-white -z-10"></div>
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-white px-4 py-2 shadow-md">
        <Image src="/logo.png" alt="logo" width={90} height={50} />
        <div className="flex gap-8 text-blue-900 font-bold text-xl">
          <a href="/dasboardadmin/order">ORDER</a>
          <a href="/dasboardadmin/history">HISTORY</a>
          <a className="border-b-4 border-blue-900 pb-1">MENU</a>
        </div>
        <button onClick={handleLogout} className="flex items-center bg-red-500 text-white px-3 py-1 rounded">
          <LogOut size={16} className="mr-1" /> LOGOUT
        </button>
      </nav>

      <div className="flex gap-3 mb-4">
        <button className={`px-4 py-2 rounded border ${activeCategory === 'FOOD' ? 'bg-blue-900 text-white' : 'text-blue-900 border-blue-900'}`} onClick={() => setActiveCategory('FOOD')}>🍽 FOOD</button>
        <button className={`px-4 py-2 rounded border ${activeCategory === 'BEVERAGES' ? 'bg-blue-900 text-white' : 'text-blue-900 border-blue-900'}`} onClick={() => setActiveCategory('BEVERAGES')}>🥤 BEVERAGES</button>
      </div>

      {Object.entries(menuData).map(([label, items]) => (
        <div key={label} className="bg-white rounded-xl p-4 shadow-md mt-6">
          <h2 className="text-center font-bold text-xl text-blue-900 mb-4">{label}</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-center">
              <thead className="bg-blue-100 text-blue-900 text-sm">
                <tr><th>ID</th><th>Gambar</th><th>Nama</th><th>Harga</th><th>Stok</th><th>Deskripsi</th><th>ACTION</th></tr>
              </thead>
              <tbody className="divide-y divide-blue-200 text-blue-900">
                {items.map(item => (
                  <tr key={item.id} className="border-t">
                    <td className="py-4">{item.id}</td>
                    <td className="px-2 py-1">
                      <Image src={item.image} alt={item.name} width={70} height={50} className="rounded object-cover mx-auto" />
                    </td>
                    <td className="px-4 py-4">{item.name}</td>
                    <td className="px-4 py-4">Rp. {item.price.toLocaleString()}</td>
                    <td className="px-4 py-4">{item.stock}</td>
                    <td className="px-4 py-4">{item.description}</td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2 justify-center">
                        <button onClick={() => handleEditMenu(item)} className="bg-blue-500 text-white px-2 py-1 rounded"><Pencil size={14} className="mr-1 inline" />EDIT</button>
                        <button onClick={() => { setOrderToDelete(item.id); setShowConfirm(true); }} className="bg-red-500 text-white px-2 py-1 rounded"><Trash2 size={14} className="mr-1 inline" />DELETE</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={() => {
                setFormCategorySlug(categoryMap[label]);
                handleAddMenu();
              }}
              className="border border-blue-900 text-blue-900 px-4 py-2 rounded hover:bg-blue-900 hover:text-white">
              ➕ TAMBAH MENU
            </button>
          </div>
        </div>
      ))}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md space-y-4">
            <h2 className="text-center text-xl font-bold text-blue-900">EDIT MENU</h2>
            <input type="text" placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border p-2 rounded" />
            <input type="number" placeholder="Price" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="w-full border p-2 rounded" />
            <input type="file" accept="image/*" onChange={e => setForm({ ...form, file: e.target.files?.[0] || null })} className="w-full border p-2 rounded" />
            <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border p-2 rounded" />
            <input type="number" placeholder="Stock" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} className="w-full border p-2 rounded" />
            <div className="flex justify-between mt-4">
              <button onClick={() => setShowModal(false)} className="bg-red-500 text-white px-4 py-2 rounded">CANCEL</button>
              <button
                onClick={() => {
                  console.log('SAVE CLICKED!');
                  handleSave();
                }}
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                SAVE
              </button>

            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow text-center space-y-4">
            <p className="text-lg font-medium">Yakin ingin menghapus?</p>
            <div className="flex justify-center gap-4">
              <button onClick={() => { setShowConfirm(false); setOrderToDelete(null); }} className="bg-gray-300 px-4 py-2 rounded">Tidak</button>
              <button onClick={() => { if (orderToDelete !== null) deleteMenu(orderToDelete); setShowConfirm(false); setOrderToDelete(null); }} className="bg-red-500 text-white px-4 py-2 rounded">Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
