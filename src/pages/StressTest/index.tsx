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
  const { marketsInfo } = useModel('global');
  const [markets, setMarkets] = useState<MarketWithFactor[]>([]);
  const [adjustedFactors, setAdjustedFactors] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<StressTestResult | null>(null);
  const [accountDetails, setAccountDetails] = useState<API.AccountInfo[]>([]);

  // 从User Account页面获取账户详情数据
  useEffect(() => {
    // 这里可以从localStorage或全局状态获取User Account页面获取的数据
    // 在实际应用中，可以通过全局状态管理共享数据
    const storedAccounts = localStorage.getItem('userAccountDetails');
    if (storedAccounts) {
      try {
        const accounts = JSON.parse(storedAccounts);
        setAccountDetails(accounts);
      } catch (error) {
        console.error('Failed to parse stored account details:', error);
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
      setAdjustedFactors(prev => ({
        ...prev,
        [tokenAddress]: value
      }));
    }
  };

  // 执行压力测试
  const runStressTest = () => {
    if (accountDetails.length === 0) {
      message.warning('请先在User Account页面获取用户详情数据');
      return;
    }

    setLoading(true);
    
    // 模拟计算延迟
    setTimeout(() => {
      let healthyCount = 0;
      let unhealthyCount = 0;

      // 对每个账户重新计算健康度
      accountDetails.forEach(account => {
        const healthValue = calculateHealthWithAdjustedFactors(account);
        if (healthValue >= 1) {
          unhealthyCount++;
        } else {
          healthyCount++;
        }
      });

      const total = accountDetails.length;
      const result: StressTestResult = {
        healthyAccounts: healthyCount,
        unhealthyAccounts: unhealthyCount,
        totalAccounts: total,
        healthyPercentage: total > 0 ? (healthyCount / total) * 100 : 0,
        unhealthyPercentage: total > 0 ? (unhealthyCount / total) * 100 : 0
      };

      setTestResult(result);
      setLoading(false);
      message.success(`压力测试完成: ${healthyCount}个健康账户, ${unhealthyCount}个风险账户`);
    }, 1000);
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

          {/* 详细结果表格 */}
          <div style={{ marginTop: 24 }}>
            <h3>详细结果</h3>
            <Table
              dataSource={accountDetails.slice(0, 10)} // 只显示前10个账户
              rowKey="address"
              columns={[
                {
                  title: '地址',
                  dataIndex: 'address',
                  width: 300,
                  render: (text) => (
                    <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{text}</span>
                  ),
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
                    } else if (!wasHealthy && isHealthy) {
                      return <Tag color="green">转为安全</Tag>;
                    } else if (!isHealthy) {
                      return <Tag color="orange">保持风险</Tag>;
                    } else {
                      return <Tag color="blue">保持安全</Tag>;
                    }
                  },
                },
              ]}
              pagination={false}
              size="small"
            />
            {accountDetails.length > 10 && (
              <p style={{ marginTop: 8, color: '#666', textAlign: 'center' }}>
                仅显示前10个账户，共{accountDetails.length}个账户
              </p>
            )}
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