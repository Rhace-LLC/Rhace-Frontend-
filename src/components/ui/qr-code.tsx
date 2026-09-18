import QRCode from 'react-qr-code';

interface QrCodeProps {
  value: string;
  size?: number;
  className?: string;
  label?: string;
}

/** Client-side QR render (uses the already-installed `react-qr-code`). */
export function QrCode({ value, size = 160, className, label }: QrCodeProps) {
  return (
    <div className={`inline-flex flex-col items-center gap-2 ${className ?? ''}`}>
      <div className="rounded-lg bg-white p-2 shadow-sm">
        <QRCode value={value} size={size} />
      </div>
      {label && <span className="text-[11px] text-gray-500">{label}</span>}
    </div>
  );
}

export default QrCode;
