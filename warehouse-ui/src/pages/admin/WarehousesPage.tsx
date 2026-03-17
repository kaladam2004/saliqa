import React, { useState } from 'react';
import { Table, Modal, Form, Input, Button, Space, Tag, message } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWarehouses, createWarehouse, updateWarehouse, deleteWarehouse } from '../../api/warehouses';
import type { Warehouse, WarehouseRequest } from '../../types';
import PageHeader from '../../components/common/PageHeader';
import ConfirmDelete from '../../components/common/ConfirmDelete';
import { useTranslation } from 'react-i18next';

const WarehousesPage: React.FC = () => {
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { data: warehouses = [], isLoading } = useQuery({ queryKey: ['warehouses'], queryFn: getWarehouses });

  const saveMutation = useMutation({
    mutationFn: (data: WarehouseRequest) =>
      editing ? updateWarehouse(editing.id, data) : createWarehouse(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      message.success(editing ? t('warehouses.warehouse_updated') : t('warehouses.warehouse_created'));
      setModal(false);
      form.resetFields();
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWarehouse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      message.success(t('warehouses.warehouse_deleted'));
    },
  });

  const openEdit = (record: Warehouse) => {
    setEditing(record);
    form.setFieldsValue(record);
    setModal(true);
  };

  const columns = [
    { title: t('common.id'), dataIndex: 'id', width: 60 },
    { title: t('common.title'), dataIndex: 'title', key: 'title' },
    { title: t('warehouses.responsible_person'), dataIndex: 'responsiblePerson', key: 'responsiblePerson' },
    { title: t('common.tel'), dataIndex: 'tel', key: 'tel' },
    { title: t('common.gps'), dataIndex: 'gps', key: 'gps' },
    {
      title: t('menu.products'),
      key: 'products',
      render: (_: unknown, r: Warehouse) => <Tag color="blue">{t('common.products_count', { count: r.products?.length ?? 0 })}</Tag>,
    },
    {
      title: t('common.actions'),
      key: 'actions',
      width: 100,
      render: (_: unknown, record: Warehouse) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(record)} />
          <ConfirmDelete onConfirm={() => deleteMutation.mutate(record.id)} />
        </Space>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={t('warehouses.page_title')} onAdd={() => { setEditing(null); form.resetFields(); setModal(true); }} />
      <Table dataSource={warehouses} columns={columns} rowKey="id" loading={isLoading} />

      <Modal
        title={editing ? t('warehouses.edit_warehouse') : t('warehouses.new_warehouse')}
        open={modal}
        onCancel={() => { setModal(false); setEditing(null); form.resetFields(); }}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={saveMutation.mutate}>
          <Form.Item name="title" label={t('common.title')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label={t('common.description')}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="responsiblePerson" label={t('warehouses.responsible_person')}>
            <Input />
          </Form.Item>
          <Form.Item name="tel" label={t('common.phone')}>
            <Input />
          </Form.Item>
          <Form.Item name="gps" label={t('warehouses.gps_coords')}>
            <Input placeholder="lat,long" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={saveMutation.isPending} block>
              {editing ? t('common.update') : t('common.create')}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default WarehousesPage;
