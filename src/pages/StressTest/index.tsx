import services from '@/services/demo';
import {
  PageContainer,
  ProTable,
  ProColumns,
  ProCard,
  StatisticCard,
} from '@ant-design/pro-components';
import { Button, message, Space, Card, Row, Col, Statistic, InputNumber, Form, Table, Tag } from 'antd';
import React, { useState, useEffect } from 'react';
import { useModel } from '@umijs/max';
import { BigNumber } from 'bignumber.js';
import * as XLSX from 'xlsx';

const { Statistic: ProStatistic } = StatisticCard;

interface MarketWithFactor extends API.MarketInfo {
  adjustedCollateralFactor?: number;
}

interface StressTestResult {
  healthyAccounts: number;
  unhealthyAccounts: number;
  totalAccounts: number;
  healthyPercentage: number;
  unhealthyPercentage: number;
}

const StressTestPage: React.FC<unknown> = () => {
  const { marketsInfo, accountDetails } = useModel('global');
  const [markets, setMarkets] = useState<MarketWithFactor[]>([]);
  const [adjustedFactors, setAdjustedFactors] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<StressTestResult | null>(null);
  
  // 从localStorage恢复压力测试相关数据（不恢复账户详情，使用全局状态）
  useEffect(() => {
    // 恢复调整后的抵押因子
    const storedAdjustedFactors = localStorage.getItem('stressTestAdjustedFactors');
    if (storedAdjustedFactors) {
      try {
        const factors = JSON.parse(storedAdjustedFactors);
        if (factors && typeof factors === 'object') {
          setAdjustedFactors(factors);
        }
      } catch (error) {
        console.error('Failed to parse stored adjusted factors:', error);
      }
    }

    // 恢复压力测试结果
    const storedTestResult = localStorage.getItem('stressTestResult');
    if (storedTestResult) {
      try {
        const result = JSON.parse(storedTestResult);
        setTestResult(result);
      } catch (error) {
        console.error('Failed to parse stored test result:', error);
      }
    }
  }, []);

  // 初始化市场数据
  useEffect(() => {
    if (marketsInfo.size > 0) {
      const marketArray: MarketWithFactor[] = Array.from(marketsInfo.values()).map(market => ({
        ...market,
        adjustedCollateralFactor: parseFloat(market.collateral_factor) * 100
      }));
      setMarkets(marketArray);

      // 初始化调整因子
      const initialFactors: Record<string, number> = {};
      marketArray.forEach(market => {
        initialFactors[market.token_address] = parseFloat(market.collateral_factor) * 100;
      });
      setAdjustedFactors(initialFactors);
    }
  }, [marketsInfo]);

  // 处理抵押因子调整
  const handleFactorChange = (tokenAddress: string, value: number | null) => {
    if (value !== null) {
      const newFactors = {
        ...adjustedFactors,
        [tokenAddress]: value
      };
      setAdjustedFactors(newFactors);
      
      // 保存到localStorage
      try {
        localStorage.setItem('stressTestAdjustedFactors', JSON.stringify(newFactors));
      } catch (error) {
        console.error('Failed to save adjusted factors to localStorage:', error);
      }
    }
  };

  // 执行压力测试
  const runStressTest = () => {
    const validAccounts = getValidAccounts();
    
    if (validAccounts.length === 0) {
      message.warning('没有有效的用户账户数据（请确保用户有supply额度）');
      return;
    }

    const totalAccounts = accountDetails.length;
    const validCount = validAccounts.length;
    const excludedCount = totalAccounts - validCount;

    setLoading(true);
    
    // 模拟计算延迟
    setTimeout(() => {
      let healthyCount = 0;
      let unhealthyCount = 0;

      // 对每个有效账户重新计算健康度
      validAccounts.forEach(account => {
        const healthValue = calculateHealthWithAdjustedFactors(account);
        if (healthValue >= 1) {
          unhealthyCount++;
        } else {
          healthyCount++;
        }
      });

      const total = validAccounts.length;
      const result: StressTestResult = {
        healthyAccounts: healthyCount,
        unhealthyAccounts: unhealthyCount,
        totalAccounts: total,
        healthyPercentage: total > 0 ? (healthyCount / total) * 100 : 0,
        unhealthyPercentage: total > 0 ? (unhealthyCount / total) * 100 : 0
      };

      setTestResult(result);
      setLoading(false);
      
      // 保存测试结果到localStorage
      try {
        localStorage.setItem('stressTestResult', JSON.stringify(result));
      } catch (error) {
        console.error('Failed to save test result to localStorage:', error);
      }
      
      let successMsg = `压力测试完成: ${healthyCount}个健康账户, ${unhealthyCount}个风险账户`;
      if (excludedCount > 0) {
        successMsg += ` (已排除${excludedCount}个supply全为0的账户)`;
      }
      message.success(successMsg);
    }, 1000);
  };

  // 导出压力测试结果到Excel
  const exportStressTestToExcel = () => {
    const validAccounts = getValidAccounts();
    
    if (validAccounts.length === 0) {
      message.warning('没有有效的用户账户数据可导出（请确保用户有supply额度）');
      return;
    }

    if (!testResult) {
      message.warning('请先执行压力测试以生成结果');
      return;
    }

    // 构建表头 - 添加测试前后的抵押价值和借款价值列
    const headers = [
      '地址',
      '原健康度',
      '压力测试后健康度',
      '状态变化',
      '测试前总抵押价值',
      '测试前总借款价值',
      '测试后总抵押价值',
      '测试后总借款价值',
      '调整后抵押因子概要'
    ];

    // 构建数据行 - 只使用有效账户
    const dataRows = validAccounts.map(account => {
      const originalHealth = new BigNumber(account.health || 0).toNumber();
      const newHealth = calculateHealthWithAdjustedFactors(account);
      
      const wasHealthy = originalHealth < 1;
      const isHealthy = newHealth < 1;
      
      let statusChange = '';
      if (wasHealthy && !isHealthy) {
        statusChange = '转为风险';
      } else if (!wasHealthy && isHealthy) {
        statusChange = '转为安全';
      } else if (!isHealthy) {
        statusChange = '保持风险';
      } else {
        statusChange = '保持安全';
      }

      // 计算测试前的抵押价值和借款价值
      const originalValues = calculateOriginalCollateralAndBorrowValues(account);
      const originalCollateralValue = originalValues.collateralValue;
      const originalBorrowValue = originalValues.borrowValue;

      // 计算测试后的抵押价值和借款价值
      const adjustedValues = calculateAdjustedCollateralAndBorrowValues(account);
      const adjustedCollateralValue = adjustedValues.collateralValue;
      const adjustedBorrowValue = adjustedValues.borrowValue;

      // 获取调整后的抵押因子概要
      const adjustedFactorSummary = Object.entries(adjustedFactors)
        .filter(([tokenAddress, factor]) => {
          const market = markets.find(m => m.token_address === tokenAddress);
          const originalFactor = market ? parseFloat(market.collateral_factor) * 100 : 100;
          return Math.abs(factor - originalFactor) > 0.01; // 只显示有调整的因子
        })
        .map(([tokenAddress, factor]) => {
          const market = markets.find(m => m.token_address === tokenAddress);
          const symbol = market ? market.underlying_symbol : tokenAddress.slice(0, 8) + '...';
          const originalFactor = market ? parseFloat(market.collateral_factor) * 100 : 100;
          const change = ((factor - originalFactor) / originalFactor * 100).toFixed(1);
          return `${symbol}:${factor.toFixed(1)}%(${change}%)`;
        })
        .join('; ') || '无调整';

      return [
        account.address,
        originalHealth.toFixed(6),
        newHealth.toFixed(6),
        statusChange,
        `$${originalCollateralValue.toFormat(2)}`,
        `$${originalBorrowValue.toFormat(2)}`,
        `$${adjustedCollateralValue.toFormat(2)}`,
        `$${adjustedBorrowValue.toFormat(2)}`,
        adjustedFactorSummary
      ];
    });

    // 添加汇总信息作为单独的工作表
    const summaryHeaders = ['项目', '数值'];
    const summaryData = [
      ['总账户数', testResult.totalAccounts],
      ['健康账户数', testResult.healthyAccounts],
      ['风险账户数', testResult.unhealthyAccounts],
      ['健康账户比例', `${testResult.healthyPercentage.toFixed(2)}%`],
      ['风险账户比例', `${testResult.unhealthyPercentage.toFixed(2)}%`],
      ['测试时间', new Date().toLocaleString()],
      ['有效账户数', validAccounts.length],
      ['排除账户数', excludedCount]
    ];

    // 创建主工作表
    const mainWorksheet = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
    
    // 创建汇总工作表
    const summaryWorksheet = XLSX.utils.aoa_to_sheet([summaryHeaders, ...summaryData]);

    // 设置列宽 - 调整新列的宽度
    const colWidths = headers.map(header => {
      // 对于价值列，设置更宽的宽度
      if (header.includes('价值')) {
        return { wch: Math.max(20, header.length + 5) };
      }
      return { wch: Math.max(15, header.length + 2) };
    });
    mainWorksheet['!cols'] = colWidths;

    const summaryColWidths = summaryHeaders.map(header => ({
      wch: Math.max(20, header.length + 2),
    }));
    summaryWorksheet['!cols'] = summaryColWidths;

    // 创建工作簿并添加工作表
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, mainWorksheet, '压力测试结果');
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, '测试汇总');

    // 生成文件名
    const fileName = `压力测试结果_${new Date().toISOString().slice(0, 10)}.xlsx`;

    // 写入文件并触发下载
    XLSX.writeFile(workbook, fileName);

    let successMsg = `成功导出 ${validAccounts.length} 条压力测试结果到Excel`;
    if (excludedCount > 0) {
      successMsg += ` (已排除${excludedCount}个supply全为0的账户)`;
    }
    message.success(successMsg);
  };

  // 检查账户是否所有币种的supply额度均为0
  const hasNonZeroSupply = (account: API.AccountInfo): boolean => {
    if (!account.tokens || account.tokens.length === 0) {
      return false; // 没有代币数据，视为无效账户
    }
    
    // 检查是否有至少一个代币的supply_balance_underlying > 0
    return account.tokens.some(token => {
      const supplyBalance = new BigNumber(token.supply_balance_underlying || 0);
      return supplyBalance.gt(0); // 大于0
    });
  };

  // 获取有效账户列表（排除所有币种supply额度均为0的账号）
  const getValidAccounts = (): API.AccountInfo[] => {
    return accountDetails.filter(account => hasNonZeroSupply(account));
  };

  // 使用调整后的抵押因子计算账户健康度
  const calculateHealthWithAdjustedFactors = (account: API.AccountInfo): number => {
    let totalBorrowValue = new BigNumber(account.total_borrow_value || 0);
    let totalCollateralValue = new BigNumber(0);

    // 计算调整后的抵押总值
    account.tokens?.forEach(token => {
      if (token.is_entered) {
        const market = markets.find(m => m.token_address === token.token_address);
        if (market) {
          const adjustedFactor = adjustedFactors[market.token_address] || parseFloat(market.collateral_factor) * 100;
          const tokenValue = new BigNumber(token.supply_balance_underlying || 0)
            .times(market.underlying_price || 1);
          
          // 应用调整后的抵押因子
          const collateralValue = tokenValue.times(adjustedFactor / 100);
          totalCollateralValue = totalCollateralValue.plus(collateralValue);
        }
      }
    });

    // 计算健康度：借款总值 / 调整后的抵押总值
    if (totalCollateralValue.isZero()) {
      return totalBorrowValue.isZero() ? 0 : Infinity;
    }

    return totalBorrowValue.div(totalCollateralValue).toNumber();
  };

  // 计算测试前的总抵押价值和总借款价值
  const calculateOriginalCollateralAndBorrowValues = (account: API.AccountInfo): { collateralValue: BigNumber, borrowValue: BigNumber } => {
    let totalCollateralValue = new BigNumber(0);
    let totalBorrowValue = new BigNumber(account.total_borrow_value || 0);

    // 计算原始抵押总值（使用原始抵押因子）
    account.tokens?.forEach(token => {
      if (token.is_entered) {
        const market = markets.find(m => m.token_address === token.token_address);
        if (market) {
          const originalFactor = parseFloat(market.collateral_factor);
          const tokenValue = new BigNumber(token.supply_balance_underlying || 0)
            .times(market.underlying_price || 1);
          
          // 应用原始抵押因子
          const collateralValue = tokenValue.times(originalFactor);
          totalCollateralValue = totalCollateralValue.plus(collateralValue);
        }
      }
    });

    return {
      collateralValue: totalCollateralValue,
      borrowValue: totalBorrowValue
    };
  };

  // 计算测试后的总抵押价值和总借款价值
  const calculateAdjustedCollateralAndBorrowValues = (account: API.AccountInfo): { collateralValue: BigNumber, borrowValue: BigNumber } => {
    let totalCollateralValue = new BigNumber(0);
    let totalBorrowValue = new BigNumber(account.total_borrow_value || 0);

    // 计算调整后的抵押总值（使用调整后的抵押因子）
    account.tokens?.forEach(token => {
      if (token.is_entered) {
        const market = markets.find(m => m.token_address === token.token_address);
        if (market) {
          const adjustedFactor = adjustedFactors[market.token_address] || parseFloat(market.collateral_factor) * 100;
          const tokenValue = new BigNumber(token.supply_balance_underlying || 0)
            .times(market.underlying_price || 1);
          
          // 应用调整后的抵押因子（需要除以100，因为adjustedFactor是百分比）
          const collateralValue = tokenValue.times(adjustedFactor / 100);
          totalCollateralValue = totalCollateralValue.plus(collateralValue);
        }
      }
    });

    return {
      collateralValue: totalCollateralValue,
      borrowValue: totalBorrowValue
    };
  };

  // 市场列定义
  const marketColumns: ProColumns<MarketWithFactor>[] = [
    {
      title: '币种',
      dataIndex: 'underlying_symbol',
      key: 'symbol',
      width: 100,
      render: (text: any) => <strong>{text}</strong>,
    },
    {
      title: '市场地址',
      dataIndex: 'token_address',
      key: 'address',
      width: 400,
      render: (text: any) => (
        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{text}</span>
      ),
    },
    {
      title: '当前抵押因子',
      dataIndex: 'collateral_factor',
      key: 'currentFactor',
      width: 120,
      render: (factor: any) => (
        <Tag color="blue">{`${(parseFloat(factor) * 100).toFixed(2)}%`}</Tag>
      ),
    },
    {
      title: '调整后抵押因子',
      key: 'adjustedFactor',
      width: 150,
      render: (_: any, record: MarketWithFactor) => (
        <InputNumber
          min={0}
          max={100}
          step={0.1}
          formatter={(value) => `${value}%`}
          parser={(value) => value ? parseFloat(value.replace('%', '')) : 0}
          value={adjustedFactors[record.token_address]}
          onChange={(value) => handleFactorChange(record.token_address, value)}
          style={{ width: '100%' }}
        />
      ),
    },
    {
      title: '价格',
      dataIndex: 'underlying_price',
      key: 'price',
      width: 120,
      render: (price: any) => (
        <span>${new BigNumber(price || 0).toFixed(4)}</span>
      ),
    },
  ];

  // 重置所有调整因子
  const resetAllFactors = () => {
    const resetFactors: Record<string, number> = {};
    markets.forEach(market => {
      resetFactors[market.token_address] = parseFloat(market.collateral_factor) * 100;
    });
    setAdjustedFactors(resetFactors);
    setTestResult(null);
    message.success('已重置所有抵押因子');
  };

  // 应用默认压力测试场景
  const applyStressScenario = (scenario: 'mild' | 'moderate' | 'severe') => {
    const scenarios = {
      mild: 0.8,    // 降低20%
      moderate: 0.6, // 降低40%
      severe: 0.4    // 降低60%
    };

    const multiplier = scenarios[scenario];
    const newFactors: Record<string, number> = {};
    
    markets.forEach(market => {
      const originalFactor = parseFloat(market.collateral_factor) * 100;
      newFactors[market.token_address] = originalFactor * multiplier;
    });

    setAdjustedFactors(newFactors);
    setTestResult(null);
    message.success(`已应用${scenario === 'mild' ? '轻度' : scenario === 'moderate' ? '中度' : '重度'}压力测试场景`);
  };

  // 计算有效账户和统计数据
  const validAccounts = getValidAccounts();
  const totalAccounts = accountDetails.length;
  const validCount = validAccounts.length;
  const excludedCount = totalAccounts - validCount;

  return (
    <PageContainer
      header={{
        title: '压力测试',
        subTitle: '模拟调整抵押因子对账户健康度的影响',
      }}
    >
      {/* 压力测试场景按钮 */}
      <Card style={{ marginBottom: 24 }}>
        <h3>压力测试场景</h3>
        <Space style={{ marginBottom: 16 }}>
          <Button onClick={() => applyStressScenario('mild')} type="primary" ghost>
            轻度压力测试 (抵押因子降低20%)
          </Button>
          <Button onClick={() => applyStressScenario('moderate')} type="primary" ghost>
            中度压力测试 (抵押因子降低40%)
          </Button>
          <Button onClick={() => applyStressScenario('severe')} type="primary" ghost danger>
            重度压力测试 (抵押因子降低60%)
          </Button>
          <Button onClick={resetAllFactors}>
            重置所有因子
          </Button>
        </Space>
        <p style={{ color: '#666', fontSize: '14px' }}>
          提示：压力测试基于User Account页面获取的用户详情数据，请确保已获取最新数据。
        </p>
      </Card>

      {/* 市场列表和抵押因子调整 */}
      <ProCard
        title="市场抵押因子调整"
        style={{ marginBottom: 24 }}
        extra={
          <Button type="primary" onClick={runStressTest} loading={loading}>
            执行压力测试
          </Button>
        }
      >
        <ProTable<MarketWithFactor>
          dataSource={markets}
          rowKey="token_address"
          columns={marketColumns}
          pagination={false}
          search={false}
          toolBarRender={false}
          size="small"
        />
      </ProCard>

      {/* 压力测试结果 */}
      {testResult && (
        <ProCard
          title="压力测试结果"
          style={{ marginBottom: 24 }}
          extra={
            <Space>
              <Tag color="green">数据来源: {accountDetails.length}个用户账户</Tag>
              <Tag color="blue">测试时间: {new Date().toLocaleString()}</Tag>
              <Button type="primary" onClick={exportStressTestToExcel}>
                导出Excel
              </Button>
            </Space>
          }
        >
          <Row gutter={16}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="总账户数"
                  value={testResult.totalAccounts}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="健康账户"
                  value={testResult.healthyAccounts}
                  valueStyle={{ color: '#52c41a' }}
                  suffix={`(${testResult.healthyPercentage.toFixed(1)}%)`}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="风险账户"
                  value={testResult.unhealthyAccounts}
                  valueStyle={{ color: '#ff4d4f' }}
                  suffix={`(${testResult.unhealthyPercentage.toFixed(1)}%)`}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="风险变化"
                  value={testResult.unhealthyAccounts}
                  valueStyle={{ color: '#ff4d4f' }}
                  prefix="+"
                  suffix="个"
                />
              </Card>
            </Col>
          </Row>

          {/* 详细结果表格 - 只显示保持风险和转为风险的账户 */}
          <div style={{ marginTop: 24 }}>
            <h3>风险账户结果</h3>
            <Table
              dataSource={accountDetails.filter(record => {
                const originalHealth = new BigNumber(record.health || 0).toNumber();
                const newHealth = calculateHealthWithAdjustedFactors(record);
                const wasHealthy = originalHealth < 1;
                const isHealthy = newHealth < 1;
                // 只显示保持风险或转为风险的账户
                return (!isHealthy) || (wasHealthy && !isHealthy);
              })}
              rowKey="address"
              columns={[
                {
                  title: '地址',
                  dataIndex: 'address',
                  width: 300,
                  render: (text) => (
                    <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{text}</span>
                  ),
                  sorter: (a, b) => a.address.localeCompare(b.address),
                  defaultSortOrder: 'ascend',
                },
                {
                  title: '原健康度',
                  dataIndex: 'health',
                  width: 120,
                  render: (health) => {
                    const healthNum = new BigNumber(health || 0).toNumber();
                    return (
                      <span style={{ 
                        color: healthNum >= 1 ? '#ff4d4f' : healthNum >= 0.8 ? '#faad14' : '#52c41a',
                        fontWeight: 'bold'
                      }}>
                        {healthNum.toFixed(4)}
                      </span>
                    );
                  },
                  sorter: (a, b) => {
                    const healthA = a.health ? new BigNumber(a.health).toNumber() : -1;
                    const healthB = b.health ? new BigNumber(b.health).toNumber() : -1;
                    return healthA - healthB;
                  },
                },
                {
                  title: '压力测试后健康度',
                  width: 140,
                  render: (_, record) => {
                    const newHealth = calculateHealthWithAdjustedFactors(record);
                    return (
                      <span style={{ 
                        color: newHealth >= 1 ? '#ff4d4f' : newHealth >= 0.8 ? '#faad14' : '#52c41a',
                        fontWeight: 'bold'
                      }}>
                        {newHealth.toFixed(4)}
                      </span>
                    );
                  },
                  sorter: (a, b) => {
                    const healthA = calculateHealthWithAdjustedFactors(a);
                    const healthB = calculateHealthWithAdjustedFactors(b);
                    return healthA - healthB;
                  },
                },
                {
                  title: '状态变化',
                  width: 100,
                  render: (_, record) => {
                    const originalHealth = new BigNumber(record.health || 0).toNumber();
                    const newHealth = calculateHealthWithAdjustedFactors(record);
                    
                    const wasHealthy = originalHealth < 1;
                    const isHealthy = newHealth < 1;
                    
                    if (wasHealthy && !isHealthy) {
                      return <Tag color="red">转为风险</Tag>;
                    } else if (!isHealthy) {
                      return <Tag color="orange">保持风险</Tag>;
                    } else {
                      return <Tag color="blue">保持安全</Tag>;
                    }
                  },
                  sorter: (a, b) => {
                    const originalHealthA = new BigNumber(a.health || 0).toNumber();
                    const newHealthA = calculateHealthWithAdjustedFactors(a);
                    const originalHealthB = new BigNumber(b.health || 0).toNumber();
                    const newHealthB = calculateHealthWithAdjustedFactors(b);
                    
                    const wasHealthyA = originalHealthA < 1;
                    const isHealthyA = newHealthA < 1;
                    const wasHealthyB = originalHealthB < 1;
                    const isHealthyB = newHealthB < 1;
                    
                    // 排序规则：转为风险 > 保持风险
                    if (wasHealthyA && !isHealthyA) return -1; // 转为风险在前
                    if (wasHealthyB && !isHealthyB) return 1;
                    if (!isHealthyA) return -1; // 保持风险
                    if (!isHealthyB) return 1;
                    return 0;
                  },
                  filters: [
                    { text: '转为风险', value: '转为风险' },
                    { text: '保持风险', value: '保持风险' },
                  ],
                  onFilter: (value, record) => {
                    const originalHealth = new BigNumber(record.health || 0).toNumber();
                    const newHealth = calculateHealthWithAdjustedFactors(record);
                    const wasHealthy = originalHealth < 1;
                    const isHealthy = newHealth < 1;
                    
                    if (value === '转为风险') {
                      return wasHealthy && !isHealthy;
                    } else if (value === '保持风险') {
                      return !isHealthy;
                    }
                    return true;
                  },
                },
                {
                  title: '测试前抵押价值',
                  width: 150,
                  render: (_, record) => {
                    const originalValues = calculateOriginalCollateralAndBorrowValues(record);
                    return (
                      <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
                        ${originalValues.collateralValue.toFormat(2)}
                      </span>
                    );
                  },
                  sorter: (a, b) => {
                    const valuesA = calculateOriginalCollateralAndBorrowValues(a);
                    const valuesB = calculateOriginalCollateralAndBorrowValues(b);
                    return valuesA.collateralValue.minus(valuesB.collateralValue).toNumber();
                  },
                },
                {
                  title: '测试后抵押价值',
                  width: 150,
                  render: (_, record) => {
                    const adjustedValues = calculateAdjustedCollateralAndBorrowValues(record);
                    return (
                      <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
                        ${adjustedValues.collateralValue.toFormat(2)}
                      </span>
                    );
                  },
                  sorter: (a, b) => {
                    const valuesA = calculateAdjustedCollateralAndBorrowValues(a);
                    const valuesB = calculateAdjustedCollateralAndBorrowValues(b);
                    return valuesA.collateralValue.minus(valuesB.collateralValue).toNumber();
                  },
                },
              ]}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                showQuickJumper: true,
              }}
              size="small"
            />
          </div>
        </ProCard>
      )}

      {/* 使用说明 */}
      <ProCard title="使用说明" type="inner">
        <div style={{ padding: '16px 0' }}>
          <h4>压力测试功能说明：</h4>
          <ol>
            <li>
              <strong>数据来源：</strong>
              压力测试基于User Account页面获取的用户详情数据。请先在User Account页面点击"获取用户列表"和"全部详情"按钮获取最新数据。
            </li>
            <li>
              <strong>抵押因子调整：</strong>
              可以单独调整每个市场的抵押因子，或使用预设的压力测试场景。
            </li>
            <li>
              <strong>健康度计算：</strong>
              健康度 = 账户借款总价值 / (账户总抵押价值 × 抵押因子)
              <ul>
                <li>健康度 ≥ 1：账户可被清算（风险账户）</li>
                <li>健康度 &lt; 1：账户安全（健康账户）</li>
              </ul>
            </li>
            <li>
              <strong>压力测试场景：</strong>
              <ul>
                <li><strong>轻度压力测试：</strong>所有抵押因子降低20%</li>
                <li><strong>中度压力测试：</strong>所有抵押因子降低40%</li>
                <li><strong>重度压力测试：</strong>所有抵押因子降低60%</li>
              </ul>
            </li>
            <li>
              <strong>注意事项：</strong>
              压力测试不会修改实际的市场数据，仅用于模拟分析。
            </li>
          </ol>
        </div>
      </ProCard>
    </PageContainer>
  );
};

export default StressTestPage;