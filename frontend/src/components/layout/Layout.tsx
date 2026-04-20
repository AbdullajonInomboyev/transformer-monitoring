import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/context/authStore';
import {
  LayoutDashboard, Map, Globe, Building2, Zap, AlertTriangle,
  Wrench, Users, FileText, LogOut, Menu, X, ChevronDown, Bell, ClipboardList,
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', label: 'Boshqaruv paneli', icon: LayoutDashboard },
  { path: '/map', label: 'Xarita ko\'rinishi', icon: Map },
  { path: '/regions', label: 'Hududlar', icon: Globe },
  { path: '/work-permits', label: 'Naryad-ijozat', icon: ClipboardList },
  { path: '/substations', label: 'Podstansiyalar', icon: Building2 },
  { path: '/transformers', label: 'Transformatorlar', icon: Zap },
  { path: '/alerts', label: 'Ogohlantirishlar', icon: AlertTriangle },
  { path: '/maintenance', label: 'Texnik xizmat', icon: Wrench },
];

const adminItems = [
  { path: '/users', label: 'Foydalanuvchilar', icon: Users },
  { path: '/audit', label: 'Audit log', icon: FileText },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleLabel: Record<string, string> = {
    ADMIN: 'Administrator',
    EMPLOYEE: 'Hodim',
    INSPECTOR: 'Tekshiruvchi',
  };

  const roleColor: Record<string, string> = {
    ADMIN: 'bg-purple-100 text-purple-700',
    EMPLOYEE: 'bg-blue-100 text-blue-700',
    INSPECTOR: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-sidebar-bg text-white transition-all duration-300 flex flex-col`}>
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-white/10">
          <Zap className="w-8 h-8 text-blue-400 flex-shrink-0" />
          {sidebarOpen && (
            <span className="ml-3 font-semibold text-sm whitespace-nowrap">Transformator Info</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-2.5 mx-2 rounded-lg mb-0.5 transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="ml-3 text-sm">{item.label}</span>}
              </Link>
            );
          })}

          {/* Admin menyu */}
          {user?.role === 'ADMIN' && (
            <>
              <div className="mx-4 my-3 border-t border-white/10" />
              {adminItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center px-4 py-2.5 mx-2 rounded-lg mb-0.5 transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'
                    }`}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && <span className="ml-3 text-sm">{item.label}</span>}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-4 text-sidebar-text hover:text-white border-t border-white/10"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-gray-800">Transformator Info</h1>
            <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              Oflayn
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
              <Bell className="w-5 h-5" />
            </button>

            {/* Profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100"
              >
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  {user?.fullName?.charAt(0) || 'U'}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-sm font-medium text-gray-700">{user?.fullName}</div>
                  <div className={`text-xs px-1.5 py-0.5 rounded inline-block ${roleColor[user?.role || 'EMPLOYEE']}`}>
                    {roleLabel[user?.role || 'EMPLOYEE']}
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border py-1 z-50">
                  <div className="px-4 py-2 border-b">
                    <div className="text-sm font-medium">{user?.fullName}</div>
                    <div className="text-xs text-gray-500">{user?.email}</div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4" />
                    Chiqish
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}