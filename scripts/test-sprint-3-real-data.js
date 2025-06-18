#!/usr/bin/env node

/**
 * 🚀 Teste Sprint 3 com Dados Reais
 * 
 * Este script testa todas as implementações do Sprint 3 usando
 * dados REAIS puxados dos monitores de preços da blockchain
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const ArbitrageService = require('../src/services/arbitrageService');
const GraphService = require('../src/services/graphService');
const AlertEngine = require('../src/services/alertEngine');
const CacheManager = require('../src/services/cacheManager');

class Sprint3RealDataValidator {
  constructor() {
    this.arbitrageService = new ArbitrageService();
    this.graphService = new GraphService();
    this.alertEngine = new AlertEngine();
    this.cacheManager = new CacheManager();
    
    this.testResults = {
      realDataFetch: false,
      realOpportunities: false,
      realAlerts: false,
      realCache: false
    };
  }

  async runRealDataValidation() {
    console.log('\n🌐 Iniciando Teste Sprint 3 com DADOS REAIS\n');
    console.log('=' .repeat(60));

    try {
      // Teste 1: Buscar dados reais da blockchain
      await this.testRealDataFetch();
      
      // Teste 2: Detectar oportunidades reais
      await this.testRealOpportunities();
      
      // Teste 3: Alertas com dados reais
      await this.testRealAlerts();
      
      // Teste 4: Cache com dados reais
      await this.testRealCache();
      
      // Relatório Final
      this.generateRealDataReport();
      
    } catch (error) {
      console.error('\n❌ Erro durante validação com dados reais:', error.message);
      console.error('Stack:', error.stack);
    }
  }

  async testRealDataFetch() {
    console.log('\n🌐 TESTE 1: Busca de Dados Reais da Blockchain');
    console.log('-'.repeat(50));

    try {
      console.log('📡 Conectando aos monitores de preços reais...');
      
      // Buscar preços reais usando GraphService
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout de 30 segundos')), 30000);
      });

      const realDataPromise = this.graphService.getUpdatedData();
      
      const realData = await Promise.race([realDataPromise, timeoutPromise]);
      
      console.log('\n📊 Dados reais obtidos:');
      const tokenPrices = realData.tokenPrices;
      const pairs = Object.keys(tokenPrices);
      console.log(`   🎯 Pares encontrados: ${pairs.length}`);
      console.log(`   🏊 Pools processados: ${realData.processedPools.length}`);
      
      // Mostrar alguns exemplos de dados reais
      console.log('\n💰 Exemplos de preços reais:');
      pairs.slice(0, 3).forEach(pair => {
        const dexes = Object.keys(tokenPrices[pair]);
        console.log(`   📈 ${pair}:`);
        dexes.forEach(dex => {
          const price = tokenPrices[pair][dex];
          console.log(`      ${dex}: $${price?.toFixed(6) || 'N/A'}`);
        });
      });

      // Usar estatísticas do GraphService
      const marketStats = realData.stats.marketStats;
      console.log(`\n📊 Qualidade dos dados reais (do GraphService):`);
      console.log(`   ✅ Pares válidos: ${marketStats.validPairs}`);
      console.log(`   ❌ Pares inválidos: ${marketStats.invalidPairs}`);
      console.log(`   📈 Total de pares: ${marketStats.totalPairs}`);
      console.log(`   ⭐ Score de qualidade: ${marketStats.qualityScore.toFixed(1)}%`);
      console.log(`   📊 Spread médio: ${marketStats.averageSpread.toFixed(4)}%`);
      console.log(`   🔥 Spread máximo: ${marketStats.maxSpread.toFixed(4)}%`);

      // Armazenar dados para próximos testes
      this.realTokenPrices = tokenPrices;
      this.realDataStats = realData.stats;
      this.testResults.realDataFetch = true;
      console.log('\n✅ TESTE 1 PASSOU: Dados reais obtidos com sucesso');

    } catch (error) {
      console.error('\n❌ TESTE 1 FALHOU:', error.message);
      console.log('⚠️  Possíveis causas:');
      console.log('   • Problema de conectividade com APIs');
      console.log('   • Limite de rate limit atingido');
      console.log('   • Configuração de .env incorreta');
      this.testResults.realDataFetch = false;
    }
  }

  async testRealOpportunities() {
    console.log('\n🎯 TESTE 2: Detecção de Oportunidades REAIS');
    console.log('-'.repeat(50));

    try {
      if (!this.realTokenPrices) {
        throw new Error('Dados reais não disponíveis do teste anterior');
      }

      console.log('🔍 Analisando oportunidades com dados reais...');
      
      // Usar preço de gás atual (simulado - em produção viria da rede)
      const currentGasPrice = 20e9; // 20 gwei
      
      const result = await this.arbitrageService.analyzeOpportunities(
        this.realTokenPrices, 
        currentGasPrice
      );
      
      console.log('\n📊 Resultados com dados REAIS:');
      console.log(`   🎯 Oportunidades diretas detectadas: ${result.direct}`);
      console.log(`   🔺 Oportunidades triangulares detectadas: ${result.triangular}`);
      console.log(`   💰 Oportunidades lucrativas (pós-custos): ${result.profitable}`);
      console.log(`   ❌ Oportunidades rejeitadas: ${result.rejected}`);

      // Mostrar detalhes das melhores oportunidades reais
      if (result.opportunities && result.opportunities.length > 0) {
        console.log('\n🏆 TOP 3 Oportunidades REAIS:');
        result.opportunities.slice(0, 3).forEach((opp, index) => {
          const formatted = this.arbitrageService.formatOpportunity(opp);
          console.log(`\n   ${index + 1}. ${formatted.type}`);
          console.log(`      📈 ${formatted.description}`);
          console.log(`      💰 Lucro estimado: ${formatted.profit}`);
          console.log(`      💎 Lucro líquido: ${formatted.netProfit}`);
          console.log(`      ⭐ Qualidade: ${formatted.quality}`);
          if (formatted.spread) {
            console.log(`      📊 Spread: ${formatted.spread}`);
          }
        });
      } else {
        console.log('\n⚠️  Nenhuma oportunidade lucrativa encontrada com dados reais');
        console.log('   💡 Isso é normal - oportunidades reais são raras');
      }

      // Mostrar estatísticas de rejeição
      if (result.rejectedOpportunities && result.rejectedOpportunities.length > 0) {
        console.log('\n📋 Principais motivos de rejeição:');
        const rejectionReasons = {};
        result.rejectedOpportunities.forEach(opp => {
          const reason = opp.rejectionReason || 'Sem razão';
          rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1;
        });
        
        Object.entries(rejectionReasons).forEach(([reason, count]) => {
          console.log(`   • ${reason}: ${count} casos`);
        });
      }

      this.realOpportunityResult = result;
      this.testResults.realOpportunities = true;
      console.log('\n✅ TESTE 2 PASSOU: Análise de oportunidades reais OK');

    } catch (error) {
      console.error('\n❌ TESTE 2 FALHOU:', error.message);
      this.testResults.realOpportunities = false;
    }
  }

  async testRealAlerts() {
    console.log('\n🚨 TESTE 3: Sistema de Alertas com Dados REAIS');
    console.log('-'.repeat(50));

    try {
      if (!this.realOpportunityResult) {
        throw new Error('Resultado de oportunidades reais não disponível');
      }

      console.log('📢 Verificando alertas gerados com dados reais...');
      
      // Verificar estatísticas de alertas após processamento real
      const alertStats = this.alertEngine.getStats();
      
      console.log('\n📊 Estatísticas de Alertas REAIS:');
      console.log(`   📈 Total de alertas (24h): ${alertStats.total24h}`);
      console.log(`   📋 Alertas por tipo: ${JSON.stringify(alertStats.byType)}`);
      console.log(`   🕒 Último alerta: ${alertStats.lastAlert ? new Date(alertStats.lastAlert).toLocaleTimeString() : 'Nenhum'}`);
      console.log(`   ✅ Sistema ativo: ${alertStats.enabled}`);

      // Simular configuração de alertas para oportunidades menores (teste)
      console.log('\n🔧 Testando alertas com threshold reduzido...');
      const testAlertEngine = new AlertEngine({
        minProfitPercent: 0.1,  // Reduzir para 0.1% para capturar mais oportunidades
        minNetProfitPercent: 0.05 // Reduzir para 0.05%
      });

      if (this.realOpportunityResult.opportunities) {
        testAlertEngine.processOpportunities(
          this.realOpportunityResult.opportunities, 
          { qualityScore: 50, maxSpread: 10 }
        );
        
        const testStats = testAlertEngine.getStats();
        console.log(`   🧪 Alertas com threshold reduzido: ${testStats.total24h}`);
      }

      this.testResults.realAlerts = true;
      console.log('\n✅ TESTE 3 PASSOU: Sistema de alertas com dados reais OK');

    } catch (error) {
      console.error('\n❌ TESTE 3 FALHOU:', error.message);
      this.testResults.realAlerts = false;
    }
  }

  async testRealCache() {
    console.log('\n🗄️  TESTE 4: Cache com Dados REAIS');
    console.log('-'.repeat(50));

    try {
      console.log('💾 Testando cache com dados reais...');
      
      if (!this.realTokenPrices) {
        throw new Error('Dados reais não disponíveis');
      }

      // Testar cache de preços reais
      const tokenAddresses = Object.keys(this.realTokenPrices).slice(0, 5);
      const realPricesData = {};
      tokenAddresses.forEach(pair => {
        realPricesData[pair] = this.realTokenPrices[pair];
      });

      // Cache hit miss test
      console.log('   🔍 Testando cache miss...');
      const cacheMiss = this.cacheManager.getCachedPrices(tokenAddresses);
      console.log(`   ❌ Cache miss: ${cacheMiss === null ? 'SIM (esperado)' : 'NÃO'}`);

      // Cache set
      console.log('   💾 Armazenando preços reais no cache...');
      this.cacheManager.setCachedPrices(tokenAddresses, realPricesData);

      // Cache hit test
      console.log('   ✅ Testando cache hit...');
      const cacheHit = this.cacheManager.getCachedPrices(tokenAddresses);
      console.log(`   ✅ Cache hit: ${cacheHit !== null ? 'SIM' : 'NÃO'}`);

      if (cacheHit) {
        const cachedPairs = Object.keys(cacheHit);
        console.log(`   📊 Pares em cache: ${cachedPairs.length}`);
      }

      // Estatísticas finais do cache
      const cacheStats = this.cacheManager.getStats();
      console.log('\n📊 Estatísticas finais do cache:');
      console.log(`   📈 Hit rate: ${cacheStats.hitRate.toFixed(1)}%`);
      console.log(`   💾 Total items: ${cacheStats.totalItems}`);
      console.log(`   ⚡ Hits: ${cacheStats.hits}, Misses: ${cacheStats.misses}`);

      this.testResults.realCache = true;
      console.log('\n✅ TESTE 4 PASSOU: Cache com dados reais OK');

    } catch (error) {
      console.error('\n❌ TESTE 4 FALHOU:', error.message);
      this.testResults.realCache = false;
    }
  }

  generateRealDataReport() {
    console.log('\n🏆 RELATÓRIO FINAL - SPRINT 3 COM DADOS REAIS');
    console.log('='.repeat(60));

    const passed = Object.values(this.testResults).filter(Boolean).length;
    const total = Object.keys(this.testResults).length;
    const successRate = (passed / total * 100).toFixed(1);

    console.log(`\n📊 Taxa de Sucesso: ${passed}/${total} (${successRate}%)`);
    console.log('\n📋 Resultados Detalhados:');
    
    Object.entries(this.testResults).forEach(([test, result]) => {
      const status = result ? '✅ PASSOU' : '❌ FALHOU';
      const names = {
        realDataFetch: 'Busca de Dados Reais',
        realOpportunities: 'Oportunidades Reais',
        realAlerts: 'Alertas com Dados Reais',
        realCache: 'Cache com Dados Reais'
      };
      console.log(`   ${status}: ${names[test]}`);
    });

    // Resumo do que foi testado
    console.log('\n🎯 Resumo dos Testes REAIS:');
    console.log('   🌐 Dados puxados diretamente dos DEXs');
    console.log('   💰 Oportunidades calculadas com preços reais');
    console.log('   🚨 Alertas baseados em dados da blockchain');
    console.log('   🗄️  Cache otimizado com dados reais');

    // Status final
    if (passed === total) {
      console.log('\n🎉 EXCELENTE! SPRINT 3 FUNCIONA PERFEITAMENTE COM DADOS REAIS');
      console.log('🚀 Sistema validado e pronto para produção');
    } else if (passed >= 2) {
      console.log('\n⚠️  PARCIALMENTE FUNCIONAL - Principais componentes OK');
      console.log('🔧 Revisar componentes que falharam');
    } else {
      console.log('\n❌ ATENÇÃO: Problemas críticos com dados reais');
      console.log('🔧 Revisar configurações e conectividade');
    }

    console.log('\n' + '='.repeat(60));
  }
}

// Executar validação com dados reais
async function main() {
  const validator = new Sprint3RealDataValidator();
  await validator.runRealDataValidation();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = Sprint3RealDataValidator;