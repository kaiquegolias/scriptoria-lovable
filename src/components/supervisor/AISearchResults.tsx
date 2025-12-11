import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Copy, MessageSquare, BookOpen, Search, FileText, AlertCircle } from 'lucide-react';

interface AnaliseInterna {
  fontesEncontradas: string[];
  trechosRelevantes: string[];
}

interface SearchResult {
  analiseInterna?: AnaliseInterna;
  explicacaoTecnica: string;
  respostasFormais: string[];
  confiancaEstimada: number;
  observacoes?: string;
  // Legacy fields for backwards compatibility
  sugestaoResposta1?: string;
  sugestaoResposta2?: string;
  fundamentacaoTecnica?: string;
  trechosRelevantes?: string[];
  confianca?: string;
}

interface AISearchResultsProps {
  result: SearchResult;
  sourceInfo: string;
}

const AISearchResults: React.FC<AISearchResultsProps> = ({ result, sourceInfo }) => {
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiada!`);
  };

  // Handle both new and legacy format
  const respostasFormais = result.respostasFormais || [
    result.sugestaoResposta1,
    result.sugestaoResposta2
  ].filter(Boolean) as string[];

  const explicacao = result.explicacaoTecnica || result.fundamentacaoTecnica || '';
  const confianca = result.confiancaEstimada ?? (
    result.confianca === 'alta' ? 85 :
    result.confianca === 'media' ? 55 : 25
  );

  const trechos = result.analiseInterna?.trechosRelevantes || result.trechosRelevantes || [];
  const fontes = result.analiseInterna?.fontesEncontradas || [];

  const getConfidenceColor = (value: number) => {
    if (value >= 70) return 'bg-green-500/20 text-green-700 border-green-500/30';
    if (value >= 40) return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30';
    return 'bg-red-500/20 text-red-700 border-red-500/30';
  };

  const getConfidenceLabel = (value: number) => {
    if (value >= 70) return 'Alta';
    if (value >= 40) return 'Média';
    return 'Baixa';
  };

  return (
    <div className="space-y-4 mt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Resultado da Análise</h3>
        <Badge className={getConfidenceColor(confianca)}>
          📊 Confiança estimada: {confianca}% ({getConfidenceLabel(confianca)})
        </Badge>
      </div>

      {sourceInfo && (
        <p className="text-sm text-muted-foreground">
          📄 Fonte: {sourceInfo}
        </p>
      )}

      {/* Análise Interna */}
      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4 text-blue-600" />
            🔍 ANÁLISE INTERNA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {fontes.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Fontes encontradas:
              </p>
              <div className="flex flex-wrap gap-2">
                {fontes.map((fonte, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    <FileText className="h-3 w-3 mr-1" />
                    {fonte}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {fontes.length === 0 && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-md">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm">
                Não encontrei conteúdo relevante nas suas fontes internas para responder com precisão.
              </p>
            </div>
          )}

          {trechos.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Trechos relevantes:
              </p>
              <div className="space-y-2">
                {trechos.map((trecho, index) => (
                  <div 
                    key={index} 
                    className="text-xs p-2 bg-muted/50 rounded border-l-2 border-blue-500 italic"
                  >
                    "{trecho}"
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Explicação Técnica */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-amber-600" />
            🛠️ EXPLICAÇÃO TÉCNICA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {explicacao || 'Não foi possível gerar explicação técnica.'}
          </p>
        </CardContent>
      </Card>

      {/* 3 Respostas Formais */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            📨 3 RESPOSTAS FORMAIS SUGERIDAS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {respostasFormais.length > 0 ? (
            respostasFormais.map((resposta, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-primary">
                    🟦 Modelo {index + 1}
                  </span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => copyToClipboard(resposta, `Resposta ${index + 1}`)}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copiar
                  </Button>
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed p-3 bg-muted/30 rounded-lg border">
                  {resposta}
                </p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Nenhuma resposta formal gerada. Verifique se existem Modelos de Resposta cadastrados.
            </p>
          )}
        </CardContent>
      </Card>

      {result.observacoes && (
        <div className="p-3 bg-muted/30 rounded-lg">
          <p className="text-xs font-medium text-muted-foreground mb-1">Observações:</p>
          <p className="text-sm">{result.observacoes}</p>
        </div>
      )}
    </div>
  );
};

export default AISearchResults;
