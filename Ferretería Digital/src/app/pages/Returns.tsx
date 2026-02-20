import React, { useMemo, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { Undo2 } from 'lucide-react';

export const Returns: React.FC = () => {
  const { sales, createRefund } = useAppContext();
  const [selectedSaleId, setSelectedSaleId] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundQuantities, setRefundQuantities] = useState<Record<number, number>>({});

  const selectedSale = useMemo(
    () => sales.find((sale) => sale.id === selectedSaleId),
    [sales, selectedSaleId],
  );

  const handleRefundQuantityChange = (saleItemId: number, qty: number) => {
    setRefundQuantities((prev) => ({ ...prev, [saleItemId]: qty }));
  };

  const submitRefund = async () => {
    if (!selectedSale) {
      toast.error('Selecciona una venta');
      return;
    }

    const items = selectedSale.items
      .map((item) => ({
        saleItemId: item.id || 0,
        quantity: Number(refundQuantities[item.id || 0] || 0),
      }))
      .filter((item) => item.saleItemId > 0 && item.quantity > 0);

    if (items.length === 0) {
      toast.error('Indica cantidades a devolver');
      return;
    }

    try {
      await createRefund(selectedSale.id, {
        reason: refundReason,
        items,
      });

      setRefundQuantities({});
      setRefundReason('');
      toast.success('Devolución registrada correctamente');
    } catch (error: any) {
      toast.error(error.message || 'No se pudo registrar la devolución');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Devoluciones</h1>
        <p className="text-gray-500 mt-1">Gestiona reembolsos de ventas en un módulo dedicado</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Undo2 className="text-blue-600" size={22} />
          <h3 className="text-lg font-semibold">Registrar devolución / reembolso</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium block mb-2">Venta</label>
            <select
              className="w-full h-10 rounded-md border px-3"
              value={selectedSaleId}
              onChange={(e) => {
                setSelectedSaleId(e.target.value);
                setRefundQuantities({});
              }}
            >
              <option value="">Selecciona una venta</option>
              {sales.slice(0, 100).map((sale) => (
                <option key={sale.id} value={sale.id}>
                  {new Date(sale.date).toLocaleString()} - S/ {sale.total.toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium block mb-2">Motivo</label>
            <Input
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="Motivo de devolución"
            />
          </div>
        </div>

        {selectedSale && (
          <div className="mt-4 space-y-2">
            {selectedSale.items.map((item) => {
              const refunded = item.refundedQuantity || 0;
              const available = item.quantity - refunded;

              return (
                <div key={item.id || item.productId} className="grid grid-cols-12 gap-2 items-center border rounded-lg p-2">
                  <div className="col-span-5 text-sm">{item.productName}</div>
                  <div className="col-span-3 text-xs text-gray-600">Vendidos: {item.quantity} | Devueltos: {refunded}</div>
                  <div className="col-span-2 text-xs text-gray-600">Disponible: {available}</div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="0"
                      max={Math.max(0, available)}
                      value={refundQuantities[item.id || 0] || 0}
                      onChange={(e) => handleRefundQuantityChange(item.id || 0, Number(e.target.value))}
                    />
                  </div>
                </div>
              );
            })}

            <div className="pt-2">
              <Button onClick={submitRefund}>Registrar devolución</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
