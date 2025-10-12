'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, message, Popconfirm, Space, Select, Row, Col } from 'antd';
import { supabase } from '@/lib/supabase';

const { Option } = Select;

const DiseasesPage = () => {
  const [diseases, setDiseases] = useState<any[]>([]);
  const [filteredDiseases, setFilteredDiseases] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingDisease, setEditingDisease] = useState<any | null>(null);
  const [form] = Form.useForm();
  const [searchForm] = Form.useForm();

  useEffect(() => {
    fetchDiseases();
    fetchSpecialties();
  }, []);

  const fetchDiseases = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('benh')
      .select('*, chuyen_khoa:id_chuyen_khoa(ten_chuyen_khoa)')
      .order('ten_benh', { ascending: true });
    if (data) {
        setDiseases(data);
        setFilteredDiseases(data);
    }
    setLoading(false);
  };

  const fetchSpecialties = async () => {
    const { data, error } = await supabase.from('chuyen_khoa').select('*');
    if (data) setSpecialties(data);
  };

  const handleSearch = (values: any) => {
    let filtered = diseases;
    if (values.ten_benh) {
        filtered = filtered.filter(d => d.ten_benh.toLowerCase().includes(values.ten_benh.toLowerCase()));
    }
    if (values.id_chuyen_khoa) {
        filtered = filtered.filter(d => d.id_chuyen_khoa === values.id_chuyen_khoa);
    }
    setFilteredDiseases(filtered);
  };

  const handleResetSearch = () => {
    searchForm.resetFields();
    setFilteredDiseases(diseases);
  };

  const handleAddNew = () => {
    setEditingDisease(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingDisease(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleDelete = async (id_benh: number) => {
    const { error } = await supabase.from('benh').delete().eq('id_benh', id_benh);
    if (error) {
      message.error(`Lỗi khi xoá: ${error.message}`);
    } else {
      message.success('Xoá thành công');
      fetchDiseases();
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      let error;

      if (editingDisease) {
        const { error: updateError } = await supabase.from('benh').update(values).eq('id_benh', editingDisease.id_benh);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('benh').insert([values]);
        error = insertError;
      }

      if (error) {
        message.error(error.message);
      } else {
        message.success(editingDisease ? 'Cập nhật thành công!' : 'Thêm mới thành công!');
        setIsModalVisible(false);
        fetchDiseases();
      }
    } catch (info) {
      console.log('Validate Failed:', info);
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id_benh', key: 'id_benh', width: 80 },
    { title: 'Tên bệnh', dataIndex: 'ten_benh', key: 'ten_benh' },
    { title: 'Chuyên khoa', dataIndex: ['chuyen_khoa', 'ten_chuyen_khoa'], key: 'chuyen_khoa', render: (text: string) => text || '-' },
    { title: 'Mô tả', dataIndex: 'mo_ta_benh', key: 'mo_ta_benh', render: (text: string) => text || '-' },
    {
      title: 'Hành động',
      key: 'action',
      width: 150,
      render: (_: any, record: any) => (
        <Space>
          <Button onClick={() => handleEdit(record)}>Sửa</Button>
          <Popconfirm
            title="Bạn có chắc muốn xoá bệnh này?"
            onConfirm={() => handleDelete(record.id_benh)}
            okText="Xoá"
            cancelText="Huỷ"
          >
            <Button danger>Xoá</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card 
        title="Quản lý Danh mục Bệnh"
        extra={<Button type="primary" onClick={handleAddNew}>Thêm bệnh mới</Button>}
      >
        <Form form={searchForm} onFinish={handleSearch} layout="vertical" style={{ marginBottom: 24 }}>
            <Row gutter={16}>
                <Col span={12}>
                    <Form.Item name="ten_benh" label="Tên bệnh">
                        <Input placeholder="Nhập tên bệnh để tìm kiếm" allowClear />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item name="id_chuyen_khoa" label="Chuyên khoa">
                        <Select placeholder="Lọc theo chuyên khoa" allowClear>
                            {specialties.map(s => <Option key={s.id_chuyen_khoa} value={s.id_chuyen_khoa}>{s.ten_chuyen_khoa}</Option>)}
                        </Select>
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
          dataSource={filteredDiseases}
          loading={loading}
          rowKey="id_benh"
        />
      </Card>

      <Modal
        title={editingDisease ? 'Chỉnh sửa thông tin bệnh' : 'Thêm bệnh mới'}
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={() => setIsModalVisible(false)}
        okText={editingDisease ? 'Cập nhật' : 'Thêm'}
        cancelText="Huỷ"
      >
        <Form form={form} layout="vertical" name="disease_form">
          <Form.Item name="ten_benh" label="Tên bệnh" rules={[{ required: true, message: 'Vui lòng nhập tên bệnh' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="id_chuyen_khoa" label="Chuyên khoa" rules={[{ required: true, message: 'Vui lòng chọn chuyên khoa' }]}>
            <Select showSearch optionFilterProp="children" placeholder="Chọn chuyên khoa">
                {specialties.map(s => <Option key={s.id_chuyen_khoa} value={s.id_chuyen_khoa}>{s.ten_chuyen_khoa}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="mo_ta_benh" label="Mô tả">
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default DiseasesPage;
