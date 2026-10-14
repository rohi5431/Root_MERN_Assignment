import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Toaster } from 'react-hot-toast';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-secondary-background lg:flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="min-w-0 flex-1">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="workspace-main mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-7 lg:py-8">
          <Outlet />
        </main>
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'border border-border shadow-sm',
          duration: 3500,
        }}
      />
    </div>
  );
}
