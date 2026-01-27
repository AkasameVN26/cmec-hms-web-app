"use client";

import { Layout, Button, Row, Col, Typography } from "antd";
import { LoginOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";

const { Header } = Layout;
const { Title } = Typography;

// TODO: [Bình] - Refactor into a proper responsive Navbar
// TODO: [Bình] - Add navigation links (Home, Services, Doctors, News)
export default function LandingHeader() {
  const router = useRouter();

  return (
    <Header
      style={{
        background: "#fff",
        padding: "0 24px",
        borderBottom: "1px solid #f0f0f0",
        position: "sticky",
        top: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}
    >
      <div className="logo">
        <Title level={4} style={{ margin: 0, color: "#1890ff" }}>
          CMEC Hospital
        </Title>
      </div>
      
      <div>
        <Button
          type="primary"
          icon={<LoginOutlined />}
          onClick={() => router.push("/login")}
        >
          Đăng nhập
        </Button>
      </div>
    </Header>
  );
}
