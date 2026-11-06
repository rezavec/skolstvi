import { redirect } from "next/navigation";
import { getRequesterEmail } from "@/lib/session";
import { Page } from "@/components/ui";
import { LoginForm } from "./login-form";

/**
 * Vstupní stránka: zadání školního e-mailu.
 *
 * Kdo už je přihlášený, jde rovnou na formulář — nemá cenu posílat další
 * odkaz někomu, kdo platnou cookie má.
 */
export default async function HomePage() {
  const email = await getRequesterEmail();
  if (email) {
    redirect("/nahlasit");
  }

  return (
    <Page>
      <LoginForm />
    </Page>
  );
}
