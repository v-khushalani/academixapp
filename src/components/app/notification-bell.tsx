import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CalendarClock, FileText, Wallet, Megaphone } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { notificationsApi } from "@/lib/api/notifications";
import { formatDateTime } from "@/lib/dates";

const ICON: Record<string, typeof Bell> = {
  timetable: CalendarClock,
  test: FileText,
  fee: Wallet,
  general: Megaphone,
};

/** Small bell with an unread count — updates for timetable changes, tests and notices. */
export function NotificationBell() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.feed(30),
    refetchInterval: 60_000,
  });

  const unread = useMemo(() => data.filter((n) => !n.read), [data]);

  const readMut = useMutation({
    mutationFn: (ids: string[]) => notificationsApi.markRead(ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <Popover
      onOpenChange={(open) => {
        if (open && unread.length) readMut.mutate(unread.map((n) => n.id));
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Updates" className="relative shrink-0">
          <Bell className="h-4 w-4" />
          {unread.length > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
              {unread.length > 9 ? "9+" : unread.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-3 py-2">
          <p className="text-sm font-semibold">Updates</p>
          <p className="text-[11px] text-muted-foreground">
            Timetable changes, tests and notices for you
          </p>
        </div>
        {data.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs text-muted-foreground">
            Nothing new right now.
          </p>
        ) : (
          <ul className="max-h-80 divide-y divide-border overflow-y-auto">
            {data.map((n) => {
              const Icon = ICON[n.kind] ?? Megaphone;
              return (
                <li
                  key={n.id}
                  className={`flex gap-2.5 px-3 py-2.5 ${n.read ? "" : "bg-primary/5"}`}
                >
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium leading-snug">{n.title}</p>
                    {n.body && (
                      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                        {n.body}
                      </p>
                    )}
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {formatDateTime(n.created_at)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
