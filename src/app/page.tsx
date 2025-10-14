"use client";

import { useState, useEffect } from "react";
import {
  Layout,
  Button,
  Typography,
  Card,
  Spin,
  Descriptions,
  Space,
  Divider,
  Row,
  Col,
} from "antd";
import {
  LoginOutlined,
  SolutionOutlined,
  PhoneOutlined,
  MailOutlined,
  GlobalOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import NProgress from "nprogress";

const { Header, Content, Footer } = Layout;
const { Title, Text, Link } = Typography;

const LandingPage = () => {
  const [hospitalInfo, setHospitalInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchInfo = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_public_hospital_info");
      if (error) {
        message.error("Không thể tải thông tin bệnh viện.");
      } else {
        setHospitalInfo(data);
      }
      setLoading(false);
    };
    fetchInfo();
  }, []);

  const handleNavigate = (path: string) => {
    NProgress.start();
    router.push(path);
  };

  return (
    <Layout style={{ minHeight: "100vh", background: "#f0f2f5" }}>
      <Header
        style={{
          background: "#fff",
          padding: "0 24px",
          borderBottom: "1px solid #f0f0f0",
        }}
      >
        <Title level={3} style={{ color: "#1890ff", margin: "16px 0" }}>
          {hospitalInfo ? hospitalInfo.ten_benh_vien : "Hệ thống CMEC"}
        </Title>
      </Header>
      <Content style={{ padding: "48px" }}>
        <Spin spinning={loading}>
          <Row justify="center">
            <Col xs={24} md={20} lg={16}>
              <Card style={{ textAlign: "center" }}>
                <Title level={1}>
                  Chào mừng đến với{" "}
                  {hospitalInfo?.ten_benh_vien || "Bệnh viện của chúng tôi"}
                </Title>
                <Text type="secondary" style={{ fontSize: "16px" }}>
                  Chúng tôi cam kết cung cấp dịch vụ chăm sóc sức khỏe tận tâm
                  và chất lượng cao.
                </Text>
                <Divider />
                <Space direction="vertical" size="large">
                  <Row gutter={[16, 16]} justify="center">
                    <Col>
                      <Button
                        type="primary"
                        size="large"
                        icon={<LoginOutlined />}
                        onClick={() => handleNavigate("/login")}
                      >
                        Đăng nhập nhân viên
                      </Button>
                    </Col>
                    <Col>
                      <Button
                        size="large"
                        icon={<SolutionOutlined />}
                        onClick={() => handleNavigate("/portal/lookup")}
                      >
                        Cổng thông tin bệnh nhân
                      </Button>
                    </Col>
                  </Row>
                </Space>
                <Divider>Thông tin liên hệ</Divider>
                {hospitalInfo && (
                  <Descriptions
                    layout="vertical"
                    bordered
                    column={{ xs: 1, sm: 2, md: 3 }}
                  >
                    <Descriptions.Item
                      label={
                        <>
                          <HomeOutlined /> Địa chỉ
                        </>
                      }
                    >
                      {hospitalInfo.dia_chi}
                    </Descriptions.Item>
                    <Descriptions.Item
                      label={
                        <>
                          <PhoneOutlined /> Số điện thoại
                        </>
                      }
                    >
                      <Link href={`tel:${hospitalInfo.so_dien_thoai}`}>
                        {hospitalInfo.so_dien_thoai}
                      </Link>
                    </Descriptions.Item>
                    <Descriptions.Item
                      label={
                        <>
                          <MailOutlined /> Email
                        </>
                      }
                    >
                      <Link href={`mailto:${hospitalInfo.email}`}>
                        {hospitalInfo.email}
                      </Link>
                    </Descriptions.Item>
                    <Descriptions.Item
                      label={
                        <>
                          <GlobalOutlined /> Website
                        </>
                      }
                    >
                      <Link href={hospitalInfo.website} target="_blank">
                        {hospitalInfo.website}
                      </Link>
                    </Descriptions.Item>
                    <Descriptions.Item label="Ngày thành lập">
                      {new Date(hospitalInfo.ngay_thanh_lap).toLocaleDateString(
                        "vi-VN"
                      )}
                    </Descriptions.Item>
                  </Descriptions>
                )}
              </Card>
            </Col>
          </Row>
        </Spin>
      </Content>
      <Footer style={{ textAlign: "center", background: "#f0f2f5" }}>
        {hospitalInfo?.ten_benh_vien || "CMEC"} ©{new Date().getFullYear()} -
        Phát triển bởi Aura Farmers
      </Footer>
    </Layout>
  );
};

export default LandingPage;
