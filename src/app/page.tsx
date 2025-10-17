import { redirect } from "next/navigation"

const HomePage = () => {
  return redirect("/auth")
}
export default HomePage