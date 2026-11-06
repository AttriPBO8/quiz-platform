# Setting up a test site for the client's testers

This guide puts the app on the internet as a **test site**, loads the customer's questions, and creates 10 test accounts. It takes about an hour, most of it waiting for AWS.

The test site uses its own database (`quizportal_test`), so nothing the testers do ends up in the real (production) data later.

You will need: your AWS account, the GitHub account that owns `quiz-platform`, and your Windows laptop with the project set up (see the README).

---

## Part A. Put the test site online

This follows [DEPLOY-AWS.md](DEPLOY-AWS.md) with three differences, so keep that guide open next to this one.

### A1. Create the test database

Do **step 1 of DEPLOY-AWS.md** exactly as written, except:

- DB instance identifier: `quiz-portal-test-db`
- Initial database name: `quizportal_test`
- Template: **Free tier** (this is only for testing)

Your test database address is:
```
postgresql://postgres:YOUR_DB_PASSWORD@YOUR_ENDPOINT:5432/quizportal_test?sslmode=require&connection_limit=3
```

### A2. Make the secrets

Do **step 2 of DEPLOY-AWS.md**. Write down the `DEFAULT_USER_PASSWORD` it prints: this is the starting password you give the testers.

### A3. Connect Amplify to GitHub, using the `rebuild` branch

Do **step 3 of DEPLOY-AWS.md**, except choose the branch **`rebuild`** instead of `main`. (The new app lives on `rebuild` until it is merged into `main` for go-live.)

When the build finishes, Amplify shows the test site's address, something like `https://rebuild.d1abc2xyz.amplifyapp.com`. Open it; you should see the sign-in page.

### A4. Put a password on the whole test site (recommended, free)

This stops strangers and search engines from finding the test site before go-live.

1. Amplify > your app > **Hosting** > **Access control** > **Manage access**.
2. For the `rebuild` branch choose **Restricted - password required**, enter a username (for example `tester`) and a password, and **Save**.

Testers will first see a browser pop-up asking for this username and password, then the app's own sign-in page. Give them both.

### A5. Create your Super Admin

Do **step 4 of DEPLOY-AWS.md**, using the **test** database address from A1. Sign in at `https://YOUR-TEST-ADDRESS/admin/login` and change the password from the account menu (top right).

### A6. Check the quiz site is open

Admin > **Quiz site**. Leave both dates empty (always open), or set the testing period, for example 7 Nov to 21 Nov.

---

## Part B. Load the customer's questions

The customer's questions can be in a spreadsheet. Each question is one row.

1. Admin > **Question banks** > open **Upload questions** > click **questions template** to download `questions-template.csv`. Open it in Excel.
2. Fill in one question per row and delete the two example rows:

| Column | What to put |
| --- | --- |
| `id` | A unique code per question, for example `q_001`, `q_002`. Uploading the same id again **updates** that question, so you can fix a typo and upload again. |
| `question` | The question text |
| `option_1` to `option_6` | The answer choices. Use as many as you need (2 to 6) and leave the rest empty. |
| `correct_option` | Which option is right: `1` to `6`, or `A` to `F` (`2` or `B` = option 2) |
| `difficulty` | `easy`, `medium` or `hard` |
| `category` | Optional topic, for example `Science` |

3. Save it in Excel with **File > Save As > CSV UTF-8 (Comma delimited) (\*.csv)**. Choose *CSV UTF-8*, not plain *CSV*, or Hindi text will be garbled.
4. Back in Admin > **Question banks**: type a bank name (for example the customer's subject), choose the `.csv` file, click **Upload**.
5. The screen lists how many questions were added and any row with a problem (by row number). Fix those rows in Excel and upload the same file again; good rows are simply updated.
6. Open the bank to check the questions, and the counts of easy, medium and hard.

JSON files (the older format) still work too.

### Make a quiz from the questions

1. Admin > **Quizzes** > create a quiz: choose the bank, a title, how many easy, medium and hard questions, the time limit and pass mark.
   - If the bank has fewer questions at one level than you ask for, the quiz fills the gap from the other levels.
2. You assign it to the testers in Part C, step 4.

---

## Part C. Create the 10 test users

The app has no OTP and sends no text messages, so the phone numbers can be the testers' real numbers or made-up ones. A number must be 10 digits and start with 6, 7, 8 or 9.

1. Open [`data/client-test-users.csv`](../data/client-test-users.csv) from the project folder in Excel. It has 10 testers: 4 Teachers, 3 Workers and 3 Helpers, all in "Test District" / "Test Block", with phones `9000000901` to `9000000910`.
2. Change anything you like:
   - `phone`: the tester's real number, if you prefer (each tester signs in with this)
   - `name`: the tester's name
   - `district`, `block`: the customer's real names, if they want to test those lists
   - `role_type`: Teacher, Worker or Helper. (Dummy also works, but Dummy users are left out of the results reports.)
   - Leave `password` **empty** so they get the starting password and must choose their own at first sign-in.
3. Save as **CSV UTF-8**, then Admin > **Users** > upload it. The screen shows "10 added, 0 updated".
4. Assign the quiz: Admin > **Quizzes** > your quiz > **Assign**, choose District **Test District** (Block and Role: all), click **Assign to matching users**. It should say "Assigned to 10 more users".

---

## Part D. Send the testers their details

Send each tester (a private message is best, not a group chat):

- Test site address: `https://YOUR-TEST-ADDRESS`
- Site username and password (from A4)
- District, Block, Role and phone number (from their row in the CSV)
- Starting password (`DEFAULT_USER_PASSWORD` from A2). They will be asked to choose their own password at first sign-in.

If a tester forgets their password: Admin > **Users** > find them > **Reset to starting password**. They sign in with the starting password again and choose a new one.

You can watch their results under Admin > **Results**, and see sign-ins under **Security log**.

---

## Costs and tidying up

- The smallest test database is covered by the AWS free tier or free credits on a newer account; otherwise it costs about USD 15 a month. Amplify for a test site with 10 users is a few cents.
- When nobody is testing for a few days, you can **stop** the database (RDS > your database > **Actions** > **Stop temporarily**). The site will not work while it is stopped. AWS starts it again by itself after 7 days.
- After testing, either delete `quiz-portal-test-db` and the Amplify app, or keep them as a place to try changes before they go live. Production gets its own database and the `main` branch, as in DEPLOY-AWS.md.
