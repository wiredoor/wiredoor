import type { Middleware } from "@/app/middlewares/guard";

const auth: Middleware = async ({ navigate, to }) => {
  const isLoggedIn = Boolean(localStorage.getItem("token"));

  if (!isLoggedIn) {
    navigate("/login", { replace: true, state: { redirectTo: to.pathname } });
  }
};

export default auth;
