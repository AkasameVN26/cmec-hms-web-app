'use client';

import { useState, useEffect } from 'react';
import { Card, Form, Button, Input, Select, DatePicker, message, Spin } from 'antd';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';

const { Option } = Select;

const EditPatientPage = ({ params }: { params: { id: string } }) => {
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [form] = Form.useForm();

  useEffect(() => {
    const fetchPatient = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('benh_nhan')
        .select('*')
        .eq('id_benh_nhan', params.id)
        .single();

      if (data) {
        setPatient(data);
        form.setFieldsValue({ ...data, ngay_sinh: data.ngay_sinh ? dayjs(data.ngay_sinh) : null });
      } else {
        message.error('Không tìm thấy thông tin bệnh nhân.');
      }
      setLoading(false);
    };

    if (params.id) {
      fetchPatient();
    }
  }, [params.id, form]);

  const onFinish = async (values: any) => {
    setLoading(true);
    const { error } = await supabase
      .from('benh_nhan')
      .update(values)
      .eq('id_benh_nhan', params.id);

    if (error) {
      message.error(error.message);
    } else {
      message.success('Cập nhật thông tin bệnh nhân thành công');
      router.push('/dashboard/patients');
    }
    setLoading(false);
  };

  if (loading || !patient) {
    return <Spin size="large" />;
  }

  return (
    <Card title="Chỉnh sửa thông tin Bệnh nhân">
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="ho_ten" label="Họ và tên" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="ngay_sinh" label="Ngày sinh" rules={[{ required: true }]}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="gioi_tinh" label="Giới tính" rules={[{ required: true }]}>
          <Select placeholder="Chọn giới tính">
            <Option value="Nam">Nam</Option>
            <Option value="Nữ">Nữ</Option>
            <Option value="Khác">Khác</Option>
          </Select>
        </Form.Item>
        <Form.Item name="dia_chi" label="Địa chỉ" rules={[{ required: true }]}>
          <Input />
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

export default EditPatientPage;
