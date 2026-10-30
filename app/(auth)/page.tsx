import { redirect } from "next/navigation";
import { SignInForm } from "@/components/sign-in-form";
import { readSession } from "@/lib/session";

// The site root is the sign-in page, as in LaundryPro; a signed-in user goes on to Bugün
export default async function Home() {
  if (await readSession()) redirect("/bugun");
  return <SignInForm />;
}
