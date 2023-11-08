/* eslint-disable */
// 该文件由 OneAPI 自动生成，请勿手动修改！
import { request } from '@umijs/max';

/** 此处后端没有提供注释 GET /api/v1/queryUserList */
export async function queryUserList(
  params: {
    // query
    /** keyword */
    keyword?: string;
    /** current */
    current?: number;
    /** pageSize */
    pageSize?: number;
  },
  options?: { [key: string]: any },
) {
  return request<API.Result_PageInfo_UserInfo__>('/api/v1/queryUserList', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 此处后端没有提供注释 POST /api/v1/user */
export async function addUser(
  body?: API.UserInfoVO,
  options?: { [key: string]: any },
) {
  return request<API.Result_UserInfo_>('/api/v1/user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 此处后端没有提供注释 GET /api/v1/user/${param0} */
export async function getUserDetail(
  params: {
    // path
    /** userId */
    userId?: string;
  },
  options?: { [key: string]: any },
) {
  const { userId: param0 } = params;
  return request<API.Result_UserInfo_>(`/api/v1/user/${param0}`, {
    method: 'GET',
    params: { ...params },
    ...(options || {}),
  });
}

/** 此处后端没有提供注释 PUT /api/v1/user/${param0} */
export async function modifyUser(
  params: {
    // path
    /** userId */
    userId?: string;
  },
  body?: API.UserInfoVO,
  options?: { [key: string]: any },
) {
  const { userId: param0 } = params;
  return request<API.Result_UserInfo_>(`/api/v1/user/${param0}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    params: { ...params },
    data: body,
    ...(options || {}),
  });
}

/** 此处后端没有提供注释 DELETE /api/v1/user/${param0} */
export async function deleteUser(
  params: {
    // path
    /** userId */
    userId?: string;
  },
  options?: { [key: string]: any },
) {
  const { userId: param0 } = params;
  return request<API.Result_string_>(`/api/v1/user/${param0}`, {
    method: 'DELETE',
    params: { ...params },
    ...(options || {}),
  });
}

export async function getMarkets(
  params?: { marketId: string },
  options?: { [key: string]: any },
) {
  const id = params?.marketId;
  if (id) {
    console.log('======================> 1');
    return request<API.Result_string_>(`/api/market/addresses=[${id}]`, {
      method: 'GET',
      params: { ...params },
      ...(options || {}),
    });
  } else {
    console.log('======================> 2');
    return request<API.Result_string_>(`/api/market`, {
      method: 'GET',
      params: { ...params },
      ...(options || {}),
    });
  }
}

export async function getAccount(
  params: { addresses: string[] },
  options?: { [key: string]: any },
) {
  const { addresses: id } = params;
  if (id) {
    // console.log('======================> 3',JSON.stringify(id));
    return request<API.Result_string_>(`/api/account`, {
      method: 'GET',
      params: { addresses: JSON.stringify(id)},
      ...(options || {}),
    });
  } else {
    // console.log('======================> 4');
    return request<API.Result_string_>(`/api/account`, {
      method: 'GET',
      params: { ...params },
      ...(options || {}),
    });
  }
}