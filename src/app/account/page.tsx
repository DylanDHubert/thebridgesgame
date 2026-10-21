import { redirect } from "next/navigation";

/** OLD ADDRESS. LOGIN IS THE ACCOUNT DOOR NOW. */
export default function AccountPage() {
  redirect("/login");
}
