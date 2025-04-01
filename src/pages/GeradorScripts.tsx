
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { FileText, Download, Save } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { toast } from 'sonner';

interface ScriptModelo {
  titulo: string;
  situacao: string;
  quandoOcorre: string;
  solucaoSugerida: string;
  modeloResposta: string;
  atribuicoes: string;
  perfilUsuario: string;
  palavrasChave: string;
  referencias: string;
}

const GeradorScripts = () => {
  const [scriptModelo, setScriptModelo] = useState<ScriptModelo>({
    titulo: '',
    situacao: '',
    quandoOcorre: '',
    solucaoSugerida: '',
    modeloResposta: '',
    atribuicoes: '',
    perfilUsuario: '',
    palavrasChave: '',
    referencias: ''
  });
  
  // Preview state
  const [showPreview, setShowPreview] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setScriptModelo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const generatePDF = () => {
    try {
      // Criar um novo documento PDF
      const doc = new jsPDF();
      
      // Configurar fonte e tamanho
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      
      // Título do documento
      doc.setTextColor(0, 51, 102); // Cor azul corporativa
      doc.text(scriptModelo.titulo, 105, 20, { align: 'center' });
      
      // Linha divisória
      doc.setDrawColor(0, 51, 102);
      doc.setLineWidth(0.5);
      doc.line(14, 25, 196, 25);

      // Função para adicionar seções ao PDF
      const addSection = (title: string, content: string, yPosition: number): number => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(0, 51, 102);
        doc.text(title, 14, yPosition);
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        
        // Dividir o texto em linhas para evitar que ele ultrapasse a margem
        const contentLines = doc.splitTextToSize(content, 180);
        doc.text(contentLines, 14, yPosition + 7);
        
        // Retornar a nova posição Y após o texto
        return yPosition + 10 + (contentLines.length * 5);
      };
      
      // Adicionar seções
      let yPos = 35;
      yPos = addSection('Situação:', scriptModelo.situacao, yPos);
      yPos = addSection('Quando Ocorre:', scriptModelo.quandoOcorre, yPos);
      yPos = addSection('Solução Sugerida:', scriptModelo.solucaoSugerida, yPos);
      
      // Verificar se precisa adicionar uma nova página
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      yPos = addSection('Modelo de Resposta para Chamados:', scriptModelo.modeloResposta, yPos);
      
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      yPos = addSection('Atribuições e Responsabilidades:', scriptModelo.atribuicoes, yPos);
      yPos = addSection('Perfil do Usuário:', scriptModelo.perfilUsuario, yPos);
      yPos = addSection('Palavras-chave:', scriptModelo.palavrasChave, yPos);
      yPos = addSection('Referências:', scriptModelo.referencias, yPos);
      
      // Rodapé
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `Gerado por ScriptFlow em ${new Date().toLocaleDateString('pt-BR')}`,
        105, 
        285, 
        { align: 'center' }
      );
      
      // Salvar o PDF
      const filename = scriptModelo.titulo 
        ? `script_${scriptModelo.titulo.replace(/\s+/g, '_').toLowerCase()}.pdf` 
        : 'script_modelo.pdf';
        
      doc.save(filename);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar o PDF. Tente novamente.');
    }
  };

  // Função para exportar como documento Word (DOCX)
  const generateWord = async () => {
    try {
      // Importar a biblioteca docx dinamicamente
      const docx = await import('docx');
      
      // Criar um novo documento
      const doc = new docx.Document({
        sections: [{
          properties: {},
          children: [
            new docx.Paragraph({
              text: scriptModelo.titulo,
              heading: docx.HeadingLevel.HEADING_1,
              alignment: docx.AlignmentType.CENTER,
              spacing: { after: 200 },
              border: {
                bottom: { color: "4472C4", size: 6, space: 1, style: docx.BorderStyle.SINGLE },
              },
            }),
            new docx.Paragraph({
              text: "Situação:",
              heading: docx.HeadingLevel.HEADING_2,
              spacing: { before: 200 },
            }),
            new docx.Paragraph({
              text: scriptModelo.situacao,
              spacing: { after: 200 },
            }),
            new docx.Paragraph({
              text: "Quando Ocorre:",
              heading: docx.HeadingLevel.HEADING_2,
            }),
            new docx.Paragraph({
              text: scriptModelo.quandoOcorre,
              spacing: { after: 200 },
            }),
            new docx.Paragraph({
              text: "Solução Sugerida:",
              heading: docx.HeadingLevel.HEADING_2,
            }),
            new docx.Paragraph({
              text: scriptModelo.solucaoSugerida,
              spacing: { after: 200 },
            }),
            new docx.Paragraph({
              text: "Modelo de Resposta para Chamados:",
              heading: docx.HeadingLevel.HEADING_2,
            }),
            new docx.Paragraph({
              text: scriptModelo.modeloResposta,
              spacing: { after: 200 },
            }),
            new docx.Paragraph({
              text: "Atribuições e Responsabilidades:",
              heading: docx.HeadingLevel.HEADING_2,
            }),
            new docx.Paragraph({
              text: scriptModelo.atribuicoes,
              spacing: { after: 200 },
            }),
            new docx.Paragraph({
              text: "Perfil do Usuário:",
              heading: docx.HeadingLevel.HEADING_2,
            }),
            new docx.Paragraph({
              text: scriptModelo.perfilUsuario,
              spacing: { after: 200 },
            }),
            new docx.Paragraph({
              text: "Palavras-chave:",
              heading: docx.HeadingLevel.HEADING_2,
            }),
            new docx.Paragraph({
              text: scriptModelo.palavrasChave,
              spacing: { after: 200 },
            }),
            new docx.Paragraph({
              text: "Referências:",
              heading: docx.HeadingLevel.HEADING_2,
            }),
            new docx.Paragraph({
              text: scriptModelo.referencias,
              spacing: { after: 200 },
            }),
          ]
        }]
      });
      
      // Gerar o documento
      const buffer = await docx.Packer.toBlob(doc);
      
      // Criar um link de download
      const url = URL.createObjectURL(buffer);
      const link = document.createElement('a');
      const filename = scriptModelo.titulo 
        ? `script_${scriptModelo.titulo.replace(/\s+/g, '_').toLowerCase()}.docx` 
        : 'script_modelo.docx';
        
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      
      toast.success('Documento Word gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar DOCX:', error);
      toast.error('Erro ao gerar o documento Word. Tente novamente.');
    }
  };

  const togglePreview = () => {
    setShowPreview(!showPreview);
  };

  const saveToLocalStorage = () => {
    try {
      // Obter scripts salvos anteriormente
      const savedScripts = JSON.parse(localStorage.getItem('scriptModelos') || '[]');
      
      // Adicionar o novo script com ID e data
      const newScript = {
        ...scriptModelo,
        id: `script_${Date.now()}`,
        createdAt: new Date().toISOString()
      };
      
      // Salvar a lista atualizada
      localStorage.setItem('scriptModelos', JSON.stringify([...savedScripts, newScript]));
      
      toast.success('Script modelo salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar o script modelo.');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Gerador de Scripts Modelos</h1>
      <p className="text-foreground/70 mb-8">
        Crie modelos de documentação para scripts de atendimento em formatos Word e PDF.
      </p>
      
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Formulário */}
        <div className="lg:w-1/2 space-y-6">
          <Card className="p-6 shadow-md">
            <h2 className="text-xl font-semibold mb-4">Informações do Script</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="titulo" className="block text-sm font-medium mb-1">Título</label>
                <Input 
                  id="titulo"
                  name="titulo"
                  value={scriptModelo.titulo}
                  onChange={handleChange}
                  placeholder="Ex: [Erro] falha na obtenção dos repositórios de estruturas organizacionais"
                />
              </div>
              
              <div>
                <label htmlFor="situacao" className="block text-sm font-medium mb-1">Situação</label>
                <Textarea 
                  id="situacao"
                  name="situacao"
                  value={scriptModelo.situacao}
                  onChange={handleChange}
                  placeholder="Descreva a situação que o script aborda..."
                  rows={3}
                />
              </div>
              
              <div>
                <label htmlFor="quandoOcorre" className="block text-sm font-medium mb-1">Quando Ocorre</label>
                <Textarea 
                  id="quandoOcorre"
                  name="quandoOcorre"
                  value={scriptModelo.quandoOcorre}
                  onChange={handleChange}
                  placeholder="Explique quando essa situação tipicamente ocorre..."
                  rows={3}
                />
              </div>
              
              <div>
                <label htmlFor="solucaoSugerida" className="block text-sm font-medium mb-1">Solução Sugerida</label>
                <Textarea 
                  id="solucaoSugerida"
                  name="solucaoSugerida"
                  value={scriptModelo.solucaoSugerida}
                  onChange={handleChange}
                  placeholder="Descreva as etapas para solucionar o problema..."
                  rows={4}
                />
              </div>
              
              <div>
                <label htmlFor="modeloResposta" className="block text-sm font-medium mb-1">Modelo de Resposta para Chamados</label>
                <Textarea 
                  id="modeloResposta"
                  name="modeloResposta"
                  value={scriptModelo.modeloResposta}
                  onChange={handleChange}
                  placeholder="Forneça um modelo padrão de resposta..."
                  rows={5}
                />
              </div>
              
              <div>
                <label htmlFor="atribuicoes" className="block text-sm font-medium mb-1">Atribuições e Responsabilidades</label>
                <Textarea 
                  id="atribuicoes"
                  name="atribuicoes"
                  value={scriptModelo.atribuicoes}
                  onChange={handleChange}
                  placeholder="Liste as atribuições e responsabilidades relacionadas..."
                  rows={3}
                />
              </div>
              
              <div>
                <label htmlFor="perfilUsuario" className="block text-sm font-medium mb-1">Perfil do Usuário</label>
                <Input 
                  id="perfilUsuario"
                  name="perfilUsuario"
                  value={scriptModelo.perfilUsuario}
                  onChange={handleChange}
                  placeholder="Ex: Gestor"
                />
              </div>
              
              <div>
                <label htmlFor="palavrasChave" className="block text-sm font-medium mb-1">Palavras-chave</label>
                <Input 
                  id="palavrasChave"
                  name="palavrasChave"
                  value={scriptModelo.palavrasChave}
                  onChange={handleChange}
                  placeholder="Ex: Estruturas organizacionais, erro ao atualizar"
                />
              </div>
              
              <div>
                <label htmlFor="referencias" className="block text-sm font-medium mb-1">Referências</label>
                <Input 
                  id="referencias"
                  name="referencias"
                  value={scriptModelo.referencias}
                  onChange={handleChange}
                  placeholder="Ex: 20507286, Notas de Versão, Notícia de divulgação"
                />
              </div>
            </div>
          </Card>
          
          <div className="flex flex-wrap gap-3">
            <Button variant="default" onClick={togglePreview} className="flex items-center">
              <FileText size={18} className="mr-2" />
              {showPreview ? 'Editar' : 'Visualizar'}
            </Button>
            
            <Button variant="outline" onClick={saveToLocalStorage} className="flex items-center">
              <Save size={18} className="mr-2" />
              Salvar Modelo
            </Button>
            
            <Button variant="secondary" onClick={generateWord} className="flex items-center">
              <Download size={18} className="mr-2" />
              Exportar Word
            </Button>
            
            <Button variant="default" onClick={generatePDF} className="flex items-center">
              <Download size={18} className="mr-2" />
              Exportar PDF
            </Button>
          </div>
        </div>
        
        {/* Visualização */}
        {showPreview && (
          <div className="lg:w-1/2">
            <Card className="p-6 shadow-md bg-card">
              <div className="prose dark:prose-invert max-w-none">
                <h2 className="text-xl font-bold text-center border-b border-primary/30 pb-2 mb-4">{scriptModelo.titulo || "[Título do Script]"}</h2>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="text-primary font-medium text-lg">Situação</h3>
                    <p className="whitespace-pre-line">{scriptModelo.situacao || "Não especificado"}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-primary font-medium text-lg">Quando Ocorre</h3>
                    <p className="whitespace-pre-line">{scriptModelo.quandoOcorre || "Não especificado"}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-primary font-medium text-lg">Solução Sugerida</h3>
                    <p className="whitespace-pre-line">{scriptModelo.solucaoSugerida || "Não especificado"}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-primary font-medium text-lg">Modelo de Resposta para Chamados</h3>
                    <p className="whitespace-pre-line">{scriptModelo.modeloResposta || "Não especificado"}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-primary font-medium text-lg">Atribuições e Responsabilidades</h3>
                    <p className="whitespace-pre-line">{scriptModelo.atribuicoes || "Não especificado"}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-primary font-medium text-lg">Perfil do Usuário</h3>
                    <p>{scriptModelo.perfilUsuario || "Não especificado"}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-primary font-medium text-lg">Palavras-chave</h3>
                    <p>{scriptModelo.palavrasChave || "Não especificado"}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-primary font-medium text-lg">Referências</h3>
                    <p>{scriptModelo.referencias || "Não especificado"}</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeradorScripts;
