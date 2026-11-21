import React, { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  ShieldCheck,
  Wallet as WalletIcon,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency, formatMatchDateTime } from '../lib/validation';
import {
  submitDepositRequest,
  submitWithdrawalRequest,
} from '../services/esportsService';
import {
  DepositRequest,
  WalletTransaction,
  WithdrawalRequest,
} from '../types/esports';

interface WalletViewProps {
  transactions: WalletTransaction[];
  deposits: DepositRequest[];
  withdrawals: WithdrawalRequest[];
}

type WalletTab = 'all' | 'deposits' | 'winnings' | 'withdrawals' | 'bonus' | 'receipts';

export function WalletView({
  transactions,
  deposits,
  withdrawals,
}: WalletViewProps) {
  const { wallet } = useAuth();
  const [activeTab, setActiveTab] = useState<WalletTab>('all');
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<WalletTransaction | null>(null);

  // Add money state
  const [depAmount, setDepAmount] = useState('100');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [gatewayRef, setGatewayRef] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Withdraw state
  const [wdlAmount, setWdlAmount] = useState('100');
  const [payoutMethod, setPayoutMethod] = useState<'UPI' | 'BankTransfer'>('UPI');
  const [payoutDestination, setPayoutDestination] = useState('');

  const totalBalance = wallet?.totalBalance ?? 0;
  const depositBalance = wallet?.depositBalance ?? 0;
  const winningBalance = wallet?.winningBalance ?? 0;

  const filteredTx = useMemo(() => {
    if (activeTab === 'winnings') return transactions.filter((t) => t.type === 'Winning');
    if (activeTab === 'bonus') return transactions.filter((t) => t.type === 'Bonus');
    return transactions;
  }, [transactions, activeTab]);

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const amt = Number(depAmount);
    if (!Number.isFinite(amt) || amt < 10 || amt > 100000) {
      setFeedback({ type: 'err', text: 'Enter a deposit amount between ₹10 and ₹1,00,000.' });
      return;
    }
    if (gatewayRef.trim().length < 4) {
      setFeedback({
        type: 'err',
        text: 'Enter a valid UTR / Payment Reference ID (min 4 characters).',
      });
      return;
    }

    setSubmitting(true);
    try {
      await submitDepositRequest({
        amount: amt,
        paymentMethod,
        gatewayRef,
      });
      setFeedback({
        type: 'ok',
        text: 'Deposit verification request submitted. Balance updates automatically once payment gateway/admin verification completes.',
      });
      setGatewayRef('');
      setShowAddMoney(false);
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to submit deposit request.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const amt = Number(wdlAmount);
    if (!Number.isFinite(amt) || amt < 50) {
      setFeedback({ type: 'err', text: 'Minimum withdrawal is ₹50.' });
      return;
    }
    if (amt > winningBalance) {
      setFeedback({
        type: 'err',
        text: `Only Winning Balance (${formatCurrency(winningBalance)}) is eligible for withdrawal.`,
      });
      return;
    }
    if (payoutDestination.trim().length < 4) {
      setFeedback({
        type: 'err',
        text: 'Enter a valid UPI ID or Bank Account reference.',
      });
      return;
    }

    setSubmitting(true);
    try {
      await submitWithdrawalRequest({
        amount: amt,
        payoutMethod,
        payoutDestination,
        winningBalance,
      });
      setFeedback({
        type: 'ok',
        text: 'Withdrawal request queued for server verification.',
      });
      setPayoutDestination('');
      setShowWithdraw(false);
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Unable to submit withdrawal request.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl sm:text-4xl font-bold text-white">
          Gaming Wallet
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Separated Deposit and Withdrawable Winning balances backed by verified ledger transactions.
        </p>
      </div>

      {feedback && (
        <div
          className={`rounded-xl px-4 py-3 text-xs border ${
            feedback.type === 'ok'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Wallet Hero Dashboard */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-[#9D4EDD]/25 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-400">Total Wallet Balance</p>
            <p className="font-mono-num text-4xl sm:text-5xl font-bold text-white">
              {formatCurrency(totalBalance)}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                setFeedback(null);
                setShowAddMoney(true);
              }}
              className="h-12 px-6 rounded-xl bg-[#FF6B1A] hover:bg-[#ff7f38] text-white text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <ArrowDownLeft className="w-4 h-4" />
              Add Money
            </button>
            <button
              type="button"
              onClick={() => {
                setFeedback(null);
                setShowWithdraw(true);
              }}
              className="h-12 px-6 rounded-xl bg-[#9D4EDD]/20 hover:bg-[#9D4EDD]/30 border border-[#9D4EDD]/45 text-white text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap"
            >
              <ArrowUpRight className="w-4 h-4 text-[#d8b4fe]" />
              Withdraw
            </button>
          </div>
        </div>

        {/* Separated Deposit vs Winning Balances */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5 border-t border-white/10">
          <div className="rounded-2xl bg-[#070913]/70 border border-white/10 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Deposit Balance</p>
              <p className="font-mono-num text-2xl font-bold text-[#38BDF8] mt-0.5">
                {formatCurrency(depositBalance)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Usable for tournament entry fees
              </p>
            </div>
            <WalletIcon className="w-6 h-6 text-[#38BDF8]/70" />
          </div>

          <div className="rounded-2xl bg-[#070913]/70 border border-white/10 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Winning Balance (Withdrawable)</p>
              <p className="font-mono-num text-2xl font-bold text-emerald-400 mt-0.5">
                {formatCurrency(winningBalance)}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Eligible for instant payout requests
              </p>
            </div>
            <ShieldCheck className="w-6 h-6 text-emerald-400/70" />
          </div>
        </div>
      </div>

      {/* Wallet History Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar p-1 rounded-xl bg-[#0e1426] border border-white/10 w-fit max-w-full">
        {(
          [
            { id: 'all', label: 'Transaction History' },
            { id: 'deposits', label: 'Deposit History' },
            { id: 'winnings', label: 'Winning History' },
            { id: 'withdrawals', label: 'Withdrawal History' },
            { id: 'bonus', label: 'Bonus & Rewards' },
            { id: 'receipts', label: 'Payment Receipts' },
          ] as { id: WalletTab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id)}
            className={`h-9 px-3.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              activeTab === t.id
                ? 'bg-[#FF6B1A] text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Ledger / History List */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {activeTab === 'deposits' ? (
          deposits.length === 0 ? (
            <EmptyLedger label="No deposit requests recorded yet." />
          ) : (
            <div className="divide-y divide-white/10">
              {deposits.map((d) => (
                <div key={d.id} className="p-4 sm:px-6 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">
                      {d.paymentMethod} Deposit
                    </p>
                    <p className="font-mono-num text-xs text-slate-400 truncate">
                      Ref: {d.gatewayRef} · {formatMatchDateTime(d.createdAt)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono-num text-sm font-bold text-[#38BDF8]">
                      +{formatCurrency(d.amount)}
                    </p>
                    <p className="text-[11px] text-slate-400">{d.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : activeTab === 'withdrawals' ? (
          withdrawals.length === 0 ? (
            <EmptyLedger label="No withdrawal requests yet." />
          ) : (
            <div className="divide-y divide-white/10">
              {withdrawals.map((w) => (
                <div key={w.id} className="p-4 sm:px-6 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">
                      {w.payoutMethod} Payout
                    </p>
                    <p className="font-mono-num text-xs text-slate-400 truncate">
                      {w.payoutDestination} · {formatMatchDateTime(w.createdAt)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-mono-num text-sm font-bold text-[#FF6B1A]">
                      -{formatCurrency(w.amount)}
                    </p>
                    <p className="text-[11px] text-slate-400">{w.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : filteredTx.length === 0 ? (
          <EmptyLedger label="No transactions in this category yet." />
        ) : (
          <div className="divide-y divide-white/10">
            {filteredTx.map((tx) => {
              const isCredit =
                tx.type === 'Deposit' ||
                tx.type === 'Winning' ||
                tx.type === 'Bonus' ||
                tx.type === 'Refund';
              return (
                <div
                  key={tx.id}
                  className="p-4 sm:px-6 flex items-center justify-between gap-4 hover:bg-white/[0.02]"
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-semibold text-white truncate">
                      {tx.title}
                    </p>
                    <p className="font-mono-num text-xs text-slate-400 truncate">
                      {tx.id} · {formatMatchDateTime(tx.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p
                        className={`font-mono-num text-sm font-bold ${
                          isCredit ? 'text-emerald-400' : 'text-[#FF6B1A]'
                        }`}
                      >
                        {isCredit ? '+' : '-'}
                        {formatCurrency(tx.amount)}
                      </p>
                      <p className="text-[11px] text-slate-400">{tx.status}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedReceipt(tx)}
                      aria-label="View Payment Receipt"
                      className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300"
                    >
                      <Receipt className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Money Modal */}
      {showAddMoney && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Add Money"
        >
          <div className="glass-card w-full max-w-md rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold text-white">
                Add Money to Wallet
              </h2>
              <button
                type="button"
                onClick={() => setShowAddMoney(false)}
                className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDepositSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Amount (INR)
                </label>
                <input
                  type="number"
                  min={10}
                  max={100000}
                  required
                  value={depAmount}
                  onChange={(e) => setDepAmount(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-[#070913]/80 border border-white/10 font-mono-num text-sm text-white focus:outline-none focus:border-[#FF6B1A]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-[#070913]/80 border border-white/10 text-sm text-white focus:outline-none focus:border-[#FF6B1A]"
                >
                  <option value="UPI">UPI</option>
                  <option value="Razorpay">Razorpay Gateway</option>
                  <option value="Paytm">Paytm</option>
                  <option value="NetBanking">NetBanking</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Payment Reference / UTR Number
                </label>
                <input
                  type="text"
                  required
                  value={gatewayRef}
                  onChange={(e) => setGatewayRef(e.target.value)}
                  placeholder="Enter verified gateway / UTR ID"
                  className="w-full h-11 px-4 rounded-xl bg-[#070913]/80 border border-white/10 font-mono-num text-sm text-white focus:outline-none focus:border-[#FF6B1A]"
                />
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Deposits are credited strictly after server/admin payment verification—no client-side instant crediting.
              </p>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-11 rounded-xl bg-[#FF6B1A] hover:bg-[#ff7f38] disabled:opacity-60 text-white text-sm font-semibold"
              >
                {submitting ? 'Submitting...' : 'Submit for Verification'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdraw && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Withdraw Winnings"
        >
          <div className="glass-card w-full max-w-md rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl font-bold text-white">
                Withdraw Winnings
              </h2>
              <button
                type="button"
                onClick={() => setShowWithdraw(false)}
                className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/25 p-3 flex items-center justify-between text-xs">
              <span className="text-slate-300">Withdrawable Winning Balance</span>
              <span className="font-mono-num font-bold text-emerald-400">
                {formatCurrency(winningBalance)}
              </span>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Amount (Min ₹50)
                </label>
                <input
                  type="number"
                  min={50}
                  max={Math.max(50, winningBalance)}
                  required
                  value={wdlAmount}
                  onChange={(e) => setWdlAmount(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl bg-[#070913]/80 border border-white/10 font-mono-num text-sm text-white focus:outline-none focus:border-[#9D4EDD]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Payout Method
                </label>
                <select
                  value={payoutMethod}
                  onChange={(e) => setPayoutMethod(e.target.value as 'UPI' | 'BankTransfer')}
                  className="w-full h-11 px-4 rounded-xl bg-[#070913]/80 border border-white/10 text-sm text-white focus:outline-none focus:border-[#9D4EDD]"
                >
                  <option value="UPI">UPI</option>
                  <option value="BankTransfer">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  {payoutMethod === 'UPI' ? 'UPI ID' : 'Bank Account & IFSC'}
                </label>
                <input
                  type="text"
                  required
                  value={payoutDestination}
                  onChange={(e) => setPayoutDestination(e.target.value)}
                  placeholder={payoutMethod === 'UPI' ? 'player@upi' : 'Acct No / IFSC'}
                  className="w-full h-11 px-4 rounded-xl bg-[#070913]/80 border border-white/10 text-sm text-white focus:outline-none focus:border-[#9D4EDD]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || winningBalance < 50}
                className="w-full h-11 rounded-xl bg-[#9D4EDD] hover:bg-[#a855f7] disabled:opacity-50 text-white text-sm font-semibold"
              >
                {submitting ? 'Submitting...' : 'Request Withdrawal'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Payment Receipt Modal */}
      {selectedReceipt && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Payment Receipt"
        >
          <div className="glass-card w-full max-w-sm rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl font-bold text-white">
                Payment Receipt
              </h3>
              <button
                type="button"
                onClick={() => setSelectedReceipt(null)}
                className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs border-y border-white/10 py-4">
              <div className="flex justify-between">
                <span className="text-slate-400">Transaction ID</span>
                <span className="font-mono-num text-white">{selectedReceipt.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Title</span>
                <span className="text-white font-medium">{selectedReceipt.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Type</span>
                <span className="text-white">{selectedReceipt.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Amount</span>
                <span className="font-mono-num font-bold text-[#FF6B1A]">
                  {formatCurrency(selectedReceipt.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status</span>
                <span className="text-white">{selectedReceipt.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Timestamp</span>
                <span className="text-slate-300">
                  {formatMatchDateTime(selectedReceipt.createdAt)}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedReceipt(null)}
              className="w-full h-10 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyLedger({ label }: { label: string }) {
  return (
    <div className="p-10 text-center text-xs text-slate-400">
      {label}
    </div>
  );
}
