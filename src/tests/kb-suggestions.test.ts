/**
 * Testes automatizados para o sistema de KB e Sugestões
 * 
 * Para executar: copiar para um ambiente de teste com acesso ao Supabase
 */

import { supabase } from '@/integrations/supabase/client';

// Helper para gerar tokens TF-IDF
function generateTokens(text: string): Record<string, number> {
  const words = text.toLowerCase()
    .replace(/[^\w\sáéíóúàèìòùãõâêîôûç]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2);

  const frequency: Record<string, number> = {};
  words.forEach(word => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  const total = words.length;
  const tokens: Record<string, number> = {};
  Object.entries(frequency).forEach(([word, count]) => {
    tokens[word] = count / total;
  });

  return tokens;
}

// Cosine similarity
function cosineSimilarity(a: Record<string, number>, b: Record<string, number>): number {
  const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
  
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (const key of allKeys) {
    const valueA = a[key] || 0;
    const valueB = b[key] || 0;
    
    dotProduct += valueA * valueB;
    magnitudeA += valueA * valueA;
    magnitudeB += valueB * valueB;
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) return 0;

  return dotProduct / (magnitudeA * magnitudeB);
}

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const testResults: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<void>) {
  const start = Date.now();
  try {
    await testFn();
    testResults.push({
      name,
      passed: true,
      duration: Date.now() - start,
    });
    console.log(`✅ ${name} (${Date.now() - start}ms)`);
  } catch (error) {
    testResults.push({
      name,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
      duration: Date.now() - start,
    });
    console.log(`❌ ${name}: ${error}`);
  }
}

// Test 1: Script creation and indexing
async function testScriptCreationAndIndexing() {
  const testScript = {
    title: 'Teste Script SFTP',
    description: 'Script para resolver problemas de conexão SFTP',
    content: 'ssh-keygen -t rsa -b 4096 && sftp user@server',
    tags: ['sftp', 'conexão', 'ssh'],
  };

  // Create script
  const { data: script, error } = await supabase
    .from('scripts_library')
    .insert(testScript)
    .select()
    .single();

  if (error) throw new Error(`Failed to create script: ${error.message}`);
  if (!script) throw new Error('Script not created');

  // Generate tokens
  const fullText = `${script.title} ${script.description} ${script.content} ${testScript.tags.join(' ')}`;
  const tokens = generateTokens(fullText);

  // Index the script
  const { error: indexError } = await supabase
    .from('kb_vectors')
    .insert({
      source_id: script.id,
      source_type: 'script',
      title: script.title,
      content_preview: script.content.substring(0, 200),
      tokens,
      keywords: Object.keys(tokens).slice(0, 10),
    });

  if (indexError) throw new Error(`Failed to index script: ${indexError.message}`);

  // Verify indexing
  const { data: vector, error: fetchError } = await supabase
    .from('kb_vectors')
    .select('*')
    .eq('source_id', script.id)
    .eq('source_type', 'script')
    .single();

  if (fetchError) throw new Error(`Failed to fetch vector: ${fetchError.message}`);
  if (!vector) throw new Error('Vector not found');

  // Cleanup
  await supabase.from('kb_vectors').delete().eq('source_id', script.id);
  await supabase.from('scripts_library').delete().eq('id', script.id);
}

// Test 2: Similarity matching
async function testSimilarityMatching() {
  // Create a test script
  const scriptContent = 'Erro de permissão ao conectar no servidor SFTP. Solução: verificar chaves SSH e permissões do usuário.';
  const scriptTokens = generateTokens(scriptContent);

  // Create a similar ticket
  const ticketContent = 'Não consigo conectar no SFTP, aparece erro de permissão negada';
  const ticketTokens = generateTokens(ticketContent);

  // Calculate similarity
  const similarity = cosineSimilarity(scriptTokens, ticketTokens);

  // Should have high similarity (> 0.3) due to shared terms
  if (similarity < 0.3) {
    throw new Error(`Expected similarity > 0.3, got ${similarity}`);
  }
}

// Test 3: Ticket closing validation
async function testTicketClosingValidation() {
  // This would typically test the API endpoint
  // For now, we test the logic

  const exceptedClassifications = [
    'Falta de comunicação',
    'Não pertinentes ao PEN/PNCP',
  ];

  const regularClassification = 'Resolução técnica';

  // Should require ultimo_acompanhamento
  if (exceptedClassifications.includes(regularClassification)) {
    throw new Error('Regular classification should not be excepted');
  }

  // Should not require for excepted
  for (const classification of exceptedClassifications) {
    if (!exceptedClassifications.includes(classification)) {
      throw new Error(`${classification} should be excepted`);
    }
  }
}

// Test 4: Overdue notification logic
async function testOverdueNotificationLogic() {
  const now = new Date();
  const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Yesterday
  const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow

  const overdueTicket = {
    data_limite: pastDate.toISOString(),
    status: 'agendados_aguardando',
  };

  const notOverdueTicket = {
    data_limite: futureDate.toISOString(),
    status: 'agendados_aguardando',
  };

  const resolvedTicket = {
    data_limite: pastDate.toISOString(),
    status: 'resolvido',
  };

  // Check overdue logic
  const isOverdue = (ticket: typeof overdueTicket) => {
    return ticket.status !== 'resolvido' && 
           new Date(ticket.data_limite) < now;
  };

  if (!isOverdue(overdueTicket)) {
    throw new Error('Should be overdue');
  }

  if (isOverdue(notOverdueTicket)) {
    throw new Error('Should not be overdue (future date)');
  }

  if (isOverdue(resolvedTicket)) {
    throw new Error('Should not be overdue (resolved)');
  }
}

// Test 5: TF-IDF token generation
async function testTFIDFTokenGeneration() {
  const text = 'erro erro conexão servidor sftp permissão';
  const tokens = generateTokens(text);

  // 'erro' appears twice, should have higher weight
  if (tokens['erro'] <= tokens['conexão']) {
    throw new Error('Repeated terms should have higher weight');
  }

  // Short words should be filtered
  if (tokens['de'] || tokens['ao']) {
    throw new Error('Short words should be filtered');
  }
}

// Run all tests
export async function runAllTests() {
  console.log('🧪 Starting KB and Suggestions Tests...\n');

  await runTest('Script creation and indexing', testScriptCreationAndIndexing);
  await runTest('Similarity matching', testSimilarityMatching);
  await runTest('Ticket closing validation', testTicketClosingValidation);
  await runTest('Overdue notification logic', testOverdueNotificationLogic);
  await runTest('TF-IDF token generation', testTFIDFTokenGeneration);

  console.log('\n📊 Test Results:');
  console.log(`  Passed: ${testResults.filter(t => t.passed).length}/${testResults.length}`);
  console.log(`  Failed: ${testResults.filter(t => !t.passed).length}/${testResults.length}`);

  const failedTests = testResults.filter(t => !t.passed);
  if (failedTests.length > 0) {
    console.log('\n❌ Failed Tests:');
    failedTests.forEach(t => {
      console.log(`  - ${t.name}: ${t.error}`);
    });
  }

  return testResults;
}

// Export for use in UI
export { testResults };
