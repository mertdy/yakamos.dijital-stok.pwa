import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { getBarcodeFormat } from '../domain/labelPrinting';

interface BarcodeSvgProps {
  value: string;
  compact?: boolean;
}

export const BarcodeSvg = ({ value, compact = false }: BarcodeSvgProps) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;

    JsBarcode(svgRef.current, value, {
      format: getBarcodeFormat(value),
      displayValue: !compact,
      fontSize: compact ? 0 : 9,
      height: compact ? 28 : 36,
      margin: 0,
      width: compact ? 1 : 1.25,
      lineColor: '#111827'
    });
  }, [compact, value]);

  return <svg ref={svgRef} aria-label={`Barkod: ${value}`} role="img" />;
};
