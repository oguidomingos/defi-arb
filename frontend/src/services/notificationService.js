class NotificationService {
  constructor() {
    this.isSupported = 'Notification' in window;
    this.permission = 'default';
    this.isRegistered = false;
  }

  async initialize() {
    if (!this.isSupported) {
      console.log('❌ Notificações não suportadas neste navegador');
      return false;
    }

    try {
      // Verificar permissão atual
      this.permission = Notification.permission;
      
      if (this.permission === 'default') {
        // Solicitar permissão
        this.permission = await Notification.requestPermission();
      }

      if (this.permission === 'granted') {
        // Registrar service worker
        if ('serviceWorker' in navigator) {
          try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            this.isRegistered = true;
            console.log('✅ Service Worker registrado:', registration);
          } catch (error) {
            console.error('❌ Erro ao registrar Service Worker:', error);
          }
        }
        
        console.log('✅ Notificações habilitadas');
        return true;
      } else {
        console.log('❌ Permissão de notificações negada');
        return false;
      }
    } catch (error) {
      console.error('❌ Erro ao inicializar notificações:', error);
      return false;
    }
  }

  async showNotification(title, options = {}) {
    if (!this.isSupported || this.permission !== 'granted') {
      console.log('❌ Notificações não disponíveis');
      return false;
    }

    try {
      const defaultOptions = {
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        vibrate: [200, 100, 200],
        requireInteraction: false,
        silent: false,
        ...options
      };

      if (this.isRegistered && navigator.serviceWorker.controller) {
        // Usar service worker para notificação
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          title,
          options: defaultOptions
        });
      } else {
        // Usar notificação direta
        new Notification(title, defaultOptions);
      }

      console.log('✅ Notificação enviada:', title);
      return true;
    } catch (error) {
      console.error('❌ Erro ao mostrar notificação:', error);
      return false;
    }
  }

  async showOpportunityAlert(opportunity) {
    const title = '🚨 Oportunidade Detectada!';
    const body = `${opportunity.pair} - ${opportunity.expectedProfit}% de lucro`;
    
    return this.showNotification(title, {
      body,
      requireInteraction: true,
      actions: [
        {
          action: 'view',
          title: 'Ver Detalhes'
        },
        {
          action: 'dismiss',
          title: 'Ignorar'
        }
      ]
    });
  }

  async showSystemAlert(message, type = 'info') {
    const icons = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      success: '✅'
    };

    const title = `${icons[type]} Sistema DeFi Arbitrage`;
    
    return this.showNotification(title, {
      body: message,
      requireInteraction: type === 'error'
    });
  }

  async showMarketUpdate(stats) {
    const title = '📈 Atualização do Mercado';
    const body = `${stats.totalOpportunities} oportunidades ativas`;
    
    return this.showNotification(title, {
      body,
      silent: true // Notificação silenciosa para atualizações frequentes
    });
  }

  // Método para testar notificações
  async testNotification() {
    return this.showNotification('🧪 Teste de Notificação', {
      body: 'Esta é uma notificação de teste do sistema DeFi Arbitrage',
      requireInteraction: true
    });
  }

  // Verificar status das notificações
  getStatus() {
    return {
      isSupported: this.isSupported,
      permission: this.permission,
      isRegistered: this.isRegistered,
      canShow: this.isSupported && this.permission === 'granted'
    };
  }
}

// Singleton instance
const notificationService = new NotificationService();

export default notificationService; 