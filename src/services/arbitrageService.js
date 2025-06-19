const config = require('../config');
const { TriangularArbitrageService } = require('./triangularArbitrageService');
const AlertEngine = require('./alertEngine');

class ArbitrageService {
  constructor() {
    this.minProfitabilityThreshold = config.minProfitabilityThreshold;
    this.maxSlippage = config.maxSlippage;
    this.triangularService = new TriangularArbitrageService();
    this.alertEngine = new AlertEngine({
      enabled: config.alertConfig?.enabled !== false,
      minProfitPercent: 0.5,
      minNetProfitPercent: 0.3
    });
  }

  // Detectar arbitragem direta entre DEXs
  detectDirectArbitrage(tokenPrices) {
    const opportunities = [];
    const config = require('../config');
    const MAX_REALISTIC_SPREAD = config.qualityFilters?.maxSpreadPercent || 5; // 5% máximo realista
    const MIN_SPREAD_THRESHOLD = config.qualityFilters?.minSpreadPercent || 0.01; // 0.01% mínimo
    let rejectedCount = 0;
    let invalidDataCount = 0;

    for (const [pair, dexPrices] of Object.entries(tokenPrices)) {
      const dexes = Object.keys(dexPrices);
      
      if (dexes.length < 2 && !config.arbitrageConfig?.allowSingleDexArbitrage) continue;

      // Comparar preços entre todas as combinações de DEXs
      for (let i = 0; i < dexes.length - 1; i++) {
        for (let j = i + 1; j < dexes.length; j++) {
          const dex1 = dexes[i];
          const dex2 = dexes[j];
          const price1 = dexPrices[dex1];
          const price2 = dexPrices[dex2];

          // Validações básicas de entrada
          if (!price1 || !price2 || price1 <= 0 || price2 <= 0) {
            invalidDataCount++;
            continue;
          }
          
          if (!isFinite(price1) || !isFinite(price2)) {
            invalidDataCount++;
            continue;
          }

          const spread = Math.abs(price1 - price2) / Math.min(price1, price2) * 100;
          
          // Filtrar spreads irrealistas
          if (spread > MAX_REALISTIC_SPREAD) {
            console.warn(`⚠️ Spread irrealista rejeitado: ${spread.toFixed(4)}% para ${pair} (${dex1}: ${price1.toFixed(6)}, ${dex2}: ${price2.toFixed(6)})`);
            rejectedCount++;
            continue;
          }

          // Filtrar spreads muito pequenos
          if (spread < MIN_SPREAD_THRESHOLD) {
            continue;
          }
          
          if (spread > this.minProfitabilityThreshold) {
            const buyDex = price1 < price2 ? dex1 : dex2;
            const sellDex = price1 < price2 ? dex2 : dex1;
            const buyPrice = Math.min(price1, price2);
            const sellPrice = Math.max(price1, price2);

            // Calcular lucro estimado com maior precisão
            const estimatedProfit = ((sellPrice - buyPrice) / buyPrice * 100);

            opportunities.push({
              type: 'DIRECT',
              pair,
              buyDex,
              sellDex,
              buyPrice,
              sellPrice,
              spread: parseFloat(spread.toFixed(6)),
              estimatedProfit: parseFloat(estimatedProfit.toFixed(6)),
              timestamp: Date.now(),
              isValid: true,
              quality: spread <= 5 ? 'HIGH' : spread <= 10 ? 'MEDIUM' : 'LOW'
            });
          }
        }
      }
    }

    if (rejectedCount > 0) {
      console.log(`🔍 Detecção de arbitragem direta:`);
      console.log(`   Oportunidades encontradas: ${opportunities.length}`);
      console.log(`   Spreads rejeitados (irrealistas): ${rejectedCount}`);
      console.log(`   Dados inválidos: ${invalidDataCount}`);
    }

    return opportunities;
  }

  // Detectar arbitragem triangular usando algoritmo Bellman-Ford
  detectTriangularArbitrage(tokenPrices) {
    console.log('🔍 Iniciando detecção de arbitragem triangular avançada...');
    
    // Debug: mostrar dados recebidos
    if (config.arbitrageConfig?.enableDetailedLogging) {
      console.log(`🔍 Dados recebidos no ArbitrageService:`);
      console.log(`   - ${Object.keys(tokenPrices).length} pares de tokens recebidos`);
      console.log(`   - Pares: ${Object.keys(tokenPrices).join(', ')}`);
      
      // Mostrar exemplo de dados
      const samplePair = Object.keys(tokenPrices)[0];
      if (samplePair) {
        console.log(`   - Exemplo (${samplePair}): ${JSON.stringify(tokenPrices[samplePair])}`);
      }
    }
    
    const result = this.triangularService.detectOpportunities(tokenPrices);
    
    console.log(`🔍 Debug triangular: ${result.opportunities.length} oportunidades, ${result.rejectedOpportunities.length} rejeitadas`);
    
    // Converter formato para compatibilidade com o resto do sistema
    const compatibleOpportunities = result.opportunities.map(opp => {
      // Criar identificador para o campo pair (usado nos logs)
      const pairIdentifier = opp.tokens ? opp.tokens.join('→') : 'TRIANGULAR';
      
      return {
        type: 'TRIANGULAR',
        pair: pairIdentifier, // Adicionar campo pair para logs
        path: opp.tokens,
        route: this.formatTriangularRoute(opp.cycle),
        profit: opp.profitPercent.toFixed(4),
        estimatedProfit: opp.profitPercent,
        netProfit: null, // Será calculado na validação
        quality: opp.quality.toUpperCase(),
        dexs: opp.dexs,
        minLiquidity: opp.minLiquidity,
        totalVolume: opp.totalVolume,
        timestamp: opp.timestamp,
        isValid: true, // Forçar true se chegou até aqui (já foi validado no TriangularService)
        originalOpportunity: opp // Manter referência original
      };
    });

    console.log(`✅ Arbitragem triangular: ${compatibleOpportunities.length} oportunidades detectadas`);
    
    // Debug: mostrar oportunidades rejeitadas pelo TriangularService
    if (result.rejectedOpportunities.length > 0) {
      console.log(`⚠️ Oportunidades rejeitadas pelo TriangularService:`);
      result.rejectedOpportunities.slice(0, 3).forEach((rej, index) => {
        const tokens = rej.tokens ? rej.tokens.join('→') : 'N/A';
        console.log(`   ${index + 1}. ${tokens}: ${rej.rejectionReason || 'Sem razão especificada'}`);
      });
    }
    
    return compatibleOpportunities;
  }

  // Formatar rota triangular para compatibilidade
  formatTriangularRoute(cycle) {
    if (!cycle || cycle.length === 0) return null;
    
    return {
      steps: cycle.map((edge, index) => ({
        step: index + 1,
        pair: `${edge.from}/${edge.to}`,
        dex: edge.dex,
        rate: edge.rate,
        action: 'swap',
        from: edge.from,
        to: edge.to
      }))
    };
  }

  // Validar oportunidade considerando custos
  validateOpportunity(opportunity, gasPrice) {
    // Verificar se a oportunidade é válida
    if (!opportunity.isValid) {
      return {
        ...opportunity,
        isProfitable: false,
        rejectionReason: 'Dados inválidos'
      };
    }

    // Verificar se o spread é realista
    if (opportunity.spread > 10) {
      return {
        ...opportunity,
        isProfitable: false,
        rejectionReason: `Spread irrealista: ${opportunity.spread}%`
      };
    }

    // Simular custos de transação
    const gasCost = this.estimateGasCost(opportunity, gasPrice);
    const protocolFees = this.estimateProtocolFees(opportunity);
    const slippageCost = this.estimateSlippageCost(opportunity);
    
    const totalCosts = gasCost + protocolFees + slippageCost;
    
    // Converter custos para percentual se necessário
    const totalCostsPercent = totalCosts;
    const netProfit = opportunity.estimatedProfit - totalCostsPercent;
    
    // Verificar se ainda é lucrativo após custos
    const isProfitable = netProfit > 0.1; // Mínimo 0.1% de lucro líquido
    
    return {
      ...opportunity,
      gasCost: parseFloat(gasCost.toFixed(6)),
      protocolFees: parseFloat(protocolFees.toFixed(6)),
      slippageCost: parseFloat(slippageCost.toFixed(6)),
      totalCosts: parseFloat(totalCostsPercent.toFixed(6)),
      netProfit: parseFloat(netProfit.toFixed(6)),
      isProfitable,
      profitabilityScore: isProfitable ? (netProfit / opportunity.estimatedProfit) : 0,
      rejectionReason: !isProfitable ? `Lucro insuficiente após custos: ${netProfit.toFixed(4)}%` : null
    };
  }

  // Estimar custo de gás
  estimateGasCost(opportunity, gasPrice) {
    const baseGas = 300000; // Gás base para operações
    const gasPerDex = 150000; // Gás adicional por DEX
    
    let totalGas = baseGas;
    if (opportunity.type === 'DIRECT') {
      totalGas += gasPerDex * 2; // Compra + venda
    } else if (opportunity.type === 'TRIANGULAR') {
      totalGas += gasPerDex * 3; // 3 operações
    }
    
    return (totalGas * gasPrice) / 1e18; // Converter para MATIC
  }

  // Estimar taxas de protocolo
  estimateProtocolFees(opportunity) {
    const baseFee = 0.003; // 0.3% por operação
    
    if (opportunity.type === 'DIRECT') {
      return baseFee * 2; // Compra + venda
    } else if (opportunity.type === 'TRIANGULAR') {
      return baseFee * 3; // 3 operações
    }
    
    return 0;
  }

  // Estimar custo de slippage
  estimateSlippageCost(opportunity) {
    return this.maxSlippage / 100; // 0.5% de slippage
  }

  // Analisar todas as oportunidades
  analyzeOpportunities(tokenPrices, gasPrice) {
    // 🔍 DEBUG: Log detalhado do que está sendo recebido ANTES do processamento
    console.log('🔍 [DEBUG] ArbitrageService.analyzeOpportunities recebeu:');
    console.log(`   - Tipo: ${typeof tokenPrices}`);
    console.log(`   - É Array: ${Array.isArray(tokenPrices)}`);
    console.log(`   - Chaves: ${Object.keys(tokenPrices || {}).join(', ')}`);
    
    // 🚨 CORREÇÃO URGENTE: Verificar se é o objeto completo em vez de tokenPrices
    let actualTokenPrices = tokenPrices;
    if (tokenPrices && typeof tokenPrices === 'object' && tokenPrices.tokenPrices) {
      console.log('🔧 [CORREÇÃO APLICADA] Detectado objeto completo, extraindo tokenPrices!');
      console.log(`   - tokenPrices.tokenPrices existe: ${!!tokenPrices.tokenPrices}`);
      console.log(`   - Pares em tokenPrices.tokenPrices: ${tokenPrices.tokenPrices ? Object.keys(tokenPrices.tokenPrices).length : 'NULL'}`);
      actualTokenPrices = tokenPrices.tokenPrices;
    }
    
    const directOpportunities = this.detectDirectArbitrage(actualTokenPrices);
    const triangularOpportunities = this.detectTriangularArbitrage(actualTokenPrices);
    
    const allOpportunities = [
      ...directOpportunities,
      ...triangularOpportunities
    ];

    // Validar todas as oportunidades
    const validatedOpportunities = allOpportunities.map(opp => this.validateOpportunity(opp, gasPrice));
    
    // Separar por categoria
    const profitableOpportunities = validatedOpportunities.filter(opp => opp.isProfitable);
    const rejectedOpportunities = validatedOpportunities.filter(opp => !opp.isProfitable);
    
    // Ordenar por lucratividade líquida
    profitableOpportunities.sort((a, b) => b.netProfit - a.netProfit);

    // Estatísticas de qualidade
    const qualityStats = {
      high: profitableOpportunities.filter(opp => opp.quality === 'HIGH').length,
      medium: profitableOpportunities.filter(opp => opp.quality === 'MEDIUM').length,
      low: profitableOpportunities.filter(opp => opp.quality === 'LOW').length
    };

    // Log detalhado dos rejeitados (primeiros 3)
    if (rejectedOpportunities.length > 0) {
      console.log(`⚠️  ${rejectedOpportunities.length} oportunidades rejeitadas:`);
      rejectedOpportunities.slice(0, 3).forEach((opp, index) => {
        console.log(`   ${index + 1}. ${opp.pair || 'N/A'}: ${opp.rejectionReason}`);
      });
    }

    // Processar alertas para oportunidades lucrativas
    if (profitableOpportunities.length > 0) {
      this.alertEngine.processOpportunities(profitableOpportunities, {
        qualityScore: 50, // Placeholder - será substituído pelos dados reais
        maxSpread: Math.max(...profitableOpportunities.map(o => o.spread || 0))
      });
    }

    const result = {
      direct: directOpportunities.length,
      triangular: triangularOpportunities.length,
      total: allOpportunities.length,
      profitable: profitableOpportunities.length,
      rejected: rejectedOpportunities.length,
      opportunities: profitableOpportunities,
      qualityStats,
      rejectedOpportunities: rejectedOpportunities.slice(0, 5), // Primeiras 5 para debug
      alertStats: this.alertEngine.getStats()
    };

    return result;
  }

  // Formatar oportunidade para exibição
  formatOpportunity(opportunity) {
    if (opportunity.type === 'DIRECT') {
      return {
        type: 'Arbitragem Direta',
        description: `${opportunity.pair}: ${opportunity.buyDex} → ${opportunity.sellDex}`,
        spread: `${opportunity.spread.toFixed(4)}%`,
        profit: `${opportunity.estimatedProfit.toFixed(4)}%`,
        netProfit: opportunity.netProfit !== undefined ? `${opportunity.netProfit.toFixed(4)}%` : 'N/A',
        buyPrice: opportunity.buyPrice.toFixed(8),
        sellPrice: opportunity.sellPrice.toFixed(8),
        quality: opportunity.quality || 'UNKNOWN',
        costs: opportunity.totalCosts ? `${opportunity.totalCosts.toFixed(4)}%` : 'N/A',
        profitabilityScore: opportunity.profitabilityScore ? (opportunity.profitabilityScore * 100).toFixed(1) + '%' : 'N/A'
      };
    } else if (opportunity.type === 'TRIANGULAR') {
      // Usar formatação do serviço triangular se disponível
      if (opportunity.originalOpportunity) {
        const formatted = this.triangularService.formatOpportunity(opportunity.originalOpportunity);
        return {
          type: 'Arbitragem Triangular',
          description: formatted.description,
          path: formatted.path,
          profit: `${opportunity.profit || opportunity.estimatedProfit || 0}%`,
          netProfit: opportunity.netProfit !== undefined ? `${opportunity.netProfit.toFixed(4)}%` : 'N/A',
          quality: opportunity.quality || 'UNKNOWN',
          costs: opportunity.totalCosts ? `${opportunity.totalCosts.toFixed(4)}%` : 'N/A',
          profitabilityScore: opportunity.profitabilityScore ? (opportunity.profitabilityScore * 100).toFixed(1) + '%' : 'N/A',
          minLiquidity: formatted.minLiquidity,
          totalVolume: formatted.totalVolume,
          dexCount: formatted.dexCount,
          tokens: formatted.tokens,
          dexs: formatted.dexs
        };
      }
      
      // Fallback para formato antigo
      return {
        type: 'Arbitragem Triangular (Legacy)',
        description: `${opportunity.path ? opportunity.path.join(' → ') : 'N/A'}`,
        profit: `${opportunity.profit || opportunity.estimatedProfit || 0}%`,
        netProfit: opportunity.netProfit !== undefined ? `${opportunity.netProfit.toFixed(4)}%` : 'N/A',
        route: opportunity.route,
        quality: opportunity.quality || 'UNKNOWN',
        costs: opportunity.totalCosts ? `${opportunity.totalCosts.toFixed(4)}%` : 'N/A'
      };
    }
    
    return {
      type: 'UNKNOWN',
      description: 'Formato não reconhecido',
      profit: 'N/A',
      netProfit: 'N/A'
    };
  }
}

module.exports = ArbitrageService; 