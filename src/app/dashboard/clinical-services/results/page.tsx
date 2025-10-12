'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Button, Modal, Spin, Alert, Descriptions, Image } from 'antd';
import { supabase } from '@/lib/supabase';

const ServiceResultsPage = () => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedResult, setSelectedResult] = useState<any | null>(null);

  const fetchResults = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.from('ket_qua_cls').select(`
        id_ket_qua,
        thoi_gian_tra_ket_qua,
        ket_qua_text,
        url_file_ket_qua,
        chi_dinh_cls:id_chi_dinh (
          id_chi_dinh,
          dich_vu_cls:id_dich_vu ( ten_dich_vu ),
          lich_kham:id_lich_kham (
            benh_nhan:id_benh_nhan ( ho_ten )
          )
        ),
        ky_thuat_vien:id_ky_thuat_vien ( email )
      `).order('thoi_gian_tra_ket_qua', { ascending: false });

      if (error) throw error;
      setResults(data || []);
    } catch (err: any) {
      setError(`Lỗi khi tải kết quả: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const handleViewDetails = (record: any) => {
    setSelectedResult(record);
    setIsModalVisible(true);
  };

  const columns = [
    { title: 'Mã KQ', dataIndex: 'id_ket_qua', key: 'id_ket_qua' },
    { title: 'Bệnh nhân', dataIndex: ['chi_dinh_cls', 'lich_kham', 'benh_nhan', 'ho_ten'], key: 'patient_name' },
    { title: 'Dịch vụ', dataIndex: ['chi_dinh_cls', 'dich_vu_cls', 'ten_dich_vu'], key: 'service_name' },
    { title: 'Thời gian trả kết quả', dataIndex: 'thoi_gian_tra_ket_qua', key: 'thoi_gian_tra_ket_qua', render: (text: string) => new Date(text).toLocaleString() },
    { title: 'KTV thực hiện', dataIndex: ['ky_thuat_vien', 'email'], key: 'technician_email' },
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
      <Card title="Tra cứu Kết quả Cận lâm sàng">
         <Alert 
            message="Chức năng xem thông tin."
            description="Trang này dùng để tra cứu và xem chi tiết các kết quả CLS đã có. Việc tạo kết quả được thực hiện bởi Kỹ thuật viên ở các giao diện chuyên biệt."
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
        />
        <Table
          columns={columns}
          dataSource={results}
          loading={loading}
          rowKey="id_ket_qua"
        />
      </Card>

      {selectedResult && (
        <Modal
          title={`Chi tiết kết quả CLS #${selectedResult.id_ket_qua}`}
          visible={isModalVisible}
          onCancel={() => setIsModalVisible(false)}
          footer={<Button onClick={() => setIsModalVisible(false)}>Đóng</Button>}
          width={800}
        >
          <Descriptions bordered column={1}>
            <Descriptions.Item label="Bệnh nhân">{selectedResult.chi_dinh_cls.lich_kham.benh_nhan.ho_ten}</Descriptions.Item>
            <Descriptions.Item label="Dịch vụ">{selectedResult.chi_dinh_cls.dich_vu_cls.ten_dich_vu}</Descriptions.Item>
            <Descriptions.Item label="Thời gian trả kết quả">{new Date(selectedResult.thoi_gian_tra_ket_qua).toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="KTV thực hiện">{selectedResult.ky_thuat_vien.email}</Descriptions.Item>
            <Descriptions.Item label="Kết quả (Text)">
                <Input.TextArea readOnly autoSize={{ minRows: 4 }} value={selectedResult.ket_qua_text || 'Không có'} />
            </Descriptions.Item>
            <Descriptions.Item label="File kết quả (Ảnh/PDF)">
              {selectedResult.url_file_ket_qua ? (
                // Assuming the URL is a direct link to an image for simplicity
                // In a real app, you might need a more robust file viewer for PDFs etc.
                <Image width={200} src={selectedResult.url_file_ket_qua} alt="File kết quả" />
              ) : 'Không có file đính kèm'}
            </Descriptions.Item>
          </Descriptions>
        </Modal>
      )}
    </>
  );
};

export default ServiceResultsPage;