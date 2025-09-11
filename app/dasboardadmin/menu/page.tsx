'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  Pencil,
  Trash2,
  LogOut,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

// ⬇️ NEW: popup notifikasi reusable
import NewOrderPopup from '../../../components/NewOrderPopup';
import { useNewOrderNotify } from '../../../hooks/useNewOrderNotify';

type MenuItem = {
  id: number;
  name: string;
  price: number;
  image: string;
  description: string;
  stock: number;
  categoryId: number;
  category: { name: string; slug: string };
};

type Category = { id: number; name: string; slug: string };

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

type ActiveTab = 'FOOD' | 'BEVERAGES' | 'PROMO';

function normalizeUrl(u?: string | null) {
  if (!u) return '';
  try {
    const url = new URL(u);
    url.search = '';
    return url.toString();
  } catch {
    return (u || '').split('?')[0] || '';
  }
}

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState<ActiveTab>('FOOD');
  const [menuData, setMenuData] = useState<Record<string, MenuItem[]>>({});
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [form, setForm] = useState({
    name: '',
    price: '',
    image: '',
    description: '',
    stock: '',
    file: null as File | null,
  });
  const [orderToDelete, setOrderToDelete] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [formCategorySlug, setFormCategorySlug] = useState<string>('');

  // === PROMO state ===
  const [promoFiles, setPromoFiles] = useState<
    { name: string; path: string; publicUrl: string }[]
  >([]);
  const [promoUploading, setPromoUploading] = useState(false);
  const [promoFile, setPromoFile] = useState<File | null>(null);
  const [activePromoUrl, setActivePromoUrl] = useState<string | null>(null);
  const [promoBusyKey, setPromoBusyKey] = useState<string | null>(null);
  const [promoRefreshing, setPromoRefreshing] = useState(false);

  // === NEW: duration modal state ===
  const [useModal, setUseModal] = useState<{ url: string } | null>(null);
  const [durationType, setDurationType] = useState<
    '1h' | '6h' | '12h' | '1d' | '3d' | '7d' | 'custom'
  >('1d');
  const [customMinutes, setCustomMinutes] = useState<string>('');

  // ⬇️ NEW: Hook popup notifikasi — channel dibedakan untuk halaman Menu
  const {
    show,
    current,
    muted,
    needEnable,
    close,
    replay,
    enableSound,
    toggleMute,
  } = useNewOrderNotify({
    channelName: 'menu-realtime-popup',
    filter: 'isarchived=eq.false',
    rateLimitMs: 2000,
    soundSrc: '/bell.mp3',
  });

  const categoryMap =
    activeCategory === 'FOOD'
      ? foodCategories
      : activeCategory === 'BEVERAGES'
      ? beverageCategories
      : {};

  // ===================== MENU (FOOD/BEVERAGES) =====================
  const fetchMenu = async () => {
    const { data: categories, error: categoryError } = await supabase
      .from('Category')
      .select('id, name, slug');
    if (categoryError || !categories) return;
    setAllCategories(categories);

    const { data: menuItems, error: menuError } = await supabase
      .from('MenuItem')
      .select('*')
      .order('id');
    if (menuError || !menuItems) return;

    const combinedData = menuItems.map((item) => ({
      ...item,
      category:
        categories.find((cat) => cat.id === item.categoryId) || {
          name: '',
          slug: '',
        },
    }));

    const result: Record<string, MenuItem[]> = {};
    for (const label of Object.keys(categoryMap)) {
      result[label] = combinedData.filter(
        (item) => item.category.slug === (categoryMap as any)[label]
      );
    }
    setMenuData(result);
  };

  // ===================== PROMO (list + active) =====================
  const listPromo = async () => {
    const toPublic = (path: string, filename: string) => {
      const { data: pub } = supabase.storage.from('menu-images').getPublicUrl(path);
      const m = /^(\d+)_/.exec(filename);
      const v = m ? m[1] : '';
      return v ? `${pub.publicUrl}?v=${v}` : pub.publicUrl;
    };

    const fetchFolder = async (folderPath: string) => {
      const { data, error } = await supabase.storage
        .from('menu-images')
        .list(folderPath, {
          limit: 200,
          sortBy: { column: 'name', order: 'desc' },
        });

      if (error) {
        console.error('[PROMO] list error at', folderPath || '(root)', error);
        return {
          files: [] as { name: string; path: string; publicUrl: string }[],
          folders: [] as string[],
        };
      }

      const files = (data ?? [])
        .filter((it: any) => it?.metadata?.size)
        .map((it: any) => {
          const fullPath = folderPath ? `${folderPath}/${it.name}` : it.name;
          return {
            name: it.name,
            path: fullPath,
            publicUrl: toPublic(fullPath, it.name),
          };
        });

      const folders = (data ?? [])
        .filter((it: any) => !it?.metadata?.size)
        .map((it: any) => (folderPath ? `${folderPath}/${it.name}` : it.name));

      return { files, folders };
    };

    let collected: { name: string; path: string; publicUrl: string }[] = [];
    const direct = await fetchFolder('promo');
    collected = collected.concat(direct.files);

    if (collected.length === 0) {
      const root = await fetchFolder('');
      const promoFolder = root.folders.find((f) => f.split('/').pop() === 'promo');
      if (promoFolder) {
        const level1 = await fetchFolder(promoFolder);
        collected = collected.concat(level1.files);
        for (const sub1 of level1.folders) {
          const level2 = await fetchFolder(sub1);
          collected = collected.concat(level2.files);
        }
      } else {
        console.warn('[PROMO] Folder "promo" tidak ditemukan di root bucket. Cek ejaan/letak folder.');
      }
    }

    collected.sort((a, b) => {
      const ma = /^(\d+)_/.exec(a.name);
      const mb = /^(\d+)_/.exec(b.name);
      const sa = ma ? Number(ma[1]) : 0;
      const sb = mb ? Number(mb[1]) : 0;
      return sb - sa;
    });

    setPromoFiles(collected);
  };

  // Baca 3 key: promoImageUrl, promoExpireAt, promoPrevUrl
  const readActivePromo = async () => {
    const { data, error } = await supabase
      .from('app_settings')
      .select('key,value')
      .in('key', ['promoImageUrl', 'promoExpireAt', 'promoPrevUrl']);

    if (error) {
      console.warn('Read AppSettings error:', error);
      setActivePromoUrl(null);
      return;
    }

    const map = new Map<string, string>(((data ?? []) as any[]).map((r) => [r.key, r.value]));
    const imageUrl = map.get('promoImageUrl') ?? null;
    const expireAt = map.get('promoExpireAt') ?? null;

    if (expireAt) {
      const now = Date.now();
      const end = Date.parse(expireAt);
      if (!isNaN(end) && now >= end) {
        setActivePromoUrl(null);
        return;
      }
    }
    setActivePromoUrl(imageUrl);
  };

  const refreshPromoAll = async () => {
    setPromoRefreshing(true);
    try {
      await Promise.all([listPromo(), readActivePromo()]);
    } finally {
      setPromoRefreshing(false);
    }
  };

  useEffect(() => {
    if (activeCategory === 'PROMO') {
      refreshPromoAll();
    } else {
      fetchMenu();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory]);

  // ===================== SESSION =====================
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

  // ===================== MENU handlers =====================
  const handleAddMenu = () => {
    setEditingItem(null);
    setForm({
      name: '',
      price: '',
      image: '',
      description: '',
      stock: '',
      file: null,
    });
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
      categoryId:
        editingItem?.categoryId ||
        (() => {
          const matched = allCategories.find((cat) => cat.slug === formCategorySlug);
          return matched?.id || 1;
        })(),
    };

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

  // ===================== PROMO handlers =====================
  const handleUploadPromo = async () => {
    if (!promoFile) return alert('Pilih gambar promo terlebih dahulu.');
    setPromoUploading(true);
    try {
      const fileName = `${Date.now()}_${promoFile.name}`;
      const { error } = await supabase
        .storage
        .from('menu-images')
        .upload(`promo/${fileName}`, promoFile, { upsert: false });
      if (error) throw error;
      setPromoFile(null);
      await refreshPromoAll();
      alert('Promo berhasil diupload. Klik "Use" pada gambar untuk mengaktifkan.');
    } catch (e) {
      console.error(e);
      alert('Gagal upload promo.');
    } finally {
      setPromoUploading(false);
    }
  };

  const handleDeletePromo = async (path: string) => {
    if (!confirm('Hapus gambar promo ini?')) return;
    setPromoBusyKey(`del:${path}`);
    try {
      const { error } = await supabase.storage.from('menu-images').remove([path]);
      if (error) throw error;

      const justDeletedUrl = normalizeUrl(
        supabase.storage.from('menu-images').getPublicUrl(path).data.publicUrl
      );
      if (normalizeUrl(activePromoUrl) === justDeletedUrl) {
        setActivePromoUrl(null);
      }

      await refreshPromoAll();
    } catch (e) {
      console.error(e);
      alert('Gagal menghapus promo.');
    } finally {
      setPromoBusyKey(null);
    }
  };

  function minutesFromType(
    t: '1h' | '6h' | '12h' | '1d' | '3d' | '7d' | 'custom',
    custom: string
  ) {
    switch (t) {
      case '1h': return 60;
      case '6h': return 360;
      case '12h': return 720;
      case '1d': return 1440;
      case '3d': return 4320;
      case '7d': return 10080;
      case 'custom': {
        const m = parseInt(custom);
        return isNaN(m) || m <= 0 ? 0 : m;
      }
    }
  }

  const handleOpenUsePromo = (publicUrl: string) => {
    setDurationType('1d');
    setCustomMinutes('');
    setUseModal({ url: publicUrl });
  };

  const confirmUsePromo = async () => {
    if (!useModal) return;
    const minutes = minutesFromType(durationType, customMinutes);
    if (minutes <= 0) {
      alert('Durasi tidak valid.');
      return;
    }

    const m = /\/(\d+)_/.exec(useModal.url);
    const v = m ? m[1] : String(Date.now());
    const withBust = useModal.url.includes('?')
      ? useModal.url
      : `${useModal.url}?v=${v}`;

    const expireAt = new Date(Date.now() + minutes * 60_000).toISOString();

    setPromoBusyKey(`use:${useModal.url}`);
    try {
      const { data: cur } = await supabase
        .from('app_settings')
        .select('key,value')
        .eq('key', 'promoImageUrl')
        .maybeSingle();
      const currentUrl = cur?.value ?? '';

      const rows = [
        { key: 'promoImageUrl', value: withBust },
        { key: 'promoExpireAt', value: expireAt },
        { key: 'promoPrevUrl', value: currentUrl },
      ];
      const { error } = await supabase.from('app_settings').upsert(rows);
      if (error) throw error;

      setActivePromoUrl(withBust);
      alert(`Promo aktif ✅\nBerakhir: ${new Date(expireAt).toLocaleString()}`);
      setUseModal(null);
    } catch (e) {
      console.error(e);
      alert('Gagal mengaktifkan promo.');
    } finally {
      setPromoBusyKey(null);
    }
  };

  const handleUnusePromo = async () => {
    setPromoBusyKey('unuse');
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key,value')
        .in('key', ['promoPrevUrl']);
      if (error) throw error;
      const prev = (data ?? []).find((r) => r.key === 'promoPrevUrl')?.value || '';

      const rows = prev
        ? [
            { key: 'promoImageUrl', value: prev },
            { key: 'promoExpireAt', value: '' },
            { key: 'promoPrevUrl', value: '' },
          ]
        : [
            { key: 'promoImageUrl', value: '' },
            { key: 'promoExpireAt', value: '' },
            { key: 'promoPrevUrl', value: '' },
          ];

      const { error: upErr } = await supabase.from('app_settings').upsert(rows);
      if (upErr) throw upErr;

      setActivePromoUrl(prev || null);
      alert('Promo dinonaktifkan.');
    } catch (e) {
      console.error(e);
      alert('Gagal unuse promo.');
    } finally {
      setPromoBusyKey(null);
    }
  };

  const isPromoEmpty = useMemo(() => !promoFiles || promoFiles.length === 0, [promoFiles]);

  // ===================== UI =====================
  return (
    <div
      className="relative pt-24 min-h-screen bg-cover bg-center p-4"
      style={{ backgroundImage: "url('/bg.png')" }}
    >
      <div className="absolute inset-0 bg-white -z-10"></div>

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-white px-4 py-2 shadow-md">
        <Image src="/logo.png" alt="logo" width={90} height={50} className="hidden md:block" />
        <div className="flex gap-4 text-blue-900 font-bold text-sm sm:text-base md:text-xl">
          <a href="/dasboardadmin/order" className="hover:border-b-4 hover:border-blue-900 pb-1">ORDER</a>
          <a href="/dasboardadmin/history" className="hover:border-b-4 hover:border-blue-900 pb-1">HISTORY</a>
          <a className="border-b-4 border-blue-900 pb-1">MENU</a>
        </div>
        <button onClick={handleLogout} className="flex items-center bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded">
          <LogOut size={16} className="mr-1" /> LOGOUT
        </button>
      </nav>

      {/* Toggle Tabs */}
      <div className="flex gap-3 mb-4">
        <button
          className={`px-4 py-2 rounded border ${activeCategory === 'FOOD' ? 'bg-blue-900 text-white' : 'text-blue-900 border-blue-900'}`}
          onClick={() => setActiveCategory('FOOD')}
        >
          🍽 FOOD
        </button>
        <button
          className={`px-4 py-2 rounded border ${activeCategory === 'BEVERAGES' ? 'bg-blue-900 text-white' : 'text-blue-900 border-blue-900'}`}
          onClick={() => setActiveCategory('BEVERAGES')}
        >
          🥤 BEVERAGES
        </button>
        <button
          className={`px-4 py-2 rounded border ${activeCategory === 'PROMO' ? 'bg-blue-900 text-white' : 'text-blue-900 border-blue-900'}`}
          onClick={() => setActiveCategory('PROMO')}
          title="Kelola gambar promo (flash screen)"
        >
          🏷 PROMO
        </button>
      </div>

      {/* FOOD & BEVERAGES TABLES */}
      {(activeCategory === 'FOOD' || activeCategory === 'BEVERAGES') && (
        <>
          {Object.entries(menuData).map(([label, items]) => (
            <div key={label} className="bg-white rounded-xl p-4 shadow-md mt-6">
              <h2 className="text-center font-bold text-xl text-blue-900 mb-4">{label}</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-center">
                  <thead className="bg-blue-100 text-blue-900 text-sm">
                    <tr>
                      <th>ID</th>
                      <th>Gambar</th>
                      <th>Nama</th>
                      <th>Harga</th>
                      <th>Stok</th>
                      <th>Deskripsi</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-200 text-blue-900">
                    {items.map((item) => {
                      const out = item.stock === 0;
                      return (
                        <tr key={item.id} className={`border-t ${out ? 'bg-red-50 text-red-700' : ''}`}>
                          <td className="py-4 font-semibold">{item.id}</td>
                          <td className="px-2 py-1">
                            {item.image ? (
                              <Image
                                src={item.image}
                                alt={item.name}
                                width={70}
                                height={50}
                                className={`rounded object-cover mx-auto ${out ? 'ring-2 ring-red-300' : ''}`}
                              />
                            ) : (
                              <div className={`w-[70px] h-[50px] flex items-center justify-center text-xs rounded mx-auto ${out ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-500'}`}>
                                No Image
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4 font-medium">{item.name}</td>
                          <td className="px-4 py-4">Rp. {item.price.toLocaleString()}</td>
                          <td className={`px-4 py-4 ${out ? 'font-bold' : ''}`}>{item.stock}</td>
                          <td className="px-4 py-4">{item.description}</td>
                          <td className="px-4 py-4">
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => handleEditMenu(item)}
                                className={`px-2 py-1 rounded ${out ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
                              >
                                <Pencil size={14} className="mr-1 inline" />
                                EDIT
                              </button>
                              <button
                                onClick={() => {
                                  setOrderToDelete(item.id);
                                  setShowConfirm(true);
                                }}
                                className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                              >
                                <Trash2 size={14} className="mr-1 inline" />
                                DELETE
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end mt-4">
                <button
                  onClick={() => {
                    const map =
                      activeCategory === 'FOOD'
                        ? foodCategories
                        : beverageCategories;
                    // @ts-ignore
                    setFormCategorySlug(map[label]);
                    handleAddMenu();
                  }}
                  className="border border-blue-900 text-blue-900 px-4 py-2 rounded hover:bg-blue-900 hover:text-white"
                >
                  ➕ TAMBAH MENU
                </button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* PROMO MANAGER */}
      {activeCategory === 'PROMO' && (
        <div className="bg-white rounded-xl p-4 shadow-md mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-center font-bold text-xl text-blue-900">
              Kelola Gambar Promo (Flash Screen) rasio 16:9 (1920×1080 atau lebih besar)
            </h2>
            <button
              onClick={refreshPromoAll}
              disabled={promoRefreshing}
              className="flex items-center gap-2 text-blue-900 border border-blue-900 px-3 py-1 rounded hover:bg-blue-900 hover:text-white"
              title="Refresh daftar"
            >
              <RefreshCw size={16} className={promoRefreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {/* Upload box */}
          <div className="flex flex-col sm:flex-row items-center gap-3 border rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <ImageIcon className="text-blue-900" />
              <span className="font-medium text-blue-900">Upload Gambar Baru</span>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPromoFile(e.target.files?.[0] ?? null)}
              className="w-full sm:w-auto border p-2 rounded text-black"
            />
            <button
              disabled={promoUploading || !promoFile}
              onClick={handleUploadPromo}
              className={`flex items-center gap-1 px-4 py-2 rounded text-white ${promoUploading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              <Upload size={16} />
              {promoUploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>

          {/* List promo files */}
          {isPromoEmpty ? (
            <p className="text-center text-gray-600">
              Belum ada gambar promo. Silakan upload.
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {promoFiles.map((f) => {
                const isActive =
                  normalizeUrl(activePromoUrl) === normalizeUrl(f.publicUrl);
                return (
                  <div key={f.path} className="border rounded-lg p-3">
                    {/* Preview 16:9 agar konsisten */}
                    <div className="relative w-full aspect-video">
                      <Image
                        src={f.publicUrl}
                        alt={f.name}
                        fill
                        className="object-cover rounded-md"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    </div>
                    <div className="mt-2 text-xs break-all text-blue-900">{f.name}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <a
                        href={f.publicUrl}
                        target="_blank"
                        className="text-xs text-blue-600 underline"
                        rel="noreferrer"
                      >
                        Buka URL
                      </a>
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={14} />
                          Aktif
                        </span>
                      ) : (
                        <span />
                      )}
                    </div>
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        onClick={() => handleOpenUsePromo(f.publicUrl)}
                        disabled={promoBusyKey === `use:${f.publicUrl}`}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded"
                        title="Gunakan sebagai promo aktif (pilih durasi)"
                      >
                        Use
                      </button>

                      {isActive && (
                        <button
                          onClick={handleUnusePromo}
                          disabled={promoBusyKey === 'unuse'}
                          className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded"
                          title="Nonaktifkan dan kembali ke gambar sebelumnya"
                        >
                          Unuse
                        </button>
                      )}

                      <button
                        onClick={() => handleDeletePromo(f.path)}
                        disabled={promoBusyKey === `del:${f.path}`}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL EDIT/ADD MENU */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md space-y-4">
            <h2 className="text-center text-xl font-bold text-blue-900">
              {editingItem ? 'EDIT MENU' : 'TAMBAH MENU'}
            </h2>
            <input
              type="text"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border p-2 rounded text-black"
            />
            <input
              type="number"
              placeholder="Price"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-full border p-2 rounded text-black"
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setForm({ ...form, file: e.target.files?.[0] || null })
              }
              className="w-full border p-2 rounded text-black"
            />
            <textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border p-2 rounded text-black"
            />
            <input
              type="number"
              placeholder="Stock"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              className="w-full border p-2 rounded text-black"
            />
            <div className="flex justify-between mt-4">
              <button
                onClick={() => setShowModal(false)}
                className="bg-red-500 text-white px-4 py-2 rounded"
              >
                CANCEL
              </button>
              <button
                onClick={handleSave}
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                SAVE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow text-center space-y-4">
            <p className="text-lg text-black font-medium">
              Yakin ingin menghapus?
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => {
                  setShowConfirm(false);
                  setOrderToDelete(null);
                }}
                className="bg-gray-300 text-black px-4 py-2 rounded "
              >
                Tidak
              </button>
              <button
                onClick={() => {
                  if (orderToDelete !== null) deleteMenu(orderToDelete);
                  setShowConfirm(false);
                  setOrderToDelete(null);
                }}
                className="bg-red-500 text-white px-4 py-2 rounded"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: USE DURATION */}
      {useModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-sm space-y-4">
            <h3 className="text-lg font-semibold text-blue-900">
              Set Promo Duration
            </h3>

            <label className="block text-sm text-gray-700">Durasi</label>
            <select
              value={durationType}
              onChange={(e) => setDurationType(e.target.value as any)}
              className="w-full border rounded p-2 text-black"
            >
              <option value="1h">1 jam</option>
              <option value="6h">6 jam</option>
              <option value="12h">12 jam</option>
              <option value="1d">1 hari</option>
              <option value="3d">3 hari</option>
              <option value="7d">7 hari</option>
              <option value="custom">Custom (menit)</option>
            </select>

            {durationType === 'custom' && (
              <input
                type="number"
                min={1}
                placeholder="Masukkan menit"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                className="w-full border rounded p-2 text-black"
              />
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setUseModal(null)}
                className="px-4 py-2 rounded bg-gray-200 text-black"
              >
                Batal
              </button>
              <button
                onClick={confirmUsePromo}
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white"
              >
                Aktifkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⬇️ NEW: Popup order baru */}
      <NewOrderPopup
        open={show}
        customerName={current?.customerName}
        roomNumber={current?.roomNumber}
        onClose={close}
        onReplay={replay}
        onEnableSound={enableSound}
        showEnableSound={needEnable}
        muted={muted}
        onToggleMute={toggleMute}
      />
    </div>
  );
}
