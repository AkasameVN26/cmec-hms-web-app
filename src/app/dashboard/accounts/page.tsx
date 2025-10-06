'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Button, Tabs, Space, Modal, message } from 'antd';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const { TabPane } = Tabs;

const AccountsListPage = () => {
  const [admins, setAdmins] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchAccounts('Quản lý');
    fetchAccounts('Bác sĩ');
  }, []);

  const fetchAccounts = async (role: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tai_khoan')
      .select('*')
      .eq('vai_tro', role);

    if (data) {
      if (role === 'Quản lý') {
        setAdmins(data);
      } else {
        setDoctors(data);
      }
    }
    setLoading(false);
  };

  const handleDelete = (id: string, vai_tro: string) => {
    Modal.confirm({
      title: 'Bạn có chắc chắn muốn xoá tài khoản này?',
      content: 'Hành động này không thể hoàn tác.',
      onOk: async () => {
        try {
          // Delete from auth.users
          const { error: authError } = await supabase.functions.invoke('delete-user', {
            body: { user_id: id },
          });
          if (authError) throw authError;

          // Delete from tai_khoan table
          const { error: tableError } = await supabase
            .from('tai_khoan')
            .delete()
            .eq('id', id);
          if (tableError) throw tableError;

          message.success('Xoá tài khoản thành công');
          fetchAccounts(vai_tro);
        } catch (error: any) {
          message.error(error.message);
        }
      },
    });
  };

  const columns = [
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Vai trò', dataIndex: 'vai_tro', key: 'vai_tro' },
    {
      title: 'Hành động',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button onClick={() => router.push(`/dashboard/accounts/edit/${record.id}`)}>Sửa</Button>
          <Button danger onClick={() => handleDelete(record.id, record.vai_tro)}>Xoá</Button>
        </Space>
      ),
    },
  ];

  return (
    <Card title="Danh sách Tài khoản">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button 
          type="primary" 
          onClick={() => router.push('/dashboard/accounts/new')}
        >
          Thêm tài khoản
        </Button>
      </div>
      <Tabs defaultActiveKey="1">
        <TabPane tab="Tài khoản Quản lý" key="1">
          <Table
            columns={columns}
            dataSource={admins}
            loading={loading}
            rowKey="id"
          />
        </TabPane>
        <TabPane tab="Tài khoản Bác sĩ" key="2">
          <Table
            columns={columns}
            dataSource={doctors}
            loading={loading}
            rowKey="id"
          />
        </TabPane>
      </Tabs>
    </Card>
  );
};

export default AccountsListPage;