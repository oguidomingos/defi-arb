import { useState, useEffect, useCallback, useRef } from 'react';
import apiService from '../services/apiService';
import notificationService from '../services/notificationService';

export const useArbitrageData = () => {
  console.log('🎯 ===== HOOK useArbitrageData CONSTRUÍDO =====');
  
  // Estados principais
  const [opportunities, setOpportunities] = useState([]);
  const [marketStats, setMarketStats] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [cacheStats, setCacheStats] = useState(null);

  // Estados de controle
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Começar como true
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Estados de estatísticas
  const [connectionStats, setConnectionStats] = useState({
    totalConnections: 0,
    reconnectAttempts: 0,
    uptime: 0
  });

  // Refs para evitar memory leaks
  const mountedRef = useRef(true);
  const cleanupFunctions = useRef([]);
  const lastOpportunityCount = useRef(0);

  // ============ Inicializar notificações ============
  useEffect(() => {
    const initNotifications = async () => {
      console.log('🔔 Inicializando serviço de notificações...');
      await notificationService.initialize();
    };
    
    initNotifications();
  }, []);

  // ============ Funções auxiliares ============
  const updateLastUpdate = useCallback(() => {
    if (mountedRef.current) {
      setLastUpdate(new Date().toISOString());
    }
  }, []);

  const handleError = useCallback((error, context = '') => {
    console.error(`❌ Erro ${context}:`, error);
    if (mountedRef.current) {
      setError({
        message: error.message || 'Erro desconhecido',
        context,
        timestamp: new Date().toISOString(),
        details: error
      });
    }
  }, []);

  const clearError = useCallback(() => {
    if (mountedRef.current) {
      setError(null);
    }
  }, []);

  // ============ Fetch functions ============
  const fetchOpportunities = useCallback(async () => {
    try {
      clearError();
      console.log('🔄 Buscando oportunidades...');
      
      const data = await apiService.getOpportunities();
      console.log('📦 Dados recebidos de oportunidades:', data);
      
      if (mountedRef.current) {
        setOpportunities(data.opportunities || []);
        updateLastUpdate();
        console.log(`✅ Estado atualizado: ${data.opportunities?.length || 0} oportunidades`);
      }
      
      return data;
    } catch (error) {
      console.error('❌ Erro ao buscar oportunidades:', error);
      handleError(error, 'ao buscar oportunidades');
      return { opportunities: [], success: false };
    }
  }, [handleError, clearError, updateLastUpdate]);

  const fetchMarketStats = useCallback(async () => {
    try {
      console.log('🔄 Buscando estatísticas do mercado...');
      const data = await apiService.getMarketStats();
      console.log('📦 Dados recebidos de market stats:', data);
      
      if (mountedRef.current) {
        setMarketStats(data);
        updateLastUpdate();
        console.log('✅ Market stats atualizado');
      }
      
      return data;
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas do mercado:', error);
      handleError(error, 'ao buscar estatísticas do mercado');
      return null;
    }
  }, [handleError, updateLastUpdate]);

  const fetchSystemHealth = useCallback(async () => {
    try {
      console.log('🔄 Verificando saúde do sistema...');
      const data = await apiService.getSystemHealth();
      console.log('📦 Dados recebidos de system health:', data);
      
      if (mountedRef.current) {
        setSystemHealth(data);
        updateLastUpdate();
        console.log('✅ System health atualizado');
      }
      
      return data;
    } catch (error) {
      console.error('❌ Erro ao verificar saúde do sistema:', error);
      handleError(error, 'ao verificar saúde do sistema');
      return null;
    }
  }, [handleError, updateLastUpdate]);

  const fetchAlerts = useCallback(async () => {
    try {
      console.log('🔄 Buscando alertas...');
      const data = await apiService.getAlerts();
      console.log('📦 Dados recebidos de alertas:', data);
      
      if (mountedRef.current) {
        setAlerts(data.alerts?.recentAlerts || []);
        updateLastUpdate();
        console.log('✅ Alertas atualizados');
      }
      
      return data;
    } catch (error) {
      console.error('❌ Erro ao buscar alertas:', error);
      handleError(error, 'ao buscar alertas');
      return { alerts: { recentAlerts: [] } };
    }
  }, [handleError, updateLastUpdate]);

  const fetchCacheStats = useCallback(async () => {
    try {
      console.log('🔄 Buscando estatísticas do cache...');
      const data = await apiService.getCacheStats();
      console.log('📦 Dados recebidos de cache stats:', data);
      
      if (mountedRef.current) {
        setCacheStats(data.cache || null);
        updateLastUpdate();
        console.log('✅ Cache stats atualizado');
      }
      
      return data;
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas do cache:', error);
      handleError(error, 'ao buscar estatísticas do cache');
      return null;
    }
  }, [handleError, updateLastUpdate]);

  // ============ Fetch all data ============
  const fetchAllData = useCallback(async () => {
    if (!mountedRef.current) return;
    
    console.log('🔄 Iniciando carregamento de dados...');
    setIsLoading(true);
    clearError();
    
    // Timeout de segurança para garantir que loading seja desabilitado
    const loadingTimeout = setTimeout(() => {
      if (mountedRef.current) {
        console.log('⏰ Timeout de segurança: Desabilitando loading');
        setIsLoading(false);
      }
    }, 15000); // 15 segundos
    
    try {
      const [opportunitiesData, marketData, healthData, alertsData, cacheData] = await Promise.allSettled([
        fetchOpportunities(),
        fetchMarketStats(),
        fetchSystemHealth(),
        fetchAlerts(),
        fetchCacheStats()
      ]);

      if (!mountedRef.current) return;

      // Log dos resultados
      const results = {
        opportunities: opportunitiesData.status === 'fulfilled',
        market: marketData.status === 'fulfilled',
        health: healthData.status === 'fulfilled',
        alerts: alertsData.status === 'fulfilled',
        cache: cacheData.status === 'fulfilled'
      };

      console.log('📊 Resultados do carregamento:', results);
      
      const successCount = Object.values(results).filter(Boolean).length;
      console.log(`✅ ${successCount}/5 requisições completadas com sucesso`);

      // Se todas falharam, definir erro geral
      if (successCount === 0) {
        handleError(new Error('Falha ao carregar todos os dados'), 'carregamento geral');
      }

    } catch (error) {
      console.error('❌ Erro no carregamento geral:', error);
      if (mountedRef.current) {
        handleError(error, 'carregamento geral');
      }
    } finally {
      clearTimeout(loadingTimeout);
      if (mountedRef.current) {
        console.log('✅ Carregamento finalizado, desabilitando loading...');
        setIsLoading(false);
      }
    }
  }, [fetchOpportunities, fetchMarketStats, fetchSystemHealth, fetchAlerts, fetchCacheStats, handleError, clearError]);

  // ============ WebSocket event handlers ============
  useEffect(() => {
    console.log('🚀 ===== HOOK useArbitrageData INICIADO =====');
    
    // FORÇAR CARREGAMENTO INICIAL IMEDIATAMENTE
    const forceInitialLoad = async () => {
      console.log('🔥 ===== FORÇANDO CARREGAMENTO INICIAL =====');
      
      try {
        setIsLoading(true);
        console.log('🔄 Fazendo requisições HTTP...');
        
        // Requisições individuais para debug
        console.log('1️⃣ Requisição System Health...');
        const healthResponse = await apiService.getSystemHealth();
        console.log('✅ System Health recebido:', healthResponse.status);
        setSystemHealth(healthResponse);
        
        console.log('2️⃣ Requisição Market Stats...');
        const marketResponse = await apiService.getMarketStats();
        console.log('✅ Market Stats recebido:', marketResponse.market?.totalPairs || 0, 'pares');
        setMarketStats(marketResponse);
        
        console.log('3️⃣ Requisição Opportunities...');
        const opportunitiesResponse = await apiService.getOpportunities();
        console.log('✅ Opportunities recebido:', opportunitiesResponse.opportunities?.length || 0, 'oportunidades');
        setOpportunities(opportunitiesResponse.opportunities || []);
        
        console.log('4️⃣ Requisição Alerts...');
        const alertsResponse = await apiService.getAlerts();
        console.log('✅ Alerts recebido:', alertsResponse.alerts?.recentAlerts?.length || 0, 'alertas');
        setAlerts(alertsResponse.alerts?.recentAlerts || []);
        
        console.log('5️⃣ Requisição Cache Stats...');
        const cacheResponse = await apiService.getCacheStats();
        console.log('✅ Cache Stats recebido:', cacheResponse.cache?.hitRate || 0, 'hit rate');
        setCacheStats(cacheResponse.cache || null);
        
        updateLastUpdate();
        console.log('🎉 ===== CARREGAMENTO INICIAL CONCLUÍDO =====');
        
      } catch (error) {
        console.error('❌ Erro no carregamento inicial:', error);
        handleError(error, 'carregamento inicial');
      } finally {
        console.log('✅ ===== DESABILITANDO LOADING =====');
        setIsLoading(false);
      }
    };

    // Executar carregamento imediatamente
    forceInitialLoad();

    // Configurar WebSocket depois
    console.log('🔌 Configurando listeners do WebSocket...');

    // Connection status listener
    const unsubscribeConnection = apiService.addEventListener('connection_status', ({ isConnected }) => {
      console.log(`🔌 Status da conexão: ${isConnected ? 'conectado' : 'desconectado'}`);
      if (mountedRef.current) {
        setIsConnected(isConnected);
        if (isConnected) {
          clearError();
          setConnectionStats(prev => ({ ...prev, totalConnections: prev.totalConnections + 1 }));
        }
      }
    });

    // Connection error listener
    const unsubscribeConnectionError = apiService.addEventListener('connection_error', ({ message }) => {
      console.error('❌ Erro de conexão:', message);
      if (mountedRef.current) {
        setIsConnected(false);
        handleError(new Error(message), 'conexão WebSocket');
      }
    });

    // Opportunities update listener
    const unsubscribeOpportunities = apiService.addEventListener('opportunities_update', (data) => {
      console.log(`🔄 Atualização de oportunidades: ${data.opportunities?.length || 0} encontradas`);
      if (mountedRef.current) {
        const newOpportunities = data.opportunities || [];
        setOpportunities(newOpportunities);
        updateLastUpdate();
        clearError();
        
        // Notificar sobre novas oportunidades
        if (newOpportunities.length > lastOpportunityCount.current) {
          const newOpportunitiesCount = newOpportunities.length - lastOpportunityCount.current;
          console.log(`🔔 ${newOpportunitiesCount} nova(s) oportunidade(s) detectada(s)`);
          
          // Mostrar notificação para cada nova oportunidade lucrativa
          newOpportunities.forEach(opportunity => {
            if (opportunity.expectedProfit > 0.5) { // Apenas oportunidades > 0.5%
              notificationService.showOpportunityAlert(opportunity);
            }
          });
        }
        
        lastOpportunityCount.current = newOpportunities.length;
      }
    });

    // Market stats listener
    const unsubscribeMarketStats = apiService.addEventListener('market_stats', (data) => {
      console.log('📈 Atualização de estatísticas do mercado');
      if (mountedRef.current) {
        setMarketStats(prevStats => ({
          ...prevStats,
          network: {
            gasPrice: data.gasPrice,
            totalPairs: data.totalPairs
          },
          cache: data.cacheStats,
          timestamp: data.timestamp
        }));
        updateLastUpdate();
        
        // Notificar sobre mudanças significativas no mercado
        if (data.totalPairs > 0) {
          notificationService.showMarketUpdate({
            totalOpportunities: data.totalOpportunities || 0,
            totalPairs: data.totalPairs
          });
        }
      }
    });

    // System status listener
    const unsubscribeSystemStatus = apiService.addEventListener('system_status', (data) => {
      console.log('🏥 Atualização do status do sistema');
      if (mountedRef.current) {
        setSystemHealth(prevHealth => ({
          ...prevHealth,
          system: data,
          timestamp: new Date().toISOString()
        }));
        updateLastUpdate();
        
        // Notificar sobre problemas do sistema
        if (!data.isRunning) {
          notificationService.showSystemAlert('Sistema parou de funcionar', 'error');
        }
      }
    });

    // Analysis error listener
    const unsubscribeAnalysisError = apiService.addEventListener('analysis_error', (data) => {
      console.error('❌ Erro de análise do servidor:', data.error);
      if (mountedRef.current) {
        handleError(new Error(data.error), 'análise do servidor');
        
        // Notificar sobre erros
        notificationService.showSystemAlert(`Erro de análise: ${data.error}`, 'error');
      }
    });

    // Armazenar funções de cleanup
    cleanupFunctions.current = [
      unsubscribeConnection,
      unsubscribeConnectionError,
      unsubscribeOpportunities,
      unsubscribeMarketStats,
      unsubscribeSystemStatus,
      unsubscribeAnalysisError
    ];

    // Timeout de segurança
    const safetyTimeout = setTimeout(() => {
      if (mountedRef.current && isLoading) {
        console.log('⏰ ===== TIMEOUT DE SEGURANÇA: DESABILITANDO LOADING =====');
        setIsLoading(false);
      }
    }, 15000); // Aumentar para 15 segundos

    return () => {
      // Cleanup
      console.log('🧹 ===== LIMPANDO HOOK useArbitrageData =====');
      clearTimeout(safetyTimeout);
      mountedRef.current = false;
      cleanupFunctions.current.forEach(cleanup => cleanup());
    };
  }, []); // Sem dependências

  // ============ Manual refresh ============
  const refresh = useCallback(() => {
    console.log('🔄 Atualizando dados manualmente...');
    
    const loadData = async () => {
      try {
        setIsLoading(true);
        clearError();
        
        console.log('🔄 Executando refresh manual...');
        
        const [opportunitiesData, marketData, healthData, alertsData, cacheData] = await Promise.allSettled([
          apiService.getOpportunities(),
          apiService.getMarketStats(),
          apiService.getSystemHealth(),
          apiService.getAlerts(),
          apiService.getCacheStats()
        ]);

        if (!mountedRef.current) return;

        console.log('📊 Processando resultados do refresh...');

        if (opportunitiesData.status === 'fulfilled') {
          setOpportunities(opportunitiesData.value.opportunities || []);
        }
        if (marketData.status === 'fulfilled') {
          setMarketStats(marketData.value);
        }
        if (healthData.status === 'fulfilled') {
          setSystemHealth(healthData.value);
        }
        if (alertsData.status === 'fulfilled') {
          setAlerts(alertsData.value.alerts?.recentAlerts || []);
        }
        if (cacheData.status === 'fulfilled') {
          setCacheStats(cacheData.value.cache || null);
        }

        updateLastUpdate();
        console.log('✅ Refresh manual concluído');

      } catch (error) {
        console.error('❌ Erro no refresh manual:', error);
        handleError(error, 'refresh manual');
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    loadData();
  }, [clearError, updateLastUpdate, handleError]);

  const reconnect = useCallback(() => {
    console.log('🔄 Reconectando...');
    apiService.reconnect();
    setConnectionStats(prev => ({ ...prev, reconnectAttempts: prev.reconnectAttempts + 1 }));
  }, []);

  // ============ Computed properties ============
  const stats = {
    totalOpportunities: opportunities.length,
    profitableOpportunities: opportunities.filter(op => op.expectedProfit > 0).length,
    directOpportunities: opportunities.filter(op => op.type === 'direct').length,
    triangularOpportunities: opportunities.filter(op => op.type === 'triangular').length,
    avgProfit: opportunities.length > 0 
      ? opportunities.reduce((sum, op) => sum + (op.expectedProfit || 0), 0) / opportunities.length
      : 0
  };

  const connectionStatus = {
    isConnected,
    ...connectionStats,
    ...apiService.getConnectionStatus()
  };

  // Debug: Log do estado atual
  useEffect(() => {
    console.log('📊 Estado atual do hook:', {
      opportunities: opportunities.length,
      marketStats: !!marketStats,
      systemHealth: !!systemHealth,
      alerts: alerts.length,
      cacheStats: !!cacheStats,
      isLoading,
      isConnected,
      error: !!error
    });
  }, [opportunities.length, marketStats, systemHealth, alerts.length, cacheStats, isLoading, isConnected, error]);

  return {
    // Data
    opportunities,
    marketStats,
    systemHealth,
    alerts,
    cacheStats,
    stats,

    // Status
    isConnected,
    isLoading,
    error,
    lastUpdate,
    connectionStatus,

    // Actions
    refresh,
    reconnect,
    clearError,
    fetchOpportunities,
    fetchMarketStats,
    fetchSystemHealth,
    fetchAlerts,
    fetchCacheStats
  };
};

export default useArbitrageData;