/**
 * Type definitions cho Analytics Events (GA4, GTM, Microsoft Clarity)
 */

export interface GA4Item {
  item_id: string;
  item_name: string;
  item_category?: string;
  item_brand?: string;
  price?: number;
  quantity?: number;
  item_variant?: string;
}

export interface AnalyticsEventParams {
  [key: string]: string | number | boolean | GA4Item[] | undefined;
}

export type LoginMethod = 'google' | 'facebook' | 'password';

export type EventName =
  | 'page_view'
  | 'view_item_list'
  | 'select_item'
  | 'view_item'
  | 'select_size'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'view_cart'
  | 'begin_checkout'
  | 'purchase'
  | 'click_hero_banner'
  | 'click_collection'
  | 'click_sale_banner'
  | 'open_size_guide'
  | 'filter_products'
  | 'search'
  | 'login_modal_open'
  | 'login_modal_close'
  | 'login'
  | 'logout';

export interface DataLayerEvent {
  event: EventName;
  ecommerce?: {
    currency?: string;
    value?: number;
    items?: GA4Item[];
    transaction_id?: string;
  };
  custom_data?: AnalyticsEventParams;
}
