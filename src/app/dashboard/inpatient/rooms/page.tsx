'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, message, Popconfirm, Select } from 'antd';
import { supabase } from '@/lib/supabase';

const { Option } = Select;

const InpatientRoomsPage = () => {
  const [rooms, setRooms] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRoom, setEditingRoom] = useState<any | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchRooms();
    fetchWards();
  }, []);

  const fetchRooms = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('phong_benh').select(`
      *,
      khu_dieu_tri:id_khu_dieu_tri ( ten_khu_dieu_tri )
    `).order('ten_phong_benh');
    if (data) setRooms(data);
    setLoading(false);
  };

  const fetchWards = async () => {
    const { data } = await supabase.from('khu_dieu_tri').select('*');
    if (data) setWards(data);
  };

  const handleAddNew = () => {
    setEditingRoom(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingRoom(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleDelete = async (id_phong_benh: number) => {
    const { error } = await supabase.from('phong_benh').delete().eq('id_phong_benh', id_phong_benh);
    if (error) {
      message.error(`Lỗi khi xoá: ${error.message}. Có thể phòng này vẫn còn giường bệnh.`);
    } else {
      message.success('Xoá phòng bệnh thành công');
      fetchRooms();
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      let error;

      if (editingRoom) {
        const { error: updateError } = await supabase.from('phong_benh').update(values).eq('id_phong_benh', editingRoom.id_phong_benh);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('phong_benh').insert([values]);
        error = insertError;
      }

      if (error) {
        message.error(error.message);
      } else {
        message.success(editingRoom ? 'Cập nhật thành công!' : 'Thêm mới thành công!');
        setIsModalVisible(false);
        fetchRooms();
      }
    } catch (info) {
      console.log('Validate Failed:', info);
    }
  };

  const columns = [
    { title: 'Mã Phòng', dataIndex: 'id_phong_benh', key: 'id_phong_benh' },
    { title: 'Tên Phòng Bệnh', dataIndex: 'ten_phong_benh', key: 'ten_phong_benh' },
    { title: 'Loại phòng', dataIndex: 'loai_phong', key: 'loai_phong' },
    { title: 'Khu Điều Trị', dataIndex: ['khu_dieu_tri', 'ten_khu_dieu_tri'], key: 'khu_dieu_tri' },
    {
      title: 'Hành động',
      key: 'action',
      render: (_: any, record: any) => (
        <span className="flex gap-2">
          <Button onClick={() => handleEdit(record)}>Sửa</Button>
          <Popconfirm
            title="Bạn có chắc muốn xoá phòng này?"
            onConfirm={() => handleDelete(record.id_phong_benh)}
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
        title="Quản lý Phòng bệnh"
        extra={<Button type="primary" onClick={handleAddNew}>Thêm phòng mới</Button>}
      >
        <Table
          columns={columns}
          dataSource={rooms}
          loading={loading}
          rowKey="id_phong_benh"
        />
      </Card>

      <Modal
        title={editingRoom ? 'Chỉnh sửa Phòng bệnh' : 'Thêm Phòng bệnh mới'}
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={() => setIsModalVisible(false)}
        okText={editingRoom ? 'Cập nhật' : 'Thêm'}
        cancelText="Huỷ"
      >
        <Form form={form} layout="vertical" name="room_form">
          <Form.Item name="ten_phong_benh" label="Tên Phòng Bệnh" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="id_khu_dieu_tri" label="Khu Điều Trị" rules={[{ required: true }]}>
            <Select placeholder="Chọn khu điều trị">
              {wards.map(w => <Option key={w.id_khu_dieu_tri} value={w.id_khu_dieu_tri}>{w.ten_khu_dieu_tri}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="loai_phong" label="Loại phòng">
            <Input placeholder="VD: Phòng thường, Phòng VIP..."/>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default InpatientRoomsPage;