import Guide from '@/components/Guide';
// import { trim, requestData } from '@/utils/format';
import { PageContainer } from '@ant-design/pro-components';
import { useModel, useRequest, useRouteProps } from '@umijs/max';
import styles from './index.less';
import { Button } from 'antd';
import React, { useState } from 'react';
import { message } from 'antd';

function getBlockNumber(): Promise<{ success: boolean, data: Object }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, data: { blockNumber: Date.now() } });
    }, 1000);
  });
}

function getName(): Promise<{ success: boolean, data: {name:String} }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true, data: { name: 'name:'+Date.now() } });
    }, 1000);
  });
}

const HomePage: React.FC = () => {
  const { name,setName, blockNumber, setBlockNumber } = useModel('global');
  // const loading = false;
  // const run = (name:String) => {
  //   message.success(`The username was changed to "${name}" !`);
  // }
  const {routes} = useRouteProps();
  console.log('show Home page',routes);
  const { loading, run } = useRequest(getBlockNumber, {
    manual: true,
    pollingInterval: 2000,
    onSuccess: (result) => {
      setBlockNumber(result.blockNumber);
      console.log(`The blockNumber was changed to "${result.blockNumber}" at ${Date.now()}!`);
    },
    onError: (error, params) => {
      message.error('请求失败' + JSON.stringify(error) + ' ,' + JSON.stringify(params));
    }
  });
  const {data} = useRequest(getName,{
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
      content="欢迎使用 ProLayout 组件"
      tabList={[
        {
          tab: '基本信息',
          key: 'base',
        },
        {
          tab: '详细信息',
          key: 'info',
        },
      ]}
      extra={[
        <Button key="3">操作</Button>,
        <Button key="2">操作</Button>,
        <Button key="1" type="primary">
          主操作
        </Button>,
      ]}
      footer={[
        <Button key="rest">重置</Button>,
        <Button key="submit" type="primary">
          提交
        </Button>,
      ]}
    >
      <div className={styles.container}>
        {/* <Guide name={trim(name)} /> */}
        <input
          onChange={(e) => setName(e.target.value)}
          value={name}
          placeholder="Please enter username"
          style={{ width: 240, marginRight: 16 }}
        />
        <button disabled={loading} type="button" onClick={() => run()}>
          {(loading ? 'Loading' : 'Edit') + '  (' + blockNumber+')'}
        </button>
      </div>
    </PageContainer>
  );
};

export default HomePage;
