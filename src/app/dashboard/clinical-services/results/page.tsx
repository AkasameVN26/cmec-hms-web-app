'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Spin, Alert, Descriptions, Image, Tag, Input } from 'antd';
import { supabase } from '@/lib/supabase';

const ServiceResultsPage = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.from('chi_dinh_cls').select(`
        id_chi_dinh,
        thoi_gian_tao_chi_dinh,
        trang_thai_chi_dinh,
        bac_si:id_bac_si_chi_dinh ( tai_khoan!inner(ho_ten) ),
        lich_kham:id_lich_kham (
          benh_nhan:id_benh_nhan ( ho_ten )
        ),
        dich_vu_cls:id_dich_vu ( ten_dich_vu ),
        ket_qua_cls!inner (
            id_ket_qua_cls,
            thoi_gian_tra_ket_qua,
            ket_luan,
            duong_dan_file_ket_qua,
            chi_so_xet_nghiem,
            ky_thuat_vien:id_ky_thuat_vien ( tai_khoan!inner(ho_ten) )
        )
      `)
      .in('trang_thai_chi_dinh', ['Hoàn thành', 'Đã huỷ'])
      .order('thoi_gian_tao_chi_dinh', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err: any) {
      setError(`Lỗi khi tải kết quả: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleViewDetails = (record: any) => {
    setSelectedRequest(record);
    setIsModalVisible(true);
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case 'Hoàn thành': return <Tag color="green">Hoàn thành</Tag>;
      case 'Đã huỷ': return <Tag color="red">Đã huỷ</Tag>;
      default: return <Tag>{status}</Tag>;
    }
  };

  const columns = [
    { title: 'Mã CĐ', dataIndex: 'id_chi_dinh', key: 'id_chi_dinh' },
    { title: 'Bệnh nhân', dataIndex: ['lich_kham', 'benh_nhan', 'ho_ten'], key: 'patient_name' },
    { title: 'Dịch vụ', dataIndex: ['dich_vu_cls', 'ten_dich_vu'], key: 'service_name' },
    { title: 'Thời gian trả KQ', dataIndex: ['ket_qua_cls', 'thoi_gian_tra_ket_qua'], key: 'result_time', render: (text: string) => text ? new Date(text).toLocaleString() : '-' },
    { title: 'Trạng thái', dataIndex: 'trang_thai_chi_dinh', key: 'status', render: getStatusTag },
    {
      title: 'Hành động',
      key: 'action',
      render: (_: any, record: any) => (
        <Button onClick={() => handleViewDetails(record)}>Xem chi tiết</Button>
      ),
    },
  ];

  if (loading) return <Spin tip="Đang tải..." />;
  if (error) return <Alert message={error} type="error" />;

  return (
    <>
      <Card title="Danh sách Kết quả Cận lâm sàng">
        <Table
          columns={columns}
          dataSource={requests}
          loading={loading}
          rowKey="id_chi_dinh"
        />
      </Card>

      {selectedRequest && selectedRequest.ket_qua_cls && (
        <Modal
          title={`Chi tiết kết quả cho CĐ #${selectedRequest.id_chi_dinh}`}
          open={isModalVisible}
          onCancel={() => setIsModalVisible(false)}
          footer={<Button onClick={() => setIsModalVisible(false)}>Đóng</Button>}
          width={800}
        >
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Bệnh nhân">{selectedRequest.lich_kham.benh_nhan.ho_ten}</Descriptions.Item>
            <Descriptions.Item label="Dịch vụ">{selectedRequest.dich_vu_cls.ten_dich_vu}</Descriptions.Item>
            <Descriptions.Item label="Bác sĩ chỉ định">{selectedRequest.bac_si.tai_khoan.ho_ten}</Descriptions.Item>
            <Descriptions.Item label="Thời gian trả kết quả">{new Date(selectedRequest.ket_qua_cls.thoi_gian_tra_ket_qua).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="KTV thực hiện">{selectedRequest.ket_qua_cls.ky_thuat_vien?.tai_khoan?.ho_ten || '-'}</Descriptions.Item>
            <Descriptions.Item label="Kết luận">{selectedRequest.ket_qua_cls.ket_luan || '-'}</Descriptions.Item>
            <Descriptions.Item label="Chỉ số xét nghiệm">
                <Input.TextArea readOnly autoSize={{ minRows: 4 }} value={selectedRequest.ket_qua_cls.chi_so_xet_nghiem ? JSON.stringify(selectedRequest.ket_qua_cls.chi_so_xet_nghiem, null, 2) : 'Không có'} />
            </Descriptions.Item>
            <Descriptions.Item label="File kết quả">
              {selectedRequest.ket_qua_cls.duong_dan_file_ket_qua ? (
                <Image width={200} src={`https://wkyyexkbgzahstfebtfh.supabase.co/storage/v1/object/public/cls_results/${selectedRequest.ket_qua_cls.duong_dan_file_ket_qua}`} alt="File kết quả" />
              ) : 'Không có file đính kèm'}
            </Descriptions.Item>
          </Descriptions>
        </Modal>
      )}
    </>
  );
};

export default ServiceResultsPage;