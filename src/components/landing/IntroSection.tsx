"use client";

import { Row, Col, Card, Statistic } from "antd";

// TODO: [Luân] - Fetch and display Hospital Info
// TODO: [Luân] - Add Count-up animation for statistics
export default function IntroSection() {
  return (
    <section className="py-16 px-8 container mx-auto">
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <h2>Về chúng tôi</h2>
          <p>Giới thiệu chung về bệnh viện...</p>
        </Col>
        <Col span={12}>
          <Row gutter={16}>
            <Col span={12}>
              <Card>
                <Statistic title="Bác sĩ" value={50} />
              </Card>
            </Col>
            <Col span={12}>
              <Card>
                <Statistic title="Chuyên khoa" value={12} />
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>
    </section>
  );
}
