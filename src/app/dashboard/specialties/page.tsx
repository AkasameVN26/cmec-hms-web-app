'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, message, Popconfirm, Spin, Alert, Space, Select } from 'antd';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

const { Option } = Select;

const SpecialtyPage = () => {
  const { can, loading: authLoading } = useAuth();
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingSpecialty, setEditingSpecialty] = useState<any | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchSpecialties();
  }, []);

  const fetchSpecialties = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('chuyen_khoa').select('*').order('ten_chuyen_khoa');
    if (data) setSpecialties(data);
    setLoading(false);
  };

  const handleAddNew = () => {
    setEditingSpecialty(null);
    form.resetFields();
    form.setFieldsValue({ loai_khoa: 'Lâm sàng' });
    setIsModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingSpecialty(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    const { error } = await supabase.from('chuyen_khoa').delete().eq('id_chuyen_khoa', id);
    if (error) {
      message.error(`Lỗi khi xoá: ${error.message}. Có thể chuyên khoa này đang được sử dụng.`);
    } else {
      message.success('Xoá chuyên khoa thành công');
      fetchSpecialties();
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      let error;

      if (editingSpecialty) {
        const { error: updateError } = await supabase.from('chuyen_khoa').update(values).eq('id_chuyen_khoa', editingSpecialty.id_chuyen_khoa);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('chuyen_khoa').insert([values]);
        error = insertError;
      }

      if (error) {
        message.error(error.message);
      } else {
        message.success(editingSpecialty ? 'Cập nhật thành công!' : 'Thêm mới thành công!');
        setIsModalVisible(false);
        fetchSpecialties();
      }
    } catch (info) {
      console.log('Validate Failed:', info);
    }
  };

  const columns = [
    { title: 'Tên chuyên khoa', dataIndex: 'ten_chuyen_khoa', key: 'ten_chuyen_khoa' },
    { title: 'Loại khoa', dataIndex: 'loai_khoa', key: 'loai_khoa' },
    {
      title: 'Hành động',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button onClick={() => handleEdit(record)}>Sửa</Button>
          <Popconfirm title="Bạn có chắc muốn xoá?" onConfirm={() => handleDelete(record.id_chuyen_khoa)} okText="Xoá" cancelText="Huỷ">
            <Button danger>Xoá</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (authLoading) {
    return <Spin tip="Đang tải..." />;
  }

  if (!can('clinic.specialty.manage')) {
    return <Alert message="Truy cập bị từ chối" description="Bạn không có quyền truy cập trang này." type="error" showIcon />;
  }

  return (
    <>
      <Card title="Quản lý Chuyên khoa" extra={<Button type="primary" onClick={handleAddNew}>Thêm chuyên khoa</Button>}>
        <Table columns={columns} dataSource={specialties} loading={loading} rowKey="id_chuyen_khoa" />
      </Card>

      <Modal
        title={editingSpecialty ? 'Chỉnh sửa chuyên khoa' : 'Thêm chuyên khoa mới'}
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={() => setIsModalVisible(false)}
        okText={editingSpecialty ? 'Cập nhật' : 'Thêm'}
        cancelText="Huỷ"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="ten_chuyen_khoa" label="Tên chuyên khoa" rules={[{ required: true, message: 'Vui lòng nhập tên chuyên khoa' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="loai_khoa" label="Loại chuyên khoa" rules={[{ required: true, message: 'Vui lòng chọn loại chuyên khoa' }]}>
            <Select placeholder="Chọn loại chuyên khoa">
                <Option value="Lâm sàng">Lâm sàng</Option>
                <Option value="Cận lâm sàng">Cận lâm sàng</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default SpecialtyPage;
