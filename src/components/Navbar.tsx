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

const Navbar = () => {
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
    <Menu
      theme="dark"
      mode="inline"
      defaultSelectedKeys={['/dashboard']}
      onClick={({ key }) => router.push(key)}
      items={menuItems}
    />
  );
};

export default Navbar;
