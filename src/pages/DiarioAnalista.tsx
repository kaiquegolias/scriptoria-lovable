import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Calendar, CheckCircle2, Circle, Trash2, Edit2, X, Link2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Chamado } from '@/components/chamados/ChamadoCard';

interface DiaryEntry {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  dueTime: string | null;
  completed: boolean;
  chamadoIds: string[];
  createdAt: string;
}

const DiarioAnalista = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [selectedChamados, setSelectedChamados] = useState<string[]>([]);
  const [chamadoSearch, setChamadoSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchEntries();
    fetchChamados();
  }, [user]);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('diary_entries')
        .select('*')
        .order('due_date', { ascending: true, nullsFirst: false });

      if (error) throw error;

      if (data) {
        setEntries(data.map(d => ({
          id: d.id,
          title: d.title,
          description: d.description,
          dueDate: d.due_date,
          dueTime: d.due_time,
          completed: d.completed,
          chamadoIds: d.chamado_ids || [],
          createdAt: d.created_at,
        })));
      }
    } catch (err) {
      console.error('Error fetching diary entries:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchChamados = async () => {
    try {
      const { data } = await supabase
        .from('chamados')
        .select('id, titulo, status, estruturante, nivel')
        .neq('status', 'excluido')
        .order('data_atualizacao', { ascending: false });

      if (data) {
        setChamados(data.map(c => ({
          id: c.id,
          titulo: c.titulo,
          status: c.status as any,
          estruturante: c.estruturante as any,
          nivel: c.nivel as any,
          acompanhamento: '',
          links: [],
          dataCriacao: '',
          dataAtualizacao: '',
        })));
      }
    } catch (err) {
      console.error('Error fetching chamados:', err);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setDueDate('');
    setDueTime('');
    setSelectedChamados([]);
    setChamadoSearch('');
    setEditingEntry(null);
    setShowForm(false);
  };

  const openEditForm = (entry: DiaryEntry) => {
    setEditingEntry(entry);
    setTitle(entry.title);
    setDescription(entry.description || '');
    setDueDate(entry.dueDate || '');
    setDueTime(entry.dueTime || '');
    setSelectedChamados(entry.chamadoIds);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!user || !title.trim()) {
      toast.error('O título é obrigatório.');
      return;
    }

    try {
      const payload = {
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate || null,
        due_time: dueTime || null,
        chamado_ids: selectedChamados,
      };

      if (editingEntry) {
        const { error } = await supabase
          .from('diary_entries')
          .update(payload)
          .eq('id', editingEntry.id);
        if (error) throw error;
        toast.success('Tarefa atualizada!');
      } else {
        const { error } = await supabase
          .from('diary_entries')
          .insert(payload);
        if (error) throw error;
        toast.success('Tarefa criada!');
      }

      resetForm();
      fetchEntries();
    } catch (err) {
      console.error('Error saving entry:', err);
      toast.error('Erro ao salvar tarefa.');
    }
  };

  const toggleComplete = async (entry: DiaryEntry) => {
    try {
      const { error } = await supabase
        .from('diary_entries')
        .update({ completed: !entry.completed })
        .eq('id', entry.id);
      if (error) throw error;
      setEntries(entries.map(e => e.id === entry.id ? { ...e, completed: !e.completed } : e));
    } catch (err) {
      toast.error('Erro ao atualizar tarefa.');
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      const { error } = await supabase
        .from('diary_entries')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setEntries(entries.filter(e => e.id !== id));
      toast.success('Tarefa removida.');
    } catch (err) {
      toast.error('Erro ao remover tarefa.');
    }
  };

  const filteredChamados = chamados.filter(c =>
    c.titulo.toLowerCase().includes(chamadoSearch.toLowerCase()) &&
    !selectedChamados.includes(c.id)
  );

  const pendentes = entries.filter(e => !e.completed);
  const concluidas = entries.filter(e => e.completed);

  const getChamadoTitle = (id: string) => {
    const c = chamados.find(ch => ch.id === id);
    return c?.titulo || 'Chamado não encontrado';
  };

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-medium">Você precisa estar logado.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Diário do Analista</h1>
          <p className="text-foreground/70">Organize suas tarefas e compromissos diários.</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2">
          <Plus size={18} />
          Nova Tarefa
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">Nenhuma tarefa registrada</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Comece adicionando sua primeira tarefa.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {pendentes.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Circle size={18} className="text-primary" />
                Pendentes ({pendentes.length})
              </h2>
              <div className="space-y-3">
                {pendentes.map(entry => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    onToggle={toggleComplete}
                    onEdit={openEditForm}
                    onDelete={deleteEntry}
                    getChamadoTitle={getChamadoTitle}
                  />
                ))}
              </div>
            </div>
          )}

          {concluidas.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 size={18} />
                Concluídas ({concluidas.length})
              </h2>
              <div className="space-y-3 opacity-70">
                {concluidas.map(entry => (
                  <EntryCard
                    key={entry.id}
                    entry={entry}
                    onToggle={toggleComplete}
                    onEdit={openEditForm}
                    onDelete={deleteEntry}
                    getChamadoTitle={getChamadoTitle}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingEntry ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Título *</label>
              <Input
                placeholder="Ex: Subir chamado X na segunda"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Descrição</label>
              <Textarea
                placeholder="Detalhes da tarefa..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Data</label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Horário</label>
                <Input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
              </div>
            </div>

            {/* Chamados linking */}
            <div>
              <label className="text-sm font-medium mb-1 block flex items-center gap-2">
                <Link2 size={14} />
                Vincular Chamados
              </label>
              {selectedChamados.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedChamados.map(id => (
                    <Badge key={id} variant="secondary" className="flex items-center gap-1">
                      {getChamadoTitle(id).substring(0, 30)}
                      <button onClick={() => setSelectedChamados(selectedChamados.filter(c => c !== id))}>
                        <X size={12} />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <Input
                placeholder="Buscar chamado para vincular..."
                value={chamadoSearch}
                onChange={(e) => setChamadoSearch(e.target.value)}
              />
              {chamadoSearch && filteredChamados.length > 0 && (
                <div className="mt-1 max-h-32 overflow-y-auto border rounded-md bg-background">
                  {filteredChamados.slice(0, 5).map(c => (
                    <button
                      key={c.id}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between"
                      onClick={() => {
                        setSelectedChamados([...selectedChamados, c.id]);
                        setChamadoSearch('');
                      }}
                    >
                      <span className="truncate">{c.titulo}</span>
                      <Badge variant="outline" className="ml-2 shrink-0 text-xs">{c.estruturante}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={resetForm}>Cancelar</Button>
              <Button className="flex-1" onClick={handleSave}>
                <Save size={16} className="mr-2" />
                {editingEntry ? 'Atualizar' : 'Criar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Entry Card component
interface EntryCardProps {
  entry: DiaryEntry;
  onToggle: (entry: DiaryEntry) => void;
  onEdit: (entry: DiaryEntry) => void;
  onDelete: (id: string) => void;
  getChamadoTitle: (id: string) => string;
}

const EntryCard: React.FC<EntryCardProps> = ({ entry, onToggle, onEdit, onDelete, getChamadoTitle }) => {
  return (
    <div className={`glass p-4 rounded-xl border border-border/50 flex items-start gap-3 ${entry.completed ? 'opacity-60' : ''}`}>
      <button onClick={() => onToggle(entry)} className="mt-0.5 shrink-0">
        {entry.completed ? (
          <CheckCircle2 size={22} className="text-primary" />
        ) : (
          <Circle size={22} className="text-muted-foreground hover:text-primary transition-colors" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`font-medium ${entry.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
          {entry.title}
        </p>
        {entry.description && (
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{entry.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {entry.dueDate && (
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              <Calendar size={10} />
              {format(new Date(entry.dueDate + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
              {entry.dueTime && ` às ${entry.dueTime}`}
            </Badge>
          )}
          {entry.chamadoIds.map(id => (
            <Badge key={id} variant="secondary" className="text-xs flex items-center gap-1">
              <Link2 size={10} />
              {getChamadoTitle(id).substring(0, 25)}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button onClick={() => onEdit(entry)} className="p-1.5 rounded-full hover:bg-accent transition-colors">
          <Edit2 size={14} />
        </button>
        <button onClick={() => onDelete(entry.id)} className="p-1.5 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

export default DiarioAnalista;
