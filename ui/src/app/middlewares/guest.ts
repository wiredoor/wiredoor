import type { Middleware } from "@/app/middlewares/guard";

const guest: Middleware = async ({ navigate }) => {
  const isLoggedIn = Boolean(localStorage.getItem("token"));
  if (isLoggedIn) {
    navigate("/", { replace: true });
  }
};

export default guest;
