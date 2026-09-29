// T'PETIE E-COMMERCE — PostgreSQL / dbdiagram.io
// Bản thiết kế mục tiêu. Không áp dụng trực tiếp lên CSDL cũ nếu chưa lập migration.
// Quy ước: tiền là số nguyên VND (bigint); timestamp dùng timestamptz (UTC trong DB).
// ID varchar được giữ để hỗ trợ di chuyển từ schema hiện tại; ứng dụng phải cấp ID nhất quán.
// Schema thể hiện cấu trúc, KHÔNG thay thế transaction, kiểm soát quyền và kiểm tra chuyển trạng thái.

Project tpetie_ecommerce {
  database_type: 'PostgreSQL'
  Note: 'Catalog, checkout, inventory, payment, delivery and audit for T\'Petie.'
}

Enum role {
  CUSTOMER
  STAFF
  ADMIN
}

Enum user_status {
  ACTIVE
  BLOCKED
}

Enum baby_gender {
  GIRL
  BOY
  UNSPECIFIED
}

Enum order_status {
  PENDING
  CONFIRMED
  PROCESSING
  SHIPPING
  COMPLETED
  CANCELLED
}

Enum payment_status {
  PENDING
  PAID
  PARTIALLY_REFUNDED
  REFUNDED
  FAILED
}

Enum payment_method {
  COD
  BANK_TRANSFER_QR
  MOMO
}

Enum payment_attempt_status {
  PENDING
  SUCCEEDED
  FAILED
  CANCELLED
}

Enum refund_status {
  PENDING
  SUCCEEDED
  FAILED
}

Enum reservation_status {
  ACTIVE
  CONSUMED
  RELEASED
}

Enum inventory_movement_type {
  INITIAL
  RESERVE
  RELEASE
  ADJUSTMENT
  RETURN
}

Enum shipment_status {
  PENDING
  PICKED_UP
  IN_TRANSIT
  DELIVERED
  FAILED
  RETURNED
}

Enum review_status {
  PENDING
  APPROVED
  REJECTED
}

Enum coupon_discount_type {
  FIXED
  PERCENT
}

Enum points_reason {
  SIGNUP_BONUS
  ORDER_EARN
  ORDER_REDEEM
  ORDER_CANCEL_RESTORE
  REFUND_REVERSAL
  MANUAL_ADJUSTMENT
}

// ==========================================================
// 1. IDENTITY & CUSTOMER DATA
// ==========================================================

Table users {
  id varchar [pk]
  email varchar [unique, note: 'Normalize email to lowercase before write; nullable for phone-only accounts.']
  phone varchar [unique, note: 'Store normalized phone, preferably E.164 when applicable.']
  password varchar [note: 'Nullable for OAuth-only users; store password hash, never plaintext.']
  role role [not null, default: 'CUSTOMER']
  status user_status [not null, default: 'ACTIVE']
  name varchar [not null]
  avatar varchar
  email_verified timestamptz
  points int [not null, default: 100, note: 'Cached balance. Create matching SIGNUP_BONUS ledger entry in the same transaction for new users.']
  last_login_at timestamptz
  last_login_ip varchar
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
  deleted_at timestamptz [note: 'Soft-delete/de-identify by policy; do not casually delete financial history.']

  checks {
    `points >= 0` [name: 'users_points_nonnegative']
  }

  Indexes {
    (status, created_at)
  }
}

Table baby_profiles {
  id varchar [pk]
  user_id varchar [not null]
  baby_name varchar
  baby_birth_date date
  baby_gender baby_gender [not null, default: 'UNSPECIFIED']
  baby_weight_kg numeric(5,2)
  baby_height_cm numeric(5,1)
  recommended_size varchar [note: 'Suggestion only; recalculate when measurements change.']
  is_default boolean [not null, default: false]
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]

  checks {
    `baby_weight_kg IS NULL OR baby_weight_kg > 0` [name: 'baby_weight_positive']
    `baby_height_cm IS NULL OR baby_height_cm > 0` [name: 'baby_height_positive']
  }

  Indexes {
    user_id
  }
}

Table addresses {
  id varchar [pk]
  user_id varchar [not null]
  recipient_name varchar [not null]
  phone varchar [not null]
  city varchar [not null]
  district varchar [not null]
  ward varchar
  street_address varchar [not null]
  is_default boolean [not null, default: false]
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]

  Indexes {
    user_id
  }
}

Table accounts {
  id varchar [pk]
  user_id varchar [not null]
  type varchar [not null]
  provider varchar [not null]
  provider_account_id varchar [not null]
  refresh_token text [note: 'Encrypt or avoid persisting when not needed.']
  access_token text [note: 'Encrypt or avoid persisting when not needed.']
  expires_at bigint
  token_type varchar
  scope varchar
  id_token text [note: 'Encrypt or avoid persisting when not needed.']
  session_state varchar

  Indexes {
    (provider, provider_account_id) [unique]
    user_id
  }
}

Table sessions {
  id varchar [pk]
  session_token varchar [unique, not null, note: 'Kept for auth-adapter compatibility; restrict DB access and rotate on compromise.']
  user_id varchar [not null]
  expires timestamptz [not null]

  Indexes {
    user_id
    expires
  }
}

// ==========================================================
// 2. CATALOG & MERCHANDISING
// ==========================================================

Table categories {
  id varchar [pk]
  name varchar [not null]
  slug varchar [unique, not null]
  image_url varchar
  parent_id varchar
  sort_order int [not null, default: 0]
  is_active boolean [not null, default: true]
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]

  checks {
    `parent_id IS NULL OR parent_id <> id` [name: 'categories_not_own_parent']
  }

  Indexes {
    (parent_id, sort_order)
  }
}

Table collections {
  id varchar [pk]
  title varchar [not null]
  slug varchar [unique, not null]
  subtitle varchar
  story text
  banner_url varchar [not null]
  lookbook_urls text[]
  theme_color varchar
  accent_color varchar
  season varchar
  badge varchar
  is_active boolean [not null, default: true]
  sort_order int [not null, default: 0]
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]
}

Table products {
  id varchar [pk]
  sku varchar [unique, not null, note: 'Product/group SKU; variant SKU is separately unique.']
  name varchar [not null]
  slug varchar [unique, not null]
  category_id varchar
  collection_id varchar
  material varchar
  material_features text[]
  description text
  specifications text
  origin varchar [not null, default: 'Việt Nam']
  color_name varchar
  color_hex varchar
  base_price bigint [not null, note: 'Catalog display price; keep synchronized with active variant prices. Checkout uses product_variants.price.']
  original_price bigint [note: 'Optional compare-at/list price for catalog display.']
  discount_percent int [not null, default: 0, note: 'Legacy display metadata; never recalculate checkout from this field.']
  sale_campaign varchar
  is_best_seller boolean [not null, default: false]
  is_new_arrival boolean [not null, default: false]
  is_sale boolean [not null, default: false, note: 'Catalog display flag; synchronize with pricing rules.']
  is_active boolean [not null, default: true]
  rating numeric(3,2) [note: 'NULL when no approved reviews. Cached aggregate.']
  review_count int [not null, default: 0]
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]

  checks {
    `base_price >= 0` [name: 'products_base_price_nonnegative']
    `original_price IS NULL OR original_price >= 0` [name: 'products_original_price_nonnegative']
    `discount_percent BETWEEN 0 AND 100` [name: 'products_discount_range']
    `review_count >= 0` [name: 'products_review_count_nonnegative']
    `rating IS NULL OR (rating >= 1 AND rating <= 5)` [name: 'products_rating_range']
  }

  Indexes {
    (category_id, is_active)
    (collection_id, is_active)
    (is_active, is_sale)
    (is_active, created_at)
  }
}

Table product_images {
  id varchar [pk]
  product_id varchar [not null]
  url varchar [not null]
  alt_text varchar
  is_primary boolean [not null, default: false]
  sort_order int [not null, default: 0]
  created_at timestamptz [not null, default: `now()`]

  Indexes {
    (product_id, sort_order)
  }
}

Table product_variants {
  id varchar [pk]
  product_id varchar [not null]
  sku varchar [unique, not null]
  size varchar [not null]
  weight_range varchar
  age_range varchar
  price bigint [not null, note: 'Actual unit price at checkout BEFORE cart/order-level discounts.']
  stock int [not null, default: 0, note: 'Available-to-sell stock. Decrease on reserve, restore on release.']
  is_active boolean [not null, default: true]
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]

  checks {
    `price >= 0` [name: 'variants_price_nonnegative']
    `stock >= 0` [name: 'variants_stock_nonnegative']
  }

  Indexes {
    (product_id, size) [unique]
    (id, product_id) [unique, note: 'Composite key target: ensures an order item variant belongs to its product.']
  }
}

Table reviews {
  id varchar [pk]
  product_id varchar [not null]
  order_item_id varchar [unique, not null, note: 'One verified-purchase review per order item.']
  user_id varchar [note: 'May be NULL when account is removed; preserve historical review by policy.']
  reviewer_name varchar [not null]
  rating int [not null]
  title varchar
  content text
  status review_status [not null, default: 'PENDING']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]

  checks {
    `rating BETWEEN 1 AND 5` [name: 'reviews_rating_range']
  }

  Indexes {
    (product_id, status, created_at)
    user_id
  }
}

// ==========================================================
// 3. CART, COUPONS & CHECKOUT
// ==========================================================

Table carts {
  id varchar [pk]
  user_id varchar [unique]
  guest_key_hash varchar [unique, note: 'Hash of opaque guest-cart token; do not store raw token.']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]

  checks {
    `((user_id IS NOT NULL) <> (guest_key_hash IS NOT NULL))` [name: 'carts_one_owner_kind']
  }
}

Table cart_items {
  id varchar [pk]
  cart_id varchar [not null]
  variant_id varchar [not null]
  quantity int [not null, default: 1]
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]

  checks {
    `quantity > 0` [name: 'cart_items_quantity_positive']
  }

  Indexes {
    (cart_id, variant_id) [unique]
    variant_id
  }
}

Table coupons {
  id varchar [pk]
  code varchar [unique, not null, note: 'Normalize to uppercase before write.']
  discount_type coupon_discount_type [not null]
  discount_value bigint [not null, note: 'FIXED: VND. PERCENT: whole percentage (0..100).']
  min_order_amount bigint [not null, default: 0]
  max_discount_amount bigint
  max_uses int
  per_user_limit int
  starts_at timestamptz
  ends_at timestamptz
  is_active boolean [not null, default: true]
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]

  checks {
    `discount_value > 0` [name: 'coupons_discount_positive']
    `discount_type <> 'PERCENT' OR discount_value <= 100` [name: 'coupons_percent_limit']
    `min_order_amount >= 0` [name: 'coupons_min_order_nonnegative']
    `max_discount_amount IS NULL OR max_discount_amount >= 0` [name: 'coupons_cap_nonnegative']
    `max_uses IS NULL OR max_uses > 0` [name: 'coupons_max_uses_positive']
    `per_user_limit IS NULL OR per_user_limit > 0` [name: 'coupons_per_user_limit_positive']
    `starts_at IS NULL OR ends_at IS NULL OR starts_at < ends_at` [name: 'coupons_valid_period']
  }

  Indexes {
    (is_active, starts_at, ends_at)
  }
}

Table orders {
  id varchar [pk]
  order_code varchar [unique, not null]
  user_id varchar [note: 'NULL supports guest checkout / removed customer.']
  idempotency_key varchar [unique, note: 'Optional checkout retry key, scoped by the application.']
  customer_name varchar [not null]
  customer_phone varchar [not null]
  customer_email varchar
  shipping_address varchar [not null]
  city varchar [not null]
  district varchar [not null]
  ward varchar
  order_note text
  gift_wrap boolean [not null, default: false]
  gift_message text
  currency varchar(3) [not null, default: 'VND']
  subtotal bigint [not null, note: 'Sum of order_items.total_price; calculate in checkout transaction.']
  shipping_fee bigint [not null, default: 0]
  discount_amount bigint [not null, default: 0, note: 'Includes coupon and redeemed points, if applicable.']
  total_amount bigint [not null]
  promo_code varchar [note: 'Snapshot of accepted coupon; not a live foreign key.']
  payment_method payment_method [not null, default: 'COD']
  payment_status payment_status [not null, default: 'PENDING', note: 'Order-level projection from payment/refund records.']
  order_status order_status [not null, default: 'PENDING']
  cancelled_reason varchar
  paid_at timestamptz
  completed_at timestamptz
  cancelled_at timestamptz
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]

  checks {
    `subtotal >= 0 AND shipping_fee >= 0 AND discount_amount >= 0 AND total_amount >= 0` [name: 'orders_amounts_nonnegative']
    `total_amount = subtotal + shipping_fee - discount_amount` [name: 'orders_total_formula']
    `currency = 'VND'` [name: 'orders_vnd_only']
  }

  Indexes {
    (user_id, created_at)
    (order_status, created_at)
    (payment_status, created_at)
    created_at
  }
}

Table order_items {
  id varchar [pk]
  order_id varchar [not null]
  product_id varchar [not null, note: 'Retain catalog rows using is_active=false; do not physically delete referenced products.']
  variant_id varchar [not null]
  product_name varchar [not null]
  product_sku varchar [not null, note: 'Variant SKU snapshot at purchase time.']
  variant_size varchar [not null]
  product_image_url varchar
  unit_price bigint [not null, note: 'Actual item price at purchase time, before order-level discount.']
  quantity int [not null]
  total_price bigint [not null]
  created_at timestamptz [not null, default: `now()`]

  checks {
    `unit_price >= 0 AND total_price >= 0` [name: 'order_items_prices_nonnegative']
    `quantity > 0` [name: 'order_items_quantity_positive']
    `total_price = unit_price * quantity` [name: 'order_items_total_formula']
  }

  Indexes {
    order_id
    (variant_id, product_id)
    product_id
  }
}

Table coupon_redemptions {
  id varchar [pk]
  coupon_id varchar [not null]
  order_id varchar [unique, not null, note: 'At most one coupon per order in this design.']
  user_id varchar [note: 'NULL for guest checkout; enforce guest limits separately.']
  discount_amount bigint [not null]
  created_at timestamptz [not null, default: `now()`]

  checks {
    `discount_amount >= 0` [name: 'coupon_redemptions_amount_nonnegative']
  }

  Indexes {
    (coupon_id, created_at)
    (coupon_id, user_id)
  }
}

Table order_status_history {
  id varchar [pk]
  order_id varchar [not null]
  from_status order_status
  to_status order_status [not null]
  changed_by_user_id varchar
  reason varchar
  created_at timestamptz [not null, default: `now()`]

  Indexes {
    (order_id, created_at)
    changed_by_user_id
  }
}

// ==========================================================
// 4. STOCK & RESERVATIONS
// ==========================================================

Table stock_reservations {
  id varchar [pk]
  order_item_id varchar [unique, not null]
  variant_id varchar [not null]
  quantity int [not null]
  status reservation_status [not null, default: 'ACTIVE']
  expires_at timestamptz [note: 'Set for orders with a payment/confirmation timeout.']
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]

  checks {
    `quantity > 0` [name: 'stock_reservations_quantity_positive']
  }

  Indexes {
    (status, expires_at)
    variant_id
  }
}

Table inventory_movements {
  id varchar [pk]
  variant_id varchar [not null]
  order_item_id varchar
  reservation_id varchar
  movement_type inventory_movement_type [not null]
  quantity_delta int [not null, note: 'Signed change to product_variants.stock; reservation consumption has no stock delta.']
  stock_after int [not null]
  reason varchar
  actor_user_id varchar
  idempotency_key varchar [unique, note: 'Prevent duplicate movement on retries when present.']
  created_at timestamptz [not null, default: `now()`]

  checks {
    `quantity_delta <> 0` [name: 'inventory_movements_nonzero_delta']
    `stock_after >= 0` [name: 'inventory_movements_stock_after_nonnegative']
  }

  Indexes {
    (variant_id, created_at)
    order_item_id
    reservation_id
  }
}

// ==========================================================
// 5. PAYMENTS, REFUNDS & SHIPPING
// ==========================================================

Table payments {
  id varchar [pk]
  order_id varchar [not null]
  method payment_method [not null]
  provider varchar [not null, note: 'Examples: COD, bank integration, MoMo. Provider is not necessarily equal to method.']
  provider_transaction_id varchar
  idempotency_key varchar [unique]
  amount bigint [not null]
  currency varchar(3) [not null, default: 'VND']
  status payment_attempt_status [not null, default: 'PENDING']
  failure_reason varchar
  paid_at timestamptz
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]

  checks {
    `amount >= 0` [name: 'payments_amount_nonnegative']
    `currency = 'VND'` [name: 'payments_vnd_only']
  }

  Indexes {
    (provider, provider_transaction_id) [unique]
    (order_id, created_at)
    (status, created_at)
  }
}

Table payment_events {
  id varchar [pk]
  provider varchar [not null]
  provider_event_id varchar [not null]
  payment_id varchar
  event_type varchar [not null]
  payload jsonb [note: 'Store only required fields; redact sensitive data and define retention.']
  received_at timestamptz [not null, default: `now()`]
  processed_at timestamptz
  error_message text

  Indexes {
    (provider, provider_event_id) [unique]
    payment_id
    (processed_at, received_at)
  }
}

Table refunds {
  id varchar [pk]
  payment_id varchar [not null]
  amount bigint [not null]
  status refund_status [not null, default: 'PENDING']
  provider_refund_id varchar [unique]
  idempotency_key varchar [unique]
  reason varchar
  created_at timestamptz [not null, default: `now()`]
  completed_at timestamptz

  checks {
    `amount > 0` [name: 'refunds_amount_positive']
  }

  Indexes {
    (payment_id, created_at)
  }
}

Table shipments {
  id varchar [pk]
  order_id varchar [not null]
  carrier varchar
  tracking_code varchar
  status shipment_status [not null, default: 'PENDING']
  shipped_at timestamptz
  delivered_at timestamptz
  created_at timestamptz [not null, default: `now()`]
  updated_at timestamptz [not null, default: `now()`]

  Indexes {
    (carrier, tracking_code) [unique]
    (order_id, created_at)
    (status, created_at)
  }
}

// ==========================================================
// 6. LOYALTY & AUDIT
// ==========================================================

Table point_transactions {
  id varchar [pk]
  user_id varchar [not null]
  order_id varchar
  reason points_reason [not null]
  delta int [not null, note: 'Signed points movement; users.points is the current cached balance.']
  balance_after int [not null]
  idempotency_key varchar [unique]
  expires_at timestamptz
  created_at timestamptz [not null, default: `now()`]

  checks {
    `delta <> 0` [name: 'point_transactions_nonzero_delta']
    `balance_after >= 0` [name: 'point_transactions_balance_nonnegative']
  }

  Indexes {
    (user_id, created_at)
    order_id
  }
}

Table admin_logs {
  id varchar [pk]
  user_id varchar [note: 'SET NULL when an actor account is removed; log still exists.']
  actor_label varchar [not null, note: 'Minimal historical identifier under retention/privacy policy.']
  action varchar [not null]
  target_type varchar [not null]
  target_id varchar [not null]
  metadata jsonb
  ip_address varchar
  user_agent varchar
  created_at timestamptz [not null, default: `now()`]

  Indexes {
    (user_id, created_at)
    (target_type, target_id)
    created_at
  }
}

// ==========================================================
// RELATIONSHIPS
// ==========================================================

Ref: baby_profiles.user_id > users.id [delete: cascade]
Ref: addresses.user_id > users.id [delete: cascade]
Ref: accounts.user_id > users.id [delete: cascade]
Ref: sessions.user_id > users.id [delete: cascade]

Ref: categories.parent_id > categories.id [delete: set null]
Ref: products.category_id > categories.id [delete: set null]
Ref: products.collection_id > collections.id [delete: set null]
Ref: product_images.product_id > products.id [delete: cascade]
Ref: product_variants.product_id > products.id [delete: restrict]
Ref: reviews.product_id > products.id [delete: restrict]
Ref: reviews.order_item_id > order_items.id [delete: restrict]
Ref: reviews.user_id > users.id [delete: set null]

Ref: carts.user_id > users.id [delete: cascade]
Ref: cart_items.cart_id > carts.id [delete: cascade]
Ref: cart_items.variant_id > product_variants.id [delete: cascade]

Ref: orders.user_id > users.id [delete: set null]
Ref: order_items.order_id > orders.id [delete: restrict]
Ref: order_items.product_id > products.id [delete: restrict]
Ref: order_items.(variant_id, product_id) > product_variants.(id, product_id) [delete: restrict]
Ref: coupon_redemptions.coupon_id > coupons.id [delete: restrict]
Ref: coupon_redemptions.order_id > orders.id [delete: restrict]
Ref: coupon_redemptions.user_id > users.id [delete: set null]
Ref: order_status_history.order_id > orders.id [delete: restrict]
Ref: order_status_history.changed_by_user_id > users.id [delete: set null]

Ref: stock_reservations.order_item_id > order_items.id [delete: restrict]
Ref: stock_reservations.variant_id > product_variants.id [delete: restrict]
Ref: inventory_movements.variant_id > product_variants.id [delete: restrict]
Ref: inventory_movements.order_item_id > order_items.id [delete: restrict]
Ref: inventory_movements.reservation_id > stock_reservations.id [delete: restrict]
Ref: inventory_movements.actor_user_id > users.id [delete: set null]

Ref: payments.order_id > orders.id [delete: restrict]
Ref: payment_events.payment_id > payments.id [delete: restrict]
Ref: refunds.payment_id > payments.id [delete: restrict]
Ref: shipments.order_id > orders.id [delete: restrict]
Ref: point_transactions.user_id > users.id [delete: restrict]
Ref: point_transactions.order_id > orders.id [delete: restrict]
Ref: admin_logs.user_id > users.id [delete: set null]

// ==========================================================
// REQUIRED POSTGRESQL MIGRATIONS OUTSIDE DBML
// ==========================================================
// DBML cannot express partial unique indexes; apply in your SQL migration:
// CREATE UNIQUE INDEX addresses_one_default_per_user
//   ON addresses(user_id) WHERE is_default = true;
// CREATE UNIQUE INDEX baby_profiles_one_default_per_user
//   ON baby_profiles(user_id) WHERE is_default = true;
// CREATE UNIQUE INDEX product_images_one_primary_per_product
//   ON product_images(product_id) WHERE is_primary = true;
// For truly case-insensitive email/coupon uniqueness with existing mixed-case data,
// normalize and deduplicate BEFORE creating expression indexes or using citext.
// Application must update updated_at explicitly or install a trigger.
// Application must prevent category ancestry cycles beyond the self-parent CHECK.
// CHECK cannot verify SUM(order_items.total_price) equals orders.subtotal;
// validate with a single checkout transaction; reconcile periodically.
// Coupon use limits, review-order-product ownership, reservation-variant matching,
// payment/refund totals, and state transitions require transactional logic/triggers.
// Do not physically delete orders, payment records, stock history or point ledger;
// apply retention, de-identification and legally reviewed deletion processes.
// For legacy migration: users.baby_* -> baby_profiles; use existing baby_gender
// mappings; initialize point ledger to match legacy users.points rather than grant
// signup bonus twice; do not change auth-adapter session/account contracts blindly.