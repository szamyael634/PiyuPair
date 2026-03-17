import { Outlet } from 'react-router';
import { Toaster } from './ui/sonner';

export default function Root() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Outlet />
      <Toaster />
    </div>
  );
}