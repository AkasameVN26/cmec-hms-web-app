'use client';

import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Popconfirm, Breadcrumb, Card } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, HomeOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

const { Option } = Select;

interface Ward {
  id_khu: number;
  ten_khu: string;
  id_chuyen_khoa: number;
  chuyen_khoa: {
    ten_chuyen_khoa: string;
  };
}

interface Department {
  id_chuyen_khoa: number;
  ten_chuyen_khoa: string;
}

const WardsPage = () => {
  const { can } = useAuth();
  const [wards, setWards] = useState<Ward[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingWard, setEditingWard] = useState<Ward | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchWards();
    fetchDepartments();
  }, []);

  const fetchWards = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('khu_dieu_tri')
      .select(`
        id_khu,
        ten_khu,
        id_chuyen_khoa,
        chuyen_khoa (
          ten_chuyen_khoa
        )
      `)
      .order('ten_khu', { ascending: true });

    if (error) {
      message.error(`Lỗi khi tải dữ liệu khu điều trị: ${error.message}`);
    } else {
      setWards((data as unknown as Ward[]) || []);
    }
    setLoading(false);
  };

  const fetchDepartments = async () => {
    const { data, error } = await supabase
      .from('chuyen_khoa')
      .select('id_chuyen_khoa, ten_chuyen_khoa')
      .order('ten_chuyen_khoa', { ascending: true });
    
    if (error) {
      message.error(`Lỗi khi tải danh sách chuyên khoa: ${error.message}`);
    } else {
      setDepartments(data || []);
    }
  };

  const handleAdd = () => {
    setEditingWard(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (ward: Ward) => {
    setEditingWard(ward);
    form.setFieldsValue({
      ten_khu: ward.ten_khu,
      id_chuyen_khoa: ward.id_chuyen_khoa,
    });
    setIsModalVisible(true);
  };

  const handleDelete = async (id_khu: number) => {
    if (!can('facility.ward.manage')) {
        message.error('Bạn không có quyền thực hiện hành động này.');
        return;
    }
    const { error } = await supabase.from('khu_dieu_tri').delete().eq('id_khu', id_khu);

    if (error) {
      message.error(`Lỗi khi xóa khu điều trị: ${error.message}`);
    } else {
      message.success('Xóa khu điều trị thành công!');
      fetchWards();
    }
  };

  const handleOk = async () => {
    if (!can('facility.ward.manage')) {
        message.error('Bạn không có quyền thực hiện hành động này.');
        return;
    }
    try {
      setIsSubmitting(true);
      const values = await form.validateFields();
      let error;

      if (editingWard) {
        ({ error } = await supabase.from('khu_dieu_tri').update(values).eq('id_khu', editingWard.id_khu));
      } else {
        ({ error } = await supabase.from('khu_dieu_tri').insert([values]));
      }

      if (error) {
        message.error(`Lỗi khi ${editingWard ? 'cập nhật' : 'thêm'} khu điều trị: ${error.message}`);
      } else {
        message.success(`${editingWard ? 'Cập nhật' : 'Thêm'} khu điều trị thành công!`);
        fetchWards();
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
      title: 'Tên Khu Điều Trị',
      dataIndex: 'ten_khu',
      key: 'ten_khu',
    },
    {
      title: 'Chuyên Khoa',
      dataIndex: 'chuyen_khoa',
      key: 'chuyen_khoa',
      render: (chuyen_khoa: any) => chuyen_khoa ? chuyen_khoa.ten_chuyen_khoa : '-',
    },
    {
      title: 'Hành Động',
      key: 'action',
      render: (text: any, record: Ward) => (
        <span>
          <Button
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            style={{ marginRight: 8 }}
            disabled={!can('facility.ward.manage')}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Bạn có chắc muốn xóa khu điều trị này?"
            onConfirm={() => handleDelete(record.id_khu)}
            okText="Xóa"
            cancelText="Hủy"
            disabled={!can('facility.ward.manage')}
          >
            <Button icon={<DeleteOutlined />} danger disabled={!can('facility.ward.manage')}> 
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
            <h1 style={{ fontSize: '24px', margin: 0 }}>Quản lý Khu Điều Trị</h1>
            {can('facility.ward.manage') && (
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                    Thêm Khu Điều Trị
                </Button>
            )}
        </div>
        <Table
            columns={columns}
            dataSource={wards}
            loading={loading}
            rowKey="id_khu"
            bordered
        />
        <Modal
            title={editingWard ? 'Chỉnh Sửa Khu Điều Trị' : 'Thêm Khu Điều Trị Mới'}
            visible={isModalVisible}
            onOk={handleOk}
            onCancel={() => setIsModalVisible(false)}
            confirmLoading={isSubmitting}
        >
            <Form form={form} layout="vertical" name="ward_form">
            <Form.Item
                name="ten_khu"
                label="Tên Khu Điều Trị"
                rules={[{ required: true, message: 'Vui lòng nhập tên khu điều trị!' }]}>
                <Input />
            </Form.Item>
            <Form.Item
                name="id_chuyen_khoa"
                label="Chuyên Khoa"
            >
                <Select placeholder="Chọn chuyên khoa (nếu có)" allowClear>
                {departments.map(dep => (
                    <Option key={dep.id_chuyen_khoa} value={dep.id_chuyen_khoa}>
                    {dep.ten_chuyen_khoa}
                    </Option>
                ))}
                </Select>
            </Form.Item>
            </Form>
        </Modal>
    </>
  );
};

export default WardsPage;

export const dynamic = 'force-dynamic';
