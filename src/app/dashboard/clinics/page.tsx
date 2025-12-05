'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, message, Space, InputNumber } from 'antd';
import { supabase } from '@/lib/supabase';

const ClinicsPage = () => {
  const [clinics, setClinics] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingClinic, setEditingClinic] = useState<any | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchClinics();
  }, []);

  const fetchClinics = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('phong_kham').select('*');
    if (data) setClinics(data);
    setLoading(false);
  };

  const handleEdit = (record: any) => {
    setEditingClinic(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleDelete = (clinicId: number) => {
    Modal.confirm({
      title: 'Bạn có chắc chắn muốn xoá phòng khám này?',
      content: 'Hành động này không thể hoàn tác.',
      onOk: async () => {
        const { error } = await supabase.from('phong_kham').delete().eq('id_phong_kham', clinicId);
        if (error) {
          message.error(error.message);
        } else {
          message.success('Xoá thành công!');
          fetchClinics();
        }
      },
    });
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingClinic(null);
    form.resetFields();
  };

  const onFinish = async (values: any) => {
    if (editingClinic) {
      // Update existing clinic
      const { error } = await supabase
        .from('phong_kham')
        .update(values)
        .eq('id_phong_kham', editingClinic.id_phong_kham);
      if (error) {
        message.error(error.message);
      } else {
        message.success('Cập nhật thành công!');
        handleCancel();
        fetchClinics();
      }
    } else {
      // Create new clinic
      const { error } = await supabase.from('phong_kham').insert([values]);
      if (error) {
        message.error(error.message);
      } else {
        message.success('Tạo mới thành công!');
        handleCancel();
        fetchClinics();
      }
    }
  };

  const columns = [
    { title: 'Tên phòng khám', dataIndex: 'ten_phong_kham', key: 'ten_phong_kham' },
    { title: 'Vị trí', dataIndex: 'vi_tri', key: 'vi_tri' },
    {
        title: 'Chi phí vận hành (VND/tháng)',
        dataIndex: 'chi_phi_van_hanh',
        key: 'chi_phi_van_hanh',
        render: (cost: number) => cost ? cost.toLocaleString() : 'N/A'
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button onClick={() => handleEdit(record)}>Cập nhật</Button>
          <Button danger onClick={() => handleDelete(record.id_phong_kham)}>Xoá</Button>
        </Space>
      ),
    },
  ];

  return (
    <Card title="Quản lý Phòng khám">
      <Button type="primary" onClick={() => setIsModalVisible(true)} style={{ marginBottom: 16 }}>
        Thêm phòng khám
      </Button>
      <Table
        columns={columns}
        dataSource={clinics}
        loading={loading}
        rowKey="id_phong_kham"
      />
      <Modal
        title={editingClinic ? 'Cập nhật phòng khám' : 'Thêm phòng khám'}
        visible={isModalVisible}
        onCancel={handleCancel}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="ten_phong_kham" label="Tên phòng khám" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="vi_tri" label="Vị trí" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="chi_phi_van_hanh" label="Chi phí vận hành (VND/tháng)" rules={[{ required: true }]}>
            <InputNumber<number> style={{ width: '100%' }} min={0} formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')} parser={(value) => value ? parseInt(value.replace(/\./g, '')) : 0} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              {editingClinic ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default ClinicsPage;
export const dynamic = 'force-dynamic';
