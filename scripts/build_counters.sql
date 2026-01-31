-- =============================================================================
-- Build Counters (Win/Loss Appearance Rate + Effectiveness Score) from Replays
-- Per GPT Task P2.2
-- =============================================================================

-- Parameters:
-- $1 = format_id (e.g., 'reg-f')
-- $2 = target_pokemon (e.g., 'flutter-mane')

WITH base AS (
  SELECT
    replay_id AS battle_id, format_id, played_at, rating_estimate,
    p1_team, p2_team, winner_side
  FROM replays
  WHERE format_id = :format_id
    AND rating_estimate >= 1760
    AND winner_side IS NOT NULL
),

target_matches AS (
  SELECT
    battle_id, format_id,
    CASE
      WHEN p1_team ? :target_pokemon THEN 'p1'
      WHEN p2_team ? :target_pokemon THEN 'p2'
      ELSE NULL
    END AS side,
    p1_team, p2_team, 
    CASE winner_side WHEN 1 THEN 'p1' WHEN 2 THEN 'p2' END AS winner
  FROM base
  WHERE (p1_team ? :target_pokemon OR p2_team ? :target_pokemon)
),

totals AS (
  SELECT
    COUNT(*) FILTER (WHERE winner = side) AS n_wins,
    COUNT(*) FILTER (WHERE winner <> side) AS n_losses
  FROM target_matches
),

opp AS (
  -- 每场对局的"对手队伍"去重展开（按 battle_id 统计出现率）
  SELECT DISTINCT
    tm.battle_id,
    jsonb_array_elements_text(
      CASE WHEN tm.side='p1' THEN tm.p2_team ELSE tm.p1_team END
    ) AS answer,
    (tm.winner = tm.side) AS target_won
  FROM target_matches tm
),

agg AS (
  SELECT
    answer,
    COUNT(*) FILTER (WHERE target_won) AS win_appear,
    COUNT(*) FILTER (WHERE NOT target_won) AS loss_appear
  FROM opp
  GROUP BY 1
)

SELECT
  a.answer,
  a.win_appear,
  a.loss_appear,
  (a.loss_appear::float / NULLIF(t.n_losses,0)) AS loss_appearance_rate,
  (a.win_appear::float / NULLIF(t.n_wins,0)) AS win_appearance_rate,
  ((a.loss_appear::float / NULLIF(t.n_losses,0)) - (a.win_appear::float / NULLIF(t.n_wins,0))) AS effectiveness_score
FROM agg a
CROSS JOIN totals t
WHERE (a.win_appear + a.loss_appear) >= 20
ORDER BY effectiveness_score DESC;
