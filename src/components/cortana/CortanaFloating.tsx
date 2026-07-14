import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Sparkles, X, Maximize2, Minimize2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import CortanaChat from './CortanaChat';

const HIDE_ON_ROUTES = ['/cortana', '/'];

const CortanaFloating: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Close popup on route change
  useEffect(() => {
    setOpen(false);
    setExpanded(false);
  }, [location.pathname]);

  if (!user) return null;
  if (HIDE_ON_ROUTES.includes(location.pathname)) return null;

  return (
    <>
      {/* Floating trigger button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 group"
          aria-label="Abrir Cortana"
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/40 blur-xl group-hover:blur-2xl transition-all animate-pulse" />
            <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-primary via-primary to-primary/70 shadow-2xl shadow-primary/40 flex items-center justify-center text-primary-foreground hover:scale-110 transition-transform border-2 border-primary-foreground/10">
              <Sparkles className="h-6 w-6" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
            </span>
          </div>
        </button>
      )}

      {/* Popup / expanded panel */}
      {open && (
        <div
          className={cn(
            'fixed z-50 bg-card/95 backdrop-blur-xl border border-border/60 shadow-2xl shadow-primary/20 flex flex-col overflow-hidden transition-all duration-300',
            expanded
              ? 'inset-4 md:inset-8 rounded-3xl'
              : 'bottom-6 right-6 w-[min(420px,calc(100vw-3rem))] h-[min(640px,calc(100vh-6rem))] rounded-2xl'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-md shadow-primary/30">
                <Sparkles className="h-4.5 w-4.5 text-primary-foreground" />
              </div>
              <div>
                <div className="text-sm font-semibold leading-tight flex items-center gap-1.5">
                  Cortana
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                </div>
                <div className="text-[10px] text-muted-foreground">Assistente PEN · Online</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-lg"
                onClick={() => navigate('/cortana')}
                title="Abrir página completa"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-lg"
                onClick={() => setExpanded((v) => !v)}
                title={expanded ? 'Minimizar' : 'Expandir'}
              >
                {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  setOpen(false);
                  setExpanded(false);
                }}
                title="Fechar"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Chat body */}
          <div className="flex-1 overflow-hidden p-3">
            <div className="h-full [&>div]:!h-full [&>div]:!max-h-full">
              <CortanaChat />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CortanaFloating;
