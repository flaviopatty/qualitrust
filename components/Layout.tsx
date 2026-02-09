
import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: 'Painel', path: '/dashboard', icon: 'dashboard' },
    { label: 'Avaliações', path: '/evaluations', icon: 'assignment' },
    { label: 'Detalhes do Contrato', path: '/contracts', icon: 'history_edu' },
    { label: 'Administração', path: '/admin', icon: 'settings' },
  ];

  return (
    <div className="flex h-screen bg-background-light overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 bg-white hidden lg:flex flex-col flex-shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-white">
            <span className="material-icons">verified</span>
          </div>
          <span className="text-xl font-bold tracking-tight">QualiTrust</span>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
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
            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
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
                // Redirect happens automatically due to ProtectedRoute
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
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
