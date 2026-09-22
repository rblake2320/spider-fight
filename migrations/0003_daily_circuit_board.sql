create table if not exists daily_circuit_board (
  user_id text not null,
  day date not null,
  season integer not null check (season >= 1 and season <= 10000),
  stable_name text not null check (char_length(stable_name) between 1 and 22),
  score integer not null check (score >= 0 and score <= 100000),
  wins integer not null check (wins >= 0 and wins <= 10000),
  rank integer not null check (rank between 0 and 7),
  updated_at timestamptz not null default now(),
  primary key (user_id, day, season)
);

create index if not exists daily_circuit_board_day_order_idx
  on daily_circuit_board (day, season, score desc, wins desc, updated_at desc);
