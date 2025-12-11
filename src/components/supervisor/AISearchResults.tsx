import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Copy, MessageSquare, BookOpen, CheckCircle, AlertTriangle, HelpCircle } from 'lucide-react';

interface SearchResult {
  sugestaoResposta1: string;
  sugestaoResposta2: string;
  fundamentacaoTecnica: string;
  trechosRelevantes: string[];
  confianca: string;
  observacoes?: string;
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

  const getConfidenceBadge = (confianca: string) => {
    switch (confianca?.toLowerCase()) {
      case 'alta':
        return (
          <Badge className="bg-green-500/20 text-green-700 border-green-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Confiança Alta
          </Badge>
        );
      case 'media':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Confiança Média
          </Badge>
        );
      default:
        return (
          <Badge className="bg-orange-500/20 text-orange-700 border-orange-500/30">
            <HelpCircle className="h-3 w-3 mr-1" />
            Confiança Baixa
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4 mt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Resultado da Análise</h3>
        {getConfidenceBadge(result.confianca)}
      </div>

      {sourceInfo && (
        <p className="text-sm text-muted-foreground">
          📄 Fonte: {sourceInfo}
        </p>
      )}

      {/* Suggestion 1 */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            🟦 Sugestão de Resposta 1 (formal)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {result.sugestaoResposta1}
          </p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => copyToClipboard(result.sugestaoResposta1, 'Resposta 1')}
          >
            <Copy className="h-3 w-3 mr-1" />
            Copiar
          </Button>
        </CardContent>
      </Card>

      {/* Suggestion 2 */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            🟦 Sugestão de Resposta 2 (formal)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {result.sugestaoResposta2}
          </p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => copyToClipboard(result.sugestaoResposta2, 'Resposta 2')}
          >
            <Copy className="h-3 w-3 mr-1" />
            Copiar
          </Button>
        </CardContent>
      </Card>

      {/* Technical Foundation */}
      <Card className="border-yellow-500/30 bg-yellow-500/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-yellow-600" />
            🟨 Fundamentação Técnica da IA
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {result.fundamentacaoTecnica}
          </p>
          
          {result.trechosRelevantes && result.trechosRelevantes.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Trechos Relevantes do Documento:
              </p>
              <div className="space-y-2">
                {result.trechosRelevantes.map((trecho, index) => (
                  <div 
                    key={index} 
                    className="text-xs p-2 bg-muted/50 rounded border-l-2 border-yellow-500 italic"
                  >
                    "{trecho}"
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.observacoes && (
            <div className="mt-4 p-3 bg-muted/30 rounded-lg">
              <p className="text-xs font-medium text-muted-foreground mb-1">Observações:</p>
              <p className="text-sm">{result.observacoes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AISearchResults;
