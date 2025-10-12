'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, message, Popconfirm, Select, Tag } from 'antd';
import { supabase } from '@/lib/supabase';

const { Option } = Select;

const BedsPage = () => {
  const [beds, setBeds] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingBed, setEditingBed] = useState<any | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchBeds();
    fetchRooms();
  }, []);

  const fetchBeds = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('giuong_benh').select(`
      *,
      phong_benh:id_phong_benh (
        ten_phong_benh,
        khu_dieu_tri:id_khu_dieu_tri ( ten_khu_dieu_tri )
      )
    `).order('ten_giuong_benh');
    if (data) setBeds(data);
    setLoading(false);
  };

  const fetchRooms = async () => {
    const { data } = await supabase.from('phong_benh').select('id_phong_benh, ten_phong_benh');
    if (data) setRooms(data);
  };

  const handleAddNew = () => {
    setEditingBed(null);
    form.resetFields({ trang_thai: 'Trống' });
    setIsModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingBed(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleDelete = async (id_giuong_benh: number) => {
    const { error } = await supabase.from('giuong_benh').delete().eq('id_giuong_benh', id_giuong_benh);
    if (error) {
      message.error(`Lỗi khi xoá: ${error.message}. Có thể giường này đang được sử dụng.`);
    } else {
      message.success('Xoá giường bệnh thành công');
      fetchBeds();
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      let error;

      if (editingBed) {
        const { error: updateError } = await supabase.from('giuong_benh').update(values).eq('id_giuong_benh', editingBed.id_giuong_benh);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('giuong_benh').insert([values]);
        error = insertError;
      }

      if (error) {
        message.error(error.message);
      } else {
        message.success(editingBed ? 'Cập nhật thành công!' : 'Thêm mới thành công!');
        setIsModalVisible(false);
        fetchBeds();
      }
    } catch (info) {
      console.log('Validate Failed:', info);
    }
  };

  const getStatusTag = (status: string) => {
    return <Tag color={status === 'Trống' ? 'green' : 'red'}>{status}</Tag>;
  };

  const columns = [
    { title: 'Mã Giường', dataIndex: 'id_giuong_benh', key: 'id_giuong_benh' },
    { title: 'Tên/Số Giường', dataIndex: 'ten_giuong_benh', key: 'ten_giuong_benh' },
    { title: 'Trạng thái', dataIndex: 'trang_thai', key: 'trang_thai', render: getStatusTag },
    { title: 'Phòng Bệnh', dataIndex: ['phong_benh', 'ten_phong_benh'], key: 'phong_benh' },
    { title: 'Khu Điều Trị', dataIndex: ['phong_benh', 'khu_dieu_tri', 'ten_khu_dieu_tri'], key: 'khu_dieu_tri' },
    {
      title: 'Hành động',
      key: 'action',
      render: (_: any, record: any) => (
        <span className="flex gap-2">
          <Button onClick={() => handleEdit(record)}>Sửa</Button>
          <Popconfirm
            title="Bạn có chắc muốn xoá giường này?"
            onConfirm={() => handleDelete(record.id_giuong_benh)}
            okText="Xoá"
            cancelText="Huỷ"
            disabled={record.trang_thai !== 'Trống'}
          >
            <Button danger disabled={record.trang_thai !== 'Trống'}>Xoá</Button>
          </Popconfirm>
        </span>
      ),
    },
  ];

  return (
    <>
      <Card 
        title="Quản lý Giường bệnh"
        extra={<Button type="primary" onClick={handleAddNew}>Thêm giường mới</Button>}
      >
        <Table
          columns={columns}
          dataSource={beds}
          loading={loading}
          rowKey="id_giuong_benh"
        />
      </Card>

      <Modal
        title={editingBed ? 'Chỉnh sửa Giường bệnh' : 'Thêm Giường bệnh mới'}
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={() => setIsModalVisible(false)}
        okText={editingBed ? 'Cập nhật' : 'Thêm'}
        cancelText="Huỷ"
      >
        <Form form={form} layout="vertical" name="bed_form">
          <Form.Item name="ten_giuong_benh" label="Tên/Số Giường" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="id_phong_benh" label="Phòng Bệnh" rules={[{ required: true }]}>
            <Select placeholder="Chọn phòng bệnh">
              {rooms.map(r => <Option key={r.id_phong_benh} value={r.id_phong_benh}>{r.ten_phong_benh}</Option>)}
            </Select>
          </Form.Item>
           <Form.Item name="trang_thai" label="Trạng thái" rules={[{ required: true }]}>
            <Select placeholder="Chọn trạng thái">
              <Option value="Trống">Trống</Option>
              <Option value="Có người">Có người</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default BedsPage;