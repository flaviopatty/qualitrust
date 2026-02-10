
import React, { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { label: 'Painel', path: '/dashboard', icon: 'dashboard' },
    { label: 'Avaliações', path: '/evaluations', icon: 'assignment' },
    { label: 'Detalhes do Contrato', path: '/contracts', icon: 'history_edu' },
    { label: 'Administração', path: '/admin', icon: 'settings' },
  ];

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="flex h-screen bg-background-light overflow-hidden flex-col lg:flex-row">
      {/* Mobile Header */}
      <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-white">
            <span className="material-icons text-sm">verified</span>
          </div>
          <span className="text-lg font-bold tracking-tight">QualiTrust</span>
        </div>
        <button 
          onClick={toggleMobileMenu}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <span className="material-icons">{isMobileMenuOpen ? 'close' : 'menu'}</span>
        </button>
      </header>

      {/* Sidebar Overlay (Mobile) */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar (Desktop & Mobile Drawer) */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 hidden lg:flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white">
            <span className="material-icons">verified</span>
          </div>
          <span className="text-xl font-bold tracking-tight">QualiTrust</span>
        </div>

        <div className="p-6 lg:hidden flex items-center justify-between border-b border-slate-100 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-white">
              <span className="material-icons text-sm">verified</span>
            </div>
            <span className="text-lg font-bold">QualiTrust</span>
          </div>
          <button onClick={closeMobileMenu} className="text-slate-400">
            <span className="material-icons text-xl">close</span>
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar pt-2">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={closeMobileMenu}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-slate-600 hover:bg-slate-50'
                }`
              }
            >
              <span className="material-icons">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 p-2 mb-2">
            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
              <img
                alt="Usuário"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuC3cM92zd0wQWzUGACWHRD8sYIJUQS5hmscve0DMqBm3_Bgxv8MinP8XPGZ3iafnr4Hk8v0Qhyeb3-4ilchjnBTk_8wamx6lnhvKYYhsudFv-tOOkBuHr2PTW2t1a5Amd92J2iJZiX8f9teObUYvzgAI1g79EzZONqb3v5RwlVbSHtmPu_rZcoB1Rs-n1k7pmF0kKczvDX8djzMNIdXtZlMRE6EK5OBDrPBkBq-YpRHD_sp7N_4IotBdd424zcjxrj7cU9o3Azv5atQ"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.displayName || user?.email || 'Usuário'}</p>
              <p className="text-xs text-slate-500 truncate">Administrador</p>
            </div>
          </div>

          <button
            onClick={async () => {
              try {
                await logout();
              } catch (error) {
                console.error("Failed to logout", error);
              }
            }}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
          >
            <span className="material-icons text-lg">logout</span>
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar relative">
          <Outlet />
        </div>
      </main>
    </div>
  );
};


export default Layout;
