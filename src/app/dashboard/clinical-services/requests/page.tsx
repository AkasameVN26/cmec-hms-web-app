'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Select, message, Tag, Spin, Alert } from 'antd';
import { supabase } from '@/lib/supabase';

const { Option } = Select;

const ServiceRequestsPage = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRequest, setEditingRequest] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form] = Form.useForm();

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.from('chi_dinh_cls').select(`
        id_chi_dinh,
        thoi_gian_chi_dinh,
        trang_thai,
        lich_kham:id_lich_kham (
          benh_nhan:id_benh_nhan ( ho_ten ),
          bac_si:id_bac_si ( ho_ten )
        ),
        dich_vu_cls:id_dich_vu ( ten_dich_vu ),
        ky_thuat_vien:id_ky_thuat_vien ( id, email )
      `).order('thoi_gian_chi_dinh', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err: any) {
      setError(`Lỗi khi tải danh sách chỉ định: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicians = async () => {
    // Assuming technicians are users with a specific role, e.g., 'Kỹ thuật viên'
    // This needs to be adjusted based on your actual role management setup
    const { data, error } = await supabase.from('tai_khoan').select('id, email').in('vai_tro', ['Bác sĩ', 'Quản lý']); // Adjust roles as needed
    if (data) setTechnicians(data);
  };

  useEffect(() => {
    fetchRequests();
    fetchTechnicians();
  }, []);

  const handleEdit = (record: any) => {
    setEditingRequest(record);
    form.setFieldsValue({
      trang_thai: record.trang_thai,
      id_ky_thuat_vien: record.ky_thuat_vien?.id
    });
    setIsModalVisible(true);
  };

  const handleUpdate = async () => {
    try {
      const values = await form.validateFields();
      if (!editingRequest) return;

      const { error } = await supabase
        .from('chi_dinh_cls')
        .update(values)
        .eq('id_chi_dinh', editingRequest.id_chi_dinh);

      if (error) {
        message.error(`Cập nhật thất bại: ${error.message}`);
      } else {
        message.success('Cập nhật thành công!');
        setIsModalVisible(false);
        fetchRequests();
      }
    } catch (info) {
      console.log('Validate Failed:', info);
    }
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'Đã chỉ định': return <Tag color="blue">Đã chỉ định</Tag>;
      case 'Đang thực hiện': return <Tag color="orange">Đang thực hiện</Tag>;
      case 'Hoàn thành': return <Tag color="green">Hoàn thành</Tag>;
      case 'Đã huỷ': return <Tag color="red">Đã huỷ</Tag>;
      default: return <Tag>{status}</Tag>;
    }
  };

  const columns = [
    { title: 'Mã CĐ', dataIndex: 'id_chi_dinh', key: 'id_chi_dinh' },
    { title: 'Bệnh nhân', dataIndex: ['lich_kham', 'benh_nhan', 'ho_ten'], key: 'patient_name' },
    { title: 'Dịch vụ', dataIndex: ['dich_vu_cls', 'ten_dich_vu'], key: 'service_name' },
    { title: 'Bác sĩ chỉ định', dataIndex: ['lich_kham', 'bac_si', 'ho_ten'], key: 'doctor_name' },
    { title: 'Thời gian chỉ định', dataIndex: 'thoi_gian_chi_dinh', key: 'thoi_gian_chi_dinh', render: (text: string) => new Date(text).toLocaleString() },
    { title: 'Trạng thái', dataIndex: 'trang_thai', key: 'trang_thai', render: getStatusTag },
    { title: 'KTV Thực hiện', dataIndex: ['ky_thuat_vien', 'email'], key: 'technician_name', render: (email: string) => email || 'Chưa có' },
    {
      title: 'Hành động',
      key: 'action',
      render: (_: any, record: any) => (
        <Button onClick={() => handleEdit(record)}>Cập nhật</Button>
      ),
    },
  ];

  if (loading) return <Spin tip="Đang tải..." />;
  if (error) return <Alert message={error} type="error" />;

  return (
    <>
      <Card title="Quản lý Chỉ định Cận lâm sàng">
        <Alert 
            message="Chức năng xử lý và theo dõi."
            description="Trang này dùng để cập nhật trạng thái và phân công người thực hiện cho các chỉ định CLS. Việc tạo chỉ định mới được thực hiện trong mục Quản lý Lịch khám."
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
        />
        <Table
          columns={columns}
          dataSource={requests}
          loading={loading}
          rowKey="id_chi_dinh"
        />
      </Card>

      <Modal
        title="Cập nhật trạng thái chỉ định"
        visible={isModalVisible}
        onOk={handleUpdate}
        onCancel={() => setIsModalVisible(false)}
        okText="Cập nhật"
        cancelText="Huỷ"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="trang_thai" label="Trạng thái" rules={[{ required: true }]}>
            <Select>
              <Option value="Đã chỉ định">Đã chỉ định</Option>
              <Option value="Đang thực hiện">Đang thực hiện</Option>
              <Option value="Hoàn thành">Hoàn thành</Option>
              <Option value="Đã huỷ">Đã huỷ</Option>
            </Select>
          </Form.Item>
          <Form.Item name="id_ky_thuat_vien" label="Kỹ thuật viên thực hiện">
            <Select placeholder="Chọn KTV" allowClear>
              {technicians.map(t => <Option key={t.id} value={t.id}>{t.email}</Option>)}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default ServiceRequestsPage;