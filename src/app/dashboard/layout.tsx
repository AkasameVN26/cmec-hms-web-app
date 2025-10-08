"use client";

import { useState, useEffect } from "react";
import { Button, Layout, message, Typography } from "antd";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/Navbar";

const { Header, Content, Sider } = Layout;
const { Text } = Typography;

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  const formatDateTime = (date: Date) => {
    const weekdays = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    const weekday = weekdays[date.getDay()];
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${hour}:${minute}, ${weekday}, ngày ${day}, tháng ${month}, năm ${year}`;
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      message.error(error.message);
    } else {
      router.push('/login');
    }
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2997D4' }}>
        <div>
          <h1 style={{ color: 'white', margin: 0 }}>Trang quản trị</h1>
        </div>
        <div style={{ textAlign: 'center' }}>
          <Text style={{ color: 'white', fontSize: '14px' }}>
            {formatDateTime(currentTime)}
          </Text>
        </div>
        <Button type="default" onClick={handleLogout}>
          Đăng xuất
        </Button>
      </Header>
      <Layout>
        <Sider 
          theme="dark"
          collapsible
          collapsed={collapsed}
          trigger={null} // We use mouse events to trigger, so no need for the default trigger
          onMouseEnter={() => setCollapsed(false)}
          onMouseLeave={() => setCollapsed(true)}
          width={250}
          collapsedWidth={80}
        >
          <Navbar collapsed={collapsed} />
        </Sider>
        <Layout style={{ padding: "0 24px 24px" }}>
          <Content
            style={{
              padding: 24,
              margin: 0,
              minHeight: 280,
              background: "#fff",
            }}
          >
            {children}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default DashboardLayout;
