import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import MobileNavigation from '../components/MobileNavigation';
import Navbar from '../components/Navbar';

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <Navbar />
      <main className="pb-safe max-w-5xl mx-auto px-4 pt-4 pb-24 md:pb-8">
        <Outlet />
      </main>
      <MobileNavigation />
    </div>
  );
}
