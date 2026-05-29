import { Suspense, lazy } from "react";
import { PublicEstimate } from "./features/public/PublicEstimate";
import { PublicLanding } from "./features/public/PublicLanding";
import { PublicPrivacy } from "./features/public/PublicPrivacy";

const AdminApp = lazy(() => import("./AdminApp"));

function normalizePathname(pathname: string) {
  const normalizedPathname = pathname.replace(/\/+$/, "");

  return normalizedPathname === "" ? "/" : normalizedPathname;
}

function isPublicRoot(pathname: string) {
  return pathname === "/";
}

function isPublicPrivacy(pathname: string) {
  return pathname === "/privacy";
}

function isPublicEstimate(pathname: string) {
  return pathname === "/estimate";
}

function isCatalogEditor(pathname: string) {
  return pathname === "/catalog-editor";
}

export default function App() {
  const pathname = normalizePathname(window.location.pathname);

  if (isPublicRoot(pathname)) {
    return <PublicLanding />;
  }

  if (isPublicPrivacy(pathname)) {
    return <PublicPrivacy />;
  }

  if (isPublicEstimate(pathname)) {
    return <PublicEstimate />;
  }

  // Редактор каталога монтируется внутри AdminApp за auth-gate (require_admin_session),
  // публичного доступа без авторизации больше нет. Lazy-загрузка сохранена.
  if (isCatalogEditor(pathname)) {
    return (
      <Suspense fallback={<div className="public-admin-loading" aria-hidden="true" />}>
        <AdminApp catalogEditor />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<div className="public-admin-loading" aria-hidden="true" />}>
      <AdminApp />
    </Suspense>
  );
}
