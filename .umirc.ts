import { defineConfig } from '@umijs/max';

export default defineConfig({
  antd: {},
  access: {},
  model: {},
  initialState: {},
  request: {},
  proxy: {
    '/api': {
      'target': 'https://v2.wanlend.finance:8889/',
      'changeOrigin': true,
      'pathRewrite': { '^/api' : '' },
    },
    '/rpc': {
      'target': 'https://nodes.wandevs.org/wan',
      'changeOrigin': true,
      'pathRewrite': { '^/rpc' : '' },
    },
  },
  layout: {
    title: '@umijs/max',
  },
//   routes: [
//     {
//       path: '/',
//       redirect: '/home',
//     },
//     {
//       name: '首页',
//       path: '/home',
//       component: './Home',
//     },
//     {
//       name: '权限演示',
//       path: '/access',
//       component: './Access',
//     },
//     {
//       name: ' CRUD 示例',
//       path: '/table',
//       component: './Table',
//     },
//   ],
  npmClient: 'pnpm',
});

