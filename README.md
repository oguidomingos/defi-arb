# 🚀 Sistema de Arbitragem na Polygon

Sistema completo de arbitragem automatizada na rede Polygon, utilizando Graph API para monitoramento de preços e flash loans para execução sem capital inicial.

## 📋 Características

- **Monitoramento em Tempo Real**: Coleta dados de Uniswap V3, SushiSwap e QuickSwap V3 via Graph API
- **Detecção Inteligente**: Identifica oportunidades de arbitragem direta e triangular
- **Flash Loans**: Execução sem capital próprio usando contratos inteligentes
- **Análise de Custos**: Simulação de transações incluindo gás, taxas e slippage
- **Execução Automática**: Bot que monitora e executa oportunidades lucrativas

## 🏗️ Arquitetura

```
src/
├── index.js                 # Arquivo principal do bot
├── config.js               # Configurações centralizadas
└── services/
    ├── graphService.js     # Interação com Graph API
    ├── arbitrageService.js # Detecção de oportunidades
    └── blockchainService.js # Interação com blockchain
```

## 🚀 Instalação

### 1. Clone o repositório
```bash
git clone <seu-repositorio>
cd defi-arb
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente
```bash
cp env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
# Configurações da Polygon
INFURA_PROJECT_ID=seu_infura_project_id
ALCHEMY_POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/sua_alchemy_key
PRIVATE_KEY=sua_chave_privada

# API Keys
THE_GRAPH_API_KEY=sua_the_graph_api_key

# Configurações do sistema
MIN_PROFITABILITY_THRESHOLD=0.5
MAX_SLIPPAGE=0.5
```

### 4. Deploy dos contratos (opcional)
```bash
# Instalar dependências do Hardhat
npm install --save-dev @openzeppelin/contracts

# Deploy na Polygon
npx hardhat run scripts/deploy.js --network polygon
```

## 🎯 Como Usar

### Execução Contínua
```bash
npm start
```

### Execução Única (para testes)
```bash
npm run dev -- --once
```

### Modo Desenvolvimento
```bash
npm run dev
```

## 📊 Monitoramento

O sistema exibe informações em tempo real:

```
🚀 Inicializando Sistema de Arbitragem na Polygon...

📡 Conectado à rede: Polygon
🔗 Chain ID: 137
📦 Bloco atual: 50000000
⛽ Preço do gás: 30.5 gwei

💰 Saldos da wallet:
   MATIC: 1.234
   WMATIC: 0.567
   USDC: 100.00

✅ Sistema inicializado com sucesso!

🔄 Iniciando monitoramento contínuo...

📊 Dados de mercado atualizados:
   Pools processados: 45
   Pares de tokens: 12
   Timestamp: 14:30:25

🔍 Análise de oportunidades:
   Arbitragem direta: 3
   Arbitragem triangular: 1
   Total encontradas: 4
   Lucrativas: 2

🎯 Oportunidades lucrativas encontradas:
   1. WMATIC/USDC: uniswap → sushiswap
      Spread/Lucro: 0.8%
      Lucro líquido: 0.3%
```

## 🔧 Configuração Avançada

### Tokens Monitorados
Edite `src/config.js` para adicionar/remover tokens:

```javascript
tokens: {
  WMATIC: {
    address: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
    symbol: 'WMATIC',
    decimals: 18
  },
  // Adicione mais tokens aqui
}
```

### DEXs Suportadas
```javascript
dexSubgraphs: {
  uniswap: {
    url: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
    name: 'Uniswap V3'
  },
  // Adicione mais DEXs aqui
}
```

### Parâmetros de Lucratividade
```javascript
minProfitabilityThreshold: 0.5, // 0.5% mínimo
maxSlippage: 0.5, // 0.5% slippage máximo
updateInterval: 15000, // 15 segundos
checkInterval: 5000 // 5 segundos
```

## 📈 Estratégias de Arbitragem

### 1. Arbitragem Direta
Compara preços do mesmo par entre diferentes DEXs:
```
WMATIC/USDC:
- Uniswap: $0.85
- SushiSwap: $0.87
- Spread: 2.35%
```

### 2. Arbitragem Triangular
Identifica ciclos lucrativos entre 3 tokens:
```
WMATIC → USDC → WETH → WMATIC
```

## ⚠️ Riscos e Limitações

- **Front-running**: Outros bots podem executar antes
- **Slippage**: Preços podem mudar durante execução
- **Gás**: Custos podem tornar operações não lucrativas
- **Liquidez**: Pools com baixa liquidez podem falhar

## 🔒 Segurança

- **Chaves Privadas**: Nunca compartilhe ou commite chaves privadas
- **Testes**: Sempre teste em Mumbai testnet primeiro
- **Validação**: O sistema simula transações antes de executar
- **Limites**: Configure limites de perda máxima

## 📚 Dependências

### Principais
- `@apollo/client`: Cliente GraphQL para Graph API
- `ethers`: Interação com blockchain
- `node-fetch`: Requisições HTTP

### Desenvolvimento
- `hardhat`: Framework de desenvolvimento
- `@openzeppelin/contracts`: Contratos seguros
- `nodemon`: Auto-reload em desenvolvimento

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

MIT License - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

- **Issues**: Abra uma issue no GitHub
- **Documentação**: Consulte os comentários no código
- **Comunidade**: Participe das discussões

## 🎉 Próximos Passos

1. **Deploy dos contratos** na Polygon
2. **Configurar variáveis** de ambiente
3. **Testar em Mumbai** testnet
4. **Executar em produção** com pequenas quantidades
5. **Monitorar e otimizar** performance

---

**⚠️ Aviso Legal**: Este software é fornecido "como está" sem garantias. Trading de criptomoedas envolve riscos significativos. Use por sua conta e risco. # defi-arb
