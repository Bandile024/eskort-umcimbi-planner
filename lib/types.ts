export type UserRole = 'customer' | 'admin'

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'out_for_delivery' | 'delivered' | 'cancelled'
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export interface Profile {
  id: string
  full_name: string
  email: string
  role: UserRole
  created_at: string
}

export interface Order {
  id: string
  order_number: string
  customer_id: string | null
  customer_name: string
  customer_email: string
  customer_phone: string
  delivery_address: string
  subtotal: number
  delivery_fee: number
  total_amount: number
  payment_status: PaymentStatus
  order_status: OrderStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_name: string
  quantity: number
  unit_price: number
  line_total: number
}

export interface OrderStatusHistory {
  id: string
  order_id: string
  previous_status: string | null
  new_status: string
  updated_by: string | null
  created_at: string
}

export interface OrderWithItems extends Order {
  items: OrderItem[]
  status_history: OrderStatusHistory[]
}

export interface CreateOrderData {
  customer_name: string
  customer_email: string
  customer_phone: string
  delivery_address: string
  items: {
    product_name: string
    quantity: number
    unit_price: number
  }[]
  delivery_fee?: number
  notes?: string
}

export interface UpdateOrderStatusData {
  order_id: string
  new_status: OrderStatus
  notes?: string
}

export interface UpdatePaymentStatusData {
  order_id: string
  payment_status: PaymentStatus
}

export interface AdminOrderFilters {
  search?: string
  status?: OrderStatus | 'all'
  payment_status?: PaymentStatus | 'all'
  page?: number
  limit?: number
  sort?: 'newest' | 'oldest'
}

export interface PaginatedOrders {
  orders: Order[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface DashboardStats {
  total_orders: number
  pending_orders: number
  processing_orders: number
  delivered_orders: number
  revenue_total: number
}

export interface EmailOrderData {
  order_number: string
  customer_name: string
  customer_email: string
  customer_phone: string
  total_amount: number
}