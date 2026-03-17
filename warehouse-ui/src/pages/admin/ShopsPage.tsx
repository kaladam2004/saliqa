import React, { useState } from 'react';
import { Table, Modal, Form, Input, Button, Space, Select, Tag, message, Switch } from 'antd';
import { EditOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getShops, createShop, updateShop, deleteShop } from '../../api/shops';
import { getUsers } from '../../api/users';
import type { Shop, ShopRequest } from '../../types';
import PageHeader from '../../components/common/PageHeader';
import ConfirmDelete from '../../components/common/ConfirmDelete';
import ImageUpload from '../../components/common/ImageUpload';
import { useTranslation } from 'react-i18next';

const imgSrc = (url?: string | null) =>
  !url ? null : url.startsWith('http') ? url : `/api${url}`;

const ShopsPage: React.FC = () => {
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Shop | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { data: shops = [], isLoading } = useQuery({ queryKey: ['shops'], queryFn: getShops });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: getUsers });

  const saveMutation = useMutation({
    mutationFn: (data: ShopRequest) => editing ? updateShop(editing.id, data) : createShop(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shops'] });
      message.success(editing ? t('shops.shop_updated') : t('shops.shop_created'));
      setModal(false); form.resetFields(); setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteShop,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['shops'] }); message.success(t('shops.shop_deleted')); },
  });

  const columns = [
    { title: t('common.id'), dataIndex: 'id', width: 60 },
    {
      title: t('upload.photo'), key: 'image', width: 60,
      render: (_: unknown, r: Shop) => r.image
        ? <img src={imgSrc(r.image)!} alt={r.title} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }} />
        : <span style={{ color: '#bbb', fontSize: 11 }}>—</span>,
    },
    { title: t('common.title'), dataIndex: 'title' },
    { title: t('common.tel'), dataIndex: 'tel' },
    { title: t('shops.shopkeeper'), key: 'shopkeeper', render: (_: unknown, r: Shop) => r.shopkeeper?.fullname || '-' },
    {
      title: t('shops.type'), key: 'type',
      render: (_: unknown, r: Shop) => <Tag color={r.test ? 'orange' : 'green'}>{r.test ? 'TEST' : 'REAL'}</Tag>,
    },
    {
      title: t('common.actions'), key: 'actions', width: 100,
      render: (_: unknown, r: Shop) => (
        <Space>
          <Button icon={<EditOutlined />} size="small" onClick={() => {
            setEditing(r);
            form.setFieldsValue({ ...r, shopkeeperId: r.shopkeeper?.id });
            setModal(true);
          }} />
          <ConfirmDelete onConfirm={() => deleteMutation.mutate(r.id)} />
        </Space>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={t('shops.page_title')} onAdd={() => { setEditing(null); form.resetFields(); setModal(true); }} />
      <Table dataSource={shops} columns={columns} rowKey="id" loading={isLoading} />
      <Modal title={editing ? t('shops.edit_shop') : t('shops.new_shop')} open={modal}
        onCancel={() => { setModal(false); setEditing(null); form.resetFields(); }} footer={null} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={saveMutation.mutate} initialValues={{ test: false }}>
          <Form.Item name="image" label={t('upload.photo')}>
            <ImageUpload />
          </Form.Item>
          <Form.Item name="title" label={t('common.title')} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="tel" label={t('common.phone')}><Input /></Form.Item>
          <Form.Item name="gps" label={t('common.gps')}><Input placeholder="lat,long" /></Form.Item>
          <Form.Item name="shopkeeperId" label={t('shops.assigned_rep')}>
            <Select allowClear placeholder={t('shops.select_user')}>
              {users.map(u => <Select.Option key={u.id} value={u.id}>{u.fullname} ({u.username})</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="test" label={t('shops.test_shop')} valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="description" label={t('common.description')}><Input.TextArea rows={2} /></Form.Item>
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

export default ShopsPage;
