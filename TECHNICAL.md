# 📚 Documentação Técnica - Sistema de Arbitragem

## 🏗️ Arquitetura do Sistema

### Visão Geral
O sistema é composto por três camadas principais:

1. **Camada de Dados** (`GraphService`): Coleta dados de mercado via Graph API
2. **Camada de Análise** (`ArbitrageService`): Detecta oportunidades de arbitragem
3. **Camada de Execução** (`BlockchainService`): Executa transações na blockchain

### Fluxo de Dados
```
Graph API → GraphService → ArbitrageService → BlockchainService → Polygon
```

## 🔧 Componentes Detalhados

### 1. GraphService (`src/services/graphService.js`)

#### Responsabilidades:
- Conectar com subgraphs das DEXs
- Coletar dados de pools e preços
- Processar e normalizar dados

#### Queries GraphQL:
```graphql
query Pools($tokens: [String!], $minLiquidity: String) {
  pools(
    where: { 
      token0_in: $tokens, 
      token1_in: $tokens, 
      liquidity_gt: $minLiquidity 
    }, 
    first: 500,
    orderBy: liquidity,
    orderDirection: desc
  ) {
    id
    token0 { id symbol decimals }
    token1 { id symbol decimals }
    liquidity
    sqrtPrice
    tick
    feeTier
    volumeUSD
    totalValueLockedUSD
  }
}
```

#### Cálculo de Preços:
```javascript
// Fórmula para calcular preço: (sqrtPrice / 2^96)^2
const price = Math.pow(sqrtPrice / Math.pow(2, 96), 2);
const adjustedPrice = price * Math.pow(10, token1Decimals - token0Decimals);
```

### 2. ArbitrageService (`src/services/arbitrageService.js`)

#### Algoritmos de Detecção:

##### Arbitragem Direta:
```javascript
const spread = Math.abs(price1 - price2) / Math.min(price1, price2) * 100;
if (spread > minProfitabilityThreshold) {
  // Oportunidade encontrada
}
```

##### Arbitragem Triangular:
```javascript
// Simular operação: 1 token inicial
let amount = 1;
amount = amount / priceAB;  // Comprar tokenB
amount = amount / priceBC;  // Comprar tokenC  
amount = amount * priceCA;  // Vender tokenC
const profit = (amount - 1) * 100;
```

#### Validação de Custos:
- **Gás**: Estimativa baseada no tipo de operação
- **Taxas de Protocolo**: 0.3% por operação
- **Slippage**: 0.5% máximo configurável

### 3. BlockchainService (`src/services/blockchainService.js`)

#### Integração com Flash Loans:
```javascript
// ABI do Aave V3 Pool
const flashLoanABI = [
  'function flashLoanSimple(address receiver, address asset, uint256 amount, bytes calldata data, uint16 referralCode) external'
];
```

#### Simulação de Transações:
```javascript
const gasEstimate = await provider.estimateGas(populatedTx);
const gasPrice = await provider.getGasPrice();
const gasCost = gasEstimate.mul(gasPrice);
```

## 📊 Estratégias de Arbitragem

### 1. Arbitragem Direta (Cross-DEX)

**Objetivo**: Aproveitar diferenças de preço do mesmo par entre DEXs

**Exemplo**:
```
WMATIC/USDC:
- Uniswap V3: $0.850
- SushiSwap: $0.870
- Spread: 2.35%
- Ação: Comprar em Uniswap, vender em SushiSwap
```

**Vantagens**:
- Simples de implementar
- Baixo risco de execução
- Alta frequência de oportunidades

**Desvantagens**:
- Spreads menores
- Competição intensa

### 2. Arbitragem Triangular

**Objetivo**: Aproveitar inconsistências em ciclos de 3 tokens

**Exemplo**:
```
WMATIC → USDC → WETH → WMATIC
1 WMATIC → 0.85 USDC → 0.00042 WETH → 1.002 WMATIC
Lucro: 0.2%
```

**Vantagens**:
- Spreads maiores possíveis
- Menos competição
- Oportunidades únicas

**Desvantagens**:
- Complexidade de execução
- Maior risco de falha
- Custos de gás mais altos

## 🔒 Contratos Inteligentes

### FlashLoanArbitrage.sol

#### Características:
- **Herança**: `ReentrancyGuard`, `Ownable`
- **Integração**: Aave V3 Pool
- **Segurança**: Proteção contra reentrância

#### Funções Principais:

```solidity
function flashLoanSimple(
    address receiver,
    address asset,
    uint256 amount,
    bytes calldata data,
    uint16 referralCode
) external nonReentrant

function executeOperation(
    address[] calldata assets,
    uint256[] calldata amounts,
    uint256[] calldata premiums,
    address initiator,
    bytes calldata params
) external returns (bool)
```

#### Fluxo de Execução:
1. Usuário chama `flashLoanSimple`
2. Contrato solicita flash loan do Aave
3. Aave executa callback `executeOperation`
4. Lógica de arbitragem é executada
5. Reembolso é feito ao Aave

## ⚙️ Configuração e Otimização

### Parâmetros Críticos:

#### 1. Thresholds de Lucratividade:
```javascript
minProfitabilityThreshold: 0.5, // 0.5% mínimo
maxSlippage: 0.5, // 0.5% slippage máximo
```

#### 2. Intervalos de Atualização:
```javascript
updateInterval: 15000, // 15 segundos
checkInterval: 5000,   // 5 segundos
```

#### 3. Configuração de Gás:
```javascript
gas: {
  maxFeePerGas: ethers.utils.parseUnits('50', 'gwei'),
  maxPriorityFeePerGas: ethers.utils.parseUnits('30', 'gwei')
}
```

### Otimizações Recomendadas:

#### 1. Prevenção de Front-running:
- Ajuste dinâmico de gás
- Execução em blocos específicos
- Uso de MEV protection

#### 2. Melhoria de Performance:
- Cache de dados de mercado
- Paralelização de queries
- Otimização de algoritmos

#### 3. Gestão de Risco:
- Limites de perda máxima
- Diversificação de estratégias
- Monitoramento contínuo

## 📈 Métricas e Monitoramento

### KPIs Principais:
- **Taxa de Sucesso**: % de execuções bem-sucedidas
- **Lucro Médio**: Lucro por operação
- **Frequência**: Oportunidades por hora
- **Custos**: Gás total gasto

### Logs Estruturados:
```javascript
{
  timestamp: Date.now(),
  type: 'OPPORTUNITY_FOUND',
  data: {
    pair: 'WMATIC/USDC',
    spread: 0.8,
    estimatedProfit: 0.3,
    gasCost: 0.001
  }
}
```

## 🔧 Troubleshooting

### Problemas Comuns:

#### 1. Falha na Conexão com Graph API:
```bash
# Verificar rate limits
curl -H "Authorization: Bearer YOUR_KEY" \
  https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3
```

#### 2. Transações Falhando:
```javascript
// Verificar saldo de gás
const balance = await provider.getBalance(wallet.address);
const gasPrice = await provider.getGasPrice();
const requiredGas = balance.div(gasPrice);
```

#### 3. Oportunidades Não Encontradas:
- Aumentar `minProfitabilityThreshold`
- Verificar conectividade com DEXs
- Analisar logs de erro

## 🚀 Deploy e Produção

### Checklist de Deploy:

1. **Testnet**:
   ```bash
   npm run deploy:mumbai
   npm test
   ```

2. **Mainnet**:
   ```bash
   npm run deploy
   npm start
   ```

3. **Monitoramento**:
   - Configurar alertas
   - Monitorar logs
   - Verificar saldos

### Configuração de Produção:
```bash
# PM2 para gerenciamento de processos
npm install -g pm2
pm2 start src/index.js --name "arbitrage-bot"
pm2 startup
pm2 save
```

## 📚 Referências

- [Aave V3 Documentation](https://docs.aave.com/developers/)
- [The Graph Documentation](https://thegraph.com/docs/)
- [Polygon Documentation](https://docs.polygon.technology/)
- [Uniswap V3 Documentation](https://docs.uniswap.org/)

---

**Última atualização**: Dezembro 2024 