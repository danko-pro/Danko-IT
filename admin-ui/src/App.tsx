import type { ScreenKey } from "./shared/types";
import { AdminAuthScreen } from "./features/auth/screen";
import { useAdminAppController } from "./shell/controller";
import { navigation, screenTitles, type NavigationScreenKey } from "./shell/navigation";
import { AppScreenRouter, preloadAppScreen } from "./shell/screen-router";
import { AppShellFooter } from "./shell/footer";
import { AppShellHeader } from "./shell/header";
import { AppShellSidebar } from "./shell/sidebar";

function isNavigationScreen(screen: ScreenKey): screen is NavigationScreenKey {
  return navigation.some((item) => item.key === screen);
}

export default function App() {
  const controller = useAdminAppController();
  const requiresLogin = controller.authSession?.auth_enabled && !controller.authSession.authenticated;
  const showAuthGate = !controller.authLoading && (!controller.authSession || requiresLogin);

  const { screen, summary, successMessage, setSuccessMessage, loadOverview, loadCalculatorProjects } = controller;
  const isEditorScreen = screen === "editor";

  const currentNavigationItem =
    isNavigationScreen(screen) ? navigation.find((item) => item.key === screen) ?? navigation[0] : null;
  const currentScreenTitle = currentNavigationItem ? screenTitles[currentNavigationItem.key] : "";

  function handleScreenSelect(nextScreen: NavigationScreenKey) {
    void preloadAppScreen(nextScreen);
    controller.setScreen(nextScreen);
    setSuccessMessage(null);

    if (nextScreen === "calculator") {
      void loadCalculatorProjects();
      return;
    }

    void loadOverview();
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-3 py-3 text-slate-100 md:px-4 lg:px-5">
      <div className="pointer-events-none absolute inset-0 opacity-90">
        <div className="absolute left-[-12%] top-[-10%] h-[28rem] w-[28rem] rounded-full bg-cyan-400/8 blur-[140px]" />
        <div className="absolute bottom-[-14%] right-[-10%] h-[24rem] w-[24rem] rounded-full bg-teal-300/7 blur-[120px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/20 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1680px] flex-col gap-4">
        {controller.authLoading ? (
          <div className="glass-panel flex min-h-[calc(100vh-8rem)] items-center justify-center">
            <div className="space-y-2 text-center">
              <div className="eyebrow">Admin Session</div>
              <div className="text-lg font-semibold text-slate-100">Проверка доступа...</div>
            </div>
          </div>
        ) : showAuthGate ? (
          <AdminAuthScreen loading={controller.authPending} error={controller.authError} onLogin={controller.handleLogin} />
        ) : (
          <div className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[272px_minmax(0,1fr)]">
            <AppShellSidebar
              screen={screen}
              calculatorProjects={controller.calculatorProjects}
              selectedCalculatorProjectId={controller.selectedCalculatorProjectId}
              calculatorLoading={controller.calculatorLoading}
              onScreenSelect={handleScreenSelect}
              onSelectCalculatorProject={controller.setSelectedCalculatorProjectId}
              onClearSuccessMessage={() => setSuccessMessage(null)}
              onQuickCreateCalculatorProject={() => void controller.handleQuickCreateCalculatorProject()}
            />

            <main className={isEditorScreen ? "" : "space-y-4"}>
              {!isEditorScreen && currentNavigationItem ? (
                <AppShellHeader
                  screen={screen}
                  eyebrow={currentNavigationItem.label}
                  title={currentScreenTitle}
                  unknownTermsCount={summary?.new_unknown_terms_count}
                  successMessage={successMessage}
                />
              ) : null}

              <AppScreenRouter controller={controller} />
            </main>
          </div>
        )}

        <AppShellFooter
          loading={controller.loading}
          authSession={controller.authSession}
          authPending={controller.authPending}
          onLogout={controller.handleLogout}
        />
      </div>
    </div>
  );
}
