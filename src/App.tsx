import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { CapturedScreen } from "@/components/CapturedScreen";
import { DevNavigator } from "@/components/DevNavigator";
import { ROUTES, DEFAULT_ROUTE } from "@/captured-routes";

/**
 * Router config: one route per captured screen.
 *
 * `basename` matches the Vite `base` so the same code works both at the gh-
 * pages root URL (`/benable-creator-from-expo/`) and at `/` in dev.
 */
function App() {
  const basename = import.meta.env.BASE_URL.replace(/\/$/, "");
  const defaultPath = ROUTES.find((r) => r.key === DEFAULT_ROUTE)?.path ?? "/discover";

  return (
    <BrowserRouter basename={basename || undefined}>
      <DevNavigator />
      <Routes>
        {ROUTES.map((r) => (
          <Route key={r.key} path={r.path} element={<CapturedScreen routeKey={r.key} />} />
        ))}
        {/* fall-through: anything unknown → default screen */}
        <Route path="*" element={<Navigate to={defaultPath} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
