import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Camera, X } from 'lucide-react';
import { toast } from 'sonner';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  className?: string;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Unique ID for this scanner instance to avoid DOM conflicts
  const scannerId = React.useMemo(() => `scanner-${Math.random().toString(36).substr(2, 9)}`, []);

  useEffect(() => {
    let mounted = true;

    if (isOpen) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        if (mounted) startScanner();
      }, 300);
      return () => clearTimeout(timer);
    } else {
      stopScanner();
    }

    return () => {
      mounted = false;
      stopScanner();
    };
  }, [isOpen]);

  const startScanner = async () => {
    setErrorMsg(null);

    // Check for Secure Context (HTTPS or localhost)
    if (!window.isSecureContext) {
      const msg = 'La cámara requiere HTTPS o Localhost';
      setErrorMsg(msg);
      toast.error(msg);
      return;
    }

    try {
      // Ensure element exists
      if (!document.getElementById(scannerId)) {
        throw new Error('Scanner element not found in DOM');
      }

      const scanner = new Html5Qrcode(scannerId);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          onScan(decodedText);
          toast.success('Código escaneado');
          handleClose();
        },
        (errorMessage) => {
          // Ignore scanning errors (no code found in frame)
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Error al iniciar escáner:', err);
      let message = 'No se pudo acceder a la cámara';

      if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission denied')) {
        message = 'Permiso denegado. Habilita la cámara en el navegador.';
      } else if (err?.name === 'NotFoundError') {
        message = 'No se encontró cámara.';
      } else if (err?.name === 'NotReadableError') {
        message = 'Cámara en uso por otra app.';
      } else {
        message = `Error: ${err.message || 'Desconocido'}`;
      }

      setErrorMsg(message);
      toast.error(message);
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      }
    }
    scannerRef.current = null;
    setIsScanning(false);
  };

  const handleClose = async () => {
    await stopScanner();
    setIsOpen(false);
    setErrorMsg(null);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(true)}
        className={className || "h-12 w-12"}
        title="Abrir escáner"
      >
        <Camera size={20} />
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md bg-black text-white border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white">Escanear Código</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center space-y-4">
            {/* Container must have explicit size for library to work reliably */}
            <div
              id={scannerId}
              className="w-full bg-black rounded-lg overflow-hidden"
              style={{ minHeight: '300px', minWidth: '300px' }}
            />

            {errorMsg && (
              <div className="text-red-400 text-sm text-center p-2 bg-red-900/20 rounded">
                {errorMsg}
                <Button
                  variant="link"
                  className="text-white underline ml-2"
                  onClick={startScanner}
                >
                  Reintentar
                </Button>
              </div>
            )}

            <Button onClick={handleClose} variant="secondary" className="w-full">
              <X size={16} className="mr-2" />
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
