create table if not exists circuit_leaderboard (
  user_id text primary key,
  stable_name text not null check (char_length(stable_name) between 1 and 22),
  score integer not null check (score >= 0 and score <= 100000),
  wins integer not null check (wins >= 0 and wins <= 10000),
  rank integer not null check (rank >= 0 and rank <= 7),
  updated_at timestamptz not null default now()
);

create index if not exists circuit_leaderboard_order_idx
  on circuit_leaderboard (score desc, wins desc, updated_at desc);
