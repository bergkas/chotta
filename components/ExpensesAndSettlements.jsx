import { useState } from 'react';
import { 
  FaReceipt, 
  FaPlus, 
  FaTrashAlt, 
  FaMoneyBillWave,
  FaLongArrowAltRight,
  FaChevronRight
} from 'react-icons/fa';
import { FaMoneyBillTransfer, FaArrowRightArrowLeft } from 'react-icons/fa6';

// Expenses Section Component
const ExpensesSection = ({ 
  history, 
  setShowExpenseModal, 
  deleteExpense, 
  deleteTransfer, 
  formatDate, 
  findName, 
  formatAmount,
  settings 
}) => {
  // Group expenses by date for better organization
  const [expanded, setExpanded] = useState(null);

  return (
    <section className="mb-12">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4 pt-8">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-10 h-10 bg-indigo-100 dark:bg-indigo-950 rounded-full">
            <FaReceipt className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Ausgabenverlauf
          </h2>
        </div>
        <button
          onClick={() => setShowExpenseModal(true)}
          className="inline-flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white text-sm font-medium rounded-full hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-sm"
          aria-label="Add expense"
        >
          <FaPlus size={14} /> <span>Hinzufügen</span>
        </button>
      </div>

      {/* Empty State */}
      {history.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center shadow-sm">
          <div className="mx-auto w-16 h-16 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-full mb-3">
            <FaReceipt className="text-gray-400 dark:text-gray-500 text-xl" />
          </div>
          <p className="text-gray-600 dark:text-gray-300 font-medium">
            Keine Einträge
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
            Füge deine ersten Ausgaben hinzu, um deinen Ausgabenverlauf zu sehen
          </p>
          <button
            onClick={() => setShowExpenseModal(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-medium hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
          >
            <FaPlus size={12} /> Erste Ausgabe hinzufügen
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item, idx) =>
            item.type === 'expense' ? (
              <ExpenseCard 
                key={idx}
                item={item}
                deleteExpense={deleteExpense}
                formatDate={formatDate}
                findName={findName}
                formatAmount={formatAmount}
                settings={settings}
                isExpanded={expanded === idx}
                onToggleExpand={() => setExpanded(expanded === idx ? null : idx)}
              />
            ) : (
              <TransferCard
                key={idx}
                item={item}
                deleteTransfer={deleteTransfer}
                formatDate={formatDate}
                findName={findName}
                formatAmount={formatAmount}
                settings={settings}
              />
            )
          )}
        </div>
      )}
    </section>
  );
};

// Individual Expense Card
const ExpenseCard = ({ 
  item, 
  deleteExpense, 
  formatDate, 
  findName, 
  formatAmount, 
  settings,
  isExpanded,
  onToggleExpand
}) => {
  return (
    <div 
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700"
    >
      {/* Header Row */}
      <div 
        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors" 
        onClick={onToggleExpand}
      >
        {/* Main Row */}
        <div className="flex items-center gap-3 p-3">
          {/* Icon */}
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950 rounded-lg shrink-0">
            <FaReceipt className="text-indigo-600 dark:text-indigo-400" />
          </div>
          
          {/* Title and Amount */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 dark:text-white truncate">
              {item.data.title}
            </h3>
          </div>
          
          {/* Amount and Actions */}
          <div className="flex items-center shrink-0">
            <div className="text-right">
              <div className="font-semibold text-gray-900 dark:text-white">
                {item.data.original_amount.toFixed(2)}
                <span className="text-xs ml-1 font-normal text-gray-500 dark:text-gray-400">{item.data.original_currency}</span>
              </div>
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteExpense(item.data.id);
              }}
              className="pl-2 text-gray-400 hover:text-red-500 active:text-red-600 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Delete expense"
            >
              <FaTrashAlt size={14} />
            </button>
          </div>
        </div>

        {/* Info Row */}
        <div className="flex items-center justify-between px-3 pb-3 pt-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatDate(item.data.date)}
            </span>
            <span className="w-1 h-1 bg-gray-300 dark:bg-gray-600 rounded-full"></span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Bezahlt von <span className="font-medium text-gray-700 dark:text-gray-300">{findName(item.data.paid_by)}</span>
            </span>
          </div>
          
          {/* Expand Indicator */}
          <div className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
            <FaChevronRight className="text-gray-400" size={14} />
          </div>
        </div>
      </div>

      {/* Details Section - Conditionally shown with animation */}
      <div 
        className={`grid transition-all duration-200 ease-in-out ${
          isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-3 pt-0">
            <div className="h-px bg-gray-100 dark:bg-gray-700 mb-3"></div>
            
            {item.data.original_currency !== settings.default_currency && (
              <div className="flex items-center gap-2 py-1 px-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg mb-2">
                <FaArrowRightArrowLeft className="text-emerald-500 shrink-0 text-xs" />
                <span className="text-xs text-gray-600 dark:text-gray-300">
                  {item.data.original_amount.toFixed(2)} {item.data.original_currency} →{' '}
                  {formatAmount(item.data.converted_amount)} {settings.default_currency}
                </span>
              </div>
            )}

            <div className="mt-2">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                Aufteilung
              </div>
              <div className="flex flex-wrap gap-1.5">
                {item.data.expense_shares?.map(s => (
                  <span
                    key={s.participant_id}
                    className="inline-flex items-center px-2 py-1 bg-gray-50 dark:bg-gray-700/50 rounded-full text-xs"
                  >
                    <span className="font-medium mr-0.5">{formatAmount(s.share_amount)}</span>
                    <span className="text-gray-500 dark:text-gray-400 text-[10px] mr-1">{settings.default_currency}</span>
                    <span className="truncate max-w-[80px]">{findName(s.participant_id)}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Transfer Card
const TransferCard = ({ 
  item, 
  deleteTransfer, 
  formatDate, 
  findName, 
  formatAmount, 
  settings 
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 border-l-4 border-r-0 border-emerald-500 dark:border-emerald-600 rounded-xl shadow-sm overflow-hidden">
      <div className="p-3">
        {/* Header Row */}
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-emerald-50 dark:bg-emerald-950 rounded-lg shrink-0">
            <FaMoneyBillWave className="text-emerald-600 dark:text-emerald-400" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 dark:text-white">
              Überweisung
            </h3>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {formatDate(item.data.date)}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="font-semibold text-gray-900 dark:text-white">
                {formatAmount(item.data.amount)}
                <span className="text-xs ml-1 font-normal text-gray-500 dark:text-gray-400">{settings.default_currency}</span>
              </div>
            </div>
            
            <button
              onClick={() => deleteTransfer(item.data.id)}
              className="pr-1 text-gray-400 hover:text-red-500 active:text-red-600 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Delete transfer"
            >
              <FaTrashAlt size={14} />
            </button>
          </div>
        </div>

        {/* Details */}
        <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg py-1.5 px-3">
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {findName(item.data.from_id)}
          </span>
          <FaLongArrowAltRight className="text-emerald-500 mx-1" />
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
            {findName(item.data.to_id)}
          </span>
        </div>
      </div>
    </div>
  );
};

// Optimized Settlements Section
const SettlementsSection = ({
  optimize,
  findName,
  formatDate,
  formatAmount,
  settings,
  completeTransfer
}) => {
  return (
    <section className="mb-8" id="optimized">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex items-center justify-center w-10 h-10 bg-emerald-100 dark:bg-emerald-950 rounded-full">
          <FaMoneyBillWave className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Optimierte Rückzahlungen
        </h2>
      </div>

      {/* Render optimized settlements */}
      <OptimizedSettlements 
        optimize={optimize}
        findName={findName}
        formatDate={formatDate}
        formatAmount={formatAmount}
        settings={settings}
        completeTransfer={completeTransfer}
      />
    </section>
  );
};

// Optimized Settlements Content
const OptimizedSettlements = ({ 
  optimize,
  findName,
  formatDate,
  formatAmount,
  settings,
  completeTransfer
}) => {
  const list = optimize();
  
  if (!list.length) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-emerald-100 dark:border-emerald-900 rounded-xl p-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-50 dark:bg-emerald-950 rounded-full mb-3">
          <FaMoneyBillWave className="text-2xl text-emerald-500 dark:text-emerald-400" />
        </div>
        <p className="text-gray-800 dark:text-gray-100 font-medium text-lg">
          Keine offenen Schulden 🎉
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
          Alle Ausgaben sind bereits ausgeglichen
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {list.map((e, i) => (
        <div
          key={i}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700"
        >
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center bg-emerald-50 dark:bg-emerald-950 rounded-full">
                  <FaMoneyBillTransfer className="text-emerald-500 dark:text-emerald-400" />
                </div>
                
                <div>
                  <div className="flex items-center">
                    <span className="font-medium text-gray-900 dark:text-white mr-0.5">
                      {findName(e.from)}
                    </span>
                    <FaChevronRight className="text-emerald-500 text-xs mx-1" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {findName(e.to)}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {formatDate(new Date())}
                  </div>
                </div>
              </div>
              
              <div className="text-right pr-2">
                <div className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatAmount(e.amount)}
                  <span className="text-xs ml-1 font-normal text-emerald-500/70 dark:text-emerald-500/50">
                    {settings.default_currency}
                  </span>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => completeTransfer(e.from, e.to, e.amount)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-700 dark:bg-emerald-500 text-white-600 dark:text-white rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 active:bg-emerald-200 dark:active:bg-emerald-900 transition-colors"
            >
              <FaMoneyBillWave size={14} />
              <span>Begleichen</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

// Main component that combines both sections
const ExpensesAndSettlements = ({
  history,
  setShowExpenseModal,
  deleteExpense,
  deleteTransfer,
  formatDate,
  findName,
  formatAmount,
  settings,
  optimize,
  completeTransfer
}) => {
  return (
    <div>
      <ExpensesSection
        history={history}
        setShowExpenseModal={setShowExpenseModal}
        deleteExpense={deleteExpense}
        deleteTransfer={deleteTransfer}
        formatDate={formatDate}
        findName={findName}
        formatAmount={formatAmount}
        settings={settings}
      />
      
      <SettlementsSection
        optimize={optimize}
        findName={findName}
        formatDate={formatDate}
        formatAmount={formatAmount}
        settings={settings}
        completeTransfer={completeTransfer}
      />
    </div>
  );
};

export default ExpensesAndSettlements;
