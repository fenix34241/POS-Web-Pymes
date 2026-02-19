import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { PurchaseItem } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Plus,
  Building2,
  ShoppingBag,
  Phone,
  Mail,
  MapPin,
  Trash2,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';

export const Purchases: React.FC = () => {
  const {
    products,
    purchases,
    suppliers,
    addPurchase,
    addSupplier: addSupplierApi,
    deleteSupplier: deleteSupplierApi,
  } = useAppContext();
  const [isPurchaseDialogOpen, setIsPurchaseDialogOpen] = useState(false);
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Purchase form
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [cost, setCost] = useState(0);

  // Supplier form
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contact: '',
    email: '',
    phone: '',
    address: ''
  });

  const addItemToPurchase = () => {
    if (!selectedProduct) {
      toast.error('Selecciona un producto');
      return;
    }

    const product = products.find(p => p.id === selectedProduct);
    if (!product) return;

    const newItem: PurchaseItem = {
      productId: product.id,
      productName: product.name,
      quantity,
      cost: cost || product.cost,
      subtotal: (cost || product.cost) * quantity
    };

    setPurchaseItems([...purchaseItems, newItem]);
    setSelectedProduct('');
    setQuantity(1);
    setCost(0);
    toast.success('Producto agregado');
  };

  const removeItemFromPurchase = (index: number) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const completePurchase = async () => {
    if (!selectedSupplier || purchaseItems.length === 0) {
      toast.error('Completa todos los campos');
      return;
    }

    const supplier = suppliers.find(s => s.id === selectedSupplier);
    if (!supplier) return;

    const total = purchaseItems.reduce((sum, item) => sum + item.subtotal, 0);

    setIsProcessing(true);
    try {
      await addPurchase({
        supplierId: supplier.id,
        supplierName: supplier.name,
        items: purchaseItems,
        total,
        invoiceNumber: invoiceNumber || undefined,
      });

      // Reset form
      setSelectedSupplier('');
      setInvoiceNumber('');
      setPurchaseItems([]);
      setIsPurchaseDialogOpen(false);
      toast.success('Compra registrada exitosamente');
    } catch (error: any) {
      toast.error(error.message || 'Error al registrar la compra');
    } finally {
      setIsProcessing(false);
    }
  };

  const addSupplier = async () => {
    if (!supplierForm.name || !supplierForm.contact) {
      toast.error('Completa los campos requeridos');
      return;
    }

    try {
      await addSupplierApi(supplierForm);
      setSupplierForm({
        name: '',
        contact: '',
        email: '',
        phone: '',
        address: ''
      });
      setIsSupplierDialogOpen(false);
      toast.success('Proveedor agregado');
    } catch (error: any) {
      toast.error(error.message || 'Error al agregar proveedor');
    }
  };

  const deleteSupplier = async (supplierId: string) => {
    if (confirm('¿Estás seguro de eliminar este proveedor?')) {
      try {
        await deleteSupplierApi(supplierId);
        toast.success('Proveedor eliminado');
      } catch (error: any) {
        toast.error(error.message || 'Error al eliminar proveedor');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Compras y Proveedores</h1>
          <p className="text-gray-500 mt-1">Gestiona tus compras y proveedores</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isSupplierDialogOpen} onOpenChange={setIsSupplierDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Building2 size={20} className="mr-2" />
                Nuevo Proveedor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo Proveedor</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nombre de la Empresa *</Label>
                  <Input
                    value={supplierForm.name}
                    onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Persona de Contacto *</Label>
                  <Input
                    value={supplierForm.contact}
                    onChange={(e) => setSupplierForm({ ...supplierForm, contact: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={supplierForm.email}
                    onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <Input
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Dirección</Label>
                  <Input
                    value={supplierForm.address}
                    onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                  />
                </div>
                <Button onClick={addSupplier} className="w-full">
                  Agregar Proveedor
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isPurchaseDialogOpen} onOpenChange={setIsPurchaseDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus size={20} className="mr-2" />
                Nueva Compra
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Registrar Nueva Compra</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {/* Supplier and Invoice */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Proveedor *</Label>
                    <select
                      value={selectedSupplier}
                      onChange={(e) => setSelectedSupplier(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecciona un proveedor</option>
                      {suppliers.map(supplier => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>Número de Factura</Label>
                    <Input
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="Opcional"
                    />
                  </div>
                </div>

                {/* Add Products */}
                <Card className="p-4 bg-gray-50">
                  <h3 className="font-semibold mb-3">Agregar Productos</h3>
                  <div className="grid grid-cols-4 gap-2">
                    <select
                      value={selectedProduct}
                      onChange={(e) => {
                        setSelectedProduct(e.target.value);
                        const product = products.find(p => p.id === e.target.value);
                        if (product) setCost(product.cost);
                      }}
                      className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecciona producto</option>
                      {products.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      placeholder="Cantidad"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      min="1"
                    />
                    <Button onClick={addItemToPurchase} size="sm">
                      <Plus size={16} />
                    </Button>
                  </div>
                  <div className="mt-2">
                    <Label>Costo Unitario</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={cost}
                      onChange={(e) => setCost(Number(e.target.value))}
                    />
                  </div>
                </Card>

                {/* Purchase Items */}
                {purchaseItems.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Productos de la Compra</h3>
                    <div className="space-y-2">
                      {purchaseItems.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-white border rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-sm text-gray-600">
                              {item.quantity} × S/ {item.cost.toFixed(2)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="font-semibold">S/ {item.subtotal.toFixed(2)}</p>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600"
                              onClick={() => removeItemFromPurchase(index)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold">Total:</span>
                        <span className="text-2xl font-bold text-blue-600">
                          S/ {purchaseItems.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <Button onClick={completePurchase} className="w-full" disabled={purchaseItems.length === 0}>
                  Registrar Compra
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="purchases" className="space-y-6">
        <TabsList>
          <TabsTrigger value="purchases">Historial de Compras</TabsTrigger>
          <TabsTrigger value="suppliers">Proveedores</TabsTrigger>
        </TabsList>

        <TabsContent value="purchases" className="space-y-4">
          {purchases.length === 0 ? (
            <Card className="p-12 text-center">
              <ShoppingBag size={48} className="mx-auto mb-4 text-gray-400 opacity-50" />
              <p className="text-gray-400">No hay compras registradas</p>
              <p className="text-sm text-gray-500 mt-2">
                Registra tu primera compra para actualizar el inventario
              </p>
            </Card>
          ) : (
            purchases.map(purchase => (
              <Card key={purchase.id} className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {purchase.supplierName}
                    </h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={16} />
                        {new Date(purchase.date).toLocaleDateString('es-ES')}
                      </span>
                      {purchase.invoiceNumber && (
                        <span>Factura: {purchase.invoiceNumber}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right mt-2 md:mt-0">
                    <p className="text-2xl font-bold text-blue-600">
                      S/ {purchase.total.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  {purchase.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-sm py-2 border-t">
                      <span className="text-gray-700">
                        {item.productName} × {item.quantity}
                      </span>
                      <span className="font-medium">S/ {item.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map(supplier => {
              const supplierPurchases = purchases.filter(p => p.supplierId === supplier.id);
              const totalSpent = supplierPurchases.reduce((sum, p) => sum + p.total, 0);

              return (
                <Card key={supplier.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Building2 size={24} className="text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{supplier.name}</h3>
                        <p className="text-sm text-gray-600">{supplier.contact}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600"
                      onClick={() => deleteSupplier(supplier.id)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>

                  <div className="space-y-2 text-sm">
                    {supplier.email && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail size={16} />
                        {supplier.email}
                      </div>
                    )}
                    {supplier.phone && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone size={16} />
                        {supplier.phone}
                      </div>
                    )}
                    {supplier.address && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <MapPin size={16} />
                        {supplier.address}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total comprado:</span>
                      <span className="font-semibold text-blue-600">
                        S/ {totalSpent.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {supplierPurchases.length} compras realizadas
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>

          {suppliers.length === 0 && (
            <Card className="p-12 text-center">
              <Building2 size={48} className="mx-auto mb-4 text-gray-400 opacity-50" />
              <p className="text-gray-400">No hay proveedores registrados</p>
              <p className="text-sm text-gray-500 mt-2">
                Agrega tus proveedores para gestionar las compras
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};