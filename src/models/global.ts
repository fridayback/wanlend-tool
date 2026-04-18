// 全局共享数据示例
import { DEFAULT_NAME } from '@/constants';
import { useState, useEffect } from 'react';
import UserController from '../services/demo';
import Item from 'antd/es/list/Item';




const global = () => {
  const [name, setName] = useState<string>(DEFAULT_NAME);
  const [blockNumber, setBlockNumber] = useState<Number>(0);
  const [marketsInfo, setMarketsInfo] = useState<Map<string, API.MarketInfo>>(new Map());

  const [accountInfo, setAccountInfo] = useState<API.AccountInfo | undefined>();
  const [menuList, setMenuList] = useState<API.MenuItemInfo[]>([]);
  
  // 全局用户列表状态
  const [userList, setUserList] = useState<API.UserListItem[]>([]);
  // 全局账户详情状态
  const [accountDetails, setAccountDetails] = useState<API.AccountInfo[]>([]);

  useEffect(() => {
    UserController.UserController.getMarkets(undefined).then((res: any) => {
      console.log(res);
      let data = new Map<string, API.MarketInfo>();
      let menuItemInfo: API.MenuItemInfo[] = [];
      if (res && res.markets) {
        res.markets.forEach((item: API.MarketInfo) => {
          data.set(item.token_address, item);
          menuItemInfo.push({ key: item.token_address, name: item.underlying_symbol });
        });
      }
      menuItemInfo = menuItemInfo.sort((a,b)=>{
        if(a.name == 'WAN') return -1;
        if(b.name == 'WAN') return 1;
        if(a.name == b.name) return 0;
        return a.name < b.name ? -1: 1;
      })
      setMarketsInfo(data);
      setMenuList(menuItemInfo);
      // console.log('markets =', data);
      // console.log('menus =', menuItemInfo);

    });
  }, [blockNumber]);

  useEffect(() => {
    UserController.UserController.getAccount({ addresses: ["0x1d1e18e1a484d0a10623661546ba97defab7a7ae"] }).then((res: API.Result_accounts_) => {
      // console.log('Account =', res);
      let data = res?.accounts && res.accounts.length > 0 ? res.accounts[0] : undefined;

      // for (let i = 0; i < data.tokens.length; i++) {
      //   const token = data.tokens[i];

      // }
      // data.tokens.forEach((item: API.AccountTokenInfo) =>
      //   data.set(item.token_address, item)
      // );
      setAccountInfo(data);
    });
  }, [blockNumber]);

  return {
    name,
    setName,
    blockNumber,
    setBlockNumber,
    marketsInfo,
    setMarketsInfo,
    menuList, 
    setMenuList,
    // 全局用户状态
    userList,
    setUserList,
    accountDetails,
    setAccountDetails,
  };
};


export default global;
