import { useState, useEffect, useCallback } from "react";
import { ApiClient } from "@/lib/api-client";
import type {
  Job,
  Company,
  Candidate,
  PlatformStats,
  CareerProgress,
  PipelineCounts,
  Application,
} from "@/types/skillbridge";

export function useJobsQuery(filters?: {
  search?: string;
  skill?: string;
  type?: string;
  location?: string;
}) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ApiClient.getJobs(filters);
      setJobs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, [filters?.search, filters?.skill, filters?.type, filters?.location]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  return { jobs, loading, error, refetch: fetchJobs };
}

export function useCompanyQuery(companyId: string = "c1") {
  const [data, setData] = useState<{ company: Company | null; jobs: Job[] }>({
    company: null,
    jobs: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    ApiClient.getCompany(companyId)
      .then((res) => {
        if (mounted) setData(res);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [companyId]);

  return { company: data.company, companyJobs: data.jobs, loading };
}

export function useStudentDashboardQuery() {
  const [data, setData] = useState<{
    pipeline: PipelineCounts | null;
    progress: CareerProgress | null;
    applications: Application[];
  }>({
    pipeline: null,
    progress: null,
    applications: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    ApiClient.getStudentDashboard()
      .then((res) => {
        if (mounted) setData(res);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { ...data, loading };
}

export function useCandidatesQuery(filters?: { stage?: string; search?: string }) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    ApiClient.getCandidates(filters)
      .then((res) => {
        if (mounted) setCandidates(res);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [filters?.stage, filters?.search]);

  return { candidates, loading };
}

export function usePlatformStatsQuery() {
  const [stats, setStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    ApiClient.getPlatformStats().then(setStats);
  }, []);

  return stats;
}

export function useInterviewsQuery() {
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInterviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ApiClient.getInterviews();
      setInterviews(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load interviews");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInterviews();
  }, [fetchInterviews]);

  return { interviews, loading, error, refetch: fetchInterviews };
}
