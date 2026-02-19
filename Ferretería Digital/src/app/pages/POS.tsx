import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Product, SaleItem } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { BarcodeScanner } from '../components/BarcodeScanner';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  DollarSign,
  CreditCard,
  Banknote,
  Check
} from 'lucide-react';
import { toast } from 'sonner';

export const POS: React.FC = () => {
  const { products, addSale } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [isProcessing, setIsProcessing] = useState(false);

  // Filtrar productos por búsqueda
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products.slice(0, 12);

    const term = searchTerm.toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(term) ||
      p.barcode?.includes(term) ||
      p.category.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  // Calcular totales
  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal - discountAmount;

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      toast.error('Producto sin stock disponible');
      return;
    }

    const existingItem = cart.find(item => item.productId === product.id);

    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        toast.error('No hay suficiente stock');
        return;
      }
      updateQuantity(product.id, existingItem.quantity + 1);
    } else {
      const newItem: SaleItem = {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        price: product.price,
        subtotal: product.price
      };
      setCart([...cart, newItem]);
      toast.success('Producto agregado al carrito');
    }
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQuantity > product.stock) {
      toast.error('No hay suficiente stock');
      return;
    }

    setCart(cart.map(item =>
      item.productId === productId
        ? { ...item, quantity: newQuantity, subtotal: item.price * newQuantity }
        : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
  };

  const completeSale = async () => {
    if (cart.length === 0) {
      toast.error('El carrito está vacío');
      return;
    }

    setIsProcessing(true);
    try {
      await addSale({
        items: cart,
        subtotal,
        discount: discountAmount,
        total,
        paymentMethod,
      });
      clearCart();
      toast.success('¡Venta completada con éxito!');
    } catch (error: any) {
      toast.error(error.message || 'Error al completar la venta');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBarcodeScanned = (barcode: string) => {
    const product = products.find(p => p.barcode === barcode);
    if (product) {
      addToCart(product);
    } else {
      setSearchTerm(barcode);
      toast.error('Producto no encontrado');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Punto de Venta</h1>
        <p className="text-gray-500 mt-1">Sistema de venta rápida</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                type="text"
                placeholder="Buscar por nombre, código de barras o categoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 text-lg"
                autoFocus
              />
            </div>
            <BarcodeScanner onScan={handleBarcodeScanned} />
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filteredProducts.map(product => (
              <Card
                key={product.id}
                className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => addToCart(product)}
              >
                <div className="aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden">
                  {product.image ? (
                    <img
                      src={`/${product.image}`}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      Sin imagen
                    </div>
                  )}
                </div>
                <h3 className="font-medium text-gray-900 mb-1 line-clamp-2 min-h-[40px]">
                  {product.name}
                </h3>
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-blue-600">
                    S/ {product.price.toFixed(2)}
                  </p>
                  <Badge variant={product.stock > product.minStock ? "default" : "destructive"}>
                    Stock: {product.stock}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <Card className="p-12 text-center">
              <p className="text-gray-400">No se encontraron productos</p>
            </Card>
          )}
        </div>

        {/* Cart Section */}
        <div className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart size={24} className="text-blue-600" />
              <h2 className="text-xl font-semibold">Carrito</h2>
              <Badge variant="secondary" className="ml-auto">
                {cart.length} items
              </Badge>
            </div>

            {/* Cart Items */}
            <div className="space-y-3 max-h-[400px] overflow-y-auto mb-4">
              {cart.map(item => (
                <div key={item.productId} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.productName}</p>
                    <p className="text-sm text-gray-600">S/ {item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0"
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    >
                      <Minus size={14} />
                    </Button>
                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0"
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    >
                      <Plus size={14} />
                    </Button>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-red-600"
                    onClick={() => removeFromCart(item.productId)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}

              {cart.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <ShoppingCart size={48} className="mx-auto mb-2 opacity-50" />
                  <p>Carrito vacío</p>
                </div>
              )}
            </div>

            {/* Discount */}
            {cart.length > 0 && (
              <div className="mb-4">
                <label className="text-sm font-medium mb-2 block">Descuento (%)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  placeholder="0"
                />
              </div>
            )}

            {/* Totals */}
            {cart.length > 0 && (
              <div className="space-y-2 border-t pt-4 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">S/ {subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Descuento ({discount}%):</span>
                    <span className="font-medium text-red-600">-S/ {discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span className="text-blue-600">S/ {total.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Payment Method */}
            {cart.length > 0 && (
              <div className="mb-4">
                <label className="text-sm font-medium mb-2 block">Método de Pago</label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPaymentMethod('cash')}
                    className="flex flex-col items-center py-3 h-auto"
                  >
                    <Banknote size={20} />
                    <span className="text-xs mt-1">Efectivo</span>
                  </Button>
                  <Button
                    variant={paymentMethod === 'card' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPaymentMethod('card')}
                    className="flex flex-col items-center py-3 h-auto"
                  >
                    <CreditCard size={20} />
                    <span className="text-xs mt-1">Tarjeta</span>
                  </Button>
                  <Button
                    variant={paymentMethod === 'transfer' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPaymentMethod('transfer')}
                    className="flex flex-col items-center py-3 h-auto"
                  >
                    <DollarSign size={20} />
                    <span className="text-xs mt-1">Bancas Móviles</span>
                  </Button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
              <Button
                onClick={completeSale}
                disabled={cart.length === 0 || isProcessing}
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-lg font-semibold"
              >
                <Check size={20} className="mr-2" />
                {isProcessing ? 'Procesando...' : 'Finalizar Venta'}
              </Button>
              {cart.length > 0 && (
                <Button
                  onClick={clearCart}
                  variant="outline"
                  className="w-full"
                >
                  Limpiar Carrito
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};