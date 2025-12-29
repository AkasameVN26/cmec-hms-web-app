import React, { useMemo } from "react";
import { Avatar, Typography, Spin } from "antd";
import {
  UserOutlined,
  RobotOutlined,
} from "@ant-design/icons";
import InteractiveSentence from "./InteractiveSentence";
import { ExplainResponse } from "@/types/ai";

const { Text } = Typography;

export interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: Date;
}

interface AIChatMessageItemProps {
  item: Message;
  isLoading: boolean;
  isExplainLoading: boolean;
  explainData: ExplainResponse | null;
  selectedSummaryIdx: number | null;
  onSelectSummary: (idx: number | null) => void;
  isInteractive?: boolean; // Bolt: New prop to control interactivity
}

const AIChatMessageItem = React.memo(
  ({
    item,
    isLoading,
    isExplainLoading,
    explainData,
    selectedSummaryIdx,
    onSelectSummary,
    isInteractive = false,
  }: AIChatMessageItemProps) => {

    // Bolt: Optimization - Memoize the set of low similarity indices for O(1) lookup
    // This avoids O(N*M) complexity when rendering the list of sentences.
    const lowSimilarityIndices = useMemo(() => {
        if (!explainData) return new Set<number>();
        return new Set(explainData.low_similarity_matches.map(m => m.summary_idx));
    }, [explainData]);

    // Render logic for AI messages with interactive sentences
    const renderAiMessageContent = () => {
      // Bolt: Only render interactive content if this message is the one being explained
      if (explainData && isInteractive && !isLoading) {
        return (
          <div className="leading-relaxed">
            {explainData.summary_sentences.map((sent, idx) => {
              // Bolt: Use Set lookup instead of .some()
              const isLowSimilarity = lowSimilarityIndices.has(idx);
              const isSelected = selectedSummaryIdx === idx;

              return (
                <InteractiveSentence
                  key={idx}
                  sentence={sent}
                  index={idx}
                  explainData={explainData}
                  isSelected={isSelected}
                  isLowSimilarity={isLowSimilarity}
                  onSelect={onSelectSummary}
                />
              );
            })}
          </div>
        );
      }

      // Show loading state specifically for explanation if main loading is done but explain is pending
      // And ONLY if this is the message waiting for explanation (we assume last AI message logic upstream handles this,
      // but here we can check if it's the *latest* interactive one or similar.
      // However, `isInteractive` is true only after fetch. Before fetch, we don't know ID match?
      // Actually `handleFetchEvidence` sets ID before fetch starts. So `isInteractive` is true during loading too.)
      if (isExplainLoading && isInteractive && item.id !== "welcome") {
        return (
          <div>
            <Text style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>
              {item.content}
            </Text>
            <div className="mt-2 text-xs text-blue-500 flex items-center gap-2">
              <Spin size="small" /> Đang phân tích nguồn chứng minh...
            </div>
          </div>
        );
      }

      return (
        <Text style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>
          {item.content}
        </Text>
      );
    };

    return (
      <div
        style={{
          display: "flex",
          flexDirection: item.role === "user" ? "row-reverse" : "row",
          maxWidth: "95%",
          gap: 12,
          alignItems: "flex-start",
        }}
      >
        <Avatar
          size="small"
          icon={item.role === "user" ? <UserOutlined /> : <RobotOutlined />}
          style={{
            backgroundColor: item.role === "user" ? "#87d068" : "#1890ff",
            flexShrink: 0,
            marginTop: 4,
          }}
        />
        <div
          style={{
            backgroundColor: item.role === "user" ? "#95de64" : "#ffffff",
            padding: "10px 14px",
            borderRadius: "16px",
            borderTopRightRadius: item.role === "user" ? "4px" : "16px",
            borderTopLeftRadius: item.role === "ai" ? "4px" : "16px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
            maxWidth: "100%",
          }}
        >
          {/* Render Content */}
          {item.role === "ai" ? (
            renderAiMessageContent()
          ) : (
            <Text style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>
              {item.content}
            </Text>
          )}
        </div>
      </div>
    );
  },
  (prev, next) => {
    // Custom equality check for React.memo

    // 1. If message reference changed (e.g. streaming update), re-render
    if (prev.item !== next.item) return false;

    // 2. If global loading states changed, re-render
    if (prev.isLoading !== next.isLoading) return false;

    // Bolt: Only re-render for explainLoading if this message is involved
    if (prev.isExplainLoading !== next.isExplainLoading) {
        // If we are interactive, we care about loading state
        if (next.isInteractive) return false;
        // If we WERE interactive, we care
        if (prev.isInteractive) return false;
    }

    // Bolt: Check if interactivity status changed
    if (prev.isInteractive !== next.isInteractive) return false;

    // 3. If explainData changed
    if (prev.explainData !== next.explainData) {
        // Only re-render if we are interactive
        if (next.isInteractive) return false;
    }

    // 4. Handle selectedSummaryIdx changes
    // Only re-render if:
    // a) This is an AI message
    // b) We are interactive
    // c) The selection actually changed
    if (
      prev.selectedSummaryIdx !== next.selectedSummaryIdx &&
      next.item.role === "ai" &&
      next.isInteractive
    ) {
      return false; // Re-render to update highlights
    }

    // Otherwise, consider props equal and skip re-render
    return true;
  }
);

AIChatMessageItem.displayName = "AIChatMessageItem";

export default AIChatMessageItem;
