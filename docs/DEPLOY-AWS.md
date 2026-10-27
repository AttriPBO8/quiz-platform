# Going live on AWS

The app runs on **AWS Amplify Hosting** (connected to GitHub, rebuilds on every change to `main`) with an **Amazon RDS for PostgreSQL** database. No servers or Docker to look after.

Expected cost at this size, after the AWS free tier: roughly USD 20–30 a month (smallest RDS database plus Amplify usage). This is an estimate; check it with the [AWS Pricing Calculator](https://calculator.aws/) for your region.

The AWS console changes its wording from time to time. If a button below has moved, the setting will be nearby with a similar name.

## 1. Create the database (about 15 minutes, mostly waiting)

1. Sign in to the AWS console and pick the region closest to your users (for India, **Asia Pacific (Mumbai) ap-south-1**). Use the same region throughout.
2. Open **RDS** > **Create database**.
3. Choose **Standard create**, engine **PostgreSQL**, version **17**.
4. Template: **Free tier** (or **Production** later for automatic standby).
5. Settings:
   - DB instance identifier: `quiz-portal-db`
   - Master username: `postgres`
   - Choose **Self managed** and enter a long password with letters and numbers only (avoid `@ : / ? #`). Save it in a password manager.
6. Instance: **db.t4g.micro**. Storage: **20 GB gp3**, untick storage autoscaling if you want a fixed bill.
7. Connectivity:
   - Public access: **Yes**. (Amplify runs outside your private network, so it needs to reach the database over the internet. The connection is encrypted and protected by the password.)
   - VPC security group: **Create new**, name `quiz-portal-db`.
8. Expand **Additional configuration**: Initial database name `quizportal`. Backup retention: **7 days**.
9. Click **Create database** and wait until the status is **Available**.
10. Open the database, go to **Connectivity & security**, copy the **Endpoint**.
11. Click the security group `quiz-portal-db` > **Edit inbound rules** > **Add rule**: Type **PostgreSQL**, Source **Anywhere-IPv4**. Save.

Your database address (keep it private) is:
```
postgresql://postgres:YOUR_DB_PASSWORD@YOUR_ENDPOINT:5432/quizportal?sslmode=require&connection_limit=3
```

## 2. Make the secrets

On your laptop, in the project folder, run:
```
npm run setup -- --print
```
It prints `SESSION_SECRET`, `PASSWORD_ENCRYPTION_KEY` and `DEFAULT_USER_PASSWORD`. Use these new values for AWS, not the ones in your local `.env`. Save `PASSWORD_ENCRYPTION_KEY` in your password manager: if it is ever lost, admins can no longer view stored passwords (sign-in still works, and resetting a password fixes it for that user).

## 3. Connect Amplify to GitHub

1. Open **AWS Amplify** > **Create new app** > **GitHub** > **Next**, and allow access to the `quiz-platform` repository.
2. Choose the repository and the branch **main**.
3. Amplify finds `amplify.yml` in the project; keep its build settings.
4. Open **Advanced settings** > **Environment variables** and add:

| Name | Value |
| --- | --- |
| `DATABASE_URL` | the database address from step 1 |
| `SESSION_SECRET` | from step 2 |
| `PASSWORD_ENCRYPTION_KEY` | from step 2 |
| `DEFAULT_USER_PASSWORD` | from step 2 |

5. **Save and deploy**. The first build takes about 5 minutes. It also creates the database tables.
6. When it finishes, Amplify shows the app's address (ending in `amplifyapp.com`).

## 4. Create the first Super Admin

On your laptop, in VS Code's terminal (PowerShell), run with your real database address:
```
$env:DATABASE_URL="postgresql://postgres:YOUR_DB_PASSWORD@YOUR_ENDPOINT:5432/quizportal?sslmode=require"
npm run create-admin -- yourname "Your Name"
Remove-Item Env:DATABASE_URL
```
It prints a password. Sign in at `https://YOUR-APP-ADDRESS/admin/login` and change it from the account menu (top right).

## 5. Load real data

In the admin screens:
1. **Admins**: add your Local Admins.
2. **Question banks**: upload your questions JSON.
3. **Users**: upload your users CSV (with each user's Local Admin in the `local_admin` column).
4. **Quizzes**: create a quiz, set its dates, tick its Local Admins and assign it.

Then share the app address and the starting password with quiz-takers.

## 6. Your own web address (optional)

Amplify > your app > **Hosting** > **Custom domains** > **Add domain**. Amplify sets up the HTTPS certificate for you.

## Updating the app

Changes merged into `main` on GitHub deploy automatically. Watch progress in Amplify; if a build fails, the previous version stays live.

## Looking after it

- **Backups:** RDS keeps daily backups for 7 days. To restore, RDS > your database > **Actions** > **Restore to point in time**.
- **Costs:** set a monthly budget alert in **Billing** > **Budgets**.
- **More traffic:** if many more than 500 people will take a quiz at the same moment, move the database to `db.t4g.small` (RDS > Modify) and consider **RDS Proxy**.
