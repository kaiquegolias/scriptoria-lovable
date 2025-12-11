import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileUp, Link, Search } from 'lucide-react';
import DocumentSearchTab from './DocumentSearchTab';
import URLCrawlerTab from './URLCrawlerTab';

const AISearchPanel: React.FC = () => {
  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Search className="h-5 w-5" />
          📌 Buscador por IA
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Faça upload de documentos (PDF/EPUB) ou insira URLs para análise inteligente com IA
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="document" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="document" className="flex items-center gap-2">
              <FileUp className="h-4 w-4" />
              Upload de Documento
            </TabsTrigger>
            <TabsTrigger value="urls" className="flex items-center gap-2">
              <Link className="h-4 w-4" />
              Correr Páginas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="document">
            <DocumentSearchTab />
          </TabsContent>

          <TabsContent value="urls">
            <URLCrawlerTab />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AISearchPanel;
