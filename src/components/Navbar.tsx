"use client";

import { useEffect, useState } from "react";
import { Menu } from "antd";
import { ImPlus } from "react-icons/im";
import {
  DashboardOutlined,
  TeamOutlined,
  HomeOutlined,
  ScheduleOutlined,
  BarChartOutlined,
  ExperimentOutlined,
  MedicineBoxOutlined,
  ApartmentOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import NProgress from "nprogress";

const { SubMenu } = Menu;

const Navbar = ({ collapsed }: { collapsed: boolean }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { roles } = useAuth();
  const [hospitalName, setHospitalName] = useState<string>('CMEC');

  useEffect(() => {
    const fetchHospitalInfo = async () => {
      const { data, error } = await supabase
        .from('benh_vien')
        .select('ten_benh_vien')
        .single();
      
      if (data && !error) {
        setHospitalName(data.ten_benh_vien);
      }
    };

    fetchHospitalInfo();
  }, []);

  // Role checks
  const isQuanLy = roles.includes('Quản lý');
  const isBacSi = roles.includes('Bác sĩ');
  const isLeTan = roles.includes('Lễ tân');
  const isYTa = roles.includes('Y tá');
  const isDuocSi = roles.includes('Dược sĩ');
  const isKTV = roles.includes('Kỹ thuật viên');

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
            fontSize: collapsed ? "24px" : "18px",
            fontWeight: "bold",
            transition: "opacity 0.3s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            width: "100%",
            padding: "0 10px",
          }}
        >
          {collapsed ? (
             <ImPlus style={{ fontSize: '24px', color: 'white' }} />
          ) : (
             `${hospitalName} HMS`
          )}
        </h1>
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[pathname]}
        onClick={({ key }) => handleNavigation(key)}
        inlineCollapsed={collapsed}
      >
        {isQuanLy && (
            <Menu.Item key="/dashboard" icon={<DashboardOutlined />}>
                Dashboard
            </Menu.Item>
        )}

        {(isLeTan || isBacSi || isQuanLy) && (
            <SubMenu
                key="sub-kham-chua-benh"
                icon={<ScheduleOutlined />}
                title="Khám & Chữa bệnh"
            >
                <Menu.Item key="/dashboard/patients">Quản lý Bệnh nhân</Menu.Item>
                <Menu.Item key="/dashboard/appointments">Quản lý Hồ sơ</Menu.Item>
                <Menu.Item key="/dashboard/appointments/calendar">Đặt lịch hẹn nhanh</Menu.Item>
            </SubMenu>
        )}

        {(isBacSi || isYTa || isQuanLy) && (
            <SubMenu
                key="sub-noi-tru"
                icon={<ApartmentOutlined />}
                title="Quản lý Nội trú"
            >
                <Menu.Item key="/dashboard/inpatient/treatments">
                    Bệnh nhân nội trú
                </Menu.Item>
            </SubMenu>
        )}

        {(isBacSi || isKTV || isQuanLy) && (
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
        )}

        {(isDuocSi || isQuanLy) && (
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
        )}

        {isQuanLy && (
            <>
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
                    <Menu.Item key="/dashboard/specialties">
                        Danh sách chuyên khoa
                    </Menu.Item>
                </SubMenu>

                <Menu.Item key="/dashboard/reports" icon={<BarChartOutlined />}>
                    Báo cáo & Thống kê
                </Menu.Item>
            </>
        )}
      </Menu>
    </>
  );
};

export default Navbar;
