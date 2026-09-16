import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

type WalletKeys = 'none' | 'grab' | 'anywheel' | 'kkp711' | 'scbBus';

export default function App() {
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly' | 'analytics' | 'borrowed' | 'sandbox'>('daily');

  // --- 📅 STATE วันที่ และ เดือน/ปี ---
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0] // YYYY-MM-DD
  );
  
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(new Date().getMonth()); // 0-11

  const monthsTh = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  const formattedSelectedMonth = `${selectedYear}-${String(selectedMonthIdx + 1).padStart(2, '0')}`;

  // 1. Wallets
  const [wallets, setWallets] = useState<{ [key in Exclude<WalletKeys, 'none'>]: number }>({
    grab: 0, anywheel: 0, kkp711: 0, scbBus: 0
  });
  const [walletEdit, setWalletEdit] = useState<{ [key in Exclude<WalletKeys, 'none'>]: string }>({
    grab: '', anywheel: '', kkp711: '', scbBus: ''
  });

  // 2. Daily Budget
  const [dailyBudget, setDailyBudget] = useState<number>(200);
  const [customDailyInput, setCustomDailyInput] = useState<string>('');
  const [dailyForm, setDailyForm] = useState({
    category: '🍔 อาหาร/เครื่องดื่ม',
    note: '',
    amount: '',
    wallet: 'none' as WalletKeys,
    isWasteful: false,
    isBorrowed: false
  });
  const [dailyLogs, setDailyLogs] = useState<any[]>([]);

  // 3. Monthly Budget & Income
  const [incomeLogs, setIncomeLogs] = useState<any[]>([]);
  const [incomeForm, setIncomeForm] = useState({ title: '', amount: '' });
  const [monthlyLogs, setMonthlyLogs] = useState<any[]>([]);
  const [monthlyForm, setMonthlyForm] = useState({
    title: '',
    amount: '',
    isBorrowed: false,
    isWasteful: false
  });
  const [installmentForm, setInstallmentForm] = useState({ title: '', totalPrice: '', months: '3' });

  // 4. Sandbox
  const [sandboxItems, setSandboxItems] = useState<{ id: number; title: string; amount: number }[]>([]);
  const [sandboxInput, setSandboxInput] = useState({ title: '', amount: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: walletData } = await supabase.from('wallets').select('*');
    if (walletData && walletData.length > 0) {
      const walletObj: any = {};
      walletData.forEach(item => { walletObj[item.id] = Number(item.balance) || 0; });
      setWallets(prev => ({ ...prev, ...walletObj }));
    }

    const { data: dailyData } = await supabase.from('daily_logs').select('*').order('created_at', { ascending: false });
    if (dailyData) setDailyLogs(dailyData);

    const { data: incData } = await supabase.from('income_logs').select('*').order('created_at', { ascending: false });
    if (incData) setIncomeLogs(incData);

    const { data: monthlyData } = await supabase.from('monthly_logs').select('*').order('created_at', { ascending: false });
    if (monthlyData) setMonthlyLogs(monthlyData);
  };

  // --- WALLET HANDLERS ---
  const handleSetWalletBalance = async (key: Exclude<WalletKeys, 'none'>) => {
    const val = Number(walletEdit[key]);
    if (isNaN(val)) return;
    setWallets(prev => ({ ...prev, [key]: val }));
    await supabase.from('wallets').upsert({ id: key, balance: val });
    alert(`อัปเดตยอด ${key.toUpperCase()} เป็น ${val} บาทแล้ว`);
  };

  const handleTopUp = async (key: Exclude<WalletKeys, 'none'>, addAmount: number) => {
    const newBal = (wallets[key] || 0) + addAmount;
    setWallets(prev => ({ ...prev, [key]: newBal }));
    await supabase.from('wallets').upsert({ id: key, balance: newBal });
  };

  // --- DAILY EXPENSES HANDLER ---
  const handleAddDailyLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(dailyForm.amount);
    if (!numAmount || numAmount <= 0) return;

    // หัก e-Wallet เฉพาะเมื่อเลือกกระเป๋าเงิน (ไม่ใช่ 'none')
    if (dailyForm.wallet !== 'none') {
      const currentBal = wallets[dailyForm.wallet] || 0;
      const newBal = currentBal - numAmount;
      setWallets(prev => ({ ...prev, [dailyForm.wallet as Exclude<WalletKeys, 'none'>]: newBal }));
      await supabase.from('wallets').upsert({ id: dailyForm.wallet, balance: newBal });
    }

    const newLog = {
      category: dailyForm.category,
      note: dailyForm.note,
      amount: numAmount,
      wallet: dailyForm.wallet,
      is_wasteful: dailyForm.isWasteful,
      is_borrowed: dailyForm.isBorrowed,
      is_repaid: false,
      date: selectedDate
    };
    const { data } = await supabase.from('daily_logs').insert([newLog]).select();
    if (data) setDailyLogs(prev => [data[0], ...prev]);

    setDailyForm({ category: '🍔 อาหาร/เครื่องดื่ม', note: '', amount: '', wallet: 'none', isWasteful: false, isBorrowed: false });
  };

  // --- MONTHLY HANDLERS ---
  const handleAddIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(incomeForm.amount);
    if (!num) return;

    const newInc = {
      title: incomeForm.title,
      amount: num,
      month: formattedSelectedMonth
    };

    const { data } = await supabase.from('income_logs').insert([newInc]).select();
    if (data) setIncomeLogs(prev => [data[0], ...prev]);

    setIncomeForm({ title: '', amount: '' });
  };

  const handleAddMonthlyLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(monthlyForm.amount);
    if (!numAmount || numAmount <= 0) return;

    const newLog = {
      title: monthlyForm.title,
      amount: numAmount,
      is_borrowed: monthlyForm.isBorrowed,
      is_wasteful: monthlyForm.isWasteful,
      is_repaid: false,
      month: formattedSelectedMonth
    };
    const { data } = await supabase.from('monthly_logs').insert([newLog]).select();
    if (data) setMonthlyLogs(prev => [data[0], ...prev]);

    setMonthlyForm({ title: '', amount: '', isBorrowed: false, isWasteful: false });
  };

  const handleAddInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = Number(installmentForm.totalPrice);
    const m = Number(installmentForm.months);
    if (!total || !m) return;

    const monthlyPay = Math.ceil(total / m);
    const newLog = {
      title: `[ผ่อน ${m} งวด] ${installmentForm.title}`,
      amount: monthlyPay,
      is_borrowed: true,
      is_wasteful: false,
      is_repaid: false,
      month: formattedSelectedMonth
    };

    const { data } = await supabase.from('monthly_logs').insert([newLog]).select();
    if (data) setMonthlyLogs(prev => [data[0], ...prev]);

    setInstallmentForm({ title: '', totalPrice: '', months: '3' });
  };

  const toggleRepaid = async (id: number, type: 'daily' | 'monthly', currentStatus: boolean) => {
    const updatedStatus = !currentStatus;
    if (type === 'daily') {
      setDailyLogs(prev => prev.map(item => item.id === id ? { ...item, is_repaid: updatedStatus } : item));
      await supabase.from('daily_logs').update({ is_repaid: updatedStatus }).eq('id', id);
    } else {
      setMonthlyLogs(prev => prev.map(item => item.id === id ? { ...item, is_repaid: updatedStatus } : item));
      await supabase.from('monthly_logs').update({ is_repaid: updatedStatus }).eq('id', id);
    }
  };

  // --- CALCULATIONS FOR SELECTED DATE (Daily Tab) ---
  const filteredDailyLogsDate = dailyLogs.filter(log => (log.date || log.created_at?.split('T')[0]) === selectedDate);
  const totalDailySpentSelectedDate = filteredDailyLogsDate.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  const dailyBalanceSelectedDate = dailyBudget - totalDailySpentSelectedDate;

  // --- CALCULATIONS FOR SELECTED MONTH (Monthly & Analytics Tab) ---
  const monthlyIncomesSelectedMonth = incomeLogs.filter(log => log.month === formattedSelectedMonth);
  const totalIncomeSelectedMonth = monthlyIncomesSelectedMonth.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);

  const monthlyLogsSelectedMonth = monthlyLogs.filter(log => (log.month || log.created_at?.slice(0, 7)) === formattedSelectedMonth);
  const totalMonthlySpentSelectedMonth = monthlyLogsSelectedMonth.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  const monthlyBalanceSelectedMonth = totalIncomeSelectedMonth - totalMonthlySpentSelectedMonth;

  // Daily Calculations within Selected Month
  const dailyLogsSelectedMonth = dailyLogs.filter(log => (log.date || log.created_at?.split('T')[0])?.startsWith(formattedSelectedMonth));
  const totalDailySpentSelectedMonth = dailyLogsSelectedMonth.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  const totalDailyWastefulSelectedMonth = dailyLogsSelectedMonth.filter(i => i.is_wasteful).reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  const totalDailyBorrowedUnpaidSelectedMonth = dailyLogsSelectedMonth.filter(i => i.is_borrowed && !i.is_repaid).reduce((acc, item) => acc + (Number(item.amount) || 0), 0);

  // Group Expenses by Category for Selected Month
  const categoryTotalsMonth: { [key: string]: number } = {};
  dailyLogsSelectedMonth.forEach(log => {
    categoryTotalsMonth[log.category] = (categoryTotalsMonth[log.category] || 0) + (Number(log.amount) || 0);
  });

  const totalMonthlyWastefulSelectedMonth = monthlyLogsSelectedMonth.filter(i => i.is_wasteful).reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  const totalMonthlyBorrowedUnpaidSelectedMonth = monthlyLogsSelectedMonth.filter(i => i.is_borrowed && !i.is_repaid).reduce((acc, item) => acc + (Number(item.amount) || 0), 0);

  // --- CALCULATIONS FOR SELECTED YEAR (Yearly Section) ---
  const yearPrefix = `${selectedYear}-`;
  const dailyLogsSelectedYear = dailyLogs.filter(log => (log.date || log.created_at?.split('T')[0])?.startsWith(yearPrefix));
  const totalDailySpentSelectedYear = dailyLogsSelectedYear.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);

  const incomeLogsSelectedYear = incomeLogs.filter(log => log.month?.startsWith(yearPrefix));
  const totalIncomeSelectedYear = incomeLogsSelectedYear.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);

  const monthlyLogsSelectedYear = monthlyLogs.filter(log => (log.month || log.created_at?.slice(0, 7))?.startsWith(yearPrefix));
  const totalMonthlySpentSelectedYear = monthlyLogsSelectedYear.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  const monthlyBalanceSelectedYear = totalIncomeSelectedYear - totalMonthlySpentSelectedYear;

  const totalWastefulSelectedYear = dailyLogsSelectedYear.filter(i => i.is_wasteful).reduce((acc, item) => acc + (Number(item.amount) || 0), 0) +
                                    monthlyLogsSelectedYear.filter(i => i.is_wasteful).reduce((acc, item) => acc + (Number(item.amount) || 0), 0);

  // Global Unpaid Borrowed Items (All time)
  const allBorrowedDaily = dailyLogs.filter(i => i.is_borrowed);
  const allBorrowedMonthly = monthlyLogs.filter(i => i.is_borrowed);
  const totalBorrowedUnpaidGlobal = allBorrowedDaily.filter(i => !i.is_repaid).reduce((acc, item) => acc + (Number(item.amount) || 0), 0) +
                                    allBorrowedMonthly.filter(i => !i.is_repaid).reduce((acc, item) => acc + (Number(item.amount) || 0), 0);

  const totalWalletBalance = Object.values(wallets).reduce((a, b) => a + b, 0);

  // Sandbox
  const addSandboxItem = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(sandboxInput.amount);
    if (!num) return;
    setSandboxItems(prev => [...prev, { id: Date.now(), title: sandboxInput.title || 'รายการทดลอง', amount: num }]);
    setSandboxInput({ title: '', amount: '' });
  };
  const totalSandboxSpent = sandboxItems.reduce((acc, item) => acc + item.amount, 0);
  const sandboxSimulatedBalance = monthlyBalanceSelectedMonth - totalSandboxSpent;

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f0f2f5', minHeight: '100vh', padding: '16px' }}>
      
      {/* HEADER NAVIGATION */}
      <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', marginBottom: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h2 style={{ margin: '0 0 12px 0', color: '#1a237e' }}>💰 ระบบจัดการการเงินส่วนตัว (Full Version)</h2>
        
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => setActiveTab('daily')} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: activeTab === 'daily' ? '#1a237e' : '#e8eaf6', color: activeTab === 'daily' ? '#fff' : '#000', cursor: 'pointer', fontWeight: 'bold' }}>📱 e-Wallet & Daily</button>
          <button onClick={() => setActiveTab('monthly')} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: activeTab === 'monthly' ? '#1a237e' : '#e8eaf6', color: activeTab === 'monthly' ? '#fff' : '#000', cursor: 'pointer', fontWeight: 'bold' }}>💳 เงินเดือน & รายจ่ายประจำ</button>
          <button onClick={() => setActiveTab('analytics')} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: activeTab === 'analytics' ? '#1a237e' : '#e8eaf6', color: activeTab === 'analytics' ? '#fff' : '#000', cursor: 'pointer', fontWeight: 'bold' }}>📊 สรุปประมวลผล (รายเดือน/รายปี)</button>
          <button onClick={() => setActiveTab('borrowed')} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: activeTab === 'borrowed' ? '#ef6c00' : '#fff3e0', color: activeTab === 'borrowed' ? '#fff' : '#ef6c00', cursor: 'pointer', fontWeight: 'bold' }}>🤝 ยืมเงินตัวเอง ({totalBorrowedUnpaidGlobal} บ.)</button>
          <button onClick={() => setActiveTab('sandbox')} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: activeTab === 'sandbox' ? '#c62828' : '#ffebee', color: activeTab === 'sandbox' ? '#fff' : '#c62828', cursor: 'pointer', fontWeight: 'bold' }}>🧪 Sandbox (ทดลองจ่าย)</button>
        </div>
      </div>

      {/* ----------------- TAB 1: DAILY & WALLET ----------------- */}
      {activeTab === 'daily' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* e-Wallet */}
          <div style={{ background: '#fff', padding: '16px', borderRadius: '12px' }}>
            <h3>📱 กระเป๋าเงิน e-Wallet (ทางเลือก)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {(['grab', 'anywheel', 'kkp711', 'scbBus'] as const).map((key) => (
                <div key={key} style={{ padding: '12px', border: '1px solid #e0e0e0', borderRadius: '8px', background: '#fafafa' }}>
                  <strong style={{ textTransform: 'uppercase' }}>{key} Wallet</strong>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', margin: '4px 0', color: wallets[key] < 50 ? '#c62828' : '#2e7d32' }}>{wallets[key]} บาท</div>
                  <button onClick={() => handleTopUp(key, 100)} style={{ width: '100%', padding: '4px', marginBottom: '8px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ เติม 100 บ.</button>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input type="number" placeholder="ตั้งยอดจริง" value={walletEdit[key]} onChange={e => setWalletEdit({ ...walletEdit, [key]: e.target.value })} style={{ width: '65%', padding: '4px' }} />
                    <button onClick={() => handleSetWalletBalance(key)} style={{ width: '35%', padding: '4px', fontSize: '11px', cursor: 'pointer' }}>ตั้งค่า</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* บัญชีเงินรายวัน */}
          <div style={{ background: '#fff', padding: '16px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
              <h3 style={{ margin: 0 }}>📅 บัญชีเงินรายวัน (Daily)</h3>
              <div style={{ background: '#e8eaf6', padding: '6px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ color: '#1a237e' }}>เลือกวันที่:</strong>
                <input 
                  type="date" 
                  value={selectedDate} 
                  onChange={e => setSelectedDate(e.target.value)}
                  style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #3f51b5', fontWeight: 'bold' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
              <span>ตั้งงบวันที่ {selectedDate}:</span>
              <button onClick={() => setDailyBudget(200)}>วันมหาลัย (+200)</button>
              <button onClick={() => setDailyBudget(100)}>วันทำงาน (+100)</button>
              <span style={{ margin: '0 4px' }}>หรือระบุเอง:</span>
              <input type="number" placeholder="จำนวนเงิน" value={customDailyInput} onChange={e => setCustomDailyInput(e.target.value)} style={{ width: '100px' }} />
              <button onClick={() => { if (Number(customDailyInput)) setDailyBudget(Number(customDailyInput)); setCustomDailyInput(''); }}>ตั้งงบ</button>
            </div>

            <div style={{ background: '#e3f2fd', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
              งบวันที่ {selectedDate}: <strong>{dailyBudget} บาท</strong> | ใช้ไปแล้ว: <strong>{totalDailySpentSelectedDate} บาท</strong> | คงเหลือ: <strong style={{ color: dailyBalanceSelectedDate < 0 ? '#c62828' : '#2e7d32' }}>{dailyBalanceSelectedDate} บาท</strong>
            </div>

            {/* ฟอร์มบันทึกรายจ่าย */}
            <form onSubmit={handleAddDailyLog} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f5f5f5', padding: '12px', borderRadius: '8px' }}>
              <strong>➕ บันทึกรายจ่ายประจำวันที่ [{selectedDate}]:</strong>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <select value={dailyForm.category} onChange={e => setDailyForm({...dailyForm, category: e.target.value})}>
                  <option value="🍔 อาหาร/เครื่องดื่ม">🍔 อาหาร/เครื่องดื่ม</option>
                  <option value="🚌 การเดินทาง">🚌 การเดินทาง</option>
                  <option value="🛒 ของใช้ประจำวัน">🛒 ของใช้ประจำวัน</option>
                  <option value="📚 การศึกษา">📚 การศึกษา</option>
                  <option value="🎮 ความบันเทิง">🎮 ความบันเทิง</option>
                  <option value="🛍️ ช้อปปิ้ง">🛍️ ช้อปปิ้ง</option>
                  <option value="🌀 อื่นๆ">🌀 อื่นๆ</option>
                </select>
                <input type="text" placeholder="หมายเหตุ" value={dailyForm.note} onChange={e => setDailyForm({...dailyForm, note: e.target.value})} style={{ flex: 1 }} />
                <input type="number" placeholder="จำนวนเงิน" value={dailyForm.amount} onChange={e => setDailyForm({...dailyForm, amount: e.target.value})} style={{ width: '100px' }} required />
                
                {/* ตัวเลือกกระเป๋าเงิน (มีทางเลือกไม่หัก) */}
                <select value={dailyForm.wallet} onChange={e => setDailyForm({...dailyForm, wallet: e.target.value as WalletKeys})}>
                  <option value="none">❌ ไม่หัก e-Wallet (เงินสด/ตัดบัญชี)</option>
                  <option value="grab">Grab Wallet</option>
                  <option value="anywheel">Anywheel Wallet</option>
                  <option value="kkp711">7-11 / KKP Wallet</option>
                  <option value="scbBus">SCB Bus Wallet</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '4px' }}>
                <label style={{ fontSize: '13px' }}>
                  <input type="checkbox" checked={dailyForm.isBorrowed} onChange={e => setDailyForm({...dailyForm, isBorrowed: e.target.checked})} /> 🤝 ยืมเงินตัวเอง
                </label>
                <label style={{ color: '#c62828', fontSize: '13px' }}>
                  <input type="checkbox" checked={dailyForm.isWasteful} onChange={e => setDailyForm({...dailyForm, isWasteful: e.target.checked})} /> 🔴 ไฮไลท์สีแดง (รายการฟุ่มเฟือย)
                </label>
              </div>

              <button type="submit" style={{ background: '#1976d2', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>บันทึกเข้าวันที่ {selectedDate}</button>
            </form>

            <h4 style={{ marginTop: '16px' }}>รายการใช้จ่ายของวันที่ [{selectedDate}]:</h4>
            {filteredDailyLogsDate.length === 0 ? <p style={{ color: '#888' }}>ยังไม่มีรายการในวันที่เลือกนี้ (งบยังเต็ม)</p> : (
              filteredDailyLogsDate.map(log => (
                <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', marginBottom: '4px', background: log.is_wasteful ? '#ffebee' : '#fafafa', borderLeft: log.is_wasteful ? '4px solid #c62828' : '1px solid #ddd' }}>
                  <div>
                    <span>{log.category} ({log.note || 'ไม่มีโน้ต'})</span>
                    <small style={{ marginLeft: '8px', color: '#666' }}>[{log.wallet === 'none' ? 'เงินสด/ตัดบัญชี' : `ผ่่า่น ${log.wallet}`}]</small>
                    {log.is_borrowed && <span style={{ color: '#ef6c00', fontSize: '12px', marginLeft: '6px' }}>[🤝 ยืมตัวเอง]</span>}
                  </div>
                  <strong style={{ color: log.is_wasteful ? '#c62828' : '#000' }}>-{log.amount} บ.</strong>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ----------------- TAB 2: MONTHLY & INCOME ----------------- */}
      {activeTab === 'monthly' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Header เลือกระบุเดือน */}
          <div style={{ background: '#e8eaf6', padding: '12px 16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ margin: 0, color: '#1a237e' }}>💳 จัดการเงินเดือน & รายจ่ายประจำ</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong>เดือนที่กำลังจัดการ:</strong>
              <span style={{ background: '#1a237e', color: '#fff', padding: '4px 12px', borderRadius: '12px', fontWeight: 'bold' }}>
                {monthsTh[selectedMonthIdx]} {selectedYear}
              </span>
              <small style={{ color: '#666' }}>(เปลี่ยนเดือนได้ที่แท็บ "สรุปประมวลผล")</small>
            </div>
          </div>

          {/* รายรับประจำเดือน */}
          <div style={{ background: '#fff', padding: '16px', borderRadius: '12px' }}>
            <h3>💵 รายรับประจำเดือน / เงินก้อนพิเศษ</h3>
            <form onSubmit={handleAddIncome} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
              <input type="text" placeholder="ที่มาเงิน (เช่น เงินเดือน, ผู้ใหญ่ให้)" value={incomeForm.title} onChange={e => setIncomeForm({...incomeForm, title: e.target.value})} style={{ flex: 1 }} required />
              <input type="number" placeholder="จำนวนเงิน" value={incomeForm.amount} onChange={e => setIncomeForm({...incomeForm, amount: e.target.value})} style={{ width: '120px' }} required />
              <button type="submit" style={{ background: '#2e7d32', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>+ บันทึกรายรับ</button>
            </form>

            <div style={{ padding: '8px 0', borderTop: '1px solid #eee', color: '#2e7d32', fontWeight: 'bold' }}>
              ยอดรายรับรวมเดือนนี้ ({monthsTh[selectedMonthIdx]}): {totalIncomeSelectedMonth} บาท
            </div>

            {/* ประวัติรายรับค้างไว้ด้านล่าง */}
            <h4>📜 ประวัติรายรับของเดือน [{monthsTh[selectedMonthIdx]} {selectedYear}]:</h4>
            {monthlyIncomesSelectedMonth.length === 0 ? <p style={{ color: '#888', fontSize: '14px' }}>ยังไม่มีประวัติรายรับในเดือนนี้</p> : (
              monthlyIncomesSelectedMonth.map(inc => (
                <div key={inc.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', marginBottom: '4px', background: '#f1f8e9', borderRadius: '4px' }}>
                  <span>🟢 {inc.title}</span>
                  <strong style={{ color: '#2e7d32' }}>+{inc.amount} บ.</strong>
                </div>
              ))
            )}
          </div>

          {/* รายจ่ายประจำเดือน */}
          <div style={{ background: '#fff', padding: '16px', borderRadius: '12px' }}>
            <h3>💳 รายจ่ายประจำเดือน & ผ่อนชำระ</h3>
            
            <form onSubmit={handleAddMonthlyLog} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#fafafa', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
              <strong>➕ บันทึกรายจ่ายประจำเดือน:</strong>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input type="text" placeholder="รายการ (เช่น ค่าหอ, Shopee)" value={monthlyForm.title} onChange={e => setMonthlyForm({...monthlyForm, title: e.target.value})} style={{ flex: 1 }} required />
                <input type="number" placeholder="จำนวนเงิน" value={monthlyForm.amount} onChange={e => setMonthlyForm({...monthlyForm, amount: e.target.value})} style={{ width: '100px' }} required />
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <label style={{ fontSize: '13px' }}>
                  <input type="checkbox" checked={monthlyForm.isBorrowed} onChange={e => setMonthlyForm({...monthlyForm, isBorrowed: e.target.checked})} /> 🤝 ยืมเงินตัวเอง
                </label>
                <label style={{ fontSize: '13px', color: '#c62828' }}>
                  <input type="checkbox" checked={monthlyForm.isWasteful} onChange={e => setMonthlyForm({...monthlyForm, isWasteful: e.target.checked})} /> 🔴 ไฮไลท์สีแดง (ฟุ่มเฟือย)
                </label>
              </div>
              <button type="submit" style={{ background: '#1976d2', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}>บันทึกรายการ</button>
            </form>

            <div style={{ background: '#fff3e0', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
              <strong>🛍️ คำนวณผ่อนชำระ (แตกงวดเข้าเงินเดือน):</strong>
              <form onSubmit={handleAddInstallment} style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                <input type="text" placeholder="ชื่อสินค้า" value={installmentForm.title} onChange={e => setInstallmentForm({...installmentForm, title: e.target.value})} style={{ flex: 1 }} required />
                <input type="number" placeholder="ราคารวม" value={installmentForm.totalPrice} onChange={e => setInstallmentForm({...installmentForm, totalPrice: e.target.value})} style={{ width: '100px' }} required />
                <select value={installmentForm.months} onChange={e => setInstallmentForm({...installmentForm, months: e.target.value})}>
                  <option value="3">3 เดือน</option>
                  <option value="6">6 เดือน</option>
                  <option value="10">10 เดือน</option>
                </select>
                <button type="submit" style={{ background: '#ef6c00', color: '#fff', border: 'none', padding: '6px 12px', cursor: 'pointer' }}>คำนวณผ่อน</button>
              </form>
            </div>

            {/* ประวัติรายจ่ายค้างไว้ด้านล่าง */}
            <h4>📜 ประวัติรายจ่ายของเดือน [{monthsTh[selectedMonthIdx]} {selectedYear}]:</h4>
            {monthlyLogsSelectedMonth.length === 0 ? <p style={{ color: '#888', fontSize: '14px' }}>ยังไม่มีรายการประวัติในเดือนนี้</p> : (
              monthlyLogsSelectedMonth.map(log => (
                <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', marginBottom: '4px', background: log.is_wasteful ? '#ffebee' : '#fafafa', borderLeft: log.is_wasteful ? '4px solid #c62828' : '1px solid #ddd' }}>
                  <div>
                    <strong>{log.title}</strong> (-{log.amount} บ.)
                    {log.is_wasteful && <span style={{ color: '#c62828', fontSize: '12px', marginLeft: '6px' }}>🔴 [ฟุ่มเฟือย]</span>}
                  </div>
                  {log.is_borrowed ? (
                    <label style={{ cursor: 'pointer', color: log.is_repaid ? '#2e7d32' : '#ef6c00', fontWeight: 'bold' }}>
                      <input type="checkbox" checked={log.is_repaid} onChange={() => toggleRepaid(log.id, 'monthly', log.is_repaid)} />
                      {log.is_repaid ? ' [✓] คืนแล้ว' : ' [🤝 ยืมตัวเอง]'}
                    </label>
                  ) : <span style={{ fontSize: '12px', color: '#666' }}>รายจ่ายประจำ</span>}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ----------------- TAB 3: ANALYTICS (ออกแบบใหม่ 2 SECTIONS) ----------------- */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* ================= SECTION 1: รายเดือน ================= */}
          <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
            
            {/* Control Bar: ปี และ แท็บเดือน */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: '#1a237e' }}>📊 ประมวลผลภาพรวม (รายเดือน)</h3>
              
              {/* เลือกปี */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong>เลือกปีประมวลผล:</strong>
                <select 
                  value={selectedYear} 
                  onChange={e => setSelectedYear(Number(e.target.value))}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #1a237e', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                </select>
              </div>
            </div>

            {/* แท็บเดือน ม.ค. - ธ.ค. */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '4px', marginBottom: '20px' }}>
              {monthsTh.map((m, idx) => (
                <button
                  key={m}
                  onClick={() => setSelectedMonthIdx(idx)}
                  style={{
                    padding: '8px 2px',
                    border: 'none',
                    borderRadius: '6px',
                    background: selectedMonthIdx === idx ? '#1a237e' : '#e8eaf6',
                    color: selectedMonthIdx === idx ? '#fff' : '#000',
                    fontWeight: selectedMonthIdx === idx ? 'bold' : 'normal',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* 3 การ์ดหลักประจำเดือนที่เลือก */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              
              {/* การ์ด 1: รวมยอด 2 กระเป๋าหลัก */}
              <div style={{ background: '#e8f5e9', padding: '16px', borderRadius: '10px', border: '1px solid #c8e6c9' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#2e7d32' }}>👜 รวมยอด 2 กระเป๋าหลัก ({monthsTh[selectedMonthIdx]})</h4>
                <p>เงินคงเหลือบัญชี Daily (e-Wallet รวม): <strong>{totalWalletBalance} บาท</strong></p>
                <p>เงินคงเหลือบัญชีเงินเดือน: <strong>{monthlyBalanceSelectedMonth} บาท</strong></p>
                <p style={{ color: '#c62828' }}>รวมรายจ่ายฟุ่มเฟือย: <strong>{totalDailyWastefulSelectedMonth + totalMonthlyWastefulSelectedMonth} บาท</strong></p>
                <hr style={{ border: 'none', borderTop: '1px dashed #a5d6a7' }} />
                <h3 style={{ margin: '8px 0 0 0', color: (totalWalletBalance + monthlyBalanceSelectedMonth) < 0 ? '#c62828' : '#2e7d32' }}>
                  ยอดเงินรวมทั้งหมด: {totalWalletBalance + monthlyBalanceSelectedMonth} บาท
                </h3>
              </div>

              {/* การ์ด 2: ประมวลผลเงินรายวัน */}
              <div style={{ background: '#e3f2fd', padding: '16px', borderRadius: '10px', border: '1px solid #bbdefb' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#1565c0' }}>📅 ประมวลผลเงินรายวัน ({monthsTh[selectedMonthIdx]})</h4>
                <p>รายรับ (งบประมาณสะสม): <strong>- บาท</strong></p>
                <p>รายจ่ายรวมรายวัน: <strong>{totalDailySpentSelectedMonth} บาท</strong></p>
                
                {/* สรุปรายจ่ายแยกตามประเภทแบบแถบสบายตา */}
                <div style={{ margin: '8px 0', background: '#fff', padding: '8px', borderRadius: '6px', fontSize: '12px' }}>
                  <strong>รายจ่ายแต่ละประเภท:</strong>
                  {Object.keys(categoryTotalsMonth).length === 0 ? <p style={{ margin: '4px 0 0 0', color: '#888' }}>ไม่มีรายการ</p> : (
                    Object.entries(categoryTotalsMonth).map(([cat, amt]) => (
                      <div key={cat} style={{ margin: '4px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{cat}</span>
                          <strong>{amt} บ.</strong>
                        </div>
                        <div style={{ background: '#e0e0e0', height: '4px', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, (amt / (totalDailySpentSelectedMonth || 1)) * 100)}%`, background: '#1976d2', height: '100%' }}></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <p style={{ color: '#c62828' }}>รวมรายจ่ายฟุ่มเฟือย: <strong>{totalDailyWastefulSelectedMonth} บาท</strong></p>
                <p style={{ color: '#ef6c00' }}>ยอดหนี้ที่ยืมตัวเองค้างชำระ: <strong>{totalDailyBorrowedUnpaidSelectedMonth} บาท</strong></p>
              </div>

              {/* การ์ด 3: ประมวลผลเงินเดือน */}
              <div style={{ background: '#fff3e0', padding: '16px', borderRadius: '10px', border: '1px solid #ffe0b2' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#e65100' }}>💳 ประมวลผลเงินเดือน ({monthsTh[selectedMonthIdx]})</h4>
                <p>รายรับประจำเดือน: <strong>{totalIncomeSelectedMonth} บาท</strong></p>
                <p>รายจ่ายประจำเดือน: <strong>{totalMonthlySpentSelectedMonth} บาท</strong></p>
                <p style={{ color: '#c62828' }}>รวมรายจ่ายฟุ่มเฟือย: <strong>{totalMonthlyWastefulSelectedMonth} บาท</strong></p>
                <p style={{ color: '#ef6c00' }}>ยอดหนี้ที่ยืมตัวเองค้างชำระ: <strong>{totalMonthlyBorrowedUnpaidSelectedMonth} บาท</strong></p>
                <hr style={{ border: 'none', borderTop: '1px dashed #ffcc80' }} />
                <h3 style={{ margin: '8px 0 0 0' }}>
                  สถานะเดือนนี้: {monthlyBalanceSelectedMonth < 0 ? <span style={{ color: '#c62828' }}>🔴 ติดลบ ({monthlyBalanceSelectedMonth} บ.)</span> : <span style={{ color: '#2e7d32' }}>🟢 ไม่ติดลบ (+{monthlyBalanceSelectedMonth} บ.)</span>}
                </h3>
              </div>

            </div>
          </div>

          {/* ================= SECTION 2: รายปี ================= */}
          <div style={{ background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderTop: '4px solid #1a237e' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#1a237e' }}>📈 ประมวลผลภาพรวมรายปี (ประจำปี {selectedYear})</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '8px' }}>
                <span>ยอดเงินคงเหลือบัญชี Daily ทั้งปี:</span>
                <h3 style={{ margin: '4px 0 0 0', color: '#1976d2' }}>{totalWalletBalance} บาท</h3>
              </div>

              <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '8px' }}>
                <span>ยอดเงินคงเหลือบัญชีเงินเดือนทั้งปี:</span>
                <h3 style={{ margin: '4px 0 0 0', color: monthlyBalanceSelectedYear < 0 ? '#c62828' : '#2e7d32' }}>{monthlyBalanceSelectedYear} บาท</h3>
              </div>

              <div style={{ padding: '12px', background: '#ffebee', borderRadius: '8px' }}>
                <span style={{ color: '#c62828' }}>รวมรายจ่ายฟุ่มเฟือยทั้งหมด:</span>
                <h3 style={{ margin: '4px 0 0 0', color: '#c62828' }}>{totalWastefulSelectedYear} บาท</h3>
              </div>

              <div style={{ padding: '12px', background: '#fff3e0', borderRadius: '8px' }}>
                <span style={{ color: '#e65100' }}>ยอดหนี้ที่ยืมตัวเองค้างชำระ:</span>
                <h3 style={{ margin: '4px 0 0 0', color: '#e65100' }}>{totalBorrowedUnpaidGlobal} บาท</h3>
              </div>
            </div>

            <div style={{ marginTop: '16px', padding: '16px', background: '#f9f9f9', borderRadius: '8px', textAlign: 'center' }}>
              <strong style={{ fontSize: '18px' }}>
                สถานะภาพรวมทั้งปี {selectedYear}: {
                  totalBorrowedUnpaidGlobal > 0 || monthlyBalanceSelectedYear < 0 
                    ? <span style={{ color: '#ef6c00' }}>🟡 สัญญาณเหลือง (มีหนี้ยืมตัวเอง หรือเงินเดือนติดลบ)</span> 
                    : <span style={{ color: '#2e7d32' }}>🟢 สัญญาณเขียว (สถานะทางการเงินปกติ)</span>
                }
              </strong>
            </div>
          </div>

        </div>
      )}

      {/* ----------------- TAB 4: BORROWED ----------------- */}
      {activeTab === 'borrowed' && (
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px' }}>
          <h3>🤝 แท็บติดตาม "ยืมเงินตัวเอง" (รวมจากทุกรายการ)</h3>
          <div style={{ padding: '12px', background: '#fff3e0', borderRadius: '8px', marginBottom: '16px', fontSize: '18px' }}>
            ยอดรวมยืมตัวเองที่ <strong>ยังไม่ได้คืน</strong>: <strong style={{ color: '#ef6c00' }}>{totalBorrowedUnpaidGlobal} บาท</strong>
          </div>

          <h4>รายการยืมเงินตัวเองจากบัญชีเงินรายวัน (Daily):</h4>
          {allBorrowedDaily.length === 0 ? <p style={{ color: '#888' }}>ไม่มีรายการยืมเงินตัวเอง</p> : (
            allBorrowedDaily.map(log => (
              <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', marginBottom: '6px', border: '1px solid #ffe0b2', borderRadius: '8px', background: log.is_repaid ? '#f1f8e9' : '#fff' }}>
                <div>
                  <strong>{log.category} ({log.note || 'ไม่มีโน้ต'})</strong> <small>({log.date})</small>
                  <div style={{ color: '#d32f2f', fontWeight: 'bold' }}>ยอดเงิน: {log.amount} บาท</div>
                </div>
                <button onClick={() => toggleRepaid(log.id, 'daily', log.is_repaid)} style={{ background: log.is_repaid ? '#2e7d32' : '#ef6c00', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>
                  {log.is_repaid ? '✓ คืนเงินแล้ว' : 'กดเมื่อคืนเงินแล้ว'}
                </button>
              </div>
            ))
          )}

          <h4 style={{ marginTop: '20px' }}>รายการยืมเงินตัวเองจากบัญชีเงินเดือน (Monthly):</h4>
          {allBorrowedMonthly.length === 0 ? <p style={{ color: '#888' }}>ไม่มีรายการยืมเงินตัวเอง</p> : (
            allBorrowedMonthly.map(log => (
              <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', marginBottom: '6px', border: '1px solid #ffe0b2', borderRadius: '8px', background: log.is_repaid ? '#f1f8e9' : '#fff' }}>
                <div>
                  <strong>{log.title}</strong> <small>({log.month})</small>
                  <div style={{ color: '#d32f2f', fontWeight: 'bold' }}>ยอดเงิน: {log.amount} บาท</div>
                </div>
                <button onClick={() => toggleRepaid(log.id, 'monthly', log.is_repaid)} style={{ background: log.is_repaid ? '#2e7d32' : '#ef6c00', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>
                  {log.is_repaid ? '✓ คืนเงินแล้ว' : 'กดเมื่อคืนเงินแล้ว'}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* ----------------- TAB 5: SANDBOX ----------------- */}
      {activeTab === 'sandbox' && (
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px' }}>
          <h3>🧪 Sandbox แท็บทดลองคำนวณเงินก่อนจ่ายจริง</h3>
          <p style={{ color: '#666' }}>💡 คำนวณเทียบกับยอดคงเหลือของเดือน [{monthsTh[selectedMonthIdx]} {selectedYear}]</p>

          <form onSubmit={addSandboxItem} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input type="text" placeholder="ลองใส่ชื่อสินค้าที่จะซื้อ" value={sandboxInput.title} onChange={e => setSandboxInput({...sandboxInput, title: e.target.value})} style={{ flex: 1 }} required />
            <input type="number" placeholder="ราคา" value={sandboxInput.amount} onChange={e => setSandboxInput({...sandboxInput, amount: e.target.value})} style={{ width: '120px' }} required />
            <button type="submit" style={{ background: '#c62828', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>+ ทดลองเพิ่ม</button>
          </form>

          <div style={{ padding: '16px', background: sandboxSimulatedBalance < 0 ? '#ffebee' : '#e8f5e9', borderRadius: '8px', marginBottom: '16px' }}>
            <h4>ผลการจำลอง:</h4>
            <p>เงินเดือนคงเหลือเดือน {monthsTh[selectedMonthIdx]}: <strong>{monthlyBalanceSelectedMonth} บาท</strong></p>
            <p>รวมยอดที่จะลองจ่ายเพิ่ม: <strong style={{ color: '#c62828' }}>-{totalSandboxSpent} บาท</strong></p>
            <hr />
            <h3>หากจ่ายจริง จะเหลือเงิน: <span style={{ color: sandboxSimulatedBalance < 0 ? '#c62828' : '#2e7d32' }}>{sandboxSimulatedBalance} บาท</span></h3>
          </div>

          <h4>รายการที่กำลังลองใส่:</h4>
          {sandboxItems.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #eee' }}>
              <span>{item.title}</span>
              <strong>-{item.amount} บ.</strong>
            </div>
          ))}
          {sandboxItems.length > 0 && (
            <button onClick={() => setSandboxItems([])} style={{ marginTop: '12px', background: '#9e9e9e', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>ล้างรายการทดลองทั้งหมด</button>
          )}
        </div>
      )}

    </div>
  );
}