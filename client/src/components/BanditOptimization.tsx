import type { BanditArm } from "@/types";

interface BanditOptimizationProps {
  banditArms: BanditArm[];
}

export default function BanditOptimization({ banditArms }: BanditOptimizationProps) {
  const sortedArms = [...banditArms].sort((a, b) => b.score - a.score);

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-chart-1";
    if (score >= 60) return "text-chart-2";
    return "text-chart-3";
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold text-foreground mb-6">Bandit Algorithm Optimization</h3>
      
      <div className="space-y-4">
        {sortedArms.map((arm) => (
          <div key={arm.id} className="p-4 bg-muted rounded-lg" data-testid={`bandit-arm-${arm.id}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">
                {arm.platform} - {arm.name}
              </span>
              <span className={`text-sm ${getScoreColor(arm.score)}`} data-testid={`arm-score-${arm.id}`}>
                {arm.score.toFixed(1)}%
              </span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${arm.score}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-2">
              <span data-testid={`arm-profit-${arm.id}`}>
                Profit: ¥{arm.profit.toLocaleString()}
              </span>
              <span data-testid={`arm-allocation-${arm.id}`}>
                Allocation: {arm.allocation}%
              </span>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 pt-4 border-t border-border">
        <div className="text-sm text-muted-foreground mb-2">Next optimization:</div>
        <div className="text-sm text-foreground" data-testid="bandit-next-update">
          In 18 minutes
        </div>
      </div>
    </div>
  );
}
