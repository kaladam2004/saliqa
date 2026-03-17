import React, { useEffect, useRef, useState } from 'react';
import { Modal, Alert, Button, Space, Typography, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import { Html5Qrcode } from 'html5-qrcode';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

interface ParsedQr {
  t: string;
  id: number;
  si?: number;  // shopId (inv)
  wi?: number;  // warehouseId (uinv)
  ui: number;   // userId
  tot: string;  // total as string
}

export interface QRVerifyTarget {
  type: 'inv' | 'uinv';
  id: number;
  shopId?: number;
  warehouseId?: number;
  userId: number;
  total: number;
}

interface Props {
  open: boolean;
  target: QRVerifyTarget | null;
  onVerified: () => void;
  onClose: () => void;
}

const SCANNER_DIV_ID = 'qr-scanner-container';

const QRScannerModal: React.FC<Props> = ({ open, target, onVerified, onClose }) => {
  const { t } = useTranslation();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [status, setStatus] = useState<'idle' | 'match' | 'mismatch' | 'invalid'>('idle');
  const [scanning, setScanning] = useState(false);
  const [cameraFailed, setCameraFailed] = useState(false);

  const verify = (decodedText: string) => {
    if (!target) return;
    try {
      const parsed: ParsedQr = JSON.parse(decodedText);
      const typeMatch = parsed.t === target.type;
      const idMatch = parsed.id === target.id;
      const userMatch = parsed.ui === target.userId;
      const totMatch = Math.abs(parseFloat(parsed.tot) - target.total) < 0.01;
      const contextMatch = target.type === 'inv'
        ? parsed.si === target.shopId
        : parsed.wi === target.warehouseId;

      setStatus(typeMatch && idMatch && userMatch && totMatch && contextMatch ? 'match' : 'mismatch');
    } catch (_) {
      setStatus('invalid');
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (_) { /* already stopped */ }
      setScanning(false);
    }
  };

  const startScanner = async () => {
    if (!target) return;
    setStatus('idle');
    setCameraFailed(false);
    try {
      const scanner = new Html5Qrcode(SCANNER_DIV_ID);
      scannerRef.current = scanner;
      setScanning(true);
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          verify(decodedText);
          stopScanner();
        },
        undefined
      );
    } catch (_) {
      setScanning(false);
      setCameraFailed(true);
    }
  };

  const handleFileUpload = async (file: File) => {
    setStatus('idle');
    try {
      const scanner = new Html5Qrcode('qr-file-scanner');
      const decodedText = await scanner.scanFile(file, false);
      verify(decodedText);
    } catch (_) {
      setStatus('invalid');
    }
    return false; // prevent antd Upload from auto-uploading
  };

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => startScanner(), 400);
      return () => clearTimeout(timer);
    } else {
      stopScanner();
      setStatus('idle');
      setCameraFailed(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleConfirm = () => {
    onVerified();
    onClose();
  };

  const handleClose = () => {
    stopScanner();
    setStatus('idle');
    setCameraFailed(false);
    onClose();
  };

  const handleRetry = () => {
    setStatus('idle');
    if (cameraFailed) {
      setCameraFailed(false);
    } else {
      startScanner();
    }
  };

  return (
    <Modal
      open={open}
      title={t('invoices.scan_to_verify')}
      onCancel={handleClose}
      footer={
        <Space>
          <Button onClick={handleClose}>{t('common.close')}</Button>
          {status === 'match' && (
            <Button type="primary" onClick={handleConfirm}>
              {t('common.confirm')}
            </Button>
          )}
          {(status === 'mismatch' || status === 'invalid') && (
            <Button onClick={handleRetry}>{t('common.retry')}</Button>
          )}
        </Space>
      }
      destroyOnHidden
    >
      {/* Hidden div required by Html5Qrcode for file scanning */}
      <div id="qr-file-scanner" style={{ display: 'none' }} />

      {!cameraFailed ? (
        <div id={SCANNER_DIV_ID} style={{ width: '100%', minHeight: 300 }} />
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            {t('invoices.camera_unavailable')}
          </Text>
          <Upload
            accept="image/*"
            showUploadList={false}
            beforeUpload={handleFileUpload}
          >
            <Button icon={<UploadOutlined />}>{t('invoices.upload_qr_image')}</Button>
          </Upload>
        </div>
      )}

      {status === 'idle' && scanning && (
        <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 8 }}>
          {t('invoices.scan_to_verify')}
        </Text>
      )}
      {status === 'match' && (
        <Alert type="success" message={t('invoices.qr_match')} showIcon style={{ marginTop: 12 }} />
      )}
      {status === 'mismatch' && (
        <Alert type="error" message={t('invoices.qr_mismatch')} showIcon style={{ marginTop: 12 }} />
      )}
      {status === 'invalid' && (
        <Alert type="warning" message={t('invoices.qr_invalid')} showIcon style={{ marginTop: 12 }} />
      )}
    </Modal>
  );
};

export default QRScannerModal;
