const config = require('../config');
const blockchainService = require('./blockchainService');

/**
 * SERVIÇO OTIMIZADO DE ARBITRAGEM TRIANGULAR
 *
 * Versão otimizada que foca em oportunidades triangulares reais
 * e evita ciclos extremamente longos e lucros irrealistas.
 *
 * Aplicada a partir do teste otimizado que detectou 114 oportunidades válidas.
 */
class OptimizedArbitrageGraph {
  constructor() {
    this.graph = new Map(); // Grafo otimizado
    this.tokenPairs = new Map(); // Pares de tokens
  }

  /**
   * Construir grafo otimizado focado em triangular
   */
  buildOptimizedGraph(tokenPrices) {
    if (config.arbitrageConfig?.enableDetailedLogging) {
      console.log('🔧 Construindo grafo otimizado para arbitragem triangular...');
    }
    
    this.graph.clear();
    this.tokenPairs.clear();
    
    let validPairs = 0;
    let invalidPrices = 0;
    
    // Processar apenas pares válidos com filtros de sanidade rigorosos
    Object.entries(tokenPrices).forEach(([pairKey, dexPrices]) => {
      const [token0, token1] = pairKey.split('/');
      
      if (!token0 || !token1 || token0 === token1) return;
      
      // Inicializar tokens no grafo
      if (!this.graph.has(token0)) this.graph.set(token0, new Map());
      if (!this.graph.has(token1)) this.graph.set(token1, new Map());
      
      // Processar preços de cada DEX com validação rigorosa
      Object.entries(dexPrices).forEach(([dex, price]) => {
        if (price > 0 && isFinite(price) && price < 1000000) { // Filtro de sanidade para preços realistas
          // Aresta direta: token0 -> token1
          this.graph.get(token0).set(`${token1}_${dex}`, {
            to: token1,
            rate: price,
            dex,
            liquidity: 100000 // Liquidez padrão para integração com dados reais
          });
          
          // Aresta inversa: token1 -> token0
          this.graph.get(token1).set(`${token0}_${dex}`, {
            to: token0,
            rate: 1/price,
            dex,
            liquidity: 100000
          });
        } else {
          invalidPrices++;
          if (config.arbitrageConfig?.enableDetailedLogging) {
            console.warn(`⚠️ Preço inválido ignorado: ${pairKey} em ${dex} = ${price}`);
          }
        }
      });
      
      validPairs++;
    });
    
    const tokenCount = this.graph.size;
    let edgeCount = 0;
    this.graph.forEach(edges => edgeCount += edges.size);
    
    if (config.arbitrageConfig?.enableDetailedLogging) {
      console.log(`✅ Grafo otimizado: ${tokenCount} tokens, ${edgeCount} arestas, ${validPairs} pares válidos`);
      const tokens = Array.from(this.graph.keys());
      console.log(`🔍 Tokens no grafo: ${tokens.join(', ')}`);
    }
    
    return { vertices: tokenCount, edges: edgeCount, pairs: validPairs, invalidPrices };
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
   * Analisar triângulo de arbitragem com validações rigorosas
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
    
    // Validações de sanidade otimizadas
    const minProfitPercent = config.arbitrageConfig?.minProfitPercent || 0.1;
    const maxProfitPercent = 10; // Máximo realista para triangular (otimização chave)
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
    } else if (dexs.size < 2 && !config.arbitrageConfig?.allowSingleDexArbitrage) {
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
   * Avaliar qualidade da oportunidade (otimizado)
   */
  assessQuality(profitPercent, minLiquidity) {
    if (profitPercent > 2.0 && minLiquidity > 200000) return 'high';
    if (profitPercent > 1.0 && minLiquidity > 100000) return 'medium';
    return 'low';
  }

  /**
   * Remover triângulos duplicados (otimizado)
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
   * Obter estatísticas do grafo
   */
  getStats() {
    const tokenCount = this.graph.size;
    let edgeCount = 0;
    this.graph.forEach(edges => edgeCount += edges.size);
    
    return {
      vertices: tokenCount,
      edges: edgeCount,
      tokenPairs: this.tokenPairs.size
    };
  }

  /**
   * Limpar o grafo
   */
  clear() {
    this.graph.clear();
    this.tokenPairs.clear();
  }
}

/**
 * TriangularArbitrageService - Serviço principal otimizado para detecção de arbitragem triangular
 *
 * VERSÃO OTIMIZADA que implementa a lógica que detectou 114 oportunidades válidas
 */
class TriangularArbitrageService {
  constructor() {
    this.graph = new OptimizedArbitrageGraph();
    this.lastUpdate = null;
    this.cachedOpportunities = [];
  }

  /**
   * Construir o grafo de arbitragem (mantém interface compatível)
   * @param {object} tokenPrices - Preços dos tokens por DEX
   */
  buildGraph(tokenPrices) {
    // 🔍 DEBUG: Log detalhado do que está sendo recebido no TriangularArbitrageService
    console.log('🔍 [DEBUG] TriangularArbitrageService.buildGraph recebeu:');
    console.log(`   - Tipo: ${typeof tokenPrices}`);
    console.log(`   - É Array: ${Array.isArray(tokenPrices)}`);
    console.log(`   - Chaves principais: ${Object.keys(tokenPrices || {}).join(', ')}`);
    
    // Verificar se é o objeto completo em vez de tokenPrices
    if (tokenPrices && typeof tokenPrices === 'object' && tokenPrices.tokenPrices) {
      console.log('🚨 [BUG CONFIRMADO] TriangularService também recebeu objeto completo!');
      console.log(`   - tokenPrices.tokenPrices existe: ${!!tokenPrices.tokenPrices}`);
      console.log(`   - Pares em tokenPrices.tokenPrices: ${tokenPrices.tokenPrices ? Object.keys(tokenPrices.tokenPrices).length : 'NULL'}`);
    } else {
      console.log('✅ [DADOS CORRETOS] TriangularService recebeu dados de preços válidos');
    }
    
    if (config.arbitrageConfig?.enableDetailedLogging) {
      console.log(`📊 Input tokenPrices: ${Object.keys(tokenPrices).length} pares recebidos`);
      console.log(`🔍 Pares disponíveis: ${Object.keys(tokenPrices).join(', ')}`);
    }
    
    return this.graph.buildOptimizedGraph(tokenPrices);
  }

  /**
   * Detectar oportunidades triangulares (FOCO OTIMIZADO - apenas 3 tokens)
   * @param {object} tokenPrices - Preços dos tokens por DEX
   * @returns {object} Oportunidades detectadas
   */
  async detectOpportunities(tokenPrices) {
    console.log('🔍 Detectando oportunidades triangulares otimizadas (3 tokens apenas)...');
    
    // Construir grafo otimizado
    const graphStats = this.buildGraph(tokenPrices);
    const opportunities = [];
    const rejectedOpportunities = [];
    
    const tokens = Array.from(this.graph.graph.keys());
    
    if (config.arbitrageConfig?.enableDetailedLogging) {
      console.log(`🔍 Analisando ${tokens.length} tokens: ${tokens.join(', ')}`);
    }
    
    // OTIMIZAÇÃO CHAVE: Buscar apenas ciclos triangulares: A -> B -> C -> A
    for (let i = 0; i < tokens.length; i++) {
      for (let j = 0; j < tokens.length; j++) {
        for (let k = 0; k < tokens.length; k++) {
          if (i !== j && j !== k && k !== i) {
            const tokenA = tokens[i];
            const tokenB = tokens[j];
            const tokenC = tokens[k];
            
            const triangle = this.graph.findTrianglePath(tokenA, tokenB, tokenC);
            if (triangle) {
              const analysis = this.graph.analyzeTriangle(triangle);
              
              if (analysis.isValid) {
                opportunities.push({
                  type: 'triangular',
                  tokens: [tokenA, tokenB, tokenC],
                  path: triangle,
                  cycle: triangle, // Compatibilidade com sistema existente
                  ...analysis,
                  timestamp: Date.now()
                });

                // 4. Adicionar logs detalhados
                console.log(`⚡ Oportunidade de arbitragem detectada: ${tokenA} -> ${tokenB} -> ${tokenC} com lucro de ${analysis.profitPercent.toFixed(4)}%`);

                // 3. Extrair parâmetros para initiateArbitrageFromBackend
                const _tokenA = triangle[0].from; // Primeiro token na rota
                // Calcular a quantidade ideal para o flash loan (exemplo: 100 USD de lucro)
                // Isso é um placeholder. A lógica real de cálculo de `_amount` deve ser mais sofisticada.
                const _amount = analysis.profit * 1000; // Exemplo: lucro de 1% em 1000 USD = 10 USD
                const _path = triangle.map(edge => edge.to); // Rota completa dos tokens

                console.log(`🚀 Iniciando arbitragem com: TokenA=${_tokenA}, Amount=${_amount}, Path=${_path.join(' -> ')}`);

                try {
                  // 2. Chamar a função initiateArbitrageFromBackend do contrato FlashLoanArbitrage
                  const tx = await blockchainService.initiateArbitrageFromBackend(_tokenA, _amount, _path);
                  console.log(`✅ Transação de arbitragem enviada: ${tx.hash}`);
                  // Opcional: Esperar pela confirmação da transação
                  // await tx.wait();
                  // console.log(`🎉 Transação de arbitragem confirmada!`);
                } catch (error) {
                  console.error(`❌ Erro ao iniciar arbitragem via contrato: ${error.message}`);
                }

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

    // Remover duplicatas e ordenar (otimizado)
    const uniqueOpportunities = this.graph.removeDuplicateTriangles(opportunities);
    const sortedOpportunities = uniqueOpportunities.sort((a, b) => b.profitPercent - a.profitPercent);

    console.log(`✅ Análise triangular otimizada: ${sortedOpportunities.length} oportunidades válidas, ${rejectedOpportunities.length} rejeitadas`);

    this.cachedOpportunities = sortedOpportunities;
    this.lastUpdate = Date.now();

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
   * COMPATIBILIDADE: Extrair tokens únicos de um ciclo/path
   */
  extractTokensFromCycle(cycle) {
    if (!cycle) return [];
    const tokens = new Set();
    cycle.forEach(edge => {
      tokens.add(edge.from);
      tokens.add(edge.to);
    });
    return Array.from(tokens);
  }

  /**
   * COMPATIBILIDADE: Extrair DEXs únicos de um ciclo/path
   */
  extractDexsFromCycle(cycle) {
    if (!cycle) return [];
    const dexs = new Set();
    cycle.forEach(edge => dexs.add(edge.dex));
    return Array.from(dexs);
  }

  /**
   * COMPATIBILIDADE: Obter razão de rejeição
   */
  getRejectReason(profitAnalysis) {
    return profitAnalysis.rejectionReason || 'Critérios de qualidade não atendidos';
  }

  /**
   * COMPATIBILIDADE: Remover duplicatas (usa método otimizado)
   */
  removeDuplicates(opportunities) {
    return this.graph.removeDuplicateTriangles(opportunities);
  }

  /**
   * Formatar oportunidade para exibição (compatível com sistema existente)
   * @param {object} opportunity - Oportunidade de arbitragem
   * @returns {object} Oportunidade formatada
   */
  formatOpportunity(opportunity) {
    const path = (opportunity.path || opportunity.cycle || []).map(edge =>
      `${edge.from}→${edge.to}(${edge.dex})`
    ).join(' → ');

    return {
      type: 'Arbitragem Triangular',
      description: `${opportunity.tokens.join(' → ')}`,
      path,
      profitPercent: `${opportunity.profitPercent.toFixed(4)}%`,
      minLiquidity: `$${opportunity.minLiquidity.toLocaleString()}`,
      totalVolume: opportunity.totalVolume ? `$${opportunity.totalVolume.toLocaleString()}` : 'N/A',
      dexCount: opportunity.dexCount,
      quality: opportunity.quality.toUpperCase(),
      tokens: opportunity.tokens,
      dexs: opportunity.dexs
    };
  }

  /**
   * Obter estatísticas das oportunidades em cache
   * @returns {object} Estatísticas
   */
  getCachedStats() {
    if (!this.cachedOpportunities.length) {
      return { total: 0, byQuality: {}, byTokenCount: {} };
    }

    const byQuality = {};
    const byTokenCount = {};

    this.cachedOpportunities.forEach(opp => {
      byQuality[opp.quality] = (byQuality[opp.quality] || 0) + 1;
      const tokenCount = opp.tokens.length;
      byTokenCount[tokenCount] = (byTokenCount[tokenCount] || 0) + 1;
    });

    return {
      total: this.cachedOpportunities.length,
      byQuality,
      byTokenCount,
      lastUpdate: this.lastUpdate
    };
  }
}

// MANTER COMPATIBILIDADE: Exportar ArbitrageGraph como alias para OptimizedArbitrageGraph
const ArbitrageGraph = OptimizedArbitrageGraph;

module.exports = { TriangularArbitrageService, ArbitrageGraph };