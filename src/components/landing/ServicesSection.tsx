"use client";

import { Card, Row, Col } from "antd";

// TODO: [Luân] - Create Grid/Flex layout for medical departments
// TODO: [Luân] - Add icons and short descriptions
export default function ServicesSection() {
  const services = [1, 2, 3, 4]; // Placeholder data

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Dịch vụ của chúng tôi</h2>
        <Row gutter={[24, 24]}>
          {services.map((item) => (
            <Col xs={24} sm={12} md={6} key={item}>
              <Card title={`Dịch vụ ${item}`} hoverable>
                Mô tả ngắn gọn về dịch vụ...
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </section>
  );
}
