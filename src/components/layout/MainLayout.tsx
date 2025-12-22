// frontend/src/components/layout/MainLayout.tsx
// UPDATED: Added Video Analysis menu item
import React, { useState, ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  BarChart3, FolderOpen, Users, ClipboardList, FileText, 
  TrendingUp, Settings, LogOut, Menu, Search, Bot, UserCheck,
  Video, Headphones  // Added Video and Headphones icons
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, path: '/' },
    { id: 'projects', label: 'Projects', icon: FolderOpen, path: '/projects' },
    { id: 'beneficiaries', label: 'Beneficiaries', icon: UserCheck, path: '/beneficiaries' },
    { id: 'resources', label: 'Field Resources', icon: Users, path: '/resources' },
    { id: 'questionnaires', label: 'Questionnaires', icon: ClipboardList, path: '/questionnaires' },
    { id: 'interviews', label: 'Interviews', icon: FileText, path: '/interviews' },
    { id: 'ai-interviews', label: 'AI Interviews', icon: Bot, path: '/ai-interviews' },
    { id: 'video-analysis', label: 'Video Analysis', icon: Video, path: '/video-analysis' },
    { id: 'audio-analysis', label: 'Audio Analysis', icon: Headphones, path: '/audio-analysis' },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp, path: '/analytics' },
    { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full w-72 bg-white border-r border-gray-200 z-50
        transform transition-transform duration-300 lg:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900">IAMS</h1>
                <p className="text-xs text-gray-500">Impact Assessment</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {menuItems.map(item => (
              <Link
                key={item.id}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                  ${isActive(item.path)
                    ? 'bg-emerald-50 text-emerald-700 font-medium' 
                    : 'text-gray-600 hover:bg-gray-50'
                  }
                `}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ))}
          </nav>

          {/* User section */}
          <div className="p-4 border-t">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <span className="text-emerald-700 font-semibold">
                  {user?.first_name?.[0] || user?.username?.[0] || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {user?.first_name || user?.username}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.role_display}</p>
              </div>
              <button 
                onClick={logout} 
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar 
        isOpen={sidebarOpen} 
        setIsOpen={setSidebarOpen}
      />
      
      {/* Main Content */}
      <div className="lg:ml-72">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <button 
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-4 ml-auto">
              <div className="relative hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;