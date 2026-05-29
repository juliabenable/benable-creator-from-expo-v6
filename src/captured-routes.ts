/**
 * Single source of truth for every captured screen.
 *
 * Keys must match the filename stems in `src/captured/<key>.html`.
 * The order here drives the order shown in the dev navigator.
 *
 * The actual HTML strings are loaded lazily via `import.meta.glob` so each
 * route lands in its own JS chunk — important because each captured screen
 * carries 4–13MB of fully baked Tamagui-emitted markup.
 */

import manifestJSON from "./captured/manifest.json";

export type BakeLevel = "full" | "partial" | "none";

export type RouteKey =
  // Auth
  | "sign-up"
  | "sign-in"

  // Main tabs
  | "discover"
  | "notifications"
  | "global-search"
  | "bookmarks"
  | "bookmarked-clips"

  // Notifications sub-tabs
  | "notifications-likes"
  | "notifications-comments"
  | "notifications-followers"

  // Profile + lists
  | "profile"
  | "user-profile"
  | "list-detail"

  // Dashboard / settings
  | "dashboard"
  | "dashboard-insights"
  | "dashboard-cashback"
  | "dashboard-brand-partners"
  | "dashboard-tune-up"
  | "dashboard-request-payout"
  | "settings"
  | "settings-profile"
  | "settings-account"
  | "settings-notifications"
  | "settings-cashback"

  // Brand Collabs + campaign flow
  | "brand-collabs"
  | "brand-collabs-new"
  | "brand-collabs-finished"
  | "campaign-respond-to-invite"
  | "campaign-product-selection"
  | "campaign-delivery-confirm"
  | "campaign-delivery-awaiting"
  | "campaign-delivery-shipped"
  | "campaign-content-prompt"
  | "campaign-add-content"
  | "campaign-content-submitted"
  | "campaign-under-review"
  | "campaign-changes-requested"
  | "campaign-time-to-post"
  | "campaign-congrats"

  // Onboarding & growth
  | "start-trending"
  | "invite-friends"
  | "optimized-badge";

export type GroupName =
  | "Auth"
  | "Tabs"
  | "Notifications"
  | "Profile"
  | "Dashboard"
  | "Settings"
  | "Brand Collabs"
  | "Campaign flow"
  | "Growth";

export interface RouteSpec {
  key: RouteKey;
  path: string;
  label: string;
  group: GroupName;
  bake: BakeLevel;
}

interface ManifestEntry {
  file: string;
  source: string;
  path: string;
  label: string;
  bake?: BakeLevel;
}

const manifest = manifestJSON as Record<string, ManifestEntry>;

function bake(key: RouteKey): BakeLevel {
  return (manifest[key]?.bake ?? "none") as BakeLevel;
}

export const ROUTES: RouteSpec[] = [
  // Auth
  { key: "sign-up",                    path: "/sign-up",                                       label: "Sign up",            group: "Auth", bake: bake("sign-up") },
  { key: "sign-in",                    path: "/sign-in",                                       label: "Sign in",            group: "Auth", bake: bake("sign-in") },

  // Main tabs
  { key: "discover",                   path: "/discover",                                      label: "Discover",           group: "Tabs", bake: bake("discover") },
  { key: "notifications",              path: "/notifications",                                 label: "Notifications",      group: "Tabs", bake: bake("notifications") },
  { key: "global-search",              path: "/global-search",                                 label: "Search",             group: "Tabs", bake: bake("global-search") },
  { key: "bookmarks",                  path: "/bookmarks",                                     label: "Bookmarks",          group: "Tabs", bake: bake("bookmarks") },
  { key: "bookmarked-clips",           path: "/bookmarked-clips",                              label: "Bookmarked clips",   group: "Tabs", bake: bake("bookmarked-clips") },

  // Notifications sub-tabs
  { key: "notifications-likes",        path: "/notifications/likes",                           label: "Likes",              group: "Notifications", bake: bake("notifications-likes") },
  { key: "notifications-comments",     path: "/notifications/comments",                        label: "Comments",           group: "Notifications", bake: bake("notifications-comments") },
  { key: "notifications-followers",    path: "/notifications/followers",                       label: "Followers",          group: "Notifications", bake: bake("notifications-followers") },

  // Profile / lists
  { key: "profile",                    path: "/profile",                                       label: "Your profile (empty)", group: "Profile", bake: bake("profile") },
  { key: "user-profile",               path: "/bernadette",                                    label: "Bernadette (populated)", group: "Profile", bake: bake("user-profile") },
  { key: "list-detail",                path: "/bernadette/lists/skincare-must-have",           label: "List detail",        group: "Profile", bake: bake("list-detail") },

  // Dashboard
  { key: "dashboard",                  path: "/dashboard",                                     label: "Dashboard",          group: "Dashboard", bake: bake("dashboard") },
  { key: "dashboard-insights",         path: "/dashboard/insights",                            label: "Insights",           group: "Dashboard", bake: bake("dashboard-insights") },
  { key: "dashboard-cashback",         path: "/dashboard/cashback",                            label: "Cashback",           group: "Dashboard", bake: bake("dashboard-cashback") },
  { key: "dashboard-brand-partners",   path: "/dashboard/brand-partners",                      label: "Brand partners",     group: "Dashboard", bake: bake("dashboard-brand-partners") },
  { key: "dashboard-tune-up",          path: "/dashboard/tune-up",                             label: "Tune-up",            group: "Dashboard", bake: bake("dashboard-tune-up") },
  { key: "dashboard-request-payout",   path: "/dashboard/request-payout",                      label: "Request payout",     group: "Dashboard", bake: bake("dashboard-request-payout") },

  // Settings
  { key: "settings",                   path: "/settings",                                      label: "Settings (root)",    group: "Settings", bake: bake("settings") },
  { key: "settings-profile",           path: "/settings/profile",                              label: "Profile settings",   group: "Settings", bake: bake("settings-profile") },
  { key: "settings-account",           path: "/settings/account",                              label: "Account",            group: "Settings", bake: bake("settings-account") },
  { key: "settings-notifications",     path: "/settings/notifications",                        label: "Notification settings", group: "Settings", bake: bake("settings-notifications") },
  { key: "settings-cashback",          path: "/settings/cashback",                             label: "Cashback settings",  group: "Settings", bake: bake("settings-cashback") },

  // Brand Collabs
  { key: "brand-collabs",              path: "/brand-collabs",                                 label: "Brand Collabs (Active)", group: "Brand Collabs", bake: bake("brand-collabs") },
  { key: "brand-collabs-new",          path: "/brand-collabs/new",                             label: "Brand Collabs (New)",    group: "Brand Collabs", bake: bake("brand-collabs-new") },
  { key: "brand-collabs-finished",     path: "/brand-collabs/finished",                        label: "Brand Collabs (Finished)", group: "Brand Collabs", bake: bake("brand-collabs-finished") },

  // Campaign flow (Step 6 walk-through)
  { key: "campaign-respond-to-invite", path: "/campaign/78",                                   label: "1. Respond to invite",   group: "Campaign flow", bake: bake("campaign-respond-to-invite") },
  { key: "campaign-product-selection", path: "/campaign/78/product",                           label: "2. Product selection",   group: "Campaign flow", bake: bake("campaign-product-selection") },
  { key: "campaign-delivery-confirm",  path: "/campaign/78/delivery",                          label: "3. Confirm address",     group: "Campaign flow", bake: bake("campaign-delivery-confirm") },
  { key: "campaign-delivery-awaiting", path: "/campaign/78/awaiting-tracking",                 label: "4a. Product on its way", group: "Campaign flow", bake: bake("campaign-delivery-awaiting") },
  { key: "campaign-delivery-shipped",  path: "/campaign/78/shipped",                           label: "4b. Shipped, mark received", group: "Campaign flow", bake: bake("campaign-delivery-shipped") },
  { key: "campaign-content-prompt",    path: "/campaign/78/content",                           label: "5a. Content upload prompt", group: "Campaign flow", bake: bake("campaign-content-prompt") },
  { key: "campaign-add-content",       path: "/campaign/78/add-content",                       label: "5b. Add Content form",   group: "Campaign flow", bake: bake("campaign-add-content") },
  { key: "campaign-content-submitted", path: "/campaign/78/ready-to-submit",                   label: "5c. Draft ready",        group: "Campaign flow", bake: bake("campaign-content-submitted") },
  { key: "campaign-under-review",      path: "/campaign/78/under-review",                      label: "6. Under review",        group: "Campaign flow", bake: bake("campaign-under-review") },
  { key: "campaign-changes-requested", path: "/campaign/78/changes-requested",                 label: "7. Changes requested",   group: "Campaign flow", bake: bake("campaign-changes-requested") },
  { key: "campaign-time-to-post",      path: "/campaign/78/time-to-post",                      label: "8. Time to post",        group: "Campaign flow", bake: bake("campaign-time-to-post") },
  { key: "campaign-congrats",          path: "/campaign/78/congrats",                          label: "9. Congrats!",           group: "Campaign flow", bake: bake("campaign-congrats") },

  // Growth & onboarding
  { key: "start-trending",             path: "/start-trending",                                label: "Start trending",     group: "Growth", bake: bake("start-trending") },
  { key: "invite-friends",             path: "/invite-friends",                                label: "Invite friends",     group: "Growth", bake: bake("invite-friends") },
  { key: "optimized-badge",            path: "/optimized-badge",                               label: "Optimized badge",    group: "Growth", bake: bake("optimized-badge") },
];

export const GROUP_ORDER: GroupName[] = [
  "Auth",
  "Tabs",
  "Notifications",
  "Profile",
  "Dashboard",
  "Settings",
  "Brand Collabs",
  "Campaign flow",
  "Growth",
];

/**
 * Vite glob of every captured HTML, keyed by route name.
 *
 * `import: 'default'` returns the raw string directly when awaited.
 * `query: '?raw'` tells Vite to treat the .html as a raw text resource.
 */
const htmlModules = import.meta.glob("./captured/*.html", {
  query: "?raw",
  import: "default",
}) as Record<string, () => Promise<string>>;

export function loadRouteHTML(key: RouteKey): Promise<string> {
  const path = `./captured/${key}.html`;
  const loader = htmlModules[path];
  if (!loader) {
    return Promise.reject(new Error(`No captured HTML for route ${key}`));
  }
  return loader();
}

export const DEFAULT_ROUTE: RouteKey = "discover";
