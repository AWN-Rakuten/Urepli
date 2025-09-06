import type { AutomationLog } from "@/types";

interface AutomationLogsProps {
  logs: AutomationLog[];
}

export default function AutomationLogs({ logs }: AutomationLogsProps) {
  const getStatusDot = (status: string) => {
    switch (status) {
      case "success": return "status-active";
      case "error": return "status-error";
      case "in_progress": return "status-warning";
      default: return "status-idle";
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold text-foreground mb-6">Automation Logs</h3>
      
      {logs.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <div className="text-sm">No automation logs yet</div>
          <div className="text-xs mt-1">Logs will appear here when workflows are executed</div>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {logs.map((log) => (
            <div 
              key={log.id} 
              className="flex items-start space-x-3 text-sm"
              data-testid={`log-${log.id}`}
            >
              <div className={`status-dot ${getStatusDot(log.status)} mt-1`}></div>
              <div className="flex-1">
                <div className="text-foreground" data-testid={`log-message-${log.id}`}>
                  {log.message}
                </div>
                <div className="text-muted-foreground text-xs" data-testid={`log-time-${log.id}`}>
                  {formatTime(log.createdAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-4 pt-4 border-t border-border">
        <button className="w-full text-sm text-primary hover:text-primary/90" data-testid="button-view-logs">
          View full logs
        </button>
      </div>
    </div>
  );
}
