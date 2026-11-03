import { getRouteApi, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";

const rootRoute = getRouteApi("__root__");

/**
 * Removes `?ref=` and `?notrack` from the address bar once the page has read
 * them, so a copied link doesn't carry them on. Through the router, never
 * history.replaceState: the language toggle navigates with `search: true`,
 * which copies the router's own location, and would put them back. With no
 * view transition: one would skip the page change's, still running, and
 * throw.
 */
export function useCleanUrl() {
  const navigate = useNavigate();
  const { ref } = useSearch({ strict: false });
  const { notrack } = rootRoute.useSearch();
  const dirty = ref !== undefined || notrack !== undefined;
  useEffect(() => {
    if (!dirty) return;
    void navigate({
      to: ".",
      search: (search) => ({ ...search, ref: undefined, notrack: undefined }),
      replace: true,
      viewTransition: false,
    });
  }, [dirty, navigate]);
}
