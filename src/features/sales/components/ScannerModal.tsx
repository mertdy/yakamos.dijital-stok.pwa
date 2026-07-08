import React, { useEffect, useState, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeScanner, BarcodeFormat } from '@capacitor-mlkit/barcode-scanning';
import { Capacitor } from '@capacitor/core';
import { useInventoryStore } from '../../inventory/store/useInventoryStore';
import { toast } from '@heroui/react';
import { useSalesStore } from '../store/useSalesStore';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { Button } from '@heroui/react';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan?: (barcode: string) => void;
}

const ScannerModal: React.FC<ScannerModalProps> = ({ isOpen, onClose, onScan }) => {
  const [isScanning, setIsScanning] = useState(false);
  const { items } = useInventoryStore();
  const { addToCart } = useSalesStore();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<any>(null);
  const isScanningRef = useRef(false);
  const hasScannedRef = useRef(false);
  const lastScannedRef = useRef<{ barcode: string; time: number } | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      startScan();
    } else {
      stopScan();
    }

    return () => {
      stopScan();
    };
  }, [isOpen]);

  const startScan = async () => {
    try {
      hasScannedRef.current = false;
      isScanningRef.current = true;
      const isWeb = Capacitor.getPlatform() === 'web';
      if (isWeb) {
        setIsScanning(true);

        if ('BarcodeDetector' in window) {
          // Native Barcode Detection API (Chrome/Edge Android & Desktop)
          if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
          startTimeoutRef.current = setTimeout(async () => {
            if (videoRef.current && isScanningRef.current) {
              try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });

                // If modal closed while waiting for camera permissions
                if (!isScanningRef.current) {
                  stream.getTracks().forEach(track => track.stop());
                  return;
                }

                streamRef.current = stream;
                videoRef.current.srcObject = stream;
                await videoRef.current.play();

                const barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code', 'ean_13', 'ean_8'] });

                const detectLoop = async () => {
                  if (!isScanningRef.current || hasScannedRef.current) return;
                  if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
                    try {
                      const barcodes = await barcodeDetector.detect(videoRef.current);
                      if (barcodes.length > 0) {
                        handleBarcodeScanned(barcodes[0].rawValue);
                        if (hasScannedRef.current) return; // Stop loop if successfully processed
                      }
                    } catch (e) {
                      // Ignored during loop
                    }
                  }
                  animationFrameRef.current = requestAnimationFrame(detectLoop);
                };
                detectLoop();
              } catch (e) {
                console.error("Camera access failed", e);
                setIsScanning(false);
              }
            }
          }, 100);
        } else {
          // ZXing Fallback
          if (!codeReaderRef.current) {
            codeReaderRef.current = new BrowserMultiFormatReader();
          }

          if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
          startTimeoutRef.current = setTimeout(() => {
            if (videoRef.current && codeReaderRef.current && isScanningRef.current) {
              codeReaderRef.current.decodeFromVideoDevice(undefined, videoRef.current, (result, _err) => {
                if (result) {
                  handleBarcodeScanned(result.getText());
                }
              }).then((controls) => {
                if (!isScanningRef.current) {
                  controls.stop();
                } else {
                  controlsRef.current = controls;
                }
              }).catch(console.error);
            }
          }, 100);
        }
        return;
      }

      // Native Device Scanning (Capacitor MLKit)
      await BarcodeScanner.installGoogleBarcodeScannerModule();
      const status = await BarcodeScanner.requestPermissions();

      if (status.camera !== 'granted' && status.camera !== 'limited') {
        toast.danger('Kamera izni verilmedi');
        onClose();
        return;
      }

      setIsScanning(true);
      document.body.classList.add('barcode-scanner-active'); // To make webview transparent

      await BarcodeScanner.addListener('barcodesScanned', async (result: any) => {
        if (result.barcodes && result.barcodes.length > 0) {
          handleBarcodeScanned(result.barcodes[0].rawValue);
        }
      });

      await BarcodeScanner.startScan({ formats: [BarcodeFormat.QrCode, BarcodeFormat.Ean13, BarcodeFormat.Ean8] });

    } catch (error) {
      console.error("Scanner error", error);
      setIsScanning(false);
    }
  };

  const stopScan = async () => {
    isScanningRef.current = false;
    setIsScanning(false);

    if (startTimeoutRef.current) {
      clearTimeout(startTimeoutRef.current);
      startTimeoutRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    const isWeb = Capacitor.getPlatform() === 'web';
    if (isWeb) {
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      codeReaderRef.current = null;
    } else {
      document.body.classList.remove('barcode-scanner-active');
      await BarcodeScanner.stopScan();
      await BarcodeScanner.removeAllListeners();
    }
  };

  const handleBarcodeScanned = (barcode: string) => {
    if (hasScannedRef.current) return;
    
    const now = Date.now();
    if (lastScannedRef.current && lastScannedRef.current.barcode === barcode && now - lastScannedRef.current.time < 3000) {
      return; // Prevent spamming the same barcode within 3 seconds
    }
    lastScannedRef.current = { barcode, time: now };

    if (onScan) {
      hasScannedRef.current = true;
      onScan(barcode);
      if (Capacitor.getPlatform() !== 'web') {
        stopScan();
      }
      onClose();
      return;
    }

    // Find item
    const item = items.find((i: any) => i.barcode === barcode);
    if (item) {
      hasScannedRef.current = true;
      addToCart({ inventoryId: item.id, name: item.name, price: item.price, quantity: 1 });
      toast.success(`${item.name} sepete eklendi`);
      if (Capacitor.getPlatform() === 'web') {
        onClose();
      } else {
        stopScan();
        onClose();
      }
    } else {
      toast(`${barcode} sistemde kayıtlı değil`, {
        timeout: 6000,
        variant: 'danger',
        actionProps: {
          children: 'Yeni Ürün Ekle',
          className: 'bg-primary text-white',
          size: 'sm',
          onPress: () => {
            if (Capacitor.getPlatform() !== 'web') {
              stopScan();
            }
            onClose();
            navigate(`/inventory/new?barcode=${encodeURIComponent(barcode)}`);
          }
        }
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${Capacitor.getPlatform() !== 'web' && isScanning ? 'bg-transparent' : 'bg-black/40 backdrop-blur-sm'}`}>
      <div className={`w-full max-w-md bg-white rounded-[28px] shadow-2xl overflow-hidden ${Capacitor.getPlatform() !== 'web' && isScanning ? 'bg-transparent shadow-none' : ''}`}>
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white">
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Barkod Okut</h2>
          <Button variant="ghost" isIconOnly onPress={onClose}>
            <X className="text-2xl" />
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center py-10 bg-white">
          {isScanning && Capacitor.getPlatform() === 'web' ? (
            <div className="w-64 h-64 border-[3px] border-dashed border-primary/50 rounded-3xl flex flex-col items-center justify-center relative overflow-hidden bg-black">
              <video ref={videoRef} className="w-full h-full object-cover" />
              <div className="w-full h-1 bg-primary absolute top-1/2 left-0 right-0 animate-ping opacity-50" />
            </div>
          ) : (
            <div className="w-64 h-64 border-[3px] border-dashed border-primary/50 rounded-3xl flex items-center justify-center relative overflow-hidden bg-gray-50/50">
              <div className="absolute inset-0 bg-black/5" />
              <div className="w-full h-1 bg-primary absolute top-1/2 left-0 right-0 animate-ping" />
            </div>
          )}
        </div>
        <div className="p-6 bg-white border-t border-gray-100 flex justify-end">
          <Button variant="ghost" onPress={onClose}>
            İptal Et
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ScannerModal;
