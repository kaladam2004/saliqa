import React, { useState } from 'react';
import { Avatar, Button, Typography, message, Form, Input } from 'antd';
import { UserOutlined, EditOutlined, LockOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdmin, updateAdmin } from '../../../api/admins';
import { changePassword } from '../../../api/auth';
import { useAuthStore } from '../../../store/authStore';
import ImageUpload from '../../../components/common/ImageUpload';
import { useTranslation } from 'react-i18next';

const imgSrc = (url?: string | null) =>
  !url ? undefined : url.startsWith('http') ? url : `/api${url}`;

const card = { background: '#fff', borderRadius: 14, padding: '12px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' } as const;

const AdminProfileTab: React.FC = () => {
  const { user: auth } = useAuthStore();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [form] = Form.useForm();
  const [pwForm] = Form.useForm();

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
    <div style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Profile header */}
      <div style={{
        background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
        borderRadius: 18, padding: '20px 16px',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <Avatar src={imgSrc(admin?.photo)} icon={<UserOutlined />} size={72}
          style={{ border: '3px solid rgba(255,255,255,0.4)', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Typography.Title level={5} style={{ margin: 0, color: '#fff', fontSize: 16 }}>{admin?.fullname}</Typography.Title>
          <Typography.Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>@{admin?.username}</Typography.Text>
          <Typography.Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, display: 'block' }}>{admin?.role}</Typography.Text>
          <div style={{ marginTop: 10 }}>
            <ImageUpload value={admin?.photo} onChange={url => photoMutation.mutate(url)} hidePreview />
          </div>
        </div>
      </div>

      {/* Edit form or info */}
      {editing ? (
        <div style={{ ...card }}>
          <Form form={form} layout="vertical" onFinish={editMutation.mutate}>
            <Form.Item name="fullname" label={t('common.full_name')} rules={[{ required: true }]} style={{ marginBottom: 10 }}>
              <Input />
            </Form.Item>
            <Form.Item name="tel" label={t('common.phone')} style={{ marginBottom: 10 }}>
              <Input />
            </Form.Item>
            <Form.Item name="description" label={t('common.description')} style={{ marginBottom: 10 }}>
              <Input.TextArea rows={2} />
            </Form.Item>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button type="primary" htmlType="submit" loading={editMutation.isPending} style={{ flex: 1 }}>
                {t('common.save')}
              </Button>
              <Button onClick={() => setEditing(false)} style={{ flex: 1 }}>{t('common.cancel')}</Button>
            </div>
          </Form>
        </div>
      ) : (
        <>
          {[
            { label: t('common.full_name'), value: admin?.fullname },
            { label: t('common.username'), value: admin?.username },
            { label: t('common.phone'), value: admin?.tel },
            { label: t('common.role'), value: admin?.role },
            { label: t('common.description'), value: admin?.description },
          ].map(({ label, value }) => (
            <div key={label} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>{label}</span>
              <span style={{ fontSize: 14, color: '#1a1a2e', fontWeight: 500, maxWidth: '60%', textAlign: 'right' }}>{value || '-'}</span>
            </div>
          ))}

          <Button icon={<EditOutlined />} block onClick={startEdit} style={{ borderRadius: 12, height: 42 }}>
            {t('profile.edit_profile')}
          </Button>
        </>
      )}

      {/* Change password */}
      {changingPw ? (
        <div style={{ ...card }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <LockOutlined style={{ color: '#1677ff' }} /> {t('profile.change_password')}
          </div>
          <Form form={pwForm} layout="vertical" onFinish={pwMutation.mutate}>
            <Form.Item name="oldPassword" label={t('profile.old_password')} rules={[{ required: true }]} style={{ marginBottom: 10 }}>
              <Input.Password />
            </Form.Item>
            <Form.Item name="newPassword" label={t('profile.new_password')} rules={[{ required: true, min: 6 }]} style={{ marginBottom: 10 }}>
              <Input.Password />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              label={t('profile.confirm_password')}
              dependencies={['newPassword']}
              style={{ marginBottom: 10 }}
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
            <div style={{ display: 'flex', gap: 8 }}>
              <Button type="primary" htmlType="submit" loading={pwMutation.isPending} style={{ flex: 1 }}>
                {t('profile.save_password')}
              </Button>
              <Button onClick={() => { setChangingPw(false); pwForm.resetFields(); }} style={{ flex: 1 }}>
                {t('common.cancel')}
              </Button>
            </div>
          </Form>
        </div>
      ) : (
        <Button icon={<LockOutlined />} block onClick={() => setChangingPw(true)} style={{ borderRadius: 12, height: 42 }}>
          {t('profile.change_password')}
        </Button>
      )}

      <div style={{ height: 8 }} />
    </div>
  );
};

export default AdminProfileTab;
