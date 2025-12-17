import React from 'react';
import { Typography, Empty, Tag, Space } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

interface SourceSegment {
    content: string;
    source_type: string;
    source_id?: string | number | null;
}

interface MatchDetail {
    summary_idx: number;
    source_indices: number[];
    scores: number[];
}

interface ExplainResponse {
    notes: SourceSegment[];
    matches: MatchDetail[];
}

interface EvidencePopoverContentProps {
    data: ExplainResponse;
    summaryIdx: number;
}

const EvidencePopoverContent: React.FC<EvidencePopoverContentProps> = ({ data, summaryIdx }) => {
    const match = data.matches.find(m => m.summary_idx === summaryIdx);

    if (!match || match.source_indices.length === 0) {
        return (
            <div className="w-[300px] flex flex-col items-center justify-center p-4">
                <Empty description="Không tìm thấy bằng chứng cụ thể" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </div>
        );
    }

    // Filter relevant notes based on source_indices
    const evidenceItems = match.source_indices.map((sourceIdx, idx) => ({
        note: data.notes[sourceIdx],
        score: match.scores[idx]
    }));

    return (
        <div className="w-[400px] max-h-[400px] overflow-y-auto">
            <div className="mb-2 border-b pb-2">
                <Text strong type="secondary" style={{ fontSize: 12 }}>
                    TÌM THẤY {evidenceItems.length} NGUỒN DẪN CHỨNG:
                </Text>
            </div>
            <div className="flex flex-col gap-3">
                {evidenceItems.map((item, index) => (
                    <div 
                        key={index} 
                        className="bg-gray-50 p-3 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
                    >
                        <div className="flex justify-between items-center mb-1">
                            <Space size={4}>
                                <FileTextOutlined className="text-blue-500" />
                                <Tag color="blue" bordered={false} style={{ margin: 0, fontSize: 10 }}>
                                    {item.note.source_type}
                                </Tag>
                            </Space>
                            <Tag color={item.score >= 0.7 ? "success" : "warning"} bordered={false}>
                                {Math.round(item.score * 100)}% khớp
                            </Tag>
                        </div>
                        <Text className="text-gray-700 text-sm block leading-relaxed">
                            {item.note.content}
                        </Text>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default EvidencePopoverContent;
