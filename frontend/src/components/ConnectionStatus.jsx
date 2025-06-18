import React from 'react';
import { motion } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw, AlertCircle } from 'lucide-react';

const ConnectionStatus = ({ 
  isConnected, 
  connectionStatus, 
  onReconnect, 
  error 
}) => {
  const getStatusColor = () => {
    if (error) return 'text-red-400';
    if (isConnected) return 'text-green-400';
    return 'text-yellow-400';
  };

  const getStatusText = () => {
    if (error) return 'Erro de Conexão';
    if (isConnected) return 'Conectado';
    if (connectionStatus?.reconnectAttempts > 0) return 'Reconectando...';
    return 'Desconectado';
  };

  const getStatusIcon = () => {
    if (error) return <AlertCircle className="w-4 h-4" />;
    if (isConnected) return <Wifi className="w-4 h-4" />;
    if (connectionStatus?.reconnectAttempts > 0) return <RefreshCw className="w-4 h-4 animate-spin" />;
    return <WifiOff className="w-4 h-4" />;
  };

  const getConnectionClass = () => {
    if (error) return 'connection-offline';
    if (isConnected) return 'connection-online';
    return 'connection-connecting';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between p-4 card-glow"
    >
      <div className="flex items-center space-x-3">
        <div className={`${getConnectionClass()} flex items-center space-x-2`}>
          <motion.div
            animate={{ 
              scale: isConnected ? [1, 1.1, 1] : 1,
              rotate: connectionStatus?.reconnectAttempts > 0 ? 360 : 0
            }}
            transition={{ 
              scale: { duration: 2, repeat: isConnected ? Infinity : 0 },
              rotate: { duration: 1, repeat: connectionStatus?.reconnectAttempts > 0 ? Infinity : 0 }
            }}
          >
            {getStatusIcon()}
          </motion.div>
          <span className="text-sm font-medium">
            {getStatusText()}
          </span>
        </div>

        {/* Estatísticas de conexão */}
        <div className="hidden md:flex items-center space-x-4 text-xs text-gray-400">
          <span>
            Tentativas: {connectionStatus?.reconnectAttempts || 0}/{connectionStatus?.maxReconnectAttempts || 5}
          </span>
          <span>
            Conexões: {connectionStatus?.totalConnections || 0}
          </span>
        </div>
      </div>

      {/* Botão de reconexão */}
      {(!isConnected || error) && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onReconnect}
          className="btn-secondary text-xs px-3 py-1 flex items-center space-x-1"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Reconectar</span>
        </motion.button>
      )}

      {/* Indicador de erro */}
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="ml-2 px-2 py-1 bg-red-900/30 border border-red-500/30 rounded text-xs text-red-400"
        >
          {error.message}
        </motion.div>
      )}
    </motion.div>
  );
};

export default ConnectionStatus;