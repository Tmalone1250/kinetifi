import React from 'react';

interface FlywheelStatsProps {  
  ltv: number;  
  debt: number;  
  status: 'HEALTHY' | 'CRITICAL' | 'REBALANCING';
  isActive: boolean;
}

export const FlywheelStats: React.FC<FlywheelStatsProps> = ({ ltv, debt, status, isActive }) => (  
  <div className={`p-5 border rounded-2xl shadow-xl w-full transition-all duration-500 ${isActive ? 'bg-gray-900 border-gray-800' : 'bg-gray-950 border-gray-900 opacity-60 grayscale'}`}>  
    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Treasury Flywheel Health</h3>  
    <div className="mt-4 flex justify-between items-end">  
      <div>  
        <p className="text-4xl font-mono text-white tracking-tighter">{ltv.toFixed(1)}%</p>  
        <p className="text-[10px] text-gray-400 mt-1 uppercase">Current LTV Ratio</p>  
      </div>  
      <div className={`px-3 py-1 rounded-full text-[10px] font-bold ${  
        status === 'HEALTHY' ? 'bg-green-500/10 text-green-400' :   
        status === 'CRITICAL' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'  
      }`}>  
        {status}  
      </div>  
    </div>  
    <div className="mt-6 pt-4 border-t border-gray-800 flex justify-between">  
      <span className="text-xs text-gray-500">Total Borrowed Debt</span>  
      <span className="text-xs font-mono text-gray-300">${debt.toLocaleString()}</span>  
    </div>  
  </div>  
);

export default FlywheelStats;
