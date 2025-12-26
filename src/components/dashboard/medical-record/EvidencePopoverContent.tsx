import React, { useMemo } from 'react';
import { Typography, Empty, Tag, Space, Tooltip } from 'antd';
import { FileTextOutlined } from '@ant-design/icons';

const { Text } = Typography;

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

const EvidencePopoverContent: React.FC<EvidencePopoverContentProps> = React.memo(function EvidencePopoverContent({ data, summaryIdx }) {
    // Bolt: Optimization - Memoize the expensive grouping logic to prevent recalculation on every render.
    // This logic iterates over all notes (potentially thousands) which is expensive.
    const groupedNotes = useMemo(() => {
        const match = data.matches.find(m => m.summary_idx === summaryIdx);

        if (!match || match.source_indices.length === 0) {
            return null;
        }

        const matchingIndices = new Set(match.source_indices);

        // 1. Identify relevant Source IDs (key = type + id)
        // We want to show the FULL note if any part of it is matched.
        const relevantSourceKeys = new Set<string>();
        match.source_indices.forEach(idx => {
            const note = data.notes[idx];
            if (note) relevantSourceKeys.add(`${note.source_type}_${note.source_id}`);
        });

        // 2. Reconstruct the full notes from segments
        // Group all segments from data.notes that belong to the identified sources
        const grouped: Record<string, {
            type: string,
            id: string,
            segments: { content: string, isMatch: boolean, score?: number }[]
        }> = {};
        
        data.notes.forEach((note, idx) => {
            const key = `${note.source_type}_${note.source_id}`;
            
            // Only include this note group if it contains at least one piece of evidence
            if (relevantSourceKeys.has(key)) {
                if (!grouped[key]) {
                    grouped[key] = {
                        type: note.source_type,
                        id: note.source_id?.toString() || '',
                        segments: []
                    };
                }

                const isMatch = matchingIndices.has(idx);
                let score = 0;
                if (isMatch) {
                    const matchIdx = match.source_indices.indexOf(idx);
                    score = match.scores[matchIdx];
                }

                grouped[key].segments.push({
                    content: note.content,
                    isMatch,
                    score
                });
            }
        });
        return grouped;
    }, [data, summaryIdx]);

    if (!groupedNotes) {
        return (
            <div className="w-[300px] flex flex-col items-center justify-center p-4">
                <Empty description="Không tìm thấy bằng chứng cụ thể" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </div>
        );
    }

    return (
        <div className="w-[550px] max-h-[500px] overflow-y-auto p-2 border border-gray-300 rounded-lg">
            <div className="mb-3 px-2 border-b border-gray-100 pb-2 flex justify-between items-center sticky top-0 bg-white z-10">
                <Text strong type="secondary" style={{ fontSize: 12 }}>
                    NGUỒN DẪN CHỨNG ({Object.keys(groupedNotes).length} tài liệu)
                </Text>
            </div>
            
            <div className="flex flex-col gap-4 px-2 pb-2">
                {Object.values(groupedNotes).map((group, gIdx) => (
                    <div 
                        key={gIdx} 
                        className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
                    >
                        {/* Header of the Note */}
                        <div className="bg-gray-50 px-3 py-2 border-b border-gray-100 flex justify-between items-center">
                            <Space>
                                <FileTextOutlined className="text-blue-500" />
                                <Text strong className="text-gray-700 text-sm">
                                    {group.type} 
                                    {group.id && <span className="font-normal text-gray-500 ml-1">#{group.id}</span>}
                                </Text>
                            </Space>
                        </div>

                        {/* Content of the Note (Reconstructed from segments) */}
                        <div className="p-4 text-sm leading-relaxed text-gray-800 text-justify">
                            {group.segments.map((seg, sIdx) => {
                                // Logic to render highlighted text or normal text
                                if (seg.isMatch) {
                                    return (
                                        <Tooltip 
                                            key={sIdx} 
                                            title={`Độ khớp: ${Math.round((seg.score || 0) * 100)}%`}
                                            placement="top"
                                        >
                                            <span 
                                                className="bg-yellow-200 border-b-2 border-yellow-300 px-0.5 rounded-sm cursor-help transition-colors hover:bg-yellow-300"
                                            >
                                                {seg.content}
                                            </span>
                                            {/* Add a space after segment to ensure natural reading flow */}
                                            {' '}
                                        </Tooltip>
                                    );
                                }
                                return (
                                    <span key={sIdx} className="text-gray-600">
                                        {seg.content}{' '}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

export default EvidencePopoverContent;
