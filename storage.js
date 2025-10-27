// Local storage utility functions for portfolio management
const PORTFOLIO_STORAGE_KEY = 'stock_portfolio_data';

function savePortfolio(portfolio) {
  try {
    const dataToSave = {
      portfolio: portfolio,
      lastUpdated: new Date().toISOString(),
      version: '1.0'
    };
    localStorage.setItem(PORTFOLIO_STORAGE_KEY, JSON.stringify(dataToSave));
    console.log('投资组合数据已保存');
  } catch (error) {
    console.error('保存投资组合数据失败:', error);
  }
}

function loadPortfolio() {
  try {
    const savedData = localStorage.getItem(PORTFOLIO_STORAGE_KEY);
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      console.log('投资组合数据已加载, 最后更新:', parsedData.lastUpdated);
      return parsedData.portfolio || [];
    }
    return [];
  } catch (error) {
    console.error('加载投资组合数据失败:', error);
    return [];
  }
}

function clearPortfolio() {
  try {
    localStorage.removeItem(PORTFOLIO_STORAGE_KEY);
    console.log('投资组合数据已清除');
  } catch (error) {
    console.error('清除投资组合数据失败:', error);
  }
}

function exportPortfolio() {
  try {
    const portfolio = loadPortfolio();
    const dataStr = JSON.stringify(portfolio, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `stock_portfolio_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    console.log('投资组合数据导出成功');
  } catch (error) {
    console.error('导出投资组合数据失败:', error);
  }
}