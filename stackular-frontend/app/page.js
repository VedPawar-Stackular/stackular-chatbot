'use client';

import Navbar from '../components/layout/Navbar';
import HeroSection from '../components/home/HeroSection';
import WorldMapSection from '../components/home/WorldMapSection';
import ClientLogosSection from '../components/home/ClientLogosSection';

export default function Home() {
  return (
    <main style={{ fontFamily: "'Inter', 'Segoe UI', sans-serif", background: '#060b14', color: '#fff', minHeight: '100vh', overflowX: 'hidden' }}>
      <Navbar />
      <HeroSection />
      <WorldMapSection />
      <ClientLogosSection />
    </main>
  );
}