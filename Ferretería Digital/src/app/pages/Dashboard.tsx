import React, { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Card } from '../components/ui/card';
import { 
  DollarSign, 
  ShoppingCart, 
  Package, 
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export const Dashboard: React.FC = () => {
  const { sales, products } = useAppContext();

  const stats = useMemo(() => {
    const today = new Date();
    const todayStr = today.toDateString();
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const todaySales = sales.filter(s => new Date(s.date).toDateString() === todayStr);
    const weekSales = sales.filter(s => new Date(s.date) >= weekAgo);
    const monthSales = sales.filter(s => new Date(s.date) >= monthAgo);

    const todayTotal = todaySales.reduce((sum, s) => sum + s.total, 0);
    const weekTotal = weekSales.reduce((sum, s) => sum + s.total, 0);
    const monthTotal = monthSales.reduce((sum, s) => sum + s.total, 0);

    // Calcular ganancias (precio - costo)
    const calculateProfit = (saleItems: any[]) => {
      return saleItems.reduce((profit, sale) => {
        return profit + sale.items.reduce((itemProfit: number, item: any) => {
          const product = products.find(p => p.id === item.productId);
          if (product) {
            return itemProfit + ((item.price - product.cost) * item.quantity);
          }
          return itemProfit;
        }, 0);
      }, 0);
    };

    const todayProfit = calculateProfit(todaySales);
    const monthProfit = calculateProfit(monthSales);

    // Productos con stock crítico
    const lowStockProducts = products.filter(p => p.stock <= p.minStock);

    return {
      todayTotal,
      todayCount: todaySales.length,
      weekTotal,
      monthTotal,
      todayProfit,
      monthProfit,
      lowStockCount: lowStockProducts.length,
      totalProducts: products.length
    };
  }, [sales, products]);

  // Datos para gráfico de ventas por día (última semana)
  const salesByDay = useMemo(() => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const data = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toDateString();
      
      const daySales = sales.filter(s => new Date(s.date).toDateString() === dateStr);
      const total = daySales.reduce((sum, s) => sum + s.total, 0);
      
      data.push({
        day: days[date.getDay()],
        ventas: Math.round(total)
      });
    }
    
    return data;
  }, [sales]);

  // Top productos vendidos
  const topProducts = useMemo(() => {
    const productSales: { [key: string]: { name: string; quantity: number; revenue: number } } = {};
    
    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = {
            name: item.productName,
            quantity: 0,
            revenue: 0
          };
        }
        productSales[item.productId].quantity += item.quantity;
        productSales[item.productId].revenue += item.subtotal;
      });
    });

    return Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [sales]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Resumen general de tu ferretería</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Ventas Hoy */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Ventas Hoy</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                S/ {stats.todayTotal.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 mt-1">{stats.todayCount} ventas</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign size={24} className="text-green-600" />
            </div>
          </div>
        </Card>

        {/* Ventas Mes */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Ventas del Mes</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                S/ {stats.monthTotal.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 mt-1">Últimos 30 días</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <ShoppingCart size={24} className="text-blue-600" />
            </div>
          </div>
        </Card>

        {/* Ganancia Mes */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Ganancia del Mes</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                S/ {stats.monthProfit.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 mt-1">Margen bruto</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp size={24} className="text-purple-600" />
            </div>
          </div>
        </Card>

        {/* Stock Crítico */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Stock Crítico</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats.lowStockCount}
              </p>
              <p className="text-sm text-gray-600 mt-1">productos bajos</p>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              stats.lowStockCount > 0 ? 'bg-red-100' : 'bg-gray-100'
            }`}>
              <AlertTriangle size={24} className={stats.lowStockCount > 0 ? 'text-red-600' : 'text-gray-400'} />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ventas por Día */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Ventas Última Semana</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesByDay}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="ventas" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Top Productos */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Productos Más Vendidos</h3>
          {topProducts.length > 0 ? (
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">{product.quantity} unidades</p>
                  </div>
                  <p className="font-semibold text-gray-900">
                    S/ {product.revenue.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <div className="text-center">
                <ShoppingCart size={48} className="mx-auto mb-2 opacity-50" />
                <p>No hay ventas registradas</p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Stock Alert */}
      {stats.lowStockCount > 0 && (
        <Card className="p-6 bg-red-50 border-red-200">
          <div className="flex items-start gap-4">
            <AlertTriangle size={24} className="text-red-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-semibold text-red-900">
                ⚠️ Atención: {stats.lowStockCount} productos con stock crítico
              </h3>
              <p className="text-red-700 mt-1">
                Algunos productos están por debajo del stock mínimo. Ve a Inventario para ver los detalles.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};