import axios from 'axios';
import { io } from 'socket.io-client';

class ApiService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.listeners = new Map();
    
    // Configurar cliente HTTP
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptors para tratamento de erros
    this.api.interceptors.response.use(
      response => response,
      error => {
        console.error('API Error:', error);
        if (error.code === 'ECONNREFUSED') {
          this.notifyConnectionError('Servidor offline');
        }
        return Promise.reject(error);
      }
    );

    this.initializeWebSocket();
  }

  // ============ WebSocket Management ============
  initializeWebSocket() {
    console.log('🔌 Inicializando conexão WebSocket...');
    
    this.socket = io(this.baseURL, {
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionDelay: this.reconnectDelay,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.socket.on('connect', () => {
      console.log('✅ WebSocket conectado');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.notifyConnectionStatus(true);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket desconectado:', reason);
      this.isConnected = false;
      this.notifyConnectionStatus(false);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Erro de conexão WebSocket:', error);
      this.reconnectAttempts++;
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('❌ Máximo de tentativas de reconexão atingido');
        this.notifyConnectionError('Falha na conexão com servidor');
      }
    });

    // Event listeners do servidor
    this.socket.on('opportunities_update', (data) => {
      this.notifyListeners('opportunities_update', data);
    });

    this.socket.on('market_stats', (data) => {
      this.notifyListeners('market_stats', data);
    });

    this.socket.on('system_status', (data) => {
      this.notifyListeners('system_status', data);
    });

    this.socket.on('analysis_error', (data) => {
      this.notifyListeners('analysis_error', data);
    });
  }

  // ============ Event Management ============
  addEventListener(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    
    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(callback);
      }
    };
  }

  notifyListeners(event, data) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Erro no listener do evento ${event}:`, error);
        }
      });
    }
  }

  notifyConnectionStatus(isConnected) {
    this.notifyListeners('connection_status', { isConnected });
  }

  notifyConnectionError(message) {
    this.notifyListeners('connection_error', { message });
  }

  // ============ API REST Methods ============
  async getOpportunities() {
    try {
      console.log('📊 Buscando oportunidades...');
      const response = await this.api.get('/api/opportunities');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar oportunidades:', error);
      throw this.handleApiError(error);
    }
  }

  async getMarketStats() {
    try {
      console.log('📈 Buscando estatísticas do mercado...');
      const response = await this.api.get('/api/market-stats');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas:', error);
      throw this.handleApiError(error);
    }
  }

  async getAlerts() {
    try {
      console.log('🔔 Buscando alertas...');
      const response = await this.api.get('/api/alerts');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar alertas:', error);
      throw this.handleApiError(error);
    }
  }

  async getCacheStats() {
    try {
      console.log('💾 Buscando estatísticas do cache...');
      const response = await this.api.get('/api/cache-stats');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar stats do cache:', error);
      throw this.handleApiError(error);
    }
  }

  async getSystemHealth() {
    try {
      console.log('🏥 Verificando saúde do sistema...');
      const response = await this.api.get('/api/system-health');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao verificar saúde do sistema:', error);
      throw this.handleApiError(error);
    }
  }

  // ============ Error Handling ============
  handleApiError(error) {
    if (error.code === 'ECONNREFUSED') {
      return {
        message: 'Servidor offline - Verifique se o backend está rodando',
        type: 'connection_error',
        details: error.message
      };
    }
    
    if (error.response) {
      return {
        message: error.response.data?.error || 'Erro do servidor',
        type: 'server_error',
        status: error.response.status,
        details: error.response.data
      };
    }
    
    if (error.request) {
      return {
        message: 'Erro de rede - Verifique sua conexão',
        type: 'network_error',
        details: error.message
      };
    }
    
    return {
      message: error.message || 'Erro desconhecido',
      type: 'unknown_error',
      details: error
    };
  }

  // ============ Connection Status ============
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }

  // ============ Manual Reconnection ============
  reconnect() {
    console.log('🔄 Tentando reconectar...');
    if (this.socket) {
      this.socket.connect();
    }
  }

  // ============ Cleanup ============
  disconnect() {
    console.log('🔌 Desconectando...');
    if (this.socket) {
      this.socket.disconnect();
    }
    this.listeners.clear();
  }
}

// Singleton instance
const apiService = new ApiService();

export default apiService;