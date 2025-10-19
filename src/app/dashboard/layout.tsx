'use client';

import { useState, useEffect } from "react";
import { Button, Layout, message, Typography, Dropdown, Menu, Space, Avatar, Modal, Form, Input } from "antd";
import { UserOutlined, DownOutlined, LogoutOutlined, MailOutlined } from '@ant-design/icons';
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/providers/AuthProvider";

const { Header, Content, Sider } = Layout;
const { Text } = Typography;

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { user, profile, roles, loading: authLoading } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [collapsed, setCollapsed] = useState(true);
  const [isEmailModalVisible, setIsEmailModalVisible] = useState(false);
  const [emailForm] = Form.useForm();

  useEffect(() => {
    const timer = setInterval(() => { setCurrentTime(new Date()); }, 1000);
    return () => { clearInterval(timer); };
  }, []);

  const formatDateTime = (date: Date) => {
    const weekdays = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}, ${weekdays[date.getDay()]}, ngày ${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) message.error(error.message);
    else router.push('/login');
  };

  const showChangeEmailModal = () => {
    emailForm.setFieldsValue({ currentEmail: profile?.email });
    setIsEmailModalVisible(true);
  };

  const handleChangeEmail = async (values: any) => {
    const { newEmail } = values;
    if (!user) return message.error('Không tìm thấy người dùng');

    const { error } = await supabase.functions.invoke('update-user-email', {
        body: { user_id: user.id, new_email: newEmail },
    });

    if (error) {
        message.error(`Lỗi khi đổi email: ${error.message}`);
    } else {
        message.success('Yêu cầu đổi email đã được gửi. Vui lòng kiểm tra email mới để xác nhận.');
        setIsEmailModalVisible(false);
        // Note: Supabase sends a confirmation email. The email won't actually change until confirmed.
        // You might want to sign out the user here to force them to log in again after confirmation.
    }
  };

  const getTitle = () => {
    if (authLoading) return 'Đang tải...';
    if (roles && roles.length > 0) return `Trang ${roles[0]}`;
    return 'CMEC';
  };

  const menu = (
    <Menu>
        <Menu.Item key="email" disabled icon={<MailOutlined />}>
            {profile?.email}
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item key="change-email" onClick={showChangeEmailModal}>
            Đổi email
        </Menu.Item>
        <Menu.Item key="logout" icon={<LogoutOutlined />} onClick={handleLogout}>
            Đăng xuất
        </Menu.Item>
    </Menu>
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px', backgroundColor: '#2997D4' }}>
        <div>
          <h1 style={{ color: 'white', margin: 0, fontSize: '20px' }}>{getTitle()}</h1>
        </div>
        <div style={{ textAlign: 'center' }}>
          <Text style={{ color: 'white', fontSize: '14px' }}>{formatDateTime(currentTime)}</Text>
        </div>
        <Dropdown overlay={menu} trigger={['click']}>
            <a onClick={e => e.preventDefault()} style={{ color: 'white' }}>
                <Space>
                    <Avatar icon={<UserOutlined />} size="small" />
                    {profile?.ho_ten || profile?.email}
                    <DownOutlined />
                </Space>
            </a>
        </Dropdown>
      </Header>
      <Layout>
        <Sider theme="dark" collapsible collapsed={collapsed} onMouseEnter={() => setCollapsed(false)} onMouseLeave={() => setCollapsed(true)} width={250} collapsedWidth={80} trigger={null}>
          <Navbar collapsed={collapsed} />
        </Sider>
        <Layout style={{ padding: "0 24px 24px" }}>
          <Content style={{ padding: 24, margin: 0, minHeight: 280, background: "#fff" }}>
            {children}
          </Content>
        </Layout>
      </Layout>
      <Modal
        title="Đổi địa chỉ email"
        open={isEmailModalVisible}
        onCancel={() => setIsEmailModalVisible(false)}
        footer={null}
      >
        <Form form={emailForm} onFinish={handleChangeEmail} layout="vertical">
            <Form.Item label="Email hiện tại" name="currentEmail">
                <Input disabled />
            </Form.Item>
            <Form.Item label="Email mới" name="newEmail" rules={[{ required: true, type: 'email', message: 'Vui lòng nhập email mới hợp lệ' }]}>
                <Input />
            </Form.Item>
            <Form.Item>
                <Button type="primary" htmlType="submit">Xác nhận đổi</Button>
            </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default DashboardLayout;
