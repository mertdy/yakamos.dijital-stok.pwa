import { useEffect, useRef } from 'react';

interface UseGlobalBarcodeScannerProps {
  onScan: (barcode: string) => void;
  // Maximum time between keystrokes to consider it a barcode scan (in milliseconds)
  // Scanners are usually very fast, often < 30ms per character.
  maxTimeBetweenKeystrokes?: number;
}

export const useGlobalBarcodeScanner = ({
  onScan,
  maxTimeBetweenKeystrokes = 50
}: UseGlobalBarcodeScannerProps) => {
  const barcodeBuffer = useRef<string>('');
  const lastKeyTime = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if the user is typing into an input or textarea
      const activeElement = document.activeElement;
      if (
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          (activeElement as HTMLElement).isContentEditable)
      ) {
        return;
      }

      // We only care about single characters and Enter
      if (e.key !== 'Enter' && e.key.length !== 1) {
        return;
      }

      const currentTime = performance.now();

      if (e.key === 'Enter') {
        // If Enter is pressed and we have a buffer, trigger the scan
        if (barcodeBuffer.current.length > 0) {
          // If the last key was pressed recently enough, it's a valid scan
          if (currentTime - lastKeyTime.current <= maxTimeBetweenKeystrokes) {
            onScan(barcodeBuffer.current);
            e.preventDefault(); // Prevent any default enter behavior
          }
        }
        // Always clear buffer on Enter
        barcodeBuffer.current = '';
        return;
      }

      // If too much time has passed since the last keypress, reset the buffer.
      // This ensures manual typing doesn't get captured as a barcode if it's slow.
      if (currentTime - lastKeyTime.current > maxTimeBetweenKeystrokes) {
        barcodeBuffer.current = '';
      }

      barcodeBuffer.current += e.key;
      lastKeyTime.current = currentTime;
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onScan, maxTimeBetweenKeystrokes]);
};
