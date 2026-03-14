import React, { useState } from 'react';
import { Client } from './types';

interface PayrollViewProps {
  clients: Client[];
}

export const PayrollView: React.FC<PayrollViewProps> = ({ clients }) => {
  return (
    <div className="h-full flex flex-col animate-fade-in bg-gray-50">
      <div className="flex items-center justify-between mb-6 px-6 pt-6">
        <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">💰 客戶薪資計算系統</h2>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-200 text-center max-w-lg w-full">
          <div className="text-6xl mb-4">🚧</div>
          <h3 className="text-2xl font-black text-gray-800 mb-2">薪資模組建置中</h3>
          <p className="text-gray-500 font-medium">我們已經成功開闢了這個新分頁！接下來將在這裡實作薪資自動試算與薪資單匯出功能。</p>
        </div>
      </div>
    </div>
  );
};
