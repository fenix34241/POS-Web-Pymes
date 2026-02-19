import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { Refund } from '../types';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Search,
  Plus,
  Check,
  X,
  ChevronDown,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

export const Refunds: React.FC = () => {
  const { refunds, sales, addRefund, approveRefund, rejectRefund } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
  const [showNewRefundModal, setShowNewRefundModal] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState('');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [refundReason, setRefundReason] = useState('damaged');
  const [refundDetail, setRefundDetail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const filteredRefunds = useMemo(() => {
    if (!searchTerm) return refunds;
    const term = searchTerm.toLowerCase();
    return refunds.filter(r =>
      r.id.toLowerCase().includes(term) ||
      r.saleId.toLowerCase().includes(term) ||
      r.reason.toLowerCase().includes(term)
    );
  }, [refunds, searchTerm]);

  const selectedSale = sales.find(s => s.id === selectedSaleId);

  const handleCreateRefund = async () => {
    if (!selectedSaleId || selectedItems.length === 0) {
      toast.error('Selecciona venta e items');
      return;
    }

    setIsProcessing(true);
    try {
      const refundItems = selectedSale!.items
        .map((item, idx) => {
          if (!selectedItems.includes(idx)) return null;
          return {
            saleItemId: item.id || idx,
            quantity: item.quantity,
            refundAmount: item.subtotal
          };
        })
        .filter(Boolean) as Array<{ saleItemId: number; quantity: number; refundAmount: number }>;

      await addRefund({
        saleId: selectedSaleId,
        items: refundItems,
        reason: refundReason,
        reasonDetail: refundDetail
      });

      toast.success('Devolución creada exitosamente');
      setShowNewRefundModal(false);
      setSelectedSaleId('');
      setSelectedItems([]);
      setRefundReason('damaged');
      setRefundDetail('');
    } catch (error: any) {
      toast.error(error.message || 'Error al crear devolución');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = async (refundId: string) => {
    setIsProcessing(true);
    try {
      await approveRefund(refundId);
      toast.success('Devolución aprobada y stock restaurado');
      setSelectedRefund(null);
    } catch (error: any) {
      toast.error(error.message || 'Error al aprobar devolución');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (refundId: string) => {
    setIsProcessing(true);
    try {
      await rejectRefund(refundId);
      toast.success('Devolución rechazada');
      setSelectedRefund(null);
    } catch (error: any) {
      toast.error(error.message || 'Error al rechazar devolución');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'pending': 'secondary',
      'approved': 'default',
      'rejected': 'destructive',
      'completed': 'default'
    };

    const labels: Record<string, string> = {
      'pending': 'Pendiente',
      'approved': 'Aprobada',
      'rejected': 'Rechazada',
      'completed': 'Completada'
    };

    return <Badge variant={variants[status] || 'secondary'}>{labels[status]}</Badge>;
  };

  const getReason = (reason: string) => {
    const reasons: Record<string, string> = {
      'damaged': 'Producto Dañado',
      'defective': 'Defectuoso',
      'wrong_item': 'Producto Incorrecto',
      'customer_request': 'Solicitud del Cliente',
      'other': 'Otro'
    };
    return reasons[reason] || reason;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Devoluciones y Reembolsos</h1>
          <p className="text-gray-500 mt-1">Gestiona devoluciones de productos vendidos</p>
        </div>
        <Button
          onClick={() => setShowNewRefundModal(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus size={20} className="mr-2" />
          Nueva Devolución
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Refunds List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search & Filter */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <Input
                type="text"
                placeholder="Buscar por ID venta, motivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 text-lg"
              />
            </div>
          </div>

          {/* Refunds List */}
          <div className="space-y-3">
            {filteredRefunds.length > 0 ? (
              filteredRefunds.map(refund => (
                <Card
                  key={refund.id}
                  className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedRefund(refund)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-medium text-gray-900 truncate">Devolución: {refund.id.substring(0, 8)}</p>
                        {getStatusBadge(refund.status)}
                      </div>
                      <p className="text-sm text-gray-600 mb-1">Venta: {refund.saleId.substring(0, 8)}</p>
                      <p className="text-sm text-gray-600 mb-1">Motivo: {getReason(refund.reason)}</p>
                      {refund.reasonDetail && (
                        <p className="text-sm text-gray-500 italic">{refund.reasonDetail}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-red-600">S/ {refund.total.toFixed(2)}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(refund.date).toLocaleDateString('es-PE')}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-12 text-center">
                <AlertCircle size={48} className="mx-auto mb-2 opacity-50 text-gray-400" />
                <p className="text-gray-400">No hay devoluciones</p>
              </Card>
            )}
          </div>
        </div>

        {/* Details Panel */}
        <div className="lg:col-span-1">
          {selectedRefund && (
            <Card className="p-6 sticky top-6">
              <div className="space-y-4">
                {/* Header */}
                <div>
                  <h2 className="text-xl font-semibold mb-2">Detalles de Devolución</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Estado:</span>
                    {getStatusBadge(selectedRefund.status)}
                  </div>
                </div>

                {/* Items */}
                <div className="bg-gray-50 rounded p-3 space-y-2">
                  <p className="font-medium text-sm text-gray-700">Items Devueltos:</p>
                  <div className="space-y-2">
                    {selectedRefund.items.map((item, idx) => (
                      <div key={idx} className="text-sm bg-white p-2 rounded border">
                        <p className="font-medium">{item.productName || 'Producto sin nombre'}</p>
                        <p className="text-gray-600">Cantidad: {item.quantity}</p>
                        <p className="text-gray-600">Precio Unit: S/ {(item.originalPrice || 0).toFixed(2)}</p>
                        <p className="font-semibold text-blue-600">Reembolso: S/ {(item.refundAmount || 0).toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t pt-3">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-600">Total Reembolso:</span>
                    <span className="font-bold text-lg text-red-600">S/ {selectedRefund.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Fecha:</span>
                    <span>{new Date(selectedRefund.date).toLocaleDateString('es-PE')}</span>
                  </div>
                </div>

                {/* Info */}
                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
                  <p className="font-medium mb-1">Motivo: {getReason(selectedRefund.reason)}</p>
                  {selectedRefund.reasonDetail && (
                    <p className="text-blue-700">{selectedRefund.reasonDetail}</p>
                  )}
                </div>

                {/* Actions */}
                {selectedRefund.status === 'pending' && (
                  <div className="space-y-2 pt-2">
                    <Button
                      onClick={() => handleApprove(selectedRefund.id)}
                      disabled={isProcessing}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <Check size={18} className="mr-2" />
                      {isProcessing ? 'Procesando...' : 'Aprobar Devolución'}
                    </Button>
                    <Button
                      onClick={() => handleReject(selectedRefund.id)}
                      disabled={isProcessing}
                      variant="outline"
                      className="w-full border-red-200 hover:bg-red-50"
                    >
                      <X size={18} className="mr-2" />
                      Rechazar
                    </Button>
                  </div>
                )}

                {(selectedRefund.status === 'approved' || selectedRefund.status === 'completed') && (
                  <div className="bg-green-50 border border-green-200 rounded p-3 text-sm text-green-800">
                    ✓ Devolución aprobada. El stock ha sido restaurado.
                  </div>
                )}

                {selectedRefund.status === 'rejected' && (
                  <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
                    Devolución rechazada
                  </div>
                )}
              </div>
            </Card>
          )}

          {!selectedRefund && (
            <Card className="p-6 sticky top-6 text-center">
              <p className="text-gray-400 mb-4">Selecciona una devolución para ver detalles</p>
            </Card>
          )}
        </div>
      </div>

      {/* New Refund Modal */}
      {showNewRefundModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">Crear Nueva Devolución</h2>

              {/* Select Sale */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Selecciona la Venta</label>
                <select
                  value={selectedSaleId}
                  onChange={(e) => {
                    setSelectedSaleId(e.target.value);
                    setSelectedItems([]);
                  }}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Selecciona una venta --</option>
                  {sales.map(sale => (
                    <option key={sale.id} value={sale.id}>
                      {sale.id.substring(0, 8)} - {new Date(sale.date).toLocaleDateString('es-PE')} - S/ {sale.total.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Items from Sale */}
              {selectedSale && (
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Selecciona Items para Devolver</label>
                  <div className="space-y-2 bg-gray-50 p-4 rounded">
                    {selectedSale.items.map((item, idx) => (
                      <label key={idx} className="flex items-center gap-3 p-3 bg-white rounded border cursor-pointer hover:bg-blue-50">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(idx)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedItems([...selectedItems, idx]);
                            } else {
                              setSelectedItems(selectedItems.filter(i => i !== idx));
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <div className="flex-1">
                          <p className="font-medium">{item.productName}</p>
                          <p className="text-sm text-gray-600">Cantidad: {item.quantity} x S/ {item.price.toFixed(2)} = S/ {item.subtotal.toFixed(2)}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Reason */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Motivo de Devolución</label>
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="damaged">Producto Dañado</option>
                  <option value="defective">Defectuoso</option>
                  <option value="wrong_item">Producto Incorrecto</option>
                  <option value="customer_request">Solicitud del Cliente</option>
                  <option value="other">Otro</option>
                </select>
              </div>

              {/* Detail */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Detalles Adicionales</label>
                <textarea
                  value={refundDetail}
                  onChange={(e) => setRefundDetail(e.target.value)}
                  placeholder="Describe el motivo específico de la devolución..."
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={handleCreateRefund}
                  disabled={isProcessing || !selectedSaleId || selectedItems.length === 0}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isProcessing ? 'Creando...' : 'Crear Devolución'}
                </Button>
                <Button
                  onClick={() => {
                    setShowNewRefundModal(false);
                    setSelectedSaleId('');
                    setSelectedItems([]);
                    setRefundDetail('');
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
