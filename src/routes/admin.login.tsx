import { createFileRoute } from "@tanstack/react-router";
import { LoginPanel } from "@/components/LoginPanel";
export const Route = createFileRoute("/admin/login")({ component: () => <LoginPanel portal="admin" /> });
