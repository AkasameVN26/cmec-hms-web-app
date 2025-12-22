export interface SourceSegment {
    content: string;
    source_type: string;
    source_id?: string | number | null;
}

export interface MatchDetail {
    summary_idx: number;
    source_indices: number[];
    scores: number[];
}

export interface ExplainResponse {
    notes: SourceSegment[];
    summary_sentences: string[];
    matches: MatchDetail[];
    avg_similarity_score: number;
    low_similarity_matches: MatchDetail[];
}
