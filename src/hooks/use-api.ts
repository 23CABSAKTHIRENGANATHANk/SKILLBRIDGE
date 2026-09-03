import { useState, useEffect, useCallback } from "react";
import { ApiClient } from "@/lib/api-client";
import { useAuth } from "@/context/auth-context";
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
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchFilter = filters?.search;
  const skillFilter = filters?.skill;
  const typeFilter = filters?.type;
  const locationFilter = filters?.location;

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ApiClient.getJobs(
        Object.fromEntries(
          Object.entries({
            search: searchFilter,
            skill: skillFilter,
            type: typeFilter,
            location: locationFilter,
          }).filter(([, value]) => value !== undefined),
        ),
      );
      setJobs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, [searchFilter, skillFilter, typeFilter, locationFilter]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs, user?.id]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!document.hidden) void fetchJobs();
    }, 30000);
    return () => window.clearInterval(interval);
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
  const { user } = useAuth();
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

  const fetchDashboard = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const res = await ApiClient.getStudentDashboard();
      setData(res);
    } catch {
      // Keep existing state or empty
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setData({ pipeline: null, progress: null, applications: [] });
    fetchDashboard();
  }, [fetchDashboard, user?.id]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!document.hidden) void fetchDashboard(false);
    }, 15000);
    return () => window.clearInterval(interval);
  }, [fetchDashboard]);

  return { ...data, loading, refetch: fetchDashboard };
}

export function useStudentProfileQuery() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Awaited<
    ReturnType<typeof ApiClient.getStudentProfile>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProfile(await ApiClient.getStudentProfile());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setProfile(null);
    fetchProfile();
  }, [fetchProfile, user?.id]);

  return { profile, loading, error, refetch: fetchProfile };
}

export function useCandidatesQuery(filters?: { stage?: string; search?: string }) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const stageFilter = filters?.stage;
  const searchFilter = filters?.search;

  const fetchCandidates = useCallback(() => {
    setLoading(true);
    ApiClient.getCandidates(
      Object.fromEntries(
        Object.entries({ stage: stageFilter, search: searchFilter }).filter(
          ([, value]) => value !== undefined,
        ),
      ),
    )
      .then((res) => {
        setCandidates(res);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [stageFilter, searchFilter]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  return { candidates, loading, refetch: fetchCandidates };
}

export function usePlatformStatsQuery() {
  const [stats, setStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    ApiClient.getPlatformStats().then(setStats);
  }, []);

  return stats;
}

export function useInterviewsQuery() {
  const { user } = useAuth();
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInterviews = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
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
    setInterviews([]);
    fetchInterviews();
  }, [fetchInterviews, user?.id]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!document.hidden) void fetchInterviews(false);
    }, 15000);
    return () => window.clearInterval(interval);
  }, [fetchInterviews]);

  return { interviews, loading, error, refetch: fetchInterviews };
}
