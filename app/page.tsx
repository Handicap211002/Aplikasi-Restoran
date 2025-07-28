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
    <div className="relative w-full h-screen overflow-hidden">
      {/* Background with priority loading */}
      <Image
        src="/sbg.jpg"
        alt="Splash Background"
        fill
        className="object-cover"
        priority
        quality={100}
        sizes="100vw"
      />

      {/* Logo - responsive positioning and sizing */}
        <div
          className="
            absolute 
            bottom-1/2 left-1/2 
            translate-x-[-50%] translate-y-[-50%]
            sm:bottom-6 sm:left-6 sm:translate-x-0 sm:translate-y-0
            w-[70%] max-w-[530px] aspect-[530/410]
          "
        >
        <Image 
          src="/logo.png" 
          alt="Logo" 
          fill
          className="object-contain"
          priority
          quality={100}
          sizes="(max-width: 640px) 70vw, 530px"
        />
      </div>
    </div>
  );
}