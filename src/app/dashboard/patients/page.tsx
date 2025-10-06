'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Select, DatePicker, Button, Form, Row, Col, Space, Modal, message, Descriptions, Spin, Input } from 'antd';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const { Option } = Select;

const PatientsPage = () => {
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [selectedPatientDetails, setSelectedPatientDetails] = useState<any | null>(null);
  const [form] = Form.useForm();
  const router = useRouter();

  useEffect(() => {
    const fetchDoctors = async () => {
      const { data, error } = await supabase.from('bac_si').select('id_bac_si, ho_ten, chuyen_khoa');
      if (data) {
        const getLastName = (fullName: string) => {
          const parts = fullName.split(' ');
          return parts[parts.length - 1];
        };
        
        const sortedData = data.sort((a, b) => {
          const lastNameA = getLastName(a.ho_ten);
          const lastNameB = getLastName(b.ho_ten);
          return lastNameA.localeCompare(lastNameB, 'vi', { sensitivity: 'base' });
        });

        setDoctors(sortedData);
      }
    };
    fetchDoctors();
    fetchInitialPatients();
  }, []);

  const fetchInitialPatients = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('benh_nhan').select('*');
    if (data) setPatients(data);
    setLoading(false);
  };

  const onFinish = async (values: any) => {
    setLoading(true);
    let patientIdsFromAppointments: string[] | null = null;

    // Step 1: If appointment filters are present, get the list of patient IDs first.
    if (values.id_bac_si || values.month) {
      let appointmentQuery = supabase.from('lich_kham').select('id_benh_nhan');
      if (values.id_bac_si) {
        appointmentQuery = appointmentQuery.eq('id_bac_si', values.id_bac_si);
      }
      if (values.month) {
        const year = values.month.year();
        const month = values.month.month();
        const startDate = new Date(year, month, 1).toISOString();
        const endDate = new Date(year, month + 1, 0).toISOString();
        appointmentQuery = appointmentQuery
          .gte('thoi_gian_kham', startDate)
          .lte('thoi_gian_kham', endDate)
          .eq('trang_thai', 'Đã Khám');
      }
      const { data: appointmentData, error: appointmentError } = await appointmentQuery;
      if (appointmentData) {
        patientIdsFromAppointments = [...new Set(appointmentData.map(a => a.id_benh_nhan))];
        if (patientIdsFromAppointments.length === 0) {
            setPatients([]);
            setLoading(false);
            return;
        }
      }
    }

    // Step 2: Query the patients table, applying all filters.
    let patientQuery = supabase.from('benh_nhan').select('*');
    if (values.ho_ten) {
      patientQuery = patientQuery.ilike('ho_ten', `%${values.ho_ten}%`);
    }
    if (patientIdsFromAppointments) {
      patientQuery = patientQuery.in('id_benh_nhan', patientIdsFromAppointments);
    }

    const { data, error } = await patientQuery;
    if (data) {
      setPatients(data);
    }
    setLoading(false);
  };

  const handleEdit = (patientId: string) => {
    router.push(`/dashboard/patients/edit/${patientId}`);
  };

  const handleViewDetails = (record: any) => {
    setSelectedPatientDetails(record);
    setIsDetailsModalVisible(true);
  };

  const handleDelete = (patientId: string) => {
    Modal.confirm({
      title: 'Bạn có chắc chắn muốn xoá bệnh nhân này?',
      content: 'Hành động này sẽ xoá bệnh nhân và tất cả các lịch khám liên quan. Không thể hoàn tác.',
      onOk: async () => {
        try {
          await supabase.from('lich_kham').delete().eq('id_benh_nhan', patientId);
          const { error } = await supabase.from('benh_nhan').delete().eq('id_benh_nhan', patientId);
          if (error) throw error;
          message.success('Xoá bệnh nhân thành công');
          fetchInitialPatients();
        } catch (error: any) {
          message.error(`Lỗi: ${error.message}`);
        }
      },
    });
  };

  const columns = [
    { title: 'Họ tên', dataIndex: 'ho_ten', key: 'ho_ten', width: 180 },
    { title: 'Giới tính', dataIndex: 'gioi_tinh', key: 'gioi_tinh', width: 100 },
    { title: 'Địa chỉ', dataIndex: 'dia_chi', key: 'dia_chi', width: 250, ellipsis: true },
    { title: 'Số điện thoại', dataIndex: 'so_dien_thoai', key: 'so_dien_thoai', width: 120, ellipsis: true },
    { title: 'CCCD', dataIndex: 'cccd', key: 'cccd', width: 120, ellipsis: true },
    {
      title: 'Hành động',
      key: 'action',
      width: 280,
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button onClick={() => handleViewDetails(record)}>Chi tiết</Button>
          <Button onClick={() => handleEdit(record.id_benh_nhan)}>Sửa thông tin</Button>
          <Button danger onClick={() => handleDelete(record.id_benh_nhan)}>Xoá</Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card title="Quản lý & Tra cứu Bệnh nhân">
        <Form form={form} onFinish={onFinish} layout="vertical" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="ho_ten" label="Tra cứu theo tên bệnh nhân">
                <Input placeholder="Nhập tên bệnh nhân" allowClear />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="id_bac_si" label="Tra cứu theo bác sĩ khám">
                <Select placeholder="Chọn bác sĩ" allowClear>
                  {doctors.map(doctor => (
                    <Option key={doctor.id_bac_si} value={doctor.id_bac_si}>{`${doctor.ho_ten} (${doctor.chuyen_khoa})`}</Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="month" label="Bệnh nhân đã khám trong tháng/năm">
                <DatePicker.MonthPicker style={{ width: '100%' }} placeholder="Chọn tháng" />
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col span={24} style={{ textAlign: 'right' }}>
                <Button type="primary" htmlType="submit">Tìm kiếm</Button>
                <Button style={{ marginLeft: 8 }} onClick={() => { form.resetFields(); fetchInitialPatients(); }}>Reset</Button>
            </Col>
          </Row>
        </Form>
        <Table
          columns={columns}
          dataSource={patients}
          loading={loading}
          rowKey="id_benh_nhan"
          tableLayout="fixed"
          scroll={{ x: 'max-content' }}
        />
      </Card>

      {selectedPatientDetails && (
        <Modal
          title="Chi tiết Bệnh nhân"
          visible={isDetailsModalVisible}
          onCancel={() => setIsDetailsModalVisible(false)}
          footer={<Button onClick={() => setIsDetailsModalVisible(false)}>Đóng</Button>}
          width={600}
        >
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Họ tên">{selectedPatientDetails.ho_ten}</Descriptions.Item>
            <Descriptions.Item label="Ngày sinh">{new Date(selectedPatientDetails.ngay_sinh).toLocaleDateString()}</Descriptions.Item>
            <Descriptions.Item label="Giới tính">{selectedPatientDetails.gioi_tinh}</Descriptions.Item>
            <Descriptions.Item label="Địa chỉ">{selectedPatientDetails.dia_chi}</Descriptions.Item>
            <Descriptions.Item label="Số điện thoại">{selectedPatientDetails.so_dien_thoai}</Descriptions.Item>
            <Descriptions.Item label="CCCD">{selectedPatientDetails.cccd}</Descriptions.Item>
          </Descriptions>
        </Modal>
      )}
    </>
  );
};

export default PatientsPage;
