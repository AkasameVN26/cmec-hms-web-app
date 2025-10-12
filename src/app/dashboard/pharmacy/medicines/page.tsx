'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, message, Popconfirm, InputNumber, Spin, Space, Descriptions, Row, Col } from 'antd';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

const MedicinesPage = () => {
  const { can, loading: authLoading } = useAuth();
  const [medicines, setMedicines] = useState<any[]>([]);
  const [filteredMedicines, setFilteredMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<any | null>(null);
  const [selectedMedicine, setSelectedMedicine] = useState<any | null>(null);
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();

  useEffect(() => {
    fetchMedicines();
  }, []);

  const fetchMedicines = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('thuoc').select('*').order('ten_thuoc');
    if (data) {
        setMedicines(data);
        setFilteredMedicines(data);
    }
    setLoading(false);
  };

  const handleSearch = (values: any) => {
    let filtered = medicines;
    const { ten_thuoc, hoat_chat, nhom_thuoc } = values;

    if (ten_thuoc) {
        filtered = filtered.filter(m => m.ten_thuoc.toLowerCase().includes(ten_thuoc.toLowerCase()));
    }
    if (hoat_chat) {
        filtered = filtered.filter(m => m.hoat_chat && m.hoat_chat.toLowerCase().includes(hoat_chat.toLowerCase()));
    }
    if (nhom_thuoc) {
        filtered = filtered.filter(m => m.nhom_thuoc && m.nhom_thuoc.toLowerCase().includes(nhom_thuoc.toLowerCase()));
    }

    setFilteredMedicines(filtered);
  };

  const handleResetSearch = () => {
    searchForm.resetFields();
    setFilteredMedicines(medicines);
  };

  const handleAddNew = () => {
    setEditingMedicine(null);
    form.resetFields();
    setIsEditModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingMedicine(record);
    form.setFieldsValue(record);
    setIsEditModalVisible(true);
  };

  const handleViewDetails = (record: any) => {
    setSelectedMedicine(record);
    setIsDetailsModalVisible(true);
  };

  const handleDelete = async (id_thuoc: number) => {
    if (!can('medicine.inventory.manage')) {
        message.error('Bạn không có quyền thực hiện hành động này.');
        return;
    }
    const { error } = await supabase.from('thuoc').delete().eq('id_thuoc', id_thuoc);
    if (error) {
      message.error(`Lỗi khi xoá thuốc: ${error.message}`);
    } else {
      message.success('Xoá thuốc thành công');
      fetchMedicines();
    }
  };

  const handleOk = async () => {
    if (!can('medicine.inventory.manage')) {
        message.error('Bạn không có quyền thực hiện hành động này.');
        return;
    }
    try {
      const values = await form.validateFields();
      let error;

      if (editingMedicine) {
        const { error: updateError } = await supabase.from('thuoc').update(values).eq('id_thuoc', editingMedicine.id_thuoc);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('thuoc').insert([values]);
        error = insertError;
      }

      if (error) {
        message.error(error.message);
      } else {
        message.success(editingMedicine ? 'Cập nhật thành công!' : 'Thêm mới thành công!');
        setIsEditModalVisible(false);
        fetchMedicines();
      }
    } catch (info) {
      console.log('Validate Failed:', info);
    }
  };

  const baseColumns = [
    { title: 'Tên thuốc', dataIndex: 'ten_thuoc', key: 'ten_thuoc', sorter: (a: any, b: any) => a.ten_thuoc.localeCompare(b.ten_thuoc) },
    { title: 'Nhóm thuốc', dataIndex: 'nhom_thuoc', key: 'nhom_thuoc', render: (text: string) => text || '-' },
    { title: 'Đơn vị tính', dataIndex: 'don_vi_tinh', key: 'don_vi_tinh' },
    { title: 'Tồn kho', dataIndex: 'so_luong_ton_kho', key: 'so_luong_ton_kho', sorter: (a: any, b: any) => a.so_luong_ton_kho - b.so_luong_ton_kho },
    { title: 'Giá nhập', dataIndex: 'don_gia_nhap', key: 'don_gia_nhap', render: (val: number) => val ? val.toLocaleString('vi-VN') + ' VND' : '-' },
    { title: 'Giá bán', dataIndex: 'don_gia_ban', key: 'don_gia_ban', render: (val: number) => val ? val.toLocaleString('vi-VN') + ' VND' : '-' },
  ];

  const actionColumn = {
    title: 'Hành động',
    key: 'action',
    render: (_: any, record: any) => (
      <Space>
        <Button size="small" onClick={() => handleViewDetails(record)}>Chi tiết</Button>
        {can('medicine.inventory.manage') && <Button size="small" onClick={() => handleEdit(record)}>Sửa</Button>}
        {can('medicine.inventory.manage') && 
            <Popconfirm title="Bạn có chắc muốn xoá?" onConfirm={() => handleDelete(record.id_thuoc)} okText="Xoá" cancelText="Huỷ">
                <Button size="small" danger>Xoá</Button>
            </Popconfirm>
        }
      </Space>
    ),
  };

  const columns = [...baseColumns, actionColumn];

  if (authLoading) {
      return <Spin tip="Đang tải thông tin người dùng..."></Spin>
  }

  return (
    <>
      <Card 
        title="Quản lý Danh mục thuốc"
        extra={
            can('medicine.inventory.manage') && (
                <Button type="primary" onClick={handleAddNew}>Thêm thuốc mới</Button>
            )
        }
      >
        <Form form={searchForm} onFinish={handleSearch} layout="vertical" style={{ marginBottom: 24 }}>
            <Row gutter={16}>
                <Col span={8}>
                    <Form.Item name="ten_thuoc" label="Tên thuốc">
                        <Input placeholder="Nhập tên thuốc..." allowClear />
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item name="hoat_chat" label="Hoạt chất">
                        <Input placeholder="Nhập hoạt chất..." allowClear />
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item name="nhom_thuoc" label="Nhóm thuốc">
                        <Input placeholder="Nhập nhóm thuốc..." allowClear />
                    </Form.Item>
                </Col>
            </Row>
            <Row>
                <Col span={24} style={{ textAlign: 'right' }}>
                    <Button type="primary" htmlType="submit">Tìm kiếm</Button>
                    <Button style={{ marginLeft: 8 }} onClick={handleResetSearch}>Reset</Button>
                </Col>
            </Row>
        </Form>

        <Table
          columns={columns}
          dataSource={filteredMedicines}
          loading={loading}
          rowKey="id_thuoc"
        />
      </Card>

      {/* Details Modal */}
      <Modal
        title={`Chi tiết thuốc: ${selectedMedicine?.ten_thuoc}`}
        visible={isDetailsModalVisible}
        onCancel={() => setIsDetailsModalVisible(false)}
        footer={<Button onClick={() => setIsDetailsModalVisible(false)}>Đóng</Button>}
      >
        {selectedMedicine && (
            <Descriptions bordered column={1}>
                <Descriptions.Item label="Tên thuốc">{selectedMedicine.ten_thuoc}</Descriptions.Item>
                <Descriptions.Item label="Nhóm thuốc">{selectedMedicine.nhom_thuoc || '-'}</Descriptions.Item>
                <Descriptions.Item label="Hoạt chất">{selectedMedicine.hoat_chat || '-'}</Descriptions.Item>
                <Descriptions.Item label="Mô tả">{selectedMedicine.mo_ta || '-'}</Descriptions.Item>
            </Descriptions>
        )}
      </Modal>

      {/* Add/Edit Modal */}
      {can('medicine.inventory.manage') && (
        <Modal
            title={editingMedicine ? 'Chỉnh sửa thông tin thuốc' : 'Thêm thuốc mới'}
            visible={isEditModalVisible}
            onOk={handleOk}
            onCancel={() => setIsEditModalVisible(false)}
            okText={editingMedicine ? 'Cập nhật' : 'Thêm'}
            cancelText="Huỷ"
        >
            <Form form={form} layout="vertical" name="medicine_form">
                <Form.Item name="ten_thuoc" label="Tên thuốc" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>
                <Form.Item name="nhom_thuoc" label="Nhóm thuốc">
                    <Input />
                </Form.Item>
                <Form.Item name="hoat_chat" label="Hoạt chất">
                    <Input />
                </Form.Item>
                <Form.Item name="don_vi_tinh" label="Đơn vị tính" rules={[{ required: true }]}>
                    <Input />
                </Form.Item>
                <Form.Item name="so_luong_ton_kho" label="Số lượng tồn kho" rules={[{ required: true }]}>
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item name="don_gia_nhap" label="Đơn giá nhập" rules={[{ required: true }]}>
                    <InputNumber min={0} style={{ width: '100%' }} formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(value) => value!.replace(/\,/g, '')} />
                </Form.Item>
                <Form.Item name="don_gia_ban" label="Đơn giá bán" rules={[{ required: true }]}>
                    <InputNumber min={0} style={{ width: '100%' }} formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(value) => value!.replace(/\,/g, '')} />
                </Form.Item>
                <Form.Item name="mo_ta" label="Mô tả">
                    <Input.TextArea rows={3} />
                </Form.Item>
            </Form>
        </Modal>
      )}
    </>
  );
};

export default MedicinesPage;
