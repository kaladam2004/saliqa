import React from 'react';
import { Popconfirm, Button } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

interface ConfirmDeleteProps {
  onConfirm: () => void;
  loading?: boolean;
}

const ConfirmDelete: React.FC<ConfirmDeleteProps> = ({ onConfirm, loading }) => {
  const { t } = useTranslation();
  return (
    <Popconfirm
      title={t('confirm_delete.title')}
      onConfirm={onConfirm}
      okText={t('confirm_delete.ok')}
      cancelText={t('confirm_delete.cancel')}
    >
      <Button danger icon={<DeleteOutlined />} loading={loading} size="small" />
    </Popconfirm>
  );
};

export default ConfirmDelete;
