import React, { useState } from 'react';
import { Table, Modal, Form, Input, Button, Space, InputNumber, DatePicker, message, Tag } from 'antd';
import { EditOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProducts, createProducts, updateProduct, deleteProduct, addQuantity } from '../../api/products';
import type { Product, ProductRequest } from '../../types';
import PageHeader from '../../components/common/PageHeader';
import ConfirmDelete from '../../components/common/ConfirmDelete';
import ImageUpload from '../../components/common/ImageUpload';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';

const ProductsPage: React.FC = () => {
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [qtyModal, setQtyModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [qtyForm] = Form.useForm();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { data: products = [], isLoading } = useQuery({ queryKey: ['products'], queryFn: getProducts });

  const createMutation = useMutation({
    mutationFn: (data: { products: ProductRequest[] }) => createProducts(data.products),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      message.success(t('products.products_created'));
      setCreateModal(false); form.resetFields();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: ProductRequest) => updateProduct(editing!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      message.success(t('products.product_updated'));
      setEditModal(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); message.success(t('products.product_deleted')); },
  });

  const qtyMutation = useMutation({
    mutationFn: (data: { quantity: number; notes: string }) =>
      addQuantity(editing!.id, data.quantity, undefined, data.notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      message.success(t('products.quantity_updated'));
      setQtyModal(false); qtyForm.resetFields();
    },
  });

  const handleCreateSubmit = (values: { products: ProductRequest[] }) => {
    const prods = values.products.map((p: ProductRequest & { manufactureDateObj?: unknown; expireDateObj?: unknown }) => ({
      ...p,
      manufactureDate: p.manufactureDate ? dayjs(p.manufactureDate as string).format('YYYY-MM-DD') : undefined,
      expireDate: p.expireDate ? dayjs(p.expireDate as string).format('YYYY-MM-DD') : undefined,
    }));
    createMutation.mutate({ products: prods });
  };

  const imgSrc = (url?: string | null) =>
    !url ? null : url.startsWith('http') ? url : `/api${url}`;

  const columns = [
    { title: t('common.id'), dataIndex: 'id', width: 60 },
    {
      title: t('upload.photo'), key: 'image', width: 60,
      render: (_: unknown, r: Product) => r.image
        ? <img src={imgSrc(r.image)!} alt={r.name} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
        : <span style={{ color: '#bbb', fontSize: 11 }}>—</span>,
    },
    { title: t('common.name'), dataIndex: 'name' },
    { title: t('common.price'), dataIndex: 'price', render: (v: number) => `${v.toLocaleString()}` },
    { title: t('common.qty'), dataIndex: 'quantity', render: (v: number) => <Tag color={v > 0 ? 'green' : 'red'}>{v}</Tag> },
    { title: t('products.batches'), dataIndex: 'batches', render: (b: unknown[]) => b?.length ?? 0 },
    {
      title: t('common.actions'), key: 'actions', width: 130,
      render: (_: unknown, r: Product) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => { setEditing(r); editForm.setFieldsValue(r); setEditModal(true); }} />
          <Button icon={<PlusCircleOutlined />} size="small" type="dashed" onClick={() => { setEditing(r); setQtyModal(true); }} title={t('products.add_quantity')} />
          <ConfirmDelete onConfirm={() => deleteMutation.mutate(r.id)} />
        </Space>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={t('products.page_title')} onAdd={() => { form.resetFields(); setCreateModal(true); }} addLabel={t('products.create_products')} />
      <Table dataSource={products} columns={columns} rowKey="id" loading={isLoading} />

      {/* Create Multiple Products Modal */}
      <Modal title={t('products.create_products')} open={createModal} onCancel={() => setCreateModal(false)} footer={null} width={700}>
        <Form form={form} layout="vertical" onFinish={handleCreateSubmit}>
          <Form.List name="products" initialValue={[{}]}>
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8, flexWrap: 'wrap' }} align="baseline">
                    <Form.Item {...restField} name={[name, 'name']} rules={[{ required: true }]}>
                      <Input placeholder={t('products.product_name')} style={{ width: 160 }} />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'price']} rules={[{ required: true }]}>
                      <InputNumber placeholder={t('common.price')} style={{ width: 100 }} />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'initialQuantity']}>
                      <InputNumber placeholder={t('products.initial_qty')} style={{ width: 100 }} />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'expireDate']}>
                      <DatePicker placeholder={t('products.expire_date')} style={{ width: 140 }} />
                    </Form.Item>
                    <Button danger onClick={() => remove(name)} size="small">-</Button>
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} block>{t('products.add_row')}</Button>
              </>
            )}
          </Form.List>
          <Form.Item style={{ marginTop: 16 }}>
            <Button type="primary" htmlType="submit" loading={createMutation.isPending} block>{t('products.create_all')}</Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Product Modal */}
      <Modal title={t('products.edit_product')} open={editModal} onCancel={() => setEditModal(false)} footer={null} destroyOnHidden>
        <Form form={editForm} layout="vertical" onFinish={updateMutation.mutate}>
          <Form.Item name="name" label={t('common.name')} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="price" label={t('common.price')} rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="description" label={t('common.description')}><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="image" label={t('upload.photo')}>
            <ImageUpload />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={updateMutation.isPending} block>{t('common.update')}</Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Quantity Modal */}
      <Modal title={t('products.add_qty_title', { name: editing?.name })} open={qtyModal} onCancel={() => setQtyModal(false)} footer={null}>
        <Form form={qtyForm} layout="vertical" onFinish={qtyMutation.mutate}>
          <Form.Item name="quantity" label={t('products.quantity_to_add')} rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label={t('common.notes')}><Input.TextArea rows={2} /></Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={qtyMutation.isPending} block>{t('products.add_quantity')}</Button>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default ProductsPage;
