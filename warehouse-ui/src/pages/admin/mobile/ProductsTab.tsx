import React, { useState } from 'react';
import { Input, Modal, Form, Button, message, Tag, Spin, InputNumber } from 'antd';
import {
  SearchOutlined, EditOutlined, DeleteOutlined,
  AppstoreOutlined, DollarOutlined, PlusOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProducts, updateProduct, deleteProduct, createProducts } from '../../../api/products';
import type { Product, ProductRequest } from '../../../types';
import { formatCurrency } from '../../../utils/helpers';
import { useTranslation } from 'react-i18next';
import ImageUpload from '../../../components/common/ImageUpload';

const imgSrc = (url?: string | null) =>
  !url ? null : url.startsWith('http') ? url : `/api${url}`;

const ProductsTab: React.FC = () => {
  const [search, setSearch] = useState('');
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [createForm] = Form.useForm();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { data: products = [], isLoading } = useQuery({ queryKey: ['products'], queryFn: getProducts });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProductRequest }) => updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      message.success(t('products.product_updated') || 'Маҳсулот навсозӣ шуд');
      setEditProduct(null);
      form.resetFields();
    },
    onError: () => message.error(t('common.error')),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      message.success(t('products.product_deleted') || 'Маҳсулот нест шуд');
    },
    onError: () => message.error(t('common.error')),
  });

  const createMutation = useMutation({
    mutationFn: (rows: ProductRequest[]) => createProducts(rows),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      message.success(t('products.product_created') || 'Маҳсулот сохта шуд');
      setCreateModalOpen(false);
      createForm.resetFields();
    },
    onError: () => message.error(t('common.error')),
  });

  const filtered = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (p: Product) => {
    setEditProduct(p);
    form.setFieldsValue({ name: p.name, price: p.price, description: p.description });
  };

  const confirmDelete = (p: Product) => {
    Modal.confirm({
      title: `"${p.name}" нест карда шавад?`,
      okText: 'Ҳа, нест кун',
      cancelText: 'Не',
      okButtonProps: { danger: true },
      onOk: () => deleteMutation.mutate(p.id),
    });
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Search bar */}
      <div style={{ padding: '12px 12px 8px', flexShrink: 0 }}>
        <Input
          prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
          placeholder={t('common.search') || 'Ҷустуҷӯ...'}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ borderRadius: 12, background: '#fff', border: '1px solid #e8ecf4' }}
          allowClear
        />
        <div style={{ marginTop: 6, fontSize: 12, color: '#9ca3af' }}>
          {filtered.length} маҳсулот
        </div>
      </div>

      {/* Product list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px 80px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(p => {
            const isLow = p.quantity < 10;
            return (
              <div key={p.id} style={{
                background: '#fff', borderRadius: 14, padding: 12,
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                display: 'flex', gap: 12, alignItems: 'center',
              }}>
                {/* Image */}
                <div style={{
                  width: 52, height: 52, borderRadius: 12, flexShrink: 0,
                  background: imgSrc(p.image) ? undefined : '#e8f4ff',
                  overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {imgSrc(p.image)
                    ? <img src={imgSrc(p.image)!} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <AppstoreOutlined style={{ fontSize: 22, color: '#1677ff' }} />
                  }
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e', marginBottom: 2 }}>{p.name}</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, color: '#1677ff', fontWeight: 600 }}>
                      <DollarOutlined style={{ fontSize: 11 }} /> {formatCurrency(p.price)}
                    </span>
                    <Tag
                      color={p.quantity === 0 ? 'red' : isLow ? 'orange' : 'green'}
                      style={{ margin: 0, fontSize: 11 }}
                    >
                      {t('common.units_short', { count: p.quantity })}
                    </Tag>
                  </div>
                </div>
                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => openEdit(p)}
                    style={{
                      width: 32, height: 32, borderRadius: 8, border: 'none',
                      background: '#e8f4ff', color: '#1677ff', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <EditOutlined style={{ fontSize: 14 }} />
                  </button>
                  <button
                    onClick={() => confirmDelete(p)}
                    style={{
                      width: 32, height: 32, borderRadius: 8, border: 'none',
                      background: '#fff1f0', color: '#f5222d', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <DeleteOutlined style={{ fontSize: 14 }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FAB - create product */}
      <button
        onClick={() => setCreateModalOpen(true)}
        style={{
          position: 'fixed', bottom: 76, right: 20, width: 52, height: 52,
          borderRadius: 16, border: 'none',
          background: 'linear-gradient(135deg, #1677ff, #0958d9)',
          color: '#fff', fontSize: 24, cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(22,119,255,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 100,
        }}
      >
        <PlusOutlined />
      </button>

      {/* Edit Modal */}
      <Modal
        title={`✏️ ${editProduct?.name}`}
        open={!!editProduct}
        onCancel={() => { setEditProduct(null); form.resetFields(); }}
        footer={null}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={vals => updateMutation.mutate({ id: editProduct!.id, data: vals })}>
          <Form.Item name="name" label={t('common.name')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="price" label={t('common.price')} rules={[{ required: true }]}>
            <InputNumber style={{ width: '100%' }} min={0} />
          </Form.Item>
          <Form.Item name="description" label={t('common.description')}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={updateMutation.isPending} block>
              {t('common.update')}
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Modal — batch */}
      <Modal
        title={t('products.create_product') || 'Маҳсулот сохтан'}
        open={createModalOpen}
        onCancel={() => { setCreateModalOpen(false); createForm.resetFields(); }}
        footer={null}
        destroyOnHidden
        styles={{ body: { maxHeight: '75vh', overflowY: 'auto' } }}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={vals => createMutation.mutate(vals.rows)}
          initialValues={{ rows: [{}] }}
        >
          <Form.List name="rows">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field, index) => (
                  <div key={field.key} style={{
                    background: '#f5f7ff', borderRadius: 12, padding: 12,
                    marginBottom: 10, border: '1px solid #e8ecf4',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, color: '#1677ff', fontSize: 13 }}>
                        {t('common.product')} {index + 1}
                      </span>
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(field.name)}
                          style={{ border: 'none', background: 'none', color: '#f5222d', cursor: 'pointer', fontSize: 16 }}
                        >
                          <DeleteOutlined />
                        </button>
                      )}
                    </div>
                    <Form.Item name={[field.name, 'name']} label={t('common.name')} rules={[{ required: true, message: t('common.required') }]} style={{ marginBottom: 8 }}>
                      <Input placeholder={t('products.product_name')} />
                    </Form.Item>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Form.Item name={[field.name, 'price']} label={t('common.price')} rules={[{ required: true, message: 'Нарх лозим аст' }]} style={{ flex: 1, marginBottom: 8 }}>
                        <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
                      </Form.Item>
                      <Form.Item name={[field.name, 'initialQuantity']} label={t('products.initial_quantity') || 'Миқдор'} style={{ flex: 1, marginBottom: 8 }}>
                        <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
                      </Form.Item>
                    </div>
                    <Form.Item name={[field.name, 'expireDate']} label={t('products.expire_date') || 'Мӯҳлати нигоҳдорӣ'} style={{ marginBottom: 8 }}>
                      <Input type="date" />
                    </Form.Item>
                    <Form.Item name={[field.name, 'description']} label={t('common.description')} style={{ marginBottom: 8 }}>
                      <Input.TextArea rows={2} placeholder="Тавсиф (ихтиёрӣ)" />
                    </Form.Item>
                    <Form.Item name={[field.name, 'image']} label={t('common.image') || 'Сурат'} style={{ marginBottom: 0 }}>
                      <ImageUpload />
                    </Form.Item>
                  </div>
                ))}
                <Button
                  type="dashed" block icon={<PlusOutlined />}
                  onClick={() => add()} style={{ marginBottom: 12, borderRadius: 10 }}
                >
                  {t('products.add_row') || 'Маҳсулот илова кун'}
                </Button>
              </>
            )}
          </Form.List>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending} block>
              {t('common.create')}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProductsTab;
