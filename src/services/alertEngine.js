const config = require('../config');

/**
 * AlertEngine - Sistema de alertas para oportunidades de arbitragem
 * Monitora oportunidades em tempo real e dispara alertas baseados em critérios configuráveis
 */
class AlertEngine {
  constructor(options = {}) {
    this.alertThresholds = {
      minProfitPercent: options.minProfitPercent || config.alertConfig?.minProfitPercent || 0.5,
      maxSpreadPercent: options.maxSpreadPercent || config.alertConfig?.maxSpreadPercent || 10,
      minLiquidityUSD: options.minLiquidityUSD || config.alertConfig?.minLiquidityUSD || 100000,
      minNetProfitPercent: options.minNetProfitPercent || config.alertConfig?.minNetProfitPercent || 0.3
    };
    
    this.alertHistory = [];
    this.lastAlertTime = {};
    this.alertCooldown = options.alertCooldown || 60000; // 1 minuto entre alertas do mesmo tipo
    this.enabled = options.enabled !== false;
    
    console.log('🚨 AlertEngine inicializado com critérios:');
    console.log(`   Lucro mínimo: ${this.alertThresholds.minProfitPercent}%`);
    console.log(`   Spread máximo: ${this.alertThresholds.maxSpreadPercent}%`);
    console.log(`   Liquidez mínima: $${this.alertThresholds.minLiquidityUSD.toLocaleString()}`);
    console.log(`   Lucro líquido mínimo: ${this.alertThresholds.minNetProfitPercent}%`);
  }

  /**
   * Processar oportunidades e disparar alertas apropriados
   * @param {Array} opportunities - Lista de oportunidades detectadas
   * @param {Object} marketStats - Estatísticas do mercado
   */
  processOpportunities(opportunities, marketStats) {
    if (!this.enabled) return;

    console.log(`🚨 AlertEngine processando ${opportunities.length} oportunidades...`);

    // Filtrar oportunidades que atendem critérios de alerta
    const alertOpportunities = opportunities.filter(opp => this.shouldAlert(opp));
    
    console.log(`   ${alertOpportunities.length} oportunidades atendem critérios de alerta`);

    // Processar alertas por tipo
    alertOpportunities.forEach(opp => {
      this.processAlert(opp);
    });

    // Alertas de sistema baseados em estatísticas de mercado
    this.processSystemAlerts(marketStats, opportunities.length);

    // Limpeza de histórico antigo
    this.cleanupHistory();
  }

  /**
   * Verificar se uma oportunidade deve gerar alerta
   * @param {Object} opportunity - Oportunidade a ser avaliada
   * @returns {boolean} Se deve alertar
   */
  shouldAlert(opportunity) {
    // Verificar se é lucrativa
    if (!opportunity.isProfitable) return false;

    // Verificar lucro líquido mínimo
    if (opportunity.netProfit < this.alertThresholds.minNetProfitPercent) return false;

    // Para arbitragem direta
    if (opportunity.type === 'DIRECT') {
      return opportunity.estimatedProfit >= this.alertThresholds.minProfitPercent &&
             opportunity.spread <= this.alertThresholds.maxSpreadPercent;
    }

    // Para arbitragem triangular
    if (opportunity.type === 'TRIANGULAR') {
      return opportunity.estimatedProfit >= this.alertThresholds.minProfitPercent &&
             opportunity.minLiquidity >= this.alertThresholds.minLiquidityUSD;
    }

    return false;
  }

  /**
   * Processar alerta individual
   * @param {Object} opportunity - Oportunidade que gerou o alerta
   */
  processAlert(opportunity) {
    const alertType = this.getAlertType(opportunity);
    const alertKey = `${alertType}_${opportunity.pair || opportunity.path?.join('-')}`;
    
    // Verificar cooldown
    if (this.isInCooldown(alertKey)) {
      return;
    }

    const alert = this.createAlert(opportunity, alertType);
    this.sendAlert(alert);
    this.recordAlert(alert, alertKey);
  }

  /**
   * Determinar tipo de alerta baseado na oportunidade
   * @param {Object} opportunity - Oportunidade
   * @returns {string} Tipo do alerta
   */
  getAlertType(opportunity) {
    const profit = opportunity.netProfit || opportunity.estimatedProfit;
    
    if (profit >= 2.0) return 'HIGH_PROFIT';
    if (profit >= 1.0) return 'MEDIUM_PROFIT';
    if (opportunity.quality === 'HIGH') return 'HIGH_QUALITY';
    return 'STANDARD';
  }

  /**
   * Verificar se um alerta está em cooldown
   * @param {string} alertKey - Chave do alerta
   * @returns {boolean} Se está em cooldown
   */
  isInCooldown(alertKey) {
    const lastTime = this.lastAlertTime[alertKey];
    if (!lastTime) return false;
    
    return (Date.now() - lastTime) < this.alertCooldown;
  }

  /**
   * Criar objeto de alerta
   * @param {Object} opportunity - Oportunidade
   * @param {string} alertType - Tipo do alerta
   * @returns {Object} Alerta criado
   */
  createAlert(opportunity, alertType) {
    const baseAlert = {
      id: this.generateAlertId(),
      type: alertType,
      timestamp: Date.now(),
      opportunityType: opportunity.type,
      pair: opportunity.pair || opportunity.path?.join(' → '),
      estimatedProfit: opportunity.estimatedProfit,
      netProfit: opportunity.netProfit,
      quality: opportunity.quality
    };

    // Dados específicos por tipo de arbitragem
    if (opportunity.type === 'DIRECT') {
      return {
        ...baseAlert,
        buyDex: opportunity.buyDex,
        sellDex: opportunity.sellDex,
        spread: opportunity.spread,
        buyPrice: opportunity.buyPrice,
        sellPrice: opportunity.sellPrice
      };
    }

    if (opportunity.type === 'TRIANGULAR') {
      return {
        ...baseAlert,
        tokens: opportunity.path,
        dexs: opportunity.dexs,
        minLiquidity: opportunity.minLiquidity,
        totalVolume: opportunity.totalVolume
      };
    }

    return baseAlert;
  }

  /**
   * Enviar alerta via console (expansível para webhook/email)
   * @param {Object} alert - Alerta a ser enviado
   */
  sendAlert(alert) {
    const emoji = this.getAlertEmoji(alert.type);
    const timestamp = new Date(alert.timestamp).toLocaleTimeString();
    
    console.log(`\n${emoji} ALERTA ${alert.type} - ${timestamp}`);
    console.log(`🎯 Oportunidade: ${alert.pair}`);
    console.log(`💰 Lucro estimado: ${alert.estimatedProfit?.toFixed(4)}%`);
    console.log(`💎 Lucro líquido: ${alert.netProfit?.toFixed(4)}%`);
    console.log(`⭐ Qualidade: ${alert.quality}`);
    
    if (alert.opportunityType === 'DIRECT') {
      console.log(`📊 Spread: ${alert.spread?.toFixed(4)}%`);
      console.log(`🔄 Rota: ${alert.buyDex} → ${alert.sellDex}`);
      console.log(`💲 Preços: ${alert.buyPrice?.toFixed(8)} → ${alert.sellPrice?.toFixed(8)}`);
    }
    
    if (alert.opportunityType === 'TRIANGULAR') {
      console.log(`🔗 Tokens: ${alert.tokens?.join(' → ')}`);
      console.log(`🏪 DEXs: ${alert.dexs?.join(', ')}`);
      console.log(`💧 Liquidez mín: $${alert.minLiquidity?.toLocaleString()}`);
    }
    
    console.log(`🆔 ID: ${alert.id}\n`);
  }

  /**
   * Obter emoji baseado no tipo de alerta
   * @param {string} alertType - Tipo do alerta
   * @returns {string} Emoji correspondente
   */
  getAlertEmoji(alertType) {
    const emojis = {
      'HIGH_PROFIT': '🔥',
      'MEDIUM_PROFIT': '⚡',
      'HIGH_QUALITY': '💎',
      'STANDARD': '📢',
      'SYSTEM': '🖥️'
    };
    return emojis[alertType] || '📢';
  }

  /**
   * Registrar alerta no histórico
   * @param {Object} alert - Alerta
   * @param {string} alertKey - Chave do alerta
   */
  recordAlert(alert, alertKey) {
    this.alertHistory.push(alert);
    this.lastAlertTime[alertKey] = alert.timestamp;
  }

  /**
   * Processar alertas de sistema baseados em estatísticas
   * @param {Object} marketStats - Estatísticas do mercado
   * @param {number} totalOpportunities - Total de oportunidades
   */
  processSystemAlerts(marketStats, totalOpportunities) {
    // Alerta de baixa qualidade de dados
    if (marketStats.qualityScore < 20) {
      this.sendSystemAlert('LOW_DATA_QUALITY', {
        qualityScore: marketStats.qualityScore,
        message: 'Score de qualidade dos dados muito baixo'
      });
    }

    // Alerta de muitas oportunidades (possível anomalia)
    if (totalOpportunities > 50) {
      this.sendSystemAlert('HIGH_OPPORTUNITY_COUNT', {
        count: totalOpportunities,
        message: 'Número anômalo de oportunidades detectadas'
      });
    }

    // Alerta de spreads muito altos
    if (marketStats.maxSpread > 100) {
      this.sendSystemAlert('HIGH_SPREADS', {
        maxSpread: marketStats.maxSpread,
        message: 'Spreads anômalos detectados - possível problema nos dados'
      });
    }
  }

  /**
   * Enviar alerta de sistema
   * @param {string} type - Tipo do alerta de sistema
   * @param {Object} data - Dados do alerta
   */
  sendSystemAlert(type, data) {
    const alertKey = `SYSTEM_${type}`;
    
    if (this.isInCooldown(alertKey)) return;

    const alert = {
      id: this.generateAlertId(),
      type: 'SYSTEM',
      subType: type,
      timestamp: Date.now(),
      data
    };

    console.log(`\n🖥️ ALERTA DE SISTEMA - ${type}`);
    console.log(`⚠️ ${data.message}`);
    console.log(`📊 Dados: ${JSON.stringify(data, null, 2)}`);

    this.recordAlert(alert, alertKey);
  }

  /**
   * Gerar ID único para alerta
   * @returns {string} ID do alerta
   */
  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Limpar histórico antigo de alertas
   */
  cleanupHistory() {
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas
    const cutoff = Date.now() - maxAge;
    
    this.alertHistory = this.alertHistory.filter(alert => alert.timestamp > cutoff);
    
    // Limpar timestamps antigos
    Object.keys(this.lastAlertTime).forEach(key => {
      if (this.lastAlertTime[key] < cutoff) {
        delete this.lastAlertTime[key];
      }
    });
  }

  /**
   * Obter estatísticas de alertas
   * @returns {Object} Estatísticas
   */
  getStats() {
    const last24h = this.alertHistory.filter(
      alert => (Date.now() - alert.timestamp) < 24 * 60 * 60 * 1000
    );

    const byType = {};
    last24h.forEach(alert => {
      byType[alert.type] = (byType[alert.type] || 0) + 1;
    });

    return {
      total24h: last24h.length,
      totalHistory: this.alertHistory.length,
      byType,
      lastAlert: this.alertHistory[this.alertHistory.length - 1]?.timestamp || null,
      enabled: this.enabled
    };
  }

  /**
   * Habilitar/desabilitar alertas
   * @param {boolean} enabled - Estado dos alertas
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    console.log(`🚨 AlertEngine ${enabled ? 'habilitado' : 'desabilitado'}`);
  }
}

module.exports = AlertEngine;