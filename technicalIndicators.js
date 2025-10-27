// Technical indicators calculation utilities for HK and CN stocks

// Calculate Simple Moving Average
function calculateSMA(prices, period) {
  if (!prices || prices.length < period) return 0;
  
  const slice = prices.slice(0, period);
  const sum = slice.reduce((acc, price) => acc + price, 0);
  return Math.round((sum / period) * 1000) / 1000;
}

// Calculate Relative Strength Index
function calculateRSI(prices, period = 14) {
  if (!prices || prices.length < period + 1) return 0;
  
  let gains = 0;
  let losses = 0;
  
  // Calculate initial average gain and loss
  for (let i = 1; i <= period; i++) {
    const change = prices[i - 1] - prices[i];
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }
  
  let avgGain = gains / period;
  let avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  
  return Math.round(rsi * 100) / 100;
}

// Get historical data for HK/CN stocks and calculate indicators
async function getHistoricalDataAndIndicators(symbol, market) {
  try {
    console.log(`获取 ${market} ${symbol} 历史数据用于计算技术指标...`);
    
    const formattedSymbol = market === 'HK' 
      ? `hk${symbol.replace(/\D/g, '').padStart(5, '0')}`
      : market === 'CN'
      ? (symbol.startsWith('6') ? 'sh' : 'sz') + symbol.replace(/\D/g, '').padStart(6, '0')
      : symbol;
    
    console.log(`格式化后的股票代码: ${formattedSymbol}`);
    
    // Use Tencent Finance historical data API (last 30 days)
    const apiUrl = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${formattedSymbol},day,,,30,qfq`;
    const proxyUrl = `https://proxy-api.trickle-app.host/?url=${encodeURIComponent(apiUrl)}`;
    
    console.log(`请求历史数据API: ${apiUrl}`);
    
    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(`获取历史数据失败: ${response.status}`);
    }
    
    const text = await response.text();
    console.log(`历史数据API响应前200字符: ${text.substring(0, 200)}`);
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON解析失败:', parseError);
      throw new Error('API返回的数据不是有效的JSON格式');
    }
    
    console.log('解析后的数据结构:', JSON.stringify(data).substring(0, 300));
    
    // Check for different possible data structures
    let dayData = null;
    
    if (data.data && data.data[formattedSymbol]) {
      if (data.data[formattedSymbol].qfqday) {
        dayData = data.data[formattedSymbol].qfqday;
      } else if (data.data[formattedSymbol].day) {
        dayData = data.data[formattedSymbol].day;
      }
    }
    
    if (!dayData || !Array.isArray(dayData) || dayData.length === 0) {
      console.warn(`未找到有效的历史数据，数据结构: ${JSON.stringify(data)}`);
      throw new Error('历史数据格式无效或数据为空');
    }
    
    console.log(`找到 ${dayData.length} 天的历史数据，第一条数据: ${JSON.stringify(dayData[0])}`);
    
    // Extract close prices (format: [date, open, close, high, low, volume])
    const closePrices = dayData.map(item => parseFloat(item[2])).reverse(); // Reverse to get latest first
    
    console.log(`提取到 ${closePrices.length} 个收盘价，前5个: ${closePrices.slice(0, 5).join(', ')}`);
    
    // Calculate indicators
    const ma5 = calculateSMA(closePrices, 5);
    const ma10 = calculateSMA(closePrices, 10);
    const rsi = calculateRSI(closePrices, 14);
    
    console.log(`计算完成 - MA5: ${ma5}, MA10: ${ma10}, RSI: ${rsi}`);
    
    return { ma5, ma10, rsi };
    
  } catch (error) {
    console.error(`获取历史数据和技术指标失败:`, error);
    return { ma5: 0, ma10: 0, rsi: 0 };
  }
}
