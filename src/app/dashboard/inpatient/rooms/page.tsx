'use client';

import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Popconfirm, Breadcrumb, Card, InputNumber } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, HomeOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

const { Option } = Select;

interface Room {
  id_phong: number;
  ten_phong: string;
  id_khu: number;
  chi_phi_van_hanh: number;
  khu_dieu_tri: {
    ten_khu: string;
  };
}

interface Ward {
  id_khu: number;
  ten_khu: string;
}

const RoomsPage = () => {
  const { can } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchRooms();
    fetchWards();
  }, []);

  const fetchRooms = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('phong_benh')
      .select(`
        id_phong,
        ten_phong,
        id_khu,
        chi_phi_van_hanh,
        khu_dieu_tri!inner (
          ten_khu
        )
      `)
      .order('ten_phong', { ascending: true });

    if (error) {
      message.error(`Lỗi khi tải dữ liệu phòng bệnh: ${error.message}`);
    } else {
      setRooms(data || []);
    }
    setLoading(false);
  };

  const fetchWards = async () => {
    const { data, error } = await supabase
      .from('khu_dieu_tri')
      .select('id_khu, ten_khu')
      .order('ten_khu', { ascending: true });
    
    if (error) {
      message.error(`Lỗi khi tải danh sách khu điều trị: ${error.message}`);
    } else {
      setWards(data || []);
    }
  };

  const handleAdd = () => {
    setEditingRoom(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (room: Room) => {
    setEditingRoom(room);
    form.setFieldsValue(room);
    setIsModalVisible(true);
  };

  const handleDelete = async (id_phong: number) => {
    if (!can('facility.room.manage')) {
        message.error('Bạn không có quyền thực hiện hành động này.');
        return;
    }
    const { error } = await supabase.from('phong_benh').delete().eq('id_phong', id_phong);

    if (error) {
      message.error(`Lỗi khi xóa phòng bệnh: ${error.message}`);
    } else {
      message.success('Xóa phòng bệnh thành công!');
      fetchRooms();
    }
  };

  const handleOk = async () => {
    if (!can('facility.room.manage')) {
        message.error('Bạn không có quyền thực hiện hành động này.');
        return;
    }
    try {
      setIsSubmitting(true);
      const values = await form.validateFields();
      let error;

      if (editingRoom) {
        ({ error } = await supabase.from('phong_benh').update(values).eq('id_phong', editingRoom.id_phong));
      } else {
        ({ error } = await supabase.from('phong_benh').insert([values]));
      }

      if (error) {
        message.error(`Lỗi khi ${editingRoom ? 'cập nhật' : 'thêm'} phòng bệnh: ${error.message}`);
      } else {
        message.success(`${editingRoom ? 'Cập nhật' : 'Thêm'} phòng bệnh thành công!`);
        fetchRooms();
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
      title: 'Tên Phòng Bệnh',
      dataIndex: 'ten_phong',
      key: 'ten_phong',
    },
    {
      title: 'Khu Điều Trị',
      dataIndex: 'khu_dieu_tri',
      key: 'khu_dieu_tri',
      render: (khu_dieu_tri) => khu_dieu_tri ? khu_dieu_tri.ten_khu : '-',
    },
    {
        title: 'Chi Phí Vận Hành',
        dataIndex: 'chi_phi_van_hanh',
        key: 'chi_phi_van_hanh',
        render: (cost: number) => cost ? cost.toLocaleString('vi-VN') + ' VNĐ' : '-',
    },
    {
      title: 'Hành Động',
      key: 'action',
      render: (text: any, record: Room) => (
        <span>
          <Button
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            style={{ marginRight: 8 }}
            disabled={!can('facility.room.manage')}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Bạn có chắc muốn xóa phòng bệnh này?"
            onConfirm={() => handleDelete(record.id_phong)}
            okText="Xóa"
            cancelText="Hủy"
            disabled={!can('facility.room.manage')}
          >
            <Button icon={<DeleteOutlined />} danger disabled={!can('facility.room.manage')}> 
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
            <h1 style={{ fontSize: '24px', margin: 0 }}>Quản lý Phòng Bệnh</h1>
            {can('facility.room.manage') && (
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                    Thêm Phòng Bệnh
                </Button>
            )}
        </div>
        <Table
            columns={columns}
            dataSource={rooms}
            loading={loading}
            rowKey="id_phong"
            bordered
        />
        <Modal
            title={editingRoom ? 'Chỉnh Sửa Phòng Bệnh' : 'Thêm Phòng Bệnh Mới'}
            visible={isModalVisible}
            onOk={handleOk}
            onCancel={() => setIsModalVisible(false)}
            confirmLoading={isSubmitting}
        >
            <Form form={form} layout="vertical" name="room_form">
                <Form.Item
                    name="ten_phong"
                    label="Tên Phòng Bệnh"
                    rules={[{ required: true, message: 'Vui lòng nhập tên phòng bệnh!' }]}
                >
                    <Input />
                </Form.Item>
                <Form.Item
                    name="id_khu"
                    label="Khu Điều Trị"
                    rules={[{ required: true, message: 'Vui lòng chọn khu điều trị!' }]}
                >
                    <Select placeholder="Chọn khu điều trị">
                    {wards.map(ward => (
                        <Option key={ward.id_khu} value={ward.id_khu}>
                        {ward.ten_khu}
                        </Option>
                    ))}
                    </Select>
                </Form.Item>
                <Form.Item
                    name="chi_phi_van_hanh"
                    label="Chi Phí Vận Hành (VNĐ)"
                    rules={[{ required: true, message: 'Vui lòng nhập chi phí vận hành!' }]}
                >
                    <InputNumber style={{ width: '100%' }} min={0} formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
                </Form.Item>
            </Form>
        </Modal>
    </>
  );
};

export default RoomsPage;
