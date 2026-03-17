import React from 'react';
import { Card, Button, Descriptions, Typography, message, Avatar } from 'antd';
import { EnvironmentOutlined, UserOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUser, updateUser, updateUserGps } from '../../api/users';
import { useAuthStore } from '../../store/authStore';
import ImageUpload from '../../components/common/ImageUpload';
import { useTranslation } from 'react-i18next';

const imgSrc = (url?: string | null) =>
  !url ? undefined : url.startsWith('http') ? url : `/api${url}`;

const ProfilePage: React.FC = () => {
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
    <>
      <Typography.Title level={4}>{t('profile.title')}</Typography.Title>
      <Card style={{ maxWidth: 600 }}>
        {/* Avatar + photo upload */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <Avatar src={imgSrc(user?.photo)} icon={<UserOutlined />} size={80} />
          <div>
            <Typography.Title level={5} style={{ margin: 0 }}>{user?.fullname}</Typography.Title>
            <Typography.Text type="secondary">@{user?.username}</Typography.Text>
            <div style={{ marginTop: 8 }}>
              <ImageUpload
                value={user?.photo}
                onChange={url => photoMutation.mutate(url)}
                hidePreview
              />
            </div>
          </div>
        </div>

        {/* Readonly fields */}
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label={t('common.full_name')}>{user?.fullname || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('common.username')}>{user?.username || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('common.phone')}>{user?.tel || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('common.address')}>{user?.address || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('common.description')}>{user?.description || '-'}</Descriptions.Item>
          <Descriptions.Item label={t('common.gps')}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{user?.gps || t('profile.not_set')}</span>
              <Button
                size="small"
                type="primary"
                icon={<EnvironmentOutlined />}
                onClick={() => gpsMutation.mutate()}
                loading={gpsMutation.isPending}
              >
                {t('profile.update_gps')}
              </Button>
            </div>
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </>
  );
};

export default ProfilePage;
