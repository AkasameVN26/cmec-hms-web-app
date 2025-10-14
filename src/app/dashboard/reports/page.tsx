'use client';

import { Button, Card, message, Typography } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const ReportsPage = () => {

  const handleDownload = () => {
    // TODO: Implement PDF generation and download logic
    message.info('Chức năng tạo và tải file PDF sẽ được phát triển trong tương lai.');
  };

  return (
    <Card>
      <Title level={2}>Báo cáo & Thống kê chi tiết</Title>
      <Paragraph>
        Tại đây, bạn có thể tải xuống các báo cáo chi tiết về hoạt động của bệnh viện dưới dạng file PDF để phục vụ cho việc lưu trữ và phân tích sâu hơn.
      </Paragraph>
      <Button 
        type="primary" 
        icon={<DownloadOutlined />} 
        size="large"
        onClick={handleDownload}
      >
        Tải về báo cáo chi tiết (PDF)
      </Button>
    </Card>
  );
};

export default ReportsPage;
