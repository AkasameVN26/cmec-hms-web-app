"use client";

import { Card, Row, Col } from "antd";

const { Meta } = Card;

// TODO: [Luân] - Implement Card layout for news
// TODO: [Luân] - Connect to CMS or API for dynamic news
export default function NewsSection() {
  return (
    <section className="py-16 container mx-auto px-4">
      <h2 className="text-3xl font-bold text-center mb-12">Tin tức & Sự kiện</h2>
      <Row gutter={[24, 24]}>
        {[1, 2, 3].map((i) => (
          <Col xs={24} md={8} key={i}>
            <Card
              hoverable
              cover={<div className="h-48 bg-gray-200" />} // Placeholder image
            >
              <Meta title="Tiêu đề tin tức" description="Tóm tắt nội dung tin tức..." />
            </Card>
          </Col>
        ))}
      </Row>
    </section>
  );
}
