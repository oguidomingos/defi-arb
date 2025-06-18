# 🚀 Guia de Setup - Sistema de Arbitragem

## 📋 Pré-requisitos

### 1. Node.js e npm
```bash
# Verificar versões
node --version  # v16+ recomendado
npm --version   # v8+ recomendado
```

### 2. Conta em provedores de RPC
- **Infura**: https://infura.io/ (gratuito)
- **Alchemy**: https://alchemy.com/ (gratuito)
- **The Graph**: https://thegraph.com/ (gratuito)

### 3. Wallet com MATIC
- MetaMask ou similar
- Saldo mínimo: 0.1 MATIC para gás

## 🔧 Configuração Passo a Passo

### Passo 1: Clone e Instalação
```bash
# Clone o repositório
git clone <seu-repositorio>
cd defi-arb

# Instale as dependências
npm install
```

### Passo 2: Configuração de Variáveis de Ambiente
```bash
# Copie o arquivo de exemplo
cp env.example .env

# Edite o arquivo .env
nano .env
```

#### Configurações Obrigatórias:
```env
# Polygon RPC (escolha um)
INFURA_PROJECT_ID=seu_infura_project_id
ALCHEMY_POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/sua_alchemy_key

# Chave privada da wallet (para execução)
PRIVATE_KEY=sua_chave_privada_sem_0x

# API Key do The Graph (opcional, mas recomendado)
THE_GRAPH_API_KEY=sua_the_graph_api_key
```

#### Configurações Opcionais:
```env
# Thresholds de lucratividade
MIN_PROFITABILITY_THRESHOLD=0.5  # 0.5% mínimo
MAX_SLIPPAGE=0.5                 # 0.5% slippage máximo

# Intervalos de atualização
UPDATE_INTERVAL=15000            # 15 segundos
CHECK_INTERVAL=5000              # 5 segundos
```

### Passo 3: Obter API Keys

#### Infura:
1. Acesse https://infura.io/
2. Crie uma conta gratuita
3. Crie um novo projeto
4. Copie o Project ID
5. Adicione ao `.env`:
   ```env
   INFURA_PROJECT_ID=seu_project_id
   ```

#### Alchemy:
1. Acesse https://alchemy.com/
2. Crie uma conta gratuita
3. Crie um novo app para Polygon
4. Copie a URL do RPC
5. Adicione ao `.env`:
   ```env
   ALCHEMY_POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/sua_key
   ```

#### The Graph:
1. Acesse https://thegraph.com/
2. Crie uma conta gratuita
3. Vá para API Keys
4. Crie uma nova API key
5. Adicione ao `.env`:
   ```env
   THE_GRAPH_API_KEY=sua_api_key
   ```

### Passo 4: Configurar Wallet

#### Obter Chave Privada:
1. Abra MetaMask
2. Vá para Account Details
3. Clique em "Export Private Key"
4. Digite sua senha
5. Copie a chave (sem o "0x")
6. Adicione ao `.env`:
   ```env
   PRIVATE_KEY=sua_chave_privada
   ```

#### ⚠️ Segurança:
- **NUNCA** compartilhe sua chave privada
- **NUNCA** commite o arquivo `.env`
- Use uma wallet dedicada para o bot
- Mantenha apenas o necessário para gás

### Passo 5: Testar Configuração
```bash
# Execute os testes
npm test
```

**Saída esperada:**
```
🧪 Iniciando testes do sistema de arbitragem...

1️⃣ Testando inicialização...
✅ Inicialização bem-sucedida

2️⃣ Testando coleta de dados de mercado...
✅ Dados coletados: 45 pools

3️⃣ Testando análise de oportunidades...
✅ Análise concluída: 3 oportunidades encontradas

4️⃣ Testando conectividade com blockchain...
✅ Conectado à rede: Polygon (Chain ID: 137)

5️⃣ Testando obtenção de preço do gás...
✅ Preço do gás: 30000000000 wei

🎉 Todos os testes passaram com sucesso!
```

## 🚀 Deploy dos Contratos (Opcional)

### Passo 1: Instalar Dependências do Hardhat
```bash
npm install --save-dev @openzeppelin/contracts
```

### Passo 2: Deploy na Testnet (Recomendado)
```bash
# Deploy em Mumbai testnet
npm run deploy:mumbai
```

### Passo 3: Deploy na Mainnet
```bash
# Deploy na Polygon mainnet
npm run deploy
```

### Passo 4: Atualizar Configuração
Após o deploy, atualize o `.env`:
```env
FLASH_LOAN_CONTRACT_ADDRESS=0x... # Endereço do contrato deployado
```

## 🎯 Execução

### Modo de Teste (Recomendado para início)
```bash
# Execução única
npm run dev -- --once
```

### Modo de Produção
```bash
# Execução contínua
npm start
```

### Modo de Desenvolvimento
```bash
# Com auto-reload
npm run dev
```

## 📊 Monitoramento

### Logs em Tempo Real:
```bash
# Ver logs do bot
tail -f logs/arbitrage.log
```

### Métricas Importantes:
- **Oportunidades encontradas**: Frequência de detecção
- **Taxa de sucesso**: % de execuções bem-sucedidas
- **Lucro médio**: Lucro por operação
- **Custos de gás**: Total gasto em transações

## 🔧 Troubleshooting

### Problema: "Falha na inicialização"
**Solução:**
1. Verifique se as variáveis de ambiente estão corretas
2. Teste conectividade com a internet
3. Verifique se as APIs estão funcionando

### Problema: "Erro ao conectar com blockchain"
**Solução:**
1. Verifique a URL do RPC
2. Confirme se a chave privada está correta
3. Verifique se há saldo na wallet

### Problema: "Nenhuma oportunidade encontrada"
**Solução:**
1. Diminua o `MIN_PROFITABILITY_THRESHOLD`
2. Verifique se as DEXs estão funcionando
3. Analise os logs de erro

### Problema: "Transações falhando"
**Solução:**
1. Verifique saldo de MATIC para gás
2. Aumente o preço do gás
3. Verifique se o contrato foi deployado

## 📈 Otimização

### Ajuste de Parâmetros:
```javascript
// Para mais oportunidades (menos lucrativas)
MIN_PROFITABILITY_THRESHOLD=0.3

// Para menos oportunidades (mais lucrativas)
MIN_PROFITABILITY_THRESHOLD=1.0

// Para atualizações mais frequentes
UPDATE_INTERVAL=10000
CHECK_INTERVAL=3000
```

### Configuração de Gás:
```javascript
// Para execução mais rápida
maxFeePerGas: ethers.utils.parseUnits('60', 'gwei')
maxPriorityFeePerGas: ethers.utils.parseUnits('40', 'gwei')

// Para execução mais econômica
maxFeePerGas: ethers.utils.parseUnits('30', 'gwei')
maxPriorityFeePerGas: ethers.utils.parseUnits('20', 'gwei')
```

## 🆘 Suporte

### Recursos Úteis:
- **Documentação**: `README.md` e `TECHNICAL.md`
- **Issues**: GitHub Issues
- **Comunidade**: Discord/Telegram

### Logs de Debug:
```bash
# Habilitar logs detalhados
DEBUG=* npm start
```

---

**🎉 Parabéns!** Seu sistema de arbitragem está configurado e pronto para uso! 