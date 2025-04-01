
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FileText, Search, Plus, Calendar, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

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

const ScriptsModelos = () => {
  const [scripts, setScripts] = useState<ScriptModelo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    // Carregar scripts do localStorage
    try {
      const savedScripts = JSON.parse(localStorage.getItem('scriptModelos') || '[]');
      setScripts(savedScripts);
    } catch (error) {
      console.error('Erro ao carregar scripts:', error);
      toast.error('Erro ao carregar os scripts salvos.');
    }
  }, []);
  
  // Filtrar scripts com base no termo de pesquisa
  const filteredScripts = scripts.filter(script => 
    script.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    script.palavrasChave.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">Scripts Modelos</h1>
          <p className="text-foreground/70">
            Biblioteca de modelos de documentação para scripts de atendimento.
          </p>
        </div>
        <Link to="/gerador-scripts">
          <Button className="mt-4 md:mt-0 flex items-center">
            <Plus size={16} className="mr-2" />
            Criar Novo Modelo
          </Button>
        </Link>
      </div>
      
      <div className="mb-6 relative">
        <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Pesquisar por título ou palavras-chave..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {filteredScripts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredScripts.map((script) => (
            <Card key={script.id} className="flex flex-col h-full">
              <CardHeader>
                <CardTitle className="flex items-start gap-2">
                  <FileText size={20} className="text-primary mt-1 flex-shrink-0" />
                  <span className="line-clamp-2">{script.titulo}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {script.situacao}
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {script.palavrasChave.split(',').map((keyword, index) => (
                    <span 
                      key={index} 
                      className="bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-md"
                    >
                      {keyword.trim()}
                    </span>
                  ))}
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Calendar size={14} className="mr-1" />
                  <span>
                    {new Date(script.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </CardContent>
              <CardFooter className="border-t pt-4">
                <Link 
                  to={`/gerador-scripts/${script.id}`} 
                  className="text-sm font-medium text-primary flex items-center hover:underline"
                >
                  Ver detalhes
                  <ArrowRight size={14} className="ml-1" />
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <FileText size={48} className="mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-xl font-medium mb-2">Nenhum script encontrado</h3>
          <p className="text-muted-foreground">
            {searchTerm 
              ? "Nenhum script corresponde aos termos pesquisados" 
              : "Ainda não há scripts modelos salvos. Crie um novo para começar!"}
          </p>
          <Link to="/gerador-scripts">
            <Button className="mt-4">
              <Plus size={16} className="mr-2" />
              Criar Primeiro Modelo
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default ScriptsModelos;
