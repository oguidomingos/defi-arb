import React from 'react';
import { motion } from 'framer-motion';
import { 
  Heart, 
  Cpu, 
  MemoryStick, 
  HardDrive, 
  Network, 
  Database,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Zap
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const StatusIndicator = ({ status, size = 'sm' }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'healthy':
      case 'online':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'unhealthy':
      case 'offline':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'healthy':
      case 'online':
        return <CheckCircle className={`${size === 'lg' ? 'w-6 h-6' : 'w-4 h-4'} ${getStatusColor()}`} />;
      case 'warning':
        return <AlertTriangle className={`${size === 'lg' ? 'w-6 h-6' : 'w-4 h-4'} ${getStatusColor()}`} />;
      case 'unhealthy':
      case 'offline':
        return <XCircle className={`${size === 'lg' ? 'w-6 h-6' : 'w-4 h-4'} ${getStatusColor()}`} />;
      default:
        return <div className={`${size === 'lg' ? 'w-6 h-6' : 'w-4 h-4'} rounded-full bg-gray-400`}></div>;
    }
  };

  return getStatusIcon();
};

const MetricChart = ({ data, title, color = '#3b82f6' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-32 flex items-center justify-center text-gray-400">
        <span className="text-sm">Sem dados disponíveis</span>
      </div>
    );
  }

  return (
    <div>
      <h4 className="text-sm font-medium text-gray-300 mb-2">{title}</h4>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="time" 
            stroke="#9ca3af"
            fontSize={12}
            tickFormatter={(value) => new Date(value).toLocaleTimeString('pt-BR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          />
          <YAxis stroke="#9ca3af" fontSize={12} />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1f2937', 
              border: '1px solid #374151',
              borderRadius: '8px'
            }}
            labelFormatter={(value) => new Date(value).toLocaleString('pt-BR')}
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: color }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const ServiceCard = ({ name, status, details = {}, icon: Icon }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    whileHover={{ scale: 1.02 }}
    className="card p-4"
  >
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center space-x-2">
        <Icon className="w-5 h-5 text-blue-400" />
        <span className="font-medium text-white capitalize">{name}</span>
      </div>
      <StatusIndicator status={status} />
    </div>
    
    {Object.keys(details).length > 0 && (
      <div className="space-y-1">
        {Object.entries(details).map(([key, value]) => (
          <div key={key} className="flex justify-between text-sm">
            <span className="text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
            <span className="text-gray-300 font-mono">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </span>
          </div>
        ))}
      </div>
    )}
  </motion.div>
);

const SystemHealth = ({ systemHealth, cacheStats, marketStats, isLoading }) => {
  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formatUptime = (seconds) => {
    if (!seconds) return '0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const getOverallHealth = () => {
    if (!systemHealth) return 'unknown';
    
    const servicesStatus = systemHealth.services ? Object.values(systemHealth.services) : [];
    const hasOfflineServices = servicesStatus.includes('offline');
    const memoryUsage = systemHealth.memory?.heapUsed || 0;
    const highMemoryUsage = memoryUsage > 100 * 1024 * 1024; // 100MB threshold
    
    if (hasOfflineServices) return 'unhealthy';
    if (highMemoryUsage || systemHealth.status !== 'healthy') return 'warning';
    return 'healthy';
  };

  // Gerar dados fictícios para gráficos (em um app real, viriam do histórico)
  const generateChartData = (baseValue, variance = 0.1) => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => ({
      time: new Date(now.getTime() - (11 - i) * 30000).toISOString(),
      value: baseValue + (Math.random() - 0.5) * baseValue * variance
    }));
  };

  const memoryData = systemHealth?.memory ? 
    generateChartData(systemHealth.memory.heapUsed / 1024 / 1024, 0.2) : [];
  
  const cacheHitRateData = cacheStats?.hitRate ? 
    generateChartData(cacheStats.hitRate * 100, 0.1) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <motion.div
            animate={{ 
              scale: getOverallHealth() === 'healthy' ? [1, 1.1, 1] : 1,
              rotate: getOverallHealth() === 'unhealthy' ? [0, 5, -5, 0] : 0
            }}
            transition={{ 
              scale: { duration: 2, repeat: Infinity },
              rotate: { duration: 0.5, repeat: Infinity }
            }}
          >
            <Heart className={`w-8 h-8 ${
              getOverallHealth() === 'healthy' ? 'text-green-400' :
              getOverallHealth() === 'warning' ? 'text-yellow-400' :
              'text-red-400'
            }`} />
          </motion.div>
          <div>
            <h2 className="text-2xl font-bold text-white">Saúde do Sistema</h2>
            <p className="text-gray-400">
              Status: <span className={`font-medium ${
                getOverallHealth() === 'healthy' ? 'text-green-400' :
                getOverallHealth() === 'warning' ? 'text-yellow-400' :
                'text-red-400'
              }`}>
                {getOverallHealth() === 'healthy' ? 'Saudável' :
                 getOverallHealth() === 'warning' ? 'Atenção' : 'Crítico'}
              </span>
            </p>
          </div>
        </div>
        
        <div className="text-right text-sm text-gray-400">
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>Uptime: {formatUptime(systemHealth?.uptime)}</span>
          </div>
          <div className="mt-1">
            Última verificação: {systemHealth?.timestamp ? 
              new Date(systemHealth.timestamp).toLocaleTimeString('pt-BR') : 'N/A'}
          </div>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="metric-card">
          <div className="flex items-center justify-between mb-2">
            <Cpu className="w-5 h-5 text-blue-400" />
            <StatusIndicator status={systemHealth?.status} />
          </div>
          <div className="metric-value">
            {isLoading ? '...' : formatUptime(systemHealth?.uptime)}
          </div>
          <div className="metric-label">Tempo Ativo</div>
        </div>
        
        <div className="metric-card">
          <div className="flex items-center justify-between mb-2">
            <MemoryStick className="w-5 h-5 text-purple-400" />
            <StatusIndicator status={
              systemHealth?.memory?.heapUsed > 100 * 1024 * 1024 ? 'warning' : 'healthy'
            } />
          </div>
          <div className="metric-value">
            {isLoading ? '...' : formatBytes(systemHealth?.memory?.heapUsed)}
          </div>
          <div className="metric-label">Memória Usada</div>
        </div>
        
        <div className="metric-card">
          <div className="flex items-center justify-between mb-2">
            <Database className="w-5 h-5 text-green-400" />
            <StatusIndicator status="healthy" />
          </div>
          <div className="metric-value">
            {isLoading ? '...' : `${((cacheStats?.hitRate || 0) * 100).toFixed(1)}%`}
          </div>
          <div className="metric-label">Cache Hit Rate</div>
        </div>
        
        <div className="metric-card">
          <div className="flex items-center justify-between mb-2">
            <Network className="w-5 h-5 text-cyan-400" />
            <StatusIndicator status={marketStats ? 'healthy' : 'warning'} />
          </div>
          <div className="metric-value">
            {isLoading ? '...' : (marketStats?.market?.totalPairs || 0)}
          </div>
          <div className="metric-label">Pares Ativos</div>
        </div>
      </div>

      {/* Services Status */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Status dos Serviços</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {systemHealth?.services ? Object.entries(systemHealth.services).map(([service, status]) => (
            <ServiceCard
              key={service}
              name={service}
              status={status}
              icon={
                service === 'cache' ? Database :
                service === 'graph' ? Network :
                service === 'arbitrage' ? TrendingUp :
                service === 'triangular' ? Activity :
                service === 'blockchain' ? Zap :
                Cpu
              }
            />
          )) : (
            <div className="col-span-full text-center text-gray-400 py-8">
              {isLoading ? 'Carregando serviços...' : 'Nenhum serviço disponível'}
            </div>
          )}
        </div>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-glow"
        >
          <MetricChart
            data={memoryData}
            title="Uso de Memória (MB)"
            color="#8b5cf6"
          />
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-glow"
        >
          <MetricChart
            data={cacheHitRateData}
            title="Taxa de Cache Hit (%)"
            color="#10b981"
          />
        </motion.div>
      </div>

      {/* Detailed Memory Info */}
      {systemHealth?.memory && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card-glow"
        >
          <h3 className="text-lg font-semibold text-white mb-4">Detalhes da Memória</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(systemHealth.memory).map(([key, value]) => (
              <div key={key} className="text-center">
                <div className="text-sm text-gray-400 mb-1 capitalize">
                  {key.replace(/([A-Z])/g, ' $1')}
                </div>
                <div className="text-lg font-mono text-white">
                  {formatBytes(value)}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default SystemHealth;