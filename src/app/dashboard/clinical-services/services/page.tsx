'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, message, Popconfirm, InputNumber, Select, Space, Row, Col } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';

const { Option } = Select;

const ClinicalServicesManagementPage = () => {
  const [services, setServices] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [clinics, setClinics] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [form] = Form.useForm();

  // State for filtering and sorting
  const [filterSpecialty, setFilterSpecialty] = useState<number | null | string>(null);
  const [sortOrder, setSortOrder] = useState<string | null>(null);

  useEffect(() => {
    fetchServices();
    // These are relatively static, so only fetch them once.
    if (specialties.length === 0) fetchSpecialties();
    if (clinics.length === 0) fetchClinics();
  }, [filterSpecialty, sortOrder]); // Refetch when filter or sort changes

  const fetchServices = async () => {
    setLoading(true);
    try {
        let query = supabase.from('dich_vu_cls').select(`
            *,
            chuyen_khoa:id_chuyen_khoa ( ten_chuyen_khoa ),
            phong_kham:id_phong_kham ( ten_phong_kham )
        `);

        if (filterSpecialty) {
            query = query.eq('id_chuyen_khoa', filterSpecialty);
        }

        if (sortOrder) {
            const isAscending = sortOrder === 'asc';
            query = query.order('don_gia', { ascending: isAscending });
        } else {
            query = query.order('ten_dich_vu', { ascending: true }); // Default sort
        }

        const { data, error } = await query;
        if (error) throw error;
        setServices(data || []);
    } catch (error: any) {
        message.error("Lỗi khi tải dữ liệu dịch vụ: " + error.message);
    } finally {
        setLoading(false);
    }
  };

  const fetchSpecialties = async () => {
    const { data } = await supabase.from('chuyen_khoa').select('*').order('ten_chuyen_khoa');
    if (data) setSpecialties(data);
  };

  const fetchClinics = async () => {
    const { data } = await supabase.from('phong_kham').select('*');
    if (data) setClinics(data);
  };
  
  const handleReset = () => {
      setFilterSpecialty(null);
      setSortOrder(null);
  };

  const handleAddNew = () => {
    setEditingService(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingService(record);
    form.setFieldsValue(record);
    setIsModalVisible(true);
  };

  const handleDelete = async (id_dich_vu: number) => {
    const { error } = await supabase.from('dich_vu_cls').delete().eq('id_dich_vu', id_dich_vu);
    if (error) {
      message.error(`Lỗi khi xoá dịch vụ: ${error.message}`);
    } else {
      message.success('Xoá dịch vụ thành công');
      fetchServices();
    }
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      let error;

      if (editingService) {
        const { error: updateError } = await supabase.from('dich_vu_cls').update(values).eq('id_dich_vu', editingService.id_dich_vu);
        error = updateError;
      } else {
        const { error: insertError } = await supabase.from('dich_vu_cls').insert([values]);
        error = insertError;
      }

      if (error) {
        message.error(error.message);
      } else {
        message.success(editingService ? 'Cập nhật thành công!' : 'Thêm mới thành công!');
        setIsModalVisible(false);
        fetchServices();
      }
    } catch (info) {
      console.log('Validate Failed:', info);
    }
  };

  const columns = [
    { title: 'Tên dịch vụ', dataIndex: 'ten_dich_vu', key: 'ten_dich_vu', fixed: 'left', width: 250 },
    { title: 'Chuyên khoa', dataIndex: ['chuyen_khoa', 'ten_chuyen_khoa'], key: 'chuyen_khoa', width: 200 },
    { title: 'Phòng thực hiện', dataIndex: ['phong_kham', 'ten_phong_kham'], key: 'phong_kham', width: 200 },
    {
        title: 'Đơn giá',
        dataIndex: 'don_gia',
        key: 'don_gia',
        width: 150,
        render: (val: number) => val ? val.toLocaleString('vi-VN') + ' VND' : 'N/A',
        sorter: (a, b) => a.don_gia - b.don_gia,
        sortOrder: sortOrder ? (sortOrder === 'asc' ? 'ascend' : 'descend') : false,
    },
    { title: 'Mô tả', dataIndex: 'mo_ta', key: 'mo_ta', ellipsis: true },
    {
      title: 'Hành động',
      key: 'action',
      fixed: 'right',
      width: 150,
      render: (_: any, record: any) => (
        <Space size="middle">
          <a onClick={() => handleEdit(record)}>Sửa</a>
          <Popconfirm
            title="Bạn có chắc muốn xoá dịch vụ này?"
            onConfirm={() => handleDelete(record.id_dich_vu)}
            okText="Xoá"
            cancelText="Huỷ"
          >
            <a style={{ color: 'red' }}>Xóa</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Card 
        title="Quản lý Dịch vụ Cận lâm sàng (CLS)"
        extra={<Button type="primary" onClick={handleAddNew}>Thêm dịch vụ</Button>}
      >
        <Space direction="vertical" style={{ width: '100%', marginBottom: 24 }}>
            <Row gutter={16} align="bottom">
                <Col flex="auto">
                    <p style={{ margin: '0 0 8px 0', fontWeight: 500}}>Lọc theo chuyên khoa</p>
                    <Select
                        showSearch
                        placeholder="Chọn chuyên khoa để lọc"
                        style={{ width: '100%' }}
                        value={filterSpecialty}
                        onChange={value => setFilterSpecialty(value)}
                        allowClear
                        optionFilterProp="children"
                        filterOption={(input, option) => 
                            option?.children?.toString().toLowerCase().includes(input.toLowerCase()) ?? false
                        }
                    >
                        {specialties.map(spec => <Option key={spec.id_chuyen_khoa} value={spec.id_chuyen_khoa}>{spec.ten_chuyen_khoa}</Option>)}
                    </Select>
                </Col>
                <Col>
                    <p style={{ margin: '0 0 8px 0', fontWeight: 500}}>Sắp xếp theo đơn giá</p>
                    <Space.Compact>
                        <Button icon={<ArrowUpOutlined />} onClick={() => setSortOrder('asc')} type={sortOrder === 'asc' ? 'primary' : 'default'}>Tăng dần</Button>
                        <Button icon={<ArrowDownOutlined />} onClick={() => setSortOrder('desc')} type={sortOrder === 'desc' ? 'primary' : 'default'}>Giảm dần</Button>
                    </Space.Compact>
                </Col>
                <Col>
                     <Button onClick={handleReset} style={{ marginTop: '29px' }}>Reset</Button>
                </Col>
            </Row>
        </Space>

        <Table
          columns={columns}
          dataSource={services}
          loading={loading}
          rowKey="id_dich_vu"
          scroll={{ x: 1200 }}
          onChange={(pagination, filters, sorter: any) => {
            if (sorter.order) {
                setSortOrder(sorter.order === 'ascend' ? 'asc' : 'desc');
            } else {
                setSortOrder(null);
            }
        }}
        />
      </Card>

      <Modal
        title={editingService ? 'Chỉnh sửa dịch vụ' : 'Thêm dịch vụ mới'}
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={() => setIsModalVisible(false)}
        okText={editingService ? 'Cập nhật' : 'Thêm'}
        cancelText="Huỷ"
      >
        <Form form={form} layout="vertical" name="service_form">
          <Form.Item name="ten_dich_vu" label="Tên dịch vụ" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="id_chuyen_khoa" label="Chuyên khoa" rules={[{ required: true }]}>
            <Select placeholder="Chọn chuyên khoa">
              {specialties.map(s => <Option key={s.id_chuyen_khoa} value={s.id_chuyen_khoa}>{s.ten_chuyen_khoa}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="id_phong_kham" label="Phòng thực hiện" rules={[{ required: true }]}>
            <Select placeholder="Chọn phòng khám">
              {clinics.map(c => <Option key={c.id_phong_kham} value={c.id_phong_kham}>{c.ten_phong_kham}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="don_gia" label="Đơn giá" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%' }} formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={(value) => Number(value!.replace(/\D/g, ''))} />
          </Form.Item>
          <Form.Item name="mo_ta" label="Mô tả">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default ClinicalServicesManagementPage;
