
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FileText, LogOut, LogIn, Menu, X, UserCircle2, User, FileOutput, Eye } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import ThemeToggle from './ThemeToggle';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import NotificationBell from '@/components/notifications/NotificationBell';

const Navbar = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };
  
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center space-x-2">
            <FileText className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">ScriptFlow</span>
          </Link>
          
          {user && (
            <nav className="hidden md:flex items-center space-x-4 lg:space-x-6 ml-6">
              <Link to="/dashboard" className={`text-sm font-medium transition-colors hover:text-primary ${location.pathname === '/dashboard' ? 'text-foreground' : 'text-foreground/60'}`}>
                Dashboard
              </Link>
              <Link to="/scripts" className={`text-sm font-medium transition-colors hover:text-primary ${location.pathname === '/scripts' ? 'text-foreground' : 'text-foreground/60'}`}>
                Scripts
              </Link>
              <Link to="/chamados" className={`text-sm font-medium transition-colors hover:text-primary ${location.pathname === '/chamados' ? 'text-foreground' : 'text-foreground/60'}`}>
                Chamados
              </Link>
              <Link to="/chamados-encerrados" className={`text-sm font-medium transition-colors hover:text-primary ${location.pathname === '/chamados-encerrados' ? 'text-foreground' : 'text-foreground/60'}`}>
                Encerrados
              </Link>
              <Link to="/scripts-modelos" className={`text-sm font-medium transition-colors hover:text-primary ${location.pathname.includes('/script-modelo') || location.pathname.includes('/gerador-script') ? 'text-foreground' : 'text-foreground/60'}`}>
                Gerador de Scripts
              </Link>
              <Link to="/supervisor" className={`text-sm font-medium transition-colors hover:text-primary ${location.pathname === '/supervisor' ? 'text-foreground' : 'text-foreground/60'}`}>
                Supervisor
              </Link>
            </nav>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {user && <NotificationBell />}
          <ThemeToggle />
          
          {user ? (
            <div className="relative">
              <button
                onClick={toggleMenu}
                className="flex items-center gap-1 text-sm font-medium hover:text-primary py-1.5 px-2 rounded-md hover:bg-accent transition-colors"
              >
                <UserCircle2 size={20} />
                <span className="max-w-[100px] truncate hidden sm:block">
                  {user.email?.split('@')[0]}
                </span>
              </button>
              
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-card border border-border overflow-hidden z-10">
                  <div className="py-1">
                    <Link
                      to="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center px-4 py-2 text-sm hover:bg-accent transition-colors"
                    >
                      <User size={16} className="mr-2" />
                      Meu Perfil
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 hover:bg-accent transition-colors"
                    >
                      <LogOut size={16} className="mr-2" />
                      Sair
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link to="/" className="flex items-center space-x-1 text-sm font-medium">
              <LogIn size={18} />
              <span>Login</span>
            </Link>
          )}
          
          {user && (
            <button 
              onClick={toggleSidebar} 
              className="md:hidden ml-2"
              aria-label="Menu"
            >
              <Menu size={20} />
            </button>
          )}
        </div>
      </div>
      
      {/* Mobile sidebar */}
      {isMobile && sidebarOpen && user && (
        <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" onClick={closeSidebar}>
          <div className="fixed inset-y-0 right-0 w-64 bg-background border-l border-border/40 shadow-xl p-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 pb-2 border-b">
              <h2 className="font-medium">Menu</h2>
              <button onClick={closeSidebar} className="p-1 rounded-full hover:bg-accent/60">
                <X size={20} />
              </button>
            </div>
            <nav className="space-y-2">
              <Link to="/dashboard" className={`block py-2 px-3 rounded-lg hover:bg-accent ${location.pathname === '/dashboard' ? 'bg-accent/80 text-foreground' : 'text-foreground/70'}`} onClick={closeSidebar}>
                Dashboard
              </Link>
              <Link to="/scripts" className={`block py-2 px-3 rounded-lg hover:bg-accent ${location.pathname === '/scripts' ? 'bg-accent/80 text-foreground' : 'text-foreground/70'}`} onClick={closeSidebar}>
                Scripts
              </Link>
              <Link to="/chamados" className={`block py-2 px-3 rounded-lg hover:bg-accent ${location.pathname === '/chamados' ? 'bg-accent/80 text-foreground' : 'text-foreground/70'}`} onClick={closeSidebar}>
                Chamados
              </Link>
              <Link to="/chamados-encerrados" className={`block py-2 px-3 rounded-lg hover:bg-accent ${location.pathname === '/chamados-encerrados' ? 'bg-accent/80 text-foreground' : 'text-foreground/70'}`} onClick={closeSidebar}>
                Encerrados
              </Link>
              <Link to="/scripts-modelos" className={`block py-2 px-3 rounded-lg hover:bg-accent ${location.pathname.includes('/script-modelo') || location.pathname.includes('/gerador-script') ? 'bg-accent/80 text-foreground' : 'text-foreground/70'}`} onClick={closeSidebar}>
                Gerador de Scripts
              </Link>
              <Link to="/supervisor" className={`block py-2 px-3 rounded-lg hover:bg-accent ${location.pathname === '/supervisor' ? 'bg-accent/80 text-foreground' : 'text-foreground/70'}`} onClick={closeSidebar}>
                Supervisor
              </Link>
              <Link to="/profile" className={`block py-2 px-3 rounded-lg hover:bg-accent ${location.pathname === '/profile' ? 'bg-accent/80 text-foreground' : 'text-foreground/70'}`} onClick={closeSidebar}>
                Meu Perfil
              </Link>
              
              <button
                onClick={() => {
                  closeSidebar();
                  handleLogout();
                }}
                className="w-full text-left flex items-center py-2 px-3 rounded-lg text-red-600 hover:bg-accent"
              >
                <LogOut size={16} className="mr-2" />
                Sair
              </button>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
