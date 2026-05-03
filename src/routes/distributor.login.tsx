import { createFileRoute } from "@tanstack/react-router";
import { LoginPanel } from "@/components/LoginPanel";
export const Route = createFileRoute("/distributor/login")({ component: () => <LoginPanel portal="distributor" /> });
