import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown, 
  ArrowRight, 
  Filter,
  Search,
  RefreshCw,
  Target,
  Zap,
  Activity,
  DollarSign,
  Percent,
  Clock
} from 'lucide-react';

const OpportunityCard = ({ opportunity, index }) => {
  const isProfitable = opportunity.expectedProfit > 0;
  // Corrigir o mapeamento do ROI - usar estimatedProfit ou netProfit do backend
  const profitPercentage = opportunity.netProfit || opportunity.estimatedProfit || 0;
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(amount);
  };

  const formatPercentage = (percent) => {
    // Se percent já está em percentual (como vem do backend), não multiplicar por 100
    return `${parseFloat(percent).toFixed(3)}%`;
  };

  const getTypeIcon = () => {
    if (opportunity.type === 'triangular') return <Activity className="w-4 h-4" />;
    if (opportunity.type === 'direct') return <Zap className="w-4 h-4" />;
    return <Target className="w-4 h-4" />;
  };

  const getTypeColor = () => {
    if (opportunity.type === 'triangular') return 'text-orange-400';
    if (opportunity.type === 'direct') return 'text-purple-400';
    return 'text-blue-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.1 }}
      className={`opportunity-card ${isProfitable ? 'opportunity-profitable' : 'opportunity-unprofitable'}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className={`${getTypeColor()}`}>
            {getTypeIcon()}
          </div>
          <span className="text-sm font-medium text-gray-300 capitalize">
            {opportunity.type || 'Desconhecido'}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {isProfitable ? (
            <TrendingUp className="w-4 h-4 text-green-400" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-400" />
          )}
          <span className={`text-sm font-bold ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
            {/* Calcular valor absoluto do lucro baseado no volume */}
            {formatCurrency(
              (opportunity.netProfit || opportunity.estimatedProfit || 0) / 100 *
              (opportunity.volume || opportunity.amount || 1000)
            )}
          </span>
        </div>
      </div>

      {/* Token Path */}
      <div className="mb-3">
        <div className="flex items-center space-x-2 text-sm">
          {opportunity.type === 'DIRECT' ? (
            <>
              <span className="font-mono text-blue-300">
                {opportunity.pair ? opportunity.pair.split('/')[0] : (opportunity.tokenA || 'TOKEN_A')}
              </span>
              <ArrowRight className="w-3 h-3 text-gray-500" />
              <span className="font-mono text-purple-300">
                {opportunity.pair ? opportunity.pair.split('/')[1] : (opportunity.tokenB || 'TOKEN_B')}
              </span>
            </>
          ) : opportunity.type === 'TRIANGULAR' ? (
            <>
              <span className="font-mono text-blue-300">{opportunity.tokens?.[0] || opportunity.tokenA || 'TOKEN_A'}</span>
              <ArrowRight className="w-3 h-3 text-gray-500" />
              <span className="font-mono text-purple-300">{opportunity.tokens?.[1] || opportunity.tokenB || 'TOKEN_B'}</span>
              {(opportunity.tokens?.[2] || opportunity.tokenC) && (
                <>
                  <ArrowRight className="w-3 h-3 text-gray-500" />
                  <span className="font-mono text-orange-300">{opportunity.tokens?.[2] || opportunity.tokenC}</span>
                </>
              )}
            </>
          ) : (
            <>
              <span className="font-mono text-blue-300">{opportunity.tokenA || 'TOKEN_A'}</span>
              <ArrowRight className="w-3 h-3 text-gray-500" />
              <span className="font-mono text-purple-300">{opportunity.tokenB || 'TOKEN_B'}</span>
              {opportunity.tokenC && (
                <>
                  <ArrowRight className="w-3 h-3 text-gray-500" />
                  <span className="font-mono text-orange-300">{opportunity.tokenC}</span>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* DEX Information */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="bg-gray-800/50 p-2 rounded">
          <div className="text-xs text-gray-400 mb-1">DEX Origem</div>
          <div className="text-sm font-medium text-white capitalize">
            {opportunity.buyDex || opportunity.dexA || opportunity.sourceDex || 'Uniswap'}
          </div>
        </div>
        <div className="bg-gray-800/50 p-2 rounded">
          <div className="text-xs text-gray-400 mb-1">DEX Destino</div>
          <div className="text-sm font-medium text-white capitalize">
            {opportunity.sellDex || opportunity.dexB || opportunity.targetDex || 'QuickSwap'}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="text-center">
          <div className="text-gray-400 mb-1">Volume</div>
          <div className="font-mono text-white">
            {formatCurrency(opportunity.volume || opportunity.amount || 1000)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-400 mb-1">ROI</div>
          <div className={`font-mono ${isProfitable ? 'text-green-400' : 'text-red-400'}`}>
            {formatPercentage(profitPercentage)}
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-400 mb-1">Gás</div>
          <div className="font-mono text-white">
            {formatCurrency(opportunity.gasPrice || opportunity.estimatedGas || 0.05)}
          </div>
        </div>
      </div>

      {/* Timestamp */}
      {opportunity.timestamp && (
        <div className="mt-3 pt-2 border-t border-gray-700 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>{new Date(opportunity.timestamp).toLocaleTimeString('pt-BR')}</span>
          </div>
          {opportunity.confidence && (
            <span className="text-yellow-400">
              Confiança: {(opportunity.confidence * 100).toFixed(0)}%
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
};

const EmptyState = ({ isLoading, hasError }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    className="text-center py-12"
  >
    <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
      {isLoading ? (
        <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
      ) : hasError ? (
        <TrendingDown className="w-8 h-8 text-red-400" />
      ) : (
        <Target className="w-8 h-8 text-gray-400" />
      )}
    </div>
    
    <h3 className="text-lg font-medium text-gray-300 mb-2">
      {isLoading ? 'Carregando oportunidades...' : 
       hasError ? 'Erro ao carregar dados' :
       'Nenhuma oportunidade encontrada'}
    </h3>
    
    <p className="text-sm text-gray-400 max-w-md mx-auto">
      {isLoading ? 'Aguarde enquanto analisamos o mercado em busca de oportunidades de arbitragem.' :
       hasError ? 'Verifique a conexão com o servidor e tente novamente.' :
       'O sistema está monitorando continuamente. Novas oportunidades aparecerão aqui quando detectadas.'}
    </p>
  </motion.div>
);

const Monitor = ({ opportunities, isLoading, error, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('profit');

  const filteredAndSortedOpportunities = useMemo(() => {
    let filtered = opportunities.filter(opp => {
      // Extrair tokens para busca baseado no tipo
      let tokensToSearch = [];
      if (opp.type === 'DIRECT' && opp.pair) {
        tokensToSearch = opp.pair.split('/');
      } else if (opp.type === 'TRIANGULAR' && opp.tokens) {
        tokensToSearch = opp.tokens;
      } else {
        tokensToSearch = [opp.tokenA, opp.tokenB, opp.tokenC].filter(Boolean);
      }
      
      const matchesSearch = !searchTerm ||
        tokensToSearch.some(token =>
          token && token.toLowerCase().includes(searchTerm.toLowerCase())
        );
      
      const matchesFilter = filterType === 'all' ||
        (filterType === 'profitable' && opp.expectedProfit > 0) ||
        (filterType === 'unprofitable' && opp.expectedProfit <= 0) ||
        (filterType === 'direct' && (opp.type === 'DIRECT' || opp.type === 'direct')) ||
        (filterType === 'triangular' && (opp.type === 'TRIANGULAR' || opp.type === 'triangular'));
      
      return matchesSearch && matchesFilter;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'profit':
          return (b.expectedProfit || 0) - (a.expectedProfit || 0);
        case 'roi':
          return ((b.netProfit || b.estimatedProfit || 0) - (a.netProfit || a.estimatedProfit || 0));
        case 'volume':
          return (b.volume || b.amount || 0) - (a.volume || a.amount || 0);
        case 'timestamp':
          return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [opportunities, searchTerm, filterType, sortBy]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Monitor de Oportunidades</h2>
          <p className="text-gray-400 text-sm">
            {opportunities.length} oportunidades encontradas • {filteredAndSortedOpportunities.length} exibidas
          </p>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onRefresh}
          disabled={isLoading}
          className="btn-primary flex items-center space-x-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Atualizar</span>
        </motion.button>
      </div>

      {/* Filters */}
      <div className="card-glow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por token..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="all">Todas</option>
              <option value="profitable">Lucrativas</option>
              <option value="unprofitable">Não Lucrativas</option>
              <option value="direct">Diretas</option>
              <option value="triangular">Triangulares</option>
            </select>
          </div>

          {/* Sort */}
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
            >
              <option value="profit">Lucro</option>
              <option value="roi">ROI</option>
              <option value="volume">Volume</option>
              <option value="timestamp">Mais Recente</option>
            </select>
          </div>
        </div>
      </div>

      {/* Opportunities List */}
      <div className="space-y-4">
        <AnimatePresence mode="wait">
          {filteredAndSortedOpportunities.length === 0 ? (
            <EmptyState isLoading={isLoading} hasError={!!error} />
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {filteredAndSortedOpportunities.map((opportunity, index) => (
                <OpportunityCard
                  key={opportunity.id || `${opportunity.tokenA}-${opportunity.tokenB}-${index}`}
                  opportunity={opportunity}
                  index={index}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Monitor;