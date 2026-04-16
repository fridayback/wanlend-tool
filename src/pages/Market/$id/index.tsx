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

import {BigNumber} from 'bignumber.js';

const { Divider } = StatisticCard;

function getBlockNumber(): Promise<{ success: boolean, data: { name: String }} > {
  return new Promise(async (resolve) => {
    // setTimeout(() => {
    //   resolve({ success: true, data: { blockNumber: Date.now() } });
    // }, 1000);
    let blockNumber = await service.UserController.getBlockNumber();
    console.log('blockNumber ====:',new BigNumber(blockNumber.result).toString(10));
    resolve({ success: true, data: { blockNumber: new BigNumber(blockNumber.result).toString(10) } });
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
  const { loading, run, } = useRequest(getBlockNumber, {
    manual: false,
    pollingInterval: 30000,
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
//marketsInfo.get(id)?.reserves * (10**marketsInfo.get(id)?.underlying_decimals)
  let reserves = marketsInfo.get(id)?.reserves;
  if(!reserves) reserves = 0;
  let underlying_decimals = marketsInfo.get(id)?.underlying_decimals;
  if(!underlying_decimals) underlying_decimals = 0;
  let cash_ = marketsInfo.get(id)?.cash;
  if(!cash_) cash_ = 0;
  const profit = BigNumber(reserves).shiftedBy(underlying_decimals).toString(10);
  const cash = BigNumber(cash_).shiftedBy(underlying_decimals).toString(10)
  return (
    <PageContainer ghost>
      <RcResizeObserver
        key="resize-observer"
        onResize={(offset) => {
          setResponsive(offset.width < 596);
        }}
      >
        <ProCard
          // title="数据概览"
          extra={"当前高度: " + blockNumber}
          split={responsive ? 'horizontal' : 'vertical'}
          headerBordered
          bordered
        >
          <ProCard split="horizontal" colSpan={16}>
            <ProCard split="horizontal">
              <ProCard split="vertical">
                <StatisticCard
                  statistic={{
                    title: `总存款(${marketsInfo.get(id)?.underlying_symbol})`,
                    value: marketsInfo.get(id)?.total_supply * marketsInfo.get(id)?.exchange_rate,
                    // suffix: marketsInfo.get(id)?.underlying_symbol,
                    precision: 6,
                    tip: marketsInfo.get(id)?.total_supply * marketsInfo.get(id)?.exchange_rate,
                    description: (
                      <Statistic title="利率" value={Math.floor(marketsInfo.get(id)?.supply_rate * 10000) / 100 } trend='up' suffix="%" />
                    ),
                  }}
                />
                <StatisticCard
                  statistic={{
                    title: `总借款(${marketsInfo.get(id)?.underlying_symbol})`,
                    value: marketsInfo.get(id)?.total_borrows,
                    // suffix: marketsInfo.get(id)?.underlying_symbol,
                    precision: 6,
                    tip: marketsInfo.get(id)?.total_borrows,
                    description: (
                      <Statistic title="利率" value={Math.floor(marketsInfo.get(id)?.borrow_rate * 10000) / 100} trend='down' suffix="%" />
                    ),
                  }}
                />
              </ProCard>
              <ProCard split="vertical">
                <StatisticCard
                  statistic={{
                    title: `现金(${marketsInfo.get(id)?.underlying_symbol})`,
                    value: marketsInfo.get(id)?.cash,
                    precision: 6,
                    // suffix: marketsInfo.get(id)?.underlying_symbol,
                    // tip: marketsInfo.get(id)?.cash
                    tip: cash
                  }}
                />
                <StatisticCard
                  statistic={{
                    title: `运营收益(${marketsInfo.get(id)?.underlying_symbol})`,
                    value: marketsInfo.get(id)?.reserves,
                    precision: 6,
                    // suffix: marketsInfo.get(id)?.underlying_symbol,
                    tip: profit
                  }}
                />
              </ProCard>
              <StatisticCard.Group direction={responsive ? 'column' : 'row'}>
                <ProCard
                  // title='参数'
                  headerBordered
                  layout='horizontal'
                >
                  <StatisticCard
                    statistic={{
                      title: 'Collateral Factor',
                      value: marketsInfo.get(id)?.collateral_factor,
                      suffix: '%',
                    }}
                  />
                  <Divider type={responsive ? 'horizontal' : 'vertical'} />
                  <StatisticCard
                    statistic={{
                      title: 'Close Factor',
                      value: marketsInfo.get(id)?.close_factor,
                      suffix: '%',
                    }}
                  />
                  <Divider type={responsive ? 'horizontal' : 'vertical'} />
                  <StatisticCard
                    statistic={{
                      title: 'Liquidation Factor',
                      value: marketsInfo.get(id)?.liquidation_incentive,
                      suffix: '%',
                    }}
                  />
                  <Divider type={responsive ? 'horizontal' : 'vertical'} />
                  <StatisticCard
                    statistic={{
                      title: 'Reserve Factor',
                      value: marketsInfo.get(id)?.reserve_factor,
                      suffix: '%',
                    }}
                  />

                </ProCard>
              </StatisticCard.Group>
              <StatisticCard.Group direction={responsive ? 'column' : 'row'}>
                <ProCard
                  // title='参数'
                  headerBordered
                  layout='horizontal'
                >
                  <StatisticCard
                    statistic={{
                      title: 'Reserve Factor',
                      value: marketsInfo.get(id)?.reserve_factor,
                      suffix: '%',
                    }}
                  />
                  <Divider type={responsive ? 'horizontal' : 'vertical'} />
                  <StatisticCard
                    statistic={{
                      title: 'Borrow Cap',
                      value: marketsInfo.get(id)?.borrowCap,
                    }}
                  />
                  <Divider type={responsive ? 'horizontal' : 'vertical'} />
                  <StatisticCard
                    statistic={{
                      title: '挖矿收益点',
                      value: marketsInfo.get(id)?.comp_speed,
                    }}
                  />

                </ProCard>
              </StatisticCard.Group>
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
      </RcResizeObserver>
    </PageContainer >
  );
};

export default MarketPage;
