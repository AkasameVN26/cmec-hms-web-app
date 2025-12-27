import React from 'react';
import { Popover, Space, Tooltip } from 'antd';
import { FileSearchOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import EvidencePopoverContent from './EvidencePopoverContent';
import { ExplainResponse } from '@/types/ai';

interface InteractiveSentenceProps {
    sentence: string;
    index: number;
    explainData: ExplainResponse;
    isSelected: boolean;
    isLowSimilarity: boolean;
    onSelect: (index: number | null) => void;
}

const InteractiveSentence: React.FC<InteractiveSentenceProps> = React.memo(
    ({ sentence, index, explainData, isSelected, isLowSimilarity, onSelect }) => {
        return (
            <Popover
                content={<EvidencePopoverContent data={explainData} summaryIdx={index} />}
                title={
                    <Space>
                        <FileSearchOutlined className="text-blue-500" />
                        <span>Nguồn chứng minh</span>
                    </Space>
                }
                trigger="click"
                open={isSelected}
                onOpenChange={(visible) => onSelect(visible ? index : null)}
                placement="right"
                overlayInnerStyle={{ padding: 0 }}
            >
                <span
                    className={`
                        inline-block px-1 rounded transition-colors duration-200 cursor-pointer mb-1 mr-1 border-b border-transparent
                        ${isSelected
                            ? 'bg-[#b7eb8f] border-green-500' // Dark Green (Active)
                            : 'hover:bg-[#d9f7be] hover:border-green-300' // Light Green (Hover)
                        }
                    `}
                    title="Nhấn để xem bằng chứng"
                >
                    {sentence.trim()}
                    {isLowSimilarity && (
                        <Tooltip title="Cảnh báo: Độ tin cậy thấp (Không tìm thấy nguồn khớp chính xác)">
                            <ExclamationCircleOutlined
                                style={{ color: '#faad14', marginLeft: 4, fontSize: 12 }}
                            />
                        </Tooltip>
                    )}
                </span>
            </Popover>
        );
    }
);

InteractiveSentence.displayName = 'InteractiveSentence';

export default InteractiveSentence;
