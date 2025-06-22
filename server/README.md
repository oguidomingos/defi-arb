# 🚀 DeFi Arbitrage Server

Servidor Express.js que serve como API backend para o frontend React, integrando todos os serviços de arbitragem DeFi.

## 📋 Características

### 🔧 Serviços Integrados
- **ArbitrageService**: Detecção de arbitragem direta com AlertEngine e CacheManager
- **GraphService**: Busca dados reais das DEXs via subgraphs
- **TriangularArbitrageService**: Detecção de oportunidades triangulares
- **BlockchainService**: Interação com blockchain, inicialização do contrato de flash loan e estimativa de gás
- **CacheManager**: Cache inteligente para otimização de performance

Durante a inicialização (`initializeServices`), o `BlockchainService` é criado
antes dos serviços de arbitragem e seu contrato de flash loan é configurado de
forma síncrona para garantir disponibilidade imediata.

### 🌐 API REST Endpoints

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/opportunities` | GET | Retorna oportunidades de arbitragem atuais |
| `/api/market-stats` | GET | Estatísticas do mercado e validação de dados |
| `/api/alerts` | GET | Alertas ativos do sistema |
| `/api/cache-stats` | GET | Estatísticas de performance do cache |
| `/api/system-health` | GET | Saúde do sistema e status dos serviços |

### 🔌 WebSocket Events

| Event | Descrição |
|-------|-----------|
| `opportunities_update` | Novas oportunidades encontradas |
| `market_stats` | Estatísticas de mercado atualizadas |
| `system_status` | Status atual do sistema |
| `analysis_error` | Erros durante análise |
| `new_alert` | Novos alertas disparados |

### ⚡ Funcionalidades em Tempo Real

- **Monitoramento Contínuo**: Análise automática a cada 30 segundos
- **Dados Reais**: Integração com subgraphs das DEXs (Uniswap V3, QuickSwap)
- **Cache Inteligente**: Otimização de performance com cache TTL
- **Sistema de Alertas**: Notificações automáticas para oportunidades importantes

## 🚀 Como Usar

### Instalação
```bash
# Instalar dependências (se ainda não instaladas)
npm install

# Configurar variáveis de ambiente
cp env.example .env
# Editar .env com as chaves necessárias
```

### Execução

```bash
# Produção
npm run server

# Desenvolvimento (com auto-reload)
npm run server:dev

# Executar na porta específica
PORT=3001 npm run server
```

### Testes

```bash
# Executar testes do servidor
node scripts/test-server.js
```

## 🔧 Configuração

### Variáveis de Ambiente

```env
# Blockchain
INFURA_PROJECT_ID=seu_projeto_id
ALCHEMY_POLYGON_RPC_URL=sua_url_alchemy
POLYGON_RPC_URL=https://polygon-rpc.com
PRIVATE_KEY=sua_chave_privada

# The Graph
THE_GRAPH_API_KEY=sua_chave_graph

# Servidor
PORT=8080
FRONTEND_URL=http://localhost:3000

# Configurações do sistema
MIN_PROFITABILITY_THRESHOLD=0.5
MAX_SLIPPAGE=0.5
UPDATE_INTERVAL=15000
CHECK_INTERVAL=5000
```

### CORS

Por padrão, o servidor aceita requisições de `http://localhost:3000`. Para alterar:

```javascript
// Em server/index.js
this.app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  // ... outras configurações
}));
```

## 📊 Monitoramento

### Logs do Sistema

O servidor fornece logs detalhados:

```bash
🔧 Inicializando serviços...
✅ Todos os serviços inicializados com sucesso
🛣️  Configurando rotas da API...
🔌 Configurando WebSocket...
🔄 Iniciando monitoramento contínuo...
🚀 DeFi Arbitrage Server INICIADO!
```

### Health Check

```bash
curl http://localhost:8080/api/system-health
```

Retorna:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.45,
  "services": {
    "cache": "online",
    "graph": "online",
    "arbitrage": "online",
    "triangular": "online",
    "blockchain": "online"
  },
  "system": {
    "isRunning": true,
    "connectedClients": 2,
    "totalOpportunities": 15,
    "totalAlerts": 3
  }
}
```

## 🔌 Integração com Frontend

### Conexão WebSocket

```javascript
import io from 'socket.io-client';

const socket = io('ws://localhost:8080');

// Escutar oportunidades
socket.on('opportunities_update', (data) => {
  console.log(`${data.stats.total} oportunidades encontradas`);
  // Atualizar estado do frontend
});

// Escutar estatísticas
socket.on('market_stats', (data) => {
  console.log(`Gas Price: ${data.gasPrice}`);
  // Atualizar dashboard
});
```

### Requisições HTTP

```javascript
// Buscar oportunidades
const response = await fetch('http://localhost:8080/api/opportunities');
const data = await response.json();

if (data.success) {
  console.log(`${data.opportunities.length} oportunidades disponíveis`);
}
```

## 🛡️ Segurança

### Middleware de Segurança

- **Helmet**: Proteção contra vulnerabilidades comuns
- **CORS**: Controle de acesso cross-origin
- **Compression**: Compressão de responses
- **Rate Limiting**: (Recomendado para produção)

### Recomendações para Produção

```javascript
// Adicionar rate limiting
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // máximo 100 requests por IP
});

app.use('/api/', limiter);
```

## 🔍 Troubleshooting

### Problemas Comuns

1. **"Nenhum dado de preço disponível"**
   - Verificar se THE_GRAPH_API_KEY está configurada
   - Confirmar conectividade com subgraphs

2. **"WebSocket não conecta"**
   - Verificar se a porta está aberta
   - Confirmar configuração de CORS

3. **"Serviços offline"**
   - Verificar logs de inicialização
   - Confirmar variáveis de ambiente

### Debug Mode

```bash
DEBUG=* npm run server:dev
```

## 📈 Performance

### Otimizações Implementadas

- **Cache Inteligente**: TTL configurável por tipo de dados
- **Compressão**: Responses comprimidos automaticamente
- **Batch Operations**: Múltiplas análises em paralelo
- **WebSocket**: Comunicação eficiente em tempo real

### Métricas Disponíveis

- Cache hit/miss ratio
- Tempo de resposta das APIs
- Número de oportunidades por análise
- Qualidade dos dados de mercado

## 🤝 Desenvolvimento

### Estrutura do Código

```
server/
├── index.js          # Servidor principal
├── README.md         # Esta documentação
└── routes/           # (Futuro) Rotas modulares
    ├── api.js
    ├── websocket.js
    └── health.js
```

### Adicionando Novos Endpoints

```javascript
// Em server/index.js
this.app.get('/api/new-endpoint', async (req, res) => {
  try {
    // Lógica do endpoint
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});
```

## 📞 Suporte

Para problemas ou dúvidas:

1. Verifique os logs do servidor
2. Execute os testes: `node scripts/test-server.js`
3. Consulte a documentação dos serviços em `src/services/`
4. Verifique as configurações em `src/config.js`