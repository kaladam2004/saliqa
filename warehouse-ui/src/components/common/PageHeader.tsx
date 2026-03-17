import React from 'react';
import { Typography, Space, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

interface PageHeaderProps {
  title: string;
  onAdd?: () => void;
  addLabel?: string;
  extra?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, onAdd, addLabel = 'Add New', extra }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
    <Typography.Title level={4} style={{ margin: 0 }}>{title}</Typography.Title>
    <Space>
      {extra}
      {onAdd && (
        <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
          {addLabel}
        </Button>
      )}
    </Space>
  </div>
);

export default PageHeader;
