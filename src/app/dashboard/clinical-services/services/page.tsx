'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, message, Popconfirm, InputNumber, Select } from 'antd';
import { supabase } from '@/lib/supabase';

const { Option } = Select;

const ClinicalServicesPage = () => {
  const [services, setServices] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [clinics, setClinics] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchServices();
    fetchSpecialties();
    fetchClinics();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('dich_vu_cls').select(`
      *,
      chuyen_khoa:id_chuyen_khoa ( ten_chuyen_khoa ),
      phong_kham:id_phong_kham ( ten_phong_kham )
    `);
    if (data) setServices(data);
    setLoading(false);
  };

  const fetchSpecialties = async () => {
    const { data } = await supabase.from('chuyen_khoa').select('*').eq('loai_khoa', 'Cận lâm sàng');
    if (data) setSpecialties(data);
  };

  const fetchClinics = async () => {
    const { data } = await supabase.from('phong_kham').select('*');
    if (data) setClinics(data);
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
    { title: 'Tên dịch vụ', dataIndex: 'ten_dich_vu', key: 'ten_dich_vu' },
    { title: 'Chuyên khoa', dataIndex: ['chuyen_khoa', 'ten_chuyen_khoa'], key: 'chuyen_khoa' },
    { title: 'Phòng thực hiện', dataIndex: ['phong_kham', 'ten_phong_kham'], key: 'phong_kham' },
    { title: 'Đơn giá', dataIndex: 'don_gia', key: 'don_gia', render: (val: number) => val.toLocaleString() + ' VND' },
    { title: 'Mô tả', dataIndex: 'mo_ta', key: 'mo_ta' },
    {
      title: 'Hành động',
      key: 'action',
      render: (_: any, record: any) => (
        <span className="flex gap-2">
          <Button onClick={() => handleEdit(record)}>Sửa</Button>
          <Popconfirm
            title="Bạn có chắc muốn xoá dịch vụ này?"
            onConfirm={() => handleDelete(record.id_dich_vu)}
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
        title="Quản lý Dịch vụ Cận lâm sàng (CLS)"
        extra={<Button type="primary" onClick={handleAddNew}>Thêm dịch vụ</Button>}
      >
        <Table
          columns={columns}
          dataSource={services}
          loading={loading}
          rowKey="id_dich_vu"
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
            <InputNumber min={0} style={{ width: '100%' }} formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
            parser={(value) => Number(value!.replace(/\./g, ''))} />
          </Form.Item>
          <Form.Item name="mo_ta" label="Mô tả">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default ClinicalServicesPage;