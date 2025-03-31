
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';

import Index from '@/pages/Index';
import Dashboard from '@/pages/Dashboard';
import Scripts from '@/pages/Scripts';
import Chamados from '@/pages/Chamados';
import ChamadosEncerrados from '@/pages/ChamadosEncerrados';
import Profile from '@/pages/Profile';
import NotFound from '@/pages/NotFound';

import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { ThemeProvider } from '@/context/ThemeContext';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <div className="flex flex-col min-h-screen bg-background text-foreground">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/scripts" element={<Scripts />} />
              <Route path="/chamados" element={<Chamados />} />
              <Route path="/chamados-encerrados" element={<ChamadosEncerrados />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
          <Toaster position="bottom-right" />
        </div>
      </ThemeProvider>
    </Router>
  );
}

export default App;
