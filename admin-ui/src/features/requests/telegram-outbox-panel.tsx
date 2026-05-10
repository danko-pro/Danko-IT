import type { StatusTone, TelegramNotification } from "../../shared/types";
import { Button } from "../../shared/controls";
import { StatusBadge } from "../../shared/ui-status";
import { formatDateTime } from "../../shared/utils";

type RequestsTelegramOutboxPanelProps = {
  notifications: TelegramNotification[];
  loading: boolean;
  flushing: boolean;
  onReload: () => Promise<void>;
  onFlush: () => Promise<void>;
};

function notificationStatusLabel(status: string): string {
  return status === "pending" ? "Ждет отправки" : status === "sent" ? "Отправлено" : status;
}

function notificationStatusTone(status: string): StatusTone {
  return status === "pending" ? "warn" : status === "sent" ? "ok" : "neutral";
}

function trimNotificationText(text: string): string {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > 180 ? `${compact.slice(0, 180)}...` : compact;
}

export function RequestsTelegramOutboxPanel(props: RequestsTelegramOutboxPanelProps) {
  const hasNotifications = props.notifications.length > 0;

  return (
    <section className="glass-panel p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="eyebrow">Telegram</div>
          <h3 className="section-title mt-1">Очередь уведомлений</h3>
          <p className="panel-note mt-2">
            Сообщения остаются здесь, если Telegram или сеть не приняли отправку с первого раза.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="slot-chip">{props.notifications.length}</span>
          <Button
            type="button"
            variant="secondary"
            className="px-3 py-2 text-xs"
            disabled={props.loading || props.flushing}
            onClick={() => void props.onReload()}
          >
            {props.loading ? "Загрузка..." : "Обновить"}
          </Button>
          <Button
            type="button"
            className="px-3 py-2 text-xs"
            disabled={props.loading || props.flushing || !hasNotifications}
            onClick={() => void props.onFlush()}
          >
            {props.flushing ? "Отправляю..." : "Отправить очередь"}
          </Button>
        </div>
      </div>

      {props.loading ? <div className="empty-state">Проверяю очередь Telegram...</div> : null}

      {!props.loading && !hasNotifications ? (
        <div className="empty-state">Очередь Telegram чистая. Зависших уведомлений нет.</div>
      ) : null}

      {!props.loading && hasNotifications ? (
        <div className="grid gap-2 lg:grid-cols-2">
          {props.notifications.map((notification) => (
            <div key={notification.id} className="dense-row px-3.5 py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-100">#{notification.id}</span>
                    <StatusBadge
                      label={notificationStatusLabel(notification.status)}
                      tone={notificationStatusTone(notification.status)}
                    />
                    <span className="stat-chip">chat {notification.chat_id}</span>
                    <span className="stat-chip">попыток {notification.attempts}</span>
                  </div>
                  <div className="mt-2 text-[12px] leading-5 text-slate-300">
                    {trimNotificationText(notification.text)}
                  </div>
                  {notification.last_error ? (
                    <div className="mt-2 rounded border border-rose-300/20 bg-rose-950/25 px-2.5 py-2 text-[12px] text-rose-100">
                      {notification.last_error}
                    </div>
                  ) : null}
                </div>
                <div className="shrink-0 text-right text-[11px] text-slate-500">
                  <div>retry: {formatDateTime(notification.next_attempt_at)}</div>
                  <div>upd: {formatDateTime(notification.updated_at)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
