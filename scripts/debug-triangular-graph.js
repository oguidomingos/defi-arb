const GraphService = require('../src/services/graphService');
const { TriangularArbitrageService } = require('../src/services/triangularArbitrageService');
const config = require('../src/config');

/**
 * Script de debug para investigar problema na construção do grafo triangular
 * OBJETIVO: Identificar por que temos apenas "2 tokens, 2 arestas" com 11 tokens e 14 pares
 */

async function debugTriangularGraph() {
  console.log('🔍 DEBUG: Investigando construção do grafo triangular\n');

  try {
    // 1. Obter dados do GraphService
    console.log('1. Obtendo dados do GraphService...');
    const graphService = new GraphService();
    const marketData = await graphService.getUpdatedData();
    
    console.log('📊 Dados obtidos:');
    console.log(`   Pools processados: ${marketData.processedPools.length}`);
    console.log(`   Timestamp: ${new Date(marketData.timestamp).toLocaleTimeString()}`);
    
    // 2. Analisar estrutura dos tokenPrices
    console.log('\n2. Analisando estrutura tokenPrices...');
    console.log(`   Total de pares: ${Object.keys(marketData.tokenPrices).length}`);
    
    // Debug detalhado dos tokenPrices
    console.log('\n🔍 Estrutura completa dos tokenPrices:');
    console.log('='.repeat(50));
    
    let totalDexPairs = 0;
    Object.entries(marketData.tokenPrices).forEach(([pairKey, dexPrices]) => {
      const dexCount = Object.keys(dexPrices).length;
      totalDexPairs += dexCount;
      
      console.log(`📈 ${pairKey}:`);
      Object.entries(dexPrices).forEach(([dex, price]) => {
        console.log(`   ${dex}: ${price.toFixed(8)}`);
      });
      console.log(`   Total DEXs: ${dexCount}\n`);
    });
    
    console.log(`📊 Resumo tokenPrices:`);
    console.log(`   Pares únicos: ${Object.keys(marketData.tokenPrices).length}`);
    console.log(`   Total entradas DEX: ${totalDexPairs}`);
    
    // 3. Debug da construção do grafo
    console.log('\n3. Debugando construção do grafo...');
    console.log('='.repeat(50));
    
    const triangularService = new TriangularArbitrageService();
    
    // Interceptar o método buildGraph para debug
    const originalBuildGraph = triangularService.buildGraph.bind(triangularService);
    triangularService.buildGraph = function(tokenPrices) {
      console.log('🔧 INÍCIO buildGraph()...');
      console.log(`   Input tokenPrices keys: ${Object.keys(tokenPrices).length}`);
      
      // Log detalhado do processo de construção
      this.graph.clear();
      let edgesAdded = 0;
      let edgesSkipped = 0;
      let invalidRates = 0;
      
      console.log('\n🔍 Processando cada par:');
      Object.entries(tokenPrices).forEach(([pairKey, dexPrices]) => {
        const [token0, token1] = pairKey.split('/');
        console.log(`\n   Par: ${pairKey} (${token0} -> ${token1})`);
        console.log(`   DEXs disponíveis: ${Object.keys(dexPrices).length}`);
        
        Object.entries(dexPrices).forEach(([dex, price]) => {
          console.log(`     ${dex}: ${price}`);
          
          if (price > 0 && isFinite(price)) {
            // Adicionar aresta direta
            this.graph.addEdge(token0, token1, price, dex, {
              liquidity: 100000,
              volumeUSD: 50000
            });
            
            // Adicionar aresta inversa
            this.graph.addEdge(token1, token0, 1/price, dex, {
              liquidity: 100000,
              volumeUSD: 50000
            });
            
            edgesAdded += 2;
            console.log(`     ✅ Adicionadas 2 arestas: ${token0}->${token1} (${price}) e ${token1}->${token0} (${1/price})`);
          } else {
            invalidRates++;
            edgesSkipped += 2;
            console.log(`     ❌ Taxa inválida ignorada: ${price}`);
          }
        });
      });
      
      const stats = this.graph.getStats();
      console.log(`\n🔧 Resultado buildGraph():`);
      console.log(`   Vértices (tokens únicos): ${stats.vertices}`);
      console.log(`   Arestas totais: ${stats.edges}`);
      console.log(`   Arestas adicionadas: ${edgesAdded}`);
      console.log(`   Arestas ignoradas: ${edgesSkipped}`);
      console.log(`   Taxas inválidas: ${invalidRates}`);
      
      // Listar todos os tokens únicos encontrados
      console.log('\n🎯 Tokens únicos no grafo:');
      Array.from(this.graph.vertices).forEach((token, index) => {
        console.log(`   ${index + 1}. ${token}`);
      });
      
      // Listar algumas arestas para debug
      console.log('\n🔗 Primeiras 10 arestas:');
      this.graph.edges.slice(0, 10).forEach((edge, index) => {
        console.log(`   ${index + 1}. ${edge.from} -> ${edge.to}: ${edge.rate.toFixed(8)} (${edge.dex})`);
      });
      
      return stats;
    };
    
    // 4. Executar detectOpportunities com debug
    console.log('\n4. Executando detectOpportunities...');
    const result = triangularService.detectOpportunities(marketData.tokenPrices);
    
    console.log('\n📊 Resultado detectOpportunities:');
    console.log(`   Oportunidades válidas: ${result.opportunities.length}`);
    console.log(`   Oportunidades rejeitadas: ${result.rejectedOpportunities.length}`);
    console.log(`   Stats do grafo: ${JSON.stringify(result.stats.graphStats)}`);
    
    // 5. Análise das possíveis causas
    console.log('\n5. Análise das possíveis causas...');
    console.log('='.repeat(50));
    
    const issues = [];
    
    // Verificar se há pares suficientes
    if (Object.keys(marketData.tokenPrices).length < 3) {
      issues.push('❌ PROBLEMA: Muito poucos pares de tokens para arbitragem triangular');
    }
    
    // Verificar se há tokens comuns entre pares
    const allTokens = new Set();
    Object.keys(marketData.tokenPrices).forEach(pair => {
      const [token0, token1] = pair.split('/');
      allTokens.add(token0);
      allTokens.add(token1);
    });
    
    if (allTokens.size < 3) {
      issues.push('❌ PROBLEMA: Não há tokens suficientes únicos para formar triângulos');
    }
    
    // Verificar conectividade
    const tokenConnections = {};
    Object.keys(marketData.tokenPrices).forEach(pair => {
      const [token0, token1] = pair.split('/');
      if (!tokenConnections[token0]) tokenConnections[token0] = new Set();
      if (!tokenConnections[token1]) tokenConnections[token1] = new Set();
      tokenConnections[token0].add(token1);
      tokenConnections[token1].add(token0);
    });
    
    const tokenConnectionCounts = Object.entries(tokenConnections).map(([token, connections]) => ({
      token,
      connections: connections.size
    })).sort((a, b) => b.connections - a.connections);
    
    console.log('\n🔗 Conectividade dos tokens:');
    tokenConnectionCounts.forEach(({token, connections}) => {
      console.log(`   ${token}: ${connections} conexões`);
    });
    
    // Verificar se há pelo menos um token que conecta outros (hub)
    const hubs = tokenConnectionCounts.filter(({connections}) => connections >= 2);
    if (hubs.length === 0) {
      issues.push('❌ PROBLEMA: Nenhum token atua como "hub" para conectar outros tokens');
    }
    
    // Verificar formação de triângulos possíveis
    console.log('\n🔺 Verificando triângulos possíveis...');
    let possibleTriangles = 0;
    
    // Algoritmo simples para detectar triângulos
    const tokens = Array.from(allTokens);
    for (let i = 0; i < tokens.length; i++) {
      for (let j = i + 1; j < tokens.length; j++) {
        for (let k = j + 1; k < tokens.length; k++) {
          const token1 = tokens[i];
          const token2 = tokens[j];
          const token3 = tokens[k];
          
          // Verificar se existe: token1->token2, token2->token3, token3->token1
          const hasEdge12 = marketData.tokenPrices[`${token1}/${token2}`] || marketData.tokenPrices[`${token2}/${token1}`];
          const hasEdge23 = marketData.tokenPrices[`${token2}/${token3}`] || marketData.tokenPrices[`${token3}/${token2}`];
          const hasEdge31 = marketData.tokenPrices[`${token3}/${token1}`] || marketData.tokenPrices[`${token1}/${token3}`];
          
          if (hasEdge12 && hasEdge23 && hasEdge31) {
            possibleTriangles++;
            console.log(`   ✅ Triângulo possível: ${token1} -> ${token2} -> ${token3} -> ${token1}`);
          }
        }
      }
    }
    
    console.log(`\n🔺 Total de triângulos possíveis: ${possibleTriangles}`);
    
    if (possibleTriangles === 0) {
      issues.push('❌ PROBLEMA CRÍTICO: Não há triângulos possíveis na estrutura atual dos dados');
    }
    
    // 6. Resumo dos problemas encontrados
    console.log('\n6. RESUMO DOS PROBLEMAS ENCONTRADOS:');
    console.log('='.repeat(50));
    
    if (issues.length === 0) {
      console.log('✅ Nenhum problema estrutural identificado');
      console.log('   O problema pode estar no algoritmo Bellman-Ford ou nos filtros');
    } else {
      issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
    }
    
    // 7. Recomendações
    console.log('\n7. RECOMENDAÇÕES:');
    console.log('='.repeat(50));
    
    if (possibleTriangles === 0) {
      console.log('🔧 AÇÃO CRÍTICA: Verificar mapeamento de tokens e pares');
      console.log('   - Confirmar que os tokens têm símbolos corretos');
      console.log('   - Verificar se os pares estão sendo processados corretamente');
      console.log('   - Investigar filtros que podem estar eliminando pares essenciais');
    }
    
    if (allTokens.size < result.stats.graphStats.vertices) {
      console.log('🔧 PROBLEMA: Inconsistência no número de tokens');
    }
    
    console.log('\n✅ Debug concluído!');

  } catch (error) {
    console.error('❌ Erro durante debug:', error);
    console.error('Stack:', error.stack);
  }
}

// Executar debug
if (require.main === module) {
  debugTriangularGraph();
}

module.exports = { debugTriangularGraph };