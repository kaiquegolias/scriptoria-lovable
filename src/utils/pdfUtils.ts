import { Script } from '@/components/scripts/ScriptCard';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Professional color palette
const COLORS = {
  primary: [30, 64, 135] as [number, number, number],     // Deep blue
  primaryLight: [59, 130, 246] as [number, number, number], // Blue
  dark: [15, 23, 42] as [number, number, number],          // Slate 900
  medium: [71, 85, 105] as [number, number, number],       // Slate 500
  light: [148, 163, 184] as [number, number, number],      // Slate 400
  bg: [248, 250, 252] as [number, number, number],          // Slate 50
  white: [255, 255, 255] as [number, number, number],
  accent: [16, 185, 129] as [number, number, number],      // Green
};

function drawHeader(doc: jsPDF, script: Script) {
  // Header bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, 210, 38, 'F');

  // Accent line
  doc.setFillColor(...COLORS.primaryLight);
  doc.rect(0, 38, 210, 2, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...COLORS.white);
  doc.text('SCRIPT DE ATENDIMENTO', 14, 18);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(200, 210, 230);
  doc.text(script.nome, 14, 28);

  // Badges on the right
  const badgeY = 15;
  // Estruturante badge
  doc.setFillColor(255, 255, 255, 0.2);
  doc.roundedRect(155, badgeY - 5, 22, 10, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.white);
  doc.text(script.estruturante, 166, badgeY + 2, { align: 'center' });

  // Nivel badge
  doc.roundedRect(180, badgeY - 5, 16, 10, 2, 2, 'F');
  doc.text(script.nivel, 188, badgeY + 2, { align: 'center' });
}

function drawInfoBox(doc: jsPDF, script: Script, y: number): number {
  doc.setFillColor(...COLORS.bg);
  doc.roundedRect(14, y, 182, 22, 3, 3, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, 182, 22, 3, 3, 'S');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.medium);

  const col1 = 20;
  const col2 = 80;
  const col3 = 140;

  doc.text('ESTRUTURANTE', col1, y + 7);
  doc.text('NÍVEL', col2, y + 7);
  doc.text('ATUALIZADO EM', col3, y + 7);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.dark);
  doc.text(script.estruturante, col1, y + 16);
  doc.text(script.nivel, col2, y + 16);
  doc.text(new Date(script.updatedAt).toLocaleDateString('pt-BR'), col3, y + 16);

  return y + 30;
}

function drawSectionTitle(doc: jsPDF, title: string, y: number, icon?: string): number {
  if (y > 260) {
    doc.addPage();
    y = 20;
  }

  // Left accent bar
  doc.setFillColor(...COLORS.primaryLight);
  doc.rect(14, y, 3, 8, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...COLORS.dark);
  doc.text(title.toUpperCase(), 22, y + 6);

  // Light underline
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(14, y + 11, 196, y + 11);

  return y + 16;
}

function drawTextBlock(doc: jsPDF, text: string, y: number): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.dark);

  const lines = doc.splitTextToSize(text, 176);
  const lineHeight = 5;

  for (const line of lines) {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, 16, y);
    y += lineHeight;
  }

  return y + 4;
}

function drawFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Footer line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(14, 282, 196, 282);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.light);
    doc.text(
      `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
      14,
      288
    );
    doc.text(`Página ${i} de ${pageCount}`, 196, 288, { align: 'right' });

    // ScriptFlow branding
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primaryLight);
    doc.text('ScriptFlow', 105, 288, { align: 'center' });
  }
}

export const generatePDF = (script: Script) => {
  const doc = new jsPDF();

  // Header
  drawHeader(doc, script);

  let y = 48;

  // Info box
  y = drawInfoBox(doc, script, y);

  // Situação de Uso
  y = drawSectionTitle(doc, 'Situação de Uso', y);
  y = drawTextBlock(doc, script.situacao, y);

  // Modelo de Resposta
  y = drawSectionTitle(doc, 'Modelo de Resposta', y + 4);

  // Background box for modelo
  const modelLines = doc.splitTextToSize(script.modelo, 170);
  const modelHeight = modelLines.length * 5 + 10;

  if (y + modelHeight > 270) {
    doc.addPage();
    y = 20;
  }

  doc.setFillColor(...COLORS.bg);
  const boxHeight = Math.min(modelHeight, 250);
  doc.roundedRect(14, y - 2, 182, boxHeight, 3, 3, 'F');

  // Left green bar for modelo
  doc.setFillColor(...COLORS.accent);
  doc.rect(14, y - 2, 3, boxHeight, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.dark);

  for (const line of modelLines) {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, 22, y + 4);
    y += 5;
  }

  // Footer
  drawFooter(doc);

  doc.save(`script_${script.nome.replace(/\s+/g, '_').toLowerCase()}.pdf`);
};
