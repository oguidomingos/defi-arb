import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Info, 
  Bell,
  X,
  Volume2,
  VolumeX,
  Settings,
  Clock,
  TrendingUp,
  Activity
} from 'lucide-react';

const AlertCard = ({ alert, onDismiss, index }) => {
  const getAlertIcon = () => {
    switch (alert.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getAlertClass = () => {
    switch (alert.type) {
      case 'success':
        return 'alert-success';
      case 'warning':
        return 'alert-warning';
      case 'error':
        return 'alert-error';
      case 'info':
      default:
        return 'alert-info';
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      transition={{ delay: index * 0.1 }}
      className={getAlertClass()}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-0.5">
            {getAlertIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="text-sm font-medium text-white">
                {alert.title || 'Alerta do Sistema'}
              </h4>
              <span className="text-xs text-gray-400 flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{formatTime(alert.timestamp)}</span>
              </span>
            </div>
            
            <p className="text-sm text-gray-300 mb-2">
              {alert.message || alert.description}
            </p>
            
            {alert.details && (
              <div className="text-xs text-gray-400 bg-gray-800/50 p-2 rounded">
                <pre className="whitespace-pre-wrap font-mono">
                  {typeof alert.details === 'string' ? alert.details : JSON.stringify(alert.details, null, 2)}
                </pre>
              </div>
            )}
            
            {alert.metadata && (
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(alert.metadata).map(([key, value]) => (
                  <span key={key} className="text-xs bg-gray-700 px-2 py-1 rounded">
                    {key}: {value}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {onDismiss && (
          <button
            onClick={() => onDismiss(alert.id)}
            className="flex-shrink-0 ml-2 p-1 rounded-full hover:bg-gray-700 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>
    </motion.div>
  );
};

const AlertSettings = ({ isOpen, onClose, settings, onSettingsChange }) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="card-glow max-w-md w-full max-h-96 overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Configurações de Alertas</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-700 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Alertas Sonoros</span>
            <button
              onClick={() => onSettingsChange({ ...settings, soundEnabled: !settings.soundEnabled })}
              className={`p-2 rounded-lg transition-colors ${
                settings.soundEnabled ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'
              }`}
            >
              {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Auto-dismiss (segundos)</span>
            <input
              type="number"
              min="0"
              max="60"
              value={settings.autoDismissTime}
              onChange={(e) => onSettingsChange({ ...settings, autoDismissTime: parseInt(e.target.value) })}
              className="w-20 px-2 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm"
            />
          </div>
          
          <div>
            <span className="text-sm text-gray-300 mb-2 block">Tipos de Alerta</span>
            <div className="space-y-2">
              {['success', 'warning', 'error', 'info'].map(type => (
                <label key={type} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.enabledTypes[type]}
                    onChange={(e) => onSettingsChange({
                      ...settings,
                      enabledTypes: { ...settings.enabledTypes, [type]: e.target.checked }
                    })}
                    className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-300 capitalize">{type}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const AlertPanel = ({ alerts: initialAlerts = [], systemHealth, isConnected }) => {
  const [alerts, setAlerts] = useState(initialAlerts);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    soundEnabled: true,
    autoDismissTime: 10,
    enabledTypes: {
      success: true,
      warning: true,
      error: true,
      info: true
    }
  });

  // Adicionar alertas do sistema automaticamente
  useEffect(() => {
    const systemAlerts = [];
    
    // Alert de conexão
    if (!isConnected) {
      systemAlerts.push({
        id: 'connection-lost',
        type: 'error',
        title: 'Conexão Perdida',
        message: 'Conexão com o servidor foi perdida. Tentando reconectar...',
        timestamp: new Date().toISOString(),
        persistent: true
      });
    }
    
    // Alert de saúde do sistema
    if (systemHealth?.status === 'unhealthy') {
      systemAlerts.push({
        id: 'system-unhealthy',
        type: 'warning',
        title: 'Sistema Instável',
        message: 'O sistema está apresentando problemas de performance.',
        timestamp: new Date().toISOString(),
        details: systemHealth.error
      });
    }
    
    // Alert de memória alta
    if (systemHealth?.memory?.heapUsed > 100 * 1024 * 1024) {
      systemAlerts.push({
        id: 'high-memory',
        type: 'warning',
        title: 'Uso Alto de Memória',
        message: `Uso de memória: ${(systemHealth.memory.heapUsed / 1024 / 1024).toFixed(1)} MB`,
        timestamp: new Date().toISOString()
      });
    }
    
    // Adicionar alertas do sistema se não existirem
    setAlerts(prevAlerts => {
      const existingIds = new Set(prevAlerts.map(alert => alert.id));
      const newAlerts = systemAlerts.filter(alert => !existingIds.has(alert.id));
      return [...prevAlerts, ...newAlerts];
    });
  }, [isConnected, systemHealth]);

  // Auto-dismiss de alertas
  useEffect(() => {
    if (settings.autoDismissTime > 0) {
      const timer = setInterval(() => {
        setAlerts(prevAlerts => 
          prevAlerts.filter(alert => {
            if (alert.persistent) return true;
            const alertAge = Date.now() - new Date(alert.timestamp).getTime();
            return alertAge < settings.autoDismissTime * 1000;
          })
        );
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [settings.autoDismissTime]);

  // Adicionar novos alertas externos
  useEffect(() => {
    setAlerts(prevAlerts => {
      const existingIds = new Set(prevAlerts.map(alert => alert.id));
      const newAlerts = initialAlerts.filter(alert => !existingIds.has(alert.id));
      return [...prevAlerts, ...newAlerts];
    });
  }, [initialAlerts]);

  const dismissAlert = (alertId) => {
    setAlerts(prevAlerts => prevAlerts.filter(alert => alert.id !== alertId));
  };

  const clearAllAlerts = () => {
    setAlerts([]);
  };

  const filteredAlerts = alerts.filter(alert => settings.enabledTypes[alert.type]);

  // Criar alertas fictícios se conectado mas sem alertas (para demonstração)
  const displayAlerts = filteredAlerts.length === 0 && isConnected ? [
    {
      id: 'system-ready',
      type: 'success',
      title: 'Sistema Operacional',
      message: 'Todos os serviços estão funcionando normalmente.',
      timestamp: new Date().toISOString()
    },
    {
      id: 'monitoring-active',
      type: 'info',
      title: 'Monitoramento Ativo',
      message: 'Sistema está monitorando oportunidades de arbitragem em tempo real.',
      timestamp: new Date().toISOString()
    }
  ] : filteredAlerts;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <motion.div
            animate={{ rotate: displayAlerts.length > 0 ? [0, 10, -10, 0] : 0 }}
            transition={{ duration: 0.5, repeat: displayAlerts.some(a => a.type === 'error') ? Infinity : 0 }}
          >
            <Bell className="w-6 h-6 text-blue-400" />
          </motion.div>
          <h2 className="text-xl font-semibold text-white">
            Alertas do Sistema
          </h2>
          {displayAlerts.length > 0 && (
            <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
              {displayAlerts.length}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            <Settings className="w-4 h-4 text-gray-400" />
          </button>
          
          {displayAlerts.length > 0 && (
            <button
              onClick={clearAllAlerts}
              className="btn-secondary text-xs px-3 py-1"
            >
              Limpar Todos
            </button>
          )}
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {displayAlerts.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8 text-gray-400"
            >
              <Activity className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p>Nenhum alerta ativo</p>
              <p className="text-sm mt-1">O sistema está funcionando normalmente.</p>
            </motion.div>
          ) : (
            displayAlerts.map((alert, index) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onDismiss={dismissAlert}
                index={index}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <AlertSettings
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            settings={settings}
            onSettingsChange={setSettings}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AlertPanel;