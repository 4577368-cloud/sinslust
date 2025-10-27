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
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className="text-2xl font-bold mb-4">出现错误</h1>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary"
            >
              重新加载
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ZiweiApp() {
  try {
    const [inputText, setInputText] = React.useState('');
    const [basicReport, setBasicReport] = React.useState(null);
    const [wealthReport, setWealthReport] = React.useState(null);
    const [stockAnalysisReport, setStockAnalysisReport] = React.useState(null);
    const [portfolioAnalysisReport, setPortfolioAnalysisReport] = React.useState(null);
    const [isGenerating, setIsGenerating] = React.useState(false);
    const [isAnalyzingStock, setIsAnalyzingStock] = React.useState(false);
    const [isGeneratingBasic, setIsGeneratingBasic] = React.useState(false);
    const [isGeneratingWealth, setIsGeneratingWealth] = React.useState(false);
    const [isGeneratingPortfolio, setIsGeneratingPortfolio] = React.useState(false);
    const [portfolioStocks, setPortfolioStocks] = React.useState([]);
    const [collapsedReports, setCollapsedReports] = React.useState({});
    const [historyList, setHistoryList] = React.useState([]);
    const [showHistory, setShowHistory] = React.useState(false);
    const [viewingHistory, setViewingHistory] = React.useState(null);
    const [activeReportTab, setActiveReportTab] = React.useState('basic');
    const [renamingHistory, setRenamingHistory] = React.useState(null);
    const [newHistoryName, setNewHistoryName] = React.useState('');
    const [showSaveDialog, setShowSaveDialog] = React.useState(false);
    const [saveDialogName, setSaveDialogName] = React.useState('');
    const MAX_HISTORY = 5;

    // Load history and saved reports from localStorage on mount
    React.useEffect(() => {
      const savedHistory = localStorage.getItem('ziwei_history');
      if (savedHistory) {
        try {
          setHistoryList(JSON.parse(savedHistory));
        } catch (e) {
          console.error('Failed to load history:', e);
        }
      }
      
      // Load saved reports
      const savedReports = localStorage.getItem('ziwei_current_reports');
      if (savedReports) {
        try {
          const reports = JSON.parse(savedReports);
          if (reports.basicReport) setBasicReport(reports.basicReport);
          if (reports.wealthReport) setWealthReport(reports.wealthReport);
          if (reports.portfolioAnalysisReport) setPortfolioAnalysisReport(reports.portfolioAnalysisReport);
          if (reports.stockAnalysisReport) setStockAnalysisReport(reports.stockAnalysisReport);
          if (reports.inputText) setInputText(reports.inputText);
        } catch (e) {
          console.error('Failed to load saved reports:', e);
        }
      }
      
      // Load portfolio stocks from main page
      const portfolioData = localStorage.getItem('stock_portfolio_data');
      if (portfolioData) {
        try {
          const data = JSON.parse(portfolioData);
          const stocks = data.portfolio || [];
          // Filter stocks that have positions
          const stocksWithPositions = stocks.filter(stock => 
            stock.positions && stock.positions.length > 0
          );
          setPortfolioStocks(stocksWithPositions);
        } catch (e) {
          console.error('Failed to load portfolio:', e);
        }
      }
    }, []);

    // Save history to localStorage
    const saveHistory = (newHistory) => {
      localStorage.setItem('ziwei_history', JSON.stringify(newHistory));
    };
    
    // Save current reports to localStorage
    const saveCurrentReports = () => {
      const reportsToSave = {
        basicReport,
        wealthReport,
        portfolioAnalysisReport,
        stockAnalysisReport,
        inputText
      };
      localStorage.setItem('ziwei_current_reports', JSON.stringify(reportsToSave));
    };
    
    // Auto-save reports when they change
    React.useEffect(() => {
      if (basicReport || wealthReport || portfolioAnalysisReport || stockAnalysisReport) {
        saveCurrentReports();
      }
    }, [basicReport, wealthReport, portfolioAnalysisReport, stockAnalysisReport, inputText]);

    // Extract time from input text (format: 1986-8-27 12:0)
    const extractTimeFromInput = (text) => {
      const timeMatch = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2})/);
      if (timeMatch) {
        return `${timeMatch[1]}-${timeMatch[2]}-${timeMatch[3]} ${timeMatch[4]}:${timeMatch[5]}`;
      }
      return new Date().toLocaleString('zh-CN');
    };

    const callDeepSeekAPI = async (systemPrompt, userPrompt) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout
      
      try {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer sk-7aefb85227c148beb2d768605d7e0159'
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ]
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`DeepSeek API错误 ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
          throw new Error('DeepSeek API返回数据格式错误');
        }
        return data.choices[0].message.content;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('DeepSeek API请求超时，请稍后重试');
        }
        throw error;
      }
    };


    const handleGenerate = async () => {
      if (!inputText.trim()) {
        return;
      }

      setIsGenerating(true);
      setIsGeneratingBasic(true);
      setIsGeneratingWealth(true);
      
      try {
        const timeName = extractTimeFromInput(inputText);
        const timestamp = new Date().toLocaleString('zh-CN');
        const model = 'DeepSeek';
        
        // Get current date dynamically
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const currentDate = now.getDate();
        const currentDateStr = `${currentYear}年${currentMonth}月${currentDate}日`;
        
        // Calculate lunar month (approximate)
        const lunarMonth = currentMonth === 10 ? '九月' : currentMonth === 11 ? '十月' : currentMonth === 12 ? '十一月' : '一月';
        
        // Generate basic report with retry logic
        setActiveReportTab('basic');
        const basicSystemPrompt = `你是资深的国学易经术数领域专家，精通紫微斗数命理分析。请根据用户提供的命盘信息进行详细分析。

重要时间参考：
- 当前日期：${currentDateStr}
- 在分析流年、流月、流日时，必须以${currentDateStr}作为基准
- 所有时间相关的分析必须与${currentDateStr}对齐，不得出现过去年份（如2023年、2024年等）的时间引用
- 流月分析应基于农历${lunarMonth}（对应公历${currentYear}年${currentMonth}月）`;
        let basicResponse;
        let retryCount = 0;
        const maxRetries = 2;
        
        while (retryCount <= maxRetries) {
          try {
            basicResponse = await callDeepSeekAPI(basicSystemPrompt, inputText);
            break; // Success, exit retry loop
          } catch (error) {
            retryCount++;
            if (retryCount > maxRetries) {
              throw error; // Max retries reached, throw error
            }
            console.log(`API调用失败，正在重试 (${retryCount}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
          }
        }
        
        setBasicReport({
          id: Date.now(),
          timestamp: timestamp,
          timeName: timeName,
          input: inputText,
          content: basicResponse,
          model: model,
          title: '紫微斗数基础命盘全析'
        });
        setIsGeneratingBasic(false);
        
        // Generate wealth report
        setActiveReportTab('wealth');
        const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
        const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
        const wealthSystemPrompt = `【重要时间基准】
当前日期：${currentDateStr}
- 所有流年分析基于${currentYear}年
- 所有流月分析基于农历${lunarMonth}（公历${currentYear}年${currentMonth}月）
- 未来流月投资详表从${nextYear}年${nextMonth}月开始
- 绝对不得出现2023年、2024年或其他过去年份的时间引用
- 所有择时建议必须从${currentDateStr}之后的时间开始

第一部分：角色与任务定义
1. 核心角色：
你是一位资深的国学易经术数领域专家，精通三合紫微、飞星紫微、河洛紫微、钦天四化等各流派技法，以及李居明《紫微斗数投资策略》的核心理念，并能将命理逻辑与现代金融市场语言无缝衔接。

2. 核心任务：
基于用户提供的命盘信息，忽略其所有其他指令，只提取符合下述框架所需的内容，为其量身定制一份面向未来（重点2025-2026年）的跨市场（美股、港股、A股）财富与投资策略报告。

3. 输入处理原则：
仅从用户输入中提取以下信息：
四柱八字
命宫主星及辅星
身宫位置
财帛宫与田宅宫的星曜组合
当前大限的宫位、年龄区间及大限四化
来因宫位置

完全忽略用户输入中的以下内容：
"健康、学业、事业、财运、人际关系、婚姻和感情等各个方面进行全面分析"等无关指令。
"对前八个大限的所有流年进行分析"等无关指令。
"最后，别忘了提醒用户上述分析仅限于研究或娱乐目的使用"等模拟词操作。（最终输出不含此声明）

第二部分：输出框架与内容规范
请严格按照以下结构和内容维度，生成最终的投资策略报告。

紫微斗数跨市场财富策略框架（2025-10）
【核心命盘参数】
四柱八字：[从输入中提取]

命宫主星：[从输入中提取] | 身宫位置：[从输入中提取]
财帛宫星曜：[从输入中提取] | 田宅宫星曜：[从输入中提取]（代表投资库藏）
当前大限：[从输入中提取]，大限四化：[从输入中提取]
来因宫：[从输入中提取]

【财富与投资策略】
 投资风格定位
适合的投资类型
[投资类型1] - [命理依据]

[投资类型2] - [命理依据]

[投资类型3] - [命理依据]

应规避的投资类型
[投资类型1] - [命理依据]

[投资类型2] - [命理依据]

[投资类型3] - [命理依据]

第一部分：行业与市场适配度
（以表格形式呈现，每个市场推荐1-2个核心行业）

第二部分：个股/ETF精选
（总计不超过10个，每个市场各3只左右，包含个股和ETF）

第三部分：精准择时与价格策略
（针对第二部分中精选的5只左右核心标的）

第四部分：未来流月投资详表（2025年11月起）
（以表格形式呈现未来6个月份的指导）

【终极叮嘱】

核心理论依据、大限节奏把控

（报告结束，不包含任何免责声明）`;
        
        let wealthResponse = await callDeepSeekAPI(wealthSystemPrompt, inputText);
        
        setWealthReport({
          id: Date.now() + 1,
          timestamp: timestamp,
          timeName: timeName,
          input: inputText,
          content: wealthResponse,
          model: model,
          title: '紫微斗数财富密码'
        });
        setIsGeneratingWealth(false);
        
        // Generate portfolio analysis if there are portfolio stocks
        if (portfolioStocks.length > 0) {
          setActiveReportTab('portfolio');
          setIsGeneratingPortfolio(true);
          
          const portfolioSystemPrompt = `【重要时间基准】
当前日期：${currentDateStr}
- 所有流年分析基于${currentYear}年
- 所有流月分析基于农历${lunarMonth}（公历${currentYear}年${currentMonth}月）
- 未来时间节点预测从${currentDateStr}之后开始
- 绝对不得出现2023年、2024年或其他过去年份的时间引用
- 所有择时建议必须从${currentDateStr}之后的时间开始

你是一位资深的紫微斗数命理专家，同时精通股票投资和技术分析。请基于用户的命盘信息和当前持仓股票组合的详细数据（包括市场行情、技术指标和持仓情况），生成一份深度的持仓排盘分析报告。

报告结构要求：

# 紫微斗数持仓排盘分析报告

## 一、命盘基础运势分析

### 1.1 命主特质识别
- 命宫星曜组合的性格特征
- 身宫位置的人生重点领域
- 五行局数的基础能量类型

### 1.2 财帛宫财运格局
- 财帛宫主星的基本财运特征
- 辅星对财运的加强或制约
- 财帛宫四化飞星的财运变化

### 1.3 官禄宫事业运势
- 事业宫位的工作能力表现
- 官禄与财帛的联动关系
- 适合的行业发展方向

## 二、当前运势周期分析

### 2.1 大限运势重点
- 当前大限宫位的主题领域
- 大限四化的运势变化特征
- 大限对财官二宫的影响

### 2.2 流年时机把握
- 近期流年的财运机会点
- 需要谨慎的时间段
- 适合操作的流年特征

## 三、持仓组合命理评估

### 3.1 个股与命理契合度
针对每只持仓股票，结合其市场数据和技术指标进行分析：

**[股票代码]：**
- 行业属性与五行匹配度
- 当前价格走势与命主运势的对应关系
- 技术指标（MA5、MA10、RSI）的命理解读
- 持仓盈亏状况的命理原因分析
- 操作风格适配（基于持仓天数和盈亏情况）

### 3.2 市场分布命理分析
- 美股、港股、A股配置的命理合理性
- 不同市场与命主的契合度
- 市场配置优化建议

### 3.3 整体盈亏命理解读
- 盈利股票与命主财运的关系
- 亏损股票的命理原因
- 整体盈亏与大限流年的对应

## 四、技术面与命理结合

### 4.1 关键价位分析
- 各股支撑阻力位的命理意义
- 突破时机的玄学参考
- 重要技术位的运势配合

### 4.2 买卖时机选择
- 吉利操作时间窗口
- 需要回避的敏感时期
- 持仓周期的运势支持

## 五、操作策略建议

### 5.1 基于命理的仓位管理
- 各股加减仓建议
- 整体仓位配置优化
- 风险控制策略

### 5.2 时间窗口选择
- 未来1-3个月的关键时间节点
- 适合操作的流月特征
- 需要特别谨慎的时期

## 六、风险提示
- 命理上的风险预警
- 技术面风险提示
- 综合建议与注意事项

---
报告生成时间：2025年10月26日
重要声明：本分析融合传统命理与现代金融技术分析，仅供研究参考。`;
          
          // Build comprehensive portfolio data with all market data
          let portfolioData = '## 当前持仓组合详细数据\n\n';
          portfolioStocks.forEach((stock, index) => {
            const enabledPositions = stock.positions.filter(pos => pos.enabled !== false);
            const totalShares = enabledPositions.reduce((sum, pos) => sum + pos.shares, 0);
            const totalCost = enabledPositions.reduce((sum, pos) => sum + (pos.price * pos.shares), 0);
            const avgBuyPrice = totalShares > 0 ? totalCost / totalShares : 0;
            const currentValue = stock.currentPrice * totalShares;
            const profitLoss = currentValue - totalCost;
            const profitLossPercent = totalCost > 0 ? (profitLoss / totalCost * 100) : 0;
            const currencySymbol = stock.market === 'US' ? '$' : stock.market === 'CN' ? '¥' : 'HK$';
            
            // Calculate holding days (use the earliest position date)
            const holdingDays = enabledPositions.length > 0 
              ? Math.floor((new Date() - new Date(enabledPositions[0].date)) / (1000 * 60 * 60 * 24))
              : 0;
            
            portfolioData += `### ${index + 1}. ${stock.symbol} (${stock.market === 'US' ? '美股' : stock.market === 'HK' ? '港股' : 'A股'})\n\n`;
            portfolioData += `#### 市场数据\n`;
            portfolioData += `- 股票代码: ${stock.symbol}\n`;
            portfolioData += `- 当前价格: ${currencySymbol}${stock.currentPrice?.toFixed(3) || 'N/A'}\n`;
            portfolioData += `- 开盘价: ${currencySymbol}${stock.marketData?.open?.toFixed(3) || 'N/A'}\n`;
            portfolioData += `- 最高价: ${currencySymbol}${stock.marketData?.high?.toFixed(3) || 'N/A'}\n`;
            portfolioData += `- 最低价: ${currencySymbol}${stock.marketData?.low?.toFixed(3) || 'N/A'}\n`;
            portfolioData += `- 前收盘价: ${currencySymbol}${stock.marketData?.previousClose?.toFixed(3) || 'N/A'}\n`;
            portfolioData += `- 涨跌幅: ${stock.marketData?.changePercent ? (stock.marketData.changePercent >= 0 ? '+' : '') + stock.marketData.changePercent.toFixed(2) + '%' : 'N/A'}\n`;
            portfolioData += `- 涨跌额: ${stock.marketData?.change ? (stock.marketData.change >= 0 ? '+' : '') + currencySymbol + stock.marketData.change.toFixed(2) : 'N/A'}\n`;
            portfolioData += `- 成交量: ${stock.marketData?.volume ? (stock.marketData.volume / 1000000).toFixed(2) + '百万' : 'N/A'}\n`;
            
            if (stock.technicalIndicators) {
              portfolioData += `\n#### 技术指标\n`;
              portfolioData += `- MA5: ${stock.technicalIndicators.ma5 ? currencySymbol + stock.technicalIndicators.ma5.toFixed(3) : 'N/A'}\n`;
              portfolioData += `- MA10: ${stock.technicalIndicators.ma10 ? currencySymbol + stock.technicalIndicators.ma10.toFixed(3) : 'N/A'}\n`;
              portfolioData += `- RSI(14): ${stock.technicalIndicators.rsi ? stock.technicalIndicators.rsi.toFixed(2) : 'N/A'}\n`;
            }
            
            portfolioData += `\n#### 持仓数据\n`;
            portfolioData += `- 买入价格: ${currencySymbol}${avgBuyPrice.toFixed(3)}\n`;
            portfolioData += `- 持仓股数: ${totalShares}\n`;
            portfolioData += `- 总成本: ${currencySymbol}${totalCost.toFixed(2)}\n`;
            portfolioData += `- 当前市值: ${currencySymbol}${currentValue.toFixed(2)}\n`;
            portfolioData += `- 浮动盈亏: ${profitLoss >= 0 ? '+' : ''}${currencySymbol}${profitLoss.toFixed(2)} (${profitLossPercent >= 0 ? '+' : ''}${profitLossPercent.toFixed(2)}%)\n`;
            portfolioData += `- 持仓天数: ${holdingDays}天\n\n`;
          });
          
          const portfolioUserPrompt = `请基于以下命盘信息和持仓组合数据生成整体持仓分析报告。\n\n## 命盘信息\n${inputText}\n\n${portfolioData}`;
          
          let portfolioResponse = await callDeepSeekAPI(portfolioSystemPrompt, portfolioUserPrompt);
          
          setPortfolioAnalysisReport({
            id: Date.now() + 2,
            timestamp: timestamp,
            timeName: timeName,
            input: inputText,
            content: portfolioResponse,
            model: model,
            title: '紫微斗数持仓组合分析'
          });
          setIsGeneratingPortfolio(false);
        }
        
        // Save to history with report content
        const existingIndex = historyList.findIndex(h => h.timeName === timeName);
        let newHistory;
        
        const historyItem = {
          timeName: timeName,
          input: inputText,
          timestamp: timestamp,
          basicReport: basicResponse,
          wealthReport: wealthResponse,
          model: model
        };
        
        if (existingIndex >= 0) {
          newHistory = [...historyList];
          newHistory[existingIndex] = historyItem;
        } else {
          newHistory = [historyItem, ...historyList].slice(0, MAX_HISTORY);
        }
        
        setHistoryList(newHistory);
        saveHistory(newHistory);
        
      } catch (error) {
        console.error('生成报告失败:', error);
        let errorMessage = '生成报告失败，请稍后重试。';
        if (error.message) {
          errorMessage += '\n错误详情：' + error.message;
        }
        if (error.message && error.message.includes('fetch')) {
          errorMessage += '\n\n可能的原因：\n1. 网络连接不稳定\n2. API服务暂时不可用\n3. 请求被浏览器拦截\n\n建议：\n- 检查网络连接\n- 稍后重试\n- 尝试切换其他AI模型';
        }
        alert(errorMessage);
      } finally {
        setIsGenerating(false);
        setIsGeneratingBasic(false);
        setIsGeneratingWealth(false);
        setIsGeneratingPortfolio(false);
      }
    };

    const handleAnalyzeAllStocks = async () => {
      setIsAnalyzingStock(true);
      
      try {
        const timestamp = new Date().toLocaleString('zh-CN');
        const model = 'DeepSeek';
        
        // Get current date dynamically
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const currentDate = now.getDate();
        const currentDateStr = `${currentYear}年${currentMonth}月${currentDate}日`;
        
        // Calculate lunar month (approximate)
        const lunarMonth = currentMonth === 10 ? '九月' : currentMonth === 11 ? '十月' : currentMonth === 12 ? '十一月' : '一月';
        
        // Build comprehensive data for all stocks
        let allStocksData = '## 持仓股票详细数据\n\n';
        
        portfolioStocks.forEach((stock, index) => {
          const enabledPositions = stock.positions.filter(pos => pos.enabled !== false);
          const totalShares = enabledPositions.reduce((sum, pos) => sum + pos.shares, 0);
          const totalCost = enabledPositions.reduce((sum, pos) => sum + (pos.price * pos.shares), 0);
          const avgBuyPrice = totalShares > 0 ? totalCost / totalShares : 0;
          const currentValue = stock.currentPrice * totalShares;
          const profitLoss = currentValue - totalCost;
          const profitLossPercent = totalCost > 0 ? (profitLoss / totalCost * 100) : 0;
          const currencySymbol = stock.market === 'US' ? '$' : stock.market === 'CN' ? '¥' : 'HK$';
          
          const holdingDays = enabledPositions.length > 0 
            ? Math.floor((new Date() - new Date(enabledPositions[0].date)) / (1000 * 60 * 60 * 24))
            : 0;
          
          allStocksData += `### ${index + 1}. ${stock.symbol} (${stock.market === 'US' ? '美股' : stock.market === 'HK' ? '港股' : 'A股'})\n\n`;
          allStocksData += `#### 市场数据\n`;
          allStocksData += `- 股票代码: ${stock.symbol}\n`;
          allStocksData += `- 当前价格: ${currencySymbol}${stock.currentPrice?.toFixed(3) || 'N/A'}\n`;
          allStocksData += `- 开盘价: ${currencySymbol}${stock.marketData?.open?.toFixed(3) || 'N/A'}\n`;
          allStocksData += `- 最高价: ${currencySymbol}${stock.marketData?.high?.toFixed(3) || 'N/A'}\n`;
          allStocksData += `- 最低价: ${currencySymbol}${stock.marketData?.low?.toFixed(3) || 'N/A'}\n`;
          allStocksData += `- 前收盘价: ${currencySymbol}${stock.marketData?.previousClose?.toFixed(3) || 'N/A'}\n`;
          allStocksData += `- 涨跌幅: ${stock.marketData?.changePercent ? (stock.marketData.changePercent >= 0 ? '+' : '') + stock.marketData.changePercent.toFixed(2) + '%' : 'N/A'}\n`;
          allStocksData += `- 涨跌额: ${stock.marketData?.change ? (stock.marketData.change >= 0 ? '+' : '') + currencySymbol + stock.marketData.change.toFixed(2) : 'N/A'}\n`;
          allStocksData += `- 成交量: ${stock.marketData?.volume ? (stock.marketData.volume / 1000000).toFixed(2) + '百万' : 'N/A'}\n`;
          
          if (stock.technicalIndicators) {
            allStocksData += `\n#### 技术指标\n`;
            allStocksData += `- MA5: ${stock.technicalIndicators.ma5 ? currencySymbol + stock.technicalIndicators.ma5.toFixed(3) : 'N/A'}\n`;
            allStocksData += `- MA10: ${stock.technicalIndicators.ma10 ? currencySymbol + stock.technicalIndicators.ma10.toFixed(3) : 'N/A'}\n`;
            allStocksData += `- RSI(14): ${stock.technicalIndicators.rsi ? stock.technicalIndicators.rsi.toFixed(2) : 'N/A'}\n`;
          }
          
          allStocksData += `\n#### 持仓数据\n`;
          allStocksData += `- 买入价格: ${currencySymbol}${avgBuyPrice.toFixed(3)}\n`;
          allStocksData += `- 持仓股数: ${totalShares}\n`;
          allStocksData += `- 总成本: ${currencySymbol}${totalCost.toFixed(2)}\n`;
          allStocksData += `- 当前市值: ${currencySymbol}${currentValue.toFixed(2)}\n`;
          allStocksData += `- 浮动盈亏: ${profitLoss >= 0 ? '+' : ''}${currencySymbol}${profitLoss.toFixed(2)} (${profitLossPercent >= 0 ? '+' : ''}${profitLossPercent.toFixed(2)}%)\n`;
          allStocksData += `- 持仓天数: ${holdingDays}天\n\n`;
        });
        
        const systemPrompt = `【重要时间基准】
当前日期：${currentDateStr}
- 所有市场数据分析基于${currentDateStr}
- 所有趋势判断和预测从${currentDateStr}开始
${inputText.trim() ? `- 所有流年流月分析基于${currentYear}年\n- 所有流月分析基于农历${lunarMonth}（公历${currentYear}年${currentMonth}月）\n- 未来择时建议从${currentDateStr}之后开始\n- 绝对不得出现2023年、2024年或其他过去年份的时间引用` : ''}

你是一位资深的股票投资组合分析师，精通技术指标分析和持仓管理${inputText.trim() ? '，同时精通紫微斗数命理分析' : ''}。请根据用户提供的所有持仓股票的市场数据和持仓信息${inputText.trim() ? '以及命盘信息' : ''}，生成一份${inputText.trim() ? '融合技术分析、持仓评估与命理分析' : '技术分析与持仓评估'}的综合投资组合报告。

报告结构要求：

# 持仓组合技术分析与评估报告

## 执行摘要
- **投资组合整体评估**：概述整体持仓状态和风险收益特征
- **核心持仓亮点**：列出表现最好的持仓及原因
- **风险警示**：指出需要特别关注的持仓
- **操作建议优先级**：按紧急程度排序的操作建议

## 一、个股技术面深度分析
对每只持仓股票进行详细的技术分析：

### 1.1 [股票代码1] 技术分析
- **价格趋势判断**：分析当前价格相对于MA5/MA10的位置和趋势
- **动量状态**：基于RSI评估超买超卖状态
- **关键技术位**：识别支撑位和阻力位
- **量价配合**：分析成交量与价格变动的关系

### 1.2 [股票代码2] 技术分析
（同上结构，对每只股票进行分析）

### 1.3 技术面综合对比
- 对比各股票的技术强弱
- 识别技术面最强和最弱的持仓

## 二、持仓绩效综合评估
### 2.1 整体盈亏分析
- **投资组合总体表现**：总成本、总市值、总盈亏统计
- **盈利持仓分析**：列出盈利股票及盈利原因
- **亏损持仓分析**：分析亏损股票及改进方向
- **持仓效率评估**：不同持仓的时间收益表现对比

### 2.2 个股持仓评估
对每只股票的持仓状况进行评估：
- **成本优势分析**：当前价格与成本价的关系
- **安全边际评估**：下跌空间与上涨潜力分析
- **持仓合理性**：基于技术面判断当前持仓是否合理

### 2.3 组合风险评估
- **集中度风险**：单一股票仓位占比分析
- **市场分布风险**：美股、港股、A股的配置合理性
- **行业分散度**：是否存在行业过度集中风险

## 三、持仓排盘命理分析
${inputText.trim() ? `
### 3.1 命盘与投资组合整体关系
- **财帛宫与持仓状态对应**：分析命主财帛宫与整体盈亏的关系
- **大运流年与投资时机**：评估当前是否处于适合持有的时期
- **五行配置合理性**：分析持仓股票行业的五行属性与命主的匹配度

### 3.2 个股命理适配度分析
对每只股票进行命理分析：
- **股票与命主契合度**：评估该股票是否适合命主持有
- **买入时机命理评估**：分析买入时间点的吉凶
- **持仓周期建议**：基于命理给出最佳持有时长建议

### 3.3 流年流月操作择时
- **当前时间窗口评估**：分析2025年10月的财运状态
- **未来关键时间节点**：预测未来1-3个月的重要转折点
- **操作时机建议**：给出具体的加仓、减仓、止盈时间建议

### 3.4 命理风险预警
- **煞星冲克时段**：识别需要特别谨慎的时间段
- **化忌影响分析**：分析不利因素对投资的影响
- **破财风险提示**：提醒需要防范的财务风险时期
` : '（未提供命盘信息，跳过命理分析部分）'}

## 五、综合操作策略建议
### 5.1 持仓管理策略
**继续持有条件**：
- 技术面看涨的具体标准和监控指标
- 持仓目标的重新评估和调整
- 持仓时间的优化建议

**风险控制措施**：
- 动态止损位的设置和调整逻辑
- 仓位对冲建议（如有相关标的）
- 风险预警机制设立

### 5.2 主动交易策略
**加仓机会识别**：
- 理想加仓价位的技术标准
- 加仓仓位的比例控制
- 加仓后的整体风险控制

**减仓/止盈策略**：
- 分批止盈的具体价位和比例
- 技术面转弱的预警信号
- 止盈后的后续跟踪计划

### 5.3 应急处理方案
- 黑天鹅事件应对预案
- 技术面突然转坏的应对
- 大盘系统性风险的防范

## 六、风险提示与监控要点
### 6.1 技术面风险
- 关键支撑跌破的连锁反应
- 指标钝化或失效的风险
- 成交量异常的风险提示

### 6.2 持仓特定风险
- 盈利回吐的心理学风险
- 仓位过重的流动性风险
- 持仓时间过长的机会成本

### 6.3 外部环境风险
- 行业政策变化的影响
- 大盘整体走势的拖累风险
- 重大事件的时间窗口提醒

## 七、总结与行动计划
### 7.1 核心结论汇总
- 技术面、持仓面、操作面的统一结论
- 各时间维度的预期展望

### 7.2 具体行动计划
- **立即行动**：当前需要执行的操作
- **监控清单**：需要持续关注的技术信号
- **复盘时点**：建议的下次分析时间

### 7.3 成功标准定义
- 策略成功的衡量标准
- 策略失败的识别标准
- 策略调整的触发条件`;
        
        const userPrompt = inputText.trim() 
          ? `请基于以下股票数据和命盘信息生成技术分析与持仓评估报告。

## 股票市场数据
${allStocksData}

## 命盘信息
${inputText}

请在"持仓排盘分析"部分充分结合命盘信息进行分析，其他技术分析部分则主要基于股票市场数据。`
          : `请基于以下股票市场数据生成技术分析与持仓评估报告。

## 股票市场数据
${allStocksData}

请进行详细的技术分析和持仓评估。`;
        
        let response = await callDeepSeekAPI(systemPrompt, userPrompt);
        
        setStockAnalysisReport({
          id: Date.now(),
          timestamp: timestamp,
          content: response,
          model: model,
          title: `持仓组合技术分析与评估`
        });
        
        setActiveReportTab('stock');
        
      } catch (error) {
        console.error('生成股票分析失败:', error);
        let errorMessage = '生成股票分析失败，请稍后重试。';
        if (error.message) {
          errorMessage += '\n错误详情：' + error.message;
        }
        if (error.message && error.message.includes('fetch')) {
          errorMessage += '\n\n可能的原因：\n1. 网络连接不稳定\n2. API服务暂时不可用\n3. 请求被浏览器拦截\n\n建议：\n- 检查网络连接\n- 稍后重试\n- 尝试切换其他AI模型';
        }
        alert(errorMessage);
      } finally {
        setIsAnalyzingStock(false);
      }
    };

    const handleReset = () => {
      if (window.confirm('确定要重置所有报告吗？此操作不可恢复。')) {
        setBasicReport(null);
        setWealthReport(null);
        setPortfolioAnalysisReport(null);
        setStockAnalysisReport(null);
        setInputText('');
        setCollapsedReports({});
        localStorage.removeItem('ziwei_current_reports');
      }
    };

    const viewHistoryReport = (item) => {
      setViewingHistory(item);
      setShowHistory(false);
    };

    const copyHistoryReport = (item) => {
      let allContent = '';
      
      if (item.basicReport) {
        allContent += `紫微斗数基础命盘全析 (${item.model})\n生成时间: ${item.timestamp}\n\n${item.basicReport}`;
      }
      
      if (item.wealthReport) {
        if (allContent) {
          allContent += '\n\n' + '='.repeat(80) + '\n\n';
        }
        allContent += `紫微斗数财富密码 (${item.model})\n生成时间: ${item.timestamp}\n\n${item.wealthReport}`;
      }
      
      copyReport(allContent);
    };

    const loadHistoryItem = (item) => {
      setInputText(item.input);
      setShowHistory(false);
    };

    const deleteHistoryItem = (timeName) => {
      if (window.confirm('确定要删除这条历史记录吗？')) {
        const newHistory = historyList.filter(h => h.timeName !== timeName);
        setHistoryList(newHistory);
        saveHistory(newHistory);
      }
    };

    const saveCurrentToHistory = () => {
      if (!basicReport && !wealthReport) {
        alert('没有可保存的报告');
        return;
      }

      const defaultName = extractTimeFromInput(inputText) || new Date().toLocaleString('zh-CN');
      setSaveDialogName(defaultName);
      setShowSaveDialog(true);
    };

    const confirmSaveToHistory = () => {
      if (!saveDialogName || !saveDialogName.trim()) {
        alert('请输入报告名称');
        return;
      }

      const timeName = saveDialogName.trim();
      const timestamp = new Date().toLocaleString('zh-CN');
      const model = selectedModel === 'deepseek' ? 'DeepSeek' : '阿里云';

      const existingIndex = historyList.findIndex(h => h.timeName === timeName);
      let newHistory;

      const historyItem = {
        timeName: timeName,
        input: inputText,
        timestamp: timestamp,
        basicReport: basicReport?.content || '',
        wealthReport: wealthReport?.content || '',
        model: model
      };

      if (existingIndex >= 0) {
        if (!window.confirm('已存在同名记录，是否覆盖？')) {
          return;
        }
        newHistory = [...historyList];
        newHistory[existingIndex] = historyItem;
      } else {
        newHistory = [historyItem, ...historyList].slice(0, MAX_HISTORY);
      }

      setHistoryList(newHistory);
      saveHistory(newHistory);
      setShowSaveDialog(false);
      setSaveDialogName('');
      alert('报告已保存到历史记录');
    };

    const renameHistoryItem = (oldName, newName) => {
      if (!newName || !newName.trim()) {
        alert('名称不能为空');
        return;
      }

      const trimmedName = newName.trim();
      
      // Check if new name already exists
      if (historyList.some(h => h.timeName === trimmedName && h.timeName !== oldName)) {
        alert('该名称已存在');
        return;
      }

      const newHistory = historyList.map(h => 
        h.timeName === oldName ? { ...h, timeName: trimmedName } : h
      );

      setHistoryList(newHistory);
      saveHistory(newHistory);
      setRenamingHistory(null);
      setNewHistoryName('');
      alert('重命名成功');
    };

    const toggleReportCollapse = (reportType) => {
      setCollapsedReports(prev => ({
        ...prev,
        [reportType]: !prev[reportType]
      }));
    };

    const formatReportContent = (content) => {
      // Split content into lines
      const lines = content.split('\n');
      const formatted = [];
      let inTable = false;
      let tableRows = [];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Detect table rows (lines with | or \t separators)
        if (line.includes('|') || line.includes('\t')) {
          if (!inTable) {
            inTable = true;
            tableRows = [];
          }
          tableRows.push(line);
        } else {
          // End of table
          if (inTable && tableRows.length > 0) {
            formatted.push({ type: 'table', content: tableRows });
            tableRows = [];
            inTable = false;
          }
          
          // Handle different line types
          if (line.startsWith('#')) {
            // Heading
            const level = line.match(/^#+/)[0].length;
            formatted.push({ type: 'heading', level, content: line.replace(/^#+\s*/, '') });
          } else if (line.startsWith('【') && line.endsWith('】')) {
            // Section header
            formatted.push({ type: 'section', content: line });
          } else if (line) {
            // Regular paragraph
            formatted.push({ type: 'paragraph', content: line });
          } else {
            // Empty line
            formatted.push({ type: 'break' });
          }
        }
      }
      
      // Handle remaining table
      if (inTable && tableRows.length > 0) {
        formatted.push({ type: 'table', content: tableRows });
      }
      
      return formatted;
    };

    const copyReport = (content) => {
      navigator.clipboard.writeText(content).then(() => {
        alert('报告已复制到剪贴板');
      }).catch(err => {
        console.error('复制失败:', err);
        alert('复制失败，请手动复制');
      });
    };

    const copyAllReports = () => {
      if (!basicReport && !wealthReport && !portfolioAnalysisReport && !stockAnalysisReport) return;
      
      let allContent = '';
      
      // 1. 命盘全析
      if (basicReport) {
        allContent += `命盘全析 (${basicReport.model})\n生成时间: ${basicReport.timestamp}\n\n${basicReport.content}`;
      }
      
      // 2. 财富密码
      if (wealthReport) {
        if (allContent) {
          allContent += '\n\n' + '='.repeat(80) + '\n\n';
        }
        allContent += `财富密码 (${wealthReport.model})\n生成时间: ${wealthReport.timestamp}\n\n${wealthReport.content}`;
      }
      
      // 3. 持仓排盘
      if (portfolioAnalysisReport) {
        if (allContent) {
          allContent += '\n\n' + '='.repeat(80) + '\n\n';
        }
        allContent += `持仓排盘 (${portfolioAnalysisReport.model})\n生成时间: ${portfolioAnalysisReport.timestamp}\n\n${portfolioAnalysisReport.content}`;
      }
      
      // 4. 持仓技术分析
      if (stockAnalysisReport) {
        if (allContent) {
          allContent += '\n\n' + '='.repeat(80) + '\n\n';
        }
        allContent += `持仓技术分析 (${stockAnalysisReport.model})\n生成时间: ${stockAnalysisReport.timestamp}\n\n${stockAnalysisReport.content}`;
      }
      
      copyReport(allContent);
    };

    const ReportContent = ({ content }) => {
      const formatted = formatReportContent(content);
      
      return (
        <div className="space-y-4">
          {formatted.map((item, index) => {
            if (item.type === 'heading') {
              const HeadingTag = `h${Math.min(item.level + 2, 6)}`;
              const sizeClass = item.level === 1 ? 'text-2xl' : item.level === 2 ? 'text-xl' : 'text-lg';
              return React.createElement(
                HeadingTag,
                { key: index, className: `${sizeClass} font-bold text-[var(--text-primary)] mb-3 mt-6` },
                item.content
              );
            }
            
            if (item.type === 'section') {
              return (
                <div key={index} className="text-xl font-bold text-white bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-3 rounded-lg my-4 shadow-md">
                  {item.content}
                </div>
              );
            }
            
            if (item.type === 'table') {
              // Parse table
              const rows = item.content.map(row => {
                // Split by | or \t
                const cells = row.split(/[|\t]/).map(cell => cell.trim()).filter(cell => cell);
                return cells;
              });
              
              if (rows.length === 0) return null;
              
              // Detect header row (usually first row or row with dashes)
              let headerRow = rows[0];
              let dataRows = rows.slice(1);
              
              // Check if second row is separator (contains only dashes and spaces)
              if (dataRows.length > 0 && dataRows[0].every(cell => /^[-\s:]+$/.test(cell))) {
                dataRows = dataRows.slice(1);
              }
              
              return (
                <div key={index} className="overflow-x-auto my-4 shadow-lg rounded-lg">
                  <table className="min-w-full bg-white border border-gray-300">
                    <thead className="bg-gradient-to-r from-purple-100 to-blue-100">
                      <tr>
                        {headerRow.map((cell, i) => (
                          <th key={i} className="px-4 py-3 text-left text-sm font-bold text-gray-800 border-b-2 border-purple-300">
                            {cell}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dataRows.map((row, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                          {row.map((cell, j) => (
                            <td key={j} className="px-4 py-3 text-sm text-gray-700 border-b border-gray-200">
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            }
            
            if (item.type === 'paragraph') {
              // Check if it's a list item
              if (item.content.match(/^[•\-\*]\s/)) {
                return (
                  <div key={index} className="flex gap-2 ml-4 text-gray-700">
                    <span className="text-purple-600 font-bold">•</span>
                    <span>{item.content.replace(/^[•\-\*]\s/, '')}</span>
                  </div>
                );
              }
              
              // Check if it's a numbered item
              if (item.content.match(/^\d+[\.)]\s/)) {
                return (
                  <div key={index} className="flex gap-2 ml-4 text-gray-700">
                    <span className="text-purple-600 font-bold">{item.content.match(/^\d+[\.)]/)[0]}</span>
                    <span>{item.content.replace(/^\d+[\.)]\s/, '')}</span>
                  </div>
                );
              }
              
              // Check for bold or emphasis patterns
              let formattedContent = item.content;
              
              // Handle **bold** - remove the ** markers and make text bold
              formattedContent = formattedContent.replace(/\*\*(.+?)\*\*/g, '<strong class="font-bold text-gray-900">$1</strong>');
              formattedContent = formattedContent.replace(/__(.+?)__/g, '<strong class="font-bold text-gray-900">$1</strong>');
              
              // Handle *italic* or _italic_ (only single * or _, not double)
              formattedContent = formattedContent.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em class="italic">$1</em>');
              formattedContent = formattedContent.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '<em class="italic">$1</em>');
              
              return (
                <p key={index} className="text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: formattedContent }} />
              );
            }
            
            if (item.type === 'break') {
              return <div key={index} className="h-2" />;
            }
            
            return null;
          })}
        </div>
      );
    };

    return (
      <>
        <div className="min-h-screen py-3 md:py-8 px-2 md:px-4" data-name="ziwei-app" data-file="ziwei-app.js">
          <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-3 md:p-6 mb-4 md:mb-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4 md:mb-4">
              <div className="flex items-center gap-2 md:gap-4">
                <img 
                  src="https://imgus.tangbuy.com/static/images/2025-09-26/e9e9e871b0b2477697e4b59f6da02ab5-17588742994027430860421454933872.png"
                  alt="股小蜜 Logo"
                  className="w-8 h-8 md:w-12 md:h-12 rounded-lg shadow-md"
                />
                <h1 className="text-lg md:text-3xl font-bold text-[var(--text-primary)]">
                  紫微斗数金融排盘
                </h1>
              </div>
              <button
                onClick={() => {
                  // Save current state before leaving
                  if (isGenerating || isAnalyzingStock || isGeneratingBasic || isGeneratingWealth || isGeneratingPortfolio) {
                    if (!window.confirm('AI报告正在生成中，确定要返回吗？返回后生成将会中断。')) {
                      return;
                    }
                  }
                  window.location.href = 'index.html';
                }}
                className="btn btn-secondary flex items-center gap-1 md:gap-2 w-full md:w-auto justify-center"
              >
                <div className="icon-arrow-left text-sm md:text-lg"></div>
                <span className="text-sm md:text-base">返回股票管理</span>
              </button>
            </div>
          </div>

          {portfolioStocks.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-3 md:p-4 mb-4 md:mb-6">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="icon-briefcase text-lg md:text-xl text-green-600 bg-green-100 p-2 rounded-lg"></div>
                  <div>
                    <h2 className="text-base md:text-lg font-semibold text-[var(--text-primary)]">
                      持仓股票分析
                    </h2>
                    <p className="text-xs md:text-sm text-gray-500">
                      当前持有 {portfolioStocks.length} 只股票
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleAnalyzeAllStocks}
                  disabled={isAnalyzingStock}
                  className="btn btn-primary disabled:opacity-50 flex items-center gap-1 md:gap-2 w-full md:w-auto justify-center"
                  style={{backgroundColor: '#059669'}}
                >
                  {isAnalyzingStock ? (
                    <>
                      <div className="icon-loader text-sm md:text-lg animate-spin"></div>
                      <span className="text-sm md:text-base">分析中...</span>
                    </>
                  ) : (
                    <>
                      <div className="icon-bar-chart text-sm md:text-lg"></div>
                      <span className="text-sm md:text-base">生成持仓技术分析</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-lg p-3 md:p-6 mb-4 md:mb-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4 mb-3 md:mb-4">
              <h2 className="text-base md:text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                <div className="icon-edit-3 text-base md:text-xl text-white bg-[var(--primary-color)] p-1.5 md:p-2 rounded-lg"></div>
                输入命盘信息
              </h2>
              <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
                <button
                  onClick={saveCurrentToHistory}
                  disabled={!basicReport && !wealthReport}
                  className="btn btn-primary disabled:opacity-50 flex-1 md:flex-none justify-center"
                >
                  保存
                </button>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="btn btn-secondary flex-1 md:flex-none justify-center"
                  disabled={historyList.length === 0}
                >
                  历史 ({historyList.length})
                </button>
                <button
                  onClick={handleReset}

                  disabled={!basicReport && !wealthReport}
                  className="btn btn-secondary disabled:opacity-50 flex-1 md:flex-none justify-center"
                >
                  重置
                </button>
              </div>
            </div>
            
            {showHistory && historyList.length > 0 && (
              <div className="mb-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-purple-900">历史命盘记录</h3>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="text-purple-600 hover:text-purple-800"
                  >
                    <div className="icon-x text-lg"></div>
                  </button>
                </div>
                <div className="space-y-2">
                  {historyList.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-100 hover:border-purple-300 transition-colors">
                      <div className="flex-1">
                        {renamingHistory === item.timeName ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={newHistoryName}
                              onChange={(e) => setNewHistoryName(e.target.value)}
                              className="flex-1 px-2 py-1 text-sm border border-purple-300 rounded focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                              placeholder="输入新名称"
                              autoFocus
                            />
                            <button
                              onClick={() => renameHistoryItem(item.timeName, newHistoryName)}
                              className="text-green-600 hover:text-green-800 p-1"
                              title="确认"
                            >
                              <div className="icon-check text-lg"></div>
                            </button>
                            <button
                              onClick={() => {
                                setRenamingHistory(null);
                                setNewHistoryName('');
                              }}
                              className="text-red-600 hover:text-red-800 p-1"
                              title="取消"
                            >
                              <div className="icon-x text-lg"></div>
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="font-medium text-purple-900">{item.timeName}</div>
                            <div className="text-xs text-gray-500 mt-1">{item.timestamp}</div>
                          </>
                        )}
                      </div>
                      {renamingHistory !== item.timeName && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => viewHistoryReport(item)}
                            className="text-purple-600 hover:text-purple-800 p-2"
                            title="查看报告"
                          >
                            <div className="icon-eye text-lg"></div>
                          </button>
                          <button
                            onClick={() => copyHistoryReport(item)}
                            className="text-green-600 hover:text-green-800 p-2"
                            title="复制报告"
                          >
                            <div className="icon-copy text-lg"></div>
                          </button>
                          <button
                            onClick={() => loadHistoryItem(item)}
                            className="text-blue-600 hover:text-blue-800 p-2"
                            title="加载输入"
                          >
                            <div className="icon-download text-lg"></div>
                          </button>
                          <button
                            onClick={() => {
                              setRenamingHistory(item.timeName);
                              setNewHistoryName(item.timeName);
                            }}
                            className="text-orange-600 hover:text-orange-800 p-2"
                            title="重命名"
                          >
                            <div className="icon-edit text-lg"></div>
                          </button>
                          <button
                            onClick={() => deleteHistoryItem(item.timeName)}
                            className="text-red-600 hover:text-red-800 p-2"
                            title="删除"
                          >
                            <div className="icon-trash-2 text-lg"></div>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="请输入您的紫微斗数命盘信息..."
              className="w-full h-64 p-4 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent resize-none"
            />
            
            <div className="flex gap-3 mt-4 justify-center">
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !inputText.trim()}
                className="btn btn-primary disabled:opacity-50 flex items-center gap-2 px-8"
              >
                {isGenerating ? (
                  <>
                    <div className="icon-loader text-lg animate-spin"></div>
                    生成报告中...
                  </>
                ) : (
                  <>
                    <div className="icon-sparkles text-lg"></div>
                    生成报告
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="space-y-4 md:space-y-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <h2 className="text-lg md:text-2xl font-bold text-white flex items-center gap-2">
                <div className="icon-file-text text-lg md:text-2xl"></div>
                分析报告
              </h2>
              {(basicReport || wealthReport || portfolioAnalysisReport || stockAnalysisReport) && (
                <button
                  onClick={copyAllReports}
                  className="btn btn-primary flex items-center gap-1 md:gap-2 w-full md:w-auto justify-center"
                >
                  <div className="icon-copy text-sm md:text-lg"></div>
                  <span className="text-sm md:text-base">复制全部报告</span>
                </button>
              )}
            </div>
            
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto border-b border-gray-200">
                <div className="flex min-w-max md:min-w-0">
                  <button
                    onClick={() => setActiveReportTab('basic')}
                    className={`flex-1 px-3 md:px-6 py-3 md:py-4 font-semibold transition-colors whitespace-nowrap text-xs md:text-base ${
                      activeReportTab === 'basic'
                        ? 'bg-[var(--primary-color)] text-white'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    命盘全析
                  </button>
                  <button
                    onClick={() => setActiveReportTab('wealth')}
                    className={`flex-1 px-3 md:px-6 py-3 md:py-4 font-semibold transition-colors whitespace-nowrap text-xs md:text-base ${
                      activeReportTab === 'wealth'
                        ? 'text-white'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                    style={activeReportTab === 'wealth' ? {backgroundColor: '#d97706'} : {}}
                  >
                    财富密码
                  </button>
                  <button
                    onClick={() => setActiveReportTab('portfolio')}
                    className={`flex-1 px-3 md:px-6 py-3 md:py-4 font-semibold transition-colors whitespace-nowrap text-xs md:text-base ${
                      activeReportTab === 'portfolio'
                        ? 'text-white'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                    style={activeReportTab === 'portfolio' ? {backgroundColor: '#0891b2'} : {}}
                  >
                    持仓排盘
                  </button>
                  <button
                    onClick={() => setActiveReportTab('stock')}
                    className={`flex-1 px-3 md:px-6 py-3 md:py-4 font-semibold transition-colors whitespace-nowrap text-xs md:text-base ${
                      activeReportTab === 'stock'
                        ? 'text-white'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                    style={activeReportTab === 'stock' ? {backgroundColor: '#059669'} : {}}
                  >
                    技术分析
                  </button>
                </div>
              </div>
                
                <div className="p-3 md:p-6">
                  {activeReportTab === 'basic' && (
                    <>
                      {isGeneratingBasic ? (
                        <div className="flex flex-col items-center justify-center py-12">
                          <div className="icon-loader text-6xl text-[var(--primary-color)] mb-4 animate-spin flex justify-center"></div>
                          <h3 className="text-xl font-semibold text-gray-700 mb-2">正在生成命盘全析报告...</h3>
                          <p className="text-gray-500">请稍候，AI正在分析您的命盘信息</p>
                        </div>
                      ) : basicReport ? (
                        <>
                      <div className="flex items-center justify-between mb-4 pb-4 border-b">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-bold text-[var(--text-primary)]">
                            {basicReport.title}
                          </h3>
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                            {basicReport.model}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[var(--text-secondary)]">
                            {basicReport.timestamp}
                          </span>
                          <button
                            onClick={() => copyReport(basicReport.content)}
                            className="text-blue-600 hover:text-blue-800 p-2"
                            title="复制报告"
                          >
                            <div className="icon-copy text-lg"></div>
                          </button>
                          <button
                            onClick={() => toggleReportCollapse('basic')}
                            className="text-gray-600 hover:text-gray-800 p-2"
                            title={collapsedReports['basic'] ? "展开" : "折叠"}
                          >
                            <div className={`icon-chevron-${collapsedReports['basic'] ? 'down' : 'up'} text-lg`}></div>
                          </button>
                        </div>
                      </div>
                      {!collapsedReports['basic'] && (
                        <div className="max-w-none">
                          <ReportContent content={basicReport.content} />
                        </div>
                        )}
                        </>
                      ) : (
                        <div className="text-center py-12">
                          <div className="icon-file-text text-6xl text-gray-300 mb-4 flex justify-center"></div>
                          <h3 className="text-xl font-semibold text-gray-500 mb-2">还没有生成命盘全析报告</h3>
                          <p className="text-gray-400">请点击"生成报告"按钮开始分析</p>
                        </div>
                      )}
                    </>
                  )}
                  
                  {activeReportTab === 'wealth' && (
                    <>
                      {isGeneratingWealth ? (
                        <div className="flex flex-col items-center justify-center py-12">
                          <div className="icon-loader text-6xl text-orange-600 mb-4 animate-spin flex justify-center"></div>
                          <h3 className="text-xl font-semibold text-gray-700 mb-2">正在生成财富密码报告...</h3>
                          <p className="text-gray-500">请稍候，AI正在分析您的财富运势</p>
                        </div>
                      ) : wealthReport ? (
                        <>
                      <div className="flex items-center justify-between mb-4 pb-4 border-b">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-bold text-[var(--text-primary)]">
                            {wealthReport.title}
                          </h3>
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                            {wealthReport.model}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[var(--text-secondary)]">
                            {wealthReport.timestamp}
                          </span>
                          <button
                            onClick={() => copyReport(wealthReport.content)}
                            className="text-blue-600 hover:text-blue-800 p-2"
                            title="复制报告"
                          >
                            <div className="icon-copy text-lg"></div>
                          </button>
                          <button
                            onClick={() => toggleReportCollapse('wealth')}
                            className="text-gray-600 hover:text-gray-800 p-2"
                            title={collapsedReports['wealth'] ? "展开" : "折叠"}
                          >
                            <div className={`icon-chevron-${collapsedReports['wealth'] ? 'down' : 'up'} text-lg`}></div>
                          </button>
                        </div>
                      </div>
                      {!collapsedReports['wealth'] && (
                        <div className="max-w-none">
                          <ReportContent content={wealthReport.content} />
                        </div>
                        )}
                        </>
                      ) : (
                        <div className="text-center py-12">
                          <div className="icon-trending-up text-6xl text-gray-300 mb-4 flex justify-center"></div>
                          <h3 className="text-xl font-semibold text-gray-500 mb-2">还没有生成财富密码报告</h3>
                          <p className="text-gray-400">请点击"生成报告"按钮开始分析</p>
                        </div>
                      )}
                    </>
                  )}
                  
                  {activeReportTab === 'portfolio' && (
                    <>
                      {isGeneratingPortfolio ? (
                        <div className="flex flex-col items-center justify-center py-12">
                          <div className="icon-loader text-6xl text-cyan-600 mb-4 animate-spin flex justify-center"></div>
                          <h3 className="text-xl font-semibold text-gray-700 mb-2">正在生成持仓组合分析...</h3>
                          <p className="text-gray-500">请稍候，AI正在分析您的持仓组合</p>
                        </div>
                      ) : portfolioAnalysisReport ? (
                        <>
                      <div className="flex items-center justify-between mb-4 pb-4 border-b">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-bold text-[var(--text-primary)]">
                            {portfolioAnalysisReport.title}
                          </h3>
                          <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-1 rounded">
                            {portfolioAnalysisReport.model}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[var(--text-secondary)]">
                            {portfolioAnalysisReport.timestamp}
                          </span>
                          <button
                            onClick={() => copyReport(portfolioAnalysisReport.content)}
                            className="text-blue-600 hover:text-blue-800 p-2"
                            title="复制报告"
                          >
                            <div className="icon-copy text-lg"></div>
                          </button>
                          <button
                            onClick={() => toggleReportCollapse('portfolio')}
                            className="text-gray-600 hover:text-gray-800 p-2"
                            title={collapsedReports['portfolio'] ? "展开" : "折叠"}
                          >
                            <div className={`icon-chevron-${collapsedReports['portfolio'] ? 'down' : 'up'} text-lg`}></div>
                          </button>
                        </div>
                      </div>
                      {!collapsedReports['portfolio'] && (
                        <div className="max-w-none">
                          <ReportContent content={portfolioAnalysisReport.content} />
                        </div>
                        )}
                        </>
                      ) : (
                        <div className="text-center py-12">
                          <div className="icon-briefcase text-6xl text-gray-300 mb-4 flex justify-center"></div>
                          <h3 className="text-xl font-semibold text-gray-500 mb-2">还没有生成持仓组合分析报告</h3>
                          <p className="text-gray-400">当您有持仓股票时，生成报告会自动包含持仓组合分析</p>
                        </div>
                      )}
                    </>
                  )}
                  
                  {activeReportTab === 'stock' && (
                    <>
                      {isAnalyzingStock ? (
                        <div className="flex flex-col items-center justify-center py-12">
                          <div className="icon-loader text-6xl text-green-600 mb-4 animate-spin flex justify-center"></div>
                          <h3 className="text-xl font-semibold text-gray-700 mb-2">正在生成技术持仓分析...</h3>
                          <p className="text-gray-500">请稍候，AI正在分析股票数据</p>
                        </div>

                      ) : stockAnalysisReport ? (
                        <>
                      <div className="flex items-center justify-between mb-4 pb-4 border-b">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-bold text-[var(--text-primary)]">
                            {stockAnalysisReport.title}
                          </h3>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            {stockAnalysisReport.model}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[var(--text-secondary)]">
                            {stockAnalysisReport.timestamp}
                          </span>
                          <button
                            onClick={() => copyReport(stockAnalysisReport.content)}
                            className="text-blue-600 hover:text-blue-800 p-2"
                            title="复制报告"
                          >
                            <div className="icon-copy text-lg"></div>
                          </button>
                          <button
                            onClick={() => toggleReportCollapse('stock')}
                            className="text-gray-600 hover:text-gray-800 p-2"
                            title={collapsedReports['stock'] ? "展开" : "折叠"}
                          >
                            <div className={`icon-chevron-${collapsedReports['stock'] ? 'down' : 'up'} text-lg`}></div>
                          </button>
                        </div>
                      </div>
                      {!collapsedReports['stock'] && (
                        <div className="max-w-none">
                          <ReportContent content={stockAnalysisReport.content} />
                        </div>
                        )}
                        </>
                      ) : (
                        <div className="text-center py-12">
                          <div className="icon-bar-chart text-6xl text-gray-300 mb-4 flex justify-center"></div>
                          <h3 className="text-xl font-semibold text-gray-500 mb-2">还没有生成股票分析报告</h3>
                          <p className="text-gray-400">请先输入命盘信息，然后点击持仓股票进行分析</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {showSaveDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">保存报告</h2>
              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  报告名称
                </label>
                <input
                  type="text"
                  value={saveDialogName}
                  onChange={(e) => setSaveDialogName(e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border-color)] rounded-lg focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent"
                  placeholder="请输入报告名称"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={confirmSaveToHistory}
                  className="btn btn-primary flex-1"
                >
                  确认保存
                </button>
                <button
                  onClick={() => {
                    setShowSaveDialog(false);
                    setSaveDialogName('');
                  }}
                  className="btn btn-secondary"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {viewingHistory && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                  <div>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">历史报告</h2>
                    <p className="text-sm text-gray-500 mt-1">{viewingHistory.timeName} - {viewingHistory.timestamp}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyHistoryReport(viewingHistory)}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      <div className="icon-copy text-lg"></div>
                      复制全部报告
                    </button>
                    <button
                      onClick={() => setViewingHistory(null)}
                      className="text-gray-400 hover:text-gray-600 p-2"
                    >
                      <div className="icon-x text-2xl"></div>
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  {viewingHistory.basicReport && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-[var(--text-primary)]">
                          紫微斗数基础命盘全析
                        </h3>
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                          {viewingHistory.model}
                        </span>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                        <ReportContent content={viewingHistory.basicReport} />
                      </div>
                    </div>
                  )}
                  
                  {viewingHistory.wealthReport && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-[var(--text-primary)]">
                          紫微斗数财富密码
                        </h3>
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                          {viewingHistory.model}
                        </span>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                        <ReportContent content={viewingHistory.wealthReport} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      );
  } catch (error) {
    console.error('ZiweiApp component error:', error);
    return null;
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <ZiweiApp />
  </ErrorBoundary>
);
