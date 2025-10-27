function PortfolioSummary({ summary }) {
  try {
    return (
      <div className="bg-white rounded-lg md:rounded-xl shadow-md border border-gray-300 p-3 md:p-4 mb-4 md:mb-6" data-name="portfolio-summary" data-file="components/PortfolioSummary.js">
        <h2 className="text-base md:text-lg font-bold text-[var(--text-primary)] mb-2 md:mb-3 flex items-center gap-2">
          <div className="icon-pie-chart text-base md:text-lg text-[var(--primary-color)]"></div>
          投资组合总览
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <div className="text-center p-2 md:p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
            <div className="icon-briefcase text-sm md:text-lg text-[var(--primary-color)] mb-1 flex justify-center"></div>
            <span className="text-xs text-[var(--text-secondary)] block mb-1">持仓股票</span>
            <p className="text-sm md:text-base font-bold text-[var(--primary-color)]">{summary.stockCount}只</p>
            {summary.stockCount > 1 && (
              <div className="text-xs mt-1 space-y-0">
                <div className="text-[var(--success-color)]">盈利: {summary.profitableStocks || 0}只</div>
                <div className="text-[var(--danger-color)]">亏损: {summary.losingStocks || 0}只</div>
              </div>
            )}
          </div>
          
          <div className="text-center p-2 md:p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
            <div className="icon-dollar-sign text-sm md:text-lg text-orange-600 mb-1 flex justify-center"></div>
            <span className="text-xs text-[var(--text-secondary)] block mb-1">总投入</span>
            <p className="text-sm md:text-base font-bold text-orange-800">{formatPrice(summary.totalCost, 2)}</p>
          </div>
          
          <div className="text-center p-2 md:p-3 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
            <div className="icon-trending-up text-sm md:text-lg text-purple-600 mb-1 flex justify-center"></div>
            <span className="text-xs text-[var(--text-secondary)] block mb-1">当前市值</span>
            <p className="text-sm md:text-base font-bold text-purple-800">{formatPrice(summary.totalValue, 2)}</p>
          </div>
          
          <div className={`text-center p-2 md:p-3 rounded-lg border ${
            summary.totalProfit >= 0 
              ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-200' 
              : 'bg-gradient-to-br from-red-50 to-red-100 border-red-200'
          }`}>
            <div className={`text-sm md:text-lg mb-1 flex justify-center ${
              summary.totalProfit >= 0 
                ? 'icon-trending-up text-[var(--success-color)]' 
                : 'icon-trending-down text-[var(--danger-color)]'
            }`}></div>
            <span className="text-xs text-[var(--text-secondary)] block mb-1">总盈亏</span>
            <p className={`text-sm md:text-base font-bold ${
              summary.totalProfit >= 0 ? 'profit-positive' : 'profit-negative'
            }`}>
              {summary.totalProfit >= 0 ? '+' : '-'}{formatPrice(Math.abs(summary.totalProfit), 2)}
            </p>
            <p className={`text-xs font-medium ${
              summary.totalProfit >= 0 ? 'profit-positive' : 'profit-negative'
            }`}>
              ({summary.totalProfitPercent >= 0 ? '+' : ''}{summary.totalProfitPercent.toFixed(2)}%)
            </p>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error('PortfolioSummary component error:', error);
    return null;
  }
}