"use client";

import { Button, Typography, Row, Col } from "antd";

const { Title, Text } = Typography;

// TODO: [Luân] - Implement Banner with background image/video
// TODO: [Luân] - Add Text animation
// TODO: [Luân] - Add Call to Action (CTA) buttons
export default function HeroSection() {
  return (
    <section className="h-screen flex items-center justify-center bg-blue-50">
      <div className="text-center">
        <Title level={1}>Chào mừng đến với CMEC</Title>
        <Text className="text-lg block mb-8">
          Chăm sóc sức khỏe tận tâm - Uy tín hàng đầu
        </Text>
        <Button type="primary" size="large">
          Đặt lịch ngay
        </Button>
      </div>
    </section>
  );
}
