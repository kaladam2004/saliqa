import React, { useState } from 'react';
import {
  Table, Modal, Form, Input, Button, Space, Tag, message,
  Descriptions, Drawer, InputNumber, Divider,
} from 'antd';
import {
  EditOutlined, EnvironmentOutlined, EyeOutlined, PlusCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWarehouses, createWarehouse, updateWarehouse, deleteWarehouse } from '../../api/warehouses';
import { addQuantity } from '../../api/products';
import { useAuthStore } from '../../store/authStore';
import type { Warehouse, WarehouseRequest, Product } from '../../types';
import PageHeader from '../../components/common/PageHeader';
import ConfirmDelete from '../../components/common/ConfirmDelete';
import { formatCurrency } from '../../utils/helpers';
import { useTranslation } from 'react-i18next';

const openMap = (gps?: string | null) => {
  if (gps) window.open(`https://www.google.com/maps?q=${gps}`, '_blank', 'noopener,noreferrer');
};

const imgSrc = (url?: string | null) =>
  !url ? null : url.startsWith('http') ? url : `/api${url}`;

const WarehousesPage: React.FC = () => {
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);
  const [detailWarehouse, setDetailWarehouse] = useState<Warehouse | null>(null);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [form] = Form.useForm();
  const [qtyForm] = Form.useForm();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { user: auth } = useAuthStore();

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

  const qtyMutation = useMutation({
    mutationFn: (data: { quantity: number; notes?: string }) =>
      addQuantity(stockProduct!.id, data.quantity, auth?.id, data.notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      message.success(t('products.quantity_updated'));
      setStockProduct(null);
      qtyForm.resetFields();
      // refresh detail view
      if (detailWarehouse) {
        const updated = warehouses.find(w => w.id === detailWarehouse.id);
        if (updated) setDetailWarehouse({ ...updated });
      }
    },
  });

  const openEdit = (record: Warehouse) => {
    setEditing(record);
    form.setFieldsValue(record);
    setModal(true);
  };

  // refresh detail after stock add
  const currentDetail = detailWarehouse
    ? warehouses.find(w => w.id === detailWarehouse.id) ?? detailWarehouse
    : null;

  const columns = [
    { title: t('common.id'), dataIndex: 'id', width: 60 },
    { title: t('common.title'), dataIndex: 'title', key: 'title' },
    { title: t('warehouses.responsible_person'), dataIndex: 'responsiblePerson', key: 'responsiblePerson' },
    { title: t('common.tel'), dataIndex: 'tel', key: 'tel' },
    {
      title: t('common.gps'), key: 'gps',
      render: (_: unknown, r: Warehouse) => r.gps
        ? <Button size="small" icon={<EnvironmentOutlined />} onClick={() => openMap(r.gps)}>{r.gps}</Button>
        : '—',
    },
    {
      title: t('menu.products'), key: 'products',
      render: (_: unknown, r: Warehouse) => (
        <Tag color="blue">{t('common.products_count', { count: r.products?.length ?? 0 })}</Tag>
      ),
    },
    {
      title: t('common.actions'), key: 'actions', width: 130,
      render: (_: unknown, record: Warehouse) => (
        <Space>
          <Button
            icon={<EyeOutlined />} size="small"
            onClick={() => setDetailWarehouse(record)}
          />
          <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(record)} />
          <ConfirmDelete onConfirm={() => deleteMutation.mutate(record.id)} />
        </Space>
      ),
    },
  ];

  const productColumns = [
    {
      title: t('upload.photo'), key: 'image', width: 52,
      render: (_: unknown, p: Product) => p.image
        ? <img src={imgSrc(p.image)!} alt={p.name} style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 4 }} />
        : <span style={{ color: '#bbb' }}>—</span>,
    },
    { title: t('common.name'), dataIndex: 'name', key: 'name' },
    {
      title: t('common.price'), dataIndex: 'price', key: 'price',
      render: (v: number) => formatCurrency(v),
    },
    {
      title: t('common.qty'), dataIndex: 'quantity', key: 'quantity',
      render: (v: number) => (
        <Tag color={v === 0 ? 'red' : v < 10 ? 'orange' : 'green'}>{v}</Tag>
      ),
    },
    {
      title: t('common.actions'), key: 'actions', width: 80,
      render: (_: unknown, p: Product) => (
        <Button
          icon={<PlusCircleOutlined />} size="small" type="dashed"
          title={t('products.add_quantity')}
          onClick={() => { setStockProduct(p); qtyForm.resetFields(); }}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t('warehouses.page_title')}
        onAdd={() => { setEditing(null); form.resetFields(); setModal(true); }}
      />
      <Table dataSource={warehouses} columns={columns} rowKey="id" loading={isLoading} />

      {/* Warehouse Create/Edit Modal */}
      <Modal
        title={editing ? t('warehouses.edit_warehouse') : t('warehouses.new_warehouse')}
        open={modal}
        onCancel={() => { setModal(false); setEditing(null); form.resetFields(); }}
        footer={null}
        destroyOnHidden
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

      {/* Warehouse Detail Drawer */}
      <Drawer
        title={currentDetail?.title ?? ''}
        open={!!currentDetail}
        onClose={() => setDetailWarehouse(null)}
        width={680}
      >
        {currentDetail && (
          <>
            {/* Info section */}
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label={t('common.title')} span={2}>
                {currentDetail.title}
              </Descriptions.Item>
              {currentDetail.description && (
                <Descriptions.Item label={t('common.description')} span={2}>
                  {currentDetail.description}
                </Descriptions.Item>
              )}
              <Descriptions.Item label={t('warehouses.responsible_person')}>
                {currentDetail.responsiblePerson || '—'}
              </Descriptions.Item>
              <Descriptions.Item label={t('common.tel')}>
                {currentDetail.tel || '—'}
              </Descriptions.Item>
              {currentDetail.gps && (
                <Descriptions.Item label={t('common.gps')} span={2}>
                  <Space>
                    <span style={{ fontFamily: 'monospace' }}>{currentDetail.gps}</span>
                    <Button size="small" icon={<EnvironmentOutlined />} onClick={() => openMap(currentDetail.gps)}>
                      {t('profile.open_map')}
                    </Button>
                  </Space>
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider orientation="left">
              {t('menu.products')} ({currentDetail.products?.length ?? 0})
            </Divider>

            {/* Products in this warehouse */}
            <Table
              dataSource={currentDetail.products ?? []}
              columns={productColumns}
              rowKey="id"
              size="small"
              pagination={false}
              locale={{ emptyText: t('dashboard.no_data') }}
              summary={data => {
                if (!data.length) return null;
                const totalQty = data.reduce((s, p) => s + (p.quantity ?? 0), 0);
                const totalValue = data.reduce((s, p) => s + (p.quantity ?? 0) * Number(p.price ?? 0), 0);
                return (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={2}>
                      <strong>{t('common.total')}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={1}>
                      <strong>{formatCurrency(totalValue)}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={2}>
                      <Tag color="blue"><strong>{totalQty}</strong></Tag>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={3} />
                  </Table.Summary.Row>
                );
              }}
            />
          </>
        )}
      </Drawer>

      {/* Add Stock Modal */}
      <Modal
        title={`${t('products.add_quantity')} — ${stockProduct?.name}`}
        open={!!stockProduct}
        onCancel={() => { setStockProduct(null); qtyForm.resetFields(); }}
        footer={null}
        destroyOnHidden
      >
        <Form form={qtyForm} layout="vertical" onFinish={qtyMutation.mutate}>
          <div style={{ marginBottom: 12, padding: '10px 14px', background: '#f5f7ff', borderRadius: 8 }}>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>{t('common.qty')}: </span>
            <Tag color={stockProduct && stockProduct.quantity > 0 ? 'green' : 'red'}>
              {stockProduct?.quantity ?? 0}
            </Tag>
            <span style={{ marginLeft: 8, fontSize: 12, color: '#9ca3af' }}>
              {formatCurrency(stockProduct?.price ?? 0)}
            </span>
          </div>
          <Form.Item name="quantity" label={t('products.quantity_to_add')} rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label={t('common.notes')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={qtyMutation.isPending} block>
              {t('products.add_quantity')}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default WarehousesPage;
