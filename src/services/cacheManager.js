/**
 * CacheManager - Gerenciador de cache para otimização de performance
 * Implementa cache com TTL para preços, pools e oportunidades
 */
class CacheManager {
  constructor(options = {}) {
    this.caches = {
      prices: new Map(),
      pools: new Map(),
      opportunities: new Map(),
      markets: new Map()
    };
    
    this.ttl = {
      prices: options.pricesTTL || 30000,       // 30 segundos
      pools: options.poolsTTL || 60000,         // 1 minuto  
      opportunities: options.opportunitiesTTL || 15000, // 15 segundos
      markets: options.marketsTTL || 45000      // 45 segundos
    };
    
    this.maxSize = {
      prices: options.maxPricesSize || 1000,
      pools: options.maxPoolsSize || 500,
      opportunities: options.maxOpportunitiesSize || 200,
      markets: options.maxMarketsSize || 100
    };
    
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      evictions: 0
    };
    
    this.enabled = options.enabled !== false;
    
    // Limpeza automática a cada 2 minutos
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 120000);
    
    console.log('🗄️ CacheManager inicializado:');
    console.log(`   TTL: prices=${this.ttl.prices}ms, pools=${this.ttl.pools}ms`);
    console.log(`   Max sizes: ${Object.values(this.maxSize).join(', ')}`);
    console.log(`   Enabled: ${this.enabled}`);
  }

  /**
   * Obter item do cache
   * @param {string} cacheType - Tipo do cache (prices, pools, etc.)
   * @param {string} key - Chave do item
   * @returns {any|null} Item do cache ou null se não encontrado/expirado
   */
  get(cacheType, key) {
    if (!this.enabled || !this.caches[cacheType]) {
      this.stats.misses++;
      return null;
    }

    const cache = this.caches[cacheType];
    const item = cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }

    // Verificar TTL
    if (Date.now() - item.timestamp > this.ttl[cacheType]) {
      cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    item.lastAccess = Date.now();
    return item.data;
  }

  /**
   * Armazenar item no cache
   * @param {string} cacheType - Tipo do cache
   * @param {string} key - Chave do item
   * @param {any} data - Dados a serem armazenados
   */
  set(cacheType, key, data) {
    if (!this.enabled || !this.caches[cacheType]) {
      return;
    }

    const cache = this.caches[cacheType];
    
    // Verificar limite de tamanho
    if (cache.size >= this.maxSize[cacheType]) {
      this.evictOldest(cacheType);
    }

    cache.set(key, {
      data,
      timestamp: Date.now(),
      lastAccess: Date.now()
    });

    this.stats.sets++;
  }

  /**
   * Remover itens mais antigos quando cache atinge limite
   * @param {string} cacheType - Tipo do cache
   */
  evictOldest(cacheType) {
    const cache = this.caches[cacheType];
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, item] of cache) {
      if (item.lastAccess < oldestTime) {
        oldestTime = item.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Limpar itens expirados de todos os caches
   */
  cleanup() {
    let cleaned = 0;
    
    Object.entries(this.caches).forEach(([cacheType, cache]) => {
      const ttl = this.ttl[cacheType];
      const cutoff = Date.now() - ttl;
      
      for (const [key, item] of cache) {
        if (item.timestamp < cutoff) {
          cache.delete(key);
          cleaned++;
        }
      }
    });

    if (cleaned > 0) {
      console.log(`🗄️ Cache cleanup: ${cleaned} itens expirados removidos`);
    }
  }

  /**
   * Invalidar cache específico ou todos
   * @param {string|null} cacheType - Tipo específico ou null para todos
   */
  invalidate(cacheType = null) {
    if (cacheType && this.caches[cacheType]) {
      this.caches[cacheType].clear();
      console.log(`🗄️ Cache ${cacheType} invalidado`);
    } else {
      Object.values(this.caches).forEach(cache => cache.clear());
      console.log('🗄️ Todos os caches invalidados');
    }
  }

  /**
   * Métodos específicos para cache de preços
   */
  getCachedPrices(tokenAddresses) {
    const key = tokenAddresses.sort().join(',');
    return this.get('prices', key);
  }

  setCachedPrices(tokenAddresses, pricesData) {
    const key = tokenAddresses.sort().join(',');
    this.set('prices', key, pricesData);
  }

  /**
   * Métodos específicos para cache de pools
   */
  getCachedPools(dexName, minLiquidity) {
    const key = `${dexName}_${minLiquidity}`;
    return this.get('pools', key);
  }

  setCachedPools(dexName, minLiquidity, poolsData) {
    const key = `${dexName}_${minLiquidity}`;
    this.set('pools', key, poolsData);
  }

  /**
   * Métodos específicos para cache de oportunidades
   */
  getCachedOpportunities(gasPrice) {
    const key = `opportunities_${gasPrice}`;
    return this.get('opportunities', key);
  }

  setCachedOpportunities(gasPrice, opportunities) {
    const key = `opportunities_${gasPrice}`;
    this.set('opportunities', key, opportunities);
  }

  /**
   * Métodos específicos para cache de dados de mercado
   */
  getCachedMarketData(tokenPricesHash) {
    return this.get('markets', tokenPricesHash);
  }

  setCachedMarketData(tokenPricesHash, marketData) {
    this.set('markets', tokenPricesHash, marketData);
  }

  /**
   * Gerar hash simples para dados de entrada
   * @param {any} data - Dados para gerar hash
   * @returns {string} Hash dos dados
   */
  generateHash(data) {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Obter estatísticas do cache
   * @returns {Object} Estatísticas
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 ? 
      (this.stats.hits / (this.stats.hits + this.stats.misses) * 100) : 0;

    const sizes = {};
    Object.entries(this.caches).forEach(([type, cache]) => {
      sizes[type] = cache.size;
    });

    return {
      enabled: this.enabled,
      hitRate: parseFloat(hitRate.toFixed(2)),
      hits: this.stats.hits,
      misses: this.stats.misses,
      sets: this.stats.sets,
      evictions: this.stats.evictions,
      sizes,
      totalItems: Object.values(sizes).reduce((a, b) => a + b, 0)
    };
  }

  /**
   * Configurar TTL para um tipo de cache
   * @param {string} cacheType - Tipo do cache
   * @param {number} ttl - TTL em milissegundos
   */
  setTTL(cacheType, ttl) {
    if (this.ttl[cacheType] !== undefined) {
      this.ttl[cacheType] = ttl;
      console.log(`🗄️ TTL do cache ${cacheType} alterado para ${ttl}ms`);
    }
  }

  /**
   * Habilitar/desabilitar cache
   * @param {boolean} enabled - Estado do cache
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.invalidate();
    }
    console.log(`🗄️ Cache ${enabled ? 'habilitado' : 'desabilitado'}`);
  }

  /**
   * Limpar recursos e parar timers
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.invalidate();
    console.log('🗄️ CacheManager destruído');
  }
}

module.exports = CacheManager;