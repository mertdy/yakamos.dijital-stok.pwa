import React, { useEffect, useState, useRef, useCallback } from 'react';
import { clsx } from 'clsx';
import { BrowserMultiFormatReader } from '@zxing/browser';
import {
  BarcodeScanner,
  BarcodeFormat,
  LensFacing
} from '@capacitor-mlkit/barcode-scanning';
import { Capacitor } from '@capacitor/core';
import { useInventoryStore, type InventoryItem } from '@/features/inventory';
import { toast, Button, Modal, Tooltip } from '@heroui/react';
import { useSalesStore } from '../store/useSalesStore';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/core/config/routes';
import posthog from 'posthog-js';
import { playBarcodeFeedback } from '@/shared/utils/barcodeFeedback';
import {
  CameraOff,
  Flashlight,
  FlashlightOff,
  Minus,
  Plus,
  RotateCcw,
  ShoppingCart,
  SwitchCamera,
  Trash2
} from 'lucide-react';

interface ScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan?: (barcode: string) => void;
}

type ScanMode = 'single' | 'multiple';
type CameraFacing = 'environment' | 'user';

interface CameraTrackCapabilities {
  torch?: boolean;
}

type CameraTrack = MediaStreamTrack & {
  getCapabilities?: () => CameraTrackCapabilities;
};

interface ScannedItem {
  item: InventoryItem;
  quantity: number;
}

interface ScannerCameraControlsProps {
  canFlipCamera: boolean;
  isFlashAvailable: boolean;
  isFlashOn: boolean;
  onFlipCamera: () => void;
  onToggleFlash: () => void;
}

const SCAN_MODE_STORAGE_KEY = 'sales-scanner-mode';

const ScannerCameraControls = ({
  canFlipCamera,
  isFlashAvailable,
  isFlashOn,
  onFlipCamera,
  onToggleFlash
}: ScannerCameraControlsProps) => {
  if (!canFlipCamera && !isFlashAvailable) return null;

  return (
    <div className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-xl bg-black/55 p-1 backdrop-blur-sm">
      {canFlipCamera && (
        <Tooltip delay={0} closeDelay={0}>
          <Button
            variant="tertiary"
            isIconOnly
            size="sm"
            className="text-white hover:bg-white/15"
            onPress={onFlipCamera}
            aria-label="Kamerayı değiştir">
            <SwitchCamera size={18} />
          </Button>
          <Tooltip.Content showArrow>
            <Tooltip.Arrow />
            Kamerayı değiştir
          </Tooltip.Content>
        </Tooltip>
      )}
      {isFlashAvailable && (
        <Tooltip delay={0} closeDelay={0}>
          <Button
            variant="tertiary"
            isIconOnly
            size="sm"
            className={clsx(
              'text-white hover:bg-white/15',
              isFlashOn && 'bg-white/20 text-yellow-300'
            )}
            onPress={onToggleFlash}
            aria-label={isFlashOn ? 'Flaşı kapat' : 'Flaşı aç'}>
            {isFlashOn ? <Flashlight size={18} /> : <FlashlightOff size={18} />}
          </Button>
          <Tooltip.Content showArrow>
            <Tooltip.Arrow />
            {isFlashOn ? 'Flaşı kapat' : 'Flaşı aç'}
          </Tooltip.Content>
        </Tooltip>
      )}
    </div>
  );
};

const ScannerModal: React.FC<ScannerModalProps> = ({
  isOpen,
  onClose,
  onScan
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<ScanMode>(() =>
    localStorage.getItem(SCAN_MODE_STORAGE_KEY) === 'multiple'
      ? 'multiple'
      : 'single'
  );
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [lastScannedItemId, setLastScannedItemId] = useState<string | null>(
    null
  );
  const [canFlipCamera, setCanFlipCamera] = useState(false);
  const [isFlashAvailable, setIsFlashAvailable] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const { items } = useInventoryStore();
  const { addToCart } = useSalesStore();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<any>(null);
  const isScanningRef = useRef(false);
  const cameraFacingRef = useRef<CameraFacing>('environment');
  const hasHandledSingleScanRef = useRef(false);
  const lastScannedRef = useRef<{ barcode: string; time: number } | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const startTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateWebCameraCapabilities = useCallback(
    async (stream: MediaStream) => {
      const cameraTrack = stream.getVideoTracks()[0] as CameraTrack | undefined;
      const capabilities = cameraTrack?.getCapabilities?.() as
        | CameraTrackCapabilities
        | undefined;
      setIsFlashAvailable(Boolean(capabilities?.torch));
      setIsFlashOn(false);

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        setCanFlipCamera(
          devices.filter(device => device.kind === 'videoinput').length > 1
        );
      } catch {
        setCanFlipCamera(false);
      }
    },
    []
  );

  const stopScan = useCallback(async () => {
    isScanningRef.current = false;
    setIsScanning(false);
    setIsFlashOn(false);

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
  }, []);

  const addScannedItem = useCallback((item: InventoryItem) => {
    setScannedItems(currentItems => {
      const existingItem = currentItems.find(
        scannedItem => scannedItem.item.id === item.id
      );

      if (existingItem) {
        return currentItems.map(scannedItem =>
          scannedItem.item.id === item.id
            ? { ...scannedItem, quantity: scannedItem.quantity + 1 }
            : scannedItem
        );
      }

      return [...currentItems, { item, quantity: 1 }];
    });
    setLastScannedItemId(item.id);
  }, []);

  const addItemToCart = useCallback(
    (item: InventoryItem, quantity = 1) => {
      addToCart({
        inventoryId: item.id,
        name: item.name,
        price: item.salePrice ?? item.price ?? 0,
        quantity,
        barcode: item.barcode,
        imageUrl: item.imageUrl
      });
    },
    [addToCart]
  );

  const handleBarcodeScanned = useCallback(
    (barcode: string) => {
      if (
        (onScan || scanMode === 'single') &&
        hasHandledSingleScanRef.current
      ) {
        return;
      }

      const now = Date.now();
      if (
        lastScannedRef.current &&
        lastScannedRef.current.barcode === barcode &&
        now - lastScannedRef.current.time < 900
      ) {
        return; // Prevent spamming the same barcode within 3 seconds
      }
      lastScannedRef.current = { barcode, time: now };

      if (onScan) {
        hasHandledSingleScanRef.current = true;
        playBarcodeFeedback();
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
        playBarcodeFeedback();
        posthog.capture('scanner_item_added_to_cart', {
          inventory_id: item.id,
          barcode_length: barcode.length,
          scan_mode: onScan ? 'form_fill' : 'cart_add',
          platform: Capacitor.getPlatform()
        });
        if (scanMode === 'multiple') {
          addScannedItem(item);
        } else {
          hasHandledSingleScanRef.current = true;
          addItemToCart(item);
          toast.success(`${item.name} sepete eklendi`);
          if (Capacitor.getPlatform() !== 'web') {
            void stopScan();
          }
          onClose();
        }
      } else {
        posthog.capture('unknown_barcode_detected', {
          barcode_length: barcode.length,
          scan_mode: onScan ? 'form_fill' : 'cart_add',
          platform: Capacitor.getPlatform()
        });

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
              navigate(ROUTES.INVENTORY.NEW_WITH_BARCODE(barcode));
            }
          }
        });
      }
    },
    [
      onScan,
      stopScan,
      onClose,
      items,
      navigate,
      scanMode,
      addItemToCart,
      addScannedItem
    ]
  );

  const startScan = useCallback(
    async (facing = cameraFacingRef.current) => {
      try {
        hasHandledSingleScanRef.current = false;
        isScanningRef.current = true;
        setScannerError(null);
        const isWeb = Capacitor.getPlatform() === 'web';
        if (isWeb) {
          if (!navigator.mediaDevices?.getUserMedia) {
            isScanningRef.current = false;
            setScannerError(
              'Bu cihazda kullanılabilir bir web kamerası bulunamadı.'
            );
            return;
          }

          setIsScanning(true);

          if ('BarcodeDetector' in window) {
            // Native Barcode Detection API (Chrome/Edge Android & Desktop)
            if (startTimeoutRef.current) clearTimeout(startTimeoutRef.current);
            startTimeoutRef.current = setTimeout(async () => {
              if (videoRef.current && isScanningRef.current) {
                try {
                  const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: facing } }
                  });

                  // If modal closed while waiting for camera permissions
                  if (!isScanningRef.current) {
                    stream.getTracks().forEach(track => track.stop());
                    return;
                  }

                  streamRef.current = stream;
                  await updateWebCameraCapabilities(stream);
                  videoRef.current.srcObject = stream;
                  await videoRef.current.play();

                  const barcodeDetector = new (window as any).BarcodeDetector({
                    formats: ['qr_code', 'ean_13', 'ean_8']
                  });

                  const detectLoop = async () => {
                    if (!isScanningRef.current) return;
                    if (
                      videoRef.current &&
                      videoRef.current.readyState ===
                        videoRef.current.HAVE_ENOUGH_DATA
                    ) {
                      try {
                        const barcodes = await barcodeDetector.detect(
                          videoRef.current
                        );
                        if (barcodes.length > 0) {
                          handleBarcodeScanned(barcodes[0].rawValue);
                        }
                      } catch {
                        // Ignored during loop
                      }
                    }
                    animationFrameRef.current =
                      requestAnimationFrame(detectLoop);
                  };
                  detectLoop();
                } catch (e) {
                  console.error('Camera access failed', e);
                  isScanningRef.current = false;
                  setIsScanning(false);
                  setScannerError(
                    e instanceof DOMException && e.name === 'NotAllowedError'
                      ? 'Kamera izni verilmedi. Tarayıcı ayarlarından izin verip tekrar deneyin.'
                      : 'Bu cihazda kullanılabilir bir web kamerası bulunamadı.'
                  );
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
              if (
                videoRef.current &&
                codeReaderRef.current &&
                isScanningRef.current
              ) {
                codeReaderRef.current
                  .decodeFromConstraints(
                    { video: { facingMode: { ideal: facing } } },
                    videoRef.current,
                    result => {
                      if (result) {
                        handleBarcodeScanned(result.getText());
                      }
                    }
                  )
                  .then(controls => {
                    if (!isScanningRef.current) {
                      controls.stop();
                    } else {
                      controlsRef.current = controls;
                      const stream = videoRef.current?.srcObject;
                      if (stream instanceof MediaStream) {
                        streamRef.current = stream;
                        void updateWebCameraCapabilities(stream);
                      }
                    }
                  })
                  .catch(error => {
                    console.error('Camera access failed', error);
                    isScanningRef.current = false;
                    setIsScanning(false);
                    setScannerError(
                      error instanceof DOMException &&
                        error.name === 'NotAllowedError'
                        ? 'Kamera izni verilmedi. Tarayıcı ayarlarından izin verip tekrar deneyin.'
                        : 'Bu cihazda kullanılabilir bir web kamerası bulunamadı.'
                    );
                  });
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
        setCanFlipCamera(true);

        await BarcodeScanner.addListener(
          'barcodesScanned',
          async (result: any) => {
            if (result.barcodes && result.barcodes.length > 0) {
              handleBarcodeScanned(result.barcodes[0].rawValue);
            }
          }
        );

        await BarcodeScanner.startScan({
          formats: [
            BarcodeFormat.QrCode,
            BarcodeFormat.Ean13,
            BarcodeFormat.Ean8
          ],
          lensFacing: facing === 'user' ? LensFacing.Front : LensFacing.Back
        });
        const { available } = await BarcodeScanner.isTorchAvailable();
        setIsFlashAvailable(available);
      } catch (error) {
        console.error('Scanner error', error);
        isScanningRef.current = false;
        setIsScanning(false);
        setScannerError('Kamera başlatılamadı. Lütfen tekrar deneyin.');
      }
    },
    [onClose, handleBarcodeScanned, updateWebCameraCapabilities]
  );

  useEffect(() => {
    if (isOpen) {
      setScannedItems([]);
      setLastScannedItemId(null);
      lastScannedRef.current = null;
      cameraFacingRef.current = 'environment';
      setCanFlipCamera(false);
      setIsFlashAvailable(false);
      startScan();
    } else {
      stopScan();
    }

    return () => {
      stopScan();
    };
  }, [isOpen, startScan, stopScan]);

  const isNativeScanning = Capacitor.getPlatform() !== 'web' && isScanning;
  const scannedProductCount = scannedItems.length;
  const scannedUnitCount = scannedItems.reduce(
    (total, scannedItem) => total + scannedItem.quantity,
    0
  );
  const scannedTotal = scannedItems.reduce(
    (total, scannedItem) =>
      total +
      (scannedItem.item.salePrice ?? scannedItem.item.price ?? 0) *
        scannedItem.quantity,
    0
  );

  const handleScanModeChange = (mode: ScanMode) => {
    setScanMode(mode);
    localStorage.setItem(SCAN_MODE_STORAGE_KEY, mode);
  };

  const updateScannedItemQuantity = (itemId: string, quantity: number) => {
    setScannedItems(currentItems =>
      quantity < 1
        ? currentItems.filter(scannedItem => scannedItem.item.id !== itemId)
        : currentItems.map(scannedItem =>
            scannedItem.item.id === itemId
              ? { ...scannedItem, quantity }
              : scannedItem
          )
    );
    if (quantity < 1 && lastScannedItemId === itemId) {
      setLastScannedItemId(null);
    }
  };

  const undoLastScan = () => {
    if (!lastScannedItemId) return;
    const lastScannedItem = scannedItems.find(
      scannedItem => scannedItem.item.id === lastScannedItemId
    );
    if (!lastScannedItem) return;

    updateScannedItemQuantity(lastScannedItemId, lastScannedItem.quantity - 1);
    setLastScannedItemId(null);
  };

  const handleTransferToCart = () => {
    scannedItems.forEach(scannedItem => {
      addItemToCart(scannedItem.item, scannedItem.quantity);
    });
    toast.success(`${scannedUnitCount} ürün sepete eklendi`);
    if (Capacitor.getPlatform() !== 'web') {
      void stopScan();
    }
    onClose();
  };

  const handleFlipCamera = async () => {
    const nextFacing: CameraFacing =
      cameraFacingRef.current === 'environment' ? 'user' : 'environment';
    cameraFacingRef.current = nextFacing;
    setIsFlashAvailable(false);
    setIsFlashOn(false);
    await stopScan();
    await startScan(nextFacing);
  };

  const handleToggleFlash = async () => {
    try {
      const isWeb = Capacitor.getPlatform() === 'web';
      const nextFlashState = !isFlashOn;
      if (isWeb) {
        const cameraTrack = streamRef.current?.getVideoTracks()[0] as
          | CameraTrack
          | undefined;
        if (!cameraTrack) return;
        await cameraTrack.applyConstraints({
          advanced: [{ torch: nextFlashState }]
        } as unknown as MediaTrackConstraints);
      } else {
        await BarcodeScanner.toggleTorch();
      }
      setIsFlashOn(nextFlashState);
    } catch (error) {
      console.warn('Camera flash could not be toggled', error);
      toast.warning('Bu kamerada flaş kullanılamıyor.');
      setIsFlashAvailable(false);
      setIsFlashOn(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={open => {
        if (!open) onClose();
      }}>
      <button style={{ display: 'none' }} aria-hidden="true" tabIndex={-1} />
      <Modal.Backdrop className={clsx(isNativeScanning && 'bg-transparent')}>
        <Modal.Container>
          <Modal.Dialog
            className={clsx(
              'w-full max-w-md overflow-hidden rounded-[28px] bg-white shadow-2xl outline-none',
              isNativeScanning && 'bg-transparent shadow-none'
            )}>
            <Modal.CloseTrigger />
            <Modal.Header>
              <div className="flex w-full items-center justify-between gap-3">
                <div>
                  <Modal.Heading className="text-xl">Barkod Okut</Modal.Heading>
                  <p className="mt-1 text-sm text-gray-500">
                    {scanMode === 'single'
                      ? 'Ürün bulunduğunda sepete eklenir.'
                      : 'Okunan ürünler onayınızla sepete aktarılır.'}
                  </p>
                </div>
                <div className="flex rounded-xl bg-gray-100 p-1">
                  <Button
                    size="sm"
                    variant={scanMode === 'single' ? 'primary' : 'tertiary'}
                    onPress={() => handleScanModeChange('single')}>
                    Tekli
                  </Button>
                  <Button
                    size="sm"
                    variant={scanMode === 'multiple' ? 'primary' : 'tertiary'}
                    onPress={() => handleScanModeChange('multiple')}>
                    Çoklu
                  </Button>
                </div>
              </div>
            </Modal.Header>
            <Modal.Body>
              <div className="flex flex-col items-center justify-center py-4">
                {scannerError ? (
                  <div className="flex max-w-xs flex-col items-center gap-3 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-gray-500">
                      <CameraOff size={30} />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-gray-900">
                        Kamera kullanılamıyor
                      </p>
                      <p className="mt-1 text-sm leading-5 text-gray-500">
                        {scannerError}
                      </p>
                    </div>
                    <Button
                      variant="secondary"
                      onPress={() => void startScan()}>
                      Tekrar Dene
                    </Button>
                  </div>
                ) : isScanning && Capacitor.getPlatform() === 'web' ? (
                  <div className="border-primary/50 relative flex h-64 w-64 flex-col items-center justify-center overflow-hidden rounded-3xl border-[3px] border-dashed bg-black">
                    <video
                      ref={videoRef}
                      className="h-full w-full object-cover"
                    />
                    <ScannerCameraControls
                      canFlipCamera={canFlipCamera}
                      isFlashAvailable={isFlashAvailable}
                      isFlashOn={isFlashOn}
                      onFlipCamera={handleFlipCamera}
                      onToggleFlash={handleToggleFlash}
                    />
                    <div className="bg-primary absolute top-1/2 right-0 left-0 h-1 w-full animate-ping opacity-50" />
                  </div>
                ) : (
                  <div className="border-primary/50 relative flex h-64 w-64 items-center justify-center overflow-hidden rounded-3xl border-[3px] border-dashed bg-gray-50/50">
                    <div className="absolute inset-0 bg-black/5" />
                    {isScanning && (
                      <ScannerCameraControls
                        canFlipCamera={canFlipCamera}
                        isFlashAvailable={isFlashAvailable}
                        isFlashOn={isFlashOn}
                        onFlipCamera={handleFlipCamera}
                        onToggleFlash={handleToggleFlash}
                      />
                    )}
                    <div className="bg-primary absolute top-1/2 right-0 left-0 h-1 w-full animate-ping" />
                  </div>
                )}
              </div>
              {scanMode === 'multiple' && (
                <div className="border-t border-gray-100 pt-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">
                        Okunan ürünler
                      </h3>
                      <p className="text-xs text-gray-500">
                        {scannedProductCount > 0
                          ? `${scannedProductCount} çeşit · ${scannedUnitCount} adet`
                          : 'Kamera ile ürünleri okutun.'}
                      </p>
                    </div>
                    {scannedItems.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Tooltip delay={0} closeDelay={0}>
                          <Button
                            variant="tertiary"
                            isIconOnly
                            size="sm"
                            isDisabled={!lastScannedItemId}
                            onPress={undoLastScan}
                            aria-label="Son okutmayı geri al">
                            <RotateCcw size={17} />
                          </Button>
                          <Tooltip.Content showArrow>
                            <Tooltip.Arrow />
                            Son okutmayı geri al
                          </Tooltip.Content>
                        </Tooltip>
                        <Tooltip delay={0} closeDelay={0}>
                          <Button
                            variant="tertiary"
                            isIconOnly
                            size="sm"
                            className="text-danger"
                            onPress={() => {
                              setScannedItems([]);
                              setLastScannedItemId(null);
                            }}
                            aria-label="Okunan listeyi temizle">
                            <Trash2 size={17} />
                          </Button>
                          <Tooltip.Content showArrow>
                            <Tooltip.Arrow />
                            Listeyi temizle
                          </Tooltip.Content>
                        </Tooltip>
                      </div>
                    )}
                  </div>
                  <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                    {scannedItems.map(scannedItem => {
                      const price =
                        scannedItem.item.salePrice ??
                        scannedItem.item.price ??
                        0;
                      return (
                        <div
                          key={scannedItem.item.id}
                          className="flex items-center gap-3 rounded-2xl bg-gray-50 p-3">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-gray-900">
                              {scannedItem.item.name}
                            </p>
                            <p className="mt-0.5 text-xs text-gray-500">
                              {scannedItem.item.barcode || 'Barkod yok'} · ₺
                              {price.toFixed(2)}
                            </p>
                          </div>
                          <div className="flex items-center rounded-xl border border-gray-200 bg-white p-0.5">
                            <Tooltip delay={0} closeDelay={0}>
                              <Button
                                variant="tertiary"
                                isIconOnly
                                size="sm"
                                onPress={() =>
                                  updateScannedItemQuantity(
                                    scannedItem.item.id,
                                    scannedItem.quantity - 1
                                  )
                                }
                                aria-label={`${scannedItem.item.name} adedini azalt`}>
                                <Minus size={16} />
                              </Button>
                              <Tooltip.Content showArrow>
                                <Tooltip.Arrow />
                                Adedi azalt
                              </Tooltip.Content>
                            </Tooltip>
                            <span className="min-w-8 text-center text-sm font-bold text-gray-900">
                              {scannedItem.quantity}
                            </span>
                            <Tooltip delay={0} closeDelay={0}>
                              <Button
                                variant="tertiary"
                                isIconOnly
                                size="sm"
                                onPress={() =>
                                  updateScannedItemQuantity(
                                    scannedItem.item.id,
                                    scannedItem.quantity + 1
                                  )
                                }
                                aria-label={`${scannedItem.item.name} adedini artır`}>
                                <Plus size={16} />
                              </Button>
                              <Tooltip.Content showArrow>
                                <Tooltip.Arrow />
                                Adedi artır
                              </Tooltip.Content>
                            </Tooltip>
                          </div>
                          <Tooltip delay={0} closeDelay={0}>
                            <Button
                              variant="tertiary"
                              isIconOnly
                              size="sm"
                              className="text-danger"
                              onPress={() =>
                                updateScannedItemQuantity(
                                  scannedItem.item.id,
                                  0
                                )
                              }
                              aria-label={`${scannedItem.item.name} ürününü listeden sil`}>
                              <Trash2 size={16} />
                            </Button>
                            <Tooltip.Content showArrow>
                              <Tooltip.Arrow />
                              Ürünü listeden sil
                            </Tooltip.Content>
                          </Tooltip>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Modal.Body>
            <Modal.Footer className="flex justify-end border-t border-gray-100 bg-white pt-4">
              {scanMode === 'multiple' ? (
                <div className="flex w-full items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {scannedUnitCount} adet · ₺{scannedTotal.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Sepete aktarılmaya hazır
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" onPress={onClose}>
                      Vazgeç
                    </Button>
                    <Button
                      variant="primary"
                      isDisabled={scannedItems.length === 0}
                      onPress={handleTransferToCart}>
                      <ShoppingCart size={17} className="mr-2" />
                      Sepete Aktar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="ghost" onPress={onClose}>
                  İptal Et
                </Button>
              )}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default ScannerModal;
