/**
 * TESTE OTIMIZADO DE ARBITRAGEM TRIANGULAR
 * 
 * Versão otimizada que foca em oportunidades triangulares reais
 * e evita ciclos extremamente longos e lucros irrealistas.
 */

require('dotenv').config();
const config = require('../src/config');

// Serviço otimizado para arbitragem triangular realista
class OptimizedTriangularArbitrageService {
  constructor() {
    this.graph = new Map(); // Grafo otimizado
    this.tokenPairs = new Map(); // Pares de tokens
  }

  /**
   * Construir grafo otimizado focado em triangular
   */
  buildOptimizedGraph(tokenPrices) {
    console.log('🔧 Construindo grafo otimizado para arbitragem triangular...');
    
    this.graph.clear();
    this.tokenPairs.clear();
    
    let validPairs = 0;
    
    // Processar apenas pares válidos
    Object.entries(tokenPrices).forEach(([pairKey, dexPrices]) => {
      const [token0, token1] = pairKey.split('/');
      
      if (!token0 || !token1 || token0 === token1) return;
      
      // Inicializar tokens no grafo
      if (!this.graph.has(token0)) this.graph.set(token0, new Map());
      if (!this.graph.has(token1)) this.graph.set(token1, new Map());
      
      // Processar preços de cada DEX
      Object.entries(dexPrices).forEach(([dex, price]) => {
        if (price > 0 && isFinite(price) && price < 1000000) { // Filtro de sanidade
          // Aresta direta: token0 -> token1
          this.graph.get(token0).set(`${token1}_${dex}`, {
            to: token1,
            rate: price,
            dex,
            liquidity: 100000 // Simulado
          });
          
          // Aresta inversa: token1 -> token0
          this.graph.get(token1).set(`${token0}_${dex}`, {
            to: token0,
            rate: 1/price,
            dex,
            liquidity: 100000 // Simulado
          });
        }
      });
      
      validPairs++;
    });
    
    const tokenCount = this.graph.size;
    let edgeCount = 0;
    this.graph.forEach(edges => edgeCount += edges.size);
    
    console.log(`✅ Grafo otimizado: ${tokenCount} tokens, ${edgeCount} arestas, ${validPairs} pares válidos`);
    return { vertices: tokenCount, edges: edgeCount, pairs: validPairs };
  }

  /**
   * Detectar oportunidades triangulares (3 tokens apenas)
   */
  detectTriangularOpportunities(tokenPrices) {
    console.log('🔍 Detectando oportunidades triangulares (3 tokens)...');
    
    const graphStats = this.buildOptimizedGraph(tokenPrices);
    const opportunities = [];
    const rejectedOpportunities = [];
    
    const tokens = Array.from(this.graph.keys());
    console.log(`🔍 Analisando ${tokens.length} tokens: ${tokens.join(', ')}`);
    
    // Buscar ciclos triangulares: A -> B -> C -> A
    for (let i = 0; i < tokens.length; i++) {
      for (let j = 0; j < tokens.length; j++) {
        for (let k = 0; k < tokens.length; k++) {
          if (i !== j && j !== k && k !== i) {
            const tokenA = tokens[i];
            const tokenB = tokens[j];
            const tokenC = tokens[k];
            
            const triangle = this.findTrianglePath(tokenA, tokenB, tokenC);
            if (triangle) {
              const analysis = this.analyzeTriangle(triangle);
              
              if (analysis.isValid) {
                opportunities.push({
                  type: 'triangular',
                  tokens: [tokenA, tokenB, tokenC],
                  path: triangle,
                  ...analysis,
                  timestamp: Date.now()
                });
              } else {
                rejectedOpportunities.push({
                  tokens: [tokenA, tokenB, tokenC],
                  ...analysis,
                  rejectionReason: analysis.rejectionReason
                });
              }
            }
          }
        }
      }
    }
    
    // Remover duplicatas e ordenar
    const uniqueOpportunities = this.removeDuplicateTriangles(opportunities);
    const sortedOpportunities = uniqueOpportunities.sort((a, b) => b.profitPercent - a.profitPercent);
    
    console.log(`✅ Análise triangular: ${sortedOpportunities.length} oportunidades válidas, ${rejectedOpportunities.length} rejeitadas`);
    
    return {
      opportunities: sortedOpportunities,
      rejectedOpportunities,
      stats: {
        total: sortedOpportunities.length + rejectedOpportunities.length,
        valid: sortedOpportunities.length,
        rejected: rejectedOpportunities.length,
        graphStats
      }
    };
  }

  /**
   * Encontrar caminho triangular entre 3 tokens
   */
  findTrianglePath(tokenA, tokenB, tokenC) {
    const pathAB = this.findBestPath(tokenA, tokenB);
    const pathBC = this.findBestPath(tokenB, tokenC);
    const pathCA = this.findBestPath(tokenC, tokenA);
    
    if (pathAB && pathBC && pathCA) {
      return [pathAB, pathBC, pathCA];
    }
    return null;
  }

  /**
   * Encontrar melhor caminho entre dois tokens
   */
  findBestPath(fromToken, toToken) {
    if (!this.graph.has(fromToken)) return null;
    
    const fromEdges = this.graph.get(fromToken);
    let bestPath = null;
    let bestRate = 0;
    
    // Buscar conexão direta
    fromEdges.forEach((edge, key) => {
      if (edge.to === toToken && edge.rate > bestRate) {
        bestRate = edge.rate;
        bestPath = {
          from: fromToken,
          to: toToken,
          rate: edge.rate,
          dex: edge.dex,
          liquidity: edge.liquidity
        };
      }
    });
    
    return bestPath;
  }

  /**
   * Analisar triângulo de arbitragem
   */
  analyzeTriangle(triangle) {
    if (!triangle || triangle.length !== 3) {
      return { isValid: false, rejectionReason: 'Triângulo inválido' };
    }
    
    // Calcular lucro total
    let totalRate = 1;
    let minLiquidity = Infinity;
    const dexs = new Set();
    
    triangle.forEach(edge => {
      totalRate *= edge.rate;
      minLiquidity = Math.min(minLiquidity, edge.liquidity);
      dexs.add(edge.dex);
    });
    
    const profit = totalRate - 1;
    const profitPercent = profit * 100;
    
    // Validações de sanidade
    const minProfitPercent = config.arbitrageConfig?.minProfitPercent || 0.1;
    const maxProfitPercent = 10; // Máximo realista para triangular
    const minLiquidityUSD = config.arbitrageConfig?.minLiquidityUSD || 30000;
    
    let rejectionReason = null;
    let isValid = true;
    
    if (profit <= 0) {
      rejectionReason = 'Lucro negativo ou zero';
      isValid = false;
    } else if (profitPercent < minProfitPercent) {
      rejectionReason = `Lucro abaixo do mínimo (${profitPercent.toFixed(4)}% < ${minProfitPercent}%)`;
      isValid = false;
    } else if (profitPercent > maxProfitPercent) {
      rejectionReason = `Lucro irrealista (${profitPercent.toFixed(4)}% > ${maxProfitPercent}%)`;
      isValid = false;
    } else if (minLiquidity < minLiquidityUSD) {
      rejectionReason = `Liquidez insuficiente ($${minLiquidity.toLocaleString()} < $${minLiquidityUSD.toLocaleString()})`;
      isValid = false;
    } else if (dexs.size < 2) {
      rejectionReason = 'Não usa múltiplas DEXs';
      isValid = false;
    }
    
    return {
      profit,
      profitPercent,
      totalRate,
      minLiquidity,
      dexCount: dexs.size,
      dexs: Array.from(dexs),
      isValid,
      rejectionReason,
      quality: this.assessQuality(profitPercent, minLiquidity)
    };
  }

  /**
   * Avaliar qualidade da oportunidade
   */
  assessQuality(profitPercent, minLiquidity) {
    if (profitPercent > 2.0 && minLiquidity > 200000) return 'high';
    if (profitPercent > 1.0 && minLiquidity > 100000) return 'medium';
    return 'low';
  }

  /**
   * Remover triângulos duplicados
   */
  removeDuplicateTriangles(opportunities) {
    const seen = new Set();
    return opportunities.filter(opp => {
      const signature = opp.tokens.sort().join('-') + opp.dexs.sort().join('-');
      if (seen.has(signature)) return false;
      seen.add(signature);
      return true;
    });
  }

  /**
   * Formatar oportunidade para exibição
   */
  formatOpportunity(opp) {
    const pathStr = opp.path.map(edge => 
      `${edge.from}→${edge.to}(${edge.dex})`
    ).join(' → ');
    
    return {
      type: 'Arbitragem Triangular',
      description: `${opp.tokens.join(' → ')}`,
      path: pathStr,
      profitPercent: `${opp.profitPercent.toFixed(4)}%`,
      minLiquidity: `$${opp.minLiquidity.toLocaleString()}`,
      dexCount: opp.dexCount,
      quality: opp.quality.toUpperCase(),
      tokens: opp.tokens,
      dexs: opp.dexs
    };
  }
}

// Simulador de dados realistas
class RealisticDataSimulator {
  constructor() {
    this.priceMatrix = {
      USDC: 1,
      USDT: 1.001,
      DAI: 0.999,
      WETH: 2400,
      WMATIC: 0.85,
      MATIC: 0.85,
      WBTC: 45000,
      AAVE: 95,
      LINK: 14,
      CRV: 0.35,
      UNI: 7.2
    };
  }

  generateRealisticData() {
    console.log('📊 Gerando dados realistas para teste...');
    
    const tokenPrices = {};
    const tokens = Object.keys(config.tokens);
    
    // Gerar apenas pares com spread realista
    for (let i = 0; i < tokens.length; i++) {
      for (let j = i + 1; j < tokens.length; j++) {
        const token1 = tokens[i];
        const token2 = tokens[j];
        
        const basePrice = this.getBasePrice(token1, token2);
        
        // Criar spread pequeno mas detectável entre DEXs
        const uniswapSpread = (Math.random() - 0.5) * 0.004; // ±0.2%
        const quickswapSpread = (Math.random() - 0.5) * 0.006; // ±0.3%
        
        const pairKey = `${token1}/${token2}`;
        tokenPrices[pairKey] = {
          uniswap: basePrice * (1 + uniswapSpread),
          quickswap: basePrice * (1 + quickswapSpread)
        };
      }
    }
    
    console.log(`✅ Dados gerados: ${Object.keys(tokenPrices).length} pares com spreads realistas`);
    return tokenPrices;
  }

  getBasePrice(token1, token2) {
    const price1 = this.priceMatrix[token1] || 1;
    const price2 = this.priceMatrix[token2] || 1;
    return price1 / price2;
  }
}

// Teste principal otimizado
class OptimizedArbitrageTest {
  constructor() {
    this.arbitrageService = new OptimizedTriangularArbitrageService();
    this.dataSimulator = new RealisticDataSimulator();
  }

  async runOptimizedTest() {
    console.log('🚀 TESTE OTIMIZADO DE ARBITRAGEM TRIANGULAR');
    console.log('='.repeat(50));
    
    const startTime = Date.now();
    
    try {
      // 1. Gerar dados realistas
      const tokenPrices = this.dataSimulator.generateRealisticData();
      
      // 2. Detectar oportunidades triangulares
      const result = this.arbitrageService.detectTriangularOpportunities(tokenPrices);
      
      // 3. Exibir resultados
      this.displayResults(result, startTime);
      
    } catch (error) {
      console.error('❌ Erro durante o teste:', error.message);
    }
  }

  displayResults(result, startTime) {
    const duration = Date.now() - startTime;
    
    console.log('\n📊 RESULTADOS DO TESTE OTIMIZADO');
    console.log('='.repeat(50));
    console.log(`⏱️ Tempo de execução: ${duration}ms`);
    console.log(`📈 Estatísticas do grafo: ${result.stats.graphStats.vertices} tokens, ${result.stats.graphStats.edges} arestas`);
    console.log(`🎯 Oportunidades válidas: ${result.opportunities.length}`);
    console.log(`❌ Oportunidades rejeitadas: ${result.rejected}`);
    
    // Mostrar oportunidades válidas
    if (result.opportunities.length > 0) {
      console.log('\n🎯 OPORTUNIDADES TRIANGULARES VÁLIDAS:');
      console.log('-'.repeat(50));
      
      result.opportunities.slice(0, 10).forEach((opp, index) => {
        const formatted = this.arbitrageService.formatOpportunity(opp);
        console.log(`\n${index + 1}. ${formatted.description}`);
        console.log(`   💰 Lucro: ${formatted.profitPercent}`);
        console.log(`   💧 Liquidez mín: ${formatted.minLiquidity}`);
        console.log(`   🏪 DEXs: ${formatted.dexs.join(', ')} (${formatted.dexCount})`);
        console.log(`   ⭐ Qualidade: ${formatted.quality}`);
        console.log(`   🛤️  Caminho: ${formatted.path}`);
      });
      
      if (result.opportunities.length > 10) {
        console.log(`\n   ... e mais ${result.opportunities.length - 10} oportunidades`);
      }
    } else {
      console.log('\n⚠️ NENHUMA OPORTUNIDADE TRIANGULAR VÁLIDA ENCONTRADA');
      console.log('   Isso é normal com spreads pequenos e filtros rigorosos.');
    }
    
    // Mostrar estatísticas de rejeição
    if (result.rejectedOpportunities.length > 0) {
      console.log('\n❌ MOTIVOS DE REJEIÇÃO (top 5):');
      console.log('-'.repeat(50));
      
      const rejectionStats = {};
      result.rejectedOpportunities.forEach(rejected => {
        const reason = rejected.rejectionReason || 'Motivo não especificado';
        rejectionStats[reason] = (rejectionStats[reason] || 0) + 1;
      });
      
      Object.entries(rejectionStats)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .forEach(([reason, count]) => {
          console.log(`   • ${reason}: ${count} casos`);
        });
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Teste otimizado concluído!');
    console.log('='.repeat(50));
  }
}

// Executar teste se chamado diretamente
if (require.main === module) {
  const test = new OptimizedArbitrageTest();
  test.runOptimizedTest().catch(console.error);
}

module.exports = OptimizedArbitrageTest;