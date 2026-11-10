import { useMemo } from "react";
import { encode } from "uqr";

/** QR code as an SVG: dark modules on white, so phone cameras read it in both themes. */
export default function QrCode({ value, label, scale = 6 }: { value: string; label: string; scale?: number }) {
  const { size, path } = useMemo(() => {
    const qr = encode(value, { ecc: "M", border: 2 });
    let d = "";
    qr.data.forEach((row, y) => row.forEach((dark, x) => { if (dark) d += `M${x} ${y}h1v1h-1z`; }));
    return { size: qr.size, path: d };
  }, [value]);
  return (
    <svg
      className="self-start overflow-hidden rounded-lg leading-none"
      role="img"
      aria-label={label}
      width={size * scale}
      height={size * scale}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
    >
      <rect width={size} height={size} fill="#FFFFFF" />
      <path d={path} fill="#121318" />
    </svg>
  );
}
