import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bug, RefreshCw, CheckCircle, XCircle, AlertTriangle, Play } from 'lucide-react';
import apiService from '../services/apiService';

const DebugPanel = ({ 
  opportunities, 
  marketStats, 
  systemHealth, 
  cacheStats, 
  stats, 
  isLoading, 
  error,
  refresh 
}) => {
  const [testResults, setTestResults] = useState({});
  const [isRunning, setIsRunning] = useState(false);
  const [lastTest, setLastTest] = useState(null);

  const runTests = async () => {
    setIsRunning(true);
    setTestResults({});
    
    console.log('🧪 Iniciando testes de debug...');
    
    const results = {};
    
    // Teste 1: System Health
    try {
      console.log('1️⃣ Testando System Health...');
      const healthData = await apiService.getSystemHealth();
      results.systemHealth = {
        success: true,
        data: healthData,
        timestamp: new Date().toISOString()
      };
      console.log('✅ System Health: OK');
    } catch (error) {
      results.systemHealth = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      console.log('❌ System Health: FALHOU');
    }
    
    // Teste 2: Opportunities
    try {
      console.log('2️⃣ Testando Opportunities...');
      const opportunitiesData = await apiService.getOpportunities();
      results.opportunities = {
        success: true,
        data: opportunitiesData,
        timestamp: new Date().toISOString()
      };
      console.log('✅ Opportunities: OK');
    } catch (error) {
      results.opportunities = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      console.log('❌ Opportunities: FALHOU');
    }
    
    // Teste 3: Market Stats
    try {
      console.log('3️⃣ Testando Market Stats...');
      const marketData = await apiService.getMarketStats();
      results.marketStats = {
        success: true,
        data: marketData,
        timestamp: new Date().toISOString()
      };
      console.log('✅ Market Stats: OK');
    } catch (error) {
      results.marketStats = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      console.log('❌ Market Stats: FALHOU');
    }
    
    // Teste 4: Alerts
    try {
      console.log('4️⃣ Testando Alerts...');
      const alertsData = await apiService.getAlerts();
      results.alerts = {
        success: true,
        data: alertsData,
        timestamp: new Date().toISOString()
      };
      console.log('✅ Alerts: OK');
    } catch (error) {
      results.alerts = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      console.log('❌ Alerts: FALHOU');
    }
    
    // Teste 5: Cache Stats
    try {
      console.log('5️⃣ Testando Cache Stats...');
      const cacheData = await apiService.getCacheStats();
      results.cacheStats = {
        success: true,
        data: cacheData,
        timestamp: new Date().toISOString()
      };
      console.log('✅ Cache Stats: OK');
    } catch (error) {
      results.cacheStats = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      console.log('❌ Cache Stats: FALHOU');
    }
    
    // Teste 6: WebSocket Connection
    try {
      console.log('6️⃣ Testando WebSocket...');
      const connectionStatus = apiService.getConnectionStatus();
      results.webSocket = {
        success: connectionStatus.isConnected,
        data: connectionStatus,
        timestamp: new Date().toISOString()
      };
      console.log(`✅ WebSocket: ${connectionStatus.isConnected ? 'CONECTADO' : 'DESCONECTADO'}`);
    } catch (error) {
      results.webSocket = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
      console.log('❌ WebSocket: FALHOU');
    }
    
    setTestResults(results);
    setLastTest(new Date().toISOString());
    setIsRunning(false);
    
    console.log('🎯 Testes concluídos!');
  };

  useEffect(() => {
    // Executar testes automaticamente ao montar o componente
    runTests();
  }, []);

  const getTestIcon = (success) => {
    if (success === undefined) return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    return success ? 
      <CheckCircle className="w-4 h-4 text-green-400" /> : 
      <XCircle className="w-4 h-4 text-red-400" />;
  };

  const getTestStatus = (success) => {
    if (success === undefined) return 'Pendente';
    return success ? 'Sucesso' : 'Falha';
  };

  const getTestStatusClass = (success) => {
    if (success === undefined) return 'text-yellow-400';
    return success ? 'text-green-400' : 'text-red-400';
  };

  const successCount = Object.values(testResults).filter(r => r.success).length;
  const totalTests = Object.keys(testResults).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card-glow"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold flex items-center space-x-2">
          <Bug className="w-5 h-5 text-purple-400" />
          <span>Debug Panel</span>
        </h2>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={runTests}
            disabled={isRunning}
            className="btn-primary flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Testando...' : 'Executar Testes'}</span>
          </button>
          
          <button
            onClick={refresh}
            disabled={isLoading}
            className="btn-secondary flex items-center space-x-2"
          >
            <Play className="w-4 h-4" />
            <span>{isLoading ? 'Carregando...' : 'Forçar Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Estado Atual do Hook */}
      <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
        <h3 className="text-lg font-medium mb-3">Estado Atual do Hook</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-400">isLoading:</span>
            <div className={`font-mono ${isLoading ? 'text-yellow-400' : 'text-green-400'}`}>
              {isLoading ? 'true' : 'false'}
            </div>
          </div>
          <div>
            <span className="text-gray-400">systemHealth:</span>
            <div className={`font-mono ${systemHealth ? 'text-green-400' : 'text-red-400'}`}>
              {systemHealth ? 'carregado' : 'null'}
            </div>
          </div>
          <div>
            <span className="text-gray-400">marketStats:</span>
            <div className={`font-mono ${marketStats ? 'text-green-400' : 'text-red-400'}`}>
              {marketStats ? 'carregado' : 'null'}
            </div>
          </div>
          <div>
            <span className="text-gray-400">opportunities:</span>
            <div className="font-mono text-blue-400">
              {opportunities?.length || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Resumo */}
      <div className="mb-6 p-4 bg-gray-800/50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">Resumo dos Testes</h3>
            <p className="text-sm text-gray-400">
              {successCount}/{totalTests} testes passaram
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-green-400">
              {totalTests > 0 ? Math.round((successCount / totalTests) * 100) : 0}%
            </div>
            <div className="text-xs text-gray-400">Taxa de Sucesso</div>
          </div>
        </div>
      </div>

      {/* Resultados dos Testes */}
      <div className="space-y-4">
        {Object.entries(testResults).map(([testName, result]) => (
          <motion.div
            key={testName}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="p-4 bg-gray-800/30 rounded-lg border border-gray-700"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {getTestIcon(result.success)}
                <span className="font-medium capitalize">
                  {testName.replace(/([A-Z])/g, ' $1').trim()}
                </span>
              </div>
              <span className={`text-sm font-medium ${getTestStatusClass(result.success)}`}>
                {getTestStatus(result.success)}
              </span>
            </div>
            
            <div className="text-sm text-gray-400">
              <div>Timestamp: {new Date(result.timestamp).toLocaleTimeString()}</div>
              {result.success ? (
                <div className="mt-2">
                  <details className="cursor-pointer">
                    <summary className="text-blue-400 hover:text-blue-300">
                      Ver dados recebidos
                    </summary>
                    <pre className="mt-2 text-xs bg-gray-900 p-2 rounded overflow-auto max-h-32">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                </div>
              ) : (
                <div className="text-red-400 mt-1">
                  Erro: {result.error}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Informações Adicionais */}
      <div className="mt-6 p-4 bg-gray-800/50 rounded-lg">
        <h3 className="text-lg font-medium mb-2">Informações do Sistema</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">API URL:</span>
            <div className="font-mono text-blue-400">
              {import.meta.env.VITE_API_URL || 'http://localhost:8080'}
            </div>
          </div>
          <div>
            <span className="text-gray-400">Último Teste:</span>
            <div className="text-gray-300">
              {lastTest ? new Date(lastTest).toLocaleString() : 'Nunca'}
            </div>
          </div>
          <div>
            <span className="text-gray-400">Status WebSocket:</span>
            <div className={testResults.webSocket?.success ? 'text-green-400' : 'text-red-400'}>
              {testResults.webSocket?.success ? 'Conectado' : 'Desconectado'}
            </div>
          </div>
          <div>
            <span className="text-gray-400">Modo:</span>
            <div className="text-gray-300">
              {import.meta.env.DEV ? 'Desenvolvimento' : 'Produção'}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DebugPanel; 