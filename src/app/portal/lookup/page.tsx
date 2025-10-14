'use client';

import { useState } from 'react';
import { Card, Form, Input, Button, message, Spin, Row, Col, Typography, Descriptions, Tabs, Table, Tag, Empty, List } from 'antd';
import { supabase } from '@/lib/supabase';

const { Title, Text, Link } = Typography;
const { TabPane } = Tabs;

const PatientPortalLookupPage = () => {
    const [view, setView] = useState('form'); // 'form', 'records', 'details'
    const [loading, setLoading] = useState(false);
    const [patientData, setPatientData] = useState<any>(null);
    const [recordDetails, setRecordDetails] = useState<any>(null);
    const [selectedRecord, setSelectedRecord] = useState<any>(null);
    const [form] = Form.useForm();

    const handleLookup = async (values: any) => {
        setLoading(true);
        setPatientData(null);
        const { data, error } = await supabase.rpc('lookup_patient_portal_data', {
            p_cccd: values.cccd,
            p_sdt: values.sdt
        });

        if (error) {
            message.error("Đã có lỗi xảy ra. Vui lòng thử lại.");
            console.error(error);
        } else if (!data) {
            message.warning("Không tìm thấy hồ sơ nào khớp với thông tin bạn cung cấp. Vui lòng kiểm tra lại.");
        } else {
            setPatientData(data);
            setView('records');
        }
        setLoading(false);
    };

    const handleViewDetails = async (record: any) => {
        setLoading(true);
        setSelectedRecord(record);
        const { data, error } = await supabase.rpc('get_patient_portal_record_details', { p_ho_so_id: record.id_ho_so });

        if (error || !data) {
            message.error("Lỗi khi tải chi tiết hồ sơ.");
        } else {
            setRecordDetails(data);
            setView('details');
        }
        setLoading(false);
    };

    const handleBackToLookup = () => {
        setPatientData(null);
        setRecordDetails(null);
        setSelectedRecord(null);
        form.resetFields();
        setView('form');
    };

    const handleBackToRecords = () => {
        setRecordDetails(null);
        setSelectedRecord(null);
        setView('records');
    };

    const appointmentColumns = [
        { title: 'Ngày khám', dataIndex: 'thoi_gian_kham', key: 'thoi_gian_kham', render: (ts: string) => new Date(ts).toLocaleString('vi-VN') },
        { title: 'Bác sĩ', dataIndex: 'bac_si', key: 'bac_si' },
        { title: 'Phòng khám', dataIndex: 'phong_kham', key: 'phong_kham' },
        { title: 'Lý do khám', dataIndex: 'ly_do_kham', key: 'ly_do_kham' },
        { title: 'Kết luận', dataIndex: 'ket_luan', key: 'ket_luan', render: (text: string) => text || 'Chưa có' },
        { title: 'Trạng thái', dataIndex: 'trang_thai', key: 'trang_thai', render: (status: string) => <Tag>{status}</Tag> }
    ];

    const prescriptionColumns = [
        { title: 'Ngày kê đơn', dataIndex: 'thoi_gian_ke_don', key: 'thoi_gian_ke_don', render: (ts: string) => new Date(ts).toLocaleString('vi-VN') },
        { title: 'Bác sĩ kê đơn', dataIndex: 'bac_si', key: 'bac_si' },
        { title: 'Trạng thái', dataIndex: 'trang_thai', key: 'trang_thai', render: (status: string) => <Tag>{status}</Tag> }
    ];

    const prescriptionDetailColumns = [
        { title: 'Tên thuốc', dataIndex: 'ten_thuoc', key: 'ten_thuoc' },
        { title: 'Số lượng', dataIndex: 'so_luong', key: 'so_luong' },
        { title: 'Đơn vị', dataIndex: 'don_vi_tinh', key: 'don_vi_tinh' },
        { title: 'Liều dùng', dataIndex: 'lieu_dung', key: 'lieu_dung' },
    ];

    const renderLookupForm = () => (
        <Row justify="center" align="middle" style={{ minHeight: '80vh' }}>
            <Col xs={24} sm={18} md={12} lg={8}>
                <Spin spinning={loading}>
                    <Card>
                        <div style={{ textAlign: 'center', marginBottom: 24 }}>
                            <Title level={2}>Tra cứu Hồ sơ Bệnh án</Title>
                            <Text type="secondary">Vui lòng nhập CCCD và Số điện thoại đã đăng ký</Text>
                        </div>
                        <Form form={form} onFinish={handleLookup} layout="vertical">
                            <Form.Item name="cccd" label="Số CCCD/CMND" rules={[{ required: true, message: 'Vui lòng nhập số CCCD/CMND' }]}>
                                <Input placeholder="Nhập số Căn cước công dân..." />
                            </Form.Item>
                            <Form.Item name="sdt" label="Số điện thoại" rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}>
                                <Input placeholder="Nhập số điện thoại..." />
                            </Form.Item>
                            <Form.Item>
                                <Button type="primary" htmlType="submit" loading={loading} block>
                                    Tra cứu
                                </Button>
                            </Form.Item>
                        </Form>
                    </Card>
                </Spin>
            </Col>
        </Row>
    );

    const renderRecordsList = () => (
        <Card>
            <Button onClick={handleBackToLookup} style={{ marginBottom: 24 }}>&larr; Quay lại tra cứu</Button>
            <Title level={4}>Xin chào, {patientData.profile.ho_ten}</Title>
            <Text>Dưới đây là danh sách các hồ sơ bệnh án của bạn. Vui lòng chọn một hồ sơ để xem chi tiết.</Text>
            <List
                style={{ marginTop: 24 }}
                loading={loading}
                itemLayout="horizontal"
                dataSource={patientData.medical_records || []}
                renderItem={(item: any) => (
                    <List.Item
                        actions={[<Button type="primary" onClick={() => handleViewDetails(item)}>Xem chi tiết</Button>]}
                    >
                        <List.Item.Meta
                            title={`Hồ sơ #${item.id_ho_so}`}
                            description={`Loại: ${item.loai_benh_an} - Ngày mở: ${new Date(item.ngay_mo_ho_so).toLocaleDateString('vi-VN')}`}
                        />
                        <div><Tag color={item.trang_thai === 'Hoàn tất' ? 'success' : 'gold'}>{item.trang_thai}</Tag></div>
                    </List.Item>
                )}
            />
        </Card>
    );

    const renderRecordDetails = () => (
        <Spin spinning={loading}>
            <Card>
                <Button onClick={handleBackToRecords} style={{ marginBottom: 24 }}>&larr; Quay lại danh sách hồ sơ</Button>
                <Title level={3}>Chi tiết Hồ sơ Bệnh án #{selectedRecord.id_ho_so}</Title>
                <Descriptions bordered size="small" column={2} style={{ marginBottom: 24 }}>
                    <Descriptions.Item label="Bệnh nhân">{patientData.profile.ho_ten}</Descriptions.Item>
                    <Descriptions.Item label="Ngày mở hồ sơ">{new Date(selectedRecord.ngay_mo_ho_so).toLocaleString('vi-VN')}</Descriptions.Item>
                    <Descriptions.Item label="Loại bệnh án">{selectedRecord.loai_benh_an}</Descriptions.Item>
                    <Descriptions.Item label="Trạng thái"><Tag color={selectedRecord.trang_thai === 'Hoàn tất' ? 'success' : 'gold'}>{selectedRecord.trang_thai}</Tag></Descriptions.Item>
                </Descriptions>

                <Tabs defaultActiveKey="1">
                    <TabPane tab="Lịch sử khám bệnh" key="1">
                        <Table columns={appointmentColumns} dataSource={recordDetails.appointments || []} rowKey="id_lich_kham" pagination={{ pageSize: 5 }} />
                    </TabPane>
                    <TabPane tab="Đơn thuốc" key="2">
                        <Table
                            columns={prescriptionColumns}
                            dataSource={recordDetails.prescriptions || []}
                            rowKey="id_don_thuoc"
                            pagination={{ pageSize: 5 }}
                            expandable={{
                                expandedRowRender: record => (
                                    <Table columns={prescriptionDetailColumns} dataSource={record.medicines} rowKey="ten_thuoc" pagination={false} />
                                ),
                            }}
                        />
                    </TabPane>
                </Tabs>
            </Card>
        </Spin>
    );

    const renderContent = () => {
        switch (view) {
            case 'records':
                return renderRecordsList();
            case 'details':
                return renderRecordDetails();
            case 'form':
            default:
                return renderLookupForm();
        }
    };

    return (
        <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
            {renderContent()}
        </div>
    );
};

export default PatientPortalLookupPage;