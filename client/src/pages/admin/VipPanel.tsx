import { useCallback, useEffect, useState } from 'react';
import { ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import { App, Button, Card, Form, Input, Select, Space, Switch, Table, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import AdminLoading from './AdminLoading';
import type { VipGlobalConfig, VipUserEntry } from './types';
import { adminFetch, formatAuditTime } from './utils';

const WELCOME_TEMPLATE_OPTIONS = [
  { value: 'none', label: '无（不发送欢迎语）' },
  { value: 'royal', label: '皇家驾临' },
  { value: 'sparkle', label: '星光入场' },
  { value: 'vip-lounge', label: 'VIP lounge' },
  { value: 'spotlight', label: '聚光灯' },
  { value: 'wave', label: '嗨翻全场' },
  { value: 'custom', label: '自定义' },
];

const COOLDOWN_OPTIONS = [
  { value: 0, label: '每次进房都欢迎' },
  { value: 60, label: '1 分钟' },
  { value: 300, label: '5 分钟' },
  { value: 900, label: '15 分钟' },
  { value: 1800, label: '30 分钟' },
  { value: 3600, label: '1 小时' },
];

const COLOR_OPTIONS = [
  { value: '#f6d365', label: '鎏金' },
  { value: '#fde68a', label: '香槟' },
  { value: '#d4a574', label: '流沙' },
  { value: '#b45309', label: '焦糖' },
  { value: '#ff8a4c', label: '琥珀' },
  { value: '#ff7a59', label: '晚霞' },
  { value: '#fb7185', label: '赤焰' },
  { value: '#e11d48', label: '酒红' },
  { value: '#f4a5c0', label: '玫瑰金' },
  { value: '#e879f9', label: '桃紫' },
  { value: '#c084fc', label: '葡萄' },
  { value: '#818cf8', label: '御紫' },
  { value: '#67e8f9', label: '极光' },
  { value: '#2dd4bf', label: '碧青' },
  { value: '#6ee7b7', label: '翡翠' },
  { value: '#a3e635', label: '青柠' },
  { value: '#e2e8f0', label: '铂金' },
  { value: '#94a3b8', label: '玄银' },
];

function VipPanel() {
  const { message } = App.useApp();
  const [config, setConfig] = useState<VipGlobalConfig | null>(null);
  // config is kept in sync so that future changes to loadConfig can compare old vs new
  void config; // suppress: loaded but only configDraft is rendered
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);
  const [configDraft, setConfigDraft] = useState<VipGlobalConfig | null>(null);
  const [users, setUsers] = useState<VipUserEntry[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersKeyword, setUsersKeyword] = useState('');

  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const data = await adminFetch<{ config: VipGlobalConfig }>('/api/admin/vip/config');
      setConfig(data.config);
      setConfigDraft(data.config);
    } catch {
      message.error('加载全局贵宾配置失败');
    } finally {
      setConfigLoading(false);
    }
  }, [message]);

  const loadUsers = useCallback(async (page = 1, keyword = usersKeyword) => {
    setUsersLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (keyword) params.set('q', keyword);
      const data = await adminFetch<{ items: VipUserEntry[]; total: number }>(`/api/admin/vip/users?${params}`);
      setUsers(data.items);
      setUsersTotal(data.total);
      setUsersPage(page);
    } catch {
      message.error('加载贵宾用户列表失败');
    } finally {
      setUsersLoading(false);
    }
  }, [message, usersKeyword]);

  useEffect(() => { void loadConfig(); }, [loadConfig]);
  useEffect(() => { void loadUsers(); }, [loadUsers]);

  const saveConfig = async () => {
    if (!configDraft || configSaving) return;
    setConfigSaving(true);
    try {
      await adminFetch('/api/admin/vip/config', {
        method: 'PUT',
        body: JSON.stringify(configDraft),
      });
      setConfig(configDraft);
      message.success('全局贵宾默认配置已保存');
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setConfigSaving(false);
    }
  };

  const refreshUser = async (userId: string) => {
    try {
      await adminFetch(`/api/admin/vip/users/${encodeURIComponent(userId)}/refresh`, { method: 'POST' });
      message.success('已刷新该用户的 VIP 概要');
      await loadUsers(usersPage);
    } catch (err) {
      message.error(err instanceof Error ? err.message : '刷新失败');
    }
  };

  const userColumns: ColumnsType<VipUserEntry> = [
    {
      title: '用户 ID',
      dataIndex: 'userId',
      key: 'userId',
      width: 200,
      ellipsis: true,
      render: (id: string) => <Typography.Text code style={{ fontSize: 11 }}>{id}</Typography.Text>,
    },
    {
      title: '摸鱼岛称号',
      key: 'currentTitleName',
      width: 140,
      render: (_, entry) =>
        entry.isPermanentVip ? (
          <Tag color="gold">{entry.currentTitleName || '【贵宾】'}</Tag>
        ) : (
          <Tag>非永久会员</Tag>
        ),
    },
    {
      title: '累计赞助',
      key: 'donationAmount',
      width: 100,
      render: (_, entry) =>
        entry.donationAmount ? (
          <Typography.Text type="secondary">{entry.donationAmount} 元</Typography.Text>
        ) : (
          <Typography.Text type="secondary">—</Typography.Text>
        ),
    },
    {
      title: '最后刷新',
      key: 'refreshedAt',
      width: 160,
      render: (_, entry) =>
        entry.refreshedAt ? (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {formatAuditTime(entry.refreshedAt)}
          </Typography.Text>
        ) : (
          '—'
        ),
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_, entry) => (
        <Tooltip title="强制刷新该用户的摸鱼岛 VIP 概要">
          <Button size="small" icon={<ReloadOutlined />} onClick={() => void refreshUser(entry.userId)}>
            刷新
          </Button>
        </Tooltip>
      ),
    },
  ];

  if (configLoading) return <AdminLoading minHeight={300} tip="加载中…" />;

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <Card title="全局贵宾默认样式">
        <Form layout="vertical" style={{ marginBottom: 0 }}>
          <Space wrap size={16} align="start">
            <Form.Item label="角标默认颜色" style={{ marginBottom: 12 }}>
              <Select
                value={configDraft?.badgeColor}
                onChange={(val) => setConfigDraft((prev) => (prev ? { ...prev, badgeColor: val } : prev))}
                options={COLOR_OPTIONS}
                style={{ width: 140 }}
              />
            </Form.Item>
            <Form.Item label="边框默认颜色" style={{ marginBottom: 12 }}>
              <Select
                value={configDraft?.borderColor}
                onChange={(val) => setConfigDraft((prev) => (prev ? { ...prev, borderColor: val } : prev))}
                options={COLOR_OPTIONS}
                style={{ width: 140 }}
              />
            </Form.Item>
            <Form.Item label="欢迎语模板" style={{ marginBottom: 12 }}>
              <Select
                value={configDraft?.welcomeTemplateId}
                onChange={(val) => setConfigDraft((prev) => (prev ? { ...prev, welcomeTemplateId: val } : prev))}
                options={WELCOME_TEMPLATE_OPTIONS}
                style={{ width: 160 }}
              />
            </Form.Item>
            <Form.Item label="欢迎语冷却" style={{ marginBottom: 12 }}>
              <Select
                value={configDraft?.welcomeCooldownSec}
                onChange={(val) => setConfigDraft((prev) => (prev ? { ...prev, welcomeCooldownSec: val } : prev))}
                options={COOLDOWN_OPTIONS}
                style={{ width: 160 }}
              />
            </Form.Item>
          </Space>
          <Space wrap size={16} align="center">
            <Form.Item label="欢迎语开关" style={{ marginBottom: 12 }}>
              <Switch
                checked={configDraft?.welcomeEnabled}
                onChange={(val) => setConfigDraft((prev) => (prev ? { ...prev, welcomeEnabled: val } : prev))}
              />
            </Form.Item>
            <Form.Item label="进房礼花" style={{ marginBottom: 12 }}>
              <Switch
                checked={configDraft?.confettiEnabled}
                onChange={(val) => setConfigDraft((prev) => (prev ? { ...prev, confettiEnabled: val } : prev))}
              />
            </Form.Item>
          </Space>
          <Form.Item label="自定义欢迎语文案（模板选「自定义」时生效）" style={{ marginBottom: 0 }}>
            <Input
              value={configDraft?.welcomeCustomText}
              onChange={(e) => setConfigDraft((prev) => (prev ? { ...prev, welcomeCustomText: e.target.value } : prev))}
              placeholder="例：欢迎 {nickname} 大驾光临 {badge} 房间～  （{nickname}=进房人昵称，{badge}=VIP 称号）"
              maxLength={200}
              style={{ maxWidth: 480 }}
            />
          </Form.Item>
        </Form>
        <div style={{ marginTop: 16 }}>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={configSaving}
            onClick={() => void saveConfig()}
          >
            保存全局默认
          </Button>
        </div>
      </Card>

      <Card
        title={`全局贵宾用户（${usersTotal}）`}
        extra={
          <Space size={8}>
            <Input.Search
              placeholder="搜索用户 ID / 称号"
              value={usersKeyword}
              onChange={(e) => setUsersKeyword(e.target.value)}
              onSearch={(val) => { setUsersKeyword(val); void loadUsers(1, val); }}
              style={{ width: 220 }}
              allowClear
            />
            <Button icon={<ReloadOutlined />} onClick={() => void loadUsers(1)}>
              刷新列表
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="userId"
          size="small"
          loading={usersLoading}
          columns={userColumns}
          dataSource={users}
          pagination={{
            current: usersPage,
            pageSize: 20,
            total: usersTotal,
            onChange: (page) => void loadUsers(page),
            showTotal: (total) => `共 ${total} 条`,
            showSizeChanger: false,
          }}
          locale={{ emptyText: '暂无全局贵宾用户' }}
          scroll={{ x: 720 }}
        />
      </Card>
    </Space>
  );
}

export default VipPanel;
