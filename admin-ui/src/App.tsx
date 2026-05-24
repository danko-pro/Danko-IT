import { Suspense, lazy } from "react";
import { PublicLanding } from "./features/public/PublicLanding";
import { PublicPrivacy } from "./features/public/PublicPrivacy";

const AdminApp = lazy(() => import("./AdminApp"));

function isPublicRoot(pathname: string) {
  return pathname === "/";
}

function isPublicPrivacy(pathname: string) {
  return pathname === "/privacy";
}

export default function App() {
  const pathname = window.location.pathname;

  if (isPublicRoot(pathname)) {
    return <PublicLanding />;
  }

  if (isPublicPrivacy(pathname)) {
    return <PublicPrivacy />;
  }

  return (
    <Suspense fallback={<div className="public-admin-loading" aria-hidden="true" />}>
      <AdminApp />
    </Suspense>
  );
}
