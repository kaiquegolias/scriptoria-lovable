
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FileText, LogOut, LogIn, Menu, X, UserCircle2, User, Sparkles, BookOpen, Calendar, Trash2, Eye, BarChart3 } from 'lucide-react';
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

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/scripts', label: 'Scripts' },
    { to: '/chamados', label: 'Chamados' },
    { to: '/chamados-encerrados', label: 'Encerrados' },
    { to: '/chamados-excluidos', label: 'Excluídos' },
    { to: '/diario', label: 'Diário' },
    { to: '/scripts-modelos', label: 'Gerador', matchPaths: ['/script-modelo', '/gerador-script'] },
    { to: '/supervisor', label: 'Supervisor' },
    { to: '/biblioteca', label: 'Biblioteca' },
    { to: '/cortana', label: 'Cortana', icon: Sparkles },
  ];

  const isActive = (link: typeof navLinks[0]) => {
    if (link.matchPaths) return link.matchPaths.some(p => location.pathname.includes(p));
    return location.pathname === link.to;
  };
  
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="p-1.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <span className="font-bold text-base">Thoth</span>
          </Link>
          
          {user && (
            <nav className="hidden md:flex items-center space-x-1 ml-4">
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all duration-200 flex items-center gap-1 ${
                    isActive(link) 
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                  }`}
                >
                  {link.icon && <link.icon className="h-3 w-3" />}
                  {link.label}
                </Link>
              ))}
            </nav>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {user && <NotificationBell />}
          <ThemeToggle />
          
          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-1.5 text-sm font-medium py-1.5 px-2.5 rounded-xl hover:bg-accent transition-colors"
              >
                <UserCircle2 size={18} />
                <span className="max-w-[80px] truncate hidden sm:block text-xs">
                  {user.email?.split('@')[0]}
                </span>
              </button>
              
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl shadow-lg bg-card border border-border overflow-hidden z-10 animate-scale-in">
                  <div className="py-1">
                    <Link
                      to="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                    >
                      <User size={15} className="mr-2.5" />
                      Meu Perfil
                    </Link>
                    <button
                      onClick={() => { setMenuOpen(false); handleLogout(); }}
                      className="w-full text-left flex items-center px-4 py-2.5 text-sm text-destructive hover:bg-accent transition-colors"
                    >
                      <LogOut size={15} className="mr-2.5" />
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
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
              aria-label="Menu"
            >
              <Menu size={18} />
            </button>
          )}
        </div>
      </div>
      
      {/* Mobile sidebar */}
      {isMobile && sidebarOpen && user && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)}>
          <div className="fixed inset-y-0 right-0 w-72 bg-card border-l border-border shadow-2xl p-5" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-semibold text-base">Menu</h2>
              <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg hover:bg-accent">
                <X size={18} />
              </button>
            </div>
            <nav className="space-y-1">
              {navLinks.map(link => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center gap-2.5 py-2.5 px-3.5 rounded-xl transition-colors text-sm ${
                    isActive(link) ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground hover:bg-accent/50'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  {link.icon && <link.icon className="h-4 w-4" />}
                  {link.label}
                </Link>
              ))}
              <Link
                to="/profile"
                className={`flex items-center gap-2.5 py-2.5 px-3.5 rounded-xl transition-colors text-sm ${
                  location.pathname === '/profile' ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground hover:bg-accent/50'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <User className="h-4 w-4" />
                Meu Perfil
              </Link>
              
              <button
                onClick={() => { setSidebarOpen(false); handleLogout(); }}
                className="w-full flex items-center gap-2.5 py-2.5 px-3.5 rounded-xl text-destructive hover:bg-accent text-sm"
              >
                <LogOut className="h-4 w-4" />
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
