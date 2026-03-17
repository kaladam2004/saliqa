// =====================
// Auth Types
// =====================
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  id: number;
  username: string;
  fullname: string;
  role: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

// =====================
// Base
// =====================
export interface BaseEntity {
  id: number;
  createdAt: string;
  updatedAt: string;
}

// =====================
// Admin Types
// =====================
export type AdminRole = 'SUPER_ADMIN' | 'ADMIN';

export interface Admin extends BaseEntity {
  fullname: string;
  tel?: string;
  username: string;
  role: AdminRole;
  photo?: string;
  description?: string;
}

export interface AdminRequest {
  fullname: string;
  tel?: string;
  username: string;
  password?: string;
  role: AdminRole;
  photo?: string;
  description?: string;
}

// =====================
// User Types
// =====================
export interface User extends BaseEntity {
  fullname: string;
  tel?: string;
  username: string;
  description?: string;
  photo?: string;
  address?: string;
  gps?: string;
}

export interface UserRequest {
  fullname: string;
  tel?: string;
  username: string;
  password?: string;
  description?: string;
  photo?: string;
  address?: string;
  gps?: string;
}

// =====================
// Warehouse Types
// =====================
export interface Warehouse extends BaseEntity {
  title: string;
  description?: string;
  gps?: string;
  image?: string;
  responsiblePerson?: string;
  tel?: string;
  products: Product[];
}

export interface WarehouseRequest {
  title: string;
  description?: string;
  gps?: string;
  image?: string;
  responsiblePerson?: string;
  tel?: string;
}

// =====================
// Shop Types
// =====================
export interface Shop extends BaseEntity {
  title: string;
  description?: string;
  gps?: string;
  image?: string;
  tel?: string;
  shopkeeper?: User;
  test: boolean;
}

export interface ShopRequest {
  title: string;
  description?: string;
  gps?: string;
  image?: string;
  tel?: string;
  shopkeeperId?: number;
  test: boolean;
}

// =====================
// Product Types
// =====================
export interface Batch extends BaseEntity {
  name: string;
  manufactureDate?: string;
  expireDate?: string;
  batchString: string;
  productId: number;
}

export interface Product extends BaseEntity {
  name: string;
  image?: string;
  quantity: number;
  description?: string;
  price: number;
  batches: Batch[];
}

export interface ProductRequest {
  name: string;
  image?: string;
  description?: string;
  price: number;
  initialQuantity?: number;
  manufactureDate?: string;
  expireDate?: string;
  warehouseIds?: number[];
}

// =====================
// Invoice Types
// =====================
export interface InvoiceProductItem {
  productId: number;
  quantity: number;
  unitPrice?: number;
}

export interface InvoiceRequest {
  shopId: number;
  userId: number;
  date?: string;
  free: boolean;
  notes?: string;
  products: InvoiceProductItem[];
}

export interface InvoiceProductResponse {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Invoice extends BaseEntity {
  shop: Shop;
  user: User;
  date: string;
  totalPrice: number;
  paid: boolean;
  free: boolean;
  printed: boolean;
  notes?: string;
  products: InvoiceProductResponse[];
  payments: Payment[];
}

// =====================
// Payment Types
// =====================
export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'OTHER';

export interface Payment extends BaseEntity {
  invoiceId: number;
  shopId: number;
  shopTitle: string;
  amount: number;
  paymentMethod: PaymentMethod;
  description?: string;
  paidAt: string;
  change?: number;
}

export interface PaymentRequest {
  invoiceId: number;
  shopId: number;
  amount: number;
  paymentMethod: PaymentMethod;
  description?: string;
  paidAt?: string;
}

// =====================
// Return Types
// =====================
export interface ReturnProductItem {
  productId: number;
  quantity: number;
}

export interface ReturnRequest {
  userId: number;
  shopId: number;
  invoiceId?: number;
  date?: string;
  description?: string;
  products: ReturnProductItem[];
}

export interface ProductReturn extends BaseEntity {
  user: User;
  shop: Shop;
  invoiceId?: number;
  date: string;
  description?: string;
  products: Array<{ productId: number; productName: string; quantity: number }>;
}

// =====================
// User Invoice Types
// =====================
export interface UserInvoiceProductItem {
  productId: number;
  quantity: number;
  unitPrice?: number;
}

export interface UserInvoiceRequest {
  warehouseId: number;
  userId: number;
  date?: string;
  notes?: string;
  products: UserInvoiceProductItem[];
}

export interface UserInvoice extends BaseEntity {
  warehouse: Warehouse;
  user: User;
  date: string;
  totalPrice: number;
  paid: boolean;
  printed: boolean;
  notes?: string;
  products: Array<{ productId: number; productName: string; quantity: number; unitPrice: number }>;
  payments: Array<{ id: number; amount: number; paymentMethod: string; date: string }>;
}

// =====================
// User Payment Types
// =====================
export interface UserPaymentRequest {
  userInvoiceId?: number;
  userId: number;
  description?: string;
  paymentMethod: PaymentMethod;
  date?: string;
  amount: number;
}

export interface UserPayment extends BaseEntity {
  userInvoiceId?: number;
  user: User;
  description?: string;
  paymentMethod: PaymentMethod;
  date: string;
  amount: number;
  accepted: boolean;
  acceptedAt?: string;
  change?: number;
}

// =====================
// Bulk Payment Types
// =====================
export interface BulkPaymentRequest {
  shopId: number;
  amount: number;
  paymentMethod: PaymentMethod;
  description?: string;
  paidAt?: string;
}

export interface BulkPaymentResponse {
  invoicesClosed: number;
  closedInvoiceIds: number[];
  totalApplied: number;
  change: number;
}

export interface BulkUserPaymentRequest {
  userId: number;
  amount: number;
  paymentMethod: PaymentMethod;
  description?: string;
  date?: string;
}

export interface BulkUserPaymentResponse {
  invoicesClosed: number;
  closedInvoiceIds: number[];
  totalApplied: number;
  change: number;
}

// =====================
// User Return Types
// =====================
export interface UserReturnRequest {
  productId: number;
  warehouseId: number;
  userId: number;
  userInvoiceId?: number;
  quantity: number;
  date?: string;
  description?: string;
}

export interface UserReturn extends BaseEntity {
  productId: number;
  productName: string;
  warehouseId: number;
  warehouseTitle: string;
  user: User;
  userInvoiceId?: number;
  quantity: number;
  date: string;
  description?: string;
}

// =====================
// Expense Types
// =====================
export interface ExpenseRequest {
  adminId?: number;
  userId?: number;
  description: string;
  date: string;
  total: number;
  category?: string;
}

export interface Expense extends BaseEntity {
  adminId?: number;
  adminFullname?: string;
  userId?: number;
  userFullname?: string;
  description: string;
  date: string;
  total: number;
  category?: string;
  approved: boolean;
  approvedByFullname?: string;
  approvedAt?: string;
}

// =====================
// Event Log Types
// =====================
export interface EventLog extends BaseEntity {
  actorId?: number;
  actorType?: string;
  actorUsername?: string;
  timestamp: string;
  eventType: string;
  description?: string;
  entityType?: string;
  entityId?: number;
}

// =====================
// Filter Types
// =====================
export interface InvoiceFilter {
  shopId?: number;
  userId?: number;
  from?: string;
  to?: string;
}

export interface PaymentFilter {
  shopId?: number;
  from?: string;
  to?: string;
}
