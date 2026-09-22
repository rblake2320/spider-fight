alter table circuit_leaderboard
  add column if not exists season integer not null default 1 check (season >= 1 and season <= 10000);

alter table circuit_leaderboard
  drop constraint if exists circuit_leaderboard_pkey;

alter table circuit_leaderboard
  add constraint circuit_leaderboard_pkey primary key (user_id, season);

create index if not exists circuit_leaderboard_season_order_idx
  on circuit_leaderboard (season, score desc, wins desc, updated_at desc);
