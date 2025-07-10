'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/menu');
    }, 1500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="relative w-screen h-screen">
      {/* Background */}
      <Image
        src="/sbg.jpg" // <- ganti sesuai nama file background splash kamu
        alt="Splash Background"
        fill
        className="object-cover"
        priority
      />

      {/* Logo kiri bawah */}
      <div className="absolute bottom-4 left-6">
        <Image src="/logo.png" alt="Logo" width={530} height={410} priority />
      </div>
    </div>
  );
}
