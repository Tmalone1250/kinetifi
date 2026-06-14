import { AgentStatusHeader } from "./components/AgentStatusHeader";
import { SkillCardArbitrage } from "./components/SkillCardArbitrage";
import { SkillCardRebalance } from "./components/SkillCardRebalance";
import { SkillCardAutoCompound } from "./components/SkillCardAutoCompound";
import { PolicyRail } from "./components/PolicyRail";
import { ExecutionTerminal } from "./components/ExecutionTerminal";

export default function AdvancedSkillsPage() {
  return (
    <div className="flex flex-col h-full bg-[#020617] text-slate-100 overflow-y-auto">
      <AgentStatusHeader />
      
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-6 lg:p-8 space-y-10">
        <div>
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-100 mb-2 tracking-tight">Active Skills Configuration</h2>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              Configure the exact boundaries and risk limits for the Zero-Trust Agent's background workflows. 
              The agent operates autonomously within these strict parameters.
            </p>
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <SkillCardArbitrage />
            <SkillCardRebalance />
            <SkillCardAutoCompound />
          </div>
        </div>

        <PolicyRail />
        <ExecutionTerminal />
      </main>
    </div>
  );
}
