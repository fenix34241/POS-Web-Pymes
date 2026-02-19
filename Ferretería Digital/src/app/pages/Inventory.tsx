import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Product } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import {
  Search,
  Plus,
  Package,
  AlertTriangle,
  Edit,
  Trash2,
  Filter,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { toast } from 'sonner';

export const Inventory: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStock, setFilterStock] = useState<'all' | 'low' | 'ok'>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    barcode: '',
    price: 0,
    cost: 0,
    stock: 0,
    minStock: 0,
    category: '',
    brand: ''
  });

  // Image handling state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [shouldRemoveImage, setShouldRemoveImage] = useState(false);

  const categories = [...new Set(products.map(p => p.category))];

  const filteredProducts = products.filter(p => {
    const matchesSearch = !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = filterCategory === 'all' || p.category === filterCategory;

    const matchesStock =
      filterStock === 'all' ||
      (filterStock === 'low' && p.stock <= p.minStock) ||
      (filterStock === 'ok' && p.stock > p.minStock);

    return matchesSearch && matchesCategory && matchesStock;
  });

  const lowStockProducts = products.filter(p => p.stock <= p.minStock);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('El archivo es demasiado grande (Max 2MB)');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setShouldRemoveImage(false);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setShouldRemoveImage(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.category || !formData.brand) {
      toast.error('Por favor completa los campos requeridos');
      return;
    }

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, {
          name: formData.name!,
          barcode: formData.barcode,
          price: Number(formData.price) || 0,
          cost: Number(formData.cost) || 0,
          stock: Number(formData.stock) || 0,
          minStock: Number(formData.minStock) || 0,
          category: formData.category!,
          brand: formData.brand!,
          imageFile: imageFile,
          removeImage: shouldRemoveImage
        });
        toast.success('Producto actualizado');
      } else {
        await addProduct({
          name: formData.name!,
          barcode: formData.barcode,
          price: Number(formData.price) || 0,
          cost: Number(formData.cost) || 0,
          stock: Number(formData.stock) || 0,
          minStock: Number(formData.minStock) || 0,
          category: formData.category!,
          brand: formData.brand!,
          imageFile: imageFile
        });
        toast.success('Producto agregado');
      }
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar producto');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      barcode: '',
      price: 0,
      cost: 0,
      stock: 0,
      minStock: 0,
      category: '',
      brand: ''
    });
    setImageFile(null);
    setImagePreview(null);
    setShouldRemoveImage(false);
    setEditingProduct(null);
    setIsAddDialogOpen(false);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData(product);
    if (product.image) {
      // Use the image path directly if full URL, or append API if relative
      setImagePreview(product.image.startsWith('http') ? product.image : `/api/${product.image}`);
    } else {
      setImagePreview(null);
    }
    setShouldRemoveImage(false);
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (productId: string) => {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      try {
        await deleteProduct(productId);
        toast.success('Producto eliminado');
      } catch (error: any) {
        toast.error(error.message || 'Error al eliminar producto');
      }
    }
  };

  const getStockStatus = (product: Product) => {
    if (product.stock === 0) return { color: 'destructive', label: 'Sin stock' };
    if (product.stock <= product.minStock) return { color: 'destructive', label: 'Stock crítico' };
    return { color: 'default', label: 'Stock OK' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventario</h1>
          <p className="text-gray-500 mt-1">Gestiona tus productos</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus size={20} className="mr-2" />
              Agregar Producto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex flex-col items-center gap-4 mb-4">
                {/* Image Upload Area */}
                <div className="flex flex-col items-center gap-2">
                  <div className={`w-32 h-32 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden bg-gray-50 relative ${imagePreview ? 'border-blue-500' : 'border-gray-300'
                    }`}>
                    {imagePreview ? (
                      <>
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full shadow-md hover:bg-red-600"
                        >
                          <X size={12} />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center text-gray-400">
                        <ImageIcon size={24} />
                        <span className="text-xs mt-1">Subir Imagen</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleImageChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      title="Seleccionar imagen"
                    />
                  </div>
                  <p className="text-xs text-gray-500">Max 2MB (JPG, PNG, WEBP)</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Nombre del Producto *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Código de Barras</Label>
                  <div className="flex gap-2">
                    <Input
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    />
                    <BarcodeScanner
                      onScan={(code) => setFormData({ ...formData, barcode: code })}
                      className="h-10 w-10"
                    />
                  </div>
                </div>
                <div>
                  <Label>Marca *</Label>
                  <Input
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Categoría *</Label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label>Precio de Venta</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Costo</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Stock Inicial</Label>
                  <Input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Stock Mínimo</Label>
                  <Input
                    type="number"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingProduct ? 'Actualizar' : 'Agregar'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alert for low stock */}
      {lowStockProducts.length > 0 && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-center gap-3">
            <AlertTriangle size={24} className="text-red-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-red-900">
                {lowStockProducts.length} productos con stock crítico
              </p>
              <p className="text-sm text-red-700">
                Revisa los productos marcados en rojo y considera reabastecer
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                placeholder="Buscar por nombre, código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {/* Barcode Scanner for Search */}
            <BarcodeScanner onScan={(code) => {
              setSearchTerm(code);
              toast.success(`Producto escaneado: ${code}`);
            }} />
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas las Categorías</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={filterStock}
            onChange={(e) => setFilterStock(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todo el Stock</option>
            <option value="low">Stock Crítico</option>
            <option value="ok">Stock OK</option>
          </select>
        </div>
      </Card>

      {/* Products Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-semibold text-gray-900">Producto</th>
                <th className="text-left p-4 font-semibold text-gray-900">Categoría</th>
                <th className="text-left p-4 font-semibold text-gray-900">Marca</th>
                <th className="text-right p-4 font-semibold text-gray-900">Precio</th>
                <th className="text-right p-4 font-semibold text-gray-900">Stock</th>
                <th className="text-center p-4 font-semibold text-gray-900">Estado</th>
                <th className="text-center p-4 font-semibold text-gray-900">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredProducts.map(product => {
                const status = getStockStatus(product);
                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {product.image ? (
                          <img
                            src={`/${product.image}`}
                            alt={product.name}
                            className="w-12 h-12 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Package size={20} className="text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{product.name}</p>
                          {product.barcode && (
                            <p className="text-sm text-gray-500">{product.barcode}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-700">{product.category}</td>
                    <td className="p-4 text-gray-700">{product.brand}</td>
                    <td className="p-4 text-right font-medium">S/ {product.price.toFixed(2)}</td>
                    <td className="p-4 text-right">
                      <span className={product.stock <= product.minStock ? 'text-red-600 font-semibold' : ''}>
                        {product.stock}
                      </span>
                      <span className="text-gray-500 text-sm"> / {product.minStock}</span>
                    </td>
                    <td className="p-4 text-center">
                      <Badge variant={status.color as any}>
                        {status.label}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(product)}
                        >
                          <Edit size={16} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(product.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Package size={48} className="mx-auto mb-2 opacity-50" />
              <p>No se encontraron productos</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};