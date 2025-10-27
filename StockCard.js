function StockCard({ stock, onUpdate, onDelete }) {
  try {
    const [showPositionForm, setShowPositionForm] = React.useState(false);
    const [brokerChannel, setBrokerChannel] = React.useState(stock.brokerChannel || 'futu');
    const [sellSimulations, setSellSimulations] = React.useState([]);
    const [showFeeStructure, setShowFeeStructure] = React.useState(false);
    const [editingPosition, setEditingPosition] = React.useState(null);
    const [showBuyFeesDetail, setShowBuyFeesDetail] = React.useState(null);


    const handleAddPosition = (position) => {
      const updatedStock = {
        ...stock,
        positions: [...stock.positions, { ...position, id: Date.now().toString() }]
      };
      onUpdate(updatedStock);
      setShowPositionForm(false);
    };

    const handleUpdatePosition = (positionId, updatedPosition) => {
      const updatedStock = {
        ...stock,
        positions: stock.positions.map(pos =>
          pos.id === positionId ? updatedPosition : pos
        )
      };
      onUpdate(updatedStock);
    };

    const handleDeletePosition = (positionId) => {
      const updatedStock = {
        ...stock,
        positions: stock.positions.filter(pos => pos.id !== positionId)
      };
      onUpdate(updatedStock);
    };

    const handleBrokerChannelChange = (newChannel) => {
      setBrokerChannel(newChannel);
      const updatedStock = {
        ...stock,
        brokerChannel: newChannel
      };
      onUpdate(updatedStock);
    };

    const handleManualPriceUpdate = (newPrice) => {
      console.log(`手动更新 ${stock.symbol} 价格: ${newPrice}`);
      const updatedStock = {
        ...stock,
        currentPrice: newPrice,
        marketData: {
          ...stock.marketData,
          price: newPrice,
          isManual: true
        }
      };
      onUpdate(updatedStock);
    };

    const [isRefreshingPrice, setIsRefreshingPrice] = React.useState(false);
    const [isRefreshingIndicators, setIsRefreshingIndicators] = React.useState(false);

    const handleRefreshPrice = async () => {
      setIsRefreshingPrice(true);
      console.log(`开始刷新股票 ${stock.symbol} 的价格...`);
      
      try {
        const priceData = await getStockPrice(stock.symbol, stock.market);
        
        let indicators = stock.technicalIndicators;
        
        // Also fetch technical indicators for HK and CN stocks when refreshing price
        if (stock.market === 'HK' || stock.market === 'CN') {
          try {
            console.log(`同时获取 ${stock.symbol} 的技术指标...`);
            indicators = await getHistoricalDataAndIndicators(stock.symbol, stock.market);
            console.log(`${stock.symbol} 技术指标获取成功:`, indicators);
          } catch (error) {
            console.error(`获取 ${stock.symbol} 技术指标失败:`, error);
          }
        }
        
        onUpdate({
          ...stock,
          currentPrice: priceData.price,
          marketData: priceData,
          technicalIndicators: indicators
        });
        
        if (priceData.isMock) {
          console.warn(`${stock.symbol}: 使用模拟数据，API暂时不可用`);
        } else {
          console.log(`${stock.symbol}: 价格刷新成功，当前价格 ${priceData.price}`);
        }
      } catch (error) {
        console.error(`刷新 ${stock.symbol} 价格失败:`, error);
      } finally {
        setIsRefreshingPrice(false);
      }
    };

    const handleRefreshIndicators = async () => {
      setIsRefreshingIndicators(true);
      console.log(`开始刷新股票 ${stock.symbol} 的技术指标...`);
      
      try {
        let indicators;
        if (stock.market === 'US') {
          indicators = await getUSTechnicalIndicators(stock.symbol);
        } else {
          indicators = await getHistoricalDataAndIndicators(stock.symbol, stock.market);
        }
        
        onUpdate({
          ...stock,
          technicalIndicators: indicators
        });
        
        console.log(`${stock.symbol}: 技术指标刷新成功`, indicators);
      } catch (error) {
        console.error(`刷新 ${stock.symbol} 技术指标失败:`, error);
      } finally {
        setIsRefreshingIndicators(false);
      }
    };

    const stockAnalysis = calculateStockAnalysis(stock, brokerChannel);

    const addSellSimulation = () => {
      const newSim = {
        id: Date.now(),
        price: '',
        shares: '',
        profitLossPercent: ''
      };
      setSellSimulations(prev => [...prev, newSim]);
    };

    const updateSellSimulation = (id, field, value) => {
      setSellSimulations(prev => prev.map(sim => {
        if (sim.id === id) {
          const updatedSim = { ...sim, [field]: value || '' };
          
          if (field === 'price' && value && stockAnalysis.breakEvenPrice > 0) {
            const profitLossPercent = ((parseFloat(value) / stockAnalysis.breakEvenPrice) - 1) * 100;
            updatedSim.profitLossPercent = profitLossPercent.toFixed(2);
          } else if (field === 'profitLossPercent' && value && stockAnalysis.breakEvenPrice > 0) {
            const calculatedPrice = stockAnalysis.breakEvenPrice * (1 + parseFloat(value) / 100);
            updatedSim.price = calculatedPrice.toFixed(3);
          }
          
          return updatedSim;
        }
        return sim;
      }));
    };

    const removeSellSimulation = (id) => {
      setSellSimulations(prev => prev.filter(sim => sim.id !== id));
    };

  return (
    <div className="card" data-name="stock-card" data-file="components/StockCard.js">
        {/* Stock Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-[var(--text-primary)]">
              {stock.symbol}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefreshPrice}
                disabled={isRefreshingPrice}
                className="btn btn-success btn-sm disabled:opacity-50"
                title="刷新价格"
              >
                <div className={`icon-refresh-cw text-sm ${isRefreshingPrice ? 'animate-spin' : ''}`}></div>
              </button>
              <button
                onClick={handleRefreshIndicators}
                disabled={isRefreshingIndicators}
                className="btn btn-primary btn-sm disabled:opacity-50"
                title="刷新技术指标"
              >
                <div className={`icon-activity text-sm ${isRefreshingIndicators ? 'animate-spin' : ''}`}></div>
              </button>
              <button onClick={onDelete} className="btn btn-danger text-sm">
                <div className="icon-trash-2 text-sm"></div>
              </button>
            </div>
          </div>
          
          <StockBasicInfo 
            stock={stock} 
            brokerChannel={brokerChannel} 
            onBrokerChannelChange={handleBrokerChannelChange}
            onPriceUpdate={handleManualPriceUpdate}
          />
        </div>

        <MarketDataSection stock={stock} />
        <HoldingsAnalysisSection stockAnalysis={stockAnalysis} stock={stock} />
        
        <PositionsSection 
          stock={stock}
          brokerChannel={brokerChannel}
          onUpdatePosition={handleUpdatePosition}
          onDeletePosition={handleDeletePosition}
          showPositionForm={showPositionForm}
          setShowPositionForm={setShowPositionForm}
          editingPosition={editingPosition}
          setEditingPosition={setEditingPosition}
          showBuyFeesDetail={showBuyFeesDetail}
          setShowBuyFeesDetail={setShowBuyFeesDetail}
          onAddPosition={handleAddPosition}
        />

        <SellSimulationSection 
          sellSimulations={sellSimulations}
          addSellSimulation={addSellSimulation}
          updateSellSimulation={updateSellSimulation}
          removeSellSimulation={removeSellSimulation}
          stock={stock}
          brokerChannel={brokerChannel}
          stockAnalysis={stockAnalysis}
        />

        <FeeStructureSection 
          brokerChannel={brokerChannel}
          stock={stock}
          showFeeStructure={showFeeStructure}
          setShowFeeStructure={setShowFeeStructure}
        />
      </div>
    );
  } catch (error) {
    console.error('StockCard component error:', error);
    return null;
  }
}