import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

type WalletKeys = 'grab' | 'anywheel' | 'kkp711' | 'scbBus';

export default function App() {
  // Tab control
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly' | 'analytics' | 'borrowed' | 'sandbox'>('daily');

  // 1. Wallets (e-Wallet)
  const [wallets, setWallets] = useState<{ [key in WalletKeys]: number }>({
    grab: 0, anywheel: 0, kkp711: 0, scbBus: 0
  });
  const [walletEdit, setWalletEdit] = useState<{ [key in WalletKeys]: string }>({
    grab: '', anywheel: '', kkp711: '', scbBus: ''
  });

  // 2. Daily Budget
  const [dailyBudget, setDailyBudget] = useState<number>(200);
  const [customDailyInput, setCustomDailyInput] = useState<string>('');
  const [dailyForm, setDailyForm] = useState({
    category: 'อาหาร/เครื่องดื่ม',
    note: '',
    amount: '',
    wallet: 'kkp711' as WalletKeys,
    isWasteful: false
  });
  const [dailyLogs, setDailyLogs] = useState<any[]>([]);

  // 3. Monthly Budget & Income
  const [monthlyIncome, setMonthlyIncome] = useState<number>(0);
  const [incomeForm, setIncomeForm] = useState({ title: '', amount: '', type: 'เงินเดือน' });
  const [monthlyLogs, setMonthlyLogs] = useState<any[]>([]);
  const [monthlyForm, setMonthlyForm] = useState({
    title: '',
    amount: '',
    isBorrowed: false,
    isWasteful: false
  });
  const [installmentForm, setInstallmentForm] = useState({ title: '', totalPrice: '', months: '3' });

  // 4. Sandbox (ทดลองคำนวณ)
  const [sandboxItems, setSandboxItems] = useState<{ id: number; title: string; amount: number }[]>([]);
  const [sandboxInput, setSandboxInput] = useState({ title: '', amount: '' });

  // Load Initial Data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Load Wallets
    const { data: walletData } = await supabase.from('wallets').select('*');
    if (walletData && walletData.length > 0) {
      const walletObj: any = {};
      walletData.forEach(item => { walletObj[item.id] = Number(item.balance) || 0; });
      setWallets(prev => ({ ...prev, ...walletObj }));
    }

    // Load Daily Logs
    const { data: dailyData } = await supabase.from('daily_logs').select('*').order('created_at', { ascending: false });
    if (dailyData) setDailyLogs(dailyData);

    // Load Monthly Logs
    const { data: monthlyData } = await supabase.from('monthly_logs').select('*').order('id', { ascending: true });
    if (monthlyData) setMonthlyLogs(monthlyData);
  };

  // --- 1. E-WALLET CUSTOM SETTING & TOP-UP ---
  const handleSetWalletBalance = async (key: WalletKeys) => {
    const val = Number(walletEdit[key]);
    if (isNaN(val)) return;
    setWallets(prev => ({ ...prev, [key]: val }));
    await supabase.from('wallets').upsert({ id: key, balance: val });
    alert(`อัปเดตยอดตั้งต้น ${key.toUpperCase()} เป็น ${val} บาทแล้ว`);
  };

  const handleTopUp = async (key: WalletKeys, addAmount: number) => {
    const newBal = (wallets[key] || 0) + addAmount;
    setWallets(prev => ({ ...prev, [key]: newBal }));
    await supabase.from('wallets').upsert({ id: key, balance: newBal });
  };

  // --- 2. DAILY EXPENSES ---
  const handleAddDailyLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(dailyForm.amount);
    if (!numAmount || numAmount <= 0) return;

    // Deduct Wallet
    const currentBal = wallets[dailyForm.wallet] || 0;
    const newBal = currentBal - numAmount;
    setWallets(prev => ({ ...prev, [dailyForm.wallet]: newBal }));
    await supabase.from('wallets').upsert({ id: dailyForm.wallet, balance: newBal });

    // Save DB
    const newLog = {
      category: dailyForm.category,
      note: dailyForm.note,
      amount: numAmount,
      wallet: dailyForm.wallet,
      is_wasteful: dailyForm.isWasteful
    };
    const { data } = await supabase.from('daily_logs').insert([newLog]).select();
    if (data) setDailyLogs(prev => [data[0], ...prev]);

    setDailyForm({ category: 'อาหาร/เครื่องดื่ม', note: '', amount: '', wallet: 'kkp711', isWasteful: false });
  };

  // --- 3. MONTHLY EXPENSES & INCOME ---
  const handleAddIncome = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(incomeForm.amount);
    if (!num) return;
    setMonthlyIncome(prev => prev + num);
    setIncomeForm({ title: '', amount: '', type: 'เงินเดือน' });
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
      is_repaid: false
    };
    const { data } = await supabase.from('monthly_logs').insert([newLog]).select();
    if (data) setMonthlyLogs(prev => [...prev, data[0]]);

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
      is_repaid: false
    };

    const { data } = await supabase.from('monthly_logs').insert([newLog]).select();
    if (data) setMonthlyLogs(prev => [...prev, data[0]]);

    setInstallmentForm({ title: '', totalPrice: '', months: '3' });
  };

  const toggleRepaid = async (id: number, currentStatus: boolean) => {
    const updatedStatus = !currentStatus;
    setMonthlyLogs(prev => prev.map(item => item.id === id ? { ...item, is_repaid: updatedStatus } : item));
    await supabase.from('monthly_logs').update({ is_repaid: updatedStatus }).eq('id', id);
  };

  // --- CALCULATIONS ---
  const totalDailySpent = dailyLogs.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  const dailyBalance = dailyBudget - totalDailySpent;

  const totalMonthlySpent = monthlyLogs.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  const monthlyBalance = monthlyIncome - totalMonthlySpent;

  const totalWalletBalance = Object.values(wallets).reduce((a, b) => a + b, 0);
  const totalCombinedBalance = totalWalletBalance + monthlyBalance;

  const borrowedLogs = monthlyLogs.filter(item => item.is_borrowed);
  const totalBorrowedUnpaid = borrowedLogs.filter(item => !item.is_repaid).reduce((acc, item) => acc + (Number(item.amount) || 0), 0);

  // --- SANDBOX LOGIC ---
  const addSandboxItem = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(sandboxInput.amount);
    if (!num) return;
    setSandboxItems(prev => [...prev, { id: Date.now(), title: sandboxInput.title || 'รายการทดลอง', amount: num }]);
    setSandboxInput({ title: '', amount: '' });
  };

  const totalSandboxSpent = sandboxItems.reduce((acc, item) => acc + item.amount, 0);
  const sandboxSimulatedBalance = monthlyBalance - totalSandboxSpent;

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f0f2f5', minHeight: '100vh', padding: '16px' }}>
      
      {/* HEADER NAVIGATION */}
      <div style={{ background: '#fff', padding: '16px', borderRadius: '12px', marginBottom: '16px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        <h2 style={{ margin: '0 0 12px 0', color: '#1a237e' }}>💰 ระบบจัดการการเงินส่วนตัว (Full Version)</h2>
        
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => setActiveTab('daily')} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: activeTab === 'daily' ? '#1a237e' : '#e8eaf6', color: activeTab === 'daily' ? '#fff' : '#000', cursor: 'pointer' }}>📱 e-Wallet & Daily</button>
          <button onClick={() => setActiveTab('monthly')} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: activeTab === 'monthly' ? '#1a237e' : '#e8eaf6', color: activeTab === 'monthly' ? '#fff' : '#000', cursor: 'pointer' }}>💳 เงินเดือน & รายจ่ายประจำ</button>
          <button onClick={() => setActiveTab('analytics')} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: activeTab === 'analytics' ? '#1a237e' : '#e8eaf6', color: activeTab === 'analytics' ? '#fff' : '#000', cursor: 'pointer' }}>📊 สรุปประมวลผล (รายเดือน/รายปี)</button>
          <button onClick={() => setActiveTab('borrowed')} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: activeTab === 'borrowed' ? '#1a237e' : '#e8eaf6', color: activeTab === 'borrowed' ? '#fff' : '#000', cursor: 'pointer' }}>🤝 ยืมเงินตัวเอง ({totalBorrowedUnpaid} บ.)</button>
          <button onClick={() => setActiveTab('sandbox')} style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: activeTab === 'sandbox' ? '#e65100' : '#fff3e0', color: activeTab === 'sandbox' ? '#fff' : '#e65100', fontWeight: 'bold', cursor: 'pointer' }}>🧪 Sandbox (ทดลองจ่าย)</button>
        </div>
      </div>

      {/* ----------------- TAB 1: DAILY & WALLET ----------------- */}
      {activeTab === 'daily' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* ข้อ 1: ปรับแก้เงิน e-Wallet ตั้งต้น */}
          <div style={{ background: '#fff', padding: '16px', borderRadius: '12px' }}>
            <h3>📱 กระเป๋าเงิน e-Wallet (ตั้งค่ายอดจริงได้)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              {(['grab', 'anywheel', 'kkp711', 'scbBus'] as WalletKeys[]).map((key) => (
                <div key={key} style={{ padding: '12px', border: '1px solid #e0e0e0', borderRadius: '8px', background: '#fafafa' }}>
                  <strong style={{ textTransform: 'uppercase' }}>{key} Wallet</strong>
                  <div style={{ fontSize: '22px', fontWeight: 'bold', margin: '4px 0', color: wallets[key] < 50 ? '#c62828' : '#2e7d32' }}>{wallets[key]} บาท</div>
                  <button onClick={() => handleTopUp(key, 100)} style={{ width: '100%', padding: '4px', marginBottom: '8px', background: '#4caf50', color: '#fff', border: 'none', borderRadius: '4px' }}>+ เติม 100 บ.</button>
                  
                  {/* ช่องกรอกเลขยอดตั้งต้น */}
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input type="number" placeholder="ตั้งยอดจริง" value={walletEdit[key]} onChange={e => setWalletEdit({ ...walletEdit, [key]: e.target.value })} style={{ width: '70%', padding: '4px' }} />
                    <button onClick={() => handleSetWalletBalance(key)} style={{ width: '30%', padding: '4px', fontSize: '11px' }}>ตั้งค่า</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ข้อ 5: เงินรายวัน (100/200/วันเที่ยว) */}
          <div style={{ background: '#fff', padding: '16px', borderRadius: '12px' }}>
            <h3>📅 บัญชีเงินรายวัน (Daily)</h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '12px' }}>
              <span>เลือกงบวันนี้:</span>
              <button onClick={() => setDailyBudget(200)}>วันมหาลัย (+200)</button>
              <button onClick={() => setDailyBudget(100)}>วันทำงาน (+100)</button>
              <span style={{ margin: '0 4px' }}>หรือกรอกวันเที่ยว/พิเศษ:</span>
              <input type="number" placeholder="จำนวนเงิน" value={customDailyInput} onChange={e => setCustomDailyInput(e.target.value)} style={{ width: '100px' }} />
              <button onClick={() => { if (Number(customDailyInput)) setDailyBudget(Number(customDailyInput)); setCustomDailyInput(''); }}>ตั้งค่างบ</button>
            </div>

            <div style={{ background: '#e3f2fd', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
              ตั้งงบวันนี้: <strong>{dailyBudget} บาท</strong> | ใช้ไปแล้ว: <strong>{totalDailySpent} บาท</strong> | คงเหลือ: <strong style={{ color: dailyBalance < 0 ? '#c62828' : '#2e7d32' }}>{dailyBalance} บาท</strong>
            </div>

            {/* ฟอร์มจ่ายรายวัน */}
            <form onSubmit={handleAddDailyLog} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f5f5f5', padding: '12px', borderRadius: '8px' }}>
              <strong>➕ บันทึกรายจ่ายรายวัน (หัก e-Wallet อัตโนมัติ):</strong>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <select value={dailyForm.category} onChange={e => setDailyForm({...dailyForm, category: e.target.value})}>
                  <option value="อาหาร/เครื่องดื่ม">🍔 อาหาร/เครื่องดื่ม</option>
                  <option value="การเดินทาง">🚌 การเดินทาง</option>
                  <option value="ของใช้ประจำวัน">🛒 ของใช้ประจำวัน</option>
                  <option value="การศึกษา">📚 การศึกษา</option>
                  <option value="ความบันเทิง">🎮 ความบันเทิง</option>
                  <option value="ช้อปปิ้ง">🛍️ ช้อปปิ้ง</option>
                  <option value="อื่นๆ">🌀 อื่นๆ</option>
                </select>
                <input type="text" placeholder="หมายเหตุ" value={dailyForm.note} onChange={e => setDailyForm({...dailyForm, note: e.target.value})} style={{ flex: 1 }} />
                <input type="number" placeholder="จำนวนเงิน" value={dailyForm.amount} onChange={e => setDailyForm({...dailyForm, amount: e.target.value})} style={{ width: '100px' }} required />
                <select value={dailyForm.wallet} onChange={e => setDailyForm({...dailyForm, wallet: e.target.value as WalletKeys})}>
                  <option value="grab">Grab</option>
                  <option value="anywheel">Anywheel</option>
                  <option value="kkp711">7-11/KKP</option>
                  <option value="scbBus">SCB Bus</option>
                </select>
              </div>
              <label style={{ color: '#c62828', fontSize: '13px' }}>
                <input type="checkbox" checked={dailyForm.isWasteful} onChange={e => setDailyForm({...dailyForm, isWasteful: e.target.checked})} /> 🔴 ไฮไลท์สีแดง (รายการฟุ่มเฟือย)
              </label>
              <button type="submit" style={{ background: '#1976d2', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px' }}>บันทึกรายจ่าย</button>
            </form>

            <h4 style={{ marginTop: '16px' }}>รายการใช้จ่ายวันนี้:</h4>
            {dailyLogs.map(log => (
              <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', marginBottom: '4px', background: log.is_wasteful ? '#ffebee' : '#fafafa', borderLeft: log.is_wasteful ? '4px solid #c62828' : 'none' }}>
                <span>{log.category} ({log.note}) - <small>ผ่าน {log.wallet}</small></span>
                <strong style={{ color: log.is_wasteful ? '#c62828' : '#000' }}>-{log.amount} บ.</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ----------------- TAB 2: MONTHLY & INCOME ----------------- */}
      {activeTab === 'monthly' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* ข้อ 6: บันทึกรายรับเงินเดือน / ญาติผู้ให้เงินก้อน */}
          <div style={{ background: '#fff', padding: '16px', borderRadius: '12px' }}>
            <h3>💵 รายรับประจำเดือน / เงินก้อนพิเศษ</h3>
            <form onSubmit={handleAddIncome} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input type="text" placeholder="ที่มาเงิน (เช่น เงินเดือน, ผู้ใหญ่ให้)" value={incomeForm.title} onChange={e => setIncomeForm({...incomeForm, title: e.target.value})} style={{ flex: 1 }} required />
              <input type="number" placeholder="จำนวนเงิน" value={incomeForm.amount} onChange={e => setIncomeForm({...incomeForm, amount: e.target.value})} style={{ width: '120px' }} required />
              <button type="submit" style={{ background: '#2e7d32', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px' }}>+ บันทึกรายรับ</button>
            </form>
            <div style={{ marginTop: '8px', color: '#2e7d32', fontWeight: 'bold' }}>ยอดรายรับรวมเดือนนี้: {monthlyIncome} บาท</div>
          </div>

          <div style={{ background: '#fff', padding: '16px', borderRadius: '12px' }}>
            <h3>💳 รายจ่ายประจำเดือน & ผ่อนชำระ</h3>
            
            {/* ฟอร์มรายจ่ายประจำ + ข้อ 4 ไฮไลท์สีแดง */}
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
              <button type="submit" style={{ background: '#1976d2', color: '#fff', border: 'none', padding: '8px' }}>บันทึกรายการ</button>
            </form>

            {/* โมดูลผ่อนชำระ */}
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
                <button type="submit" style={{ background: '#ef6c00', color: '#fff', border: 'none', padding: '6px 12px' }}>คำนวณผ่อน</button>
              </form>
            </div>

            <h4>รายการที่บันทึกแล้ว:</h4>
            {monthlyLogs.map(log => (
              <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', marginBottom: '4px', background: log.is_wasteful ? '#ffebee' : '#fafafa', borderLeft: log.is_wasteful ? '4px solid #c62828' : '1px solid #ddd' }}>
                <div>
                  <strong>{log.title}</strong> ({log.amount} บ.)
                  {log.is_wasteful && <span style={{ color: '#c62828', fontSize: '12px', marginLeft: '6px' }}>🔴 [ฟุ่มเฟือย]</span>}
                </div>
                {log.is_borrowed ? (
                  <label style={{ cursor: 'pointer', color: log.is_repaid ? '#2e7d32' : '#ef6c00' }}>
                    <input type="checkbox" checked={log.is_repaid} onChange={() => toggleRepaid(log.id, log.is_repaid)} />
                    {log.is_repaid ? ' [✓] คืนแล้ว' : ' [ ] รอคืนตัวเอง'}
                  </label>
                ) : <span style={{ fontSize: '12px', color: '#666' }}>รายจ่ายประจำ</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ----------------- TAB 3: ANALYTICS & DASHBOARD ----------------- */}
      {activeTab === 'analytics' && (
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px' }}>
          <h3>📊 ประมวลผลภาพรวม (รายเดือน / รายปี)</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginTop: '16px' }}>
            <div style={{ padding: '16px', background: '#e8f5e9', borderRadius: '8px' }}>
              <h4>👜 รวมยอด 2 กระเป๋าหลัก</h4>
              <p>เงินใน e-Wallet รวม: <strong>{totalWalletBalance} บาท</strong></p>
              <p>เงินคงเหลือบัญชีเงินเดือน: <strong>{monthlyBalance} บาท</strong></p>
              <hr />
              <h3 style={{ color: totalCombinedBalance < 0 ? '#c62828' : '#2e7d32' }}>ยอดเงินรวมทั้งหมด: {totalCombinedBalance} บาท</h3>
            </div>

            <div style={{ padding: '16px', background: monthlyBalance < 0 ? '#ffebee' : '#f1f8e9', borderRadius: '8px' }}>
              <h4>📅 ประมวลผลเงินเดือน (เดือนนี้)</h4>
              <p>รายรับ: {monthlyIncome} บาท</p>
              <p>รายจ่าย: {totalMonthlySpent} บาท</p>
              <h3>สถานะเดือนนี้: {monthlyBalance < 0 ? <span style={{ color: '#c62828' }}>🔴 ติดลบ {monthlyBalance} บาท</span> : <span style={{ color: '#2e7d32' }}>🟢 ไม่ติดลบ (+{monthlyBalance} บ.)</span>}</h3>
            </div>

            <div style={{ padding: '16px', background: '#fff3e0', borderRadius: '8px' }}>
              <h4>📈 ประมวลผลภาพรวมรายปี (คาดการณ์)</h4>
              <p>รวมรายจ่ายฟุ่มเฟือยทั้งหมด: {monthlyLogs.filter(i => i.is_wasteful).reduce((a,b)=>a+(Number(b.amount)||0),0)} บาท</p>
              <p>ยอดหนี้ที่ยืมตัวเองค้างชำระ: {totalBorrowedUnpaid} บาท</p>
              <h3>สถานะสัญญาณไฟ: {totalBorrowedUnpaid > 0 ? '🟡 เหลือง (ยืมเงินตัวเอง)' : '🟢 เขียว (ปกติ)'}</h3>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 4: BORROWED TRACKER ----------------- */}
      {activeTab === 'borrowed' && (
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px' }}>
          <h3>🤝 แท็บติดตาม "ยืมเงินตัวเอง"</h3>
          <p>รวมรายการทั้งหมดที่คุณเลือกยืมเงินตัวเองไว้ เพื่อให้ตามเช็คคืนเงินได้ง่าย:</p>
          
          <div style={{ padding: '12px', background: '#fff3e0', borderRadius: '8px', marginBottom: '16px', fontSize: '18px' }}>
            ยอดรวมยืมตัวเองที่ <strong>ยังไม่ได้คืน</strong>: <strong style={{ color: '#ef6c00' }}>{totalBorrowedUnpaid} บาท</strong>
          </div>

          {borrowedLogs.length === 0 ? <p>ไม่มีรายการยืมเงินตัวเอง</p> : (
            borrowedLogs.map(log => (
              <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', marginBottom: '8px', border: '1px solid #ffe0b2', borderRadius: '8px', background: log.is_repaid ? '#f1f8e9' : '#fff' }}>
                <div>
                  <strong style={{ fontSize: '16px' }}>{log.title}</strong>
                  <div style={{ color: '#d32f2f', fontWeight: 'bold' }}>ยอดเงิน: {log.amount} บาท</div>
                </div>
                <button onClick={() => toggleRepaid(log.id, log.is_repaid)} style={{ background: log.is_repaid ? '#2e7d32' : '#ef6c00', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>
                  {log.is_repaid ? '✓ คืนเงินแล้ว' : 'กดเมื่อคืนเงินแล้ว'}
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* ----------------- TAB 5: SANDBOX (ทดลองจ่าย) ----------------- */}
      {activeTab === 'sandbox' && (
        <div style={{ background: '#fff', padding: '16px', borderRadius: '12px' }}>
          <h3>🧪 Sandbox แท็บทดลองคำนวณเงินก่อนจ่ายจริง</h3>
          <p style={{ color: '#666' }}>💡 ข้อมูลในแท็บนี้ใช้เพื่อทดลองดูว่า "ถ้าซื้อของชิ้นนี้ เงินจะพอไหม" โดยจะไม่ถูกบันทึกลงในฐานข้อมูลจริงเด็ดขาด!</p>

          <form onSubmit={addSandboxItem} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input type="text" placeholder="ลองใส่ชื่อสินค้าที่จะซื้อ" value={sandboxInput.title} onChange={e => setSandboxInput({...sandboxInput, title: e.target.value})} style={{ flex: 1 }} required />
            <input type="number" placeholder="ราคา" value={sandboxInput.amount} onChange={e => setSandboxInput({...sandboxInput, amount: e.target.value})} style={{ width: '120px' }} required />
            <button type="submit" style={{ background: '#e65100', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px' }}>+ ทดลองเพิ่ม</button>
          </form>

          <div style={{ padding: '16px', background: sandboxSimulatedBalance < 0 ? '#ffebee' : '#e8f5e9', borderRadius: '8px', marginBottom: '16px' }}>
            <h4>ผลการจำลอง:</h4>
            <p>เงินเดือนคงเหลือจริงปัจจุบัน: <strong>{monthlyBalance} บาท</strong></p>
            <p>รวมยอดที่จะลองจ่ายเพิ่ม: <strong style={{ color: '#e65100' }}>-{totalSandboxSpent} บาท</strong></p>
            <hr />
            <h3>หากจ่ายจริง จะเหลือเงิน: <span style={{ color: sandboxSimulatedBalance < 0 ? '#c62828' : '#2e7d32' }}>{sandboxSimulatedBalance} บาท</span> {sandboxSimulatedBalance < 0 && '🔴 (เสี่ยงติดลบ!)'}</h3>
          </div>

          <h4>รายการที่กำลังลองใส่:</h4>
          {sandboxItems.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #eee' }}>
              <span>{item.title}</span>
              <strong>-{item.amount} บ.</strong>
            </div>
          ))}
          {sandboxItems.length > 0 && (
            <button onClick={() => setSandboxItems([])} style={{ marginTop: '12px', background: '#9e9e9e', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px' }}>ล้างรายการทดลองทั้งหมด</button>
          )}
        </div>
      )}

    </div>
  );
}