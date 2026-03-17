import React from 'react';
import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <Result
      status="404"
      title="404"
      subTitle={t('not_found.subtitle')}
      extra={<Button type="primary" onClick={() => navigate(-1)}>{t('not_found.go_back')}</Button>}
    />
  );
};

export default NotFoundPage;
