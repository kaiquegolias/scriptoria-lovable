import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import ThemeToggle from './ThemeToggle';

const Navbar = () => {
  const location = useLocation();
  const { isAuthenticated, signOut } = useAuth();
  
  // Não mostrar o navbar na página inicial (login/registro)
  if (location.pathname === '/') {
    return null;
  }
  
  // Menu de navegação
  const navLinks = (
    <>
      <Link to="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link>
      <Link to="/scripts" className="hover:text-primary transition-colors">Scripts</Link>
      <Link to="/chamados" className="hover:text-primary transition-colors">Chamados</Link>
      <Link to="/chamados-encerrados" className="hover:text-primary transition-colors">Chamados Encerrados</Link>
    </>
  );
  
  return (
    <nav className="bg-background border-b sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/dashboard" className="font-bold text-xl">ScriptFlow</Link>
          
          <div className="hidden md:flex items-center space-x-6">
            {navLinks}
          </div>
          
          <div className="flex items-center gap-4">
            <ThemeToggle />
            
            {isAuthenticated && (
              <button 
                onClick={() => signOut()}
                className="text-sm text-primary hover:text-primary/80 transition-colors"
              >
                Sair
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
