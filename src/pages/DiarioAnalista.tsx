import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { format, isToday, isPast, isTomorrow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Calendar, CheckCircle2, Circle, Trash2, Edit2, X, Link2, Save, Clock, AlertTriangle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Chamado } from '@/components/chamados/ChamadoCard';
import { motion, AnimatePresence } from 'framer-motion';

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
      toast.success(entry.completed ? 'Tarefa reaberta!' : 'Tarefa concluída! 🎉');
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

  const getEntryStatus = (entry: DiaryEntry) => {
    if (entry.completed) return 'completed';
    if (!entry.dueDate) return 'normal';
    const due = parseISO(entry.dueDate);
    if (isToday(due)) return 'today';
    if (isTomorrow(due)) return 'tomorrow';
    if (isPast(due)) return 'overdue';
    return 'normal';
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'overdue': return 'border-l-4 border-l-destructive bg-destructive/5';
      case 'today': return 'border-l-4 border-l-warning bg-warning/5';
      case 'tomorrow': return 'border-l-4 border-l-primary bg-primary/5';
      default: return 'border-l-4 border-l-transparent';
    }
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
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            Diário do Analista
          </h1>
          <p className="text-muted-foreground mt-2">Organize suas tarefas e compromissos.</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="rounded-xl shadow-sm">
          <Plus size={18} className="mr-2" />
          Nova Tarefa
        </Button>
      </div>

      {/* Stats */}
      {entries.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="bg-card border border-border/60 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{pendentes.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Pendentes</p>
          </div>
          <div className="bg-card border border-border/60 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-success">{concluidas.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Concluídas</p>
          </div>
          <div className="bg-card border border-border/60 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-warning">{pendentes.filter(e => getEntryStatus(e) === 'today').length}</p>
            <p className="text-xs text-muted-foreground mt-1">Para Hoje</p>
          </div>
          <div className="bg-card border border-border/60 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{pendentes.filter(e => getEntryStatus(e) === 'overdue').length}</p>
            <p className="text-xs text-muted-foreground mt-1">Vencidas</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary mx-auto" />
          <p className="mt-4 text-sm text-muted-foreground">Carregando...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-20">
          <div className="p-5 rounded-3xl bg-accent/50 inline-block mb-4">
            <Calendar className="h-12 w-12 text-muted-foreground/30" />
          </div>
          <p className="text-lg font-medium text-muted-foreground">Nenhuma tarefa registrada</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Comece adicionando sua primeira tarefa.</p>
          <Button className="mt-6 rounded-xl" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={16} className="mr-2" />
            Criar primeira tarefa
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {pendentes.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <Circle size={14} className="text-primary" />
                Pendentes ({pendentes.length})
              </h2>
              <div className="space-y-2">
                <AnimatePresence>
                  {pendentes.map((entry, i) => {
                    const status = getEntryStatus(entry);
                    return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 12 }}
                        transition={{ delay: i * 0.03 }}
                        className={`bg-card border border-border/60 rounded-xl p-4 flex items-start gap-3 hover:shadow-md transition-all duration-200 ${getStatusStyles(status)}`}
                      >
                        <button onClick={() => toggleComplete(entry)} className="mt-0.5 shrink-0 group">
                          <Circle size={22} className="text-muted-foreground group-hover:text-primary transition-colors" />
                        </button>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">{entry.title}</p>
                          {entry.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{entry.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-2.5">
                            {status === 'overdue' && (
                              <Badge variant="destructive" className="text-xs gap-1">
                                <AlertTriangle size={10} />
                                Vencida
                              </Badge>
                            )}
                            {status === 'today' && (
                              <Badge className="text-xs bg-warning text-warning-foreground gap-1">
                                <Clock size={10} />
                                Hoje
                              </Badge>
                            )}
                            {status === 'tomorrow' && (
                              <Badge variant="outline" className="text-xs gap-1 border-primary/30 text-primary">
                                <Sparkles size={10} />
                                Amanhã
                              </Badge>
                            )}
                            {entry.dueDate && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar size={10} />
                                {format(parseISO(entry.dueDate + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                                {entry.dueTime && ` às ${entry.dueTime}`}
                              </span>
                            )}
                            {entry.chamadoIds.map(id => (
                              <Badge key={id} variant="outline" className="text-xs gap-1 max-w-[180px]">
                                <Link2 size={10} />
                                <span className="truncate">{getChamadoTitle(id).substring(0, 25)}</span>
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-0.5 shrink-0">
                          <button onClick={() => openEditForm(entry)} className="p-2 rounded-lg hover:bg-accent transition-colors">
                            <Edit2 size={14} className="text-muted-foreground" />
                          </button>
                          <button onClick={() => deleteEntry(entry.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors">
                            <Trash2 size={14} className="text-muted-foreground hover:text-destructive" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          )}

          {concluidas.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <CheckCircle2 size={14} className="text-success" />
                Concluídas ({concluidas.length})
              </h2>
              <div className="space-y-2">
                {concluidas.map((entry, i) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="bg-card/50 border border-border/40 rounded-xl p-4 flex items-start gap-3 opacity-60 hover:opacity-80 transition-all"
                  >
                    <button onClick={() => toggleComplete(entry)} className="mt-0.5 shrink-0">
                      <CheckCircle2 size={22} className="text-success" />
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium line-through text-muted-foreground">{entry.title}</p>
                      {entry.dueDate && (
                        <span className="text-xs text-muted-foreground/70 flex items-center gap-1 mt-1">
                          <Calendar size={10} />
                          {format(parseISO(entry.dueDate + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      )}
                    </div>

                    <button onClick={() => deleteEntry(entry.id)} className="p-2 rounded-lg hover:bg-destructive/10 transition-colors shrink-0">
                      <Trash2 size={14} className="text-muted-foreground" />
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">{editingEntry ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Título *</label>
              <Input
                placeholder="Ex: Subir chamado X na segunda"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Descrição</label>
              <Textarea
                placeholder="Detalhes da tarefa..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[80px] rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Data</label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Horário</label>
                <Input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} className="rounded-xl" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block flex items-center gap-2">
                <Link2 size={14} />
                Vincular Chamados
              </label>
              {selectedChamados.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedChamados.map(id => (
                    <Badge key={id} variant="secondary" className="flex items-center gap-1 rounded-lg">
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
                className="rounded-xl"
              />
              {chamadoSearch && filteredChamados.length > 0 && (
                <div className="mt-1.5 max-h-32 overflow-y-auto border rounded-xl bg-card shadow-sm">
                  {filteredChamados.slice(0, 5).map(c => (
                    <button
                      key={c.id}
                      className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-accent transition-colors flex items-center justify-between border-b border-border/30 last:border-0"
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
              <Button variant="outline" className="flex-1 rounded-xl" onClick={resetForm}>Cancelar</Button>
              <Button className="flex-1 rounded-xl" onClick={handleSave}>
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

export default DiarioAnalista;
