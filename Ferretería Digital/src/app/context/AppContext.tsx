import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Product, Sale, Purchase, Supplier, InventoryMovement, User } from '../types';
import {
  authApi,
  userApi,
  productApi,
  saleApi,
  purchaseApi,
  supplierApi,
  movementApi,
} from '../services/api';

interface AppContextType {
  // Data
  products: Product[];
  sales: Sale[];
  purchases: Purchase[];
  suppliers: Supplier[];
  movements: InventoryMovement[];
  users: User[];
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Auth
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;

  // Products CRUD
  // Products CRUD
  addProduct: (product: Omit<Product, 'id'> & { imageFile?: File | null }) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product> & { imageFile?: File | null; removeImage?: boolean }) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  deleteImage?: (id: string) => Promise<void>;

  // Sales
  addSale: (sale: {
    items: Array<{ productId: string; productName: string; quantity: number; price: number; subtotal: number }>;
    subtotal: number;
    discount: number;
    total: number;
    paymentMethod: string;
  }) => Promise<void>;
  createRefund: (saleId: string, data: { reason?: string; items: Array<{ saleItemId: number; quantity: number }> }) => Promise<void>;

  // Purchases & Suppliers
  addPurchase: (purchase: {
    supplierId: string;
    supplierName: string;
    items: Array<{ productId: string; productName: string; quantity: number; cost: number; subtotal: number }>;
    total: number;
    invoiceNumber?: string;
  }) => Promise<void>;
  addSupplier: (supplier: Omit<Supplier, 'id'>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;

  // Users
  addUser: (user: { username: string; password: string; name: string; role: string }) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;

  // Movements
  addMovement: (movement: Omit<InventoryMovement, 'id' | 'date'>) => Promise<void>;

  // Refresh
  refreshData: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('aldysv_current_user');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('aldysv_auth');
      return stored ? JSON.parse(stored) : false;
    } catch { return false; }
  });
  const [isLoading, setIsLoading] = useState(true);

  // ─── Load all data from API ──────────────────────────────
  const refreshData = useCallback(async () => {
    try {
      const [prodData, salesData, purchData, suppData, movData, usersData] = await Promise.all([
        productApi.getAll(),
        saleApi.getAll(),
        purchaseApi.getAll(),
        supplierApi.getAll(),
        movementApi.getAll(),
        userApi.getAll(),
      ]);
      setProducts(prodData);
      setSales(salesData);
      setPurchases(purchData);
      setSuppliers(suppData);
      setMovements(movData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading data from API:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      refreshData();
    } else {
      setIsLoading(false);
    }
  }, [isAuthenticated, refreshData]);

  // ─── Auth ────────────────────────────────────────────────
  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      const user = await authApi.login(username, password);
      setCurrentUser(user);
      setIsAuthenticated(true);
      localStorage.setItem('aldysv_current_user', JSON.stringify(user));
      localStorage.setItem('aldysv_auth', 'true');
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('aldysv_current_user');
    localStorage.removeItem('aldysv_auth');
  }, []);

  // ─── Products ────────────────────────────────────────────
  // ─── Products ────────────────────────────────────────────
  const addProduct = useCallback(async (product: Omit<Product, 'id'> & { imageFile?: File | null }) => {
    const formData = new FormData();
    formData.append('name', product.name);
    formData.append('barcode', product.barcode || '');
    formData.append('price', String(product.price));
    formData.append('cost', String(product.cost));
    formData.append('stock', String(product.stock));
    formData.append('minStock', String(product.minStock));
    formData.append('category', product.category);
    formData.append('brand', product.brand);

    if (product.imageFile) {
      formData.append('image', product.imageFile);
    }

    const created = await productApi.create(formData);
    setProducts(prev => [...prev, created]);
  }, []);

  const updateProduct = useCallback(async (id: string, product: Partial<Product> & { imageFile?: File | null; removeImage?: boolean }) => {
    const formData = new FormData();
    if (product.name !== undefined) formData.append('name', product.name);
    if (product.barcode !== undefined) formData.append('barcode', product.barcode || '');
    if (product.price !== undefined) formData.append('price', String(product.price));
    if (product.cost !== undefined) formData.append('cost', String(product.cost));
    if (product.stock !== undefined) formData.append('stock', String(product.stock));
    if (product.minStock !== undefined) formData.append('minStock', String(product.minStock));
    if (product.category !== undefined) formData.append('category', product.category);
    if (product.brand !== undefined) formData.append('brand', product.brand);

    if (product.imageFile) {
      formData.append('image', product.imageFile);
    }
    if (product.removeImage) {
      formData.append('removeImage', 'true');
    }

    const updated = await productApi.update(id, formData);
    setProducts(prev => prev.map(p => p.id === id ? updated : p));
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    await productApi.delete(id);
    setProducts(prev => prev.filter(p => p.id !== id));
  }, []);

  const deleteImage = useCallback(async (id: string) => {
    await productApi.deleteImage(id);
    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, image: undefined };
      }
      return p;
    }));
  }, []);

  // ─── Sales ───────────────────────────────────────────────
  const addSale = useCallback(async (saleData: {
    items: Array<{ productId: string; productName: string; quantity: number; price: number; subtotal: number }>;
    subtotal: number;
    discount: number;
    total: number;
    paymentMethod: string;
  }) => {
    const created = await saleApi.create(saleData);
    setSales(prev => [created, ...prev]);
    // Refresh products to get updated stock
    const updatedProducts = await productApi.getAll();
    setProducts(updatedProducts);
    // Refresh movements
    const updatedMovements = await movementApi.getAll();
    setMovements(updatedMovements);
  }, []);

  const createRefund = useCallback(async (saleId: string, data: { reason?: string; items: Array<{ saleItemId: number; quantity: number }> }) => {
    await saleApi.createRefund(saleId, data);
    const [updatedSales, updatedProducts, updatedMovements] = await Promise.all([
      saleApi.getAll(),
      productApi.getAll(),
      movementApi.getAll(),
    ]);
    setSales(updatedSales);
    setProducts(updatedProducts);
    setMovements(updatedMovements);
  }, []);

  // ─── Purchases ───────────────────────────────────────────
  const addPurchase = useCallback(async (purchaseData: {
    supplierId: string;
    supplierName: string;
    items: Array<{ productId: string; productName: string; quantity: number; cost: number; subtotal: number }>;
    total: number;
    invoiceNumber?: string;
  }) => {
    const created = await purchaseApi.create(purchaseData);
    setPurchases(prev => [created, ...prev]);
    // Refresh products to get updated stock
    const updatedProducts = await productApi.getAll();
    setProducts(updatedProducts);
    // Refresh movements
    const updatedMovements = await movementApi.getAll();
    setMovements(updatedMovements);
  }, []);

  // ─── Suppliers ───────────────────────────────────────────
  const addSupplier = useCallback(async (supplier: Omit<Supplier, 'id'>) => {
    const created = await supplierApi.create(supplier);
    setSuppliers(prev => [...prev, created]);
  }, []);

  const deleteSupplier = useCallback(async (id: string) => {
    await supplierApi.delete(id);
    setSuppliers(prev => prev.filter(s => s.id !== id));
  }, []);

  // ─── Users ───────────────────────────────────────────────
  const addUser = useCallback(async (userData: { username: string; password: string; name: string; role: string }) => {
    const created = await userApi.create(userData);
    setUsers(prev => [...prev, created]);
  }, []);

  const deleteUser = useCallback(async (id: string) => {
    await userApi.delete(id);
    setUsers(prev => prev.filter(u => u.id !== id));
  }, []);

  // ─── Movements ───────────────────────────────────────────
  const addMovement = useCallback(async (movement: Omit<InventoryMovement, 'id' | 'date'>) => {
    const created = await movementApi.create(movement);
    setMovements(prev => [created, ...prev]);
    // Refresh products to get updated stock
    const updatedProducts = await productApi.getAll();
    setProducts(updatedProducts);
  }, []);

  return (
    <AppContext.Provider
      value={{
        products,
        sales,
        purchases,
        suppliers,
        movements,
        users,
        currentUser,
        isAuthenticated,
        isLoading,
        login,
        logout,
        addProduct,
        updateProduct,
        deleteProduct,
        deleteImage,
        addSale,
        createRefund,
        addPurchase,
        addSupplier,
        deleteSupplier,
        addUser,
        deleteUser,
        addMovement,
        refreshData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};