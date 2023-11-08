import Guide from '@/components/Guide';
// import { trim, requestData } from '@/utils/format';
import { PageContainer, ProCard, Statistic, StatisticCard } from '@ant-design/pro-components';
import { useModel, useRequest, useParams, useAppData, useMatch } from '@umijs/max';
import styles from './index.less';
import { Button } from 'antd';
import React, { useState } from 'react';
import { message } from 'antd';
import RcResizeObserver from 'rc-resize-observer';
import MarketInfo from './components/marketInfo'
import service from '../../../services/demo/';

function getBlockNumber(): Promise<{ success: boolean, data: Object }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, data: { blockNumber: Date.now() } });
    }, 1000);
  });
}

function getName(): Promise<{ success: boolean, data: { name: String } }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, data: { name: 'name:' + Date.now() } });
    }, 1000);
  });
}

function getMarketsInfo(): Promise<{ success: boolean, data: { markets: Map<string, API.MarketInfo> } }> {
  service.getMarketsInfo().then((res) =>
    res.data.markets.forEach(
      (market, id) =>
        market.id = id
    )
  );
  // return new Promise((resolve) => {
  //   setTimeout(() => {
  //     resolve({ success: true, data: { markets: [{id:1,name:'market1'},{id:2,name:'market2'}] } });
  //   }, 1000);
  // });
}

const MarketPage: React.FC = () => {
  const [responsive, setResponsive] = useState(false);
  // const match = useMatch({ path: 'market/:id' });
  const { id } = useParams<{ id: string }>();
  const { name, setName, blockNumber, setBlockNumber, marketsInfo } = useModel('global');

  // const  data = useAppData();

  // console.log('show Home page',id,'====',match);
  // console.log('show Market page', marketsInfo.get(id));
  const { loading, run } = useRequest(getBlockNumber, {
    manual: true,
    pollingInterval: 5000,
    onSuccess: (result) => {
      setBlockNumber(result.blockNumber);
      console.log(`The blockNumber was changed to "${result.blockNumber}" at ${Date.now()}!`);
    },
    onError: (error, params) => {
      message.error('请求失败' + JSON.stringify(error) + ' ,' + JSON.stringify(params));
    }
  });
  const { data } = useRequest(getName, {
    refreshDeps: [blockNumber],
    onSuccess: (result) => {
      setName(result.name);
      console.log(`The name was changed to "${result.name}" at ${Date.now()}!`);
    },
    onError: (error, params) => {
      message.error('请求失败(name)' + JSON.stringify(error) + ' ,' + JSON.stringify(params));
    }
  })
  return (
    <PageContainer ghost
    // content="欢迎使用 ProLayout 组件"
    // tabList={[
    //   {
    //     tab: '基本信息',
    //     key: 'base',
    //   },
    //   {
    //     tab: '用户信息',
    //     key: 'user',
    //   },
    // ]}
    // extra={[
    //   <Button key="1" type="primary">
    //     刷新
    //   </Button>,
    // ]}
    // footer={[
    //   <Button key="rest">重置</Button>,
    //   <Button key="submit" type="primary">
    //     提交
    //   </Button>,
    // ]}
    >
      {/* <div className={styles.container}>
        <Guide name={trim(name)} />
        <input
          onChange={(e) => setName(e.target.value)}
          value={name}
          placeholder="Please enter username"
          style={{ width: 240, marginRight: 16 }}
        />
        <button disabled={loading} type="button" onClick={() => run()}>
          {(loading ? 'Loading' : 'Edit') + '  (' + blockNumber+')'}
        </button>
      </div> */}
      <RcResizeObserver
        key="resize-observer"
        onResize={(offset) => {
          setResponsive(offset.width < 596);
        }}
      >
        <ProCard
          // title="数据概览"
          // extra={""}
          split={responsive ? 'horizontal' : 'vertical'}
          headerBordered
          bordered
        >
          <ProCard split="horizontal">
            <ProCard split="horizontal">
              <ProCard split="vertical">
                <StatisticCard
                  statistic={{
                    title: '总存款',
                    value: marketsInfo.get(id)?.total_supply * marketsInfo.get(id)?.exchange_rate,
                    suffix: marketsInfo.get(id)?.underlying_symbol,
                    precision: 6,
                    description: (
                      <Statistic title="月同比" value="8.04%" trend="up" />
                    ),
                  }}
                />
                <StatisticCard
                  statistic={{
                    title: '总借款',
                    value: marketsInfo.get(id)?.total_borrows,
                    suffix: marketsInfo.get(id)?.underlying_symbol,
                    precision: 6,
                    description: (
                      <Statistic title="月同比" value="8.04%" trend="up" />
                    ),
                  }}
                />
              </ProCard>
              <ProCard split="vertical">
                <StatisticCard
                  statistic={{
                    title: '运行中实验',
                    value: '12/56',
                    suffix: '个',
                  }}
                />
                <StatisticCard
                  statistic={{
                    title: '历史实验总数',
                    value: '134',
                    suffix: '个',
                  }}
                />
              </ProCard>
            </ProCard>
            <StatisticCard
              title="流量走势"
              chart={
                <img
                  src="https://gw.alipayobjects.com/zos/alicdn/_dZIob2NB/zhuzhuangtu.svg"
                  width="100%"
                />
              }
            />
          </ProCard>
          <StatisticCard
            title="流量占用情况"
            chart={
              <img
                src="https://gw.alipayobjects.com/zos/alicdn/qoYmFMxWY/jieping2021-03-29%252520xiawu4.32.34.png"
                alt="大盘"
                width="100%"
              />
            }
          />
        </ProCard>
      </RcResizeObserver>
    </PageContainer>
  );
};

export default MarketPage;
