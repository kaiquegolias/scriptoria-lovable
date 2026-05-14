import React, { useEffect, useRef } from 'react';
import { Upload, FileText, Loader2, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { usePdfImport } from '@/context/PdfImportContext';

export type { ExtractedMexxData } from '@/utils/mexxPdfExtractor';
import type { ExtractedMexxData } from '@/utils/mexxPdfExtractor';

interface Props {
  onExtracted: (data: ExtractedMexxData) => void;
}

const MexxPdfImport: React.FC<Props> = ({ onExtracted }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const { status, fileName, progress, error, pendingData, startImport, consumePending } = usePdfImport();
  const loading = status === 'processing';
  const success = status === 'done';

  // Auto-consume pending result when form mounts/updates
  useEffect(() => {
    if (status === 'done' && pendingData) {
      const d = consumePending();
      if (d) onExtracted(d);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, pendingData]);

  const handleFile = (file: File) => {
    void startImport(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className="relative rounded-xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-accent/5 p-4 transition hover:border-primary/60"
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = '';
        }}
      />

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> :
            success ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> :
            status === 'error' ? <AlertCircle className="h-5 w-5 text-destructive" /> :
            <Sparkles className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold flex items-center gap-2">
            Importar do PDF / MEXX
            <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/15 text-primary">IA</span>
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {fileName ? (
              <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{fileName}</span>
            ) : (
              'Arraste um PDF do Portal MEXX aqui ou clique para selecionar.'
            )}
          </div>
          {loading && (
            <div className="mt-2 h-1 w-full rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
          {status === 'error' && error && (
            <p className="text-xs text-destructive mt-1 line-clamp-2">{error}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          {loading ? `Analisando ${progress}%` : 'Selecionar PDF'}
        </button>
      </div>
      {loading && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Pode fechar este formulário ou navegar — a extração segue em segundo plano.
        </p>
      )}
    </div>
  );
};

export default MexxPdfImport;
