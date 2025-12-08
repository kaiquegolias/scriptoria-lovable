import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, AlertTriangle, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface DeleteTicketModalProps {
  ticketId: string;
  ticketTitle: string;
  onClose: () => void;
  onConfirm: (ticketId: string, justification: string) => Promise<void>;
}

const DeleteTicketModal: React.FC<DeleteTicketModalProps> = ({
  ticketId,
  ticketTitle,
  onClose,
  onConfirm
}) => {
  const [justification, setJustification] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!justification.trim()) {
      setError('A justificativa é obrigatória.');
      return;
    }

    if (justification.trim().length < 10) {
      setError('A justificativa deve ter pelo menos 10 caracteres.');
      return;
    }

    if (!password) {
      setError('A senha é obrigatória.');
      return;
    }

    setLoading(true);

    try {
      // Verify password by attempting to sign in with current user's email
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.email) {
        setError('Não foi possível verificar o usuário.');
        setLoading(false);
        return;
      }

      // Attempt to verify the password
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password
      });

      if (authError) {
        setError('Senha incorreta. Tente novamente.');
        setLoading(false);
        return;
      }

      // Password verified, proceed with deletion
      await onConfirm(ticketId, justification.trim());
      toast.success('Chamado excluído com sucesso.');
      onClose();
    } catch (err) {
      console.error('Error deleting ticket:', err);
      setError('Erro ao excluir chamado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
        <motion.div
          className="bg-background rounded-xl shadow-xl w-full max-w-md mx-4"
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          <div className="p-6 border-b bg-destructive/10 rounded-t-xl">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/20 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Confirmar Exclusão</h2>
                  <p className="text-sm text-muted-foreground">Esta ação não pode ser desfeita</p>
                </div>
              </div>
              <button 
                onClick={onClose} 
                className="p-1 rounded-full hover:bg-destructive/20 transition-colors"
              >
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Chamado a ser excluído:</p>
              <p className="font-medium text-foreground truncate">{ticketTitle}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="justification" className="text-foreground">
                Justificativa da exclusão <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="justification"
                placeholder="Descreva o motivo da exclusão deste chamado..."
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                className="min-h-[100px] resize-none"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground flex items-center gap-2">
                <Lock size={14} />
                Confirme sua senha <span className="text-destructive">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Digite sua senha do ScriptFlow"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  'Verificando...'
                ) : (
                  <>
                    <Trash2 size={16} className="mr-2" />
                    Excluir Chamado
                  </>
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default DeleteTicketModal;
