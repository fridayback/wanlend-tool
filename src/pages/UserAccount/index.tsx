import services from '@/services/demo';
import {
  ActionType,
  FooterToolbar,
  PageContainer,
  ProDescriptions,
  ProDescriptionsItemProps,
  ProTable,
  ProColumns,
} from '@ant-design/pro-components';
import { Button, Divider, Drawer, message, Progress, Space, Card, Row, Col, Statistic } from 'antd';
import React, { useRef, useState, useEffect } from 'react';
import { useModel } from '@umijs/max';
import { BigNumber } from 'bignumber.js';

const { getAllAccountsList, getAccount } = services.UserController;

/**
 * 获取用户列表
 */
const handleGetAllAccounts = async () => {
  const hide = message.loading('正在获取用户列表...');
  try {
    const result = await getAllAccountsList();
    hide();
    if (result.success) {
      // API返回的是JSON字符串，需要解析
      const data = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
      message.success(`成功获取 ${data.accounts?.length || 0} 个用户`);
      return data;
    } else {
      message.error('获取用户列表失败: ' + result.errorMessage);
      return null;
    }
  } catch (error) {
    hide();
    message.error('获取用户列表失败: ' + error.message);
    return null;
  }
};

/**
 * 获取用户详情
 */
const handleGetAccountDetails = async (addresses: string[]) => {
  const hide = message.loading(`正在获取 ${addresses.length} 个用户详情...`);
  try {
    const result = await getAccount({ addresses });
    hide();
    if (result.success) {
      const data = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
      message.success(`成功获取用户详情`);
      return data;
    } else {
      message.error('获取用户详情失败: ' + result.errorMessage);
      return null;
    }
  } catch (error) {
    hide();
    message.error('获取用户详情失败: ' + error.message);
    return null;
  }
};

/**
 * 批量获取所有用户详情（分批次）
 */
const handleGetAllAccountDetails = async (
  allAddresses: string[],
  onProgress: (current: number, total: number) => void
) => {
  const batchSize = 10; // 每批次请求10个地址
  const total = allAddresses.length;
  let allAccounts: API.AccountInfo[] = [];

  for (let i = 0; i < total; i += batchSize) {
    const batchAddresses = allAddresses.slice(i, i + batchSize);
    const result = await handleGetAccountDetails(batchAddresses);
    
    if (result && result.accounts) {
      allAccounts = [...allAccounts, ...result.accounts];
    }
    
    onProgress(Math.min(i + batchSize, total), total);
    
    // 避免请求过快，添加延迟
    if (i + batchSize < total) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return allAccounts;
};

/**
 * 导出CSV文件
 */
const exportToCSV = (accounts: API.AccountInfo[], marketsInfo: Map<string, API.MarketInfo>) => {
  if (!accounts || accounts.length === 0) {
    message.warning('没有数据可导出');
    return;
  }

  // CSV头部
  const headers = [
    '地址',
    '健康度',
    '净资产值',
    '借款总值',
    '抵押总值',
    '挖矿奖励',
    '奖励地址',
    '奖励余额',
    '时间戳'
  ];

  // 构建CSV内容
  const rows = accounts.map(account => {
    const healthValue = new BigNumber(account.health || 0).toFixed(4);
    const netAssetValue = new BigNumber(account.net_asset_value || 0).toFixed(4);
    const totalBorrowValue = new BigNumber(account.total_borrow_value || 0).toFixed(4);
    const totalCollateralValue = new BigNumber(account.total_collateral_value || 0).toFixed(4);
    
    return [
      account.address,
      healthValue,
      netAssetValue,
      totalBorrowValue,
      totalCollateralValue,
      account.comp_reward || '0',
      account.rewardAddress || '',
      account.rewardBalance || '0',
      new Date(account.timestamp || 0).toLocaleString()
    ].map(field => `"${field}"`).join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  
  // 创建下载链接
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `用户账户详情_${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  message.success(`成功导出 ${accounts.length} 条记录`);
};

const UserAccountPage: React.FC<unknown> = () => {
  const { marketsInfo } = useModel('global');
  const [userList, setUserList] = useState<{address: string, health?: string}[]>([]);
  const [selectedRows, setSelectedRows] = useState<{address: string, health?: string}[]>([]);
  const [accountDetails, setAccountDetails] = useState<API.AccountInfo[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<API.AccountInfo>();
  const [loading, setLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const actionRef = useRef<ActionType>();

  // 表格列定义
  const columns: ProColumns<{address: string, health?: string}>[] = [
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
      width: 400,
      render: (text) => (
        <span style={{ fontFamily: 'monospace' }}>{text}</span>
      ),
    },
    {
      title: '健康度',
      dataIndex: 'health',
      key: 'health',
      width: 120,
      render: (_, record) => {
        const health = record.health;
        const healthNum = new BigNumber(health || 0).toNumber();
        let status: 'success' | 'warning' | 'error' = 'success';
        if (healthNum >= 1) status = 'error';
        else if (healthNum >= 0.8) status = 'warning';
        
        return (
          <span style={{ color: status === 'success' ? '#52c41a' : status === 'warning' ? '#faad14' : '#ff4d4f' }}>
            {new BigNumber(health || 0).toFixed(4)}
          </span>
        );
      },
    },
    {
      title: '操作',
      dataIndex: 'option',
      valueType: 'option',
      width: 100,
      render: (_, record) => (
        <a
          onClick={async () => {
            setLoading(true);
            const result = await handleGetAccountDetails([record.address]);
            if (result && result.accounts && result.accounts.length > 0) {
              setSelectedAccount(result.accounts[0]);
            }
            setLoading(false);
          }}
        >
          查看详情
        </a>
      ),
    },
  ];

  // 获取用户列表
  const handleGetUserList = async () => {
    setLoading(true);
    const result = await handleGetAllAccounts();
    if (result && result.accounts) {
      const users = result.accounts.map((account: API.AccountInfo) => ({
        address: account.address,
        health: account.health
      }));
      setUserList(users);
      // 同时保存完整的账户信息供后续使用
      setAccountDetails(result.accounts);
    }
    setLoading(false);
  };

  // 获取选中用户的详情
  const handleGetSelectedDetails = async () => {
    if (selectedRows.length === 0) {
      message.warning('请先选择用户');
      return;
    }
    
    setLoading(true);
    const addresses = selectedRows.map(row => row.address);
    const result = await handleGetAccountDetails(addresses);
    if (result && result.accounts) {
      // 更新账户详情
      const updatedDetails = [...accountDetails];
      result.accounts.forEach((newAccount: API.AccountInfo) => {
        const index = updatedDetails.findIndex(acc => acc.address === newAccount.address);
        if (index >= 0) {
          updatedDetails[index] = newAccount;
        } else {
          updatedDetails.push(newAccount);
        }
      });
      setAccountDetails(updatedDetails);
      message.success(`成功获取 ${result.accounts.length} 个用户详情`);
    }
    setLoading(false);
  };

  // 批量获取所有用户详情
  const handleGetAllDetails = async () => {
    if (userList.length === 0) {
      message.warning('请先获取用户列表');
      return;
    }
    
    setBatchLoading(true);
    setBatchProgress({ current: 0, total: userList.length });
    
    const addresses = userList.map(user => user.address);
    const allAccounts = await handleGetAllAccountDetails(
      addresses,
      (current, total) => {
        setBatchProgress({ current, total });
      }
    );
    
    if (allAccounts.length > 0) {
      setAccountDetails(allAccounts);
      message.success(`成功获取所有 ${allAccounts.length} 个用户详情`);
    }
    
    setBatchLoading(false);
    setBatchProgress({ current: 0, total: 0 });
  };

  // 导出数据
  const handleExport = () => {
    if (accountDetails.length === 0) {
      message.warning('没有可导出的数据，请先获取用户详情');
      return;
    }
    exportToCSV(accountDetails, marketsInfo);
  };

  // 计算统计数据
  const stats = {
    totalUsers: userList.length,
    healthyUsers: userList.filter(user => {
      const health = new BigNumber(user.health || 0).toNumber();
      return health < 1;
    }).length,
    unhealthyUsers: userList.filter(user => {
      const health = new BigNumber(user.health || 0).toNumber();
      return health >= 1;
    }).length,
    totalDetails: accountDetails.length,
  };

  return (
    <PageContainer
      header={{
        title: '用户账户管理',
      }}
    >
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总用户数"
              value={stats.totalUsers}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="健康账户"
              value={stats.healthyUsers}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="风险账户"
              value={stats.unhealthyUsers}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已获取详情"
              value={stats.totalDetails}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 功能按钮组 */}
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button
            type="primary"
            onClick={handleGetUserList}
            loading={loading && !batchLoading}
          >
            获取用户列表
          </Button>
          <Button
            onClick={handleGetSelectedDetails}
            disabled={selectedRows.length === 0}
            loading={loading}
          >
            用户详情 ({selectedRows.length})
          </Button>
          <Button
            onClick={handleGetAllDetails}
            disabled={userList.length === 0}
            loading={batchLoading}
          >
            全部详情
          </Button>
          <Button
            onClick={handleExport}
            disabled={accountDetails.length === 0}
          >
            导出CSV
          </Button>
        </Space>
      </div>

      {/* 批量获取进度条 */}
      {batchLoading && (
        <div style={{ marginBottom: 16 }}>
          <Progress
            percent={Math.round((batchProgress.current / batchProgress.total) * 100)}
            status="active"
            format={(percent) => `正在获取用户详情: ${batchProgress.current}/${batchProgress.total} (${percent}%)`}
          />
        </div>
      )}

      {/* 用户列表表格 */}
      <ProTable<{address: string, health?: string}>
        headerTitle="用户列表"
        actionRef={actionRef}
        rowKey="address"
        loading={loading}
        search={false}
        toolBarRender={false}
        dataSource={userList}
        columns={columns}
        rowSelection={{
          selectedRowKeys: selectedRows.map(row => row.address),
          onChange: (_, selectedRows) => setSelectedRows(selectedRows),
        }}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
      />

      {/* 选中行操作栏 */}
      {selectedRows.length > 0 && (
        <FooterToolbar
          extra={
            <div>
              已选择 <a style={{ fontWeight: 600 }}>{selectedRows.length}</a> 个用户
            </div>
          }
        >
          <Button onClick={handleGetSelectedDetails}>
            获取选中用户详情
          </Button>
        </FooterToolbar>
      )}

      {/* 用户详情抽屉 */}
      <Drawer
        width={800}
        open={!!selectedAccount}
        onClose={() => setSelectedAccount(undefined)}
        title={`用户详情 - ${selectedAccount?.address}`}
      >
        {selectedAccount && (
          <div>
            <ProDescriptions<API.AccountInfo>
              column={2}
              title="基本信息"
              dataSource={selectedAccount}
              columns={[
                {
                  title: '地址',
                  dataIndex: 'address',
                  span: 2,
                  render: (text) => (
                    <span style={{ fontFamily: 'monospace' }}>{text}</span>
                  ),
                },
                {
                  title: '健康度',
                  dataIndex: 'health',
                  render: (health) => {
                    const healthNum = new BigNumber(health || 0).toNumber();
                    let status = 'success';
                    if (healthNum >= 1) status = 'error';
                    else if (healthNum >= 0.8) status = 'warning';
                    
                    return (
                      <span style={{ 
                        color: status === 'success' ? '#52c41a' : status === 'warning' ? '#faad14' : '#ff4d4f',
                        fontWeight: 'bold'
                      }}>
                        {new BigNumber(health || 0).toFixed(6)}
                      </span>
                    );
                  },
                },
                {
                  title: '净资产值',
                  dataIndex: 'net_asset_value',
                  render: (value) => <span>{new BigNumber(value || 0).toFixed(4)}</span>,
                },
                {
                  title: '借款总值',
                  dataIndex: 'total_borrow_value',
                  render: (value) => <span>{new BigNumber(value || 0).toFixed(4)}</span>,
                },
                {
                  title: '抵押总值',
                  dataIndex: 'total_collateral_value',
                  render: (value) => <span>{new BigNumber(value || 0).toFixed(4)}</span>,
                },
                {
                  title: '挖矿奖励',
                  dataIndex: 'comp_reward',
                  render: (value) => <span>{new BigNumber(value || 0).toFixed(4)}</span>,
                },
              ]}
            />
            
            <Divider />
            
            <h3>代币持仓</h3>
            <ProTable<API.AccountTokenInfo>
              dataSource={selectedAccount.tokens || []}
              rowKey="token_address"
              columns={[
                {
                  title: '代币地址',
                  dataIndex: 'token_address',
                  width: 300,
                  render: (text) => (
                    <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{text}</span>
                  ),
                },
                {
                  title: '是否进入市场',
                  dataIndex: 'is_entered',
                  render: (entered) => (
                    <span style={{ color: entered ? '#52c41a' : '#ff4d4f' }}>
                      {entered ? '是' : '否'}
                    </span>
                  ),
                },
                {
                  title: '供应余额',
                  dataIndex: 'supply_balance_underlying',
                  render: (value) => <span>{new BigNumber(value || 0).toFixed(4)}</span>,
                },
                {
                  title: '借款余额',
                  dataIndex: 'borrow_balance_underlying',
                  render: (value) => <span>{new BigNumber(value || 0).toFixed(4)}</span>,
                },
              ]}
              pagination={false}
              size="small"
            />
          </div>
        )}
      </Drawer>
    </PageContainer>
  );
};

export default UserAccountPage;