
import { Script } from '@/components/scripts/ScriptCard';
import { Chamado } from '@/components/chamados/ChamadoCard';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Função para exportar um script como PDF
export const generatePDF = (script: Script) => {
  // Criar um novo documento PDF
  const doc = new jsPDF();
  
  // Configurar fonte e tamanho
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  
  // Adicionar logotipo (opcional)
  // doc.addImage(logoBase64, 'PNG', 15, 15, 30, 30);
  
  // Título do documento
  doc.setTextColor(41, 84, 155); // Cor azul corporativa
  doc.text('SCRIPT DE ATENDIMENTO', 105, 25, { align: 'center' });
  
  // Informações básicas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Informações do Script', 14, 45);
  
  // Linha divisória
  doc.setDrawColor(41, 84, 155);
  doc.setLineWidth(0.5);
  doc.line(14, 48, 196, 48);
  
  // Detalhes do script
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  
  // Nome
  doc.setFont('helvetica', 'bold');
  doc.text('Nome:', 14, 58);
  doc.setFont('helvetica', 'normal');
  doc.text(script.nome, 40, 58);
  
  // Estruturante
  doc.setFont('helvetica', 'bold');
  doc.text('Estruturante:', 14, 68);
  doc.setFont('helvetica', 'normal');
  doc.text(script.estruturante, 60, 68);
  
  // Nível
  doc.setFont('helvetica', 'bold');
  doc.text('Nível:', 120, 68);
  doc.setFont('helvetica', 'normal');
  doc.text(script.nivel, 140, 68);
  
  // Data de atualização
  doc.setFont('helvetica', 'bold');
  doc.text('Atualizado em:', 14, 78);
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(script.updatedAt).toLocaleDateString('pt-BR'), 70, 78);
  
  // Situação de Uso
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Situação de Uso', 14, 95);
  
  // Linha divisória
  doc.line(14, 98, 196, 98);
  
  // Conteúdo da situação
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  
  // Dividir o texto em linhas para evitar que ele ultrapasse a margem
  const situacaoLines = doc.splitTextToSize(script.situacao, 170);
  doc.text(situacaoLines, 14, 108);
  
  // Calcular a posição Y após o texto da situação
  let yPos = 110 + (situacaoLines.length * 7);
  
  // Garantir espaço mínimo
  yPos = Math.max(yPos, 130);
  
  // Modelo de Resposta
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Modelo de Resposta', 14, yPos);
  
  // Linha divisória
  doc.line(14, yPos + 3, 196, yPos + 3);
  
  // Conteúdo do modelo
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  
  // Dividir o texto em linhas
  const modeloLines = doc.splitTextToSize(script.modelo, 170);
  doc.text(modeloLines, 14, yPos + 13);
  
  // Rodapé
  const totalPages = doc.internal.getNumberOfPages();
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
    105, 
    287, 
    { align: 'center' }
  );
  
  // Salvar o PDF
  doc.save(`script_${script.nome.replace(/\s+/g, '_').toLowerCase()}.pdf`);
};

// Função auxiliar para adicionar nova página se o conteúdo ultrapassar o limite
const addPageIfNeeded = (doc: any, yPos: number, limit: number = 270): number => {
  if (yPos > limit) {
    doc.addPage();
    return 20; // Retorna a posição Y inicial na nova página
  }
  return yPos;
};

