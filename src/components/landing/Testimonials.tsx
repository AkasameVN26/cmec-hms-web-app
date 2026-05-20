"use client";

import { Card, Avatar, Row, Col } from "antd";
import { UserOutlined } from "@ant-design/icons";

// TODO: [Duy] - Implement testimonials carousel or grid
export default function Testimonials() {
  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Khách hàng nói gì về chúng tôi</h2>
        <Row gutter={[24, 24]}>
          {[1, 2, 3].map((i) => (
            <Col xs={24} md={8} key={i}>
              <Card>
                <div className="flex items-center mb-4">
                  <Avatar icon={<UserOutlined />} size="large" />
                  <div className="ml-4">
                    <h4 className="font-bold">Khách hàng {i}</h4>
                    <span className="text-gray-500 text-sm">Bệnh nhân</span>
                  </div>
                </div>
                <p className="italic text-gray-600">
                  "Dịch vụ tuyệt vời, bác sĩ tận tâm..."
                </p>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </section>
  );
}
