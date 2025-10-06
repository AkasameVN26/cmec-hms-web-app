'use client';

import { useState, useEffect } from 'react';
import { Card, Form, Button, Input, InputNumber, DatePicker, message, Spin } from 'antd';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';

const EditDoctorPage = ({ params }: { params: { id: string } }) => {
  const [doctor, setDoctor] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [form] = Form.useForm();

  useEffect(() => {
    const fetchDoctor = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('bac_si')
        .select('*')
        .eq('id_bac_si', params.id)
        .single();

      if (data) {
        setDoctor(data);
        form.setFieldsValue({ ...data, ngay_sinh: data.ngay_sinh ? dayjs(data.ngay_sinh) : null });
      } else {
        message.error('Không tìm thấy thông tin bác sĩ.');
      }
      setLoading(false);
    };

    fetchDoctor();
  }, [params.id, form]);

  const onFinish = async (values: any) => {
    setLoading(true);
    const { error } = await supabase
      .from('bac_si')
      .update(values)
      .eq('id_bac_si', params.id);

    if (error) {
      message.error(error.message);
    } else {
      message.success('Cập nhật thông tin bác sĩ thành công');
      router.push('/dashboard/doctors');
    }
    setLoading(false);
  };

  if (loading || !doctor) {
    return <Spin size="large" />;
  }

  return (
    <Card title="Chỉnh sửa thông tin Bác sĩ">
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="ho_ten" label="Họ và tên" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="chuyen_khoa" label="Chuyên khoa" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="kinh_nghiem" label="Kinh nghiệm" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="tien_luong" label="Tiền lương (VND)">
          <InputNumber min={0} style={{ width: '100%' }} formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} parser={(value) => value!.replace(/\./g, '')} />
        </Form.Item>
        <Form.Item name="ngay_sinh" label="Ngày sinh" rules={[{ required: true }]}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="so_dien_thoai" label="Số điện thoại" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="cccd" label="CCCD" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} style={{ marginRight: 8 }}>
            Lưu thay đổi
          </Button>
          <Button onClick={() => router.back()}>Quay lại</Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default EditDoctorPage;
