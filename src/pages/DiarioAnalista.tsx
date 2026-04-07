import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { format, isToday, isPast, isTomorrow, parseISO, startOfWeek, endOfWeek, isWithinInterval, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus, Calendar, CheckCircle2, Circle, Trash2, Edit2, X, Link2, Save,
  Clock, AlertTriangle, Sparkles, Search, Filter, BarChart3,
  Zap, Target, Brain, Flame, TrendingUp, ListChecks
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('pendentes');

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
          id: d.id, title: d.title, description: d.description,
          dueDate: d.due_date, dueTime: d.due_time,
          completed: d.completed, chamadoIds: d.chamado_ids || [],
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
          id: c.id, titulo: c.titulo, status: c.status as any,
          estruturante: c.estruturante as any, nivel: c.nivel as any,
          acompanhamento: '', links: [], dataCriacao: '', dataAtualizacao: '',
        })));
      }
    } catch (err) {
      console.error('Error fetching chamados:', err);
    }
  };

  const resetForm = () => {
    setTitle(''); setDescription(''); setDueDate(''); setDueTime('');
    setSelectedChamados([]); setChamadoSearch('');
    setEditingEntry(null); setShowForm(false);
  };

  const openEditForm = (entry: DiaryEntry) => {
    setEditingEntry(entry); setTitle(entry.title);
    setDescription(entry.description || ''); setDueDate(entry.dueDate || '');
    setDueTime(entry.dueTime || ''); setSelectedChamados(entry.chamadoIds);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!user || !title.trim()) { toast.error('O título é obrigatório.'); return; }
    try {
      const payload = {
        user_id: user.id, title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate || null, due_time: dueTime || null,
        chamado_ids: selectedChamados,
      };
      if (editingEntry) {
        const { error } = await supabase.from('diary_entries').update(payload).eq('id', editingEntry.id);
        if (error) throw error;
        toast.success('Tarefa atualizada!');
      } else {
        const { error } = await supabase.from('diary_entries').insert(payload);
        if (error) throw error;
        toast.success('Tarefa criada!');
      }
      resetForm(); fetchEntries();
    } catch (err) {
      console.error('Error saving entry:', err);
      toast.error('Erro ao salvar tarefa.');
    }
  };

  const toggleComplete = async (entry: DiaryEntry) => {
    try {
      const { error } = await supabase.from('diary_entries').update({ completed: !entry.completed }).eq('id', entry.id);
      if (error) throw error;
      setEntries(entries.map(e => e.id === entry.id ? { ...e, completed: !e.completed } : e));
      toast.success(entry.completed ? 'Tarefa reaberta!' : 'Tarefa concluída! 🎉');
    } catch { toast.error('Erro ao atualizar tarefa.'); }
  };

  const deleteEntry = async (id: string) => {
    if (!window.confirm('Deseja remover esta tarefa?')) return;
    try {
      const { error } = await supabase.from('diary_entries').delete().eq('id', id);
      if (error) throw error;
      setEntries(entries.filter(e => e.id !== id));
      toast.success('Tarefa removida.');
    } catch { toast.error('Erro ao remover tarefa.'); }
  };

  const filteredChamados = chamados.filter(c =>
    c.titulo.toLowerCase().includes(chamadoSearch.toLowerCase()) &&
    !selectedChamados.includes(c.id)
  );

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
      default: return 'border-l-4 border-l-border';
    }
  };

  const getChamadoTitle = (id: string) => chamados.find(ch => ch.id === id)?.titulo || 'Chamado não encontrado';

  // Filtered & sorted
  const searched = entries.filter(e =>
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  const pendentes = searched.filter(e => !e.completed);
  const concluidas = searched.filter(e => e.completed);
  const overdue = pendentes.filter(e => getEntryStatus(e) === 'overdue');
  const todayTasks = pendentes.filter(e => getEntryStatus(e) === 'today');
  const tomorrowTasks = pendentes.filter(e => getEntryStatus(e) === 'tomorrow');

  // This week
  const now = new Date();
  const weekStart = startOfWeek(now, { locale: ptBR });
  const weekEnd = endOfWeek(now, { locale: ptBR });
  const thisWeekTasks = pendentes.filter(e => {
    if (!e.dueDate) return false;
    return isWithinInterval(parseISO(e.dueDate), { start: weekStart, end: weekEnd });
  });

  // Stats
  const totalEntries = entries.length;
  const completedCount = entries.filter(e => e.completed).length;
  const completionRate = totalEntries > 0 ? Math.round((completedCount / totalEntries) * 100) : 0;
  const linkedCount = entries.filter(e => e.chamadoIds.length > 0).length;

  if (!user) {
    return <div className="text-center py-12"><p className="text-lg font-medium">Você precisa estar logado.</p></div>;
  }

  const renderEntry = (entry: DiaryEntry, index: number) => {
    const status = getEntryStatus(entry);
    const isCompleted = entry.completed;

    return (
      <motion.div
        key={entry.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ delay: index * 0.02, duration: 0.2 }}
        className={`group bg-card border border-border/60 rounded-2xl p-5 hover:shadow-lg transition-all duration-300 ${isCompleted ? 'opacity-50' : ''} ${getStatusStyles(status)}`}
      >
        <div className="flex items-start gap-3">
          <button onClick={() => toggleComplete(entry)} className="mt-1 shrink-0 group/check">
            {isCompleted ? (
              <CheckCircle2 size={24} className="text-success" />
            ) : (
              <Circle size={24} className="text-muted-foreground group-hover/check:text-primary transition-colors" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <p className={`font-semibold text-[15px] ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
              {entry.title}
            </p>

            {entry.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{entry.description}</p>
            )}

            <div className="flex flex-wrap items-center gap-2 mt-3">
              {status === 'overdue' && (
                <Badge variant="destructive" className="text-xs gap-1 animate-pulse">
                  <Flame size={10} /> Vencida
                </Badge>
              )}
              {status === 'today' && (
                <Badge className="text-xs bg-warning text-warning-foreground gap-1">
                  <Zap size={10} /> Hoje
                </Badge>
              )}
              {status === 'tomorrow' && (
                <Badge variant="outline" className="text-xs gap-1 border-primary/30 text-primary">
                  <Target size={10} /> Amanhã
                </Badge>
              )}
              {entry.dueDate && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar size={10} />
                  {format(parseISO(entry.dueDate + 'T12:00:00'), "EEE, dd 'de' MMM", { locale: ptBR })}
                  {entry.dueTime && <span className="ml-0.5">às {entry.dueTime}</span>}
                </span>
              )}
              {entry.chamadoIds.map(id => (
                <Badge key={id} variant="outline" className="text-[10px] gap-1 max-w-[160px] bg-accent/50">
                  <Link2 size={9} />
                  <span className="truncate">{getChamadoTitle(id).substring(0, 22)}</span>
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => openEditForm(entry)} className="p-2 rounded-xl hover:bg-accent transition-colors">
              <Edit2 size={14} className="text-muted-foreground" />
            </button>
            <button onClick={() => deleteEntry(entry.id)} className="p-2 rounded-xl hover:bg-destructive/10 transition-colors">
              <Trash2 size={14} className="text-muted-foreground hover:text-destructive" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 animate-fade-in max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/40 shadow-inner">
            <Brain className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Diário do Analista</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Central de tarefas, lembretes e acompanhamentos</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }} size="lg" className="rounded-2xl shadow-md gap-2 px-6">
          <Plus size={18} />
          Nova Tarefa
        </Button>
      </div>

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
        <div className="bg-card border border-border/60 rounded-2xl p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-primary/10"><ListChecks size={14} className="text-primary" /></div>
            <span className="text-xs text-muted-foreground font-medium">Total</span>
          </div>
          <p className="text-2xl font-bold">{totalEntries}</p>
        </div>
        <div className="bg-card border border-border/60 rounded-2xl p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-destructive/10"><Flame size={14} className="text-destructive" /></div>
            <span className="text-xs text-muted-foreground font-medium">Vencidas</span>
          </div>
          <p className="text-2xl font-bold text-destructive">{overdue.length}</p>
        </div>
        <div className="bg-card border border-border/60 rounded-2xl p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-warning/10"><Zap size={14} className="text-warning" /></div>
            <span className="text-xs text-muted-foreground font-medium">Hoje</span>
          </div>
          <p className="text-2xl font-bold text-warning">{todayTasks.length}</p>
        </div>
        <div className="bg-card border border-border/60 rounded-2xl p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-success/10"><CheckCircle2 size={14} className="text-success" /></div>
            <span className="text-xs text-muted-foreground font-medium">Concluídas</span>
          </div>
          <p className="text-2xl font-bold text-success">{completedCount}</p>
        </div>
        <div className="bg-card border border-border/60 rounded-2xl p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-accent"><TrendingUp size={14} className="text-accent-foreground" /></div>
            <span className="text-xs text-muted-foreground font-medium">Progresso</span>
          </div>
          <p className="text-2xl font-bold">{completionRate}%</p>
          <Progress value={completionRate} className="mt-2 h-1.5" />
        </div>
      </div>

      {/* Search + Tabs */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 sm:max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar tarefas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl bg-card"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-card border border-border/50 p-1 rounded-xl mb-6 w-full sm:w-auto">
          <TabsTrigger value="pendentes" className="rounded-lg text-sm gap-1.5">
            <Circle size={12} /> Pendentes ({pendentes.length})
          </TabsTrigger>
          <TabsTrigger value="hoje" className="rounded-lg text-sm gap-1.5">
            <Zap size={12} /> Hoje ({todayTasks.length})
          </TabsTrigger>
          <TabsTrigger value="semana" className="rounded-lg text-sm gap-1.5">
            <Calendar size={12} /> Semana ({thisWeekTasks.length})
          </TabsTrigger>
          <TabsTrigger value="vencidas" className="rounded-lg text-sm gap-1.5">
            <Flame size={12} /> Vencidas ({overdue.length})
          </TabsTrigger>
          <TabsTrigger value="concluidas" className="rounded-lg text-sm gap-1.5">
            <CheckCircle2 size={12} /> Concluídas ({concluidas.length})
          </TabsTrigger>
        </TabsList>

        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary mx-auto" />
            <p className="mt-4 text-sm text-muted-foreground">Carregando tarefas...</p>
          </div>
        ) : (
          <>
            <TabsContent value="pendentes" className="mt-0">
              {pendentes.length === 0 ? (
                <EmptyState
                  icon={<Target className="h-12 w-12 text-muted-foreground/30" />}
                  title="Nenhuma tarefa pendente"
                  subtitle="Todas as tarefas estão em dia!"
                />
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>{pendentes.map((e, i) => renderEntry(e, i))}</AnimatePresence>
                </div>
              )}
            </TabsContent>

            <TabsContent value="hoje" className="mt-0">
              {todayTasks.length === 0 ? (
                <EmptyState
                  icon={<Zap className="h-12 w-12 text-muted-foreground/30" />}
                  title="Nenhuma tarefa para hoje"
                  subtitle="Aproveite para planejar o dia de amanhã."
                />
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>{todayTasks.map((e, i) => renderEntry(e, i))}</AnimatePresence>
                </div>
              )}
            </TabsContent>

            <TabsContent value="semana" className="mt-0">
              {thisWeekTasks.length === 0 ? (
                <EmptyState
                  icon={<Calendar className="h-12 w-12 text-muted-foreground/30" />}
                  title="Nenhuma tarefa esta semana"
                  subtitle="Sua semana está livre!"
                />
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>{thisWeekTasks.map((e, i) => renderEntry(e, i))}</AnimatePresence>
                </div>
              )}
            </TabsContent>

            <TabsContent value="vencidas" className="mt-0">
              {overdue.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 className="h-12 w-12 text-success/40" />}
                  title="Nenhuma tarefa vencida"
                  subtitle="Parabéns! Tudo em dia. 🏆"
                />
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>{overdue.map((e, i) => renderEntry(e, i))}</AnimatePresence>
                </div>
              )}
            </TabsContent>

            <TabsContent value="concluidas" className="mt-0">
              {concluidas.length === 0 ? (
                <EmptyState
                  icon={<CheckCircle2 className="h-12 w-12 text-muted-foreground/30" />}
                  title="Nenhuma tarefa concluída"
                  subtitle="Complete suas primeiras tarefas!"
                />
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>{concluidas.map((e, i) => renderEntry(e, i))}</AnimatePresence>
                </div>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              {editingEntry ? <Edit2 size={18} className="text-primary" /> : <Plus size={18} className="text-primary" />}
              {editingEntry ? 'Editar Tarefa' : 'Nova Tarefa'}
            </DialogTitle>
            <DialogDescription>Preencha os dados da tarefa e vincule chamados se necessário.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Título *</label>
              <Input
                placeholder="Ex: Subir chamado X na segunda"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-xl"
                autoFocus
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
                <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5">
                  <Calendar size={13} /> Data
                </label>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="rounded-xl" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block flex items-center gap-1.5">
                  <Clock size={13} /> Horário
                </label>
                <Input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} className="rounded-xl" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block flex items-center gap-2">
                <Link2 size={14} /> Vincular Chamados
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
                      onClick={() => { setSelectedChamados([...selectedChamados, c.id]); setChamadoSearch(''); }}
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

const EmptyState = ({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) => (
  <div className="text-center py-20">
    <div className="p-5 rounded-3xl bg-accent/50 inline-block mb-4">{icon}</div>
    <p className="text-lg font-medium text-muted-foreground">{title}</p>
    <p className="text-sm text-muted-foreground/60 mt-1">{subtitle}</p>
  </div>
);

export default DiarioAnalista;
