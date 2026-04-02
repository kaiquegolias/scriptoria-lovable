
import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="py-4 mt-auto border-t border-border/40">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="text-xs text-muted-foreground">
            &copy; {currentYear} Thoth v2.0 — Todos os direitos reservados.
          </p>
          <div className="flex space-x-4">
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Suporte</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
