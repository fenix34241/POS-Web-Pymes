import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  CreditCard,
  Banknote,
  ArrowUpDown
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

export const Reports: React.FC = () => {
  const { sales, products, purchases } = useAppContext();
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');

  const stats = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    if (period === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === 'month') {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    }

    const periodSales = sales.filter(s => new Date(s.date) >= startDate);
    const periodPurchases = purchases.filter(p => new Date(p.date) >= startDate);

    const totalRevenue = periodSales.reduce((sum, s) => sum + s.total, 0);
    const totalCost = periodSales.reduce((sum, sale) => {
      return sum + sale.items.reduce((itemSum, item) => {
        const product = products.find(p => p.id === item.productId);
        return itemSum + (product ? product.cost * item.quantity : 0);
      }, 0);
    }, 0);
    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    const totalPurchaseCost = periodPurchases.reduce((sum, p) => sum + p.total, 0);
    const cashFlow = totalRevenue - totalPurchaseCost;

    // Payment methods breakdown
    const cashSales = periodSales.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.total, 0);
    const cardSales = periodSales.filter(s => s.paymentMethod === 'card').reduce((sum, s) => sum + s.total, 0);
    const transferSales = periodSales.filter(s => s.paymentMethod === 'transfer').reduce((sum, s) => sum + s.total, 0);

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin,
      totalSales: periodSales.length,
      totalPurchases: periodPurchases.length,
      cashFlow,
      cashSales,
      cardSales,
      transferSales
    };
  }, [sales, products, purchases, period]);

  // Sales by category
  const salesByCategory = useMemo(() => {
    const categoryData: { [key: string]: number } = {};

    sales.forEach(sale => {
      sale.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          categoryData[product.category] = (categoryData[product.category] || 0) + item.subtotal;
        }
      });
    });

    return Object.entries(categoryData).map(([name, value]) => ({
      name,
      value: Math.round(value)
    }));
  }, [sales, products]);

  // Payment methods data for pie chart
  const paymentMethodsData = [
    { name: 'Efectivo', value: stats.cashSales, color: '#10b981' },
    { name: 'Tarjeta', value: stats.cardSales, color: '#3b82f6' },
    { name: 'Transferencia', value: stats.transferSales, color: '#8b5cf6' }
  ].filter(item => item.value > 0);

  // Daily sales trend (last 14 days)
  const dailySalesTrend = useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toDateString();

      const daySales = sales.filter(s => new Date(s.date).toDateString() === dateStr);
      const revenue = daySales.reduce((sum, s) => sum + s.total, 0);
      const cost = daySales.reduce((sum, sale) => {
        return sum + sale.items.reduce((itemSum, item) => {
          const product = products.find(p => p.id === item.productId);
          return itemSum + (product ? product.cost * item.quantity : 0);
        }, 0);
      }, 0);

      days.push({
        date: `${date.getDate()}/${date.getMonth() + 1}`,
        ventas: Math.round(revenue),
        ganancias: Math.round(revenue - cost)
      });
    }
    return days;
  }, [sales, products]);

  // Top selling products
  const topProducts = useMemo(() => {
    const productStats: { [key: string]: { name: string; revenue: number; quantity: number } } = {};

    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (!productStats[item.productId]) {
          productStats[item.productId] = {
            name: item.productName,
            revenue: 0,
            quantity: 0
          };
        }
        productStats[item.productId].revenue += item.subtotal;
        productStats[item.productId].quantity += item.quantity;
      });
    });

    return Object.values(productStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [sales]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reportes y Contabilidad</h1>
          <p className="text-gray-500 mt-1">Análisis financiero de tu ferretería</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 rounded-lg transition-colors ${period === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border hover:bg-gray-50'
              }`}
          >
            Semana
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded-lg transition-colors ${period === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border hover:bg-gray-50'
              }`}
          >
            Mes
          </button>
          <button
            onClick={() => setPeriod('year')}
            className={`px-4 py-2 rounded-lg transition-colors ${period === 'year'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border hover:bg-gray-50'
              }`}
          >
            Año
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Ingresos Totales</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                S/ {stats.totalRevenue.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 mt-1">{stats.totalSales} ventas</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <DollarSign size={24} className="text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Ganancia Neta</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                S/ {stats.totalProfit.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Margen: {stats.profitMargin.toFixed(1)}%
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp size={24} className="text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Flujo de Caja</p>
              <p className={`text-2xl font-bold mt-1 ${stats.cashFlow >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                S/ {stats.cashFlow.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Ingresos - Compras
              </p>
            </div>
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stats.cashFlow >= 0 ? 'bg-green-100' : 'bg-red-100'
              }`}>
              {stats.cashFlow >= 0 ? (
                <TrendingUp size={24} className="text-green-600" />
              ) : (
                <TrendingDown size={24} className="text-red-600" />
              )}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Costo Total</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                S/ {stats.totalCost.toFixed(2)}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {stats.totalPurchases} compras
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <ArrowUpDown size={24} className="text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Tendencia de Ventas y Ganancias</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailySalesTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="ventas" stroke="#3b82f6" strokeWidth={2} name="Ventas" />
              <Line type="monotone" dataKey="ganancias" stroke="#10b981" strokeWidth={2} name="Ganancias" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Payment Methods */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Métodos de Pago</h3>
          {paymentMethodsData.length > 0 ? (
            <div className="flex items-center">
              <ResponsiveContainer width="50%" height={250}>
                <PieChart>
                  <Pie
                    data={paymentMethodsData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {paymentMethodsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-3">
                {paymentMethodsData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-sm text-gray-700">{item.name}</span>
                    </div>
                    <span className="font-semibold">S/ {item.value.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <p>No hay datos de ventas</p>
            </div>
          )}
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Category */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Ventas por Categoría</h3>
          {salesByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesByCategory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <p>No hay datos de ventas</p>
            </div>
          )}
        </Card>

        {/* Top Products */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Productos Más Vendidos</h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {topProducts.map((product, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center font-semibold text-blue-600">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">{product.quantity} unidades</p>
                  </div>
                </div>
                <p className="font-semibold text-blue-600">
                  S/ {product.revenue.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
          {topProducts.length === 0 && (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <p>No hay datos de ventas</p>
            </div>
          )}
        </Card>
      </div>

      {/* Cash Flow Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Resumen de Flujo de Efectivo</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Banknote size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Efectivo</p>
              <p className="text-xl font-bold text-gray-900">
                S/ {stats.cashSales.toFixed(2)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <CreditCard size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Tarjeta</p>
              <p className="text-xl font-bold text-gray-900">
                S/ {stats.cardSales.toFixed(2)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <DollarSign size={24} className="text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Bancas Móviles</p>
              <p className="text-xl font-bold text-gray-900">
                S/ {stats.transferSales.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};