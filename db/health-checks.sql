-- =====================================================================
-- Online Quiz Portal: database health checks (READ-ONLY)
-- =====================================================================
-- Every query in this file only reads. Nothing here adds, changes or
-- deletes data, and the first lines below make the session refuse any
-- write, just in case.
--
-- How to run (full guide: https://claude.ai/artifact/9CJTPzgAzr2D1CMay4yFNa):
--   Whole file, in psql:  \i db/health-checks.sql
--   One check at a time:  in pgAdmin's Query Tool, select a single query
--                         and press F5. (Skip the lines starting with \echo;
--                         they only print headings in psql.)
--
-- Password columns (passwordHash, passwordEncrypted) are never selected.
-- Dates are stored in UTC; the daily reports convert them to India time
-- (Asia/Kolkata). Change that name if you need another time zone.
-- =====================================================================

SET default_transaction_read_only = on;  -- any accidental write fails
SET statement_timeout = '30s';           -- no check can run away on production
SET application_name = 'health-checks';  -- shows who this is in the connections list


-- =====================================================================
\echo '=== 0. SCORECARD: one line per check. Start here. ==='
-- status: OK = nothing found, INFO = worth knowing, WARN = look at it,
-- FAIL = fix it. Each check has a detail query further down (same code).
-- =====================================================================
WITH checks(code, area, description, problems, level) AS (
  VALUES
  -- Admins
  ('A1', 'Admins', 'No active Super Admin (nobody can manage the portal)',
     CASE WHEN (SELECT count(*) FROM "Admin" WHERE role = 'SUPER_ADMIN' AND active) = 0 THEN 1 ELSE 0 END, 'FAIL'),
  ('A2', 'Admins', 'Admin accounts locked right now (too many wrong passwords)',
     (SELECT count(*) FROM "Admin" WHERE "lockedUntil" > now()), 'WARN'),
  -- Quiz-takers
  ('U1', 'Users', 'User''s block belongs to a different district',
     (SELECT count(*) FROM "User" u JOIN "Block" b ON b.id = u."blockId" WHERE b."districtId" <> u."districtId"), 'FAIL'),
  ('U2', 'Users', 'Phone is not a 10-digit Indian mobile number',
     (SELECT count(*) FROM "User" WHERE phone !~ '^[6-9][0-9]{9}$'), 'WARN'),
  ('U3', 'Users', 'Name is blank',
     (SELECT count(*) FROM "User" WHERE btrim(name) = ''), 'WARN'),
  ('U4', 'Users', 'Local Admin link points to a missing, inactive or Super Admin account',
     (SELECT count(*) FROM "User" u LEFT JOIN "Admin" a ON a.id = u."localAdminId"
       WHERE u."localAdminId" IS NOT NULL AND (a.id IS NULL OR NOT a.active OR a.role <> 'LOCAL_ADMIN')), 'WARN'),
  ('U5', 'Users', 'Users locked right now (too many wrong passwords)',
     (SELECT count(*) FROM "User" WHERE "lockedUntil" > now()), 'INFO'),
  ('U6', 'Users', 'Active users who have not set their own password yet',
     (SELECT count(*) FROM "User" WHERE active AND "passwordChangedAt" IS NULL), 'INFO'),
  ('U7', 'Users', 'Same phone registered under more than one district/block/role',
     (SELECT count(*) FROM (SELECT phone FROM "User" GROUP BY phone HAVING count(*) > 1) d), 'INFO'),
  -- Questions
  ('Q1', 'Questions', 'Question has fewer than 2 or more than 6 options',
     (SELECT count(*) FROM "Question" WHERE coalesce(cardinality(options), 0) NOT BETWEEN 2 AND 6), 'FAIL'),
  ('Q2', 'Questions', 'Correct answer number points outside the options',
     (SELECT count(*) FROM "Question" WHERE "correctIndex" < 0 OR "correctIndex" >= coalesce(cardinality(options), 0)), 'FAIL'),
  ('Q3', 'Questions', 'Question text or an option is blank',
     (SELECT count(*) FROM "Question" q WHERE btrim(q.text) = ''
        OR EXISTS (SELECT 1 FROM unnest(q.options) o WHERE btrim(o) = '')), 'FAIL'),
  ('Q4', 'Questions', 'Same question text appears twice in one bank',
     (SELECT count(*) FROM (SELECT 1 FROM "Question" GROUP BY "bankId", lower(btrim(text)) HAVING count(*) > 1) d), 'WARN'),
  -- Quizzes
  ('Z1', 'Quizzes', 'Quiz closes before (or when) it opens',
     (SELECT count(*) FROM "Quiz" WHERE "opensAt" IS NOT NULL AND "closesAt" IS NOT NULL AND "closesAt" <= "opensAt"), 'FAIL'),
  ('Z2', 'Quizzes', 'Quiz settings out of range (pass mark, time limit, question counts)',
     (SELECT count(*) FROM "Quiz" WHERE "passingScore" NOT BETWEEN 0 AND 100 OR "timeLimitMinutes" <= 0
        OR "numEasy" < 0 OR "numMedium" < 0 OR "numHard" < 0 OR "numEasy" + "numMedium" + "numHard" = 0), 'FAIL'),
  ('Z3', 'Quizzes', 'Active quiz needs more questions than its bank has active',
     (SELECT count(*) FROM "Quiz" z WHERE z.active AND z."numEasy" + z."numMedium" + z."numHard" >
        (SELECT count(*) FROM "Question" q WHERE q."bankId" = z."bankId" AND q.active)), 'WARN'),
  ('Z4', 'Quizzes', 'Active, open quiz with nobody assigned',
     (SELECT count(*) FROM "Quiz" z WHERE z.active AND (z."closesAt" IS NULL OR z."closesAt" > now())
        AND NOT EXISTS (SELECT 1 FROM "Assignment" a WHERE a."quizId" = z.id)), 'INFO'),
  -- Attempts
  ('T1', 'Attempts', 'Answers list and question list have different lengths',
     (SELECT count(*) FROM "Attempt" WHERE cardinality(answers) <> cardinality("questionIds")), 'FAIL'),
  ('T2', 'Attempts', 'Submitted attempt is missing its score, pass/fail or submit time',
     (SELECT count(*) FROM "Attempt" WHERE status = 'SUBMITTED'
        AND (score IS NULL OR "correctCount" IS NULL OR passed IS NULL OR "submittedAt" IS NULL)), 'FAIL'),
  ('T3', 'Attempts', 'In-progress attempt already has a score or submit time',
     (SELECT count(*) FROM "Attempt" WHERE status = 'IN_PROGRESS'
        AND (score IS NOT NULL OR passed IS NOT NULL OR "submittedAt" IS NOT NULL)), 'FAIL'),
  ('T4', 'Attempts', 'Score outside 0-100, or more correct answers than questions',
     (SELECT count(*) FROM "Attempt" WHERE score NOT BETWEEN 0 AND 100
        OR "correctCount" < 0 OR "correctCount" > cardinality("questionIds")), 'FAIL'),
  ('T5', 'Attempts', 'An answer is not -1 (blank) or a valid option number',
     (SELECT count(*) FROM "Attempt" t WHERE EXISTS (SELECT 1 FROM unnest(t.answers) x WHERE x < -1 OR x > 5)), 'FAIL'),
  ('T6', 'Attempts', 'Submit time is before the start time or after the deadline',
     (SELECT count(*) FROM "Attempt" WHERE "submittedAt" < "startedAt" OR "submittedAt" > deadline), 'FAIL'),
  ('T7', 'Attempts', 'Attempt refers to a question that no longer exists',
     (SELECT count(*) FROM "Attempt" t WHERE EXISTS (SELECT 1 FROM unnest(t."questionIds") qid
        WHERE NOT EXISTS (SELECT 1 FROM "Question" q WHERE q.id = qid))), 'WARN'),
  ('T8', 'Attempts', 'Pass/fail does not match score vs the quiz''s current pass mark',
     (SELECT count(*) FROM "Attempt" t JOIN "Quiz" z ON z.id = t."quizId"
       WHERE t.status = 'SUBMITTED' AND t.passed <> (t.score >= z."passingScore")), 'INFO'),
  ('T9', 'Attempts', 'Attempt by someone no longer assigned to that quiz',
     (SELECT count(*) FROM "Attempt" t WHERE NOT EXISTS
        (SELECT 1 FROM "Assignment" a WHERE a."quizId" = t."quizId" AND a."userId" = t."userId")), 'INFO'),
  ('T10', 'Attempts', 'Time ran out but attempt not yet marked submitted',
     (SELECT count(*) FROM "Attempt" WHERE status = 'IN_PROGRESS' AND deadline < now() - interval '1 minute'), 'INFO'),
  -- Database
  ('D1', 'Database', 'Database updates (migrations) that failed or did not finish',
     (SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL), 'FAIL'),
  ('D2', 'Database', 'Connections not using encryption (SSL)',
     (SELECT count(*) FROM pg_stat_ssl s JOIN pg_stat_activity a ON a.pid = s.pid
       WHERE NOT s.ssl AND a.client_addr IS NOT NULL AND a.backend_type = 'client backend'), 'WARN'),
  ('D3', 'Database', 'Sessions stuck "idle in transaction" for over 5 minutes',
     (SELECT count(*) FROM pg_stat_activity WHERE state LIKE 'idle in transaction%' AND state_change < now() - interval '5 minutes'), 'WARN'),
  ('D4', 'Database', 'Queries running for over 1 minute',
     (SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND backend_type = 'client backend'
        AND query_start < now() - interval '1 minute' AND pid <> pg_backend_pid()), 'WARN')
)
SELECT code, area, CASE WHEN problems = 0 THEN 'OK' ELSE level END AS status, problems, description
FROM checks
ORDER BY CASE WHEN problems = 0 THEN 4 ELSE array_position(ARRAY['FAIL','WARN','INFO'], level) END, code;


-- =====================================================================
\echo '=== 1. ORIENTATION: what is in the database ==='
-- =====================================================================

\echo '--- 1.1 Server version, database name and size, time zone'
SELECT version() AS postgres_version,
       current_database() AS database,
       pg_size_pretty(pg_database_size(current_database())) AS size,
       current_setting('TimeZone') AS server_time_zone,
       now() AS server_time;

\echo '--- 1.2 Tables with row counts and size on disk'
-- n_live_tup is an estimate kept by PostgreSQL; fine for a health check.
SELECT relname AS table_name,
       n_live_tup AS approx_rows,
       pg_size_pretty(pg_total_relation_size(relid)) AS total_size_incl_indexes
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

\echo '--- 1.3 Exact row counts (slower on big tables)'
SELECT 'District' AS table_name, count(*) AS rows FROM "District"
UNION ALL SELECT 'Block', count(*) FROM "Block"
UNION ALL SELECT 'Admin', count(*) FROM "Admin"
UNION ALL SELECT 'User', count(*) FROM "User"
UNION ALL SELECT 'QuestionBank', count(*) FROM "QuestionBank"
UNION ALL SELECT 'Question', count(*) FROM "Question"
UNION ALL SELECT 'Quiz', count(*) FROM "Quiz"
UNION ALL SELECT 'QuizManager', count(*) FROM "QuizManager"
UNION ALL SELECT 'Assignment', count(*) FROM "Assignment"
UNION ALL SELECT 'Attempt', count(*) FROM "Attempt";

\echo '--- 1.4 Every column: type, required or optional, default'
SELECT table_name, ordinal_position AS pos, column_name,
       CASE WHEN data_type = 'ARRAY' THEN udt_name || ' (list)'
            WHEN data_type = 'USER-DEFINED' THEN udt_name || ' (choice list)'
            ELSE data_type END AS type,
       CASE WHEN is_nullable = 'NO' THEN 'required' ELSE 'optional' END AS required,
       column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name <> '_prisma_migrations'
ORDER BY table_name, ordinal_position;

\echo '--- 1.5 Choice lists (enums) and their allowed values'
SELECT t.typname AS choice_list, string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS allowed_values
FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
GROUP BY t.typname ORDER BY t.typname;

\echo '--- 1.6 Links between tables (foreign keys) and what happens on delete'
SELECT conrelid::regclass AS from_table,
       confrelid::regclass AS to_table,
       pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE contype = 'f' AND connamespace = 'public'::regnamespace
ORDER BY 1, 2;

\echo '--- 1.7 Unique rules and indexes (what keeps data from duplicating)'
SELECT tablename AS table_name, indexname AS index_name, indexdef AS definition
FROM pg_indexes WHERE schemaname = 'public'
ORDER BY tablename, indexname;

\echo '--- 1.8 Database update history (Prisma migrations)'
SELECT migration_name, started_at, finished_at, rolled_back_at, applied_steps_count
FROM "_prisma_migrations" ORDER BY started_at;

\echo '--- 1.9 Who can sign in to the database (roles)'
-- Expect: postgres (the master user) and, if created, quiz_readonly.
-- The rds* roles are AWS's own and are normal on RDS.
SELECT rolname AS role, rolcanlogin AS can_login, rolsuper AS superuser,
       rolcreaterole AS can_create_roles, rolcreatedb AS can_create_db,
       rolvaliduntil AS password_expires
FROM pg_roles WHERE rolname !~ '^pg_'
ORDER BY rolcanlogin DESC, rolname;


-- =====================================================================
\echo '=== 2. CONNECTIONS: who is connected and what they are doing ==='
-- =====================================================================

\echo '--- 2.1 Connection limit and how much of it is in use'
SELECT current_setting('max_connections')::int AS max_connections,
       count(*) AS connections_now,
       round(100.0 * count(*) / current_setting('max_connections')::int, 1) AS percent_used
FROM pg_stat_activity WHERE backend_type = 'client backend';

\echo '--- 2.2 Connections grouped by user, app and state'
-- The web app shows up as user "postgres" with an empty application name.
SELECT usename AS db_user, coalesce(nullif(application_name, ''), '(app)') AS application,
       coalesce(state, '-') AS state, count(*) AS connections,
       max(now() - backend_start) AS oldest_connection_age
FROM pg_stat_activity WHERE backend_type = 'client backend'
GROUP BY 1, 2, 3 ORDER BY connections DESC;

\echo '--- 2.3 Where connections come from, and whether they are encrypted'
SELECT a.client_addr AS from_ip, a.usename AS db_user, s.ssl AS encrypted, s.version AS tls_version,
       count(*) AS connections
FROM pg_stat_activity a JOIN pg_stat_ssl s ON s.pid = a.pid
WHERE a.backend_type = 'client backend'
GROUP BY 1, 2, 3, 4 ORDER BY connections DESC;

\echo '--- 2.4 Is encryption required for every connection? (AWS RDS only; empty elsewhere)'
SELECT current_setting('rds.force_ssl', true) AS rds_force_ssl,  -- 1 = required (good)
       current_setting('ssl') AS ssl_enabled;

\echo '--- 2.5 Queries running right now, longest first (details D4)'
SELECT pid, usename AS db_user, state, now() - query_start AS running_for,
       wait_event_type, left(query, 120) AS query_start_text
FROM pg_stat_activity
WHERE backend_type = 'client backend' AND state <> 'idle' AND pid <> pg_backend_pid()
ORDER BY query_start;

\echo '--- 2.6 Sessions stuck in an open transaction (details D3)'
SELECT pid, usename AS db_user, client_addr, now() - state_change AS stuck_for, left(query, 120) AS last_query
FROM pg_stat_activity WHERE state LIKE 'idle in transaction%'
ORDER BY state_change;

\echo '--- 2.7 Queries waiting on another query (blocking)'
SELECT waiting.pid AS waiting_pid, left(waiting.query, 80) AS waiting_query,
       blocker.pid AS blocking_pid, left(blocker.query, 80) AS blocking_query,
       now() - waiting.query_start AS waiting_for
FROM pg_stat_activity waiting
JOIN LATERAL unnest(pg_blocking_pids(waiting.pid)) b(pid) ON true
JOIN pg_stat_activity blocker ON blocker.pid = b.pid;


-- =====================================================================
\echo '=== 3. PERFORMANCE AND STORAGE ==='
-- =====================================================================

\echo '--- 3.1 Cache hit rate (want above 99%; lower means the server needs more memory)'
SELECT round(100.0 * sum(blks_hit) / nullif(sum(blks_hit) + sum(blks_read), 0), 2) AS cache_hit_percent
FROM pg_stat_database WHERE datname = current_database();

\echo '--- 3.2 Clean-up status: dead rows and last automatic vacuum/analyze'
-- Dead rows are old versions left by updates and deletes. PostgreSQL cleans
-- them up automatically (autovacuum). A dead_percent above 20 that stays high
-- for days is worth a look.
SELECT relname AS table_name, n_live_tup AS live_rows, n_dead_tup AS dead_rows,
       round(100.0 * n_dead_tup / nullif(n_live_tup + n_dead_tup, 0), 1) AS dead_percent,
       last_autovacuum, last_autoanalyze
FROM pg_stat_user_tables ORDER BY n_dead_tup DESC;

\echo '--- 3.3 Tables read in full (sequential scans) vs by index'
-- Small tables (District, Block, Quiz) are normally read in full; that is fine.
-- Large tables (User, Attempt, Question) should mostly use indexes.
SELECT relname AS table_name, n_live_tup AS approx_rows, seq_scan, idx_scan,
       round(100.0 * idx_scan / nullif(seq_scan + idx_scan, 0), 1) AS index_use_percent
FROM pg_stat_user_tables ORDER BY seq_scan DESC;

\echo '--- 3.4 Indexes and how often they are used (counts since last stats reset)'
SELECT relname AS table_name, indexrelname AS index_name, idx_scan AS times_used,
       pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes ORDER BY idx_scan, pg_relation_size(indexrelid) DESC;

\echo '--- 3.5 Transaction ID age (PostgreSQL warns near 2 billion; under 200 million is normal)'
SELECT datname AS database, age(datfrozenxid) AS xid_age
FROM pg_database ORDER BY 2 DESC;


-- =====================================================================
\echo '=== 4. DATA CHECKS: detail for each scorecard line ==='
-- An empty result means no problem. Codes match the scorecard.
-- =====================================================================

\echo '--- A1 Active Super Admins (must be at least 1)'
SELECT username, name, active, "lockedUntil" AS locked_until, "createdAt" AS created
FROM "Admin" WHERE role = 'SUPER_ADMIN' ORDER BY active DESC, username;

\echo '--- A2 Admins locked right now'
SELECT username, name, role, "failedLogins" AS failed_logins, "lockedUntil" AS locked_until
FROM "Admin" WHERE "lockedUntil" > now();

\echo '--- A3 All admins with how many users and quizzes they look after'
SELECT a.username, a.name, a.role, a.active,
       (SELECT count(*) FROM "User" u WHERE u."localAdminId" = a.id) AS users,
       (SELECT count(*) FROM "QuizManager" m WHERE m."adminId" = a.id) AS quizzes_managed
FROM "Admin" a ORDER BY a.role, a.username;

\echo '--- U1 Users whose block is in a different district'
SELECT u.id, u.name, du.name AS user_district, b.name AS block, db.name AS block_district
FROM "User" u
JOIN "District" du ON du.id = u."districtId"
JOIN "Block" b ON b.id = u."blockId"
JOIN "District" db ON db.id = b."districtId"
WHERE b."districtId" <> u."districtId";

\echo '--- U2 Phone numbers that are not 10-digit mobiles'
SELECT u.id, u.name, u.phone, d.name AS district, b.name AS block
FROM "User" u JOIN "District" d ON d.id = u."districtId" JOIN "Block" b ON b.id = u."blockId"
WHERE u.phone !~ '^[6-9][0-9]{9}$';

\echo '--- U3 Users with a blank name'
SELECT u.id, u.phone, u."roleType" AS role, u."createdAt" AS created FROM "User" u WHERE btrim(u.name) = '';

\echo '--- U4 Users linked to a missing, inactive or Super Admin account'
SELECT u.id, u.name, a.username AS linked_admin, a.role, a.active
FROM "User" u LEFT JOIN "Admin" a ON a.id = u."localAdminId"
WHERE u."localAdminId" IS NOT NULL AND (a.id IS NULL OR NOT a.active OR a.role <> 'LOCAL_ADMIN');

\echo '--- U5 Users locked right now'
SELECT u.name, d.name AS district, b.name AS block, u."roleType" AS role,
       u."failedLogins" AS failed_logins, u."lockedUntil" AS locked_until
FROM "User" u JOIN "District" d ON d.id = u."districtId" JOIN "Block" b ON b.id = u."blockId"
WHERE u."lockedUntil" > now() ORDER BY u."lockedUntil" DESC;

\echo '--- U6 Own-password take-up by district (users still on the starting password)'
SELECT d.name AS district, count(*) AS active_users,
       count(*) FILTER (WHERE u."passwordChangedAt" IS NULL) AS still_on_starting_password,
       round(100.0 * count(*) FILTER (WHERE u."passwordChangedAt" IS NOT NULL) / count(*), 1) AS percent_changed
FROM "User" u JOIN "District" d ON d.id = u."districtId"
WHERE u.active GROUP BY d.name ORDER BY still_on_starting_password DESC;

\echo '--- U7 Phones registered more than once (allowed, but often a typo)'
SELECT u.phone, count(*) AS times,
       string_agg(u.name || ' / ' || d.name || ' / ' || b.name || ' / ' || u."roleType", '; ') AS registrations
FROM "User" u JOIN "District" d ON d.id = u."districtId" JOIN "Block" b ON b.id = u."blockId"
GROUP BY u.phone HAVING count(*) > 1 ORDER BY times DESC;

\echo '--- Q1/Q2/Q3 Broken questions'
SELECT qb.name AS bank, q."externalId" AS question_id, left(q.text, 60) AS text,
       cardinality(q.options) AS options, q."correctIndex" AS correct_index,
       CASE WHEN coalesce(cardinality(q.options), 0) NOT BETWEEN 2 AND 6 THEN 'Q1 option count'
            WHEN q."correctIndex" < 0 OR q."correctIndex" >= cardinality(q.options) THEN 'Q2 correct answer out of range'
            ELSE 'Q3 blank text or option' END AS problem
FROM "Question" q JOIN "QuestionBank" qb ON qb.id = q."bankId"
WHERE coalesce(cardinality(q.options), 0) NOT BETWEEN 2 AND 6
   OR q."correctIndex" < 0 OR q."correctIndex" >= coalesce(cardinality(q.options), 0)
   OR btrim(q.text) = ''
   OR EXISTS (SELECT 1 FROM unnest(q.options) o WHERE btrim(o) = '');

\echo '--- Q4 Duplicate question text within a bank'
SELECT qb.name AS bank, left(min(q.text), 80) AS text, count(*) AS copies,
       string_agg(q."externalId", ', ') AS question_ids
FROM "Question" q JOIN "QuestionBank" qb ON qb.id = q."bankId"
GROUP BY qb.name, lower(btrim(q.text)) HAVING count(*) > 1;

\echo '--- Q5 Question banks: active questions per difficulty'
SELECT qb.name AS bank,
       count(*) FILTER (WHERE q.active AND q.difficulty = 'EASY') AS easy,
       count(*) FILTER (WHERE q.active AND q.difficulty = 'MEDIUM') AS medium,
       count(*) FILTER (WHERE q.active AND q.difficulty = 'HARD') AS hard,
       count(*) FILTER (WHERE NOT q.active) AS inactive
FROM "QuestionBank" qb LEFT JOIN "Question" q ON q."bankId" = qb.id
GROUP BY qb.name ORDER BY qb.name;

\echo '--- Z1/Z2/Z3 Quiz settings vs available questions'
-- If a level is short, the app tops up from other levels; Z3 is only a problem
-- when the bank has fewer active questions in total than the quiz needs.
SELECT z.title, z.active, z."opensAt" AS opens, z."closesAt" AS closes,
       z."timeLimitMinutes" AS minutes, z."passingScore" AS pass_mark,
       z."numEasy" || '/' || z."numMedium" || '/' || z."numHard" AS wants_easy_med_hard,
       (SELECT count(*) FILTER (WHERE q.difficulty = 'EASY') || '/' || count(*) FILTER (WHERE q.difficulty = 'MEDIUM')
               || '/' || count(*) FILTER (WHERE q.difficulty = 'HARD')
          FROM "Question" q WHERE q."bankId" = z."bankId" AND q.active) AS bank_has_easy_med_hard
FROM "Quiz" z ORDER BY z.active DESC, z."createdAt" DESC;

\echo '--- Z4 Active, open quizzes with nobody assigned'
SELECT z.title, z."opensAt" AS opens, z."closesAt" AS closes
FROM "Quiz" z WHERE z.active AND (z."closesAt" IS NULL OR z."closesAt" > now())
  AND NOT EXISTS (SELECT 1 FROM "Assignment" a WHERE a."quizId" = z.id);

\echo '--- T1-T6 Attempts with broken data'
SELECT t.id AS attempt_id, u.name AS user_name, z.title AS quiz, t.status, t."startedAt", t."submittedAt",
       t.score, t."correctCount", cardinality(t."questionIds") AS questions, cardinality(t.answers) AS answers,
       concat_ws(', ',
         CASE WHEN cardinality(t.answers) <> cardinality(t."questionIds") THEN 'T1 length mismatch' END,
         CASE WHEN t.status = 'SUBMITTED' AND (t.score IS NULL OR t."correctCount" IS NULL OR t.passed IS NULL OR t."submittedAt" IS NULL) THEN 'T2 missing result' END,
         CASE WHEN t.status = 'IN_PROGRESS' AND (t.score IS NOT NULL OR t.passed IS NOT NULL OR t."submittedAt" IS NOT NULL) THEN 'T3 result on unfinished attempt' END,
         CASE WHEN t.score NOT BETWEEN 0 AND 100 OR t."correctCount" < 0 OR t."correctCount" > cardinality(t."questionIds") THEN 'T4 score out of range' END,
         CASE WHEN EXISTS (SELECT 1 FROM unnest(t.answers) x WHERE x < -1 OR x > 5) THEN 'T5 invalid answer' END,
         CASE WHEN t."submittedAt" < t."startedAt" OR t."submittedAt" > t.deadline THEN 'T6 submit time' END
       ) AS problems
FROM "Attempt" t JOIN "User" u ON u.id = t."userId" JOIN "Quiz" z ON z.id = t."quizId"
WHERE cardinality(t.answers) <> cardinality(t."questionIds")
   OR (t.status = 'SUBMITTED' AND (t.score IS NULL OR t."correctCount" IS NULL OR t.passed IS NULL OR t."submittedAt" IS NULL))
   OR (t.status = 'IN_PROGRESS' AND (t.score IS NOT NULL OR t.passed IS NOT NULL OR t."submittedAt" IS NOT NULL))
   OR t.score NOT BETWEEN 0 AND 100 OR t."correctCount" < 0 OR t."correctCount" > cardinality(t."questionIds")
   OR EXISTS (SELECT 1 FROM unnest(t.answers) x WHERE x < -1 OR x > 5)
   OR t."submittedAt" < t."startedAt" OR t."submittedAt" > t.deadline;

\echo '--- T7 Attempts that refer to deleted questions (scored as wrong)'
SELECT t.id AS attempt_id, z.title AS quiz, t."startedAt",
       count(*) AS missing_questions
FROM "Attempt" t JOIN "Quiz" z ON z.id = t."quizId"
CROSS JOIN LATERAL unnest(t."questionIds") qid
WHERE NOT EXISTS (SELECT 1 FROM "Question" q WHERE q.id = qid)
GROUP BY t.id, z.title, t."startedAt";

\echo '--- T8 Pass/fail that does not match the current pass mark (usually the pass mark was changed later)'
SELECT z.title AS quiz, z."passingScore" AS pass_mark_now, t.score, t.passed AS recorded_passed, count(*) AS attempts
FROM "Attempt" t JOIN "Quiz" z ON z.id = t."quizId"
WHERE t.status = 'SUBMITTED' AND t.passed <> (t.score >= z."passingScore")
GROUP BY 1, 2, 3, 4 ORDER BY 1, 3;

\echo '--- T9 Attempts by people no longer assigned to the quiz'
SELECT z.title AS quiz, u.name AS user_name, count(*) AS attempts
FROM "Attempt" t JOIN "Quiz" z ON z.id = t."quizId" JOIN "User" u ON u.id = t."userId"
WHERE NOT EXISTS (SELECT 1 FROM "Assignment" a WHERE a."quizId" = t."quizId" AND a."userId" = t."userId")
GROUP BY 1, 2;

\echo '--- T10 Timed-out attempts not yet marked submitted'
-- Normal: the app scores these the next time that person signs in.
SELECT z.title AS quiz, count(*) AS attempts, min(t.deadline) AS oldest_deadline
FROM "Attempt" t JOIN "Quiz" z ON z.id = t."quizId"
WHERE t.status = 'IN_PROGRESS' AND t.deadline < now() - interval '1 minute'
GROUP BY z.title;


-- =====================================================================
\echo '=== 5. REPORTS ==='
-- =====================================================================

\echo '--- 5.1 Quiz-takers by district, block and role'
SELECT d.name AS district, b.name AS block, u."roleType" AS role,
       count(*) FILTER (WHERE u.active) AS active, count(*) FILTER (WHERE NOT u.active) AS inactive
FROM "User" u JOIN "District" d ON d.id = u."districtId" JOIN "Block" b ON b.id = u."blockId"
GROUP BY ROLLUP (d.name, b.name, u."roleType")
ORDER BY d.name NULLS LAST, b.name NULLS LAST, u."roleType" NULLS LAST;

\echo '--- 5.2 Quiz summary: assigned, started, finished, passed, average best score'
WITH best AS (
  SELECT "quizId", "userId", max(score) AS best_score, bool_or(passed) AS ever_passed
  FROM "Attempt" WHERE status = 'SUBMITTED' GROUP BY 1, 2
)
SELECT z.title AS quiz, z.active,
       (SELECT count(*) FROM "Assignment" a WHERE a."quizId" = z.id) AS assigned,
       (SELECT count(DISTINCT t."userId") FROM "Attempt" t WHERE t."quizId" = z.id) AS started,
       count(b."userId") AS finished,
       count(*) FILTER (WHERE b.ever_passed) AS passed,
       round(avg(b.best_score), 1) AS avg_best_score,
       (SELECT count(*) FROM "Attempt" t WHERE t."quizId" = z.id) AS total_attempts
FROM "Quiz" z LEFT JOIN best b ON b."quizId" = z.id
GROUP BY z.id, z.title, z.active ORDER BY z.active DESC, z.title;

\echo '--- 5.3 Attempts per day, last 14 days (India time)'
SELECT ("startedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date AS day,
       count(*) AS started, count(*) FILTER (WHERE status = 'SUBMITTED') AS submitted,
       count(*) FILTER (WHERE passed) AS passed, count(DISTINCT "userId") AS people
FROM "Attempt" WHERE "startedAt" > now() - interval '14 days'
GROUP BY 1 ORDER BY 1;

\echo '--- 5.4 Busiest hours, last 7 days (India time), for capacity planning'
SELECT date_trunc('hour', "startedAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') AS hour,
       count(*) AS attempts_started
FROM "Attempt" WHERE "startedAt" > now() - interval '7 days'
GROUP BY 1 ORDER BY attempts_started DESC LIMIT 10;

\echo '--- 5.5 Hardest questions (lowest share answered correctly, at least 10 answers)'
WITH answered AS (
  SELECT qa.qid, qa.ans
  FROM "Attempt" t CROSS JOIN LATERAL unnest(t."questionIds", t.answers) AS qa(qid, ans)
  WHERE t.status = 'SUBMITTED'
)
SELECT qb.name AS bank, q."externalId" AS question_id, q.difficulty, left(q.text, 60) AS text,
       count(*) AS times_shown,
       round(100.0 * count(*) FILTER (WHERE a.ans = q."correctIndex") / count(*), 1) AS percent_correct,
       round(100.0 * count(*) FILTER (WHERE a.ans = -1) / count(*), 1) AS percent_blank
FROM answered a JOIN "Question" q ON q.id = a.qid JOIN "QuestionBank" qb ON qb.id = q."bankId"
GROUP BY qb.name, q.id HAVING count(*) >= 10
ORDER BY percent_correct LIMIT 20;

\echo '--- 5.6 Users added per week (India time)'
SELECT date_trunc('week', "createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date AS week_starting,
       count(*) AS users_added
FROM "User" GROUP BY 1 ORDER BY 1 DESC LIMIT 12;

\echo '=== Done. Nothing was changed. ==='
