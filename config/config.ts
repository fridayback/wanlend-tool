import { defineConfig } from '@umijs/max';

export default defineConfig({
    antd: {},
    access: {},
    model: {},
    initialState: {},
    title: 'Wanlend View title',
    request: {},
    layout: {
        title: 'Wanlend View',
    },
    // routes: [
    //     {
    //         path: '/',
    //         redirect: '/home',
    //     },
    //     {
    //         name: '首页',
    //         path: '/home',
    //         component: './Home',
    //     },
    //     {
    //         name: '权限演示',
    //         path: '/access',
    //         component: './Access',
    //     },
    //     {
    //         name: ' CRUD 示例',
    //         path: '/table',
    //         component: './Table',
    //     },
    //     {
    //         name: 'Market',
    //         path: '/maket/:id',
    //         component: './Market/$id',
    //     }
    // ],
    npmClient: 'pnpm',
});

