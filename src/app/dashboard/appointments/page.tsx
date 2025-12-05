'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Button, Space, message, Spin, Tag, Modal, Form, Input, Row, Col, Select } from 'antd';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import NProgress from 'nprogress';

const { Option } = Select;

const MedicalRecordsWorklistPage = () => {
  const [records, setRecords] = useState<any[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [searchForm] = Form.useForm();

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ho_so_benh_an')
      .select(`
        *,
        benh_nhan:id_benh_nhan (*)
      `)
      .order('thoi_gian_mo_ho_so', { ascending: false });

    if (error) {
      message.error('Lỗi khi tải danh sách hồ sơ: ' + error.message);
    } else if (data) {
      setRecords(data);
      setFilteredRecords(data);
    }
    setLoading(false);
  };

  const handleSearch = (values: any) => {
    let filtered = records;

    if (values.patient_name) {
        filtered = filtered.filter(r => r.benh_nhan?.ho_ten.toLowerCase().includes(values.patient_name.toLowerCase()));
    }
    if (values.trang_thai) {
        filtered = filtered.filter(r => r.trang_thai === values.trang_thai);
    }
    if (values.loai_benh_an) {
        filtered = filtered.filter(r => r.loai_benh_an === values.loai_benh_an);
    }

    setFilteredRecords(filtered);
  };

  const handleResetSearch = () => {
    searchForm.resetFields();
    setFilteredRecords(records);
  };

  const handleUpdateRecord = (recordId: number) => {
    NProgress.start();
    router.push(`/dashboard/appointments/${recordId}`);
  };

  const handleCancelRecord = (record: any) => {
    Modal.confirm({
        title: 'Xác nhận huỷ hồ sơ bệnh án',
        content: `Bạn có chắc muốn huỷ hồ sơ #${record.id_ho_so} của bệnh nhân "${record.benh_nhan?.ho_ten}"?`,
        okText: 'Xác nhận huỷ',
        cancelText: 'Không',
        onOk: async () => {
            const { error } = await supabase
                .from('ho_so_benh_an')
                .update({ trang_thai: 'Đã huỷ' })
                .eq('id_ho_so', record.id_ho_so);
            
            if (error) {
                message.error(`Lỗi khi huỷ hồ sơ: ${error.message}`);
            } else {
                message.success('Huỷ hồ sơ thành công.');
                fetchRecords();
            }
        }
    });
  };

  const columns = [
    { 
      title: 'Mã Hồ sơ',
      dataIndex: 'id_ho_so',
      key: 'id_ho_so',
      render: (id: number) => `#${id}`
    },
    {
      title: 'Bệnh nhân',
      dataIndex: ['benh_nhan', 'ho_ten'],
      key: 'ho_ten',
    },
    {
        title: 'Trạng thái',
        dataIndex: 'trang_thai',
        key: 'trang_thai',
        render: (status: string) => {
            let color = 'default';
            if (status === 'Đang xử lý') {
                color = 'gold';
            } else if (status === 'Hoàn tất') {
                color = 'success';
            } else if (status === 'Đã huỷ') {
                color = 'error';
            }
            return <Tag color={color}>{status.toUpperCase()}</Tag>;
        }
    },
    {
      title: 'Ngày mở hồ sơ',
      dataIndex: 'thoi_gian_mo_ho_so',
      key: 'thoi_gian_mo_ho_so',
      render: (ts: string) => new Date(ts).toLocaleString('vi-VN')
    },
    {
      title: 'Loại bệnh án',
      dataIndex: 'loai_benh_an',
      key: 'loai_benh_an',
      render: (type: string) => <Tag color={type === 'Nội trú' ? 'red' : 'blue'}>{type}</Tag>
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button type="primary" onClick={() => handleUpdateRecord(record.id_ho_so)}>
            {record.trang_thai === 'Đang xử lý' ? 'Cập nhật hồ sơ' : 'Xem hồ sơ'}
          </Button>
          {record.trang_thai === 'Đang xử lý' && 
            <Button danger onClick={() => handleCancelRecord(record)}>Huỷ hồ sơ</Button>
          }
        </Space>
      ),
    },
  ];

  return (
    <Card title="Danh sách Hồ sơ Bệnh án">
        <Form form={searchForm} onFinish={handleSearch} layout="vertical" style={{ marginBottom: 24 }}>
            <Row gutter={16}>
                <Col span={8}>
                    <Form.Item name="patient_name" label="Tên bệnh nhân">
                        <Input placeholder="Nhập tên bệnh nhân..." allowClear />
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item name="trang_thai" label="Trạng thái hồ sơ">
                        <Select placeholder="Lọc theo trạng thái" allowClear>
                            <Option value="Đang xử lý">Đang xử lý</Option>
                            <Option value="Hoàn tất">Hoàn tất</Option>
                            <Option value="Đã huỷ">Đã huỷ</Option>
                        </Select>
                    </Form.Item>
                </Col>
                <Col span={8}>
                    <Form.Item name="loai_benh_an" label="Loại bệnh án">
                        <Select placeholder="Lọc theo loại bệnh án" allowClear>
                            <Option value="Ngoại trú">Ngoại trú</Option>
                            <Option value="Nội trú">Nội trú</Option>
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
          dataSource={filteredRecords}
          loading={loading}
          rowKey="id_ho_so"
        />
    </Card>
  );
};

export default MedicalRecordsWorklistPage;
export const dynamic = 'force-dynamic';
