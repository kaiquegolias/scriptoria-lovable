
import React from 'react';
import { useNavigate } from 'react-router-dom';
import AuthForm from '@/components/auth/AuthForm';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';

const Index = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);
  
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <motion.h1 
              className="text-4xl md:text-5xl font-bold mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              ScriptFlow
            </motion.h1>
            
            <motion.p 
              className="text-xl text-foreground/80 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Sistema de gerenciamento de scripts e respostas padrão
            </motion.p>
            
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="flex items-center justify-center lg:justify-start">
                <div className="bg-primary/10 p-2 rounded-full mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <line x1="10" y1="9" x2="8" y2="9" />
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="font-medium">Gerenciamento de Scripts</h3>
                  <p className="text-sm text-foreground/70">Organize seus scripts de forma eficiente</p>
                </div>
              </div>
              
              <div className="flex items-center justify-center lg:justify-start">
                <div className="bg-primary/10 p-2 rounded-full mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16" />
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="font-medium">Gestão de Chamados</h3>
                  <p className="text-sm text-foreground/70">Acompanhe chamados com facilidade</p>
                </div>
              </div>
              
              <div className="flex items-center justify-center lg:justify-start">
                <div className="bg-primary/10 p-2 rounded-full mr-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </div>
                <div className="text-left">
                  <h3 className="font-medium">Respostas Personalizadas</h3>
                  <p className="text-sm text-foreground/70">Crie e edite respostas para cada situação</p>
                </div>
              </div>
            </motion.div>
          </div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <AuthForm />
          </motion.div>
        </div>
      </main>
      
      <footer className="py-6 text-center text-sm text-foreground/60">
        <p>&copy; {new Date().getFullYear()} ScriptFlow. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default Index;
