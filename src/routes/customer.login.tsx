import { createFileRoute } from "@tanstack/react-router";
import { LoginPanel } from "@/components/LoginPanel";
export const Route = createFileRoute("/customer/login")({ component: () => <LoginPanel portal="customer" /> });
