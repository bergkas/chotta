import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import { supabase } from '../../../lib/supabase';
import {
  FaReceipt,
  FaMoneyBillWave,
  FaTrophy,
  FaChartLine,
  FaArrowLeft,
  FaChartBar,
  FaHeart,
  FaUsers,
} from 'react-icons/fa';
import { FaMoneyBillTransfer, FaArrowRightArrowLeft } from 'react-icons/fa6';


import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import PageLayout from '../../../components/PageLayout';

// Register ChartJS components
Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Chart.js defaults
Chart.defaults.font.family = 'system-ui, -apple-system, sans-serif';
Chart.defaults.color = '#6B7280';
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(0, 0, 0, 0.8)';
Chart.defaults.plugins.tooltip.padding = 12;
Chart.defaults.plugins.tooltip.cornerRadius = 8;

// Create a wrapper component for the chart
const ChartWrapper = ({ data, options }) => {
  if (typeof window === 'undefined') return null;
  return <Line data={data} options={options} />;
};

export default function Stats() {
  const router = useRouter();
  const { id } = router.query;

  const [participants, setParticipants] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [settings, setSettings] = useState({ default_currency: 'EUR' });
  const [roomName, setRoomName] = useState('');

  // Fetch data
  const fetchData = useCallback(async () => {
    if (!id) return;

    // Fetch room name
    const { data: roomData } = await supabase
      .from('rooms')
      .select('name')
      .eq('id', id)
      .single();
    if (roomData) setRoomName(roomData.name);

    // Fetch participants
    const { data: parts } = await supabase
      .from('participants')
      .select('*')
      .eq('room_id', id);
    if (parts) setParticipants(parts);

    // Fetch expenses with shares
    const { data: exps } = await supabase
      .from('expenses')
      .select('*, expense_shares(*)')
      .eq('room_id', id);
    if (exps) setExpenses(exps);

    // Fetch transfers
    const { data: trans } = await supabase
      .from('transfers')
      .select('*')
      .eq('room_id', id);
    if (trans) setTransfers(trans);

    // Fetch settings
    const { data: sets } = await supabase
      .from('room_settings')
      .select('default_currency')
      .eq('room_id', id)
      .single();
    if (sets) setSettings(sets);
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Helper functions
  const formatAmount = (v) => parseFloat(v).toFixed(2);
  const findName = (pid) => participants.find((p) => p.id === pid)?.name || '–';

  // Calculate metrics
  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const totalTransfers = transfers.reduce((sum, t) => sum + parseFloat(t.amount), 0);
  const mostExpensiveExpense = expenses.reduce((max, e) => 
    parseFloat(e.amount) > parseFloat(max.amount) ? e : max, 
    { amount: 0, title: '', date: '' }
  );

  // Calculate per-person totals
  const personTotals = participants.map(p => {
    const paid = expenses
      .filter(e => e.paid_by === p.id)
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    
    const owed = expenses
      .flatMap(e => e.expense_shares)
      .filter(s => s.participant_id === p.id)
      .reduce((sum, s) => sum + parseFloat(s.share_amount), 0);

    return {
      id: p.id,
      name: p.name,
      paid,
      owed,
      net: paid - owed,
      totalSpent: owed // This is what they actually spent (their shares)
    };
  }).sort((b, a) => b.net - a.net);

  // Prepare time series data
  const timeSeriesData = expenses
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .reduce((acc, e) => {
      const date = new Date(e.date).toLocaleDateString('de-DE');
      acc[date] = (acc[date] || 0) + parseFloat(e.amount);
      return acc;
    }, {});

  const chartData = {
    labels: Object.keys(timeSeriesData),
    datasets: [
      {
        label: 'Ausgaben',
        data: Object.values(timeSeriesData),
        borderColor: 'rgba(255, 255, 255, 0.8)',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        tension: 0.4,
      },
    ],
  };

  // Participant stats - Fixed the undefined p variable
  const participantData = {
    labels: participants.map(p => p.name),
    datasets: [
      {
        label: 'Ausgaben',
        data: participants.map(p => 
          expenses
            .filter(e => e.paid_by === p.id)
            .reduce((sum, e) => sum + parseFloat(e.amount), 0)
        ),
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderColor: 'rgba(255, 255, 255, 0.8)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            return `${context.parsed.y} ${settings.default_currency}`;
          }
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: settings.default_currency,
          color: 'rgba(255, 255, 255, 0.8)',
          font: {
            size: 12
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.8)'
        }
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.8)'
        }
      }
    },
  };

  const participantOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: settings.default_currency,
          color: 'rgba(255, 255, 255, 0.8)',
          font: {
            size: 12
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.8)'
        }
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.8)'
        }
      }
    },
  };

  if (!id) return null;

  return (
    <PageLayout title="Statistiken">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 relative">
        {/* Dot pattern background */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
        </div>

        {/* Summary */}
        <div className="mb-8 relative">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {roomName || 'Raum'}
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Hier siehst du, wer am meisten Geld ausgegeben hat & was der Spaß insgesamt gekostet hat.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Expenses */}
          <div className="bg-gradient-to-br from-indigo-600/90 via-indigo-500/90 to-indigo-700/90 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden mb-4">
            {/* Dot pattern background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
            </div>
            <div className="flex items-center gap-3 mb-3 relative">
              <div className="bg-white/15 backdrop-blur-sm rounded-lg">
                <FaReceipt className="text-base text-white" />
              </div>
              <h3 className="text-base font-semibold text-white">Gesamtausgaben</h3>
            </div>
            <p className="text-2xl font-bold text-white relative">
              {formatAmount(totalExpenses)} {settings.default_currency}
            </p>
            <p className="text-sm text-white/70 mt-1 relative">
              {expenses.length} Ausgaben insgesamt
            </p>
          </div>

          {/* Total Transfers */}
          <div className="bg-gradient-to-br from-emerald-600/90 via-emerald-500/90 to-emerald-700/90 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden mb-4">
            {/* Dot pattern background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
            </div>
            <div className="flex items-center gap-3 mb-3 relative">
              <div className="bg-white/15 backdrop-blur-sm rounded-lg">
                <FaMoneyBillTransfer className="text-base text-white" />
              </div>
              <h3 className="text-base font-semibold text-white">Gesamtüberweisungen</h3>
            </div>
            <p className="text-2xl font-bold text-white relative">
              {formatAmount(totalTransfers)} {settings.default_currency}
            </p>
            <p className="text-sm text-white/70 mt-1 relative">
              {transfers.length} {transfers.length === 1 ? 'Transaktion' : 'Transaktionen'}
            </p>
          </div>

          {/* Most Expensive Expense */}
          <div className="bg-gradient-to-br from-amber-600/90 via-amber-500/90 to-amber-700/90 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden mb-4">
            {/* Dot pattern background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
            </div>
            <div className="flex items-center gap-3 mb-3 relative">
              <div className="bg-white/15 backdrop-blur-sm rounded-lg">
                <FaMoneyBillWave className="text-base text-white" />
              </div>
              <h3 className="text-base font-semibold text-white">Das hat am meisten gekostet</h3>
            </div>
            <p className="text-2xl font-bold text-white relative">
              {formatAmount(mostExpensiveExpense.amount)} {settings.default_currency}
            </p>
            <p className="text-sm text-white/70 mt-1 relative">
              {mostExpensiveExpense.title || 'Ohne Titel'}
            </p>
          </div>

          {/* Hero Card */}
          <div className="bg-gradient-to-br from-rose-600/90 via-rose-500/90 to-rose-700/90 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden ">
            {/* Dot pattern background */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
            </div>
            <div className="flex items-center gap-3 mb-3 relative">
              <div className="bg-white/15 backdrop-blur-sm rounded-lg">
                <FaHeart className="text-base text-white" />
              </div>
              <h3 className="text-base font-semibold text-white">Unser Held</h3>
            </div>
            {personTotals[0] && (
              <>
                <p className="text-2xl font-bold text-white relative">
                  {personTotals[0].name}
                </p>
                <p className="text-sm text-white/70 mt-1 relative">
                  Hat am meisten vorgestreckt: <strong>{formatAmount(personTotals[0].paid)} {settings.default_currency}</strong>
                </p>
              </>
            )}
          </div>
        </div>

        {/* Person Totals */}
        <div className="bg-gradient-to-br from-sky-600/90 via-sky-500/90 to-sky-700/90 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden mb-8">
          {/* Dot pattern background */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
          </div>
          <div className="flex items-center gap-3 mb-4 relative">
            <div className="bg-white/15 backdrop-blur-sm rounded-lg">
              <FaTrophy className="text-base text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">
              Am meisten rausgehaut
            </h3>
          </div>
          <div className="space-y-2 relative">
            {personTotals.map((p, index) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 bg-white/10 backdrop-blur-sm rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-white/70 font-medium w-6">
                    {index + 1}.
                  </span>
                  <span className="text-white font-medium">
                    {p.name}
                  </span>
                </div>
                <div className="text-white font-medium">
                  {formatAmount(p.totalSpent)} {settings.default_currency}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Time Series Chart */}
        <div className="bg-gradient-to-br from-gray-900/90 via-gray-800 to-gray-900/90 rounded-xl px-1 py-6 shadow-lg hover:shadow-xl transition-all duration-300 mb-8 relative overflow-hidden">
          {/* Dot pattern background */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
          </div>
          <div className="flex items-center gap-3 mb-6 relative px-5">
            <div className="bg-white/15 backdrop-blur-sm rounded-lg">
              <FaChartLine className="text-base text-white" />
            </div>
            <h3 className="text-lg font-semibold text-white">Ausgaben über Zeit</h3>
          </div>
          <div className="h-64 relative px-4">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

      </div>
    </PageLayout>
  );
} 