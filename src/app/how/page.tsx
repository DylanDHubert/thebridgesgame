import { redirect } from "next/navigation";

/** OLD ADDRESS. THE LESSON LIVES AT /tutorial. */
export default function HowPage() {
  redirect("/tutorial");
}
