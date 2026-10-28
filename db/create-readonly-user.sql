-- =====================================================================
-- ONE-TIME SETUP. THIS CHANGES THE DATABASE (it adds a sign-in account).
-- =====================================================================
-- Creates "quiz_readonly", a database account for health checks and reports.
-- It can read everything except the password columns, and it can never
-- change data. Use it for day-to-day checks instead of the master
-- "postgres" account, which can change or delete anything.
--
-- Guide: https://claude.ai/artifact/9CJTPzgAzr2D1CMay4yFNa (section 3)
-- Run it once, signed in as the master user (postgres):
--   1. Replace CHOOSE_A_LONG_PASSWORD below with a new password of at least
--      16 letters and numbers. Save it in your password manager.
--   2. Run the whole file (psql: \i db/create-readonly-user.sql;
--      pgAdmin: open it in the Query Tool and press F5).
--
-- If a future app update adds a new table or a new column to "User",
-- "Admin" or "Question", run the GRANT lines again so this account can see it.
-- =====================================================================

CREATE ROLE quiz_readonly LOGIN PASSWORD 'CHOOSE_A_LONG_PASSWORD';

-- Belt and braces: every session of this account is read-only.
ALTER ROLE quiz_readonly SET default_transaction_read_only = on;
ALTER ROLE quiz_readonly SET statement_timeout = '30s';

GRANT CONNECT ON DATABASE quizportal TO quiz_readonly;
GRANT USAGE ON SCHEMA public TO quiz_readonly;

-- Tables with nothing secret in them: every column.
GRANT SELECT ON "District", "Block", "QuestionBank", "Question", "Quiz",
                "QuizManager", "Assignment", "Attempt", "_prisma_migrations"
  TO quiz_readonly;

-- Admins and quiz-takers: every column EXCEPT passwordHash and passwordEncrypted.
GRANT SELECT (id, username, name, role, active, "failedLogins", "lockedUntil",
              "sessionVersion", "createdAt")
  ON "Admin" TO quiz_readonly;
GRANT SELECT (id, name, phone, "roleType", "districtId", "blockId", "localAdminId",
              active, "failedLogins", "lockedUntil", "sessionVersion",
              "passwordChangedAt", "createdAt")
  ON "User" TO quiz_readonly;

-- Lets it see every connection and query in the connection checks
-- (without this it only sees its own). Grants no access to data.
GRANT pg_monitor TO quiz_readonly;
