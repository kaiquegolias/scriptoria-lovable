import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2, Loader2, X, FileText, AlertCircle, ArrowRight } from 'lucide-react';
import { usePdfImport } from '@/context/PdfImportContext';

const PdfImportFloating: React.FC = () => {
  const { status, fileName, progress, error, pendingData, reset } = usePdfImport();
  const navigate = useNavigate();
  const location = useLocation();

  if (status === 'idle') return null;

  const goToForm = () => {
    if (location.pathname !== '/chamados') {
      navigate('/chamados?fromImport=1');
    } else {
      window.dispatchEvent(new CustomEvent('open-chamado-form-from-import'));
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[60] w-[340px] rounded-2xl border bg-card shadow-2xl backdrop-blur-md animate-fade-in">
      <div className="flex items-start gap-3 p-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          status === 'processing' ? 'bg-primary/10 text-primary' :
          status === 'done' ? 'bg-emerald-500/10 text-emerald-600' :
          'bg-destructive/10 text-destructive'
        }`}>
          {status === 'processing' && <Loader2 className="h-5 w-5 animate-spin" />}
          {status === 'done' && <CheckCircle2 className="h-5 w-5" />}
          {status === 'error' && <AlertCircle className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold">
            {status === 'processing' && 'Analisando PDF do MEXX...'}
            {status === 'done' && 'Extração concluída'}
            {status === 'error' && 'Falha na extração'}
          </div>
          <div className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
            <FileText className="h-3 w-3" /> {fileName}
          </div>
          {status === 'processing' && (
            <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          {status === 'error' && error && (
            <p className="text-xs text-destructive mt-1 line-clamp-2">{error}</p>
          )}
          {status === 'done' && pendingData && (
            <button
              onClick={goToForm}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              {pendingData.numero_chamado ? `Abrir chamado nº ${pendingData.numero_chamado}` : 'Criar chamado com os dados'}
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
        {status !== 'processing' && (
          <button
            onClick={reset}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {status === 'processing' && (
        <div className="px-4 pb-3 text-[11px] text-muted-foreground">
          Pode navegar à vontade — a extração continuará rodando em segundo plano.
        </div>
      )}
    </div>
  );
};

export default PdfImportFloating;
