'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Modal, Descriptions, Spin, Form, DatePicker, Select, List, message, Typography, Row, Col, Tag } from 'antd';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

import dayjs from 'dayjs';

const { Option } = Select;

const DoctorsPage = () => {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [isShiftsModalVisible, setIsShiftsModalVisible] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any | null>(null);
  const [doctorShifts, setDoctorShifts] = useState<any[]>([]);
  const [selectedDoctorDetails, setSelectedDoctorDetails] = useState<any | null>(null);
  const router = useRouter();
  const [shiftForm] = Form.useForm();

  const disabledDate = (current: any) => {
    // Can not select days before today
    return current && current < dayjs().startOf('day');
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: doctorsData } = await supabase.from('bac_si').select('*');
    const { data: shiftsData } = await supabase.from('lich_truc').select('*');
    if (doctorsData) setDoctors(doctorsData);
    if (shiftsData) setShifts(shiftsData);
    setLoading(false);
  };

  const handleManageShifts = async (doctor: any) => {
    setLoading(true);
    setSelectedDoctor(doctor);
    const { data } = await supabase
      .from('lich_truc')
      .select('*')
      .eq('id_bac_si', doctor.id_bac_si)
      .order('ngay_truc', { ascending: false });
    if (data) setDoctorShifts(data);
    setIsShiftsModalVisible(true);
    setLoading(false);
  };

  const handleViewDetails = async (doctor: any) => {
    setLoading(true);
    const { count } = await supabase
      .from('lich_kham')
      .select('*', { count: 'exact', head: true })
      .eq('id_bac_si', doctor.id_bac_si);
    setSelectedDoctorDetails({ ...doctor, appointment_count: count || 0 });
    setIsDetailsModalVisible(true);
    setLoading(false);
  };

  const handleEditInfo = (doctorId: string) => {
    router.push(`/dashboard/doctors/edit/${doctorId}`);
  };

  const handleAddShift = async (values: any) => {
    if (!selectedDoctor) return;
    const { error } = await supabase.from('lich_truc').insert([
      {
        id_bac_si: selectedDoctor.id_bac_si,
        ngay_truc: values.ngay_truc.format('YYYY-MM-DD'),
        ca_truc: values.ca_truc,
      },
    ]);

    if (error) {
      message.error(error.message);
    } else {
      message.success('Thêm lịch trực thành công');
      shiftForm.resetFields();
      // Refresh shifts in modal
      const { data } = await supabase.from('lich_truc').select('*').eq('id_bac_si', selectedDoctor.id_bac_si).order('ngay_truc', { ascending: false });
      if (data) setDoctorShifts(data);
      // Refresh shifts in main table
      const { data: shiftsData } = await supabase.from('lich_truc').select('*');
      if (shiftsData) setShifts(shiftsData);
    }
  };

  const handleDeleteShift = async (shiftId: number) => {
    const { error } = await supabase.from('lich_truc').delete().eq('id_lich_truc', shiftId);
    if (error) {
      message.error(error.message);
    } else {
      message.success('Xoá lịch trực thành công');
      // Refresh shifts in modal
      const { data } = await supabase.from('lich_truc').select('*').eq('id_bac_si', selectedDoctor.id_bac_si).order('ngay_truc', { ascending: false });
      if (data) setDoctorShifts(data);
      // Refresh shifts in main table
      const { data: shiftsData } = await supabase.from('lich_truc').select('*');
      if (shiftsData) setShifts(shiftsData);
    }
  };

  const columns = [
    { title: 'Họ tên', dataIndex: 'ho_ten', key: 'ho_ten' },
    { title: 'Chuyên khoa', dataIndex: 'chuyen_khoa', key: 'chuyen_khoa' },
    { title: 'Số điện thoại', dataIndex: 'so_dien_thoai', key: 'so_dien_thoai' },
    {
      title: 'Lịch trực',
      key: 'lich_truc',
      render: (_: any, record: any) => {
        const doctorShifts = shifts.filter(shift => shift.id_bac_si === record.id_bac_si);
        if (doctorShifts.length === 0) return 'Chưa có lịch trực';
        return (
          <>
            {doctorShifts.map(shift => (
              <Tag key={shift.id_lich_truc} style={{ margin: '2px' }}>
                {`Ca ${shift.ca_truc} - ${new Date(shift.ngay_truc).toLocaleDateString()}`}
              </Tag>
            ))}
          </>
        );
      },
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button onClick={() => handleManageShifts(record)}>Quản lý lịch trực</Button>
          <Button onClick={() => handleViewDetails(record)}>Xem chi tiết</Button>
          <Button onClick={() => handleEditInfo(record.id_bac_si)}>Sửa thông tin</Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card title="Quản lý Bác sĩ">
        <Table
          columns={columns}
          dataSource={doctors}
          loading={loading}
          rowKey="id_bac_si"
        />
      </Card>

      {selectedDoctorDetails && (
        <Modal
          title="Chi tiết Bác sĩ"
          visible={isDetailsModalVisible}
          onCancel={() => setIsDetailsModalVisible(false)}
          footer={<Button onClick={() => setIsDetailsModalVisible(false)}>Đóng</Button>}
          width={600}
        >
          {loading ? <Spin /> : (
            <Descriptions bordered column={1}>
              <Descriptions.Item label="Họ tên">{selectedDoctorDetails.ho_ten}</Descriptions.Item>
              <Descriptions.Item label="Chuyên khoa">{selectedDoctorDetails.chuyen_khoa}</Descriptions.Item>
              <Descriptions.Item label="Kinh nghiệm">{selectedDoctorDetails.kinh_nghiem}</Descriptions.Item>
              <Descriptions.Item label="Ngày sinh">{new Date(selectedDoctorDetails.ngay_sinh).toLocaleDateString()}</Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">{selectedDoctorDetails.so_dien_thoai}</Descriptions.Item>
              <Descriptions.Item label="CCCD">{selectedDoctorDetails.cccd}</Descriptions.Item>
              <Descriptions.Item label="Tổng số ca khám">{selectedDoctorDetails.appointment_count}</Descriptions.Item>
              <Descriptions.Item label="Lương">{selectedDoctorDetails.tien_luong ? selectedDoctorDetails.tien_luong.toLocaleString('vi-VN') : 'N/A'} VND</Descriptions.Item>
            </Descriptions>
          )}
        </Modal>
      )}

      {selectedDoctor && (
        <Modal
          title={`Quản lý lịch trực cho Bác sĩ ${selectedDoctor.ho_ten}`}
          visible={isShiftsModalVisible}
          onCancel={() => setIsShiftsModalVisible(false)}
          footer={<Button onClick={() => setIsShiftsModalVisible(false)}>Đóng</Button>}
          width={600}
        >
          <Form form={shiftForm} layout="vertical" onFinish={handleAddShift} style={{ marginBottom: 24 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="ngay_truc" label="Ngày trực" rules={[{ required: true, message: 'Vui lòng chọn ngày'}]}>
                  <DatePicker placeholder="Chọn ngày trực" disabledDate={disabledDate} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="ca_truc" label="Ca trực" rules={[{ required: true, message: 'Vui lòng chọn ca'}]}>
                  <Select placeholder="Chọn ca">
                    <Option value="Sáng">Sáng</Option>
                    <Option value="Chiều">Chiều</Option>
                    <Option value="Tối">Tối</Option>
                  </Select>
                </Form.Item>
                <Typography.Text type="secondary">(Sáng: 7-12h, Chiều: 13-17h, Tối: 18-21h)</Typography.Text>
              </Col>
            </Row>
            <Form.Item>
              <Button type="primary" htmlType="submit">Thêm</Button>
            </Form.Item>
          </Form>
          <List
            header={<div>Lịch trực sắp tới</div>}
            bordered
            dataSource={doctorShifts.filter(shift => !dayjs(shift.ngay_truc).isBefore(dayjs().startOf('day')))}
            loading={loading}
            renderItem={item => (
              <List.Item
                key={item.id_lich_truc}
                actions={[<Button danger size="small" onClick={() => handleDeleteShift(item.id_lich_truc)}>Xoá</Button>]}
              >
                {`Ngày ${new Date(item.ngay_truc).toLocaleDateString()} - Ca ${item.ca_truc}`}
              </List.Item>
            )}
          />
        </Modal>
      )}
    </>
  );
};

export default DoctorsPage;