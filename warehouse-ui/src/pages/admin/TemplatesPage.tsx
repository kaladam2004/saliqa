import React, { useState } from 'react';
import {
  Table, Button, Modal, Form, Input, Space, Popconfirm,
  message, Typography, Card, Tag,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  FileTextOutlined, CopyOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getTemplates, createTemplate, updateTemplate, deleteTemplate,
  type Template, type TemplateRequest,
} from '../../api/templates';

const { Title } = Typography;

const TemplatesPage: React.FC = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<Template | null>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: getTemplates,
  });

  const createMut = useMutation({
    mutationFn: createTemplate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      message.success(t('common.created'));
      closeModal();
    },
    onError: () => message.error(t('common.error')),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: TemplateRequest }) => updateTemplate(id, dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      message.success(t('common.updated'));
      closeModal();
    },
    onError: () => message.error(t('common.error')),
  });

  const deleteMut = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      message.success(t('common.deleted'));
    },
  });

  const openCreate = () => { setEditing(null); form.resetFields(); setModalOpen(true); };
  const openEdit = (t_: Template) => { setEditing(t_); form.setFieldsValue(t_); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); form.resetFields(); };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (editing) {
      updateMut.mutate({ id: editing.id, dto: values });
    } else {
      createMut.mutate(values);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => message.success(t('common.copied')));
  };

  const filtered = templates.filter(t_ =>
    t_.key.toLowerCase().includes(search.toLowerCase()) ||
    t_.value.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { title: '#', dataIndex: 'id', key: 'id', width: 60 },
    {
      title: t('templates.key'),
      dataIndex: 'key',
      key: 'key',
      render: (v: string) => <Tag color="blue"><code>{v}</code></Tag>,
    },
    {
      title: t('templates.value'),
      dataIndex: 'value',
      key: 'value',
      render: (v: string) => (
        <div style={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
          onClick={() => setPreview({ id: 0, key: '', value: v, createdAt: '' })}
        >
          {v}
        </div>
      ),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_: unknown, r: Template) => (
        <Space>
          <Button size="small" icon={<CopyOutlined />} onClick={() => copyToClipboard(r.value)}
            title={t('common.copy')} />
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
          <Popconfirm title={t('common.confirm_delete')} onConfirm={() => deleteMut.mutate(r.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>
          <FileTextOutlined style={{ marginRight: 8 }} />{t('menu.templates')}
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {t('templates.add_template')}
        </Button>
      </div>

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
        title={editing ? t('templates.edit_template') : t('templates.add_template')}
        open={modalOpen}
        onCancel={closeModal}
        onOk={handleSubmit}
        confirmLoading={createMut.isPending || updateMut.isPending}
        destroyOnHidden
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="key" label={t('templates.key')} rules={[{ required: true }]}
            extra={t('templates.key_hint')}>
            <Input placeholder="invoice_header" />
          </Form.Item>
          <Form.Item name="value" label={t('templates.value')} rules={[{ required: true }]}>
            <Input.TextArea rows={8} placeholder={t('templates.value_placeholder')} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={t('templates.preview')}
        open={!!preview}
        onCancel={() => setPreview(null)}
        footer={null}
        width={700}
      >
        <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {preview?.value}
        </pre>
      </Modal>
    </div>
  );
};

export default TemplatesPage;
