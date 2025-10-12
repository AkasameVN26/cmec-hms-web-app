'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Button, Space, Modal, Descriptions, Spin, Form, DatePicker, Select, List, message, Typography, Row, Col, Tag, Input } from 'antd';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import NProgress from 'nprogress';
import dayjs from 'dayjs';

const { Option } = Select;

const DoctorsPage = () => {
  const [doctors, setDoctors] = useState<any[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<any[]>([]);
  const [shifts, setShifts] = useState<any[]>([]);
  const [clinicalSpecialties, setClinicalSpecialties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [isShiftsModalVisible, setIsShiftsModalVisible] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<any | null>(null);
  const [doctorShifts, setDoctorShifts] = useState<any[]>([]);
  const [selectedDoctorDetails, setSelectedDoctorDetails] = useState<any | null>(null);
  const router = useRouter();
  const [shiftForm] = Form.useForm();
  const [searchForm] = Form.useForm();

  const disabledDate = (current: any) => {
    return current && current < dayjs().startOf('day');
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: doctorsData, error } = await supabase
      .from('bac_si')
      .select(`
        id_bac_si,
        kinh_nghiem,
        so_dien_thoai,
        cccd,
        ngay_sinh,
        tien_luong,
        ngay_chuyen_den,
        ngay_chuyen_di,
        chuyen_khoa!id_chuyen_khoa ( id_chuyen_khoa, ten_chuyen_khoa ),
        tai_khoan!id_bac_si ( id, email, ho_ten )
      `);

    if (error) {
        message.error("Lỗi khi tải dữ liệu Bác sĩ: " + error.message);
        setLoading(false);
        return;
    }

    const { data: shiftsData } = await supabase.from('lich_truc').select('*');
    const { data: specialtiesData } = await supabase.from('chuyen_khoa').select('*');

    if (doctorsData) {
        setDoctors(doctorsData);
        setFilteredDoctors(doctorsData);
    }
    if (shiftsData) setShifts(shiftsData);
    if (specialtiesData) {
        setClinicalSpecialties(specialtiesData.filter(s => s.loai_khoa === 'Lâm sàng'));
    }
    setLoading(false);
  };

  const handleSearch = (values: any) => {
    let filtered = doctors;

    if (values.ho_ten) {
      filtered = filtered.filter(d => d.tai_khoan && d.tai_khoan.ho_ten.toLowerCase().includes(values.ho_ten.toLowerCase()));
    }
    if (values.id_chuyen_khoa) {
      filtered = filtered.filter(d => d.chuyen_khoa && d.chuyen_khoa.id_chuyen_khoa === values.id_chuyen_khoa);
    }
    if (values.ngay_truc) {
      const doctorIdsWithShift = shifts
        .filter(s => dayjs(s.ngay_truc).isSame(values.ngay_truc, 'day'))
        .map(s => s.id_bac_si);
      filtered = filtered.filter(d => doctorIdsWithShift.includes(d.id_bac_si));
    }

    setFilteredDoctors(filtered);
  };

  const handleClearFilter = () => {
    searchForm.resetFields();
    setFilteredDoctors(doctors);
  };

  const handleManageShifts = async (doctor: any) => {
    setLoading(true);
    setSelectedDoctor(doctor);
    const { data } = await supabase
      .from('lich_truc')
      .select('*')
      .eq('id_bac_si', doctor.id_bac_si)
      .gte('ngay_truc', new Date().toISOString())
      .order('ngay_truc', { ascending: true });
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
    NProgress.start();
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
      const { data } = await supabase.from('lich_truc').select('*').eq('id_bac_si', selectedDoctor.id_bac_si).gte('ngay_truc', new Date().toISOString()).order('ngay_truc', { ascending: true });
      if (data) setDoctorShifts(data);
      const { data: shiftsData } = await supabase.from('lich_truc').select('*').gte('ngay_truc', new Date().toISOString());
      if (shiftsData) setShifts(shiftsData);
    }
  };

  const handleDeleteShift = async (shiftId: number) => {
    const { error } = await supabase.from('lich_truc').delete().eq('id_lich_truc', shiftId);
    if (error) {
      message.error(error.message);
    } else {
      message.success('Xoá lịch trực thành công');
      const { data } = await supabase.from('lich_truc').select('*').eq('id_bac_si', selectedDoctor.id_bac_si).gte('ngay_truc', new Date().toISOString()).order('ngay_truc', { ascending: true });
      if (data) setDoctorShifts(data);
      const { data: shiftsData } = await supabase.from('lich_truc').select('*').gte('ngay_truc', new Date().toISOString());
      if (shiftsData) setShifts(shiftsData);
    }
  };

  const columns = [
    { title: 'Họ tên', dataIndex: ['tai_khoan', 'ho_ten'], key: 'ho_ten', render: (text:string) => text || '-' },
    { title: 'Email', dataIndex: ['tai_khoan', 'email'], key: 'email', render: (text:string) => text || '-' },
    { title: 'Chuyên khoa', dataIndex: ['chuyen_khoa', 'ten_chuyen_khoa'], key: 'ten_chuyen_khoa', render: (text:string) => text || '-' },
    {
      title: 'Lịch trực',
      key: 'lich_truc',
      render: (_: any, record: any) => {
        const doctorShifts = shifts.filter(shift => shift.id_bac_si === record.id_bac_si);
        if (doctorShifts.length === 0) return '-';
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
      <Card 
        title="Quản lý Bác sĩ"
        extra={<Button type="primary" onClick={() => { NProgress.start(); router.push('/dashboard/accounts/new?role_id=2'); }}>Thêm bác sĩ</Button>}
      >
        <Form form={searchForm} onFinish={handleSearch} layout="vertical" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="ho_ten" label="Tên bác sĩ">
                <Input placeholder="Nhập tên bác sĩ" allowClear />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="id_chuyen_khoa" label="Chuyên khoa">
                <Select placeholder="Chọn chuyên khoa" allowClear>
                    {clinicalSpecialties.map(s => <Option key={s.id_chuyen_khoa} value={s.id_chuyen_khoa}>{s.ten_chuyen_khoa}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="ngay_truc" label="Ngày trực">
                <DatePicker style={{ width: '100%' }} placeholder="Chọn ngày trực" />
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col span={24} style={{ textAlign: 'right' }}>
                <Button type="primary" htmlType="submit">Tìm kiếm</Button>
                <Button style={{ marginLeft: 8 }} onClick={handleClearFilter}>Xoá bộ lọc</Button>
            </Col>
          </Row>
        </Form>
        <Table
          columns={columns}
          dataSource={filteredDoctors}
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
              <Descriptions.Item label="Họ tên">{selectedDoctorDetails.tai_khoan?.ho_ten || '-'}</Descriptions.Item>
              <Descriptions.Item label="Email">{selectedDoctorDetails.tai_khoan?.email || '-'}</Descriptions.Item>
              <Descriptions.Item label="Chuyên khoa">{selectedDoctorDetails.chuyen_khoa?.ten_chuyen_khoa || '-'}</Descriptions.Item>
              <Descriptions.Item label="Kinh nghiệm">{selectedDoctorDetails.kinh_nghiem || '-'}</Descriptions.Item>
              <Descriptions.Item label="Ngày sinh">{selectedDoctorDetails.ngay_sinh ? new Date(selectedDoctorDetails.ngay_sinh).toLocaleDateString() : '-'}</Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">{selectedDoctorDetails.so_dien_thoai || '-'}</Descriptions.Item>
              <Descriptions.Item label="CCCD">{selectedDoctorDetails.cccd || '-'}</Descriptions.Item>
              <Descriptions.Item label="Ngày chuyển đến">{selectedDoctorDetails.ngay_chuyen_den ? new Date(selectedDoctorDetails.ngay_chuyen_den).toLocaleDateString() : '-'}</Descriptions.Item>
              <Descriptions.Item label="Ngày chuyển đi">{selectedDoctorDetails.ngay_chuyen_di ? new Date(selectedDoctorDetails.ngay_chuyen_di).toLocaleDateString() : '-'}</Descriptions.Item>
              <Descriptions.Item label="Tổng số ca khám">{selectedDoctorDetails.appointment_count || 0}</Descriptions.Item>
              <Descriptions.Item label="Lương">{selectedDoctorDetails.tien_luong ? selectedDoctorDetails.tien_luong.toLocaleString('vi-VN') + ' VND' : '-'}</Descriptions.Item>
            </Descriptions>
          )}
        </Modal>
      )}

      {selectedDoctor && (
        <Modal
          title={`Quản lý lịch trực cho Bác sĩ ${selectedDoctor.tai_khoan?.ho_ten}`}
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
            dataSource={doctorShifts}
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