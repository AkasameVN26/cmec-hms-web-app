"use client";

import { Card, Carousel } from "antd";

// TODO: [Phúc] - Implement Carousel for doctors
// TODO: [Phúc] - Add navigation arrows/dots
export default function DoctorSlider() {
  return (
    <section className="py-16 bg-blue-50">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Đội ngũ Bác sĩ</h2>
        <Carousel autoplay slidesToShow={3} dots>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="px-2">
              <Card>
                <div className="text-center">
                  <div className="w-24 h-24 bg-gray-300 rounded-full mx-auto mb-4" />
                  <h3 className="font-bold">Bác sĩ {i}</h3>
                  <p className="text-gray-500">Chuyên khoa</p>
                </div>
              </Card>
            </div>
          ))}
        </Carousel>
      </div>
    </section>
  );
}
