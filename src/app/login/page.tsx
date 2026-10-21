import LoginForm from "@/features/lobby/LoginForm";
import { hostKey } from "@/services/lobby/auth";
export const dynamic = "force-dynamic";
export default function Login() {
  hostKey();
  return <LoginForm />;
}
