'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, message, Popconfirm } from 'antd';
import { supabase } from '@/lib/supabase';

const WardsPage = () => {
  const [wards, setWards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingWard, setEditingWard] = useState<any | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchWards();
  }, []);

  const fetchWards = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('khu_dieu_tri').select('*').order('ten_khu_dieu_tri');
    if (data) setWards(data);
    setLoading(false);
  };

  const handleAddNew = () => {
    setEditingWard(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingWard(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleDelete = async (id_khu_dieu_tri: number) => {
    const { error } = await supabase.from('khu_dieu_tri').delete().eq('id_khu_dieu_tri', id_khu_dieu_tri);
    if (error) {
      message.error(`Lỗi khi xoá: ${error.message}. Có thể khu này vẫn còn phòng bệnh.`);
    } else {
      message.success('Xoá khu điều trị thành công');
      fetchWards();
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      let error;

      if (editingWard) {
        const { error: updateError } = await supabase.from('khu_dieu_tri').update(values).eq('id_khu_dieu_tri', editingWard.id_khu_dieu_tri);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('khu_dieu_tri').insert([values]);
        error = insertError;
      }

      if (error) {
        message.error(error.message);
      } else {
        message.success(editingWard ? 'Cập nhật thành công!' : 'Thêm mới thành công!');
        setIsModalVisible(false);
        fetchWards();
      }
    } catch (info) {
      console.log('Validate Failed:', info);
    }
  };

  const columns = [
    { title: 'Mã Khu', dataIndex: 'id_khu_dieu_tri', key: 'id_khu_dieu_tri', sorter: (a, b) => a.id_khu_dieu_tri - b.id_khu_dieu_tri },
    { title: 'Tên Khu Điều Trị', dataIndex: 'ten_khu_dieu_tri', key: 'ten_khu_dieu_tri', sorter: (a, b) => a.ten_khu_dieu_tri.localeCompare(b.ten_khu_dieu_tri) },
    {
      title: 'Hành động',
      key: 'action',
      render: (_: any, record: any) => (
        <span className="flex gap-2">
          <Button onClick={() => handleEdit(record)}>Sửa</Button>
          <Popconfirm
            title="Bạn có chắc muốn xoá khu này?"
            onConfirm={() => handleDelete(record.id_khu_dieu_tri)}
            okText="Xoá"
            cancelText="Huỷ"
          >
            <Button danger>Xoá</Button>
          </Popconfirm>
        </span>
      ),
    },
  ];

  return (
    <>
      <Card 
        title="Quản lý Khu điều trị"
        extra={<Button type="primary" onClick={handleAddNew}>Thêm khu mới</Button>}
      >
        <Table
          columns={columns}
          dataSource={wards}
          loading={loading}
          rowKey="id_khu_dieu_tri"
        />
      </Card>

      <Modal
        title={editingWard ? 'Chỉnh sửa Khu điều trị' : 'Thêm Khu điều trị mới'}
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={() => setIsModalVisible(false)}
        okText={editingWard ? 'Cập nhật' : 'Thêm'}
        cancelText="Huỷ"
      >
        <Form form={form} layout="vertical" name="ward_form">
          <Form.Item name="ten_khu_dieu_tri" label="Tên Khu Điều Trị" rules={[{ required: true, message: 'Vui lòng nhập tên khu' }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default WardsPage;