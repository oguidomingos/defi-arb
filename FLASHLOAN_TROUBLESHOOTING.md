# 🔧 Flash Loan Troubleshooting Guide

## Problemas Identificados e Soluções

### 1. **Problema Principal: Interface do Aave V3**

**Problema**: O contrato não implementava corretamente a interface do Aave V3 Pool.

**Solução Aplicada**:
- ✅ Adicionada interface `IPool` para o Aave V3
- ✅ Adicionada interface `IFlashLoanReceiver` para o callback
- ✅ Contrato agora herda de `IFlashLoanReceiver`
- ✅ Função `executeOperation` agora tem `override`

### 2. **Problema Secundário: Valores Incorretos dos Tipos de DEX**

**Problema**: O script estava usando valores incorretos para o enum `DexType`.

**Solução Aplicada**:
- ✅ Corrigido valores no script `execute-arbitrage.js`
- ✅ `UNISWAP_V2 = 0`, `UNISWAP_V3 = 1`, `SUSHISWAP = 2`, `QUICKSWAP = 3`

### 3. **Problema de Aprovações de Tokens**

**Problema**: Tokens podem não estar aprovados para os routers e Aave Pool.

**Solução**: Scripts criados para verificar e configurar aprovações.

## 📋 Scripts de Diagnóstico e Correção

### 1. **Verificar Aprovações**
```bash
npx hardhat run scripts/check-approvals.js --network polygon
```

### 2. **Enviar MATIC para o Contrato**
```bash
npx hardhat run scripts/send-matic.js --network polygon
```

### 3. **Testar Conexão com Aave**
```bash
npx hardhat run scripts/test-aave-connection.js --network polygon
```

### 4. **Testar Flash Loan Simples**
```bash
npx hardhat run scripts/test-simple-flashloan.js --network polygon
```

### 5. **Executar Arbitragem Completa**
```bash
npx hardhat run scripts/execute-arbitrage.js --network polygon
```

## 🔍 Sequência de Testes Recomendada

### Passo 1: Verificar Configuração
```bash
# 1. Verificar se o arquivo .env está configurado
cat .env

# 2. Verificar se o contrato foi deployado
npx hardhat run scripts/test-aave-connection.js --network polygon
```

### Passo 2: Configurar Saldo e Aprovações
```bash
# 1. Enviar MATIC para o contrato
npx hardhat run scripts/send-matic.js --network polygon

# 2. Verificar aprovações
npx hardhat run scripts/check-approvals.js --network polygon
```

### Passo 3: Testar Flash Loan Básico
```bash
# 1. Testar flash loan simples
npx hardhat run scripts/test-simple-flashloan.js --network polygon
```

### Passo 4: Testar Arbitragem Completa
```bash
# 1. Executar arbitragem completa
npx hardhat run scripts/execute-arbitrage.js --network polygon
```

## 🚨 Problemas Comuns e Soluções

### 1. **"Flash loan failed"**
**Causa**: Problema na interface do Aave ou dados incorretos
**Solução**: 
- Verificar se o contrato implementa `IFlashLoanReceiver`
- Verificar se `executeOperation` tem `override`
- Verificar se os dados estão sendo codificados corretamente

### 2. **"Insufficient MATIC for gas"**
**Causa**: Contrato não tem saldo suficiente para taxas
**Solução**: 
```bash
npx hardhat run scripts/send-matic.js --network polygon
```

### 3. **"Token mismatch in arbitragem step"**
**Causa**: Rota de arbitragem mal configurada
**Solução**: Verificar se os tokens de entrada/saída estão corretos

### 4. **"Caller must be Aave Pool"**
**Causa**: Callback sendo chamado por endereço incorreto
**Solução**: Verificar se o endereço do Aave Pool está correto

### 5. **"Invalid DEX type"**
**Causa**: Valor incorreto no enum DexType
**Solução**: Usar valores corretos (0-3)

## 📊 Logs de Debug

### Logs Esperados no Sucesso:
```
✅ Pool acessível. Número de reservas: X
✅ WMATIC nas reservas: Sim
✅ Liquidez suficiente para flash loan de teste
✅ Contrato encontrado
✅ Saldo suficiente para taxas
✅ AAVE_POOL do contrato: 0x794a61358D6845594F94dc1DB02A252b5b4814aD
✅ Endereço do Aave Pool correto
✅ Flash loan executado com sucesso!
```

### Logs de Erro Comuns:
```
❌ Erro ao acessar Aave Pool: call revert
❌ Contrato não encontrado no endereço especificado
⚠️  Saldo insuficiente para taxas
❌ Flash loan failed: execution reverted
```

## 🔧 Configurações Importantes

### Variáveis de Ambiente Necessárias:
```env
FLASH_LOAN_CONTRACT_ADDRESS=0x...
WMATIC_ADDRESS=0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270
USDC_ADDRESS=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
WETH_ADDRESS=0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619
PRIVATE_KEY=your_private_key
ALCHEMY_POLYGON_RPC_URL=your_rpc_url
```

### Endereços Importantes:
- **Aave Pool V3**: `0x794a61358D6845594F94dc1DB02A252b5b4814aD`
- **Uniswap V3 Router**: `0xE592427A0AEce92De3Edee1F18E0157C05861564`
- **SushiSwap Router**: `0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506`
- **QuickSwap Router**: `0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff`

## 📞 Próximos Passos

1. **Execute os scripts na ordem recomendada**
2. **Monitore os logs para identificar problemas específicos**
3. **Se houver erros, verifique as soluções acima**
4. **Teste com valores pequenos primeiro**
5. **Gradualmente aumente os valores de teste**

## 🎯 Objetivo Final

O objetivo é ter um sistema que:
- ✅ Conecta corretamente com o Aave Pool
- ✅ Executa flash loans sem erros
- ✅ Processa dados de arbitragem do backend
- ✅ Executa swaps nas DEXs corretas
- ✅ Retorna lucros quando disponíveis 