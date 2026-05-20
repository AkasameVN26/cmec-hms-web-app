"use client";

import { Form, Input, DatePicker, Button, Select } from "antd";

// TODO: [Phúc] - Implement appointment form
// TODO: [Phúc] - Add validation (Zod/React Hook Form recommended)
// TODO: [Phúc] - Connect to API endpoint
export default function BookingForm() {
  const [form] = Form.useForm();

  const onFinish = (values: any) => {
    console.log("Success:", values);
  };

  return (
    <section className="py-16 container mx-auto px-4 max-w-2xl">
      <h2 className="text-3xl font-bold text-center mb-8">Đặt lịch khám</h2>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item label="Họ và tên" name="name" rules={[{ required: true }]}>
          <Input placeholder="Nhập họ tên" />
        </Form.Item>
        <Form.Item label="Số điện thoại" name="phone" rules={[{ required: true }]}>
          <Input placeholder="Nhập số điện thoại" />
        </Form.Item>
        <Form.Item label="Ngày khám" name="date" rules={[{ required: true }]}>
          <DatePicker className="w-full" />
        </Form.Item>
        <Form.Item label="Chuyên khoa" name="specialty">
          <Select placeholder="Chọn chuyên khoa">
            <Select.Option value="noi">Nội khoa</Select.Option>
            <Select.Option value="ngoai">Ngoại khoa</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" block size="large">
            Gửi yêu cầu
          </Button>
        </Form.Item>
      </Form>
    </section>
  );
}
