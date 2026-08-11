import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'

const EMPTY_STATS = { totalAudits: 0, gmcAudits: 0, seoAudits: 0, savedReports: 0 }

const EMPTY_HISTORY_SUMMARY = {
  totalAudits: 0,
  latestScore: null,
  previousScore: null,
  scoreImprovement: null,
  scoreImprovementLabel: null,
  latestReportId: null,
  previousReportId: null,
  scoreTrend: [],
}

export function useUserReports() {
  const { getAccessToken } = useAuth()
  const [reports, setReports] = useState([])
  const [stats, setStats] = useState(EMPTY_STATS)
  const [historySummary, setHistorySummary] = useState(EMPTY_HISTORY_SUMMARY)
  const [latestComparison, setLatestComparison] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadReports() {
      setLoading(true)
      setError(null)

      const token = getAccessToken()
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const res = await fetch('/api/reports/mine', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const json = await res.json()

        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || 'Failed to load reports')
        }

        if (!cancelled) {
          setReports(json.data.reports || [])
          setStats(json.data.stats || EMPTY_STATS)
          setHistorySummary(json.data.historySummary || EMPTY_HISTORY_SUMMARY)
          setLatestComparison(json.data.latestComparison ?? null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadReports()
    return () => {
      cancelled = true
    }
  }, [getAccessToken])

  return { reports, stats, historySummary, latestComparison, loading, error }
}
