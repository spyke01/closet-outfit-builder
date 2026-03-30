import { SignUpForm } from "@/components/sign-up-form";

export default function Page() {
  return (
    <main
      id="main-content"
      role="main"
      className="page-shell-content flex min-h-svh w-full items-center justify-center px-6 py-16 md:px-10"
    >
      <div className="w-full max-w-md">
        <SignUpForm />
      </div>
    </main>
  );
}
