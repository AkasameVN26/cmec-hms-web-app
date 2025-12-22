"use client";
import React, { useEffect, useRef } from 'react';
import { Typography, Empty, Spin, Alert, Tooltip } from 'antd'; // Import Alert and Tooltip
import { ExplainResponse } from '@/types/ai';

const { Title, Text } = Typography;

interface SourceEvidencePanelProps {
    data: ExplainResponse | null;
    loading: boolean;
    hoveredSummaryIdx: number | null;
}

const SIMILARITY_THRESHOLD = 0.7; // Update threshold for warning

const SourceEvidencePanel: React.FC<SourceEvidencePanelProps> = ({ data, loading, hoveredSummaryIdx }) => {
    const scrollRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Auto-scroll to the highlighted source sentence
    useEffect(() => {
        if (hoveredSummaryIdx !== null && data) {
            const match = data.matches.find(m => m.summary_idx === hoveredSummaryIdx);
            if (match && match.source_indices.length > 0) {
                const firstSourceIdx = match.source_indices[0];
                const el = scrollRefs.current[firstSourceIdx];
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }
    }, [hoveredSummaryIdx, data]);

    const getSourceHighlightColor = (sourceIdx: number) => {
        if (hoveredSummaryIdx === null || !data) return 'transparent';
        
        const match = data.matches.find(m => m.summary_idx === hoveredSummaryIdx);
        if (match && match.source_indices.includes(sourceIdx)) {
            return '#fffb8f'; // Yellow highlight
        }
        return 'transparent';
    };

    const getSourceSimilarityScore = (sourceIdx: number) => {
        if (hoveredSummaryIdx === null || !data) return null;
        
        const match = data.matches.find(m => m.summary_idx === hoveredSummaryIdx);
        if (match && match.source_indices.includes(sourceIdx)) {
            const indexInMatch = match.source_indices.indexOf(sourceIdx);
            return match.scores[indexInMatch];
        }
        return null;
    };

    const shouldShowWarning = data && data.avg_similarity_score < SIMILARITY_THRESHOLD;

    return (
        <div className="h-full flex flex-col border-r border-gray-200 bg-gray-50">
            <div className="p-3 border-b border-gray-200 bg-white">
                <Title level={5} style={{ margin: 0 }}>Văn bản gốc (Bằng chứng)</Title>
            </div>
            
            {shouldShowWarning && (
                <Alert
                    message="Cảnh báo: Độ tương đồng thấp"
                    description={`Điểm tương đồng trung bình của các câu tóm tắt và câu gốc là ${data.avg_similarity_score.toFixed(2)}. Bác sĩ vui lòng đọc kỹ hồ sơ gốc để xác minh thông tin.`}
                    type="warning"
                    showIcon
                    closable
                    style={{ margin: '8px 16px' }}
                />
            )}

            <div className="flex-1 overflow-y-auto p-4 leading-7 text-gray-800">
                <Spin spinning={loading}>
                    {!data && !loading ? (
                        <div className="flex items-center justify-center h-40">
                             <Empty description="Chưa có dữ liệu" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        </div>
                    ) : (
                        <div>
                            {data?.notes.map((note, idx) => {
                                const score = getSourceSimilarityScore(idx);
                                const prevNote = idx > 0 ? data.notes[idx - 1] : null;
                                const isSameSource = prevNote && prevNote.source_type === note.source_type && prevNote.source_id === note.source_id;

                                const content = (
                                    <div 
                                        key={idx}
                                        ref={el => { scrollRefs.current[idx] = el; }}
                                        style={{ 
                                            transition: 'background-color 0.2s ease',
                                            padding: '8px 12px', // Reduced padding
                                            // Combine with previous if same source
                                            marginTop: isSameSource ? '-8px' : '0', 
                                            marginBottom: '8px',
                                            borderRadius: isSameSource ? '0 0 6px 6px' : '6px',
                                            // Visual separation logic
                                            border: '1px solid #e0e0e0',
                                            borderTop: isSameSource ? 'none' : '1px solid #e0e0e0',
                                            backgroundColor: getSourceHighlightColor(idx) !== 'transparent' ? '#fffb8f' : '#fff'
                                        }}
                                    >
                                        {!isSameSource && (
                                            <div style={{ marginBottom: 4, paddingBottom: 4, borderBottom: '1px dashed #f0f0f0' }}>
                                                <Text type="secondary" style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                                    {note.source_type}
                                                </Text>
                                            </div>
                                        )}
                                        <div style={{ whiteSpace: 'pre-wrap', fontSize: '13px' }}>
                                            {note.content}
                                        </div>
                                    </div>
                                );
                                return score !== null ? (
                                    <Tooltip title={`Điểm tương đồng: ${score.toFixed(2)}`} placement="top">
                                        {content}
                                    </Tooltip>
                                ) : (
                                    content
                                );
                            })}
                        </div>
                    )}
                </Spin>
            </div>
        </div>
    );
};

export default SourceEvidencePanel;