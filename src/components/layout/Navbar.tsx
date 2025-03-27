
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Menu, X, LogOut, User, Home, File, PhoneCall, CheckSquare } from 'lucide-react';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const toggleMenu = () => setIsOpen(!isOpen);

  const navItems = [
    { name: 'Início', path: '/', icon: <Home className="w-5 h-5" /> },
    { name: 'Scripts', path: '/scripts', icon: <File className="w-5 h-5" /> },
    { name: 'Chamados', path: '/chamados', icon: <PhoneCall className="w-5 h-5" /> },
    { name: 'Encerrados', path: '/chamados-encerrados', icon: <CheckSquare className="w-5 h-5" /> },
  ];

  return (
    <nav className="glass sticky top-0 z-50 px-4 py-2.5">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center space-x-3">
          <span className="text-xl font-semibold whitespace-nowrap">ScriptFlow</span>
        </Link>
        
        {/* Desktop Menu */}
        <div className="hidden md:flex items-center space-x-4">
          {isAuthenticated && (
            <div className="flex space-x-8">
              {navItems.map((item) => (
                <Link 
                  key={item.path} 
                  to={item.path}
                  className={`flex items-center text-sm font-medium transition-all hover:-translate-y-0.5 ${
                    location.pathname === item.path 
                      ? 'text-primary font-semibold' 
                      : 'text-foreground/80 hover:text-foreground'
                  }`}
                >
                  {item.icon}
                  <span className="ml-2">{item.name}</span>
                </Link>
              ))}
            </div>
          )}
          
          {isAuthenticated ? (
            <div className="flex items-center space-x-4">
              <div className="text-sm text-muted-foreground">
                <span>Olá, </span>
                <span className="font-medium">{user?.name}</span>
              </div>
              <button 
                onClick={logout}
                className="flex items-center px-3 py-1.5 text-sm rounded-full bg-white hover:bg-gray-100 transition-colors shadow-sm"
              >
                <LogOut className="w-4 h-4 mr-1.5" />
                Sair
              </button>
            </div>
          ) : (
            <Link to="/" className="text-sm font-medium">
              Entrar
            </Link>
          )}
        </div>
        
        {/* Mobile menu button */}
        <button
          type="button"
          className="inline-flex items-center p-2 ml-3 text-sm rounded-lg md:hidden hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200"
          onClick={toggleMenu}
        >
          <span className="sr-only">Abrir menu</span>
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>
      
      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden absolute glass w-full left-0 z-50 animate-fade-in">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {isAuthenticated && navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center p-2 rounded-md ${
                  location.pathname === item.path 
                    ? 'text-primary bg-white/40' 
                    : 'text-foreground/80 hover:bg-white/20'
                }`}
                onClick={() => setIsOpen(false)}
              >
                {item.icon}
                <span className="ml-3">{item.name}</span>
              </Link>
            ))}
            
            {isAuthenticated ? (
              <button 
                onClick={() => {
                  logout();
                  setIsOpen(false);
                }}
                className="flex w-full items-center p-2 rounded-md text-foreground/80 hover:bg-white/20"
              >
                <LogOut className="w-5 h-5" />
                <span className="ml-3">Sair</span>
              </button>
            ) : (
              <Link
                to="/"
                className="flex items-center p-2 rounded-md text-foreground/80 hover:bg-white/20"
                onClick={() => setIsOpen(false)}
              >
                <User className="w-5 h-5" />
                <span className="ml-3">Entrar</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
