import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Monitor as MonitorIcon,
  Heart,
  Bell,
  RefreshCw,
  Settings,
  Menu,
  X,
  Bug
} from 'lucide-react';

// Hooks
import useArbitrageData from './hooks/useArbitrageData';

// Components
import ConnectionStatus from './components/ConnectionStatus';
import Dashboard from './components/Dashboard';
import Monitor from './components/Monitor';
import SystemHealth from './components/SystemHealth';
import AlertPanel from './components/AlertPanel';
import DebugPanel from './components/DebugPanel';

const Navigation = ({ activeTab, setActiveTab, isCollapsed, setIsCollapsed }) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'monitor', label: 'Monitor', icon: MonitorIcon },
    { id: 'health', label: 'Saúde', icon: Heart },
    { id: 'alerts', label: 'Alertas', icon: Bell },
    { id: 'debug', label: 'Debug', icon: Bug },
  ];

  return (
    <motion.nav
      initial={{ x: -100 }}
      animate={{ x: 0 }}
      className={`${
        isCollapsed ? 'w-16' : 'w-64'
      } transition-all duration-300 bg-gray-900/50 backdrop-blur-sm border-r border-gray-800 flex flex-col`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <motion.h1 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-lg font-bold glow-text"
            >
              DeFi Arbitrage
            </motion.h1>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            {isCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Menu Items */}
      <div className="flex-1 p-4">
        <div className="space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="font-medium">{tab.label}</span>
                )}
                {isCollapsed && isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 w-1 h-8 bg-gradient-to-b from-blue-400 to-purple-400 rounded-r-full"
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center space-x-2 text-xs text-gray-400">
          <Settings className="w-4 h-4" />
          {!isCollapsed && <span>v1.0.0</span>}
        </div>
      </div>
    </motion.nav>
  );
};

const LoadingSpinner = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="flex items-center justify-center h-64"
  >
    <div className="flex flex-col items-center space-y-4">
      <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
      <p className="text-gray-400">Carregando dados...</p>
      <button
        onClick={() => {
          console.log('🔄 Forçando carregamento manual...');
          window.location.reload();
        }}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Forçar Recarregamento
      </button>
    </div>
  </motion.div>
);

const ErrorMessage = ({ error, onRetry }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="text-center py-12"
  >
    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-900/30 flex items-center justify-center">
      <X className="w-8 h-8 text-red-400" />
    </div>
    <h3 className="text-lg font-medium text-red-400 mb-2">
      Erro ao carregar dados
    </h3>
    <p className="text-gray-400 mb-4 max-w-md mx-auto">
      {error?.message || 'Ocorreu um erro inesperado. Verifique a conexão com o servidor.'}
    </p>
    <button
      onClick={onRetry}
      className="btn-primary"
    >
      Tentar Novamente
    </button>
  </motion.div>
);

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  // Hook personalizado para gerenciar dados
  const {
    opportunities,
    marketStats,
    systemHealth,
    alerts,
    cacheStats,
    stats,
    isConnected,
    isLoading,
    error,
    lastUpdate,
    connectionStatus,
    refresh,
    reconnect,
    clearError
  } = useArbitrageData();

  const renderContent = () => {
    // Debug: Log do estado atual
    console.log('🔍 App.jsx - renderContent chamado:');
    console.log(`   isLoading: ${isLoading}`);
    console.log(`   systemHealth: ${!!systemHealth}`);
    console.log(`   marketStats: ${!!marketStats}`);
    console.log(`   opportunities.length: ${opportunities.length}`);
    console.log(`   error: ${!!error}`);
    console.log(`   activeTab: ${activeTab}`);

    // Mostrar loading apenas no carregamento inicial (quando não há dados algum)
    const showLoading = isLoading && !systemHealth && !marketStats && !opportunities.length;
    console.log(`   showLoading: ${showLoading}`);
    
    if (showLoading) {
      console.log('⚠️  Renderizando LoadingSpinner');
      return <LoadingSpinner />;
    }

    // Mostrar erro apenas se for crítico e não houver dados
    const showError = error && !systemHealth && !marketStats && !opportunities.length;
    console.log(`   showError: ${showError}`);
    
    if (showError) {
      console.log('⚠️  Renderizando ErrorMessage');
      return <ErrorMessage error={error} onRetry={refresh} />;
    }

    console.log('✅ Renderizando conteúdo normal');

    switch (activeTab) {
      case 'dashboard':
        console.log('📊 Renderizando Dashboard');
        return (
          <Dashboard
            stats={stats}
            marketStats={marketStats}
            systemHealth={systemHealth}
            cacheStats={cacheStats}
            lastUpdate={lastUpdate}
            isLoading={isLoading}
          />
        );
      
      case 'monitor':
        console.log('📈 Renderizando Monitor');
        return (
          <Monitor
            opportunities={opportunities}
            isLoading={isLoading}
            error={error}
            onRefresh={refresh}
          />
        );
      
      case 'health':
        console.log('🏥 Renderizando SystemHealth');
        return (
          <SystemHealth
            systemHealth={systemHealth}
            cacheStats={cacheStats}
            marketStats={marketStats}
            isLoading={isLoading}
          />
        );
      
      case 'alerts':
        console.log('🔔 Renderizando AlertPanel');
        return (
          <AlertPanel
            alerts={alerts}
            systemHealth={systemHealth}
            isConnected={isConnected}
          />
        );
      
      case 'debug':
        console.log('🐛 Renderizando DebugPanel');
        return (
          <DebugPanel
            opportunities={opportunities}
            marketStats={marketStats}
            systemHealth={systemHealth}
            cacheStats={cacheStats}
            stats={stats}
            isLoading={isLoading}
            error={error}
            refresh={refresh}
          />
        );
      
      default:
        console.log('📊 Renderizando Dashboard (default)');
        return <Dashboard {...{ stats, marketStats, systemHealth, cacheStats, lastUpdate, isLoading }} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      {/* Navigation Sidebar */}
      <Navigation 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isCollapsed={isNavCollapsed}
        setIsCollapsed={setIsNavCollapsed}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Connection Status Bar */}
        <ConnectionStatus
          isConnected={isConnected}
          connectionStatus={connectionStatus}
          onReconnect={reconnect}
          error={error}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-6 py-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-800 px-6 py-4">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <div className="flex items-center space-x-4">
              <span>DeFi Arbitrage Monitor</span>
              <span>•</span>
              <span>Monitoramento em tempo real</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={refresh}
                disabled={isLoading}
                className="flex items-center space-x-1 hover:text-white transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Atualizar</span>
              </button>
              
              <button
                onClick={clearError}
                className="hover:text-white transition-colors"
              >
                Limpar Erros
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;