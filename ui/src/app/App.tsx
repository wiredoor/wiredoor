import { useRoutes } from "react-router-dom";
import { routes } from "@/app/router/routes";
import { useApplyTheme } from '@/hooks/apply-theme';

export default function App() {
  useApplyTheme();
  return useRoutes(routes);
}