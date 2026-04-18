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
import { Button, Divider, Drawer, message, Progress, Space, Card, Row, Col, Statistic, Modal, Spin, Input } from 'antd';
import React, { useRef, useState, useEffect } from 'react';
import { useModel } from '@umijs/max';
import { BigNumber } from 'bignumber.js';
import * as XLSX from 'xlsx';

const { getAllAccountsList, getAccount } = services.UserController;

/**
 * 获取用户列表
 */
const handleGetAllAccounts = async () => {
  const hide = message.loading('正在获取用户列表...');
  try {
    const result = await getAllAccountsList();
    // console.log('获取用户列表result2 =', result);
    hide();
    if (result) {
      message.success(`成功获取 ${result?.length || 0} 个用户`);
      return result;
    } else {
      message.error('获取用户列表失败: ' + (result?.errorMessage || '未知错误'));
      return null;
    }
  } catch (error) {
    hide();
    message.error('获取用户列表失败: ' + (error as Error).message);
    return null;
  }
};

/**
 * 获取用户详情
 */
const handleGetAccountDetails = async (addresses: string[]) => {
  const hide = message.loading(`正在获取 ${addresses.length} 个用户详情...`);
  // console.log('请求用户详情的地址列表 =', addresses);
  try {
    const result = await getAccount({ addresses });
    console.log('获取用户详情result =', result);
    hide();
    if (result && result.accounts) {
      if (result.accounts.length > 0) {
        message.success(`成功获取 ${result.accounts.length} 个用户详情`);
        return result.accounts;
      } else {
        message.error('获取用户详情失败: ' + (result?.errorMessage || '未知错误'));
        return null;
      }
    } else {
      message.error('获取用户详情失败: ' + (result?.errorMessage || '未知错误'));
      return null;
    }
  } catch (error) {
    hide();
    message.error('获取用户详情失败: ' + (error as Error).message);
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
  const batchSize = 100; // 每批次请求100个地址
  const total = allAddresses.length;
  let allAccounts: API.AccountInfo[] = [];

  for (let i = 0; i < total; i += batchSize) {
    const batchAddresses = allAddresses.slice(i, i + batchSize);
    const result = await handleGetAccountDetails(batchAddresses);

    if (result) {
      allAccounts = [...allAccounts, ...result];
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
 * 导出Excel文件
 */
const exportToExcel = (accounts: API.AccountInfo[], marketsInfo: Map<string, API.MarketInfo>) => {
  if (!accounts || accounts.length === 0) {
    message.warning('没有数据可导出');
    return;
  }

  // 从marketsInfo中获取所有代币，按市场列表顺序排列
  const marketList = Array.from(marketsInfo.values());

  if (marketList.length === 0) {
    message.warning('没有市场数据可导出');
    return;
  }

  // 分析代币信息，获取代币符号
  const tokenInfoList = marketList.map(market => ({
    tokenAddress: market.token_address,
    symbol: market.underlying_symbol || market.token_address.slice(0, 8) + '...',
    price: new BigNumber(market.underlying_price || 0),
    collateralFactor: new BigNumber(market.collateral_factor || 0),
  }));

  // 构建表头
  const baseHeaders = ['地址', '健康值'];

  // 为每个代币添加4个列（移除价格和抵押因子列）
  const tokenHeaders = tokenInfoList.flatMap(token => [
    `${token.symbol}_借款数量`,
    `${token.symbol}_借款价值`,
    `${token.symbol}_供应数量`,
    `${token.symbol}_抵押价值`,
  ]);

  const headers = [...baseHeaders, ...tokenHeaders];

  // 构建数据行
  const dataRows = accounts.map(account => {
    const baseData = [
      account.address,
      new BigNumber(account.health || 0).toFixed(6),
    ];

    // 为每个代币添加数据（只保留4个值）
    const tokenData = tokenInfoList.flatMap(tokenInfo => {
      const token = account.tokens?.find(t => t.token_address === tokenInfo.tokenAddress);

      if (!token) {
        // 如果该用户没有这个代币，返回空值
        return ['0', '0', '0', '0'];
      }

      const borrowBalance = new BigNumber(token.borrow_balance_underlying || 0);
      const supplyBalance = new BigNumber(token.supply_balance_underlying || 0);

      // 计算借款价值：借款数量 × 代币价格
      const borrowValue = borrowBalance.times(tokenInfo.price);

      // 计算抵押价值：供应数量 × 代币价格 × 抵押因子
      const collateralValue = supplyBalance.times(tokenInfo.price).times(tokenInfo.collateralFactor);

      return [
        borrowBalance.toFixed(4),           // 借款数量
        borrowValue.toFixed(4),             // 借款价值
        supplyBalance.toFixed(4),           // 供应数量
        collateralValue.toFixed(4),         // 抵押价值
      ];
    });

    return [...baseData, ...tokenData];
  });

  // 创建工作簿和工作表
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

  // 设置列宽
  const colWidths = headers.map(header => ({
    wch: Math.max(15, header.length + 2), // 最小宽度15，根据标题长度调整
  }));
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '用户账户详情');

  // 生成文件名
  const fileName = `用户账户详情_${new Date().toISOString().slice(0, 10)}.xlsx`;

  // 写入文件并触发下载
  XLSX.writeFile(workbook, fileName);

  message.success(`成功导出 ${accounts.length} 条记录到Excel`);
};

const UserAccountPage: React.FC<unknown> = () => {
  const { 
    marketsInfo, 
    userList, 
    setUserList, 
    accountDetails, 
    setAccountDetails 
  } = useModel('global');
  const [selectedRows, setSelectedRows] = useState<API.UserListItem[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<API.AccountInfo>();
  const [loading, setLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [globalLoading, setGlobalLoading] = useState(false);
  const [filterText, setFilterText] = useState('');
  const actionRef = useRef<ActionType>();

  // 过滤后的用户列表
  const filteredUserList = React.useMemo(() => {
    if (!filterText.trim()) {
      return userList;
    }
    const searchText = filterText.toLowerCase().trim();
    return userList.filter(user => 
      user.address.toLowerCase().includes(searchText)
    );
  }, [userList, filterText]);

  // 表格列定义
  const columns: ProColumns<API.UserListItem>[] = [
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
      width: 400,
      render: (text) => (
        <span style={{ fontFamily: 'monospace' }}>{text}</span>
      ),
      sorter: (a, b) => a.address.localeCompare(b.address),
      defaultSortOrder: 'ascend',
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
            {health === undefined ? '-' : new BigNumber(health || 0).toFixed(4)}
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
      title: '详情状态',
      dataIndex: 'hasDetails',
      key: 'hasDetails',
      width: 100,
      render: (text, record) => (
        <span style={{ color: record.hasDetails ? '#52c41a' : '#faad14' }}>
          {record.hasDetails ? '已获取' : '未获取'}
        </span>
      ),
      sorter: (a, b) => (a.hasDetails === b.hasDetails ? 0 : a.hasDetails ? 1 : -1),
    },
    {
      title: '操作',
      dataIndex: 'option',
      valueType: 'option',
      width: 100,
      render: (_, record) => (
        <a
          onClick={() => {
            // 从本地已获取的accountDetails中查找该用户的AccountInfo
            const accountInfo = accountDetails.find(acc => acc.address === record.address);
            if (accountInfo) {
              setSelectedAccount(accountInfo);
            } else {
              // 如果本地没有该用户的详情数据，提示用户先获取详情
              message.warning(`请先获取用户 ${record.address} 的详情数据`);
            }
          }}
        >
          查看详情
        </a>
      ),
    },
  ];

  // 获取用户列表 - 只获取地址列表，不保存不完整的账户信息
  const handleGetUserList = async () => {
    setGlobalLoading(true);
    setLoading(true);
    const result = await handleGetAllAccounts();
    // console.log('用户列表result =', result);
    if (result) {
      // 获取成功后才清除之前的所有用户数据
      setUserList([]);
      setAccountDetails([]);
      setSelectedRows([]);
      
      // 只提取地址和健康度信息用于显示
      const users = Array.isArray(result) ? result.map((account: string) => ({
        address: account,
        health: undefined,
        hasDetails: false // 标记为未获取详情
      })) : [];
      setUserList(users);

      // 清空accountDetails，因为获取用户列表时得到的是不完整数据
      const allDetails = users.map((user: API.UserListItem) => ({
        address: user.address,
        health: '-',
        net_asset_value: '0',
        total_borrow_value: '0',
        total_collateral_value: '0',
        comp_reward: '0',
        rewardAddress: '',
        rewardBalance: '0',
        timestamp: 0,
        tokens: [],
        hasDetails: false,
      }));
      setAccountDetails(allDetails);

      message.success(`成功获取 ${users.length} 个用户地址`);
    }
    setLoading(false);
    setGlobalLoading(false);
  };

  // 获取选中用户的详情
  const handleGetSelectedDetails = async () => {
    if (selectedRows.length === 0) {
      message.warning('请先选择用户');
      return;
    }

    setGlobalLoading(true);
    setLoading(true);
    const addresses = selectedRows.map(row => row.address);
    const result = await handleGetAccountDetails(addresses);
    console.log('选中用户详情result =', result);
    if (result) {
      // 更新账户详情
      const updatedDetails = [...accountDetails];
      const updatedUserList = [...userList];

      result.forEach((newAccount: API.AccountInfo) => {
        const index = updatedDetails.findIndex(acc => acc.address === newAccount.address);
        if (index >= 0) {
          updatedDetails[index] = newAccount;
        } else {
          updatedDetails.push(newAccount);
        }

        // 更新userList中的hasDetails标志
        const userIndex = updatedUserList.findIndex(user => user.address === newAccount.address);
        if (userIndex >= 0) {
          updatedUserList[userIndex] = {
            ...updatedUserList[userIndex],
            hasDetails: true,
            health: newAccount.health,
            net_asset_value: newAccount.net_asset_value,
            total_borrow_value: newAccount.total_borrow_value,
            total_collateral_value: newAccount.total_collateral_value,
          };
        }
      });

      setAccountDetails(updatedDetails);
      console.log('更新后的账户详情 =', updatedDetails);
      setUserList(updatedUserList);

      // 获取详情后清空选中状态
      setSelectedRows([]);

      message.success(`成功获取 ${result.length} 个用户详情，已清空选中状态`);
    }
    setLoading(false);
    setGlobalLoading(false);
  };

  // 批量获取所有用户详情
  const handleGetAllDetails = async () => {
    if (userList.length === 0) {
      message.warning('请先获取用户列表');
      return;
    }

    setGlobalLoading(true);
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
      // 更新账户详情
      setAccountDetails(allAccounts);

      // 更新userList中的hasDetails状态和健康度等信息
      const updatedUserList = [...userList];
      allAccounts.forEach((account: API.AccountInfo) => {
        const userIndex = updatedUserList.findIndex(user => user.address === account.address);
        if (userIndex >= 0) {
          updatedUserList[userIndex] = {
            ...updatedUserList[userIndex],
            hasDetails: true,
            health: account.health,
            net_asset_value: account.net_asset_value,
            total_borrow_value: account.total_borrow_value,
            total_collateral_value: account.total_collateral_value,
          };
        }
      });

      setUserList(updatedUserList);

      message.success(`成功获取所有 ${allAccounts.length} 个用户详情`);
    }

    setBatchLoading(false);
    setBatchProgress({ current: 0, total: 0 });
    setGlobalLoading(false);
  };

  // 导出CSV数据（保留旧功能）
  const handleExportCSV = () => {
    if (accountDetails.length === 0) {
      message.warning('没有可导出的数据，请先获取用户详情');
      return;
    }
    // 临时实现一个简单的CSV导出
    exportSimpleCSV(accountDetails);
  };
  
  // 简单的CSV导出函数
  const exportSimpleCSV = (accounts: API.AccountInfo[]) => {
    if (!accounts || accounts.length === 0) {
      message.warning('没有数据可导出');
      return;
    }

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
    
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `用户账户详情_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    message.success(`成功导出 ${accounts.length} 条CSV记录`);
  };

  // 导出Excel数据
  const handleExportExcel = () => {
    if (accountDetails.length === 0) {
      message.warning('没有可导出的数据，请先获取用户详情');
      return;
    }
    exportToExcel(accountDetails, marketsInfo);
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
    totalDetails: accountDetails.filter(acc => acc.timestamp > 0).length,
  };

  console.log('统计数据 =', stats);
  // 确保统计值为数字
  const safeStats = {
    totalUsers: Number(stats.totalUsers) || 0,
    healthyUsers: Number(stats.healthyUsers) || 0,
    unhealthyUsers: Number(stats.unhealthyUsers) || 0,
    totalDetails: Number(stats.totalDetails) || 0,
  };


  return (
    <PageContainer
      header={{
        title: '用户账户管理',
      }}
    >
      {/* 全局加载遮罩 */}
      <Modal
        open={globalLoading}
        footer={null}
        closable={false}
        centered
        maskClosable={false}
        width={300}
        bodyStyle={{ textAlign: 'center', padding: '40px 0' }}
      >
        <Spin size="large" />
        <div style={{ marginTop: 20, fontSize: 16, color: '#1890ff' }}>
          处理中，请稍候...
        </div>
      </Modal>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总用户数"
              value={safeStats.totalUsers}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="健康账户"
              value={safeStats.healthyUsers}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="风险账户"
              value={safeStats.unhealthyUsers}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已获取详情"
              value={safeStats.totalDetails}
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
            onClick={handleExportCSV}
            disabled={accountDetails.length === 0}
          >
            导出CSV
          </Button>
          <Button
            onClick={handleExportExcel}
            disabled={accountDetails.length === 0}
            type="primary"
          >
            导出Excel
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

      {/* 地址过滤搜索框 */}
      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="按地址过滤（输入部分地址字符）"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          allowClear
          style={{ width: 400 }}
          prefix={<span style={{ color: '#999' }}>搜索:</span>}
        />
        {filterText.trim() && (
          <span style={{ marginLeft: 8, color: '#666', fontSize: '14px' }}>
            已过滤到 {filteredUserList.length} 个用户
          </span>
        )}
      </div>

      {/* 用户列表表格 */}
      <ProTable<API.UserListItem>
        headerTitle="用户列表"
        actionRef={actionRef}
        rowKey="address"
        loading={loading}
        search={false}
        toolBarRender={false}
        dataSource={filteredUserList}
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
                    <span style={{ fontFamily: 'monospace' }}>{text as string}</span>
                  ),
                },
                {
                  title: '健康度',
                  dataIndex: 'health',
                  render: (health) => {
                    const healthStr = (health as string) || '0';
                    const healthNum = new BigNumber(healthStr).toNumber();
                    let status = 'success';
                    if (healthNum >= 1) status = 'error';
                    else if (healthNum >= 0.8) status = 'warning';

                    return (
                      <span style={{
                        color: status === 'success' ? '#52c41a' : status === 'warning' ? '#faad14' : '#ff4d4f',
                        fontWeight: 'bold'
                      }}>
                        {new BigNumber(healthStr).toFixed(6)}
                      </span>
                    );
                  },
                },
                {
                  title: '净资产值',
                  dataIndex: 'net_asset_value',
                  render: (value) => {
                    const valueStr = (value as string) || '0';
                    return <span>{new BigNumber(valueStr).toFixed(4)}</span>;
                  },
                },
                {
                  title: '借款总值',
                  dataIndex: 'total_borrow_value',
                  render: (value) => {
                    const valueStr = (value as string) || '0';
                    return <span>{new BigNumber(valueStr).toFixed(4)}</span>;
                  },
                },
                {
                  title: '抵押总值',
                  dataIndex: 'total_collateral_value',
                  render: (value) => {
                    const valueStr = (value as string) || '0';
                    return <span>{new BigNumber(valueStr).toFixed(4)}</span>;
                  },
                },
                {
                  title: '挖矿奖励',
                  dataIndex: 'comp_reward',
                  render: (value) => {
                    const valueStr = (value as string) || '0';
                    return <span>{new BigNumber(valueStr).toFixed(4)}</span>;
                  },
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
                  title: '代币符号',
                  dataIndex: 'token_address',
                  width: 120,
                  render: (text) => {
                    const tokenAddress = (text as string) || '';
                    const marketInfo = marketsInfo.get(tokenAddress);
                    return marketInfo ? (
                      <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
                        {marketInfo.underlying_symbol || '未知'}
                      </span>
                    ) : (
                      <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#999' }}>
                        {tokenAddress ? `${tokenAddress.slice(0, 8)}...` : '无地址'}
                      </span>
                    );
                  },
                },
                {
                  title: '代币名称',
                  dataIndex: 'token_address',
                  width: 150,
                  render: (text) => {
                    const tokenAddress = (text as string) || '';
                    const marketInfo = marketsInfo.get(tokenAddress);
                    return (
                      <span style={{ color: marketInfo ? 'inherit' : '#999' }}>
                        {marketInfo?.underlying_name || '未知代币'}
                      </span>
                    );
                  },
                },
                {
                  title: '当前价格',
                  dataIndex: 'token_address',
                  width: 100,
                  render: (text) => {
                    const tokenAddress = (text as string) || '';
                    const marketInfo = marketsInfo.get(tokenAddress);
                    return (
                      <span style={{ color: marketInfo ? 'inherit' : '#999' }}>
                        {marketInfo ? new BigNumber(marketInfo.underlying_price || 0).toFixed(4) : '-'}
                      </span>
                    );
                  },
                },
                {
                  title: '是否进入市场',
                  dataIndex: 'is_entered',
                  width: 100,
                  render: (entered) => (
                    <span style={{ color: (entered as boolean) ? '#52c41a' : '#ff4d4f' }}>
                      {(entered as boolean) ? '是' : '否'}
                    </span>
                  ),
                },
                {
                  title: '供应余额',
                  dataIndex: 'supply_balance_underlying',
                  width: 120,
                  render: (value) => <span>{new BigNumber((value as string) || 0).toFixed(4)}</span>,
                },
                {
                  title: '借款余额',
                  dataIndex: 'borrow_balance_underlying',
                  width: 120,
                  render: (value) => <span>{new BigNumber((value as string) || 0).toFixed(4)}</span>,
                },
                {
                  title: '抵押因子',
                  dataIndex: 'token_address',
                  width: 100,
                  render: (text) => {
                    const tokenAddress = (text as string) || '';
                    const marketInfo = marketsInfo.get(tokenAddress);
                    return (
                      <span style={{ color: marketInfo ? 'inherit' : '#999' }}>
                        {marketInfo ? new BigNumber(marketInfo.collateral_factor || 0).toFixed(4) : '-'}
                      </span>
                    );
                  },
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