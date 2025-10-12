'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Select, DatePicker, Button, Form, Row, Col, Space, Modal, message, Descriptions, Spin, Input } from 'antd';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';

const { Option } = Select;

const PatientsPage = () => {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [isPatientModalVisible, setIsPatientModalVisible] = useState(false);
  const [editingPatient, setEditingPatient] = useState<any | null>(null);
  const [selectedPatientDetails, setSelectedPatientDetails] = useState<any | null>(null);
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();
  const router = useRouter();

  useEffect(() => {
    fetchInitialPatients();
  }, []);

  const fetchInitialPatients = async () => {
    setLoading(true);
    const { data, error } = await supabase
        .from('benh_nhan')
        .select('*, ho_so_benh_an(id_ho_so, trang_thai)')
        .order('ho_ten');

    if (error) {
        message.error("Lỗi khi tải danh sách bệnh nhân: " + error.message);
    } else if (data) {
        const processedPatients = data.map(patient => {
            const openRecord = patient.ho_so_benh_an.find((record: any) => record.trang_thai === 'Đang xử lý');
            return {
                ...patient,
                open_record_id: openRecord ? openRecord.id_ho_so : null
            };
        });
        setPatients(processedPatients);
    }
    setLoading(false);
  };

  const onSearch = async (values: any) => {
    setLoading(true);
    let patientQuery = supabase.from('benh_nhan').select('*, ho_so_benh_an(id_ho_so, trang_thai)');
    
    if (values.ho_ten) {
      patientQuery = patientQuery.ilike('ho_ten', `%${values.ho_ten}%`);
    }
    if (values.so_dien_thoai) {
      patientQuery = patientQuery.eq('so_dien_thoai', values.so_dien_thoai);
    }
    if (values.cccd) {
      patientQuery = patientQuery.eq('cccd', values.cccd);
    }

    const { data, error } = await patientQuery.order('ho_ten');
    if (data) {
        const processedPatients = data.map(patient => {
            const openRecord = patient.ho_so_benh_an.find((record: any) => record.trang_thai === 'Đang xử lý');
            return {
                ...patient,
                open_record_id: openRecord ? openRecord.id_ho_so : null
            };
        });
        setPatients(processedPatients);
    }
    setLoading(false);
  };

  const handleAddNew = () => {
    setEditingPatient(null);
    form.resetFields();
    setIsPatientModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingPatient(record);
    form.setFieldsValue({ ...record, ngay_sinh: record.ngay_sinh ? dayjs(record.ngay_sinh) : null });
    setIsPatientModalVisible(true);
  };

  const handleViewDetails = (record: any) => {
    setSelectedPatientDetails(record);
    setIsDetailsModalVisible(true);
  };

  const handleDelete = (patientId: string) => {
    Modal.confirm({
      title: 'Bạn có chắc chắn muốn xoá bệnh nhân này?',
      content: 'Hành động này sẽ xoá vĩnh viễn bệnh nhân và tất cả các dữ liệu liên quan (hồ sơ bệnh án, lịch khám...). KHÔNG THỂ HOÀN TÁC.',
      okText: 'Xác nhận Xoá',
      cancelText: 'Huỷ',
      onOk: async () => {
        try {
          const { error } = await supabase.rpc('delete_patient_and_related_data', { p_patient_id: patientId });
          if (error) throw error;
          message.success('Xoá bệnh nhân thành công');
          fetchInitialPatients();
        } catch (error: any) {
          message.error(`Lỗi: ${error.message}`);
        }
      },
    });
  };

  const handleModalOk = async () => {
    try {
        const values = await form.validateFields();
        const submissionData = { ...values, ngay_sinh: values.ngay_sinh ? values.ngay_sinh.format('YYYY-MM-DD') : null };
        let error;

        if (editingPatient) {
            const { error: updateError } = await supabase.from('benh_nhan').update(submissionData).eq('id_benh_nhan', editingPatient.id_benh_nhan);
            error = updateError;
        } else {
            const { error: insertError } = await supabase.from('benh_nhan').insert([submissionData]);
            error = insertError;
        }

        if (error) {
            message.error(error.message);
        } else {
            message.success(editingPatient ? 'Cập nhật thành công!' : 'Thêm bệnh nhân thành công!');
            setIsPatientModalVisible(false);
            fetchInitialPatients();
        }
    } catch (err) {
        console.log('Validation Failed:', err);
    }
  };

  const handleCreateMedicalRecord = async (patient: any) => {
    Modal.confirm({
        title: 'Xác nhận tạo hồ sơ bệnh án mới',
        content: `Tạo một hồ sơ ngoại trú mới cho bệnh nhân "${patient.ho_ten}"?`,
        onOk: async () => {
            const { error } = await supabase.from('ho_so_benh_an').insert({ id_benh_nhan: patient.id_benh_nhan });
            if (error) {
                message.error(`Lỗi khi tạo hồ sơ: ${error.message}`);
            } else {
                message.success('Tạo hồ sơ bệnh án mới thành công!');
                fetchInitialPatients(); // Refresh data to update button state
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
      width: 320,
      render: (_: any, record: any) => (
        <Space size="small">
            {record.open_record_id ? (
                <Button type="primary" onClick={() => router.push(`/dashboard/appointments/${record.open_record_id}`)}>
                    Xem hồ sơ
                </Button>
            ) : (
                <Button onClick={() => handleCreateMedicalRecord(record)}>
                    Tạo hồ sơ
                </Button>
            )}
          <Button onClick={() => handleViewDetails(record)}>Chi tiết</Button>
          <Button onClick={() => handleEdit(record)}>Sửa</Button>
          <Button danger onClick={() => handleDelete(record.id_benh_nhan)}>Xoá</Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card title="Quản lý & Tra cứu Bệnh nhân" extra={<Button type="primary" onClick={handleAddNew}>Thêm bệnh nhân</Button>}>
        <Form form={searchForm} onFinish={onSearch} layout="vertical" style={{ marginBottom: 24 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="ho_ten" label="Tra cứu theo tên bệnh nhân">
                <Input placeholder="Nhập tên bệnh nhân" allowClear />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="so_dien_thoai" label="Tra cứu theo SĐT">
                <Input placeholder="Nhập số điện thoại" allowClear />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="cccd" label="Tra cứu theo CCCD">
                <Input placeholder="Nhập số CCCD" allowClear />
              </Form.Item>
            </Col>
          </Row>
          <Row>
            <Col span={24} style={{ textAlign: 'right' }}>
                <Button type="primary" htmlType="submit">Tìm kiếm</Button>
                <Button style={{ marginLeft: 8 }} onClick={() => { searchForm.resetFields(); fetchInitialPatients(); }}>Reset</Button>
            </Col>
          </Row>
        </Form>
        <Table columns={columns} dataSource={patients} loading={loading} rowKey="id_benh_nhan" tableLayout="fixed" scroll={{ x: 'max-content' }} />
      </Card>

      <Modal title="Chi tiết Bệnh nhân" visible={isDetailsModalVisible} onCancel={() => setIsDetailsModalVisible(false)} footer={<Button onClick={() => setIsDetailsModalVisible(false)}>Đóng</Button>} width={600}>
        {selectedPatientDetails && <Descriptions bordered column={1}>
            <Descriptions.Item label="Họ tên">{selectedPatientDetails.ho_ten}</Descriptions.Item>
            <Descriptions.Item label="Ngày sinh">{selectedPatientDetails.ngay_sinh ? new Date(selectedPatientDetails.ngay_sinh).toLocaleDateString() : '-'}</Descriptions.Item>
            <Descriptions.Item label="Giới tính">{selectedPatientDetails.gioi_tinh}</Descriptions.Item>
            <Descriptions.Item label="Địa chỉ">{selectedPatientDetails.dia_chi}</Descriptions.Item>
            <Descriptions.Item label="Số điện thoại">{selectedPatientDetails.so_dien_thoai}</Descriptions.Item>
            <Descriptions.Item label="CCCD">{selectedPatientDetails.cccd}</Descriptions.Item>
        </Descriptions>}
      </Modal>

      <Modal title={editingPatient ? 'Cập nhật Bệnh nhân' : 'Thêm Bệnh nhân mới'} visible={isPatientModalVisible} onOk={handleModalOk} onCancel={() => setIsPatientModalVisible(false)} okText="Lưu" cancelText="Huỷ">
        <Form form={form} layout="vertical">
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
            <Form.Item name="dia_chi" label="Địa chỉ">
                <Input />
            </Form.Item>
            <Form.Item name="so_dien_thoai" label="Số điện thoại">
                <Input />
            </Form.Item>
            <Form.Item name="cccd" label="CCCD" rules={[{ required: true }]}>
                <Input />
            </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default PatientsPage;
