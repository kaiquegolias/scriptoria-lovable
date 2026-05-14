import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ExtractedMexxData, runMexxExtraction } from '@/utils/mexxPdfExtractor';

type ImportStatus = 'idle' | 'processing' | 'done' | 'error';

interface PdfImportState {
  status: ImportStatus;
  fileName: string | null;
  progress: number;
  error: string | null;
  pendingData: ExtractedMexxData | null;
  startImport: (file: File) => Promise<void>;
  consumePending: () => ExtractedMexxData | null;
  reset: () => void;
}

const Ctx = createContext<PdfImportState | null>(null);

export const PdfImportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [fileName, setFileName] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pendingData, setPendingData] = useState<ExtractedMexxData | null>(null);
  const runningRef = useRef(false);

  // Warn user if they try to close/reload during extraction
  useEffect(() => {
    if (status !== 'processing') return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [status]);

  const startImport = useCallback(async (file: File) => {
    if (runningRef.current) {
      toast.error('Já existe uma extração em andamento. Aguarde concluir.');
      return;
    }
    if (file.type !== 'application/pdf') {
      toast.error('Selecione um arquivo PDF.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('PDF muito grande (máx 10MB).');
      return;
    }
    runningRef.current = true;
    setStatus('processing');
    setFileName(file.name);
    setProgress(0);
    setError(null);
    setPendingData(null);

    try {
      const { data, source } = await runMexxExtraction(file, (p) => setProgress(p));
      setPendingData(data);
      setStatus('done');
      setProgress(100);
      toast.success(
        source === 'ai'
          ? 'PDF analisado pela IA. Os campos do chamado já estão prontos.'
          : 'PDF analisado localmente. Revise os campos extraídos.'
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Falha ao extrair PDF';
      setError(msg);
      setStatus('error');
      toast.error(msg);
    } finally {
      runningRef.current = false;
    }
  }, []);

  const consumePending = useCallback(() => {
    const d = pendingData;
    setPendingData(null);
    if (status === 'done') setStatus('idle');
    return d;
  }, [pendingData, status]);

  const reset = useCallback(() => {
    if (status === 'processing') return;
    setStatus('idle');
    setProgress(0);
    setFileName(null);
    setError(null);
    setPendingData(null);
  }, [status]);

  return (
    <Ctx.Provider value={{ status, fileName, progress, error, pendingData, startImport, consumePending, reset }}>
      {children}
    </Ctx.Provider>
  );
};

export const usePdfImport = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePdfImport must be used within PdfImportProvider');
  return ctx;
};
