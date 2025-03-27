
import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Scripts from "./pages/Scripts";
import Chamados from "./pages/Chamados";
import ChamadosEncerrados from "./pages/ChamadosEncerrados";
import NotFound from "./pages/NotFound";
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import { AuthProvider, useAuth } from './context/AuthContext';

// Adiciona a biblioteca framer-motion para animações
import { AnimatePresence, motion } from 'framer-motion';
import { ThemeProvider } from './context/ThemeContext';

const queryClient = new QueryClient();

// Componente de proteção de rota
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// Componente de layout
const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  
  // Não mostrar o layout na página inicial (login/registro)
  if (location.pathname === '/') {
    return <>{children}</>;
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 pb-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
            <Layout>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/scripts"
                  element={
                    <ProtectedRoute>
                      <Scripts />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/chamados"
                  element={
                    <ProtectedRoute>
                      <Chamados />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/chamados-encerrados"
                  element={
                    <ProtectedRoute>
                      <ChamadosEncerrados />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Layout>
            <Toaster />
            <Sonner />
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
