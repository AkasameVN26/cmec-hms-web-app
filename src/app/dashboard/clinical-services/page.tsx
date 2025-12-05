'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, message, Space, InputNumber, Popconfirm } from 'antd';
import { supabase } from '@/lib/supabase';
import useSWR from 'swr';

const { Option } = Select;

// SWR fetcher function
const fetcher = async (url: string) => {
    const { data, error } = await supabase.from(url).select('*, chuyen_khoa:id_chuyen_khoa(ten_chuyen_khoa), phong_kham:id_phong_kham(ten_phong_kham)');
    if (error) throw new Error(error.message);
    return data;
};

const ClinicalServicesPage = () => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingService, setEditingService] = useState<any | null>(null);
    const [form] = Form.useForm();
    const { data: services, error, mutate, isLoading } = useSWR('dich_vu_cls', fetcher);
    
    // Fetch related data for modals
    const [specialties, setSpecialties] = useState<any[]>([]);
    const [clinics, setClinics] = useState<any[]>([]);

    useEffect(() => {
        const fetchRelatedData = async () => {
            const { data: specialtiesData } = await supabase.from('chuyen_khoa').select('*');
            const { data: clinicsData } = await supabase.from('phong_kham').select('*');
            if (specialtiesData) setSpecialties(specialtiesData);
            if (clinicsData) setClinics(clinicsData);
        };
        fetchRelatedData();
    }, []);

    const showAddModal = () => {
        setEditingService(null);
        form.resetFields();
        setIsModalVisible(true);
    };

    const showEditModal = (service: any) => {
        setEditingService(service);
        form.setFieldsValue(service);
        setIsModalVisible(true);
    };

    const handleDelete = async (serviceId: number) => {
        try {
            const { error } = await supabase.from('dich_vu_cls').delete().eq('id_dich_vu', serviceId);
            if (error) throw error;
            message.success('Xóa dịch vụ thành công!');
            mutate(); // Revalidate SWR
        } catch (error: any) {
            message.error(`Lỗi khi xóa dịch vụ: ${error.message}`);
        }
    };

    const handleFormSubmit = async () => {
        try {
            const values = await form.validateFields();
            const { error } = editingService
                ? await supabase.from('dich_vu_cls').update(values).eq('id_dich_vu', editingService.id_dich_vu)
                : await supabase.from('dich_vu_cls').insert([values]);

            if (error) throw error;

            message.success(editingService ? 'Cập nhật dịch vụ thành công!' : 'Thêm dịch vụ thành công!');
            setIsModalVisible(false);
            mutate(); // Revalidate SWR
        } catch (error: any) {
            message.error(`Lỗi: ${error.message}`);
        }
    };

    const columns = [
        { title: 'Tên dịch vụ', dataIndex: 'ten_dich_vu', key: 'ten_dich_vu', width: 250 },
        { title: 'Chuyên khoa', dataIndex: ['chuyen_khoa', 'ten_chuyen_khoa'], key: 'chuyen_khoa' },
        { title: 'Phòng khám', dataIndex: ['phong_kham', 'ten_phong_kham'], key: 'phong_kham' },
        { 
            title: 'Đơn giá', 
            dataIndex: 'don_gia', 
            key: 'don_gia',
            render: (price: number) => price ? price.toLocaleString('vi-VN') + ' VND' : 'N/A'
        },
        {
            title: 'Hành động',
            key: 'action',
            render: (_: any, record: any) => (
                <Space size="middle">
                    <Button type="default" onClick={() => showEditModal(record)}>Sửa</Button>
                    <Popconfirm
                        title="Bạn có chắc chắn muốn xóa dịch vụ này?"
                        onConfirm={() => handleDelete(record.id_dich_vu)}
                        okText="Xóa"
                        cancelText="Hủy"
                    >
                        <Button type="default" danger>Xóa</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    if (error) return <Card>Lỗi khi tải dữ liệu: {error.message}</Card>;

    return (
        <Card title="Quản lý Dịch vụ Cận lâm sàng (CLS)" extra={<Button type="primary" onClick={showAddModal}>Thêm dịch vụ</Button>}> 
            <Table 
                columns={columns} 
                dataSource={services || []} 
                loading={isLoading} 
                rowKey="id_dich_vu" 
            />
            <Modal
                title={editingService ? "Sửa Dịch vụ CLS" : "Thêm Dịch vụ CLS mới"}
                visible={isModalVisible}
                onOk={handleFormSubmit}
                onCancel={() => setIsModalVisible(false)}
                okText="Lưu"
                cancelText="Hủy"
            >
                <Form form={form} layout="vertical">
                    <Form.Item name="ten_dich_vu" label="Tên dịch vụ" rules={[{ required: true, message: 'Vui lòng nhập tên dịch vụ!' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="id_chuyen_khoa" label="Chuyên khoa" rules={[{ required: true, message: 'Vui lòng chọn chuyên khoa!' }]}>
                        <Select placeholder="Chọn chuyên khoa">
                            {specialties.map(spec => <Option key={spec.id_chuyen_khoa} value={spec.id_chuyen_khoa}>{spec.ten_chuyen_khoa}</Option>)}
                        </Select>
                    </Form.Item>
                    <Form.Item name="id_phong_kham" label="Phòng khám" rules={[{ required: true, message: 'Vui lòng chọn phòng khám!' }]}>
                        <Select placeholder="Chọn phòng khám">
                            {clinics.map(clinic => <Option key={clinic.id_phong_kham} value={clinic.id_phong_kham}>{clinic.ten_phong_kham}</Option>)}
                        </Select>
                    </Form.Item>
                    <Form.Item name="don_gia" label="Đơn giá" rules={[{ required: true, message: 'Vui lòng nhập đơn giá!' }]}>
                        <InputNumber style={{ width: '100%' }} formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!))/g, ',')} parser={value => value!.replace(/\$\s?|(,*)/g, '')} />
                    </Form.Item>
                    <Form.Item name="mo_ta" label="Mô tả">
                        <Input.TextArea rows={4} />
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    );
};

export default ClinicalServicesPage;
export const dynamic = 'force-dynamic';
