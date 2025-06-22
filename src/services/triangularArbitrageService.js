const { ethers } = require('ethers');
const config = require('../config');
const BlockchainService = require('./blockchainService');

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
   * Encontrar melhor rota de arbitragem (DFS com limite de profundidade)
   * @param {string} baseToken - Token inicial/final do ciclo
   * @param {number} maxDepth - Profundidade máxima da busca (padrão: 3)
   * @returns {object|null} Melhor rota encontrada ou null
   */
  findBestArbitrageRoute(baseToken, maxDepth = 3) {
    if (!this.graph.has(baseToken)) return null;

    let bestRoute = null;
    let bestProfit = 0;
    const visited = new Set();

    const dfs = (currentToken, path, currentRate) => {
      // Ciclo completo encontrado (retorno ao token base)
      if (path.length > 1 && currentToken === baseToken) {
        const profit = currentRate - 1;
        if (profit > bestProfit) {
          bestProfit = profit;
          bestRoute = {
            path: [...path],
            rate: currentRate,
            profit,
            dexes: this.extractDexesFromPath(path)
          };
        }
        return;
      }

      // Limite de profundidade atingido
      if (path.length >= maxDepth) return;

      const edges = this.graph.get(currentToken);
      if (!edges) return;

      edges.forEach((edge) => {
        if (!visited.has(edge.to)) {
          visited.add(edge.to);
          path.push({
            from: currentToken,
            to: edge.to,
            dex: edge.dex,
            rate: edge.rate,
            liquidity: edge.liquidity
          });

          dfs(edge.to, path, currentRate * edge.rate);

          path.pop();
          visited.delete(edge.to);
        }
      });
    };

    dfs(baseToken, [], 1);
    return bestRoute;
  }

  /**
   * Extrair DEXs de um caminho
   */
  extractDexesFromPath(path) {
    const dexSet = new Set();
    path.forEach(step => dexSet.add(step.dex));
    return Array.from(dexSet);
  }

  /**
   * Extrair tokens únicos de um caminho (mantendo ordem)
   */
  extractTokensFromPath(path) {
    const tokens = [];
    const seen = new Set();
    
    path.forEach(step => {
      if (!seen.has(step.from)) {
        seen.add(step.from);
        tokens.push(step.from);
      }
      if (!seen.has(step.to)) {
        seen.add(step.to);
        tokens.push(step.to);
      }
    });
    
    return tokens;
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
  constructor(blockchainService) {
    this.graph = new OptimizedArbitrageGraph();
    this.blockchainService = blockchainService; // Recebe a instância inicializada
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
  async detectOpportunities(tokenPrices, options = {}) {
    const { maxDepth = 3, baseTokens = ['USDC', 'USDT', 'DAI', 'WETH'] } = options;
    
    console.log(`🔍 Detectando oportunidades de arbitragem (profundidade máxima: ${maxDepth})...`);
    
    // Construir grafo otimizado
    const graphStats = this.buildGraph(tokenPrices);
    const opportunities = [];
    const rejectedOpportunities = [];
    
    // Log detalhado dos dados recebidos
    console.log('🔍 [DEBUG] Dados recebidos no detectOpportunities:');
    console.log('   - Tipo:', typeof tokenPrices);
    console.log('   - Chaves:', Object.keys(tokenPrices || {}));
    console.log('   - Exemplo de par:', Object.keys(tokenPrices)[0], '=>', tokenPrices[Object.keys(tokenPrices)[0]]);
    
    // Buscar oportunidades para cada token base
    for (const baseToken of baseTokens) {
      console.log(`🔍 Procurando rotas para token base: ${baseToken}`);
      const route = this.graph.findBestArbitrageRoute(baseToken, maxDepth);
      if (route) {
        const analysis = this.graph.analyzeTriangle(route.path);
        
        if (analysis.isValid) {
          const opportunity = {
            type: 'dynamic',
            tokens: this.graph.extractTokensFromPath(route.path),
            path: route.path,
            ...analysis,
            timestamp: Date.now()
          };
          
          opportunities.push(opportunity);
    
          // Execução automática se configurado
          if (config.arbitrageConfig?.autoExecute && opportunity.profitPercent >= config.arbitrageConfig.minProfitPercent) {
            try {
              const result = await this.executeDynamicArbitrage(opportunity);
              if (result.success) {
                console.log(`✅ Arbitragem executada: TX ${result.txHash} | Lucro estimado: ${result.profitEstimate.toFixed(2)}%`);
              } else {
                console.error(`❌ Falha na execução: ${result.error}`);
              }
            } catch (error) {
              console.error(`❌ Erro inesperado: ${error.message}`);
            }
          }
        } else {
          rejectedOpportunities.push({
            tokens: this.graph.extractTokensFromPath(route.path),
            ...analysis,
            rejectionReason: analysis.rejectionReason
          });
        }
      }
    }
    
    if (config.arbitrageConfig?.enableDetailedLogging) {
      const tokens = Array.from(this.graph.graph.keys());
      console.log(`🔍 Analisando ${tokens.length} tokens: ${tokens.join(', ')}`);
    }
    
    // OTIMIZAÇÃO CHAVE: Buscar apenas ciclos triangulares: A -> B -> C -> A
    const tokens = Array.from(this.graph.graph.keys());
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
                const flashLoanToken = triangle[0].from; // O token inicial do flash loan
                // TODO: Implementar lógica mais sofisticada para calcular a quantidade ideal do flash loan.
                // Por enquanto, um valor fixo ou baseado em uma estimativa simples.
                const flashLoanAmount = ethers.utils.parseUnits("100", 6); // Exemplo: 100 USDC, assumindo 6 decimais

                // Construir o array de ArbitrageStep
                const arbitrageSteps = triangle.map(edge => {
                  let dexType;
                  switch (edge.dex) {
                    case 'uniswap':
                    case 'uniswap_v2':
                      dexType = BlockchainService.DexType.UNISWAP_V2;
                      break;
                    case 'uniswap_v3':
                      dexType = BlockchainService.DexType.UNISWAP_V3;
                      break;
                    case 'sushiswap':
                      dexType = BlockchainService.DexType.SUSHISWAP;
                      break;
                    case 'quickswap':
                      dexType = BlockchainService.DexType.QUICKSWAP;
                      break;
                    default:
                      console.warn(`⚠️ DEX desconhecida: ${edge.dex}. Usando Uniswap V3 como fallback`);
                      dexType = BlockchainService.DexType.UNISWAP_V3;
                  }

                  // Obter endereços dos tokens do config
                  const config = require('../config');
                  const tokenInAddress = config.tokens[edge.from]?.address;
                  const tokenOutAddress = config.tokens[edge.to]?.address;

                  if (!tokenInAddress || !ethers.utils.isAddress(tokenInAddress)) {
                    throw new Error(`Endereço inválido ou não encontrado para tokenIn: ${edge.from}`);
                  }
                  if (!tokenOutAddress || !ethers.utils.isAddress(tokenOutAddress)) {
                    throw new Error(`Endereço inválido ou não encontrado para tokenOut: ${edge.to}`);
                  }

                  return {
                    tokenIn: tokenInAddress,
                    tokenOut: tokenOutAddress,
                    dexType: dexType,
                    fee: 3000 // TODO: Obter a taxa real para Uniswap V3, se aplicável
                  };
                });

                console.log(`🚀 Iniciando arbitragem com: FlashLoanToken=${flashLoanToken}, FlashLoanAmount=${ethers.utils.formatUnits(flashLoanAmount, 6)}, Passos=${JSON.stringify(arbitrageSteps)}`);

                try {
                  // Chamar a função initiateArbitrageFromBackend do BlockchainService
                  const txResult = await this.blockchainService.initiateArbitrageFromBackend(
                    flashLoanToken,
                    flashLoanAmount,
                    arbitrageSteps
                  );
                  if (txResult.success) {
                    console.log(`✅ Transação de arbitragem enviada: ${txResult.txHash}`);
                  } else {
                    console.error(`❌ Erro ao iniciar arbitragem via contrato: ${txResult.error}`);
                  }
                } catch (error) {
                  console.error(`❌ Erro inesperado ao iniciar arbitragem: ${error.message}`);
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
   * Executar arbitragem dinâmica via contrato FlashLoan
   * @param {object} opportunity - Oportunidade de arbitragem
   * @returns {Promise<object>} Resultado da transação
   */
  async executeDynamicArbitrage(opportunity) {
    if (!opportunity?.path?.length) {
      throw new Error('Caminho de arbitragem inválido');
    }

    // 1. Converter tokens para endereços
    const tokenAddresses = [];
    for (const step of opportunity.path) {
      const address = await this.blockchainService.getTokenAddress(step.to);
      if (!ethers.utils.isAddress(address)) {
        throw new Error(`Endereço inválido para token ${step.to}`);
      }
      tokenAddresses.push(address);
    }

    // 2. Calcular montante do flash loan (10% da liquidez mínima)
    const minLiquidity = opportunity.path.reduce((min, step) =>
      Math.min(min, step.liquidity), Infinity);
    const flashLoanAmount = ethers.utils.parseUnits(
      (minLiquidity * 0.1).toFixed(2),
      18
    );

    // 3. Calcular retorno mínimo esperado (com margem de segurança)
    const minReturn = ethers.utils.parseUnits(
      (minLiquidity * 0.1 * (1 + opportunity.profit * 0.9)).toString(),
      18
    );

    // 4. Executar no contrato
    try {
      const tx = await blockchainService.initiateDynamicArbitrage(
        tokenAddresses[0], // Token do flash loan
        flashLoanAmount,
        minReturn,
        tokenAddresses
      );

      return {
        success: true,
        txHash: tx.hash,
        profitEstimate: opportunity.profitPercent,
        amount: ethers.utils.formatUnits(flashLoanAmount, 18)
      };
    } catch (error) {
      console.error('Erro na execução dinâmica:', error);
      return {
        success: false,
        error: error.message
      };
    }
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