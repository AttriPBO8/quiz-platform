import { UserHeader } from "@/components/UserHeader";
import { requireUser } from "@/lib/auth";
import { PasswordForm } from "@/components/PasswordForm";
import { changeUserPassword } from "@/app/actions/user-auth";

export const dynamic = "force-dynamic";

export default async function ChangePassword() {
  const user = await requireUser();
  return (
    <>
      <UserHeader user={user} />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
        <h1 className="text-2xl font-bold">Change password</h1>
        <p className="mt-1 text-muted">Use at least 8 characters with letters and numbers. Other devices will be signed out.</p>
        <div className="card mt-6 p-5"><PasswordForm action={changeUserPassword} backHref="/quizzes" /></div>
      </main>
    </>
  );
}
