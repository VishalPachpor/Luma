'use client';

import LandingHero from '@/components/features/landing/LandingHero';
import Footer from '@/components/components/layout/Footer';

export default function LandingPage() {
  return (
    <main className="bg-[#131517] min-h-screen">
      <LandingHero />
      <Footer />
    </main>
  );
}
