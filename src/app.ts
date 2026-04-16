// umi 运行时配置
import {
  PieChartOutlined, UserOutlined, DotChartOutlined, SlidersOutlined,
  ClearOutlined
} from '@ant-design/icons';
import { RunTimeLayoutConfig, useAppData, RequestConfig } from '@umijs/max';
import React from 'react';
import { MenuDataItem } from '@ant-design/pro-components'
import { message, notification } from 'antd';
import { useModel } from '@umijs/max';
import marketInfo from './pages/Market/$id/components/marketInfo';

// // 错误处理方案： 错误类型
// enum ErrorShowType {
//   SILENT = 0,
//   WARN_MESSAGE = 1,
//   ERROR_MESSAGE = 2,
//   NOTIFICATION = 3,
//   REDIRECT = 9,
// }
// // 与后端约定的响应数据格式
// interface ResponseStructure {
//   success: boolean;
//   data: any;
//   errorCode?: number;
//   errorMessage?: string;
//   showType?: ErrorShowType;
// }

// 运行时配置
// export const request: RequestConfig = {
//   // 统一的请求设定
//   timeout: 5000,
//   headers: {'X-Requested-With': 'XMLHttpRequest'},

//   // 错误处理： umi@3 的错误处理方案。
//   errorConfig: {
//     // 错误抛出
//     errorThrower: (res: ResponseStructure) => {
//       const { success, data, errorCode, errorMessage, showType } = res;
//       if (!success) {
//         const error: any = new Error(errorMessage);
//         error.name = 'BizError';
//         error.info = { errorCode, errorMessage, showType, data };
//         throw error; // 抛出自制的错误
//       }
//     },
//     // 错误接收及处理
//     errorHandler: (error: any, opts: any) => {
//       if (opts?.skipErrorHandler) throw error;
//       // 我们的 errorThrower 抛出的错误。
//       if (error.name === 'BizError') {
//         const errorInfo: ResponseStructure | undefined = error.info;
//         if (errorInfo) {
//           const { errorMessage, errorCode } = errorInfo;
//           switch (errorInfo.showType) {
//             case ErrorShowType.SILENT:
//               // do nothing
//               break;
//             case ErrorShowType.WARN_MESSAGE:
//               message.warning(errorMessage);
//               break;
//             case ErrorShowType.ERROR_MESSAGE:
//               message.error(errorMessage);
//               break;
//             case ErrorShowType.NOTIFICATION:
//               notification.open({
//                 description: errorMessage,
//                 message: errorCode,
//               });
//               break;
//             case ErrorShowType.REDIRECT:
//               // TODO: redirect
//               break;
//             default:
//               message.error(errorMessage);
//           }
//         }
//       } else if (error.response) {
//         // Axios 的错误
//         // 请求成功发出且服务器也响应了状态码，但状态代码超出了 2xx 的范围
//         message.error(`Response status:${error.response.status}`);
//       } else if (error.request) {
//         // 请求已经成功发起，但没有收到响应
//         // \`error.request\` 在浏览器中是 XMLHttpRequest 的实例，
//         // 而在node.js中是 http.ClientRequest 的实例
//         message.error('None response! Please retry.');
//       } else {
//         // 发送请求时出了点问题
//         message.error('Request error, please retry.');
//       }
//     },

//   },

//   // 请求拦截器
//   requestInterceptors: [
//     (config) => {
//     // 拦截请求配置，进行个性化处理。
//       const url = config.url.concat('?token = 123');
//       return { ...config, url};
//     }
//   ],

//   // 响应拦截器
//   responseInterceptors: [
//     (response) => {
//        // 拦截响应数据，进行个性化处理
//        const { data } = response;
//        if(!data.success){
//          message.error('请求失败！');
//        }
//        return response;
//     }
//   ]
// };

const menuData: MenuDataItem[] = [
  {
    children: [
      // {
      //   children: [],
      //   name: "WAN",
      //   key: "WAN-key",
      //   path: "/Market/0x48c42529c4c8e3d10060e04240e9ec6cd0eb1218",
      //   icon: React.createElement(DotChartOutlined),
      //   unaccessible: false,
      // },
      // {
      //   children: [],
      //   name: "ETH",
      //   key: "ETH-key",
      //   path: "/market/0x915059e4917d6c2f76b6cc37868cc4d61bc0c7a5",
      //   icon: React.createElement(SlidersOutlined),
      //   unaccessible: false
      // },
      // {
      //   children: [],
      //   name: "BTC",
      //   key: "BTC-key",
      //   path: "/market/0x040007866aa406908c70f7da53425cae191a9a46",
      //   icon: React.createElement(DotChartOutlined),
      //   unaccessible: false
      // }
    ],
    name: "Market",
    path: "/Market/0x48c42529c4c8e3d10060e04240e9ec6cd0eb1218",
    icon: React.createElement(PieChartOutlined),
    unaccessible: false
  },
  {
    children: [],
    name: "User Account",
    path: "/Table",
    icon: React.createElement(UserOutlined),
    unaccessible: false
  },
  {
    children: [],
    name: "Liquidation",
    path: "/Access",
    icon: React.createElement(ClearOutlined),
    unaccessible: false
  },

];


// const fetchMenuData = async (params, defaultMenuData) => {
//   return new Promise((resolve, reject) => {
//     setTimeout(() => {
//       // const { marketsInfo } = useModel('global');
//       console.log('^^^params=====>', params);
//       // marketInfos.forEach(
//       //   (key,item) => {
//       //     defaultMenuData.push({
//       //       children: [],
//       //       name: item.symbol,
//       //       key: item.token_address,
//       //       path: `/Market/${item.token_address}`,
//       //       icon: React.createElement(DotChartOutlined),
//       //       unaccessible: false
//       //     }
//       //     )
//       //   }
//       // )
//       const menud = defaultMenuData.concat(menuData);
//       console.log('menuData', defaultMenuData, menuData);
//       resolve(menuData);
//     }, 1000)
//   });
// }

export const layout: RunTimeLayoutConfig = (initialState) => {
  // console.log('initialState', initialState);
  const dd = useAppData();
  const { menuList } = useModel('global');
  // console.log('layout page:', dd,menuList);
  return {
    // 常用属性
    menu: {
      params: menuList,//initialState.initialState.params,
      request: async (params, defaultMenuData) => {
        console.log('&&&&&&&&----1:',menuData,menuList)
        menuList.forEach(item => {
          menuData[0].children.push({
            children: [],
            name: item.name,
            // key: item.key,
            path: `/Market/${item.key}`,
            icon: React.createElement(DotChartOutlined),
            unaccessible: false
          })
        });
        menuData[0].path =  menuData[0].children?.length > 0 ? menuData[0].children[0].path : "/",
        console.log('&&&&&&&&----2:',menuData)
        return menuData;
      }
    },
      title: initialState.initialState.name,
      logo: 'https://img.alicdn.com/tfs/TB1YHEpwUT1gK0jSZFhXXaAtVXa-28-27.svg',
      // // 默认布局调整
      // rightContentRender: undefined,//() => <RightContent />,
      // footerRender: undefined,//() => <Footer />,
      // menuHeaderRender: undefined,
      disableContentMargin: false,
      waterMarkProps: {
        content: initialState.initialState.name// +JSON.stringify(initialState),
      },
      onPageChange: (location) => {
        console.log('onPageChange', location);
      },
      // 其他属性见：https://procomponents.ant.design/components/layout#prolayout
      layout: 'side',
      onError(err) {
        console.log(err);
      },
      // ErrorBoundary: () => null,
      //   chainWebpack: (config, { webpack }) => {
      // },
    };
  };

  // 全局初始化数据配置，用于 Layout 用户信息和权限初始化
  // 更多信息见文档：https://umijs.org/docs/api/runtime-config#getinitialstate
  export async function getInitialState(): Promise<{ name: string }> {
    return { name: 'Wanlend RR View' };
  }

// export const layout = () => {
//   return {
//     logo: 'https://img.alicdn.com/tfs/TB1YHEpwUT1gK0jSZFhXXaAtVXa-28-27.svg',
//     menu: {
//       locale: false,
//     },
//   };
// };
