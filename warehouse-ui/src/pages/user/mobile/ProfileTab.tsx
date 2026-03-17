import React from 'react';
import { Avatar, Button, Typography, message } from 'antd';
import { EnvironmentOutlined, UserOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUser, updateUser, updateUserGps } from '../../../api/users';
import { useAuthStore } from '../../../store/authStore';
import ImageUpload from '../../../components/common/ImageUpload';
import { useTranslation } from 'react-i18next';

const imgSrc = (url?: string | null) =>
  !url ? undefined : url.startsWith('http') ? url : `/api${url}`;

const ProfileTab: React.FC = () => {
  const { user: auth } = useAuthStore();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { data: user } = useQuery({
    queryKey: ['user', auth?.id],
    queryFn: () => getUser(auth!.id),
    enabled: !!auth?.id,
  });

  const photoMutation = useMutation({
    mutationFn: (photo: string | undefined) => updateUser(auth!.id, { ...user!, photo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', auth?.id] });
      message.success(t('profile.profile_updated'));
    },
  });

  const gpsMutation = useMutation({
    mutationFn: () =>
      new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const gps = `${pos.coords.latitude},${pos.coords.longitude}`;
            updateUserGps(auth!.id, gps).then(() => {
              queryClient.invalidateQueries({ queryKey: ['user', auth?.id] });
              message.success(t('profile.gps_updated'));
              resolve();
            }).catch(reject);
          },
          () => { message.error(t('profile.gps_error')); reject(); }
        );
      }),
  });

  return (
    <div style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Profile header card */}
      <div style={{
        background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)',
        borderRadius: 18, padding: '20px 16px',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <Avatar src={imgSrc(user?.photo)} icon={<UserOutlined />} size={72}
          style={{ border: '3px solid rgba(255,255,255,0.4)', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Typography.Title level={5} style={{ margin: 0, color: '#fff', fontSize: 16 }}>{user?.fullname}</Typography.Title>
          <Typography.Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>@{user?.username}</Typography.Text>
          <div style={{ marginTop: 10 }}>
            <ImageUpload
              value={user?.photo}
              onChange={url => photoMutation.mutate(url)}
              hidePreview
            />
          </div>
        </div>
      </div>

      {/* Info cards */}
      {[
        { label: t('common.full_name'), value: user?.fullname },
        { label: t('common.username'), value: user?.username },
        { label: t('common.phone'), value: user?.tel },
        { label: t('common.address'), value: user?.address },
        { label: t('common.description'), value: user?.description },
      ].map(({ label, value }) => (
        <div key={label} style={{
          background: '#fff', borderRadius: 14, padding: '12px 16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>{label}</span>
          <span style={{ fontSize: 14, color: '#1a1a2e', fontWeight: 500, maxWidth: '60%', textAlign: 'right' }}>{value || '-'}</span>
        </div>
      ))}

      {/* GPS card */}
      <div style={{
        background: '#fff', borderRadius: 14, padding: '12px 16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>{t('common.gps')}</span>
          <Button
            size="small"
            type="primary"
            icon={<EnvironmentOutlined />}
            onClick={() => gpsMutation.mutate()}
            loading={gpsMutation.isPending}
            style={{ borderRadius: 8 }}
          >
            {t('profile.update_gps')}
          </Button>
        </div>
        <span style={{ fontSize: 12, color: '#6b7280', fontFamily: 'monospace' }}>
          {user?.gps || t('profile.not_set')}
        </span>
      </div>
    </div>
  );
};

export default ProfileTab;
