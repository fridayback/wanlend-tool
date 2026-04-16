/* eslint-disable */
// 该文件由 OneAPI 自动生成，请勿手动修改！

declare namespace API {
  interface PageInfo {
    /** 
1 */
    current?: number;
    pageSize?: number;
    total?: number;
    list?: Array<Record<string, any>>;
  }

  interface PageInfo_UserInfo_ {
    /** 
1 */
    current?: number;
    pageSize?: number;
    total?: number;
    list?: Array<UserInfo>;
  }

  interface Result {
    success?: boolean;
    errorMessage?: string;
    data?: Record<string, any>;
  }

  interface Result_PageInfo_UserInfo__ {
    success?: boolean;
    errorMessage?: string;
    data?: PageInfo_UserInfo_;
  }

  interface Result_UserInfo_ {
    success?: boolean;
    errorMessage?: string;
    data?: UserInfo;
  }

  interface Result_string_ {
    success?: boolean;
    errorMessage?: string;
    data?: string;
  }

  type UserGenderEnum = 'MALE' | 'FEMALE';

  interface UserInfo {
    id?: string;
    name?: string;
    /** nick */
    nickName?: string;
    /** email */
    email?: string;
    gender?: UserGenderEnum;
  }

  interface UserInfoVO {
    name?: string;
    /** nick */
    nickName?: string;
    /** email */
    email?: string;
  }

  type definitions_0 = null;

  interface MarketInfo {
    cash: string;
    collateral_factor: string;
    exchange_rate: string;
    interest_rate_model_address: string;
    name: string;
    symbol: string;
    decimals: string;
    token_address: string;
    underlying_address: string;
    underlying_name: string;
    underlying_symbol: string;
    underlying_decimals: string;
    number_of_borrowers: string;
    number_of_suppliers: string;
    underlying_price: string;
    reserves: string;
    borrow_index: string;
    accrual_block_number: string;
    supply_rate: string;
    borrow_rate: string;
    total_supply: string;
    total_borrows: string;
    timestamp: string;
    price_oracle: string;
    close_factor: string;
    liquidation_incentive: string;
    multiplierPerBlock: string;
    baseRatePerBlock: string;
    comp_speed: string;
    comp_index_borrow: string;
    comp_block_borrow: string;
    comp_index_supply: string;
    comp_block_supply: string;
    rewardAddress: string;
    totalSpeed: string;
    halfBonusPerBlock: string;
    startBlock: string;
    borrowCap: string;
    reserve_factor: string;
  };

  interface AccountTokenInfo {
    account_address: string;
    token_address: string;
    is_entered: boolean;
    account_total_borrow: string;
    account_total_repay: string;
    account_total_supply: string;
    account_total_redeem: string;
    account_total_liquidated: string;
    account_total_liquidate: string;
    lifetime_borrow_interest_accrued: string;
    lifetime_supply_interest_accrued: string;
    supply_balance: string;
    borrow_balance_underlying: string;
    supply_balance_underlying: string;
    timestamp: string;
    comp_index_borrow: string;
    comp_index_supply: string
  }

  interface AccountInfo {
    address: string;
    health: string;
    net_asset_value: string;
    tokens: AccountTokenInfo[];
    total_borrow_value: string;
    total_collateral_value: string;
    timestamp: number;
    comp_reward: string;
    rewardAddress: string;
    rewardBalance: string;
  }

  interface MenuItemInfo {
    key: string;
    name: string;
  }
}
