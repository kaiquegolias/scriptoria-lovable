import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Plus, 
  Bell, 
  BellOff, 
  Trash2, 
  Edit, 
  Mail,
  AlertTriangle,
  PlayCircle,
  PauseCircle
} from 'lucide-react';
import { useAlerts, Alert, CreateAlertInput } from '@/hooks/useAlerts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

const AlertsConfig: React.FC = () => {
  const { alerts, loading, createAlert, updateAlert, deleteAlert, toggleAlertStatus } = useAlerts();
  const [showDialog, setShowDialog] = useState(false);
  const [editingAlert, setEditingAlert] = useState<Alert | null>(null);
  const [formData, setFormData] = useState<CreateAlertInput>({
    name: '',
    description: '',
    condition_query: '',
    threshold: 1,
    time_window_minutes: 60,
    notify_email: true,
    notify_internal: true,
    email_recipients: [],
    custom_message: '',
  });
  const [emailInput, setEmailInput] = useState('');

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      condition_query: '',
      threshold: 1,
      time_window_minutes: 60,
      notify_email: true,
      notify_internal: true,
      email_recipients: [],
      custom_message: '',
    });
    setEmailInput('');
    setEditingAlert(null);
  };

  const handleOpenDialog = (alert?: Alert) => {
    if (alert) {
      setEditingAlert(alert);
      setFormData({
        name: alert.name,
        description: alert.description || '',
        condition_query: alert.condition_query,
        threshold: alert.threshold,
        time_window_minutes: alert.time_window_minutes,
        notify_email: alert.notify_email,
        notify_internal: alert.notify_internal,
        email_recipients: alert.email_recipients,
        custom_message: alert.custom_message || '',
      });
    } else {
      resetForm();
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    resetForm();
  };

  const handleAddEmail = () => {
    if (emailInput && !formData.email_recipients.includes(emailInput)) {
      setFormData({
        ...formData,
        email_recipients: [...formData.email_recipients, emailInput],
      });
      setEmailInput('');
    }
  };

  const handleRemoveEmail = (email: string) => {
    setFormData({
      ...formData,
      email_recipients: formData.email_recipients.filter(e => e !== email),
    });
  };

  const handleSubmit = async () => {
    if (editingAlert) {
      await updateAlert(editingAlert.id, formData);
    } else {
      await createAlert(formData);
    }
    handleCloseDialog();
  };

  const statusConfig = {
    active: { label: 'Ativo', variant: 'default' as const, icon: PlayCircle },
    paused: { label: 'Pausado', variant: 'secondary' as const, icon: PauseCircle },
    triggered: { label: 'Disparado', variant: 'destructive' as const, icon: AlertTriangle },
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alertas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Configuração de Alertas
          </CardTitle>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Alerta
          </Button>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <BellOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum alerta configurado.</p>
              <p className="text-sm">Crie alertas para ser notificado sobre eventos importantes.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Condição</TableHead>
                  <TableHead>Limite</TableHead>
                  <TableHead>Janela</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Disparos</TableHead>
                  <TableHead>Último Disparo</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => {
                  const status = statusConfig[alert.status];
                  const StatusIcon = status.icon;
                  return (
                    <TableRow key={alert.id}>
                      <TableCell className="font-medium">{alert.name}</TableCell>
                      <TableCell className="font-mono text-xs max-w-[200px] truncate" title={alert.condition_query}>
                        {alert.condition_query}
                      </TableCell>
                      <TableCell>{alert.threshold}</TableCell>
                      <TableCell>{alert.time_window_minutes}min</TableCell>
                      <TableCell>
                        <Badge variant={status.variant} className="flex items-center gap-1 w-fit">
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>{alert.trigger_count}</TableCell>
                      <TableCell>
                        {alert.last_triggered_at 
                          ? format(new Date(alert.last_triggered_at), 'dd/MM HH:mm', { locale: ptBR })
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleAlertStatus(alert.id)}
                          >
                            {alert.status === 'active' ? (
                              <PauseCircle className="h-4 w-4" />
                            ) : (
                              <PlayCircle className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(alert)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteAlert(alert.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingAlert ? 'Editar Alerta' : 'Novo Alerta'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="alert-name">Nome do Alerta</Label>
              <Input
                id="alert-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Erros críticos"
              />
            </div>

            <div>
              <Label htmlFor="alert-desc">Descrição</Label>
              <Textarea
                id="alert-desc"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o que este alerta monitora..."
                rows={2}
              />
            </div>

            <div>
              <Label htmlFor="alert-condition">Condição (Consulta)</Label>
              <Input
                id="alert-condition"
                value={formData.condition_query}
                onChange={(e) => setFormData({ ...formData, condition_query: e.target.value })}
                placeholder="Ex: severity=critical OR severity=error"
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use a mesma sintaxe do console de consultas
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="alert-threshold">Limite (ocorrências)</Label>
                <Input
                  id="alert-threshold"
                  type="number"
                  min={1}
                  value={formData.threshold}
                  onChange={(e) => setFormData({ ...formData, threshold: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label htmlFor="alert-window">Janela de tempo (min)</Label>
                <Input
                  id="alert-window"
                  type="number"
                  min={1}
                  value={formData.time_window_minutes}
                  onChange={(e) => setFormData({ ...formData, time_window_minutes: parseInt(e.target.value) || 60 })}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  <Label>Notificação Interna</Label>
                </div>
                <Switch
                  checked={formData.notify_internal}
                  onCheckedChange={(checked) => setFormData({ ...formData, notify_internal: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <Label>Notificação por Email</Label>
                </div>
                <Switch
                  checked={formData.notify_email}
                  onCheckedChange={(checked) => setFormData({ ...formData, notify_email: checked })}
                />
              </div>
            </div>

            {formData.notify_email && (
              <div>
                <Label>Destinatários de Email</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="email@exemplo.com"
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddEmail())}
                  />
                  <Button type="button" variant="outline" onClick={handleAddEmail}>
                    Adicionar
                  </Button>
                </div>
                {formData.email_recipients.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.email_recipients.map((email) => (
                      <Badge key={email} variant="secondary" className="flex items-center gap-1">
                        {email}
                        <button onClick={() => handleRemoveEmail(email)}>
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="alert-message">Mensagem Personalizada</Label>
              <Textarea
                id="alert-message"
                value={formData.custom_message}
                onChange={(e) => setFormData({ ...formData, custom_message: e.target.value })}
                placeholder="Mensagem que será enviada quando o alerta disparar..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.name || !formData.condition_query}>
              {editingAlert ? 'Salvar' : 'Criar Alerta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AlertsConfig;
