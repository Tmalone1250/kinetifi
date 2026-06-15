import { useQuery } from "@tanstack/react-query";

async function fetchProvenanceSummary() {
  const res = await fetch("http://localhost:8000/api/provenance/summary");
  if (!res.ok) throw new Error("failed to fetch summary");
  return res.json();
}

async function fetchRecentHashes() {
  const res = await fetch("http://localhost:8000/api/provenance/recent");
  if (!res.ok) throw new Error("failed to fetch recent hashes");
  return res.json();
}

export function useAgentProvenance() {
  const summary = useQuery({
    queryKey: ["provenance-summary"],
    queryFn: fetchProvenanceSummary,
    refetchInterval: 5000,
  });

  const recent = useQuery({
    queryKey: ["provenance-recent"],
    queryFn: fetchRecentHashes,
    refetchInterval: 5000,
  });

  return { summary, recent };
}
