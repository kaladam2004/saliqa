import React, { useState } from 'react';
import {
  Table, Button, Modal, Form, Input, DatePicker, Select,
  Space, Tag, Popconfirm, message, Typography, Card,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, InboxOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import {
  getBatches, createBatch, updateBatch, deleteBatch,
  type Batch, type BatchRequest,
} from '../../api/batches';
import { getProducts } from '../../api/products';

const { Title } = Typography;

const BatchesPage: React.FC = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Batch | null>(null);
  const [search, setSearch] = useState('');

  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['batches'],
    queryFn: getBatches,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  const createMut = useMutation({
    mutationFn: createBatch,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['batches'] });
      message.success(t('common.created'));
      closeModal();
    },
    onError: () => message.error(t('common.error')),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: BatchRequest }) => updateBatch(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['batches'] });
      message.success(t('common.updated'));
      closeModal();
    },
    onError: () => message.error(t('common.error')),
  });

  const deleteMut = useMutation({
    mutationFn: deleteBatch,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['batches'] });
      message.success(t('common.deleted'));
    },
  });

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (b: Batch) => {
    setEditing(b);
    form.setFieldsValue({
      ...b,
      manufactureDate: b.manufactureDate ? dayjs(b.manufactureDate) : undefined,
      expireDate: b.expireDate ? dayjs(b.expireDate) : undefined,
    });
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditing(null); form.resetFields(); };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const dto: BatchRequest = {
      name: values.name,
      productId: values.productId,
      batchString: values.batchString,
      manufactureDate: values.manufactureDate ? dayjs(values.manufactureDate).format('YYYY-MM-DD') : undefined,
      expireDate: values.expireDate ? dayjs(values.expireDate).format('YYYY-MM-DD') : undefined,
    };
    if (editing) {
      updateMut.mutate({ id: editing.id, dto });
    } else {
      createMut.mutate(dto);
    }
  };

  const filtered = batches.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.product?.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.batchString ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const isExpired = (date?: string) => date && dayjs(date).isBefore(dayjs());
  const isExpiringSoon = (date?: string) =>
    date && dayjs(date).isAfter(dayjs()) && dayjs(date).isBefore(dayjs().add(30, 'day'));

  const columns = [
    { title: '#', dataIndex: 'id', key: 'id', width: 60 },
    {
      title: t('batches.name'),
      dataIndex: 'name',
      key: 'name',
      render: (v: string, r: Batch) => (
        <div>
          <div style={{ fontWeight: 600 }}>{v}</div>
          {r.batchString && <div style={{ fontSize: 12, color: '#6b7280' }}>#{r.batchString}</div>}
        </div>
      ),
    },
    {
      title: t('menu.products'),
      key: 'product',
      render: (_: unknown, r: Batch) => (
        <Tag icon={<InboxOutlined />} color="blue">{r.product?.name ?? `#${r.productId}`}</Tag>
      ),
    },
    {
      title: t('batches.manufacture_date'),
      dataIndex: 'manufactureDate',
      key: 'manufactureDate',
      render: (v?: string) => v ? dayjs(v).format('DD.MM.YYYY') : '—',
    },
    {
      title: t('batches.expire_date'),
      dataIndex: 'expireDate',
      key: 'expireDate',
      render: (v?: string) => {
        if (!v) return '—';
        const color = isExpired(v) ? 'red' : isExpiringSoon(v) ? 'orange' : 'green';
        return <Tag color={color}>{dayjs(v).format('DD.MM.YYYY')}</Tag>;
      },
    },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_: unknown, r: Batch) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title={t('common.confirm_delete')} onConfirm={() => deleteMut.mutate(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const expiredCount = batches.filter(b => isExpired(b.expireDate)).length;
  const soonCount = batches.filter(b => isExpiringSoon(b.expireDate)).length;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>
          <InboxOutlined style={{ marginRight: 8 }} />{t('menu.batches')}
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {t('batches.add_batch')}
        </Button>
      </div>

      {(expiredCount > 0 || soonCount > 0) && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          {expiredCount > 0 && (
            <Card size="small" style={{ background: '#fff2f0', borderColor: '#ffccc7', flex: 1 }}>
              <Tag color="red">{expiredCount} {t('batches.expired')}</Tag>
            </Card>
          )}
          {soonCount > 0 && (
            <Card size="small" style={{ background: '#fffbe6', borderColor: '#ffe58f', flex: 1 }}>
              <Tag color="orange">{soonCount} {t('batches.expiring_soon')}</Tag>
            </Card>
          )}
        </div>
      )}

      <Card>
        <Input.Search
          placeholder={t('common.search')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginBottom: 16, maxWidth: 320 }}
          allowClear
        />
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 20 }}
          size="small"
        />
      </Card>

      <Modal
        title={editing ? t('batches.edit_batch') : t('batches.add_batch')}
        open={modalOpen}
        onCancel={closeModal}
        onOk={handleSubmit}
        confirmLoading={createMut.isPending || updateMut.isPending}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label={t('batches.name')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="productId" label={t('menu.products')} rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="children" placeholder={t('menu.products')}>
              {products.map(p => (
                <Select.Option key={p.id} value={p.id}>{p.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="batchString" label={t('batches.batch_number')}>
            <Input placeholder="LOT-2024-001" />
          </Form.Item>
          <Form.Item name="manufactureDate" label={t('batches.manufacture_date')}>
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
          <Form.Item name="expireDate" label={t('batches.expire_date')}>
            <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BatchesPage;
