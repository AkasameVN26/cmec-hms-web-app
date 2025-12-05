'use client';

import { useState, useEffect, useCallback } from 'react';
import dayjs from 'dayjs';
import { Card, Form, Input, Button, Select, message, Spin, Alert, Row, Col, DatePicker, InputNumber } from 'antd';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useRouter, useSearchParams } from 'next/navigation';

const { Option } = Select;

const NewAccountPage = () => {
  const { can, loading: authLoading } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [allRoles, setAllRoles] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [technicianSpecialties, setTechnicianSpecialties] = useState<any[]>([]);
  const [allServices, setAllServices] = useState<any[]>([]);
  const [filteredServices, setFilteredServices] = useState<any[]>([]);
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedRoles = Form.useWatch('role_ids', form);
  const selectedTechnicianSpecialty = Form.useWatch(['technicianDetails', 'id_chuyen_khoa'], form);

  const fetchData = useCallback(async () => {
    const { data: rolesData } = await supabase.from('roles').select('*');
    if (rolesData) setAllRoles(rolesData);

    const { data: specialtiesData } = await supabase.from('chuyen_khoa').select('*');
    if (specialtiesData) {
        setSpecialties(specialtiesData);
        setTechnicianSpecialties(specialtiesData.filter(s => s.loai_khoa === 'Cận lâm sàng'));
    }

    const { data: servicesData } = await supabase.from('dich_vu_cls').select('*');
    if (servicesData) setAllServices(servicesData);
  }, []);

  useEffect(() => {
    fetchData();
    const roleId = searchParams.get('role_id');
    if (roleId) {
      form.setFieldsValue({ role_ids: [parseInt(roleId)] });
    }
  }, [fetchData, searchParams, form]);

  useEffect(() => {
    if (selectedTechnicianSpecialty) {
      setFilteredServices(allServices.filter(s => s.id_chuyen_khoa === selectedTechnicianSpecialty));
    } else {
      setFilteredServices([]);
    }
    form.setFieldsValue({ technicianDetails: { ...form.getFieldValue('technicianDetails'), service_ids: [] } });
  }, [selectedTechnicianSpecialty, allServices, form]);

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const processedValues = JSON.parse(JSON.stringify(values));
      const { doctorDetails, technicianDetails, ...mainValues } = processedValues;

      // Format dates for doctor
      if (doctorDetails) {
        if (doctorDetails.ngay_sinh) doctorDetails.ngay_sinh = dayjs(doctorDetails.ngay_sinh).format('YYYY-MM-DD');
        if (doctorDetails.ngay_chuyen_den) doctorDetails.ngay_chuyen_den = dayjs(doctorDetails.ngay_chuyen_den).format('YYYY-MM-DD');
        if (doctorDetails.ngay_chuyen_di) doctorDetails.ngay_chuyen_di = dayjs(doctorDetails.ngay_chuyen_di).format('YYYY-MM-DD');
      }
      
      // Format dates for technician
      if (technicianDetails) {
        if (technicianDetails.ngay_sinh) technicianDetails.ngay_sinh = dayjs(technicianDetails.ngay_sinh).format('YYYY-MM-DD');
        if (technicianDetails.ngay_chuyen_den) technicianDetails.ngay_chuyen_den = dayjs(technicianDetails.ngay_chuyen_den).format('YYYY-MM-DD');
        if (technicianDetails.ngay_chuyen_di) technicianDetails.ngay_chuyen_di = dayjs(technicianDetails.ngay_chuyen_di).format('YYYY-MM-DD');
      }

      const { error } = await supabase.functions.invoke('create-user', {
        body: {
          ...mainValues,
          doctorDetails,
          technicianDetails,
        },
      });

      if (error) throw error;

      message.success('Tạo tài khoản thành công!');
      router.push('/dashboard/accounts');
    } catch (error: any) {
      message.error(`Lỗi khi tạo tài khoản: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const isRoleSelected = (roleName: string) => {
    if (!selectedRoles || !allRoles.length) return false;
    const role = allRoles.find(r => r.ten_vai_tro === roleName);
    return role && selectedRoles.includes(role.id);
  };

  if (authLoading) {
    return <Spin tip="Đang tải thông tin người dùng..."></Spin>;
  }

  if (!can('system.admin')) {
    return <Alert message="Truy cập bị từ chối" description="Bạn không có quyền thực hiện hành động này." type="error" showIcon />;
  }

  return (
    <Card title="Tạo tài khoản mới">
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Row gutter={24}>
            <Col span={12}>
                <Form.Item name="ho_ten" label="Họ và Tên" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>
                <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
                    <Input />
                </Form.Item>
                <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, min: 6 }]}>
                    <Input.Password />
                </Form.Item>
                <Form.Item name="role_ids" label="Vai trò" rules={[{ required: true }]}>
                    <Select mode="multiple" allowClear placeholder="Chọn vai trò">
                        {allRoles.map(role => (
                        <Option key={role.id} value={role.id}>{role.ten_vai_tro}</Option>
                        ))}
                    </Select>
                </Form.Item>
            </Col>
            <Col span={12}>
                {isRoleSelected('Bác sĩ') && (
                    <Card type="inner" title="Thông tin Bác sĩ">
                        <Form.Item name={['doctorDetails', 'cccd']} label="CCCD" rules={[{ required: true, message: 'Vui lòng nhập số CCCD' }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item name={['doctorDetails', 'so_dien_thoai']} label="Số điện thoại" rules={[{ required: true, message: 'Vui lòng nhập SĐT' }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item name={['doctorDetails', 'id_chuyen_khoa']} label="Chuyên khoa" rules={[{ required: true, message: 'Vui lòng chọn chuyên khoa' }]}>
                             <Select placeholder="Chọn chuyên khoa">
                                {specialties.map(s => <Option key={s.id_chuyen_khoa} value={s.id_chuyen_khoa}>{s.ten_chuyen_khoa}</Option>)}
                            </Select>
                        </Form.Item>
                        <Form.Item name={['doctorDetails', 'ngay_sinh']} label="Ngày sinh">
                            <DatePicker style={{ width: '100%' }}/>
                        </Form.Item>
                        <Form.Item name={['doctorDetails', 'kinh_nghiem']} label="Kinh nghiệm">
                            <Input.TextArea rows={2} />
                        </Form.Item>
                        <Form.Item name={['doctorDetails', 'tien_luong']} label="Tiền lương (VND)">
                            <InputNumber<number> style={{ width: '100%' }} min={0} formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} parser={(value) => value ? parseInt(value.replace(/\./g, '')) : 0} />
                        </Form.Item>
                        <Form.Item name={['doctorDetails', 'ngay_chuyen_den']} label="Ngày chuyển đến" rules={[{ required: true, message: 'Vui lòng nhập ngày chuyển đến' }]}>
                            <DatePicker style={{ width: '100%' }}/>
                        </Form.Item>
                        <Form.Item name={['doctorDetails', 'ngay_chuyen_di']} label="Ngày chuyển đi">
                            <DatePicker style={{ width: '100%' }}/>
                        </Form.Item>
                    </Card>
                )}
                {isRoleSelected('Kỹ thuật viên') && (
                     <Card type="inner" title="Thông tin Kỹ thuật viên" style={{ marginTop: 16 }}>
                        <Form.Item name={['technicianDetails', 'cccd']} label="CCCD" rules={[{ required: true, message: 'Vui lòng nhập số CCCD' }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item name={['technicianDetails', 'so_dien_thoai']} label="Số điện thoại" rules={[{ required: true, message: 'Vui lòng nhập SĐT' }]}>
                            <Input />
                        </Form.Item>
                        <Form.Item name={['technicianDetails', 'id_chuyen_khoa']} label="Chuyên khoa" rules={[{ required: true, message: 'Vui lòng chọn chuyên khoa' }]}>
                             <Select placeholder="Chọn chuyên khoa Cận lâm sàng">
                                {technicianSpecialties.map(s => <Option key={s.id_chuyen_khoa} value={s.id_chuyen_khoa}>{s.ten_chuyen_khoa}</Option>)}
                            </Select>
                        </Form.Item>
                        <Form.Item name={['technicianDetails', 'ngay_sinh']} label="Ngày sinh">
                            <DatePicker style={{ width: '100%' }}/>
                        </Form.Item>
                        <Form.Item name={['technicianDetails', 'trinh_do']} label="Trình độ">
                            <Input placeholder="VD: Cử nhân, Kỹ sư..."/>
                        </Form.Item>
                        <Form.Item name={['technicianDetails', 'tien_luong']} label="Tiền lương (VND)">
                            <InputNumber<number> style={{ width: '100%' }} min={0} formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} parser={(value) => value ? parseInt(value.replace(/\./g, '')) : 0} />
                        </Form.Item>
                        <Form.Item name={['technicianDetails', 'ngay_chuyen_den']} label="Ngày chuyển đến" rules={[{ required: true, message: 'Vui lòng nhập ngày chuyển đến' }]}>
                            <DatePicker style={{ width: '100%' }}/>
                        </Form.Item>
                        <Form.Item name={['technicianDetails', 'ngay_chuyen_di']} label="Ngày chuyển đi">
                            <DatePicker style={{ width: '100%' }}/>
                        </Form.Item>
                        <Form.Item name={['technicianDetails', 'service_ids']} label="Các dịch vụ thực hiện">
                            <Select mode="multiple" allowClear placeholder="Chọn dịch vụ" disabled={!selectedTechnicianSpecialty}>
                                {filteredServices.map(s => <Option key={s.id_dich_vu} value={s.id_dich_vu}>{s.ten_dich_vu}</Option>)}
                            </Select>
                        </Form.Item>
                    </Card>
                )}
            </Col>
        </Row>
        <Form.Item style={{ marginTop: 24 }}>
          <Button type="primary" htmlType="submit" loading={loading}>
            Tạo tài khoản
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default NewAccountPage;

export const dynamic = 'force-dynamic';
