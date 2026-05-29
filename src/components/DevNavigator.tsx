import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ROUTES,
  GROUP_ORDER,
  type RouteSpec,
  type GroupName,
  type BakeLevel,
} from "@/captured-routes";

/**
 * Floating dev navigator (top-left).
 *
 * v5 improvements
 *  - Search box that filters across labels and paths.
 *  - Per-route bake-level badge (●=full / ◐=partial / ◌=missing).
 *  - Per-group collapsing so the list isn't overwhelming.
 *  - Counts (matched/total) in each group header.
 *  - Slim collapsed bar so the chrome takes minimal screen on mobile.
 */

function bakeBadge(level: BakeLevel): { dot: string; title: string; color: string } {
  if (level === "full")    return { dot: "●", title: "Full layout-bake (pixel-faithful)", color: "#16a34a" };
  if (level === "partial") return { dot: "◐", title: "Partial bake (dimensions only)",    color: "#ca8a04" };
  return                        { dot: "◌", title: "No bake (drift expected)",            color: "#9ca3af" };
}

function groupRoutes(routes: RouteSpec[]): Record<GroupName, RouteSpec[]> {
  const out = {} as Record<GroupName, RouteSpec[]>;
  for (const r of routes) {
    (out[r.group] ||= []).push(r);
  }
  return out;
}

const ALL_GROUPED = groupRoutes(ROUTES);

export function DevNavigator() {
  const [open, setOpen] = useState(true);
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<GroupName>>(new Set());
  const { pathname } = useLocation();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ROUTES;
    return ROUTES.filter(
      (r) =>
        r.label.toLowerCase().includes(q) ||
        r.path.toLowerCase().includes(q) ||
        r.key.toLowerCase().includes(q) ||
        r.group.toLowerCase().includes(q),
    );
  }, [query]);

  const grouped = useMemo(() => groupRoutes(filtered), [filtered]);

  function toggleGroup(g: GroupName) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  }

  const totals = useMemo(() => {
    let full = 0,
      partial = 0,
      none = 0;
    for (const r of ROUTES) {
      if (r.bake === "full") full++;
      else if (r.bake === "partial") partial++;
      else none++;
    }
    return { full, partial, none, total: ROUTES.length };
  }, []);

  // Collapsed: tiny corner button. Open: slide-out drawer from left.
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={`Benable navigator — ${totals.full} pixel-faithful routes`}
        className="fixed left-3 top-3 z-[1000000] flex h-10 w-10 items-center justify-center rounded-full border border-border bg-white/95 text-[15px] font-bold text-primary shadow-xl backdrop-blur transition-transform hover:scale-105"
      >
        B
      </button>
    );
  }

  return (
    <div className="fixed left-3 top-3 z-[1000000] max-h-[calc(100vh-1.5rem)] w-[280px] overflow-hidden rounded-xl border border-border bg-white/95 shadow-xl backdrop-blur">
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="flex w-full items-center justify-between gap-2 border-b border-border px-3 py-2 text-left"
      >
        <span className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wide text-foreground">
            Benable creator
          </span>
          <span className="text-[9px] font-medium text-muted-foreground">
            {totals.full}● {totals.partial}◐ {totals.none}◌
          </span>
        </span>
        <span className="text-base leading-none text-muted-foreground">×</span>
      </button>

      {open && (
        <>
          {/* Search */}
          <div className="border-b border-border p-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search routes…"
              className="w-full rounded-md border border-border bg-white px-2 py-1 text-xs outline-none placeholder:text-muted-foreground focus:border-primary"
            />
          </div>

          {/* Route list */}
          <div className="max-h-[calc(100vh-9rem)] overflow-y-auto p-2 pt-0">
            {GROUP_ORDER.filter((g) => grouped[g]?.length).map((groupName) => {
              const isCollapsed = collapsed.has(groupName);
              const items = grouped[groupName];
              const allItems = ALL_GROUPED[groupName] || [];
              return (
                <div key={groupName} className="mt-2">
                  <button
                    type="button"
                    onClick={() => toggleGroup(groupName)}
                    className="flex w-full items-center justify-between px-2 py-1 text-left"
                  >
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {groupName}
                    </span>
                    <span className="text-[10px] tabular-nums text-muted-foreground">
                      {items.length === allItems.length
                        ? `${items.length}`
                        : `${items.length}/${allItems.length}`}
                      <span className="ml-1">{isCollapsed ? "▸" : "▾"}</span>
                    </span>
                  </button>
                  {!isCollapsed && (
                    <div className="mt-0.5 flex flex-col gap-0.5">
                      {items.map((r) => {
                        const active = pathname === r.path;
                        const badge = bakeBadge(r.bake);
                        return (
                          <Link
                            key={r.key}
                            to={r.path}
                            className={`flex items-center gap-2 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                              active
                                ? "bg-primary text-primary-foreground"
                                : "text-foreground hover:bg-accent"
                            }`}
                          >
                            <span
                              title={badge.title}
                              style={{ color: active ? "inherit" : badge.color }}
                              className="shrink-0 text-[10px] leading-none"
                            >
                              {badge.dot}
                            </span>
                            <span className="truncate">{r.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                No routes match “{query}”.
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border bg-muted/60 px-3 py-1.5 text-[9px] text-muted-foreground">
            ●full · ◐partial · ◌none
          </div>
        </>
      )}
    </div>
  );
}
