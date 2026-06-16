create table if not exists founder_chat_logs (
  id           uuid primary key default gen_random_uuid(),
  session_id   text not null,
  user_message text not null,
  ai_reply     text not null,
  page_path    text,
  created_at   timestamptz default now()
);
