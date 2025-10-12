'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import dayjs from 'dayjs';
import { Card, Form, Button, Input, Select, message, Spin, Row, Col, DatePicker, InputNumber } from 'antd';

const { Option } = Select;

const EditTechnicianPage = ({ params }: { params: { id: string } }) => {
  const [loading, setLoading] = useState(true);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [allServices, setAllServices] = useState<any[]>([]);
  const [filteredServices, setFilteredServices] = useState<any[]>([]);
  const router = useRouter();
  const [form] = Form.useForm();

  const selectedTechnicianSpecialty = Form.useWatch('id_chuyen_khoa', form);

  useEffect(() => {
    if (!params.id) {
        message.error('ID kỹ thuật viên không hợp lệ.');
        router.push('/dashboard/technicians');
        return;
    }

    const fetchData = async () => {
      setLoading(true);

      const { data: techData, error } = await supabase
        .from('ky_thuat_vien')
        .select(`
            *,
            tai_khoan!id_ky_thuat_vien(*),
            chuyen_khoa!id_chuyen_khoa(*),
            ktv_dich_vu_cls(id_dich_vu)
        `)
        .eq('id_ky_thuat_vien', params.id)
        .single();

      if (error || !techData) {
        message.error('Không tìm thấy thông tin kỹ thuật viên.');
        router.push('/dashboard/technicians');
        return;
      }

      const { data: specialtiesData } = await supabase.from('chuyen_khoa').select('*').eq('loai_khoa', 'Cận lâm sàng');
      if (specialtiesData) setSpecialties(specialtiesData);

      const { data: servicesData } = await supabase.from('dich_vu_cls').select('*');
      if (servicesData) setAllServices(servicesData);
      
      const initialServiceIds = techData.ktv_dich_vu_cls.map((s: any) => s.id_dich_vu);
      const technicianDetails = {
          ...techData,
          ...techData.tai_khoan,
          service_ids: initialServiceIds
      };

      form.setFieldsValue({
          ...technicianDetails,
          ngay_sinh: technicianDetails.ngay_sinh ? dayjs(technicianDetails.ngay_sinh) : null,
          ngay_chuyen_den: technicianDetails.ngay_chuyen_den ? dayjs(technicianDetails.ngay_chuyen_den) : null,
          ngay_chuyen_di: technicianDetails.ngay_chuyen_di ? dayjs(technicianDetails.ngay_chuyen_di) : null,
      });

      setLoading(false);
    };

    fetchData();
  }, [params.id, form, router]);

  useEffect(() => {
    if (selectedTechnicianSpecialty) {
      setFilteredServices(allServices.filter(s => s.id_chuyen_khoa === selectedTechnicianSpecialty));
    } else {
      setFilteredServices([]);
    }
  }, [selectedTechnicianSpecialty, allServices]);


  const onFinish = async (values: any) => {
    setLoading(true);
    const { ho_ten, email, service_ids, ...profileData } = values;

    // 1. Update the main profile table
    const { error: profileError } = await supabase
      .from('ky_thuat_vien')
      .update({
          ...profileData,
          ngay_sinh: profileData.ngay_sinh ? dayjs(profileData.ngay_sinh).format('YYYY-MM-DD') : null,
          ngay_chuyen_den: profileData.ngay_chuyen_den ? dayjs(profileData.ngay_chuyen_den).format('YYYY-MM-DD') : null,
          ngay_chuyen_di: profileData.ngay_chuyen_di ? dayjs(profileData.ngay_chuyen_di).format('YYYY-MM-DD') : null,
      })
      .eq('id_ky_thuat_vien', params.id);

    if (profileError) {
      message.error(`Lỗi cập nhật thông tin: ${profileError.message}`);
      setLoading(false);
      return;
    }

    // 2. Update the services in the junction table via RPC
    const { error: servicesError } = await supabase.rpc('update_technician_services', {
        technician_id: params.id,
        service_ids: service_ids || []
    });

    if (servicesError) {
        message.error(`Lỗi cập nhật dịch vụ: ${servicesError.message}`);
    } else {
        message.success('Cập nhật thông tin kỹ thuật viên thành công!');
        router.push('/dashboard/technicians');
    }

    setLoading(false);
  };

  if (loading) {
    return <Spin size="large" className="flex justify-center items-center h-full" />;
  }

  return (
    <Card title="Chỉnh sửa thông tin Kỹ thuật viên">
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Row gutter={24}>
            <Col span={12}>
                <Form.Item name="ho_ten" label="Họ và tên">
                    <Input disabled />
                </Form.Item>
                <Form.Item name="email" label="Email">
                    <Input disabled />
                </Form.Item>
                <Form.Item name="cccd" label="CCCD" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>
                <Form.Item name="so_dien_thoai" label="Số điện thoại" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>
                <Form.Item name="ngay_sinh" label="Ngày sinh">
                    <DatePicker style={{ width: '100%' }}/>
                </Form.Item>
            </Col>
            <Col span={12}>
                <Form.Item name="id_chuyen_khoa" label="Chuyên khoa" rules={[{ required: true }]}>
                    <Select placeholder="Chọn chuyên khoa Cận lâm sàng">
                        {specialties.map(s => <Option key={s.id_chuyen_khoa} value={s.id_chuyen_khoa}>{s.ten_chuyen_khoa}</Option>)}
                    </Select>
                </Form.Item>
                <Form.Item name="trinh_do" label="Trình độ">
                    <Input placeholder="VD: Cử nhân, Kỹ sư..."/>
                </Form.Item>
                <Form.Item name="tien_luong" label="Tiền lương (VND)">
                    <InputNumber style={{ width: '100%' }} min={0} formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} parser={(value) => value ? parseInt(value.replace(/\./g, '')) : 0} />
                </Form.Item>
                <Form.Item name="ngay_chuyen_den" label="Ngày chuyển đến" rules={[{ required: true }]}>
                    <DatePicker style={{ width: '100%' }}/>
                </Form.Item>
                <Form.Item name="ngay_chuyen_di" label="Ngày chuyển đi">
                    <DatePicker style={{ width: '100%' }}/>
                </Form.Item>
                <Form.Item name="service_ids" label="Các dịch vụ thực hiện">
                    <Select mode="multiple" allowClear placeholder="Chọn dịch vụ" disabled={!selectedTechnicianSpecialty}>
                        {filteredServices.map(s => <Option key={s.id_dich_vu} value={s.id_dich_vu}>{s.ten_dich_vu}</Option>)}
                    </Select>
                </Form.Item>
            </Col>
        </Row>
        <Form.Item style={{ marginTop: 24 }}>
          <Button type="primary" htmlType="submit" loading={loading} style={{ marginRight: 8 }}>
            Lưu thay đổi
          </Button>
          <Button onClick={() => router.back()}>Quay lại</Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default EditTechnicianPage;