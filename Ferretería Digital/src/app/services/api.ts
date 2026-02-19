import { Product, Sale, Purchase, Supplier, InventoryMovement, User } from '../types';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };

    // If body is FormData, let the browser set Content-Type with boundary
    if (options?.body instanceof FormData) {
        delete (headers as any)['Content-Type'];
    }

    const res = await fetch(`${API_BASE}${url}`, {
        headers: { ...headers, ...options?.headers },
        ...options,
    });
    if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Network error' }));
        throw new Error(error.error || `HTTP ${res.status}`);
    }
    return res.json();
}

// ─── Auth ────────────────────────────────────────────────
export const authApi = {
    login: (username: string, password: string) =>
        request<User>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        }),
};

// ─── Users ───────────────────────────────────────────────
export const userApi = {
    getAll: () => request<User[]>('/users'),

    create: (data: { username: string; password: string; name: string; role: string }) =>
        request<User>('/users', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    delete: (id: string) =>
        request<{ success: boolean }>(`/users/${id}`, { method: 'DELETE' }),
};

// ─── Products ────────────────────────────────────────────
// ─── Products ────────────────────────────────────────────
export const productApi = {
    getAll: () => request<Product[]>('/products'),

    create: (data: FormData) =>
        request<Product>('/products', {
            method: 'POST',
            body: data,
            // When sending FormData, fetching automatically sets Content-Type to multipart/form-data with boundary
            // We need to override the default 'application/json' header from request() helper
            headers: {},
        }),

    update: (id: string, data: FormData) =>
        request<Product>(`/products/${id}`, {
            method: 'PUT',
            body: data,
            headers: {},
        }),

    updateStock: (id: string, stock: number) =>
        request<{ success: boolean }>(`/products/${id}/stock`, {
            method: 'PATCH',
            body: JSON.stringify({ stock }),
        }),

    delete: (id: string) =>
        request<{ success: boolean }>(`/products/${id}`, { method: 'DELETE' }),

    deleteImage: (id: string) =>
        request<{ success: boolean }>(`/products/${id}/image`, { method: 'DELETE' }),
};

// ─── Sales ───────────────────────────────────────────────
export const saleApi = {
    getAll: () => request<Sale[]>('/sales'),

    create: (data: {
        items: Array<{ productId: string; productName: string; quantity: number; price: number; subtotal: number }>;
        subtotal: number;
        discount: number;
        total: number;
        paymentMethod: string;
    }) =>
        request<Sale>('/sales', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
};

// ─── Purchases & Suppliers ───────────────────────────────
export const supplierApi = {
    getAll: () => request<Supplier[]>('/purchases/suppliers'),

    create: (data: Omit<Supplier, 'id'>) =>
        request<Supplier>('/purchases/suppliers', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    delete: (id: string) =>
        request<{ success: boolean }>(`/purchases/suppliers/${id}`, { method: 'DELETE' }),
};

export const purchaseApi = {
    getAll: () => request<Purchase[]>('/purchases'),

    create: (data: {
        supplierId: string;
        supplierName: string;
        items: Array<{ productId: string; productName: string; quantity: number; cost: number; subtotal: number }>;
        total: number;
        invoiceNumber?: string;
    }) =>
        request<Purchase>('/purchases', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
};

// ─── Inventory Movements ─────────────────────────────────
export const movementApi = {
    getAll: () => request<InventoryMovement[]>('/movements'),

    create: (data: Omit<InventoryMovement, 'id' | 'date'>) =>
        request<InventoryMovement>('/movements', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
};

// ─── Dashboard ───────────────────────────────────────────
export interface DashboardData {
    todayTotal: number;
    todayCount: number;
    weekTotal: number;
    monthTotal: number;
    lowStockCount: number;
    totalProducts: number;
    dailySales: Array<{ day: string; ventas: number }>;
    topProducts: Array<{ name: string; quantity: number; revenue: number }>;
}

export const dashboardApi = {
    getMetrics: () => request<DashboardData>('/dashboard'),
};
