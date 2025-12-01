import { redirect } from "next/navigation"

export default function Home() {
  // Redirect root to the login page so visiting `/` doesn't return 404
  redirect("/login")
}
