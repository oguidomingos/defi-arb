const config = require('../config');

/**
 * ArbitrageGraph - Classe para representar o grafo de oportunidades de arbitragem
 * Implementa o algoritmo Bellman-Ford para detectar ciclos negativos (oportunidades de lucro)
 */
class ArbitrageGraph {
  constructor() {
    this.vertices = new Set(); // Tokens únicos
    this.edges = []; // Arestas com pesos (log negativo dos preços)
    this.tokenPrices = {}; // Cache dos preços por par
  }

  /**
   * Adicionar uma aresta ao grafo
   * @param {string} from - Token origem
   * @param {string} to - Token destino  
   * @param {number} rate - Taxa de câmbio (from -> to)
   * @param {string} dex - DEX que oferece a taxa
   * @param {object} metadata - Metadados adicionais (liquidez, etc.)
   */
  addEdge(from, to, rate, dex, metadata = {}) {
    if (rate <= 0 || !isFinite(rate)) {
      console.warn(`⚠️ Taxa inválida ignorada: ${from}->${to} = ${rate}`);
      return;
    }

    this.vertices.add(from);
    this.vertices.add(to);

    // Peso = -log(rate) para detectar ciclos negativos (lucro > 1)
    const weight = -Math.log(rate);
    
    this.edges.push({
      from,
      to,
      rate,
      weight,
      dex,
      metadata: {
        liquidity: metadata.liquidity || 0,
        volumeUSD: metadata.volumeUSD || 0,
        ...metadata
      }
    });

    // Cache do preço para consultas rápidas
    const pairKey = `${from}/${to}`;
    if (!this.tokenPrices[pairKey]) {
      this.tokenPrices[pairKey] = {};
    }
    this.tokenPrices[pairKey][dex] = rate;
  }

  /**
   * Implementação do algoritmo Bellman-Ford para detectar ciclos negativos
   * @param {string} startToken - Token inicial
   * @returns {object} Resultado da detecção
   */
  bellmanFord(startToken) {
    if (!this.vertices.has(startToken)) {
      return { hasNegativeCycle: false, distances: {}, paths: {} };
    }

    const vertices = Array.from(this.vertices);
    const distances = {};
    const paths = {};

    // Inicializar distâncias
    vertices.forEach(vertex => {
      distances[vertex] = vertex === startToken ? 0 : Infinity;
      paths[vertex] = [];
    });

    // Relaxar arestas V-1 vezes
    for (let i = 0; i < vertices.length - 1; i++) {
      for (const edge of this.edges) {
        const { from, to, weight } = edge;
        
        if (distances[from] !== Infinity) {
          const newDistance = distances[from] + weight;
          if (newDistance < distances[to]) {
            distances[to] = newDistance;
            paths[to] = [...paths[from], edge];
          }
        }
      }
    }

    // Verificar ciclos negativos
    const negativeCycles = [];
    for (const edge of this.edges) {
      const { from, to, weight } = edge;
      
      if (distances[from] !== Infinity) {
        const newDistance = distances[from] + weight;
        if (newDistance < distances[to]) {
          // Ciclo negativo detectado
          const cycle = this.extractCycle(from, to, paths, edge);
          if (cycle && cycle.length >= 3) { // Mínimo 3 tokens para triangular
            negativeCycles.push(cycle);
          }
        }
      }
    }

    return {
      hasNegativeCycle: negativeCycles.length > 0,
      negativeCycles,
      distances,
      paths
    };
  }

  /**
   * Extrair o ciclo negativo detectado
   * @param {string} from - Token origem da aresta que detectou o ciclo
   * @param {string} to - Token destino da aresta que detectou o ciclo
   * @param {object} paths - Caminhos acumulados
   * @param {object} edge - Aresta que fechou o ciclo
   * @returns {array} Ciclo extraído
   */
  extractCycle(from, to, paths, edge) {
    const cycle = [...paths[from], edge];
    
    // Verificar se realmente forma um ciclo
    const startToken = cycle[0]?.from;
    const endToken = cycle[cycle.length - 1]?.to;
    
    if (startToken && endToken && startToken === endToken) {
      return cycle;
    }

    // Tentar encontrar o início do ciclo
    const tokensSeen = new Set();
    const cycleStart = [];
    
    for (let i = cycle.length - 1; i >= 0; i--) {
      const currentEdge = cycle[i];
      if (tokensSeen.has(currentEdge.to)) {
        // Encontrou o início do ciclo
        const cycleStartIndex = cycle.findIndex(e => e.from === currentEdge.to);
        return cycle.slice(cycleStartIndex);
      }
      tokensSeen.add(currentEdge.to);
      cycleStart.unshift(currentEdge);
    }

    return cycle.length >= 3 ? cycle : null;
  }

  /**
   * Calcular o lucro potencial de um ciclo
   * @param {array} cycle - Ciclo de arbitragem
   * @returns {object} Análise do lucro
   */
  calculateCycleProfit(cycle) {
    if (!cycle || cycle.length === 0) {
      return { profit: 0, profitPercent: 0, isValid: false };
    }

    let totalRate = 1;
    let minLiquidity = Infinity;
    let totalVolume = 0;
    let dexCount = new Set();

    for (const edge of cycle) {
      totalRate *= edge.rate;
      minLiquidity = Math.min(minLiquidity, edge.metadata.liquidity || 0);
      totalVolume += edge.metadata.volumeUSD || 0;
      dexCount.add(edge.dex);
    }

    const profit = totalRate - 1;
    const profitPercent = profit * 100;

    // Validar se é uma oportunidade real
    const minProfitPercent = config.arbitrageConfig?.minProfitPercent || 0.1;
    const minLiquidityUSD = config.qualityFilters?.minLiquidityUSD || 50000;
    
    const isValid =
      profit > 0 &&
      profitPercent > minProfitPercent &&
      minLiquidity > minLiquidityUSD &&
      dexCount.size >= 2; // Deve usar pelo menos 2 DEXs diferentes

    return {
      profit,
      profitPercent,
      totalRate,
      minLiquidity,
      totalVolume,
      dexCount: dexCount.size,
      isValid,
      quality: this.assessCycleQuality(cycle, profit, minLiquidity, totalVolume)
    };
  }

  /**
   * Avaliar a qualidade de um ciclo de arbitragem
   * @param {array} cycle - Ciclo de arbitragem
   * @param {number} profit - Lucro calculado
   * @param {number} minLiquidity - Liquidez mínima
   * @param {number} totalVolume - Volume total
   * @returns {string} Qualidade (high/medium/low)
   */
  assessCycleQuality(cycle, profit, minLiquidity, totalVolume) {
    const profitPercent = profit * 100;
    
    // Critérios para alta qualidade
    if (profitPercent > 1.0 && minLiquidity > 500000 && totalVolume > 1000000) {
      return 'high';
    }
    
    // Critérios para qualidade média
    if (profitPercent > 0.5 && minLiquidity > 100000 && totalVolume > 100000) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Limpar o grafo
   */
  clear() {
    this.vertices.clear();
    this.edges = [];
    this.tokenPrices = {};
  }

  /**
   * Obter estatísticas do grafo
   * @returns {object} Estatísticas
   */
  getStats() {
    return {
      vertices: this.vertices.size,
      edges: this.edges.length,
      tokenPairs: Object.keys(this.tokenPrices).length
    };
  }
}

/**
 * TriangularArbitrageService - Serviço principal para detecção de arbitragem triangular
 */
class TriangularArbitrageService {
  constructor() {
    this.graph = new ArbitrageGraph();
    this.lastUpdate = null;
    this.cachedOpportunities = [];
  }

  /**
   * Construir o grafo de arbitragem a partir dos dados de preços
   * @param {object} tokenPrices - Preços dos tokens por DEX
   */
  buildGraph(tokenPrices) {
    console.log('🔧 Construindo grafo de arbitragem triangular...');
    
    this.graph.clear();
    let edgesAdded = 0;

    Object.entries(tokenPrices).forEach(([pairKey, dexPrices]) => {
      const [token0, token1] = pairKey.split('/');
      
      Object.entries(dexPrices).forEach(([dex, price]) => {
        if (price > 0 && isFinite(price)) {
          // Metadados padrão para pools (valores simulados para teste)
          const metadata = {
            liquidity: 100000, // $100k padrão para teste
            volumeUSD: 50000   // $50k padrão para teste
          };
          
          // Adicionar aresta direta: token0 -> token1
          this.graph.addEdge(token0, token1, price, dex, metadata);
          
          // Adicionar aresta inversa: token1 -> token0
          this.graph.addEdge(token1, token0, 1/price, dex, metadata);
          
          edgesAdded += 2;
        }
      });
    });

    const stats = this.graph.getStats();
    console.log(`✅ Grafo construído: ${stats.vertices} tokens, ${edgesAdded} arestas`);
    
    return stats;
  }

  /**
   * Detectar oportunidades de arbitragem triangular
   * @param {object} tokenPrices - Preços dos tokens por DEX
   * @returns {object} Oportunidades detectadas
   */
  detectOpportunities(tokenPrices) {
    console.log('🔍 Detectando oportunidades de arbitragem triangular...');
    
    // Construir grafo
    const graphStats = this.buildGraph(tokenPrices);
    
    const opportunities = [];
    const rejectedOpportunities = [];
    const tokens = Array.from(this.graph.vertices);
    
    // Executar Bellman-Ford para cada token como ponto de partida
    for (const startToken of tokens) {
      const result = this.graph.bellmanFord(startToken);
      
      if (result.hasNegativeCycle && result.negativeCycles) {
        result.negativeCycles.forEach(cycle => {
          const profitAnalysis = this.graph.calculateCycleProfit(cycle);
          
          const opportunity = {
            type: 'triangular',
            startToken,
            cycle,
            tokens: this.extractTokensFromCycle(cycle),
            dexs: this.extractDexsFromCycle(cycle),
            ...profitAnalysis,
            timestamp: Date.now()
          };
          
          if (profitAnalysis.isValid) {
            opportunities.push(opportunity);
          } else {
            rejectedOpportunities.push({
              ...opportunity,
              rejectionReason: this.getRejectReason(profitAnalysis)
            });
          }
        });
      }
    }

    // Remover duplicatas e ordenar por lucro
    const uniqueOpportunities = this.removeDuplicates(opportunities);
    const sortedOpportunities = uniqueOpportunities.sort((a, b) => b.profitPercent - a.profitPercent);

    console.log(`✅ Detecção concluída: ${sortedOpportunities.length} oportunidades válidas, ${rejectedOpportunities.length} rejeitadas`);

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
   * Extrair tokens únicos de um ciclo
   * @param {array} cycle - Ciclo de arbitragem
   * @returns {array} Lista de tokens únicos
   */
  extractTokensFromCycle(cycle) {
    const tokens = new Set();
    cycle.forEach(edge => {
      tokens.add(edge.from);
      tokens.add(edge.to);
    });
    return Array.from(tokens);
  }

  /**
   * Extrair DEXs únicos de um ciclo
   * @param {array} cycle - Ciclo de arbitragem
   * @returns {array} Lista de DEXs únicos
   */
  extractDexsFromCycle(cycle) {
    const dexs = new Set();
    cycle.forEach(edge => dexs.add(edge.dex));
    return Array.from(dexs);
  }

  /**
   * Obter razão de rejeição baseada na análise de lucro
   * @param {object} profitAnalysis - Análise de lucro
   * @returns {string} Razão da rejeição
   */
  getRejectReason(profitAnalysis) {
    if (profitAnalysis.profit <= 0) return 'Lucro negativo ou zero';
    if (profitAnalysis.profitPercent <= (config.arbitrageConfig?.minProfitPercent || 0.1)) return 'Lucro abaixo do mínimo';
    if (profitAnalysis.minLiquidity <= (config.qualityFilters?.minLiquidityUSD || 50000)) return 'Liquidez insuficiente';
    if (profitAnalysis.dexCount < 2) return 'Não usa múltiplas DEXs';
    return 'Critérios de qualidade não atendidos';
  }

  /**
   * Remover oportunidades duplicadas
   * @param {array} opportunities - Lista de oportunidades
   * @returns {array} Lista sem duplicatas
   */
  removeDuplicates(opportunities) {
    const seen = new Set();
    return opportunities.filter(opp => {
      const signature = opp.tokens.sort().join('-') + opp.dexs.sort().join('-');
      if (seen.has(signature)) {
        return false;
      }
      seen.add(signature);
      return true;
    });
  }

  /**
   * Formatar oportunidade para exibição
   * @param {object} opportunity - Oportunidade de arbitragem
   * @returns {object} Oportunidade formatada
   */
  formatOpportunity(opportunity) {
    const path = opportunity.cycle.map(edge => 
      `${edge.from}→${edge.to}(${edge.dex})`
    ).join(' → ');

    return {
      type: 'Arbitragem Triangular',
      description: `${opportunity.tokens.join(' → ')} → ${opportunity.tokens[0]}`,
      path,
      profitPercent: `${opportunity.profitPercent.toFixed(4)}%`,
      minLiquidity: `$${opportunity.minLiquidity.toLocaleString()}`,
      totalVolume: `$${opportunity.totalVolume.toLocaleString()}`,
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

module.exports = { TriangularArbitrageService, ArbitrageGraph };