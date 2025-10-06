'use client';

import { useState } from 'react';
import { Card, Form, Input, Button, Select, DatePicker, message, Row, Col } from 'antd';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const { Option } = Select;

const AddAccountPage = () => {
  const [form] = Form.useForm();
  const [role, setRole] = useState('Quản lý');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onFinish = async (values: any) => {
    setLoading(true);
    const { email, password, vai_tro, ...doctorDetails } = values;

    const { data, error } = await supabase.functions.invoke('create_user', {
      body: { email, password, role: vai_tro, doctorDetails },
    });

    if (error) {
      message.error(error.message);
    } else {
      message.success('Tạo tài khoản thành công!');
      form.resetFields();
    }

    setLoading(false);
  };

  return (
    <Card title="Thêm tài khoản">
      <Form form={form} layout="vertical" onFinish={onFinish}>
        {/* ... (form items are the same) ... */}
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, min: 6 }]}>
              <Input.Password />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="vai_tro" label="Vai trò" initialValue="Quản lý" rules={[{ required: true }]}>
          <Select onChange={setRole}>
            <Option value="Quản lý">Quản lý</Option>
            <Option value="Bác sĩ">Bác sĩ</Option>
          </Select>
        </Form.Item>

        {role === 'Bác sĩ' && (
          <>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="ho_ten" label="Họ tên" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="chuyen_khoa" label="Chuyên khoa" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="so_dien_thoai" label="Số điện thoại" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="cccd" label="CCCD" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="ngay_sinh" label="Ngày sinh" rules={[{ required: true }]}>
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="kinh_nghiem" label="Kinh nghiệm">
                  <Input.TextArea />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} style={{ marginRight: 8 }}>
            Tạo tài khoản
          </Button>
          <Button onClick={() => router.back()}>
            Quay lại
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default AddAccountPage;
