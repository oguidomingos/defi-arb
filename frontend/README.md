# DeFi Arbitrage Frontend

Frontend React moderno e responsivo para monitoramento de oportunidades de arbitragem DeFi em tempo real.

## 🚀 Características

- **Interface Futurística**: Design moderno inspirado em CoinGecko/Tesla com tema dark
- **Tempo Real**: Conexão WebSocket para atualizações instantâneas
- **Responsivo**: Funciona perfeitamente em desktop e mobile
- **Performance**: Otimizado com lazy loading e gerenciamento de estado eficiente
- **Componentização**: Arquitetura modular e reutilizável

## 🛠️ Tecnologias

- **React 18** - Biblioteca UI moderna
- **Vite** - Build tool rápido para desenvolvimento
- **Tailwind CSS** - Framework CSS utilitário
- **Framer Motion** - Animações fluidas
- **Socket.io Client** - Comunicação em tempo real
- **Recharts** - Gráficos e visualizações
- **Lucide React** - Ícones modernos
- **Axios** - Cliente HTTP

## 📦 Instalação

### Pré-requisitos

- Node.js 18+ instalado
- Backend Express.js rodando na porta 8080

### Passos

1. **Navegue para o diretório frontend:**
   ```bash
   cd frontend
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

4. **Acesse a aplicação:**
   ```
   http://localhost:3000
   ```

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev          # Inicia servidor de desenvolvimento

# Produção
npm run build        # Build para produção
npm run preview      # Preview do build de produção

# Qualidade
npm run lint         # Executa ESLint
```

## 🏗️ Estrutura do Projeto

```
frontend/
├── public/              # Arquivos estáticos
├── src/
│   ├── components/      # Componentes React
│   │   ├── Dashboard.jsx       # Dashboard principal
│   │   ├── Monitor.jsx         # Monitor de oportunidades
│   │   ├── SystemHealth.jsx    # Saúde do sistema
│   │   ├── AlertPanel.jsx      # Painel de alertas
│   │   └── ConnectionStatus.jsx # Status da conexão
│   ├── hooks/           # Hooks customizados
│   │   └── useArbitrageData.js # Hook principal de dados
│   ├── services/        # Serviços
│   │   └── apiService.js       # Cliente API/WebSocket
│   ├── App.jsx          # Componente principal
│   ├── main.jsx         # Ponto de entrada
│   └── index.css        # Estilos globais
├── package.json         # Dependências e scripts
├── vite.config.js      # Configuração Vite
├── tailwind.config.js  # Configuração Tailwind
└── README.md           # Este arquivo
```

## 🌐 Conexão com Backend

O frontend se conecta automaticamente ao backend Express.js através de:

### APIs REST
- `GET /api/opportunities` - Lista de oportunidades
- `GET /api/market-stats` - Estatísticas de mercado
- `GET /api/system-health` - Saúde do sistema
- `GET /api/alerts` - Alertas ativos
- `GET /api/cache-stats` - Estatísticas do cache

### WebSocket Events
- `opportunities_update` - Novas oportunidades
- `market_stats` - Atualizações de mercado
- `system_status` - Status do sistema
- `analysis_error` - Erros de análise

## 📱 Componentes Principais

### 1. Dashboard
- Visão geral com métricas em tempo real
- Gráficos de performance
- Status dos serviços
- Indicadores de saúde

### 2. Monitor
- Lista de oportunidades de arbitragem
- Filtros e busca avançada
- Ordenação por lucro, ROI, volume
- Detalhes de cada oportunidade

### 3. System Health
- Monitoramento de recursos
- Gráficos de memória e cache
- Status detalhado dos serviços
- Métricas de performance

### 4. Alert Panel
- Alertas em tempo real
- Configurações de notificação
- Histórico de alertas
- Auto-dismiss configurável

## 🎨 Personalização

### Cores e Tema
Edite `tailwind.config.js` para personalizar:
- Paleta de cores
- Animações
- Fontes
- Spacing

### Estilos Globais
Modifique `src/index.css` para:
- Componentes customizados
- Animações CSS
- Scrollbars
- Responsividade

## 🔄 Estado da Aplicação

O estado é gerenciado através do hook `useArbitrageData`:

```javascript
const {
  // Dados
  opportunities,      // Oportunidades encontradas
  marketStats,       // Estatísticas de mercado
  systemHealth,      // Saúde do sistema
  alerts,           // Alertas ativos
  stats,            // Estatísticas computadas
  
  // Status
  isConnected,      // Status da conexão WebSocket
  isLoading,        // Estado de carregamento
  error,            // Erros ocorridos
  
  // Ações
  refresh,          // Atualizar dados manualmente
  reconnect         // Reconectar WebSocket
} = useArbitrageData();
```

## 🚨 Tratamento de Erros

O sistema possui tratamento robusto de erros:

- **Conexão perdida**: Reconexão automática
- **APIs offline**: Fallback com mensagens amigáveis
- **Dados inválidos**: Validação e sanitização
- **WebSocket errors**: Retry automático com backoff

## 📊 Performance

### Otimizações Implementadas

- **Lazy Loading**: Componentes carregados sob demanda
- **Memo**: Prevenção de re-renders desnecessários
- **Debounce**: Limitação de chamadas frequentes
- **Virtualization**: Listas grandes otimizadas
- **Code Splitting**: Bundle dividido por rotas

### Métricas Monitoradas

- Connection status
- API response times
- WebSocket latency
- Memory usage
- Cache hit rates

## 🌍 Variáveis de Ambiente

Crie um arquivo `.env` na raiz do frontend:

```env
VITE_API_URL=http://localhost:8080
VITE_WS_URL=ws://localhost:8080
```

## 🧪 Desenvolvimento

### Servidor Backend
Certifique-se de que o backend está rodando:
```bash
# No diretório raiz do projeto
npm run server
```

### Hot Reload
O Vite oferece hot reload automático. Mudanças nos arquivos são refletidas instantaneamente.

### Debug
Use as ferramentas de desenvolvedor do navegador:
- Console para logs do WebSocket
- Network tab para requisições API
- React DevTools para componentes

## 🚀 Deploy

### Build de Produção
```bash
npm run build
```

### Servir Estaticamente
```bash
npm run preview
```

### Deploy Sugerido
- **Vercel**: Deploy automático via Git
- **Netlify**: Integração com repositório
- **AWS S3**: Hospedagem estática
- **Docker**: Container com nginx

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Faça commit das mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para detalhes.

## 🆘 Suporte

Se encontrar problemas:

1. Verifique se o backend está rodando
2. Confirme as portas (3000 frontend, 8080 backend)
3. Verifique os logs do console
4. Teste a conectividade das APIs

Para mais ajuda, abra uma issue no repositório.