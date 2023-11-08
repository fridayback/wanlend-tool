// 示例方法，没有实际意义
export function trim(str: string) {
  return str.trim();
}

export const requestData = {
  prefix: '',
  method: 'get',
  errorConfig: {
    adaptor: (resData:any) => {
      return {
        ...resData,
        success: resData.ok,
        errorMessage: resData.message,
      };
    },
  },
};