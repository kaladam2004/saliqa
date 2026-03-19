import React, { useState } from 'react';
import {
  Card, Button, Descriptions, Typography, message, Avatar,
  Form, Input, Divider, Space,
} from 'antd';
import { UserOutlined, EditOutlined, LockOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdmin, updateAdmin } from '../../api/admins';
import { changePassword } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import ImageUpload from '../../components/common/ImageUpload';
import { useTranslation } from 'react-i18next';

const imgSrc = (url?: string | null) =>
  !url ? undefined : url.startsWith('http') ? url : `/api${url}`;

const AdminProfilePage: React.FC = () => {
  const { user: auth } = useAuthStore();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [form] = Form.useForm();
  const [pwForm] = Form.useForm();
  const [changingPw, setChangingPw] = useState(false);

  const { data: admin } = useQuery({
    queryKey: ['admin', auth?.id],
    queryFn: () => getAdmin(auth!.id),
    enabled: !!auth?.id,
  });

  const photoMutation = useMutation({
    mutationFn: (photo: string | undefined) =>
      updateAdmin(auth!.id, { ...admin!, photo, role: admin!.role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', auth?.id] });
      message.success(t('profile.profile_updated'));
    },
  });

  const editMutation = useMutation({
    mutationFn: (values: { fullname: string; tel?: string; description?: string }) =>
      updateAdmin(auth!.id, { ...admin!, ...values, role: admin!.role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', auth?.id] });
      message.success(t('profile.profile_updated'));
      setEditing(false);
    },
    onError: () => message.error(t('common.error')),
  });

  const pwMutation = useMutation({
    mutationFn: (values: { oldPassword: string; newPassword: string }) =>
      changePassword({ id: auth!.id, role: auth!.role, ...values }),
    onSuccess: () => {
      message.success(t('profile.password_changed'));
      pwForm.resetFields();
      setChangingPw(false);
    },
    onError: () => message.error(t('profile.wrong_old_password')),
  });

  const startEdit = () => {
    form.setFieldsValue({
      fullname: admin?.fullname,
      tel: admin?.tel,
      description: admin?.description,
    });
    setEditing(true);
  };

  return (
    <>
      <Typography.Title level={4}>{t('profile.title')}</Typography.Title>
      <Card style={{ maxWidth: 640 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <Avatar src={imgSrc(admin?.photo)} icon={<UserOutlined />} size={80} />
          <div>
            <Typography.Title level={5} style={{ margin: 0 }}>{admin?.fullname}</Typography.Title>
            <Typography.Text type="secondary">@{admin?.username}</Typography.Text>
            <Typography.Text type="secondary" style={{ display: 'block' }}>{admin?.role}</Typography.Text>
            <div style={{ marginTop: 8 }}>
              <ImageUpload value={admin?.photo} onChange={url => photoMutation.mutate(url)} hidePreview />
            </div>
          </div>
        </div>

        {editing ? (
          <Form form={form} layout="vertical" onFinish={editMutation.mutate}>
            <Form.Item name="fullname" label={t('common.full_name')} rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="tel" label={t('common.phone')}>
              <Input />
            </Form.Item>
            <Form.Item name="description" label={t('common.description')}>
              <Input.TextArea rows={2} />
            </Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={editMutation.isPending}>{t('common.save')}</Button>
              <Button onClick={() => setEditing(false)}>{t('common.cancel')}</Button>
            </Space>
          </Form>
        ) : (
          <>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label={t('common.full_name')}>{admin?.fullname || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('common.username')}>{admin?.username || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('common.phone')}>{admin?.tel || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('common.description')}>{admin?.description || '-'}</Descriptions.Item>
              <Descriptions.Item label={t('common.role')}>{admin?.role || '-'}</Descriptions.Item>
            </Descriptions>
            <Button icon={<EditOutlined />} style={{ marginTop: 16 }} onClick={startEdit}>
              {t('profile.edit_profile')}
            </Button>
          </>
        )}

        <Divider />

        <Typography.Title level={5} style={{ marginBottom: 12 }}>
          <LockOutlined /> {t('profile.change_password')}
        </Typography.Title>
        {changingPw ? (
          <Form form={pwForm} layout="vertical" onFinish={pwMutation.mutate} style={{ maxWidth: 400 }}>
            <Form.Item name="oldPassword" label={t('profile.old_password')} rules={[{ required: true }]}>
              <Input.Password />
            </Form.Item>
            <Form.Item name="newPassword" label={t('profile.new_password')} rules={[{ required: true, min: 6 }]}>
              <Input.Password />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              label={t('profile.confirm_password')}
              dependencies={['newPassword']}
              rules={[
                { required: true },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                    return Promise.reject(t('profile.passwords_mismatch'));
                  },
                }),
              ]}
            >
              <Input.Password />
            </Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={pwMutation.isPending}>{t('profile.save_password')}</Button>
              <Button onClick={() => setChangingPw(false)}>{t('common.cancel')}</Button>
            </Space>
          </Form>
        ) : (
          <Button icon={<LockOutlined />} onClick={() => setChangingPw(true)}>
            {t('profile.change_password')}
          </Button>
        )}
      </Card>
    </>
  );
};

export default AdminProfilePage;
