'use client';

import { Menu } from 'antd';
import { 
  DashboardOutlined, 
  UserOutlined, 
  TeamOutlined, 
  HomeOutlined, 
  ScheduleOutlined, 
  BarChartOutlined, 
  SettingOutlined 
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';

const Navbar = ({ collapsed }: { collapsed: boolean }) => {
  const router = useRouter();

  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: '/dashboard/patients', icon: <UserOutlined />, label: 'Quản lý Bệnh nhân' },
    { key: '/dashboard/doctors', icon: <TeamOutlined />, label: 'Quản lý Bác sĩ' },
    { key: '/dashboard/clinics', icon: <HomeOutlined />, label: 'Quản lý Phòng khám' },
    { key: '/dashboard/appointments', icon: <ScheduleOutlined />, label: 'Quản lý Lịch khám' },
    { key: '/dashboard/reports', icon: <BarChartOutlined />, label: 'Báo cáo & thống kê' },
    { key: '/dashboard/accounts', icon: <SettingOutlined />, label: 'Quản lý Tài khoản' },
  ];

  return (
    <>
      <div style={{ height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 255, 255, 0.05)' }}>
        <h1 style={{ color: 'white', margin: 0, fontSize: '24px', fontWeight: 'bold', transition: 'opacity 0.3s' }}>
          {collapsed ? 'C' : 'CMEC'}
        </h1>
      </div>
      <Menu
        theme="dark"
        mode="inline"
        defaultSelectedKeys={['/dashboard']}
        onClick={({ key }) => router.push(key)}
        items={menuItems}
        inlineCollapsed={collapsed}
      />
    </>
  );
};

export default Navbar;
