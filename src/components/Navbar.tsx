"use client";

import { Menu } from "antd";
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  HomeOutlined,
  ScheduleOutlined,
  BarChartOutlined,
  SettingOutlined,
  ExperimentOutlined,
  MedicineBoxOutlined,
  ApartmentOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import NProgress from "nprogress";

const { SubMenu } = Menu;

const Navbar = ({ collapsed }: { collapsed: boolean }) => {
  const router = useRouter();
  const pathname = usePathname(); // Get current path
  const { can } = useAuth();

  const handleNavigation = (key: string) => {
    NProgress.start();
    router.push(key);
  };

  return (
    <>
      <div
        style={{
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(255, 255, 255, 0.05)",
        }}
      >
        <h1
          style={{
            color: "white",
            margin: 0,
            fontSize: "24px",
            fontWeight: "bold",
            transition: "opacity 0.3s",
          }}
        >
          {collapsed ? "C" : "CMEC"}
        </h1>
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[pathname]} // Use selectedKeys with current path
        onClick={({ key }) => handleNavigation(key)}
        inlineCollapsed={collapsed}
      >
        <Menu.Item key="/dashboard" icon={<DashboardOutlined />}>
          Dashboard
        </Menu.Item>

        <SubMenu
          key="sub-kham-chua-benh"
          icon={<ScheduleOutlined />}
          title="Khám & Chữa bệnh"
        >
          <Menu.Item key="/dashboard/patients">Quản lý Bệnh nhân</Menu.Item>
          <Menu.Item key="/dashboard/appointments">Quản lý Hồ sơ</Menu.Item>
        </SubMenu>

        <SubMenu
          key="sub-noi-tru"
          icon={<ApartmentOutlined />}
          title="Quản lý Nội trú"
        >
          <Menu.Item key="/dashboard/inpatient/treatments">
            Bệnh nhân nội trú
          </Menu.Item>
        </SubMenu>

        <SubMenu
          key="sub-cls"
          icon={<ExperimentOutlined />}
          title="Cận lâm sàng (CLS)"
        >
          <Menu.Item key="/dashboard/clinical-services/requests">
            Chỉ định đang chờ
          </Menu.Item>
          <Menu.Item key="/dashboard/clinical-services/results">
            Danh sách kết quả
          </Menu.Item>
        </SubMenu>

        <SubMenu
          key="sub-thuoc"
          icon={<MedicineBoxOutlined />}
          title="Quản lý Thuốc"
        >
          <Menu.Item key="/dashboard/pharmacy/medicines">
            Danh mục thuốc
          </Menu.Item>
          <Menu.Item key="/dashboard/pharmacy/prescriptions">
            Đơn thuốc
          </Menu.Item>
        </SubMenu>

        <SubMenu key="sub-nhan-su" icon={<TeamOutlined />} title="Nhân sự">
          <Menu.Item key="/dashboard/doctors">Quản lý Bác sĩ</Menu.Item>
          <Menu.Item key="/dashboard/technicians">
            Quản lý Kỹ thuật viên
          </Menu.Item>
          <Menu.Item key="/dashboard/schedules">Quản lý Lịch trực</Menu.Item>
          <Menu.Item key="/dashboard/accounts">Quản lý Tài khoản</Menu.Item>
        </SubMenu>

        <SubMenu
          key="sub-co-so-vat-chat"
          icon={<HomeOutlined />}
          title="Cơ sở vật chất"
        >
          <Menu.Item key="/dashboard/clinics">Quản lý Phòng khám</Menu.Item>
          <Menu.Item key="/dashboard/inpatient/wards">Khu điều trị</Menu.Item>
          <Menu.Item key="/dashboard/inpatient/rooms">Phòng bệnh</Menu.Item>
          <Menu.Item key="/dashboard/inpatient/beds">Giường bệnh</Menu.Item>
        </SubMenu>

        <SubMenu
          key="sub-danh-muc"
          icon={<UnorderedListOutlined />}
          title="Quản lý Danh mục"
        >
          <Menu.Item key="/dashboard/diseases">Quản lý Bệnh</Menu.Item>
          <Menu.Item key="/dashboard/clinical-services/services">
            Dịch vụ CLS
          </Menu.Item>
          {can("clinic.specialty.manage") && (
            <Menu.Item key="/dashboard/specialties">
              Danh sách chuyên khoa
            </Menu.Item>
          )}
        </SubMenu>

        <Menu.Item key="/dashboard/reports" icon={<BarChartOutlined />}>
          Báo cáo & Thống kê
        </Menu.Item>
      </Menu>
    </>
  );
};

export default Navbar;
