'use client';

import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Popconfirm, Breadcrumb, Card, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, HomeOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

const { Option } = Select;

interface Bed {
  id_giuong_benh: number;
  so_giuong: string;
  trang_thai_giuong: string;
  id_phong: number;
  phong_benh: {
    ten_phong: string;
    khu_dieu_tri: {
        ten_khu: string;
    }
  };
}

interface Room {
  id_phong: number;
  ten_phong: string;
}

const BedsPage = () => {
  const { can } = useAuth();
  const [beds, setBeds] = useState<Bed[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingBed, setEditingBed] = useState<Bed | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form] = Form.useForm();

  const bedStatusOptions = ['Trống', 'Đang sử dụng'];

  useEffect(() => {
    fetchBeds();
    fetchRooms();
  }, []);

  const fetchBeds = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('giuong_benh')
      .select(`
        id_giuong_benh,
        so_giuong,
        trang_thai_giuong,
        id_phong,
        phong_benh!inner (
          ten_phong,
          khu_dieu_tri!inner ( ten_khu )
        )
      `)
      .order('so_giuong', { ascending: true });

    if (error) {
      message.error(`Lỗi khi tải dữ liệu giường bệnh: ${error.message}`);
    } else {
      setBeds(data || []);
    }
    setLoading(false);
  };

  const fetchRooms = async () => {
    const { data, error } = await supabase
      .from('phong_benh')
      .select('id_phong, ten_phong')
      .order('ten_phong', { ascending: true });
    
    if (error) {
      message.error(`Lỗi khi tải danh sách phòng bệnh: ${error.message}`);
    } else {
      setRooms(data || []);
    }
  };

  const handleAdd = () => {
    setEditingBed(null);
    form.resetFields();
    form.setFieldsValue({ trang_thai_giuong: 'Trống' });
    setIsModalVisible(true);
  };

  const handleEdit = (bed: Bed) => {
    setEditingBed(bed);
    form.setFieldsValue(bed);
    setIsModalVisible(true);
  };

  const handleDelete = async (id_giuong_benh: number) => {
    if (!can('facility.bed.manage')) {
        message.error('Bạn không có quyền thực hiện hành động này.');
        return;
    }
    const { error } = await supabase.from('giuong_benh').delete().eq('id_giuong_benh', id_giuong_benh);

    if (error) {
      message.error(`Lỗi khi xóa giường bệnh: ${error.message}`);
    } else {
      message.success('Xóa giường bệnh thành công!');
      fetchBeds();
    }
  };

  const handleOk = async () => {
    if (!can('facility.bed.manage')) {
        message.error('Bạn không có quyền thực hiện hành động này.');
        return;
    }
    try {
      setIsSubmitting(true);
      const values = await form.validateFields();
      let error;

      if (editingBed) {
        ({ error } = await supabase.from('giuong_benh').update(values).eq('id_giuong_benh', editingBed.id_giuong_benh));
      } else {
        ({ error } = await supabase.from('giuong_benh').insert([values]));
      }

      if (error) {
        message.error(`Lỗi khi ${editingBed ? 'cập nhật' : 'thêm'} giường bệnh: ${error.message}`);
      } else {
        message.success(`${editingBed ? 'Cập nhật' : 'Thêm'} giường bệnh thành công!`);
        fetchBeds();
        setIsModalVisible(false);
      }
    } catch (info) {
      console.log('Validate Failed:', info);
    }
    finally {
        setIsSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'STT',
      key: 'stt',
      render: (text: any, record: any, index: number) => index + 1,
      width: 70,
    },
    {
      title: 'Số Giường',
      dataIndex: 'so_giuong',
      key: 'so_giuong',
    },
    {
        title: 'Phòng Bệnh',
        dataIndex: 'phong_benh',
        key: 'phong_benh',
        render: (phong_benh) => phong_benh ? phong_benh.ten_phong : '-',
    },
    {
        title: 'Khu Điều Trị',
        dataIndex: 'phong_benh',
        key: 'khu_dieu_tri',
        render: (phong_benh) => phong_benh?.khu_dieu_tri ? phong_benh.khu_dieu_tri.ten_khu : '-',
    },
    {
      title: 'Trạng Thái',
      dataIndex: 'trang_thai_giuong',
      key: 'trang_thai_giuong',
      render: (status: string) => (
        <Tag color={status === 'Trống' ? 'green' : 'red'}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Hành Động',
      key: 'action',
      render: (text: any, record: Bed) => (
        <span>
          <Button
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            style={{ marginRight: 8 }}
            disabled={!can('facility.bed.manage')}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Bạn có chắc muốn xóa giường bệnh này?"
            onConfirm={() => handleDelete(record.id_giuong_benh)}
            okText="Xóa"
            cancelText="Hủy"
            disabled={!can('facility.bed.manage')}
          >
            <Button icon={<DeleteOutlined />} danger disabled={!can('facility.bed.manage')}> 
              Xóa
            </Button>
          </Popconfirm>
        </span>
      ),
      width: 220,
    },
  ];

  return (
    <>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h1 style={{ fontSize: '24px', margin: 0 }}>Quản lý Giường Bệnh</h1>
            {can('facility.bed.manage') && (
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                    Thêm Giường Bệnh
                </Button>
            )}
        </div>
        <Table
            columns={columns}
            dataSource={beds}
            loading={loading}
            rowKey="id_giuong_benh"
            bordered
        />
        <Modal
            title={editingBed ? 'Chỉnh Sửa Giường Bệnh' : 'Thêm Giường Bệnh Mới'}
            visible={isModalVisible}
            onOk={handleOk}
            onCancel={() => setIsModalVisible(false)}
            confirmLoading={isSubmitting}
        >
            <Form form={form} layout="vertical" name="bed_form">
                <Form.Item
                    name="so_giuong"
                    label="Số Giường"
                    rules={[{ required: true, message: 'Vui lòng nhập số giường!' }]}
                >
                    <Input />
                </Form.Item>
                <Form.Item
                    name="id_phong"
                    label="Phòng Bệnh"
                    rules={[{ required: true, message: 'Vui lòng chọn phòng bệnh!' }]} 
                >
                    <Select placeholder="Chọn phòng bệnh">
                    {rooms.map(room => (
                        <Option key={room.id_phong} value={room.id_phong}>
                        {room.ten_phong}
                        </Option>
                    ))}
                    </Select>
                </Form.Item>
                <Form.Item
                    name="trang_thai_giuong"
                    label="Trạng Thái"
                    rules={[{ required: true, message: 'Vui lòng chọn trạng thái!' }]} 
                >
                    <Select placeholder="Chọn trạng thái">
                        {bedStatusOptions.map(status => (
                            <Option key={status} value={status}>{status}</Option>
                        ))}
                    </Select>
                </Form.Item>
            </Form>
        </Modal>
    </>
  );
};

export default BedsPage;
