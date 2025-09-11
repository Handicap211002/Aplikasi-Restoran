'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

function addBust(url: string) {
  if (!url) return url;
  if (url.includes('?')) return url;
  const m = /\/(\d+)_/.exec(url);
  const v = m ? m[1] : String(Date.now());
  return `${url}?v=${v}`;
}

export default function SplashScreen() {
  const router = useRouter();
  const [bgSrc, setBgSrc] = useState<string>('/sbg.jpg'); // default

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key,value')
        .in('key', ['promoImageUrl', 'promoExpireAt']);

      if (error || !data) return;

      const map = new Map<string, string>((data as any[]).map(r => [r.key, r.value]));
      const url = map.get('promoImageUrl') || '';
      const exp = map.get('promoExpireAt') || '';

      const expTs = Date.parse(exp); // NaN kalau kosong/tidak valid
      const now = Date.now();

      // ✅ HANYA pakai promo kalau ada URL & expireAt valid & masih di masa depan
      const isActive = Boolean(url) && !Number.isNaN(expTs) && now < expTs;

      if (isActive) {
        setBgSrc(addBust(url));
      } else {
        setBgSrc('/sbg.jpg'); // fallback tegas
      }
    })();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => router.push('/menu'), 10000);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <Image
        src={bgSrc}
        alt="Splash Background"
        fill
        className="object-cover"
        quality={90}
        sizes="100vw"
        priority
        fetchPriority="high"
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] max-w-[530px] aspect-[530/410]">
        <Image
          src="/logo.png"
          alt="Logo"
          fill
          className="object-contain"
          priority
          fetchPriority="high"
          quality={100}
          sizes="(max-width: 640px) 70vw, 530px"
        />
      </div>
    </div>
  );
}