-- =============================================================================
-- Build Pair Synergy (Cores) from Replays
-- Per GPT Task P2.1
-- =============================================================================

-- 1) 把对局拆成"队伍样本"（p1/p2 各算一个队伍）
WITH teams AS (
  SELECT format_id, played_at, rating_estimate, p1_team AS team
  FROM replays
  WHERE format_id = :format_id AND rating_estimate >= 1760
  UNION ALL
  SELECT format_id, played_at, rating_estimate, p2_team AS team
  FROM replays
  WHERE format_id = :format_id AND rating_estimate >= 1760
),

-- 2) 展开队伍成员
mons AS (
  SELECT format_id, team, jsonb_array_elements_text(team) AS mon
  FROM teams
),

-- 3) 生成 unordered pair（避免 A+B 与 B+A 重复）
pairs AS (
  SELECT
    m1.format_id,
    LEAST(m1.mon, m2.mon) AS a,
    GREATEST(m1.mon, m2.mon) AS b,
    COUNT(*) AS team_count
  FROM mons m1
  JOIN mons m2
    ON m1.format_id = m2.format_id
   AND m1.team = m2.team
   AND m1.mon < m2.mon
  GROUP BY 1,2,3
)

SELECT * FROM pairs
ORDER BY team_count DESC
LIMIT 200;
