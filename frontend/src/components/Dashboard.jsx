import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Target, 
  Zap, 
  DollarSign, 
  Activity, 
  Clock,
  Database,
  Cpu,
  MemoryStick,
  Network
} from 'lucide-react';

const MetricCard = ({ icon: Icon, label, value, unit = '', trend, loading = false, colorClass = 'text-blue-400' }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ scale: 1.02 }}
    className="metric-card"
  >
    <div className="flex items-center justify-between mb-2">
      <Icon className={`w-5 h-5 ${colorClass}`} />
      {trend !== undefined && (
        <span className={`text-xs px-2 py-1 rounded ${
          trend > 0 ? 'bg-green-900/30 text-green-400' : 
          trend < 0 ? 'bg-red-900/30 text-red-400' : 
          'bg-gray-700 text-gray-400'
        }`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    
    <div className="text-center">
      {loading ? (
        <div className="loading-shimmer h-8 rounded mb-1"></div>
      ) : (
        <div className="metric-value">
          {value}
          {unit && <span className="text-sm text-gray-400 ml-1">{unit}</span>}
        </div>
      )}
      <div className="metric-label">{label}</div>
    </div>
  </motion.div>
);

const SystemMetric = ({ label, value, status = 'online', loading = false }) => (
  <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
    <span className="text-sm text-gray-300">{label}</span>
    <div className="flex items-center space-x-2">
      {loading ? (
        <div className="loading-shimmer w-16 h-4 rounded"></div>
      ) : (
        <span className="text-sm font-mono text-white">{value}</span>
      )}
      <div className={`w-2 h-2 rounded-full ${
        status === 'online' ? 'bg-green-400 animate-pulse' : 
        status === 'warning' ? 'bg-yellow-400' : 
        'bg-red-400'
      }`}></div>
    </div>
  </div>
);

const Dashboard = ({ 
  stats, 
  marketStats, 
  systemHealth, 
  cacheStats,
  lastUpdate,
  isLoading 
}) => {
  const formatNumber = (num) => {
    if (num === undefined || num === null) return '0';
    if (num > 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num > 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (num) => {
    if (num === undefined || num === null) return '$0';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(num);
  };

  const formatMemory = (bytes) => {
    if (!bytes) return '0 MB';
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(1)} MB`;
  };

  const getUptime = () => {
    if (!systemHealth?.uptime) return '0s';
    const seconds = Math.floor(systemHealth.uptime);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const getLastUpdateTime = () => {
    if (!lastUpdate) return 'Nunca';
    const now = new Date();
    const update = new Date(lastUpdate);
    const diff = Math.floor((now - update) / 1000);
    
    if (diff < 60) return `${diff}s atrás`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m atrás`;
    return `${Math.floor(diff / 3600)}h atrás`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <motion.h1 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-3xl font-bold glow-text"
        >
          DeFi Arbitrage Monitor
        </motion.h1>
        
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center space-x-2 text-sm text-gray-400"
        >
          <Clock className="w-4 h-4" />
          <span>Última atualização: {getLastUpdateTime()}</span>
        </motion.div>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={Target}
          label="Oportunidades"
          value={stats?.totalOpportunities || 0}
          loading={isLoading}
          colorClass="text-blue-400"
        />
        
        <MetricCard
          icon={TrendingUp}
          label="Lucrativas"
          value={stats?.profitableOpportunities || 0}
          loading={isLoading}
          colorClass="text-green-400"
        />
        
        <MetricCard
          icon={Zap}
          label="Diretas"
          value={stats?.directOpportunities || 0}
          loading={isLoading}
          colorClass="text-purple-400"
        />
        
        <MetricCard
          icon={Activity}
          label="Triangulares"
          value={stats?.triangularOpportunities || 0}
          loading={isLoading}
          colorClass="text-orange-400"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          icon={DollarSign}
          label="Lucro Médio"
          value={formatCurrency(stats?.avgProfit || 0)}
          loading={isLoading}
          colorClass="text-green-400"
        />
        
        <MetricCard
          icon={Network}
          label="Pares Ativos"
          value={marketStats?.market?.totalPairs || 0}
          loading={isLoading}
          colorClass="text-cyan-400"
        />
        
        <MetricCard
          icon={Database}
          label="Cache Hits"
          value={`${((cacheStats?.hitRate || 0) * 100).toFixed(1)}%`}
          loading={isLoading}
          colorClass="text-indigo-400"
        />
      </div>

      {/* System Health */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-glow"
      >
        <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
          <Cpu className="w-5 h-5 text-blue-400" />
          <span>Saúde do Sistema</span>
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <SystemMetric
              label="Status"
              value={systemHealth?.status || 'unknown'}
              status={systemHealth?.status === 'healthy' ? 'online' : 'offline'}
              loading={isLoading}
            />
            
            <SystemMetric
              label="Uptime"
              value={getUptime()}
              status="online"
              loading={isLoading}
            />
            
            <SystemMetric
              label="Gas Price"
              value={`${formatNumber(marketStats?.network?.gasPrice || 0)} gwei`}
              status="online"
              loading={isLoading}
            />
          </div>
          
          <div className="space-y-3">
            <SystemMetric
              label="Memória Usada"
              value={formatMemory(systemHealth?.memory?.heapUsed)}
              status={
                systemHealth?.memory?.heapUsed > 100 * 1024 * 1024 ? 'warning' : 'online'
              }
              loading={isLoading}
            />
            
            <SystemMetric
              label="Cache Size"
              value={formatNumber(cacheStats?.size || 0)}
              status="online"
              loading={isLoading}
            />
            
            <SystemMetric
              label="Qualidade dos Dados"
              value={`${((marketStats?.market?.dataQuality || 0) * 100).toFixed(1)}%`}
              status={
                (marketStats?.market?.dataQuality || 0) > 0.8 ? 'online' : 
                (marketStats?.market?.dataQuality || 0) > 0.5 ? 'warning' : 'offline'
              }
              loading={isLoading}
            />
          </div>
        </div>
      </motion.div>

      {/* Services Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-glow"
      >
        <h2 className="text-xl font-semibold mb-4 flex items-center space-x-2">
          <MemoryStick className="w-5 h-5 text-green-400" />
          <span>Status dos Serviços</span>
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {systemHealth?.services && Object.entries(systemHealth.services).map(([service, status]) => (
            <div key={service} className="text-center p-3 bg-gray-800/30 rounded-lg">
              <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${
                status === 'online' ? 'bg-green-400 animate-pulse' : 'bg-red-400'
              }`}></div>
              <div className="text-xs text-gray-300 capitalize">{service}</div>
              <div className={`text-xs font-medium ${
                status === 'online' ? 'text-green-400' : 'text-red-400'
              }`}>
                {status}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;