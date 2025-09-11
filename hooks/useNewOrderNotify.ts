// hooks/useNewOrderNotify.ts
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export type IncomingOrder = {
  id: number;
  customerName?: string | null;
  roomNumber?: string | null;
  isarchived?: boolean;
  createdAt?: string;
};

type Options = {
  channelName?: string;       // unik per halaman: 'order-realtime', 'history-realtime', dll
  filter?: string;            // default: 'isarchived=eq.false'
  rateLimitMs?: number;       // cooldown antar popup
  soundSrc?: string;          // default '/bell.mp3'
};

export function useNewOrderNotify(opts: Options = {}) {
  const {
    channelName = 'order-realtime',
    filter = 'isarchived=eq.false',
    rateLimitMs = 2000,
    soundSrc = '/bell.mp3',
  } = opts;

  const [queue, setQueue] = useState<IncomingOrder[]>([]);
  const [show, setShow] = useState(false);
  const [current, setCurrent] = useState<IncomingOrder | null>(null);
  const [muted, setMuted] = useState<boolean>(() => {
    try { return localStorage.getItem('order_sound_muted') === '1'; } catch { return false; }
  });
  const [needEnable, setNeedEnable] = useState(false); // untuk kasus autoplay block

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cooldownRef = useRef<number>(0);

  // init audio (sekali)
  useEffect(() => {
    const a = new Audio(soundSrc);
    a.loop = true;
    a.preload = 'auto';
    audioRef.current = a;
    return () => { try { a.pause(); } catch {}; audioRef.current = null; };
  }, [soundSrc]);

  // subscribe realtime
  useEffect(() => {
    const ch = supabase
      .channel(channelName)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'Order', filter },
        (payload) => {
          const order = payload.new as IncomingOrder;
          setQueue((q) => [...q, order]);
        }
      )
      .subscribe();

    return () => { void supabase.removeChannel(ch); };
  }, [channelName, filter]);

  // konsumen queue
  useEffect(() => {
    if (show) return;               // lagi tampil, tunggu ditutup
    if (!queue.length) return;      // tidak ada item
    if (Date.now() < cooldownRef.current) return; // masih cooldown

    const next = queue[0];
    setCurrent(next);
    setShow(true);
    setQueue((q) => q.slice(1));

    // bunyikan bila tidak mute
    if (!muted && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // autoplay diblokir
        setNeedEnable(true);
      });
    }
  }, [queue, show, muted]);

  const actions = useMemo(() => ({
    close: () => {
      // stop bunyi
      if (audioRef.current) { try { audioRef.current.pause(); audioRef.current.currentTime = 0; } catch {} }
      setShow(false);
      cooldownRef.current = Date.now() + rateLimitMs;
    },
    replay: () => {
      if (audioRef.current && !muted) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => setNeedEnable(true));
      }
    },
    enableSound: () => {
      setNeedEnable(false);
      setMuted(false);
      try { localStorage.setItem('order_sound_muted', '0'); } catch {}
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {/* jika tetap gagal, biarkan silent */});
      }
    },
    toggleMute: () => {
      setMuted((m) => {
        const next = !m;
        try { localStorage.setItem('order_sound_muted', next ? '1' : '0'); } catch {}
        if (next && audioRef.current) { try { audioRef.current.pause(); } catch {} }
        return next;
      });
    },
  }), [rateLimitMs, muted]);

  return { show, current, muted, needEnable, queueLen: queue.length, ...actions };
}