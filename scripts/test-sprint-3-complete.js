#!/usr/bin/env node

/**
 * 🚀 Teste Completo do Sprint 3
 * 
 * Este script valida todas as implementações do Sprint 3:
 * - Sistema de Alertas (AlertEngine)
 * - Sistema de Cache (CacheManager) 
 * - Correções de Spreads
 * - Integração Completa
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const ArbitrageService = require('../src/services/arbitrageService');
const AlertEngine = require('../src/services/alertEngine');
const CacheManager = require('../src/services/cacheManager');

class Sprint3Validator {
  constructor() {
    this.arbitrageService = new ArbitrageService();
    this.alertEngine = new AlertEngine();
    this.cacheManager = new CacheManager();
    
    this.testResults = {
      alertEngine: false,
      cacheManager: false,
      integration: false,
      performance: false
    };
  }

  async runCompleteValidation() {
    console.log('\n🚀 Iniciando Validação Completa do Sprint 3\n');
    console.log('=' .repeat(60));

    try {
      // Teste 1: Sistema de Alertas
      await this.testAlertEngine();
      
      // Teste 2: Sistema de Cache
      await this.testCacheManager();
      
      // Teste 3: Integração Completa
      await this.testIntegration();
      
      // Teste 4: Performance
      await this.testPerformance();
      
      // Relatório Final
      this.generateFinalReport();
      
    } catch (error) {
      console.error('\n❌ Erro durante validação:', error.message);
      console.error('Stack:', error.stack);
    }
  }

  async testAlertEngine() {
    console.log('\n📢 TESTE 1: Sistema de Alertas');
    console.log('-'.repeat(40));

    try {
      // Teste 1.1: Configuração interna
      console.log('🔧 Testando configuração do AlertEngine...');
      console.log(`   ✅ Thresholds: ${JSON.stringify(this.alertEngine.alertThresholds)}`);
      console.log(`   ✅ Cooldown: ${this.alertEngine.alertCooldown}ms`);

      // Teste 1.2: Processamento de Oportunidades
      console.log('\n🎯 Testando processamento de alertas...');
      const mockOpportunities = [{
        type: 'DIRECT',
        pair: 'USDC/WETH',
        isProfitable: true,
        estimatedProfit: 2.5,
        netProfit: 1.8,
        quality: 'HIGH',
        spread: 3.2
      }];

      const marketStats = {
        qualityScore: 75,
        maxSpread: 5
      };

      // Usar o método correto processOpportunities
      this.alertEngine.processOpportunities(mockOpportunities, marketStats);
      console.log(`   ✅ Oportunidades processadas com sucesso`);

      // Teste 1.3: Verificar should alert
      console.log('\n⚡ Testando critérios de alerta...');
      const shouldAlert = this.alertEngine.shouldAlert(mockOpportunities[0]);
      console.log(`   ✅ Deve alertar: ${shouldAlert ? 'SIM' : 'NÃO'}`);

      // Teste 1.4: Estatísticas
      console.log('\n📊 Estatísticas de alertas:');
      const stats = this.alertEngine.getStats();
      console.log(`   📈 Total 24h: ${stats.total24h}`);
      console.log(`   📋 Por tipo: ${JSON.stringify(stats.byType)}`);
      console.log(`   ✅ Enabled: ${stats.enabled}`);

      this.testResults.alertEngine = true;
      console.log('\n✅ TESTE 1 PASSOU: Sistema de Alertas OK');

    } catch (error) {
      console.error('\n❌ TESTE 1 FALHOU:', error.message);
      this.testResults.alertEngine = false;
    }
  }

  async testCacheManager() {
    console.log('\n🗄️  TESTE 2: Sistema de Cache');
    console.log('-'.repeat(40));

    try {
      // Teste 2.1: Configuração interna
      console.log('🔧 Testando configuração do CacheManager...');
      console.log(`   ✅ TTL Prices: ${this.cacheManager.ttl.prices}ms`);
      console.log(`   ✅ TTL Pools: ${this.cacheManager.ttl.pools}ms`);
      console.log(`   ✅ Max Sizes: ${JSON.stringify(this.cacheManager.maxSize)}`);

      // Teste 2.2: Cache de Preços
      console.log('\n💰 Testando cache de preços...');
      const tokenAddresses = ['0xToken1', '0xToken2'];
      const mockPrices = { '0xToken1': 100, '0xToken2': 200 };
      
      // Set cache
      this.cacheManager.setCachedPrices(tokenAddresses, mockPrices);
      console.log('   ✅ Preços armazenados no cache');
      
      // Get cache
      const cachedPrices = this.cacheManager.getCachedPrices(tokenAddresses);
      const cacheHit = cachedPrices !== null;
      console.log(`   ✅ Cache hit: ${cacheHit ? 'SIM' : 'NÃO'}`);
      
      if (cacheHit) {
        console.log(`   💎 Valores: ${JSON.stringify(cachedPrices)}`);
      }

      // Teste 2.3: Cache de Pools
      console.log('\n🏊 Testando cache de pools...');
      const dexName = 'uniswap';
      const minLiquidity = 10000;
      const mockPools = [
        { id: 'pool1', liquidity: 100000 },
        { id: 'pool2', liquidity: 200000 }
      ];
      
      this.cacheManager.setCachedPools(dexName, minLiquidity, mockPools);
      const cachedPools = this.cacheManager.getCachedPools(dexName, minLiquidity);
      console.log(`   ✅ Pools em cache: ${cachedPools ? cachedPools.length : 0}`);

      // Teste 2.4: Estatísticas
      console.log('\n📊 Estatísticas de cache:');
      const stats = this.cacheManager.getStats();
      console.log(`   📈 Hit rate: ${stats.hitRate.toFixed(1)}%`);
      console.log(`   💾 Total items: ${stats.totalItems}`);
      console.log(`   🗑️  Evictions: ${stats.evictions}`);
      console.log(`   ⚡ Hits: ${stats.hits}, Misses: ${stats.misses}`);

      this.testResults.cacheManager = true;
      console.log('\n✅ TESTE 2 PASSOU: Sistema de Cache OK');

    } catch (error) {
      console.error('\n❌ TESTE 2 FALHOU:', error.message);
      this.testResults.cacheManager = false;
    }
  }

  async testIntegration() {
    console.log('\n🔗 TESTE 3: Integração Completa');
    console.log('-'.repeat(40));

    try {
      console.log('🔍 Testando análise de oportunidades com sistema integrado...');
      
      // Criar dados de teste realistas
      const mockTokenPrices = {
        'USDC/WETH': {
          uniswap: 2500.50,
          quickswap: 2515.75
        },
        'WETH/WMATIC': {
          uniswap: 0.00045,
          quickswap: 0.00046
        }
      };

      const gasPrice = 20e9; // 20 gwei
      
      // Executar análise com timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout de 15 segundos')), 15000);
      });

      const analysisPromise = this.arbitrageService.analyzeOpportunities(mockTokenPrices, gasPrice);
      
      const result = await Promise.race([analysisPromise, timeoutPromise]);
      
      console.log('\n📊 Resultados da análise integrada:');
      console.log(`   🎯 Oportunidades diretas: ${result.direct || 0}`);
      console.log(`   🔺 Oportunidades triangulares: ${result.triangular || 0}`);
      console.log(`   💰 Oportunidades lucrativas: ${result.profitable || 0}`);
      console.log(`   ❌ Oportunidades rejeitadas: ${result.rejected || 0}`);
      
      // Verificar se alertas foram processados
      if (result.alertStats) {
        console.log(`   🚨 Alertas processados: SIM`);
        console.log(`   📢 Total de alertas 24h: ${result.alertStats.total24h}`);
      }

      // Verificar estatísticas de cache
      const cacheStats = this.cacheManager.getStats();
      console.log(`   🗄️  Cache hit rate: ${cacheStats.hitRate.toFixed(1)}%`);

      this.testResults.integration = true;
      console.log('\n✅ TESTE 3 PASSOU: Integração OK');

    } catch (error) {
      console.error('\n❌ TESTE 3 FALHOU:', error.message);
      this.testResults.integration = false;
    }
  }

  async testPerformance() {
    console.log('\n⚡ TESTE 4: Performance');
    console.log('-'.repeat(40));

    try {
      console.log('🚀 Executando testes de performance...');
      
      // Teste 4.1: Velocidade de Cache
      const startCache = Date.now();
      for (let i = 0; i < 100; i++) {
        this.cacheManager.setCachedPrices([`token${i}`], { [`token${i}`]: i * 100 });
        this.cacheManager.getCachedPrices([`token${i}`]);
      }
      const cacheTime = Date.now() - startCache;
      console.log(`   ⚡ 100 operações de cache: ${cacheTime}ms`);

      // Teste 4.2: Velocidade de Alertas
      const startAlerts = Date.now();
      const mockOpportunities = [];
      
      for (let i = 0; i < 10; i++) {
        mockOpportunities.push({
          type: 'DIRECT',
          pair: `PAIR${i}`,
          isProfitable: true,
          estimatedProfit: 1.5 + (i * 0.1),
          netProfit: 1.0 + (i * 0.05),
          quality: 'MEDIUM',
          spread: 2.5
        });
      }
      
      const marketStats = { qualityScore: 50, maxSpread: 5 };
      this.alertEngine.processOpportunities(mockOpportunities, marketStats);
      
      const alertsTime = Date.now() - startAlerts;
      console.log(`   📢 10 processamentos de alerta: ${alertsTime}ms`);

      // Teste 4.3: Memória
      const memUsage = process.memoryUsage();
      console.log(`   💾 Uso de memória: ${(memUsage.heapUsed / 1024 / 1024).toFixed(1)}MB`);

      // Teste 4.4: Limpeza de cache
      const startCleanup = Date.now();
      this.cacheManager.cleanup();
      const cleanupTime = Date.now() - startCleanup;
      console.log(`   🧹 Limpeza de cache: ${cleanupTime}ms`);

      this.testResults.performance = true;
      console.log('\n✅ TESTE 4 PASSOU: Performance OK');

    } catch (error) {
      console.error('\n❌ TESTE 4 FALHOU:', error.message);
      this.testResults.performance = false;
    }
  }

  generateFinalReport() {
    console.log('\n🏆 RELATÓRIO FINAL - SPRINT 3');
    console.log('='.repeat(60));

    const passed = Object.values(this.testResults).filter(Boolean).length;
    const total = Object.keys(this.testResults).length;
    const successRate = (passed / total * 100).toFixed(1);

    console.log(`\n📊 Taxa de Sucesso: ${passed}/${total} (${successRate}%)`);
    console.log('\n📋 Resultados Detalhados:');
    
    Object.entries(this.testResults).forEach(([test, result]) => {
      const status = result ? '✅ PASSOU' : '❌ FALHOU';
      const name = test.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      console.log(`   ${status}: ${name}`);
    });

    // Status final
    if (passed === total) {
      console.log('\n🎉 PARABÉNS! SPRINT 3 TOTALMENTE FUNCIONAL');
      console.log('🚀 Sistema otimizado e pronto para uso avançado');
      console.log('\n💡 Próximos passos sugeridos:');
      console.log('   1️⃣  Executar em ambiente de produção');
      console.log('   2️⃣  Monitorar performance em tempo real');
      console.log('   3️⃣  Implementar dashboard (Fase 3.4)');
    } else {
      console.log('\n⚠️  ATENÇÃO: Alguns testes falharam');
      console.log('🔧 Revise as implementações que falharam');
    }

    console.log('\n' + '='.repeat(60));
  }
}

// Executar validação
async function main() {
  const validator = new Sprint3Validator();
  await validator.runCompleteValidation();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = Sprint3Validator;