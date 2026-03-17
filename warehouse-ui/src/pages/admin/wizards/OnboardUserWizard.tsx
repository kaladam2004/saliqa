import React, { useState } from 'react';
import {
  Steps, Form, Input, Button, Card, Typography,
  Result, Descriptions, Space, message,
} from 'antd';
import { UserOutlined, ShopOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createUser } from '../../../api/users';
import { createShop } from '../../../api/shops';
import type { User, UserRequest, ShopRequest } from '../../../types';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

const OnboardUserWizard: React.FC = () => {
  const { t } = useTranslation();
  const [current, setCurrent] = useState(0);
  const [userForm] = Form.useForm<UserRequest>();
  const [shopForm] = Form.useForm<ShopRequest>();
  const [createdUser, setCreatedUser] = useState<User | null>(null);
  const queryClient = useQueryClient();

  const STEPS = [
    { title: t('wizards.onboard_user.step_account'), icon: <UserOutlined /> },
    { title: t('wizards.onboard_user.step_shop'), icon: <ShopOutlined /> },
    { title: t('wizards.onboard_user.step_done'), icon: <CheckCircleOutlined /> },
  ];

  const userMutation = useMutation({
    mutationFn: (data: UserRequest) => createUser(data),
    onSuccess: (user) => {
      setCreatedUser(user);
      setCurrent(1);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      message.error(msg || t('wizards.onboard_user.error_create_user'));
    },
  });

  const shopMutation = useMutation({
    mutationFn: (data: ShopRequest) => createShop({ ...data, shopkeeperId: createdUser!.id, test: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['shops'] });
      setCurrent(2);
    },
    onError: () => message.error(t('wizards.onboard_user.error_create_shop')),
  });

  const reset = () => {
    setCurrent(0);
    userForm.resetFields();
    shopForm.resetFields();
    setCreatedUser(null);
  };

  return (
    <Card style={{ maxWidth: 560 }}>
      <Title level={4}>{t('wizards.onboard_user.title')}</Title>
      <Steps current={current} items={STEPS} style={{ marginBottom: 32 }} />

      {/* Step 0 – User Account */}
      {current === 0 && (
        <Form form={userForm} layout="vertical" onFinish={userMutation.mutate}>
          <Form.Item name="fullname" label={t('wizards.onboard_user.full_name_label')} rules={[{ required: true }]}>
            <Input placeholder={t('wizards.onboard_user.full_name_placeholder')} />
          </Form.Item>
          <Form.Item name="username" label={t('common.username')} rules={[{ required: true }]}>
            <Input placeholder={t('wizards.onboard_user.username_placeholder')} />
          </Form.Item>
          <Form.Item name="password" label={t('common.password')} rules={[{ required: true, min: 6 }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="tel" label={t('common.phone')}>
            <Input placeholder="+998 XX XXX XX XX" />
          </Form.Item>
          <Form.Item name="address" label={t('wizards.onboard_user.address_label')}>
            <Input placeholder={t('wizards.onboard_user.address_placeholder')} />
          </Form.Item>
          <Form.Item name="description" label={t('common.notes')}>
            <Input.TextArea rows={2} placeholder={t('wizards.onboard_user.notes_placeholder')} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={userMutation.isPending} size="large">
              {t('wizards.onboard_user.create_account_btn')}
            </Button>
          </Form.Item>
        </Form>
      )}

      {/* Step 1 – Optionally create a first shop */}
      {current === 1 && (
        <>
          <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
            {t('wizards.onboard_user.assign_shop_hint', { name: createdUser?.fullname })}
          </Text>
          <Form form={shopForm} layout="vertical" onFinish={shopMutation.mutate}>
            <Form.Item name="title" label={t('wizards.onboard_user.shop_name_label')} rules={[{ required: true }]}>
              <Input placeholder={t('wizards.onboard_user.shop_name_placeholder')} />
            </Form.Item>
            <Form.Item name="tel" label={t('wizards.onboard_user.shop_phone_label')}>
              <Input />
            </Form.Item>
            <Form.Item name="gps" label={t('common.gps')}>
              <Input placeholder="41.2995, 69.2401" />
            </Form.Item>
            <Form.Item name="description" label={t('common.description')}>
              <Input.TextArea rows={2} />
            </Form.Item>
            <Space>
              <Button onClick={() => { queryClient.invalidateQueries({ queryKey: ['users'] }); setCurrent(2); }}>
                {t('wizards.onboard_user.skip_btn')}
              </Button>
              <Button type="primary" htmlType="submit" loading={shopMutation.isPending}>
                {t('wizards.onboard_user.create_shop_btn')}
              </Button>
            </Space>
          </Form>
        </>
      )}

      {/* Step 2 – Done */}
      {current === 2 && (
        <Result
          status="success"
          title={t('wizards.onboard_user.rep_onboarded_title')}
          subTitle={t('wizards.onboard_user.rep_onboarded_sub')}
          extra={[<Button type="primary" key="new" onClick={reset}>{t('wizards.onboard_user.onboard_another')}</Button>]}
        >
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label={t('wizards.onboard_user.full_name_label')}>{createdUser?.fullname}</Descriptions.Item>
            <Descriptions.Item label={t('common.username')}>{createdUser?.username}</Descriptions.Item>
            <Descriptions.Item label={t('common.phone')}>{createdUser?.tel || '-'}</Descriptions.Item>
            <Descriptions.Item label={t('wizards.onboard_user.address_desc_label')}>{createdUser?.address || '-'}</Descriptions.Item>
          </Descriptions>
        </Result>
      )}
    </Card>
  );
};

export default OnboardUserWizard;
