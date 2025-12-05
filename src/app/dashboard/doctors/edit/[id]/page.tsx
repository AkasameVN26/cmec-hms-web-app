'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import dayjs from 'dayjs';
import { Card, Form, Button, Input, InputNumber, DatePicker, message, Spin, Select } from 'antd';

const { Option } = Select;

const EditDoctorPage = ({ params }: { params: { id: string } }) => {
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const [form] = Form.useForm();

  useEffect(() => {
    if (!params.id) {
        message.error('ID bác sĩ không hợp lệ.');
        router.push('/dashboard/doctors');
        return;
    }

    const fetchSpecialties = async () => {
        const { data, error } = await supabase.from('chuyen_khoa').select('*');
        if (data) setSpecialties(data);
    }

    const fetchDoctor = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('bac_si')
        .select('*, tai_khoan(ho_ten, email)')
        .eq('id_bac_si', params.id)
        .single();

      if (data) {
        const doctorData = {...data, ...data.tai_khoan};
        form.setFieldsValue({ 
            ...doctorData, 
            ngay_sinh: doctorData.ngay_sinh ? dayjs(doctorData.ngay_sinh) : null,
            ngay_chuyen_den: doctorData.ngay_chuyen_den ? dayjs(doctorData.ngay_chuyen_den) : null,
            ngay_chuyen_di: doctorData.ngay_chuyen_di ? dayjs(doctorData.ngay_chuyen_di) : null,
        });
      } else {
        message.error('Không tìm thấy thông tin bác sĩ.');
        router.push('/dashboard/doctors');
      }
      setLoading(false);
    };

    fetchSpecialties();
    fetchDoctor();

  }, [params.id, form, router]);

  const onFinish = async (values: any) => {
    setLoading(true);

    const processedValues = { ...values };
    if (processedValues.ngay_sinh) {
        processedValues.ngay_sinh = processedValues.ngay_sinh.format('YYYY-MM-DD');
    }
    if (processedValues.ngay_chuyen_den) {
        processedValues.ngay_chuyen_den = processedValues.ngay_chuyen_den.format('YYYY-MM-DD');
    }
    if (processedValues.ngay_chuyen_di) {
        processedValues.ngay_chuyen_di = processedValues.ngay_chuyen_di.format('YYYY-MM-DD');
    }

    const { ho_ten, email, ...doctorData } = processedValues;
    const { error } = await supabase
        .from('bac_si')
        .update(doctorData)
        .eq('id_bac_si', params.id);

    if (error) {
        message.error(error.message);
    } else {
        message.success('Cập nhật thông tin bác sĩ thành công');
        router.push('/dashboard/doctors');
    }
    setLoading(false);
  };

  if (loading) {
    return <Spin size="large" className="flex justify-center items-center h-full" />;
  }

  return (
    <Card title="Chỉnh sửa thông tin Bác sĩ">
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="ho_ten" label="Họ và tên">
          <Input disabled />
        </Form.Item>
        <Form.Item name="email" label="Email">
            <Input disabled />
        </Form.Item>
        <Form.Item name="id_chuyen_khoa" label="Chuyên khoa" rules={[{ required: true }]}>
          <Select placeholder="Chọn chuyên khoa">
            {specialties.map(s => <Option key={s.id_chuyen_khoa} value={s.id_chuyen_khoa}>{s.ten_chuyen_khoa}</Option>)}
          </Select>
        </Form.Item>
        <Form.Item name="kinh_nghiem" label="Kinh nghiệm" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="tien_luong" label="Tiền lương (VND)">
          <InputNumber<number>
            min={0} 
            style={{ width: '100%' }} 
            formatter={(value) => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''} 
            parser={(value) => value ? parseInt(value.replace(/\./g, ''), 10) : 0} 
          />
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
        <Form.Item name="ngay_chuyen_den" label="Ngày chuyển đến">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="ngay_chuyen_di" label="Ngày chuyển đi">
          <DatePicker style={{ width: '100%' }} />
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
