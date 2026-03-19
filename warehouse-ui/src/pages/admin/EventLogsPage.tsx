import React, { useState, useMemo } from 'react';
import { Table, Tag, Input, Select, DatePicker, Card, Row, Col, Button } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { getEventLogs } from '../../api/eventLogs';
import { formatDateTime } from '../../utils/helpers';
import PageHeader from '../../components/common/PageHeader';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

const EVENT_COLORS: Record<string, string> = {
  LOGIN: 'green', LOGOUT: 'gray', CREATE: 'blue', UPDATE: 'orange',
  DELETE: 'red', INVOICE_CREATED: 'purple', PAYMENT_RECEIVED: 'cyan',
  PRODUCT_RETURNED: 'gold', STOCK_ADDED: 'lime',
};

const ALL_EVENT_TYPES = [
  'LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE',
  'INVOICE_CREATED', 'PAYMENT_RECEIVED', 'PRODUCT_RETURNED', 'STOCK_ADDED',
];

const EventLogsPage: React.FC = () => {
  const { data: logs = [], isLoading } = useQuery({ queryKey: ['event-logs'], queryFn: getEventLogs });
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [eventType, setEventType] = useState<string | undefined>();
  const [actorType, setActorType] = useState<string | undefined>();
  const [dateFrom, setDateFrom] = useState<string | undefined>();
  const [dateTo, setDateTo] = useState<string | undefined>();

  const filtered = useMemo(() => {
    return logs.filter(log => {
      if (eventType && log.eventType !== eventType) return false;
      if (actorType && log.actorType !== actorType) return false;
      if (dateFrom && new Date(log.timestamp) < new Date(dateFrom)) return false;
      if (dateTo && new Date(log.timestamp) > new Date(dateTo)) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !(log.actorUsername?.toLowerCase().includes(q) ||
            log.description?.toLowerCase().includes(q) ||
            String(log.id).includes(q))
        ) return false;
      }
      return true;
    });
  }, [logs, eventType, actorType, dateFrom, dateTo, search]);

  const columns = [
    { title: t('common.id'), dataIndex: 'id', width: 60 },
    { title: t('event_logs.timestamp'), dataIndex: 'timestamp', render: formatDateTime, width: 160 },
    {
      title: t('event_logs.event_type'), dataIndex: 'eventType', width: 160,
      render: (v: string) => <Tag color={EVENT_COLORS[v] || 'default'}>{v}</Tag>,
    },
    { title: t('event_logs.actor'), dataIndex: 'actorUsername', width: 130 },
    {
      title: t('event_logs.actor_type'), dataIndex: 'actorType', width: 80,
      render: (v: string) => v ? <Tag color={v === 'ADMIN' ? 'blue' : 'purple'}>{v}</Tag> : '-',
    },
    { title: t('common.description'), dataIndex: 'description' },
    {
      title: t('event_logs.entity'), key: 'entity', width: 120,
      render: (_: unknown, r: { entityType?: string; entityId?: number }) =>
        r.entityType ? `${r.entityType} #${r.entityId}` : '-',
    },
  ];

  const resetFilters = () => {
    setSearch('');
    setEventType(undefined);
    setActorType(undefined);
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  return (
    <>
      <PageHeader title={t('event_logs.page_title')} />

      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={12} md={6}>
            <Input.Search
              placeholder={t('common.search') ?? 'Search...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Select
              placeholder={t('event_logs.event_type')} allowClear style={{ width: '100%' }}
              value={eventType} onChange={setEventType}
            >
              {ALL_EVENT_TYPES.map(et => (
                <Select.Option key={et} value={et}>
                  <Tag color={EVENT_COLORS[et] || 'default'} style={{ margin: 0 }}>{et}</Tag>
                </Select.Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={8} md={3}>
            <Select
              placeholder={t('event_logs.actor_type')} allowClear style={{ width: '100%' }}
              value={actorType} onChange={setActorType}
            >
              <Select.Option value="ADMIN">ADMIN</Select.Option>
              <Select.Option value="USER">USER</Select.Option>
              <Select.Option value="SYSTEM">SYSTEM</Select.Option>
            </Select>
          </Col>
          <Col xs={12} sm={8} md={4}>
            <DatePicker
              placeholder={t('common.from')} style={{ width: '100%' }}
              onChange={v => setDateFrom(v ? dayjs(v).startOf('day').toISOString() : undefined)}
            />
          </Col>
          <Col xs={12} sm={8} md={4}>
            <DatePicker
              placeholder={t('common.to')} style={{ width: '100%' }}
              onChange={v => setDateTo(v ? dayjs(v).endOf('day').toISOString() : undefined)}
            />
          </Col>
          <Col xs={24} sm={4} md={3}>
            <Button block onClick={() => {
              setDateFrom(dayjs().startOf('day').toISOString());
              setDateTo(dayjs().endOf('day').toISOString());
            }}>{t('common.today')}</Button>
          </Col>
          <Col xs={24} sm={4} md={3}>
            <Button block onClick={resetFilters}>{t('common.all')}</Button>
          </Col>
        </Row>
      </Card>

      <Table
        dataSource={filtered}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 50 }}
        scroll={{ x: 900 }}
        size="small"
      />
    </>
  );
};

export default EventLogsPage;
