import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { useTicketClose } from '@/hooks/useTicketClose';
import { Chamado } from './ChamadoCard';

interface CloseTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chamado: Chamado | null;
  onSuccess: () => void;
}

const CLASSIFICATIONS = [
  'Resolução técnica',
  'Configuração aplicada',
  'Erro de usuário',
  'Problema de rede',
  'Atualização de sistema',
  'Falta de comunicação',
  'Não pertinentes ao PEN/PNCP',
  'Outros',
];

const CloseTicketModal: React.FC<CloseTicketModalProps> = ({
  open,
  onOpenChange,
  chamado,
  onSuccess,
}) => {
  const [ultimoAcompanhamento, setUltimoAcompanhamento] = useState('');
  const [classificacao, setClassificacao] = useState('');
  const [isException, setIsException] = useState(false);

  const { closeTicket, loading, exceptionClassifications } = useTicketClose();

  const isExceptionClassification = exceptionClassifications.includes(classificacao);
  const requiresAcompanhamento = !isExceptionClassification;

  const handleClose = async () => {
    if (!chamado) return;

    const success = await closeTicket({
      ticketId: chamado.id,
      ultimoAcompanhamento: requiresAcompanhamento ? ultimoAcompanhamento : undefined,
      classificacao,
    });

    if (success) {
      setUltimoAcompanhamento('');
      setClassificacao('');
      setIsException(false);
      onOpenChange(false);
      onSuccess();
    }
  };

  const canSubmit = classificacao && (isExceptionClassification || ultimoAcompanhamento.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Encerrar Chamado
          </DialogTitle>
          <DialogDescription>
            {chamado?.titulo}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Classificação */}
          <div className="space-y-2">
            <Label htmlFor="classificacao">
              Classificação do Encerramento <span className="text-destructive">*</span>
            </Label>
            <Select value={classificacao} onValueChange={setClassificacao}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a classificação" />
              </SelectTrigger>
              <SelectContent>
                {CLASSIFICATIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                    {exceptionClassifications.includes(c) && (
                      <span className="ml-2 text-xs text-muted-foreground">(exceção)</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Info about exception */}
          {isExceptionClassification && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-md border border-yellow-200 dark:border-yellow-800">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  Classificação de exceção
                </p>
                <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                  Esta classificação não requer preenchimento do último acompanhamento.
                </p>
              </div>
            </div>
          )}

          {/* Último Acompanhamento */}
          <div className="space-y-2">
            <Label htmlFor="ultimo-acompanhamento">
              Último Acompanhamento 
              {requiresAcompanhamento && <span className="text-destructive"> *</span>}
            </Label>
            <Textarea
              id="ultimo-acompanhamento"
              placeholder="Descreva o último acompanhamento e como o chamado foi resolvido..."
              value={ultimoAcompanhamento}
              onChange={(e) => setUltimoAcompanhamento(e.target.value)}
              rows={4}
              disabled={isExceptionClassification}
              className={isExceptionClassification ? 'opacity-50 cursor-not-allowed' : ''}
            />
            {requiresAcompanhamento && !ultimoAcompanhamento.trim() && (
              <p className="text-xs text-muted-foreground">
                Campo obrigatório para esta classificação
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleClose}
            disabled={!canSubmit || loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? 'Encerrando...' : 'Encerrar Chamado'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CloseTicketModal;
