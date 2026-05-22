import { Suspense, lazy } from "react";
import { PublicLanding } from "./features/public/PublicLanding";

const AdminApp = lazy(() => import("./AdminApp"));

function isPublicRoot(pathname: string) {
  return pathname === "/";
}

export default function App() {
  const pathname = window.location.pathname;

  if (isPublicRoot(pathname)) {
    return <PublicLanding />;
  }

  return (
    <Suspense fallback={<div className="public-admin-loading" aria-hidden="true" />}>
      <AdminApp />
    </Suspense>
  );
}
