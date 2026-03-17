import React from 'react';
import { Table, Tag } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { getEventLogs } from '../../api/eventLogs';
import { formatDateTime } from '../../utils/helpers';
import PageHeader from '../../components/common/PageHeader';
import { useTranslation } from 'react-i18next';

const EVENT_COLORS: Record<string, string> = {
  LOGIN: 'green', LOGOUT: 'gray', CREATE: 'blue', UPDATE: 'orange',
  DELETE: 'red', INVOICE_CREATED: 'purple', PAYMENT_RECEIVED: 'cyan',
  PRODUCT_RETURNED: 'gold', STOCK_ADDED: 'lime',
};

const EventLogsPage: React.FC = () => {
  const { data: logs = [], isLoading } = useQuery({ queryKey: ['event-logs'], queryFn: getEventLogs });
  const { t } = useTranslation();

  const columns = [
    { title: t('common.id'), dataIndex: 'id', width: 60 },
    { title: t('event_logs.timestamp'), dataIndex: 'timestamp', render: formatDateTime, width: 160 },
    {
      title: t('event_logs.event_type'), dataIndex: 'eventType',
      render: (v: string) => <Tag color={EVENT_COLORS[v] || 'default'}>{v}</Tag>,
    },
    { title: t('event_logs.actor'), dataIndex: 'actorUsername' },
    { title: t('event_logs.actor_type'), dataIndex: 'actorType' },
    { title: t('common.description'), dataIndex: 'description' },
    { title: t('event_logs.entity'), key: 'entity', render: (_: unknown, r: { entityType?: string; entityId?: number }) =>
      r.entityType ? `${r.entityType} #${r.entityId}` : '-' },
  ];

  return (
    <>
      <PageHeader title={t('event_logs.page_title')} />
      <Table dataSource={logs} columns={columns} rowKey="id" loading={isLoading}
        pagination={{ pageSize: 50 }} scroll={{ x: 900 }} />
    </>
  );
};

export default EventLogsPage;
