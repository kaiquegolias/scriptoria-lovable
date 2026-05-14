
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';

import Index from '@/pages/Index';
import Dashboard from '@/pages/Dashboard';
import Scripts from '@/pages/Scripts';
import Chamados from '@/pages/Chamados';
import ChamadosEncerrados from '@/pages/ChamadosEncerrados';
import ChamadosExcluidos from '@/pages/ChamadosExcluidos';
import DiarioAnalista from '@/pages/DiarioAnalista';
import Profile from '@/pages/Profile';
import NotFound from '@/pages/NotFound';
import GeradorScripts from '@/pages/GeradorScripts';
import ScriptsModelos from '@/pages/ScriptsModelos';
import Supervisor from '@/pages/Supervisor';
import Biblioteca from '@/pages/Biblioteca';
import Cortana from '@/pages/Cortana';

import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { ThemeProvider } from '@/context/ThemeContext';
import { PdfImportProvider } from '@/context/PdfImportContext';
import PdfImportFloating from '@/components/chamados/PdfImportFloating';

function App() {
  return (
    <Router>
      <ThemeProvider>
        <PdfImportProvider>
        <div className="flex flex-col min-h-screen bg-background text-foreground">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/scripts" element={<Scripts />} />
              <Route path="/chamados" element={<Chamados />} />
              <Route path="/chamados-encerrados" element={<ChamadosEncerrados />} />
              <Route path="/chamados-excluidos" element={<ChamadosExcluidos />} />
              <Route path="/diario" element={<DiarioAnalista />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/gerador-scripts" element={<GeradorScripts />} />
              <Route path="/scripts-modelos" element={<ScriptsModelos />} />
              <Route path="/supervisor" element={<Supervisor />} />
              <Route path="/biblioteca" element={<Biblioteca />} />
              <Route path="/cortana" element={<Cortana />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <Footer />
          <Toaster position="bottom-right" />
          <PdfImportFloating />
        </div>
        </PdfImportProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;
