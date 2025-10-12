'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Modal, message, Tag, Select, Spin, Alert, Input } from 'antd';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

const { Option } = Select;

import NProgress from 'nprogress';

const AccountsListPage = () => {
  const router = useRouter();
  const { can, loading: authLoading } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [allRoles, setAllRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    fetchAccounts();
    fetchAllRoles();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tai_khoan')
      .select(`
        id,
        email,
        ho_ten,
        user_roles (
          roles (
            id,
            ten_vai_tro
          )
        )
      `);

    if (data) {
      const formattedData = data.map(acc => ({
        ...acc,
        roles: acc.user_roles.map((ur: any) => ur.roles)
      }));
      setAccounts(formattedData);
    }
    setLoading(false);
  };

  const fetchAllRoles = async () => {
      const { data } = await supabase.from('roles').select('*');
      if (data) setAllRoles(data);
  }

  const handleEdit = (account: any) => {
    setEditingAccount(account);
    setSelectedRoles(account.roles.map((r: any) => r.id));
    setNewEmail(account.email);
    setIsModalVisible(true);
  };

  const handleUpdate = async () => {
    if (!editingAccount) return;

    let rolesUpdated = false;
    let emailUpdated = false;

    // 1. Update Roles
    const currentRoles = editingAccount.roles.map((r: any) => r.id).sort();
    const newRoles = [...selectedRoles].sort();

    if (JSON.stringify(currentRoles) !== JSON.stringify(newRoles)) {
        const { error: deleteError } = await supabase
            .from('user_roles')
            .delete()
            .eq('id_tai_khoan', editingAccount.id);

        if (deleteError) {
            message.error(`Lỗi khi xoá vai trò cũ: ${deleteError.message}`);
            return;
        }

        if (selectedRoles.length > 0) {
            const newRoleLinks = selectedRoles.map(roleId => ({
                id_tai_khoan: editingAccount.id,
                id_vai_tro: roleId,
            }));
            const { error: insertError } = await supabase.from('user_roles').insert(newRoleLinks);
            if (insertError) {
                message.error(`Lỗi khi gán vai trò mới: ${insertError.message}`);
                return;
            }
        }
        rolesUpdated = true;
    }

    // 2. Update Email if changed
    if (newEmail && newEmail !== editingAccount.email) {
        const { error } = await supabase.functions.invoke('update-user-email', {
            body: { user_id: editingAccount.id, new_email: newEmail },
        });

        if (error) {
            message.error(`Lỗi khi cập nhật email: ${error.message}`);
            return;
        }
        emailUpdated = true;
    }

    if (rolesUpdated || emailUpdated) {
        message.success('Cập nhật thông tin thành công!');
    } else {
        message.info('Không có thông tin nào được thay đổi.');
    }

    setIsModalVisible(false);
    fetchAccounts(); // Refresh the table
  };

  const handleDelete = (account: any) => {
    Modal.confirm({
      title: `Bạn có chắc chắn muốn xoá tài khoản ${account.email}?`,
      content: 'Hành động này sẽ xoá vĩnh viễn người dùng và không thể hoàn tác.',
      okText: 'Xoá',
      okType: 'danger',
      cancelText: 'Huỷ',
      onOk: async () => {
        try {
          const { error } = await supabase.functions.invoke('delete-user', {
            body: { user_id: account.id },
          });
          if (error) throw error;
          message.success('Xoá tài khoản thành công');
          fetchAccounts(); // Refresh the table
        } catch (error: any) {
          message.error(`Lỗi khi xoá tài khoản: ${error.message}`);
        }
      },
    });
  };

  const columns = [
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Họ Tên', dataIndex: 'ho_ten', key: 'ho_ten' },
    {
      title: 'Vai trò',
      dataIndex: 'roles',
      key: 'roles',
      render: (roles: any[]) => (
        <>
          {roles.map(role => (
            <Tag key={role.id}>{role.ten_vai_tro}</Tag>
          ))}
        </>
      ),
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button onClick={() => handleEdit(record)}>Sửa</Button>
          <Button danger onClick={() => handleDelete(record)}>Xoá</Button>
        </Space>
      ),
    },
  ];

  if (authLoading) {
    return <Spin tip="Đang tải thông tin người dùng..."></Spin>
  }

  if (!can('system.admin')) {
      return <Alert message="Truy cập bị từ chối" description="Bạn không có quyền xem trang này." type="error" showIcon />
  }

  return (
    <>
        <Card 
            title="Quản lý Tài khoản và Phân quyền"
            extra={<Button type="primary" onClick={() => { NProgress.start(); router.push('/dashboard/accounts/new'); }}>Thêm tài khoản</Button>}
        >
            <Table
                columns={columns}
                dataSource={accounts}
                loading={loading}
                rowKey="id"
            />
        </Card>

        <Modal
            title={`Chỉnh sửa người dùng: ${editingAccount?.email}`}
            visible={isModalVisible}
            onOk={handleUpdate}
            onCancel={() => setIsModalVisible(false)}
            okText="Cập nhật"
            cancelText="Huỷ"
        >
            <Space direction="vertical" style={{ width: '100%' }}>
                <div>
                    <p>Email đăng nhập:</p>
                    <Input 
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="Email đăng nhập mới"
                    />
                </div>
                <div>
                    <p>Chọn vai trò cho người dùng:</p>
                    <Select
                        mode="multiple"
                        allowClear
                        style={{ width: '100%' }}
                        placeholder="Chọn vai trò"
                        value={selectedRoles}
                        onChange={setSelectedRoles}
                    >
                        {allRoles.map(role => (
                            <Option key={role.id} value={role.id}>{role.ten_vai_tro}</Option>
                        ))}
                    </Select>
                </div>
            </Space>
        </Modal>
    </>
  );
};

export default AccountsListPage;