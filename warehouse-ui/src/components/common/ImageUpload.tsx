import React, { useRef, useState } from 'react';
import { Button, Space, Spin, Tooltip, Typography, message } from 'antd';
import { CameraOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import { uploadFile } from '../../api/uploads';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

interface Props {
  value?: string;
  onChange?: (url: string | undefined) => void;
  size?: number;        // preview size in px, default 80
  hidePreview?: boolean; // suppress the built-in preview (use when parent shows its own)
}

/**
 * A Form.Item-compatible image upload widget.
 * - Click "Upload" to pick a file from disk.
 * - Click camera icon to capture via device camera.
 * - Shows a small preview of the current image.
 * - Calls onChange with the server URL after a successful upload.
 */
const ImageUpload: React.FC<Props> = ({ value, onChange, size = 80, hidePreview = false }) => {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (file: File | null | undefined) => {
    if (!file) return;
    setLoading(true);
    try {
      const url = await uploadFile(file);
      onChange?.(url);
    } catch {
      message.error(t('upload.upload_failed'));
    } finally {
      setLoading(false);
    }
  };

  const preview = value
    ? value.startsWith('http') ? value : `/api${value}`
    : null;

  return (
    <Space direction="vertical" size={4}>
      {/* Hidden file inputs */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files?.[0])}
        onClick={e => ((e.target as HTMLInputElement).value = '')}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files?.[0])}
        onClick={e => ((e.target as HTMLInputElement).value = '')}
      />

      {/* Preview */}
      {preview && !hidePreview && (
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <img
            src={preview}
            alt="preview"
            style={{
              width: size,
              height: size,
              objectFit: 'cover',
              borderRadius: 6,
              border: '1px solid #d9d9d9',
              display: 'block',
            }}
          />
          <Tooltip title={t('common.remove')}>
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              style={{ position: 'absolute', top: -8, right: -8, padding: '0 4px', minWidth: 0 }}
              onClick={() => onChange?.(undefined)}
            />
          </Tooltip>
        </div>
      )}

      {/* Buttons */}
      <Spin spinning={loading} size="small">
        <Space size={4}>
          <Button
            size="small"
            icon={<UploadOutlined />}
            onClick={() => fileRef.current?.click()}
            disabled={loading}
          >
            {t('upload.upload_photo')}
          </Button>
          <Tooltip title={t('upload.take_photo')}>
            <Button
              size="small"
              icon={<CameraOutlined />}
              onClick={() => cameraRef.current?.click()}
              disabled={loading}
            />
          </Tooltip>
        </Space>
      </Spin>

      {!value && (
        <Text type="secondary" style={{ fontSize: 11 }}>{t('upload.optional')}</Text>
      )}
    </Space>
  );
};

export default ImageUpload;
