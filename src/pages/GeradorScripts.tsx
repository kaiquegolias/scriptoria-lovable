import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { FileText, Download, Save, FileType } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';

interface ScriptModelo {
  id: string;
  titulo: string;
  situacao: string;
  quandoOcorre: string;
  solucaoSugerida: string;
  modeloResposta: string;
  atribuicoes: string;
  perfilUsuario: string;
  palavrasChave: string;
  referencias: string;
  createdAt: string;
}

const GeradorScripts = () => {
  const navigate = useNavigate();
  const [scriptModelo, setScriptModelo] = useState<ScriptModelo>({
    id: uuidv4(),
    titulo: '[Recusa] Status 9',
    situacao: '',
    quandoOcorre: '',
    solucaoSugerida: '',
    modeloResposta: '',
    atribuicoes: '',
    perfilUsuario: '',
    palavrasChave: '',
    referencias: '',
    createdAt: new Date().toISOString()
  });
  
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
      const doc = new jsPDF();
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      
      doc.setTextColor(0, 0, 0);
      doc.text(scriptModelo.titulo, 105, 25, { align: 'center' });
      
      let yPos = 40;
      const addSection = (title: string, content: string) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(title, 14, yPos);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        
        const contentLines = doc.splitTextToSize(content, 180);
        doc.text(contentLines, 14, yPos + 7);
        
        return yPos + 10 + (contentLines.length * 5);
      };
      
      const sections = [
        { title: 'Situação:', content: scriptModelo.situacao },
        { title: 'Quando Ocorre:', content: scriptModelo.quandoOcorre },
        { title: 'Solução Sugerida:', content: scriptModelo.solucaoSugerida },
        { title: 'Modelo de Resposta:', content: scriptModelo.modeloResposta },
        { title: 'Atribuições:', content: scriptModelo.atribuicoes },
        { title: 'Perfil do Usuário:', content: scriptModelo.perfilUsuario },
        { title: 'Palavras-chave:', content: scriptModelo.palavrasChave },
        { title: 'Referências:', content: scriptModelo.referencias }
      ];
      
      sections.forEach(section => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        yPos = addSection(section.title, section.content || 'Não especificado');
        yPos += 10;
      });
      
      doc.save(`script_${scriptModelo.titulo.replace(/\s+/g, '_').toLowerCase()}.pdf`);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar o PDF. Tente novamente.');
    }
  };

  const generateWord = () => {
    try {
      const doc = new Document();
      
      doc.addSection({
        properties: {},
        children: [
          new Paragraph({
            text: scriptModelo.titulo,
            heading: HeadingLevel.HEADING_1
          }),
          
          new Paragraph({
            text: "Situação:",
            heading: HeadingLevel.HEADING_2
          }),
          new Paragraph({
            text: scriptModelo.situacao || "Não especificado"
          }),
          
          new Paragraph({
            text: "Quando Ocorre:",
            heading: HeadingLevel.HEADING_2
          }),
          new Paragraph({
            text: scriptModelo.quandoOcorre || "Não especificado"
          }),
          
          new Paragraph({
            text: "Solução Sugerida:",
            heading: HeadingLevel.HEADING_2
          }),
          new Paragraph({
            text: scriptModelo.solucaoSugerida || "Não especificado"
          }),
          
          new Paragraph({
            text: "Modelo de Resposta:",
            heading: HeadingLevel.HEADING_2
          }),
          new Paragraph({
            text: scriptModelo.modeloResposta || "Não especificado"
          }),
          
          new Paragraph({
            text: "Atribuições:",
            heading: HeadingLevel.HEADING_2
          }),
          new Paragraph({
            text: scriptModelo.atribuicoes || "Não especificado"
          }),
          
          new Paragraph({
            text: "Perfil do Usuário:",
            heading: HeadingLevel.HEADING_2
          }),
          new Paragraph({
            text: scriptModelo.perfilUsuario || "Não especificado"
          }),
          
          new Paragraph({
            text: "Palavras-chave:",
            heading: HeadingLevel.HEADING_2
          }),
          new Paragraph({
            text: scriptModelo.palavrasChave || "Não especificado"
          }),
          
          new Paragraph({
            text: "Referências:",
            heading: HeadingLevel.HEADING_2
          }),
          new Paragraph({
            text: scriptModelo.referencias || "Não especificado"
          }),
        ],
      });

      Packer.toBlob(doc).then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.setAttribute('style', 'display: none');
        a.href = url;
        a.download = `script_${scriptModelo.titulo.replace(/\s+/g, '_').toLowerCase()}.docx`;
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        
        toast.success('Word gerado com sucesso!');
      });
    } catch (error) {
      console.error('Erro ao gerar Word:', error);
      toast.error('Erro ao gerar o Word. Tente novamente.');
    }
  };

  const saveScript = () => {
    try {
      const existingScripts = JSON.parse(localStorage.getItem('scriptModelos') || '[]');
      
      const scriptToSave = {
        ...scriptModelo,
        id: scriptModelo.id || uuidv4(),
        createdAt: scriptModelo.createdAt || new Date().toISOString()
      };
      
      localStorage.setItem('scriptModelos', JSON.stringify([...existingScripts, scriptToSave]));
      
      toast.success('Script salvo com sucesso!');
      navigate('/scripts-modelos');
    } catch (error) {
      console.error('Erro ao salvar o script:', error);
      toast.error('Erro ao salvar o script. Tente novamente.');
    }
  };

  const togglePreview = () => {
    setShowPreview(!showPreview);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="container mx-auto px-4 py-8"
    >
      <h1 className="text-2xl font-bold mb-2">Gerador de Scripts Modelos</h1>
      <p className="text-foreground/70 mb-8">
        Crie modelos de documentação para scripts de atendimento.
      </p>
      
      <div className="flex flex-col lg:flex-row gap-6">
        <div className={`${showPreview ? 'lg:w-1/2' : 'w-full'} space-y-6`}>
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
                />
              </div>
              
              <div>
                <label htmlFor="situacao" className="block text-sm font-medium mb-1">Situação</label>
                <Textarea 
                  id="situacao"
                  name="situacao"
                  value={scriptModelo.situacao}
                  onChange={handleChange}
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
                  rows={3}
                />
              </div>
              
              <div>
                <label htmlFor="modeloResposta" className="block text-sm font-medium mb-1">Modelo de Resposta</label>
                <Textarea 
                  id="modeloResposta"
                  name="modeloResposta"
                  value={scriptModelo.modeloResposta}
                  onChange={handleChange}
                  rows={4}
                />
              </div>
              
              <div>
                <label htmlFor="atribuicoes" className="block text-sm font-medium mb-1">Atribuições e Responsabilidades</label>
                <Textarea 
                  id="atribuicoes"
                  name="atribuicoes"
                  value={scriptModelo.atribuicoes}
                  onChange={handleChange}
                  rows={3}
                />
              </div>
              
              <div>
                <label htmlFor="perfilUsuario" className="block text-sm font-medium mb-1">Perfil do Usuário</label>
                <Textarea 
                  id="perfilUsuario"
                  name="perfilUsuario"
                  value={scriptModelo.perfilUsuario}
                  onChange={handleChange}
                  rows={2}
                />
              </div>
              
              <div>
                <label htmlFor="palavrasChave" className="block text-sm font-medium mb-1">Palavras-chave (separe por vírgulas)</label>
                <Input
                  id="palavrasChave"
                  name="palavrasChave"
                  value={scriptModelo.palavrasChave}
                  onChange={handleChange}
                  placeholder="Ex: recusa, status 9, pendente"
                />
              </div>
              
              <div>
                <label htmlFor="referencias" className="block text-sm font-medium mb-1">Referências</label>
                <Textarea 
                  id="referencias"
                  name="referencias"
                  value={scriptModelo.referencias}
                  onChange={handleChange}
                  rows={2}
                />
              </div>
              
              <div className="flex flex-wrap gap-3 pt-2">
                <Button variant="default" onClick={togglePreview} className="flex items-center">
                  <FileText size={18} className="mr-2" />
                  {showPreview ? 'Editar' : 'Visualizar'}
                </Button>
                
                <Button variant="default" onClick={generatePDF} className="flex items-center">
                  <Download size={18} className="mr-2" />
                  Exportar PDF
                </Button>
                
                <Button variant="secondary" onClick={generateWord} className="flex items-center">
                  <FileType size={18} className="mr-2" />
                  Exportar Word
                </Button>
                
                <Button variant="outline" onClick={saveScript} className="flex items-center ml-auto">
                  <Save size={18} className="mr-2" />
                  Salvar Modelo
                </Button>
              </div>
            </div>
          </Card>
        </div>
        
        {showPreview && (
          <div className="lg:w-1/2">
            <Card className="p-6 shadow-md bg-card">
              <h2 className="text-xl font-bold text-center mb-4">{scriptModelo.titulo}</h2>
              
              <div className="space-y-4">
                {[
                  { label: 'Situação', value: scriptModelo.situacao },
                  { label: 'Quando Ocorre', value: scriptModelo.quandoOcorre },
                  { label: 'Solução Sugerida', value: scriptModelo.solucaoSugerida },
                  { label: 'Modelo de Resposta', value: scriptModelo.modeloResposta },
                  { label: 'Atribuições', value: scriptModelo.atribuicoes },
                  { label: 'Perfil do Usuário', value: scriptModelo.perfilUsuario },
                  { label: 'Palavras-chave', value: scriptModelo.palavrasChave },
                  { label: 'Referências', value: scriptModelo.referencias }
                ].map((section, index) => (
                  <div key={index}>
                    <h3 className="text-primary font-medium text-lg">{section.label}</h3>
                    <p className="whitespace-pre-line">{section.value || 'Não especificado'}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default GeradorScripts;
