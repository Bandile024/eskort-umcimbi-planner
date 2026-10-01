import { supabase } from '@/lib/supabase'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { CreateOrderData, Order, OrderItem, OrderWithItems, OrderStatus, PaymentStatus, AdminOrderFilters, PaginatedOrders, DashboardStats } from '@/lib/types'

type ServerClient = ReturnType<typeof createServerSupabaseClient>

export class OrderService {
  static generateOrderNumber(): string {
    return `ESC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
  }

  static async createOrder(data: CreateOrderData, userId?: string, serverClient?: ServerClient): Promise<Order | null> {
    const client = serverClient ?? supabase
    const orderNumber = this.generateOrderNumber()
    const subtotal = data.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
    const deliveryFee = data.delivery_fee ?? 60
    const totalAmount = subtotal + deliveryFee

    const { data: order, error: orderError } = await client
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_id: userId ?? null,
        customer_name: data.customer_name,
        customer_email: data.customer_email,
        customer_phone: data.customer_phone,
        delivery_address: data.delivery_address,
        subtotal,
        delivery_fee: deliveryFee,
        total_amount: totalAmount,
        payment_status: 'pending',
        order_status: 'pending',
        notes: data.notes ?? null,
      })
      .select()
      .single()

    if (orderError) {
      console.error('Order creation error:', orderError)
      return null
    }

    const orderItems = data.items.map(item => ({
      order_id: order.id,
      product_name: item.product_name,
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.quantity * item.unit_price,
    }))

    const { error: itemsError } = await client
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('Order items creation error:', itemsError)
      await client.from('orders').delete().eq('id', order.id)
      return null
    }

    return order
  }

  static async getOrderById(id: string, serverClient?: ServerClient): Promise<OrderWithItems | null> {
    const client = serverClient ?? supabase
    const { data: order, error: orderError } = await client
      .from('orders')
      .select('*')
      .eq('id', id)
      .single()

    if (orderError || !order) return null

    const { data: items } = await client
      .from('order_items')
      .select('*')
      .eq('order_id', id)

    const { data: history } = await client
      .from('order_status_history')
      .select('*')
      .eq('order_id', id)
      .order('created_at', { ascending: true })

    return {
      ...order,
      items: items ?? [],
      status_history: history ?? [],
    }
  }

  static async getOrderByNumber(orderNumber: string): Promise<OrderWithItems | null> {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', orderNumber)
      .single()

    if (orderError || !order) return null

    const { data: items } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', order.id)

    const { data: history } = await supabase
      .from('order_status_history')
      .select('*')
      .eq('order_id', order.id)
      .order('created_at', { ascending: true })

    return {
      ...order,
      items: items ?? [],
      status_history: history ?? [],
    }
  }

  static async getUserOrders(userId: string, serverClient?: ServerClient): Promise<OrderWithItems[]> {
    const client = serverClient ?? supabase
    const { data: orders, error } = await client
      .from('orders')
      .select('*')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false })

    if (error || !orders) return []

    const ordersWithItems: OrderWithItems[] = []
    for (const order of orders) {
      const { data: items } = await client
        .from('order_items')
        .select('*')
        .eq('order_id', order.id)

      const { data: history } = await client
        .from('order_status_history')
        .select('*')
        .eq('order_id', order.id)
        .order('created_at', { ascending: true })

      ordersWithItems.push({
        ...order,
        items: items ?? [],
        status_history: history ?? [],
      })
    }

    return ordersWithItems
  }

  static async getAllOrdersAdmin(filters: AdminOrderFilters = {}, serverClient?: ServerClient): Promise<PaginatedOrders> {
    const {
      search = '',
      status = 'all',
      payment_status = 'all',
      page = 1,
      limit = 20,
      sort = 'newest',
    } = filters

    const client = serverClient ?? supabase
    let query = client
      .from('orders')
      .select('*', { count: 'exact' })

    if (search) {
      query = query.or(`order_number.ilike.%${search}%,customer_name.ilike.%${search}%,customer_email.ilike.%${search}%,customer_phone.ilike.%${search}%`)
    }

    if (status !== 'all') {
      query = query.eq('order_status', status)
    }

    if (payment_status !== 'all') {
      query = query.eq('payment_status', payment_status)
    }

    query = query.order('created_at', { ascending: sort === 'oldest' })
    query = query.range((page - 1) * limit, page * limit - 1)

    const { data: orders, error, count } = await query

    if (error) {
      console.error('Get orders error:', error)
      return { orders: [], total: 0, page, limit, totalPages: 0 }
    }

    return {
      orders: orders ?? [],
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    }
  }

  static async updateOrderStatus(data: { order_id: string; new_status: OrderStatus; notes?: string }, serverClient?: ServerClient): Promise<boolean> {
    const client = serverClient ?? supabase
    const { error } = await client
      .from('orders')
      .update({
        order_status: data.new_status,
        notes: data.notes ?? null,
      })
      .eq('id', data.order_id)

    if (error) {
      console.error('Update order status error:', error)
      return false
    }
    return true
  }

  static async updatePaymentStatus(data: { order_id: string; payment_status: PaymentStatus }, serverClient?: ServerClient): Promise<boolean> {
    const client = serverClient ?? supabase
    const { error } = await client
      .from('orders')
      .update({ payment_status: data.payment_status })
      .eq('id', data.order_id)

    if (error) {
      console.error('Update payment status error:', error)
      return false
    }
    return true
  }

  static async getDashboardStats(serverClient?: ServerClient): Promise<DashboardStats> {
    const client = serverClient ?? supabase
    const { data: orders } = await client
      .from('orders')
      .select('order_status, total_amount, payment_status')

    if (!orders) {
      return { total_orders: 0, pending_orders: 0, processing_orders: 0, delivered_orders: 0, revenue_total: 0 }
    }

    const stats: DashboardStats = {
      total_orders: orders.length,
      pending_orders: orders.filter(o => o.order_status === 'pending').length,
      processing_orders: orders.filter(o => o.order_status === 'processing').length,
      delivered_orders: orders.filter(o => o.order_status === 'delivered').length,
      revenue_total: orders
        .filter(o => o.payment_status === 'paid')
        .reduce((sum, o) => sum + Number(o.total_amount), 0),
    }

    return stats
  }
}

export const orderService = OrderService