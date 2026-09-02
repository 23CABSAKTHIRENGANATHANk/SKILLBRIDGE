import { useState, useEffect, useCallback } from "react";
import { ApiClient } from "@/lib/api-client";
import type {
  AIResumeAnalysis,
  AIMatchExplanation,
  AIRecommendedJob,
  AISkillGapAnalysis,
  AIRecruiterInsights,
} from "@/types/skillbridge";

export function useAIResumeSummary(resumeText?: string) {
  const [data, setData] = useState<AIResumeAnalysis | null>(null);
  const [aiPowered, setAiPowered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(
    async (customText?: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await ApiClient.getAIResumeSummary(customText ?? resumeText);
        setData(res.resume_analysis);
        setAiPowered(res.ai_powered);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to generate AI summary");
      } finally {
        setLoading(false);
      }
    },
    [resumeText],
  );

  return { data, aiPowered, loading, error, generate: fetchSummary };
}

export function useAIMatchExplain(jobId: string | null) {
  const [data, setData] = useState<AIMatchExplanation | null>(null);
  const [meta, setMeta] = useState<{
    jobTitle: string;
    company: string;
    matchScore: number;
  } | null>(null);
  const [aiPowered, setAiPowered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const explain = useCallback(
    async (id?: string) => {
      const targetId = id || jobId;
      if (!targetId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await ApiClient.getAIMatchExplain(targetId);
        setData(res.explanation);
        setAiPowered(res.ai_powered);
        setMeta({
          jobTitle: res.job_title,
          company: res.company,
          matchScore: res.match_score,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to analyze match");
      } finally {
        setLoading(false);
      }
    },
    [jobId],
  );

  useEffect(() => {
    if (jobId) {
      explain(jobId);
    }
  }, [jobId, explain]);

  return { data, meta, aiPowered, loading, error, explain };
}

export function useAIRecommendations() {
  const [recommendations, setRecommendations] = useState<AIRecommendedJob[]>([]);
  const [studentSkills, setStudentSkills] = useState<string[]>([]);
  const [aiPowered, setAiPowered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ApiClient.getAIRecommendations();
      setRecommendations(res.recommendations);
      setStudentSkills(res.student_skills);
      setAiPowered(res.ai_powered);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load AI recommendations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  return {
    recommendations,
    studentSkills,
    aiPowered,
    loading,
    error,
    refetch: fetchRecommendations,
  };
}

export function useAISkillGap(jobId: string | null) {
  const [data, setData] = useState<AISkillGapAnalysis | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [aiPowered, setAiPowered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(
    async (id?: string) => {
      const targetId = id || jobId;
      if (!targetId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await ApiClient.getAISkillGap(targetId);
        setData(res.gap_analysis);
        setJobTitle(res.job_title);
        setAiPowered(res.ai_powered);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to perform skill gap analysis");
      } finally {
        setLoading(false);
      }
    },
    [jobId],
  );

  useEffect(() => {
    if (jobId) {
      analyze(jobId);
    }
  }, [jobId, analyze]);

  return { data, jobTitle, aiPowered, loading, error, analyze };
}

export function useAIRecruiterInsights() {
  const [insights, setInsights] = useState<AIRecruiterInsights | null>(null);
  const [stats, setStats] = useState<{
    total: number;
    shortlisted: number;
    interview: number;
  } | null>(null);
  const [topSkills, setTopSkills] = useState<string[]>([]);
  const [aiPowered, setAiPowered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ApiClient.getAIRecruiterInsights();
      setInsights(res.insights);
      setStats(res.pipeline_stats);
      setTopSkills(res.top_skills);
      setAiPowered(res.ai_powered);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load recruiter insights");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  return { insights, stats, topSkills, aiPowered, loading, error, refetch: fetchInsights };
}
