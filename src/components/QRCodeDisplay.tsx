import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Download, QrCode } from 'lucide-react';

interface QRCodeDisplayProps {
  value: string;
  title?: string;
  description?: string;
  size?: number;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  value,
  title = "QR Code",
  description,
  size = 200
}) => {
  const handleDownload = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = size;
    canvas.height = size;

    img.onload = () => {
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      
      const downloadLink = document.createElement('a');
      downloadLink.download = 'session-qr-code.png';
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(value);
      alert('URL copied to clipboard!');
    } catch (err) {
      alert('Failed to copy URL. Please try again.');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="w-5 h-5" />
          {title}
        </CardTitle>
        {description && (
          <p className="text-sm text-gray-600">{description}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center">
          <div className="p-4 bg-white rounded-lg border">
            <QRCodeSVG
              id="qr-code-svg"
              value={value}
              size={size}
              level="M"
              includeMargin={true}
            />
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            onClick={handleCopyUrl}
            className="w-full"
          >
            <Copy className="w-4 h-4 mr-2" />
            Copy URL
          </Button>
          <Button
            variant="outline"
            onClick={handleDownload}
            className="w-full"
          >
            <Download className="w-4 h-4 mr-2" />
            Download QR Code
          </Button>
        </div>
        
        <div className="text-xs text-gray-500 break-words text-center">
          {value}
        </div>
      </CardContent>
    </Card>
  );
};

export default QRCodeDisplay;