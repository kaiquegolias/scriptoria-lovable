
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { FileText, Download, Save } from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

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
    titulo: '[Recusa] Status 9',
    situacao: '',
    quandoOcorre: '',
    solucaoSugerida: '',
    modeloResposta: '',
    atribuicoes: '',
    perfilUsuario: '',
    palavrasChave: '',
    referencias: ''
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
        yPos = addSection(section.title, section.content || 'Não especificado');
        
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
      });
      
      doc.save(`script_${scriptModelo.titulo.replace(/\s+/g, '_').toLowerCase()}.pdf`);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar o PDF. Tente novamente.');
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
                />
              </div>
              
              {/* Repeat similar input fields for other sections */}
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
              
              {/* Add similar Textarea components for other sections */}
              <div className="flex flex-wrap gap-3">
                <Button variant="default" onClick={togglePreview} className="flex items-center">
                  <FileText size={18} className="mr-2" />
                  {showPreview ? 'Editar' : 'Visualizar'}
                </Button>
                
                <Button variant="default" onClick={generatePDF} className="flex items-center">
                  <Download size={18} className="mr-2" />
                  Exportar PDF
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
                {/* Preview sections */}
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
