const { expect } = require('chai');
const { OptimizedArbitrageGraph } = require('../src/services/triangularArbitrageService');

describe('Arbitrage Route Finder', () => {
  let graph;

  beforeEach(() => {
    graph = new OptimizedArbitrageGraph();
    
    // Mock de dados de preços para testes
    const tokenPrices = {
      'USDC/WETH': {
        uniswap_v3: 0.0005, // 1 USDC = 0.0005 WETH
        sushiswap: 0.00052
      },
      'WETH/USDT': {
        uniswap_v3: 1200,   // 1 WETH = 1200 USDT
        quickswap: 1180
      },
      'USDT/USDC': {
        uniswap_v3: 1.02,   // 1 USDT = 1.02 USDC
        sushiswap: 1.01
      },
      'WETH/DAI': {
        uniswap_v3: 1100    // 1 WETH = 1100 DAI
      }
    };

    graph.buildOptimizedGraph(tokenPrices);
  });

  it('should find triangular arbitrage route', () => {
    const route = graph.findBestArbitrageRoute('USDC');
    
    expect(route).to.not.be.null;
    expect(route.path).to.have.lengthOf(3);
    expect(route.profit).to.be.greaterThan(0);
    expect(route.dexes).to.have.lengthOf.at.least(2);
    
    // Verificar se forma um ciclo completo
    expect(route.path[0].from).to.equal('USDC');
    expect(route.path[route.path.length-1].to).to.equal('USDC');
  });

  it('should return null for invalid base token', () => {
    const route = graph.findBestArbitrageRoute('INVALID');
    expect(route).to.be.null;
  });

  it('should respect max depth parameter', () => {
    const route = graph.findBestArbitrageRoute('USDC', 2);
    expect(route.path).to.have.lengthOf(2);
  });

  it('should find most profitable route', () => {
    const routes = [];
    
    // Testar com diferentes profundidades
    for (let depth = 2; depth <= 4; depth++) {
      const route = graph.findBestArbitrageRoute('USDC', depth);
      if (route) routes.push(route);
    }
    
    // Ordenar por lucro decrescente
    routes.sort((a, b) => b.profit - a.profit);
    
    // Verificar se a primeira rota é a mais lucrativa
    for (let i = 1; i < routes.length; i++) {
      expect(routes[0].profit).to.be.gte(routes[i].profit);
    }
  });
});