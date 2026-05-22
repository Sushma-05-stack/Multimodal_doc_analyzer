import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RiDashboardLine, RiFileList3Line, RiUploadCloud2Line, RiChat3Line,
  RiSearchLine, RiBarChartLine, RiSettings4Line, RiShieldUserLine,
  RiMenuLine, RiCloseLine, RiMoonLine, RiSunLine, RiComputerLine,
  RiLogoutBoxLine, RiUser3Line, RiContrastLine, RiBrainLine,
  RiNotification3Line, RiWifiLine, RiWifiOffLine
} from 'react-icons/ri';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useSocketStore } from '../store/socketStore';
import clsx from 'clsx';

const navItems = [
  { to: '/dashboard', icon: RiDashboardLine, label: 'Dashboard' },
  { to: '/documents', icon: RiFileList3Line, label: 'Documents' },
  { to: '/upload', icon: RiUploadCloud2Line, label: 'Upload' },
  { to: '/chat', icon: RiChat3Line, label: 'AI Chat' },
  { to: '/search', icon: RiSearchLine, label: 'Search' },
  { to: '/analytics', icon: RiBarChartLine, label: 'Analytics' },
  { to: '/compare', icon: RiContrastLine, label: 'Compare' },
];

const adminItems = [
  { to: '/admin', icon: RiShieldUserLine, label: 'Admin' },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { user, logout, token } = useAuthStore();
  const { theme, setTheme } = useThemeStore();
  const { connect, disconnect, connected } = useSocketStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (token) connect(token);
    return () => disconnect();
  }, [token]);

  const handleLogout = () => {
    disconnect();
    logout();
    navigate('/login');
  };

  const themeOptions = [
    { value: 'light', icon: RiSunLine, label: 'Light' },
    { value: 'dark', icon: RiMoonLine, label: 'Dark' },
    { value: 'system', icon: RiComputerLine, label: 'System' },
  ];

  const NavItem = ({ to, icon: Icon, label }) => (
    <NavLink
      to={to}
      onClick={() => setSidebarOpen(false)}
      className={({ isActive }) => clsx(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative',
        isActive
          ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 font-semibold'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
      )}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.div
              layoutId="activeNav"
              className="absolute inset-0 bg-primary-500/10 rounded-xl"
              transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
            />
          )}
          <Icon className={clsx('text-xl flex-shrink-0 relative z-10', isActive && 'text-primary-500')} />
          {!sidebarCollapsed && (
            <span className="text-sm relative z-10 truncate">{label}</span>
          )}
          {sidebarCollapsed && (
            <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 dark:bg-slate-700 text-white text-xs rounded-lg
                            opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
              {label}
            </div>
          )}
        </>
      )}
    </NavLink>
  );

  const Sidebar = ({ mobile = false }) => (
    <div className={clsx(
      'flex flex-col h-full',
      mobile ? 'w-64' : sidebarCollapsed ? 'w-16' : 'w-64',
      'transition-all duration-300'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-200 dark:border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-500/30">
          <RiBrainLine className="text-white text-lg" />
        </div>
        {(!sidebarCollapsed || mobile) && (
          <div>
            <h1 className="font-bold text-slate-900 dark:text-white text-sm leading-tight">DocuMind AI</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Document Analyzer</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {navItems.map(item => <NavItem key={item.to} {...item} />)}
        {user?.role === 'admin' && (
          <>
            <div className="pt-3 pb-1">
              {(!sidebarCollapsed || mobile) && (
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-600 uppercase tracking-wider px-3">Admin</p>
              )}
            </div>
            {adminItems.map(item => <NavItem key={item.to} {...item} />)}
          </>
        )}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
        {/* Connection status */}
        {(!sidebarCollapsed || mobile) && (
          <div className={clsx(
            'flex items-center gap-2 px-3 py-2 rounded-xl text-xs',
            connected ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'text-slate-400 bg-slate-100 dark:bg-slate-800'
          )}>
            {connected ? <RiWifiLine /> : <RiWifiOffLine />}
            {connected ? 'Live updates on' : 'Connecting...'}
          </div>
        )}

        {/* Theme switcher */}
        {(!sidebarCollapsed || mobile) && (
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {themeOptions.map(({ value, icon: Icon, label }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                title={label}
                className={clsx(
                  'flex-1 flex items-center justify-center py-1.5 rounded-lg text-sm transition-all',
                  theme === value
                    ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                )}
              >
                <Icon />
              </button>
            ))}
          </div>
        )}

        {/* User */}
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-violet-500 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{user?.name?.[0]?.toUpperCase()}</span>
          </div>
          {(!sidebarCollapsed || mobile) && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.role}</p>
            </div>
          )}
          {(!sidebarCollapsed || mobile) && (
            <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors" title="Logout">
              <RiLogoutBoxLine />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 relative">
        <Sidebar />
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full flex items-center justify-center text-slate-400 hover:text-primary-500 transition-colors shadow-sm z-10"
        >
          <motion.div animate={{ rotate: sidebarCollapsed ? 0 : 180 }} transition={{ duration: 0.2 }}>
            <RiMenuLine className="text-xs" />
          </motion.div>
        </button>
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 h-full z-50 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 lg:hidden"
            >
              <Sidebar mobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 px-4 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
          >
            <RiMenuLine className="text-xl" />
          </button>

          {/* Breadcrumb */}
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900 dark:text-white capitalize">
              {location.pathname.split('/')[1] || 'Dashboard'}
            </p>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 relative">
              <RiNotification3Line className="text-xl" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full" />
            </button>
            <NavLink to="/settings" className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400">
              <RiSettings4Line className="text-xl" />
            </NavLink>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
