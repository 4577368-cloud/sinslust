function StockBasicInfo({ stock, brokerChannel, onBrokerChannelChange, onPriceUpdate }) {
  const [isEditingPrice, setIsEditingPrice] = React.useState(false);
  const [editPrice, setEditPrice] = React.useState('');

  const handlePriceEdit = () => {
    setEditPrice(stock.currentPrice?.toString() || '');
    setIsEditingPrice(true);
  };

  const handlePriceSave = () => {
    const newPrice = parseFloat(editPrice);
    if (!isNaN(newPrice) && newPrice > 0) {
      onPriceUpdate(newPrice);
    }
    setIsEditingPrice(false);
  };

  const handlePriceCancel = () => {
    setIsEditingPrice(false);
    setEditPrice('');
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div>
        <span className="text-sm text-[var(--text-secondary)]">购入渠道</span>
        <select
          value={brokerChannel}
          onChange={(e) => onBrokerChannelChange(e.target.value)}
          className="min-w-[120px] max-w-[200px] mt-1 px-2 py-1 text-sm border border-[var(--border-color)] rounded"
        >
          <option value="futu">富途</option>
          <option value="longbridge">长桥</option>
          <option value="boc">中银</option>
        </select>
      </div>
      <div>
        <span className="text-sm text-[var(--text-secondary)]">股票市场</span>
        <p className="mt-1 text-sm font-medium">
          {stock.market === 'US' ? '美股' : stock.market === 'HK' ? '港股' : 'A股'}
        </p>
      </div>
      <div>
        <span className="text-sm text-[var(--text-secondary)]">股票代码</span>
        <p className="mt-1 text-sm font-medium">{stock.symbol}</p>
      </div>
      <div>
        <span className="text-sm font-medium text-[var(--text-secondary)]">当前价格</span>
        <div className="flex items-center gap-2">
          {isEditingPrice ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.001"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                className="w-20 px-1 py-1 text-xs border border-[var(--border-color)] rounded"
                placeholder="0.000"
                autoFocus
              />
              <button
                onClick={handlePriceSave}
                className="text-green-600 hover:text-green-800 p-1"
                title="保存"
              >
                <div className="icon-check text-xs"></div>
              </button>
              <button
                onClick={handlePriceCancel}
                className="text-red-600 hover:text-red-800 p-1"
                title="取消"
              >
                <div className="icon-x text-xs"></div>
              </button>
            </div>
          ) : (
            <button
              onClick={handlePriceEdit}
              className="text-sm font-bold text-[var(--primary-color)] hover:text-blue-700 flex items-center gap-1 transition-colors"
              title="点击编辑价格"
            >
              {stock.market === 'US' ? '$' : stock.market === 'CN' ? '¥' : ''}{formatPrice(stock.currentPrice || 0)}
              <div className="icon-edit text-xs"></div>
            </button>
          )}
          {stock.marketData?.isMock && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded">模拟</span>
          )}
        </div>
      </div>
    </div>
  );
}

function MarketDataSection({ stock }) {
  if (!stock.marketData || Object.keys(stock.marketData).length === 0) return null;
  
  const hasExtendedData = stock.marketData.previousClose !== undefined;
  const hasTechnicalIndicators = stock.technicalIndicators && 
    (stock.technicalIndicators.ma5 > 0 || stock.technicalIndicators.ma10 > 0 || stock.technicalIndicators.rsi > 0);
  
  return (
    <div className="mb-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
        <div className="text-center">
          <span className="text-xs font-medium text-[var(--text-secondary)] block mb-2">
            开盘价
            {stock.marketData.isManual && (
              <span className="ml-1 text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded">手动</span>
            )}
          </span>
          <p className="text-lg font-bold text-gray-800">
            {stock.market === 'US' ? '$' : stock.market === 'CN' ? '¥' : ''}{formatPrice(stock.marketData.open || 0)}
          </p>
        </div>
        <div className="text-center">
          <span className="text-xs font-medium text-[var(--text-secondary)] block mb-2">最高价</span>
          <p className="text-lg font-bold text-green-600">
            {stock.market === 'US' ? '$' : stock.market === 'CN' ? '¥' : ''}{formatPrice(stock.marketData.high || 0)}
          </p>
        </div>
        <div className="text-center">
          <span className="text-xs font-medium text-[var(--text-secondary)] block mb-2">最低价</span>
          <p className="text-lg font-bold text-red-600">
            {stock.market === 'US' ? '$' : stock.market === 'CN' ? '¥' : ''}{formatPrice(stock.marketData.low || 0)}
          </p>
        </div>
        <div className="text-center">
          <span className="text-xs font-medium text-[var(--text-secondary)] block mb-2">成交量</span>
          <p className="text-lg font-bold text-gray-700">{formatVolume(stock.marketData.volume || 0)}</p>
        </div>
      </div>
      
      {hasExtendedData && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
          <div className="text-center">
            <span className="text-xs font-medium text-[var(--text-secondary)] block mb-2">前收盘价</span>
            <p className="text-lg font-bold text-gray-800">
              {stock.market === 'US' ? '$' : stock.market === 'CN' ? '¥' : ''}{formatPrice(stock.marketData.previousClose || 0)}
            </p>
          </div>
          <div className="text-center">
            <span className="text-xs font-medium text-[var(--text-secondary)] block mb-2">涨跌额</span>
            <p className={`text-lg font-bold ${(stock.marketData.change || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {(stock.marketData.change || 0) >= 0 ? '+' : ''}{stock.market === 'US' ? '$' : stock.market === 'CN' ? '¥' : ''}{formatPrice(stock.marketData.change || 0)}
            </p>
          </div>
          <div className="text-center">
            <span className="text-xs font-medium text-[var(--text-secondary)] block mb-2">涨跌幅</span>
            <p className={`text-lg font-bold ${(stock.marketData.changePercent || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {(stock.marketData.changePercent || 0) >= 0 ? '+' : ''}{(stock.marketData.changePercent || 0).toFixed(2)}%
            </p>
          </div>
        </div>
      )}
      
      {hasTechnicalIndicators && (
        <div className="grid grid-cols-3 gap-4 mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="text-center">
            <span className="text-xs font-medium text-[var(--text-secondary)] block mb-2">MA5</span>
            <p className="text-lg font-bold text-blue-700">
              {stock.market === 'US' ? '$' : stock.market === 'CN' ? '¥' : ''}{formatPrice(stock.technicalIndicators.ma5 || 0)}
            </p>
          </div>
          <div className="text-center">
            <span className="text-xs font-medium text-[var(--text-secondary)] block mb-2">MA10</span>
            <p className="text-lg font-bold text-blue-700">
              {stock.market === 'US' ? '$' : stock.market === 'CN' ? '¥' : ''}{formatPrice(stock.technicalIndicators.ma10 || 0)}
            </p>
          </div>
          <div className="text-center">
            <span className="text-xs font-medium text-[var(--text-secondary)] block mb-2">RSI(14)</span>
            <p className={`text-lg font-bold ${
              stock.technicalIndicators.rsi > 70 ? 'text-red-600' : 
              stock.technicalIndicators.rsi < 30 ? 'text-green-600' : 
              'text-gray-700'
            }`}>
              {(stock.technicalIndicators.rsi || 0).toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function HoldingsAnalysisSection({ stockAnalysis, stock }) {
  return (
    <div className="relative grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6 mb-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="text-center">
        <span className="text-xs font-medium text-[var(--text-secondary)] block mb-2">总成本</span>
        <p className="text-lg font-bold text-gray-800">{formatPrice(stockAnalysis.totalCost, 2)}</p>
      </div>
      <div className="text-center">
        <span className="text-xs font-medium text-[var(--text-secondary)] block mb-2">平均成本</span>
        <p className="text-lg font-bold text-gray-800">{formatPrice(stockAnalysis.avgCost)}</p>
      </div>
      <div className="text-center">
        <span className="text-xs font-medium text-[var(--text-secondary)] block mb-2">盈亏保本价</span>
        <p className="text-lg font-bold text-orange-600">{formatPrice(stockAnalysis.breakEvenPrice)}</p>
      </div>
      <div className="text-center">
        <span className="text-xs font-medium text-[var(--text-secondary)] block mb-2">当前市值</span>
        <p className="text-lg font-bold text-blue-600">{formatPrice(stockAnalysis.currentValue, 2)}</p>
      </div>
      <div className="text-center">
        <span className="text-xs font-medium text-[var(--text-secondary)] block mb-2">浮动盈亏</span>
        <p className={`text-lg font-bold ${stockAnalysis.profit >= 0 ? 'profit-positive' : 'profit-negative'}`}>
          {stockAnalysis.profit >= 0 ? '+' : '-'}{formatPrice(Math.abs(stockAnalysis.profit), 2)}
        </p>
        <p className={`text-xs font-medium ${stockAnalysis.profit >= 0 ? 'profit-positive' : 'profit-negative'}`}>
          ({stockAnalysis.profitPercent >= 0 ? '+' : ''}{stockAnalysis.profitPercent.toFixed(2)}%)
        </p>
      </div>
    </div>
  );
}

function PositionsSection({ 
  stock, 
  brokerChannel, 
  onUpdatePosition, 
  onDeletePosition, 
  showPositionForm, 
  setShowPositionForm, 
  editingPosition, 
  setEditingPosition, 
  showBuyFeesDetail, 
  setShowBuyFeesDetail, 
  onAddPosition 
}) {
  return (
    <div className="mb-6" id={`stock-${stock.id}`}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <div className="icon-layers text-lg text-[var(--primary-color)]"></div>
          持仓记录 ({stock.positions?.length || 0})
        </h4>
        <button
          onClick={() => setShowPositionForm(true)}
          className="btn btn-primary btn-sm"
        >
          <div className="icon-plus text-sm"></div>
          
        </button>
      </div>


      {stock.positions && stock.positions.length > 0 ? (
        <div className="space-y-2">
          {stock.positions.map(position => {
            const buyFees = calculateBuyFees(brokerChannel || 'futu', stock.market, position.price, position.shares);
            const totalBuyFees = Object.values(buyFees).reduce((sum, fee) => sum + fee, 0);
            
            return (
              <div key={position.id} className="p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200">
                <div className="mb-2">
                  <div className="flex items-center gap-4 mb-2">
                    <input
                      type="checkbox"
                      checked={position.enabled !== false}
                      onChange={(e) => onUpdatePosition(position.id, { ...position, enabled: e.target.checked })}
                      className="w-4 h-4 accent-blue-500"
                    />
                    <div className="flex-1 grid grid-cols-4 gap-2 text-sm">
                      <div className="text-center">
                        <span className="text-xs font-medium text-[var(--text-secondary)] block">价格</span>
                        <span className="font-bold text-gray-800">
                          {stock.market === 'US' ? '$' : ''}{formatPrice(position.price)}
                        </span>
                      </div>
                      <div className="text-center">
                        <span className="text-xs font-medium text-[var(--text-secondary)] block">股数</span>
                        <span className="font-bold text-gray-800">{position.shares.toLocaleString()}</span>
                      </div>
                      <div className="text-center">
                        <span className="text-xs font-medium text-[var(--text-secondary)] block">日期</span>
                        <span className="font-bold text-gray-800">
                          {new Date(position.date).getMonth() + 1}-{new Date(position.date).getDate()}
                        </span>
                      </div>
                      <div className="text-center">
                        <span className="text-xs font-medium text-[var(--text-secondary)] block">天数</span>
                        <span className="font-bold text-gray-800">
                          {Math.floor(
                            (new Date().setHours(0,0,0,0) - new Date(position.date).setHours(0,0,0,0)) / (1000 * 60 * 60 * 24)
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingPosition(position)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="编辑"
                      >
                        <div className="icon-edit text-xs"></div>
                      </button>
                      <button
                        onClick={() => onDeletePosition(position.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="删除"
                      >
                        <div className="icon-trash-2 text-xs"></div>
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2 text-xs bg-white rounded p-2 border ml-8">
                    <div className="text-center">
                      <span className="text-gray-600 block">成交金额</span>
                      <span className="font-medium">{stock.market === 'US' ? '$' : ''}{formatPrice(position.price * position.shares, 2)}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-gray-600 block">总手续费</span>
                      <span className="font-medium text-orange-600">{stock.market === 'US' ? '$' : ''}{formatPrice(totalBuyFees, 2)}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-gray-600 block">实际成本</span>
                      <span className="font-bold text-red-600">{stock.market === 'US' ? '$' : ''}{formatPrice(position.price * position.shares + totalBuyFees, 2)}</span>
                    </div>
                    <div className="text-center">
                      <button
                        onClick={() => setShowBuyFeesDetail(showBuyFeesDetail === position.id ? null : position.id)}
                        className="text-blue-600 hover:text-blue-800 text-xs underline"
                      >
                        费用详情
                      </button>
                    </div>
                  </div>
                </div>
                
                {showBuyFeesDetail === position.id && (
                  <BuyFeesDetail 
                    buyFees={buyFees}
                    stock={stock}
                    onClose={() => setShowBuyFeesDetail(null)}
                  />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
          <div className="icon-package text-4xl text-gray-300 mb-3 flex justify-center"></div>
          <p className="text-gray-500 mb-4">还没有持仓记录</p>
          <button
            onClick={() => setShowPositionForm(true)}
            className="btn btn-primary btn-sm"
          >
            添加第一个持仓记录
          </button>
        </div>
      )}

      {(showPositionForm || editingPosition) && (
        <PositionForm
          stock={stock}
          position={editingPosition}
          onAdd={(position) => {
            if (editingPosition) {
              onUpdatePosition(editingPosition.id, { ...editingPosition, ...position });
              setEditingPosition(null);
            } else {
              onAddPosition(position);
            }
          }}
          onClose={() => {
            setShowPositionForm(false);
            setEditingPosition(null);
          }}
        />
      )}
    </div>
  );
}

function SellSimulationSection({ 
  sellSimulations, 
  addSellSimulation, 
  updateSellSimulation, 
  removeSellSimulation, 
  stock, 
  brokerChannel, 
  stockAnalysis 
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <div className="icon-calculator text-lg text-green-600"></div>
          卖出模拟
        </h4>
        <button
          onClick={addSellSimulation}
          className="btn btn-success btn-sm"
        >
          <div className="icon-plus text-sm"></div>
          
        </button>
      </div>

      {sellSimulations.length > 0 && (
        <div className="space-y-3">
          {sellSimulations.map(sim => {
            const sellPrice = parseFloat(sim.price) || 0;
            const sellShares = parseFloat(sim.shares) || 0;
            const simulation = sellPrice > 0 && sellShares > 0 
              ? calculateSellSimulation(stock, sellPrice, sellShares, brokerChannel)
              : null;

            return (
              <div key={sim.id} className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">卖出价格</label>
                    <input
                      type="number"
                      step="0.001"
                      value={sim.price}
                      onChange={(e) => updateSellSimulation(sim.id, 'price', e.target.value)}
                      className="w-full px-2 py-1 text-sm border rounded"
                      placeholder="0.000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">卖出股数</label>
                    <input
                      type="number"
                      value={sim.shares}
                      onChange={(e) => updateSellSimulation(sim.id, 'shares', e.target.value)}
                      className="w-full px-2 py-1 text-sm border rounded"
                      placeholder="0"
                      max={stockAnalysis.totalShares}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">盈亏百分比 (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={sim.profitLossPercent}
                      onChange={(e) => updateSellSimulation(sim.id, 'profitLossPercent', e.target.value)}
                      className="w-full px-2 py-1 text-sm border rounded"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={() => removeSellSimulation(sim.id)}
                      className="btn btn-danger btn-sm w-20"

                    >
                      <div className="icon-trash-2 text-sm"></div>
                    </button>
                  </div>
                </div>

                {simulation && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs bg-white rounded p-2 border">
                    <div className="text-center">
                      <span className="text-gray-600 block">成交金额</span>
                      <span className="font-medium">{stock.market === 'US' ? '$' : ''}{formatPrice(simulation.grossAmount, 2)}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-gray-600 block">手续费</span>
                      <span className="font-medium text-orange-600">{stock.market === 'US' ? '$' : ''}{formatPrice(simulation.totalFees, 2)}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-gray-600 block">净收入</span>
                      <span className="font-medium">{stock.market === 'US' ? '$' : ''}{formatPrice(simulation.netAmount, 2)}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-gray-600 block">净盈亏</span>
                      <span className={`font-bold ${simulation.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {simulation.netProfit >= 0 ? '+' : ''}{stock.market === 'US' ? '$' : ''}{formatPrice(simulation.netProfit, 2)}
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="text-gray-600 block">收益率</span>
                      <span className={`font-bold ${simulation.profitPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {simulation.profitPercent >= 0 ? '+' : ''}{simulation.profitPercent.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FeeStructureSection({ brokerChannel, stock }) {
  const feeStructure = getBrokerFeeStructure(brokerChannel, stock.market);

  return (
    <div className="mb-6">
      <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
        <h5 className="font-semibold mb-2 text-sm md:text-base">
          {brokerChannel === 'futu' ? '富途' : brokerChannel === 'longbridge' ? '长桥' : '中银'} - 
          {stock.market === 'US' ? '美股' : '港股'}费率结构
        </h5>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
          {Object.entries(feeStructure).map(([key, value]) => (
            <div key={key} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-b-0">
              <span className="text-xs md:text-sm font-medium text-gray-700 flex-1">{key}</span>
              <span className="text-xs text-gray-900 font-semibold bg-gray-50 px-2 py-1 rounded min-w-[90px] text-right">
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

