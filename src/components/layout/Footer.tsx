
import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="py-6 glass mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-sm text-foreground/80">
              &copy; {currentYear} ScriptFlow. Todos os direitos reservados.
            </p>
          </div>
          <div className="flex space-x-6">
            <a href="#" className="text-sm text-foreground/80 hover:text-foreground">
              Termos de Uso
            </a>
            <a href="#" className="text-sm text-foreground/80 hover:text-foreground">
              Política de Privacidade
            </a>
            <a href="#" className="text-sm text-foreground/80 hover:text-foreground">
              Suporte
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
