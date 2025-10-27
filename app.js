class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-4">We're sorry, but something unexpected happened.</p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-black"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  try {
    const [portfolio, setPortfolio] = React.useState([]);
    const [showAddModal, setShowAddModal] = React.useState(false);
    const [isRefreshing, setIsRefreshing] = React.useState(false);

    React.useEffect(() => {
      const savedPortfolio = loadPortfolio();
      setPortfolio(savedPortfolio);
    }, []);

    const handleAddStock = (stockData) => {
      const newStock = {
        id: Date.now().toString(),
        ...stockData,
        positions: [],
        currentPrice: 0,
        marketData: {}
      };
      
      const updatedPortfolio = [...portfolio, newStock];
      setPortfolio(updatedPortfolio);
      savePortfolio(updatedPortfolio);
      setShowAddModal(false);
    };

    const handleUpdateStock = (stockId, updatedStock) => {
      const updatedPortfolio = portfolio.map(stock =>
        stock.id === stockId ? updatedStock : stock
      );
      setPortfolio(updatedPortfolio);
      savePortfolio(updatedPortfolio);
    };

    const handleDeleteStock = (stockId) => {
      const updatedPortfolio = portfolio.filter(stock => stock.id !== stockId);
      setPortfolio(updatedPortfolio);
      savePortfolio(updatedPortfolio);
    };

    const handleRefreshAll = async () => {
      setIsRefreshing(true);
      console.log('开始批量刷新所有股票价格和技术指标...');
      
      const updatedPortfolio = [];
      
      for (const stock of portfolio) {
        try {
          console.log(`正在刷新股票 ${stock.symbol} 的价格...`);
          const priceData = await getStockPrice(stock.symbol, stock.market);
          
          let indicators = stock.technicalIndicators;
          
          // Fetch technical indicators for HK and CN stocks
          if (stock.market === 'HK' || stock.market === 'CN') {
            try {
              console.log(`正在获取 ${stock.symbol} 的技术指标...`);
              indicators = await getHistoricalDataAndIndicators(stock.symbol, stock.market);
              console.log(`${stock.symbol} 技术指标获取成功:`, indicators);
            } catch (error) {
              console.error(`获取 ${stock.symbol} 技术指标失败:`, error);
            }
          }
          
          updatedPortfolio.push({
            ...stock,
            currentPrice: priceData.price,
            marketData: priceData,
            technicalIndicators: indicators
          });
          
          console.log(`${stock.symbol} 价格更新成功: ${priceData.price}`);
        } catch (error) {
          console.error(`获取股票 ${stock.symbol} 价格失败:`, error);
          updatedPortfolio.push(stock);
        }
      }
      
      setPortfolio(updatedPortfolio);
      savePortfolio(updatedPortfolio);
      setIsRefreshing(false);
      console.log('批量刷新完成');
    };

    const portfolioSummary = calculatePortfolioSummary(portfolio);

    return (
      <div className="min-h-screen bg-gray-50" data-name="app" data-file="app.js">
        <div className="container mx-auto px-2 md:px-4 py-3 md:py-8">
          {/* Header */}
          <div className="mb-4 md:mb-8">
            <div className="flex items-center gap-2 md:gap-4 mb-3 md:mb-4">
              <img 
                src="https://imgus.tangbuy.com/static/images/2025-09-26/e9e9e871b0b2477697e4b59f6da02ab5-17588742994027430860421454933872.png"
                alt="股小蜜 Logo"
                className="w-8 h-8 md:w-12 md:h-12 rounded-lg shadow-md"
              />
              <h1 className="text-lg md:text-3xl font-bold text-[var(--text-primary)]">
                股小蜜～懂理财，更懂你！
              </h1>
            </div>
            




            <div className="flex flex-wrap gap-2 md:gap-4 items-center justify-between">
              <div className="flex flex-wrap gap-2 md:gap-3">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="btn btn-primary flex items-center gap-1 md:gap-2"
                >
                  <div className="icon-plus text-sm md:text-lg"></div>
                  <span className="hidden sm:inline">新增股票</span>
                  <span className="sm:hidden">新增</span>
                </button>
                
                <button
                  onClick={handleRefreshAll}
                  disabled={isRefreshing || portfolio.length === 0}
                  className="btn btn-success flex items-center gap-1 md:gap-2 disabled:opacity-50"
                >
                  <div className={`icon-refresh-cw text-sm md:text-lg ${isRefreshing ? 'animate-spin' : ''}`}></div>
                  <span className="hidden sm:inline">{isRefreshing ? '刷新中...' : '刷新价格'}</span>
                  <span className="sm:hidden">{isRefreshing ? '刷新' : '刷新'}</span>
                </button>

                
                <button
                  onClick={() => window.location.href = 'ziwei.html'}
                  className="btn btn-primary flex items-center gap-1 md:gap-2"
                  style={{backgroundColor: '#7c3aed'}}
                >
                  <div className="icon-sparkles text-sm md:text-lg"></div>
                  <span className="hidden sm:inline">紫微斗数</span>
                  <span className="sm:hidden">排盘</span>
                </button>

              </div>
            </div>
          </div>

          {/* Stock Navigation */}
          {portfolio.length > 1 && (
            <StockNavigation portfolio={portfolio} />
          )}

          {/* Portfolio Summary */}
          {portfolio.length > 0 && (
            <PortfolioSummary summary={portfolioSummary} />
          )}

          {/* Stock Cards */}
          <div className="space-y-6">
            {portfolio.length === 0 ? (
              <div className="text-center py-8 md:py-12">
                <div className="icon-trending-up text-4xl md:text-6xl text-gray-300 mb-3 md:mb-4 flex justify-center"></div>
                <h3 className="text-lg md:text-xl font-semibold text-gray-500 mb-2">
                  还没有添加任何股票
                </h3>
                <p className="text-sm md:text-base text-gray-400 mb-4 md:mb-6 px-4">
                  点击"新增股票"开始管理您的投资组合
                </p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="btn btn-primary"
                >
                  新增第一只股票
                </button>
              </div>
            ) : (
              portfolio.map(stock => (
                <StockCard
                  key={stock.id}
                  stock={stock}
                  onUpdate={(updatedStock) => handleUpdateStock(stock.id, updatedStock)}
                  onDelete={() => handleDeleteStock(stock.id)}
                />
              ))
            )}
          </div>

          {/* Add Stock Modal */}
          {showAddModal && (
            <AddStockModal
              onAdd={handleAddStock}
              onClose={() => setShowAddModal(false)}
            />
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error('App component error:', error);
    return null;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);