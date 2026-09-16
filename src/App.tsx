import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

type WalletKeys = 'grab' | 'anywheel' | 'kkp711' | 'scbBus';

export default function App() {
  // --- STATES ---
  const [dailyBudget, setDailyBudget] = useState<number>(200);
  const [wallets, setWallets] = useState<{ [key in WalletKeys]: number }>({
    grab: 0, anywheel: 0, kkp711: 0, scbBus: 0
  });
  const [topUpInput, setTopUpInput] = useState<{ walletKey: WalletKeys; amount: string }>({ walletKey: 'grab', amount: '' });

  // Form รายจ่ายรายวัน
  const [dailyForm, setDailyForm] = useState({
    category: 'อาหาร/เครื่องดื่ม',
    note: '',
    amount: '',
    wallet: 'kkp711' as WalletKeys,
    isWasteful: false
  });
  const [dailyLogs, setDailyLogs] = useState<any[]>([]);

  // Form รายจ่ายรายเดือน & ผ่อน
  const [monthlyLogs, setMonthlyLogs] = useState<any[]>([]);
  const [monthlyForm, setMonthlyForm] = useState({ title: '', amount: '', isBorrowed: false });
  const [installmentForm, setInstallmentForm] = useState({ title: '', totalPrice: '', months: '3' });

  // 1. ดึงข้อมูลเมื่อโหลดหน้าเว็บ
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

    const { data: monthlyData } = await supabase.from('monthly_logs').select('*').order('id', { ascending: true });
    if (monthlyData) setMonthlyLogs(monthlyData);
  };

  // 2. ระบบเติมเงิน e-Wallet
  const handleTopUp = async (key: WalletKeys, customAmount?: number | string) => {
    const addAmount = customAmount !== undefined && customAmount !== '' ? Number(customAmount) : 100;
    if (isNaN(addAmount) || addAmount <= 0) return;
    const newBalance = (wallets[key] || 0) + addAmount;
    setWallets(prev => ({ ...prev, [key]: newBalance }));
    await supabase.from('wallets').upsert({ id: key, balance: newBalance });
  };

  // 3. ระบบบันทึกรายจ่ายรายวัน (หัก Wallet + เซฟลง Supabase)
  const handleAddDailyLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(dailyForm.amount);
    if (!numAmount || numAmount <= 0) return;

    // หักเงินใน Wallet
    const currentWalletBal = wallets[dailyForm.wallet] || 0;
    const newWalletBal = currentWalletBal - numAmount;
    setWallets(prev => ({ ...prev, [dailyForm.wallet]: newWalletBal }));
    await supabase.from('wallets').upsert({ id: dailyForm.wallet, balance: newWalletBal });

    // บันทึกลง daily_logs
    const newLog = {
      category: dailyForm.category,
      note: dailyForm.note,
      amount: numAmount,
      wallet: dailyForm.wallet,
      is_wasteful: dailyForm.isWasteful
    };

    const { data, error } = await supabase.from('daily_logs').insert([newLog]).select();
    if (data) setDailyLogs(prev => [data[0], ...prev]);
    if (error) alert('เกิดข้อผิดพลาด: ' + error.message);

    setDailyForm({ category: 'อาหาร/เครื่องดื่ม', note: '', amount: '', wallet: 'kkp711', isWasteful: false });
  };

  // 4. บันทึกรายการเงินเดือน / ยืมเงินตัวเอง
  const handleAddMonthlyLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(monthlyForm.amount);
    if (!numAmount || numAmount <= 0) return;

    const newLog = { title: monthlyForm.title, amount: numAmount, is_borrowed: monthlyForm.isBorrowed, is_repaid: false };
    const { data } = await supabase.from('monthly_logs').insert([newLog]).select();
    if (data) setMonthlyLogs(prev => [...prev, data[0]]);

    setMonthlyForm({ title: '', amount: '', isBorrowed: false });
  };

  // 5. ระบบแตกงวดผ่อนชำระ
  const handleAddInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    const total = Number(installmentForm.totalPrice);
    const m = Number(installmentForm.months);
    if (!total || !m || m <= 0) return;

    const monthlyPay = Math.ceil(total / m);
    const newLog = {
      title: `[ผ่อน ${m} งวด] ${installmentForm.title}`,
      amount: monthlyPay,
      is_borrowed: true,
      is_repaid: false
    };

    const { data } = await supabase.from('monthly_logs').insert([newLog]).select();
    if (data) setMonthlyLogs(prev => [...prev, data[0]]);

    setInstallmentForm({ title: '', totalPrice: '', months: '3' });
  };

  // ติ๊กสถานะคืนเงิน
  const toggleRepaid = async (id: number, currentStatus: boolean) => {
    const updatedStatus = !currentStatus;
    setMonthlyLogs(prev => prev.map(item => item.id === id ? { ...item, is_repaid: updatedStatus } : item));
    await supabase.from('monthly_logs').update({ is_repaid: updatedStatus }).eq('id', id);
  };

  // คำนวณสรุปผล
  const totalDailySpent = dailyLogs.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
  const dailyBalance = dailyBudget - totalDailySpent;
  const unborrowedItems = monthlyLogs.filter(item => item.is_borrowed && !item.is_repaid);

  // สัญญาณไฟจราจร
  let trafficStatus = '🟢 เขียว (ปกติ)';
  let trafficBg = '#e8f5e9';
  let trafficColor = '#2e7d32';
  if (unborrowedItems.length > 0) {
    trafficStatus = '🟡 เหลือง (มียอดะยืมเงินตัวเองที่ยังไม่คืน)';
    trafficBg = '#fffde7';
    trafficColor = '#f57f17';
  }
  if (dailyBalance < -500 || unborrowedItems.length >= 4) {
    trafficStatus = '🔴 แดง (ติดลบสะสม/ยืมเกินกำหนด!)';
    trafficBg = '#ffebee';
    trafficColor = '#c62828';
  }

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f6f8', minHeight: '100vh', padding: '16px' }}>
      
      {/* Header & Traffic Light */}
      <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h2>💰 ระบบจัดการการเงินส่วนตัว</h2>
        <div style={{ padding: '8px 16px', borderRadius: '20px', backgroundColor: trafficBg, color: trafficColor, fontWeight: 'bold' }}>
          สถานะการเงิน: {trafficStatus}
        </div>
      </div>

      {/* 📱 e-Wallet Tracker */}
      <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
        <h3>📱 กระเป๋าเงิน e-Wallet</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          {(['grab', 'anywheel', 'kkp711', 'scbBus'] as WalletKeys[]).map((key) => (
            <div key={key} style={{ padding: '12px', borderRadius: '8px', border: wallets[key] < 20 ? '2px solid #d32f2f' : '1px solid #ddd', background: wallets[key] < 20 ? '#ffebee' : '#fafafa' }}>
              <strong>{key.toUpperCase()} Wallet</strong>
              <div style={{ fontSize: '20px', fontWeight: 'bold', margin: '4px 0' }}>{wallets[key]} บาท</div>
              {wallets[key] < 20 ? <div style={{ color: '#d32f2f', fontSize: '12px' }}>🔴 เงินใกล้หมด!</div> : <div style={{ color: '#2e7d32', fontSize: '12px' }}>🟢 พร้อมใช้งาน</div>}
              <button onClick={() => handleTopUp(key, 100)} style={{ marginTop: '8px', width: '100%', padding: '6px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ เติม 100 บ.</button>
            </div>
          ))}
        </div>
        <div style={{ background: '#f5f5f5', padding: '10px', borderRadius: '6px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span>⚙️ ระบุยอดเติมเงินเอง:</span>
          <select value={topUpInput.walletKey} onChange={e => setTopUpInput({...topUpInput, walletKey: e.target.value as WalletKeys})}>
            <option value="grab">Grab</option>
            <option value="anywheel">Anywheel</option>
            <option value="kkp711">7-11/KKP</option>
            <option value="scbBus">SCB Bus</option>
          </select>
          <input type="number" placeholder="จำนวนเงิน" value={topUpInput.amount} onChange={e => setTopUpInput({...topUpInput, amount: e.target.value})} style={{ width: '100px' }} />
          <button onClick={() => { handleTopUp(topUpInput.walletKey, topUpInput.amount); setTopUpInput({...topUpInput, amount: ''}); }}>เติมเงิน</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
        
        {/* 1. บัญชีเงินรายวัน */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '16px' }}>
          <h3>📅 1. บัญชีเงินรายวัน (Daily)</h3>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button onClick={() => setDailyBudget(200)} style={{ padding: '6px 12px' }}>วันมหาลัย (+200)</button>
            <button onClick={() => setDailyBudget(100)} style={{ padding: '6px 12px' }}>วันทำงาน (+100)</button>
          </div>
          <div style={{ marginBottom: '16px', background: '#e3f2fd', padding: '10px', borderRadius: '8px' }}>
            งบวันนี้: {dailyBudget} บาท | จ่ายไป: {totalDailySpent} บาท | <strong>คงเหลือ: {dailyBalance} บาท</strong>
          </div>

          {/* Form จ่ายรายวัน */}
          <form onSubmit={handleAddDailyLog} style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#fafafa', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
            <strong>➕ จ่ายเงินรายวัน (หัก Wallet อัตโนมัติ):</strong>
            <select value={dailyForm.category} onChange={e => setDailyForm({...dailyForm, category: e.target.value})}>
              <option value="อาหาร/เครื่องดื่ม">🍔 อาหาร/เครื่องดื่ม</option>
              <option value="การเดินทาง">🚌 การเดินทาง</option>
              <option value="ของใช้ประจำวัน">🛒 ของใช้ประจำวัน</option>
              <option value="การศึกษา/อุปกรณ์">📚 การศึกษา/อุปกรณ์</option>
              <option value="ความบันเทิง">🎮 ความบันเทิง</option>
              <option value="ช้อปปิ้ง">🛍️ ช้อปปิ้ง</option>
              <option value="อื่นๆ">🌀 อื่นๆ</option>
            </select>
            <input type="text" placeholder="หมายเหตุ (เช่น ข้าวผัด, ค่ารถปอ.)" value={dailyForm.note} onChange={e => setDailyForm({...dailyForm, note: e.target.value})} />
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="number" placeholder="จำนวนเงิน" value={dailyForm.amount} onChange={e => setDailyForm({...dailyForm, amount: e.target.value})} style={{ flex: 1 }} required />
              <select value={dailyForm.wallet} onChange={e => setDailyForm({...dailyForm, wallet: e.target.value as WalletKeys})}>
                <option value="grab">Grab</option>
                <option value="anywheel">Anywheel</option>
                <option value="kkp711">7-11/KKP</option>
                <option value="scbBus">SCB Bus</option>
              </select>
            </div>
            <label style={{ fontSize: '14px', color: '#d32f2f' }}>
              <input type="checkbox" checked={dailyForm.isWasteful} onChange={e => setDailyForm({...dailyForm, isWasteful: e.target.checked})} />
              🔴 ไฮไลท์สีแดง (รายการฟุ่มเฟือย)
            </label>
            <button type="submit" style={{ background: '#1976d2', color: '#fff', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer' }}>บันทึกรายจ่าย</button>
          </form>

          {/* ประวัติรายวัน */}
          <h4>ประวัติการใช้จ่ายวันนี้:</h4>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {dailyLogs.map(log => (
              <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', marginBottom: '4px', borderRadius: '4px', background: log.is_wasteful ? '#ffebee' : '#f5f5f5', borderLeft: log.is_wasteful ? '4px solid #d32f2f' : 'none' }}>
                <div>
                  <strong>{log.category}</strong> {log.note && `(${log.note})`}
                  <div style={{ fontSize: '11px', color: '#666' }}>จ่ายผ่าน: {log.wallet}</div>
                </div>
                <div style={{ fontWeight: 'bold', color: log.is_wasteful ? '#d32f2f' : '#000' }}>-{log.amount} บ.</div>
              </div>
            ))}
          </div>
        </div>

        {/* 2. บัญชีเงินเดือน & 3. โมดูลผ่อนชำระ */}
        <div style={{ background: '#fff', borderRadius: '12px', padding: '16px' }}>
          <h3>💳 2. บัญชีเงินเดือน & รายจ่ายประจำ</h3>

          {/* Form บันทึกรายจ่ายประจำเดือน */}
          <form onSubmit={handleAddMonthlyLog} style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <input type="text" placeholder="ชื่อรายการ (เช่น ค่าหอ, iCloud)" value={monthlyForm.title} onChange={e => setMonthlyForm({...monthlyForm, title: e.target.value})} style={{ flex: 1 }} required />
            <input type="number" placeholder="ยอดเงิน" value={monthlyForm.amount} onChange={e => setMonthlyForm({...monthlyForm, amount: e.target.value})} style={{ width: '90px' }} required />
            <label style={{ display: 'flex', alignItems: 'center', fontSize: '12px' }}>
              <input type="checkbox" checked={monthlyForm.isBorrowed} onChange={e => setMonthlyForm({...monthlyForm, isBorrowed: e.target.checked})} /> ยืมเงินตัวเอง
            </label>
            <button type="submit">เพิ่ม</button>
          </form>

          {/* 3. โมดูลผ่อนชำระ */}
          <div style={{ background: '#fff3e0', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
            <strong>🛍️ 3. คำนวณผ่อนชำระ (แตกยอดงวดรายเดือน):</strong>
            <form onSubmit={handleAddInstallment} style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
              <input type="text" placeholder="ชื่อสินค้า (เช่น หูฟัง)" value={installmentForm.title} onChange={e => setInstallmentForm({...installmentForm, title: e.target.value})} style={{ flex: 1 }} required />
              <input type="number" placeholder="ราคารวม" value={installmentForm.totalPrice} onChange={e => setInstallmentForm({...installmentForm, totalPrice: e.target.value})} style={{ width: '90px' }} required />
              <select value={installmentForm.months} onChange={e => setInstallmentForm({...installmentForm, months: e.target.value})}>
                <option value="3">3 เดือน</option>
                <option value="6">6 เดือน</option>
                <option value="10">10 เดือน</option>
              </select>
              <button type="submit" style={{ background: '#ef6c00', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px' }}>คำนวณผ่อน</button>
            </form>
          </div>

          {/* รายการรายเดือน + Repayment Checklist */}
          <h4>รายการที่ต้องจ่าย / ยืมเงินตัวเอง:</h4>
          {monthlyLogs.map(log => (
            <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
              <span>{log.title} (<strong>{log.amount} บ.</strong>)</span>
              {log.is_borrowed ? (
                <label style={{ cursor: 'pointer', color: log.is_repaid ? '#2e7d32' : '#e65100' }}>
                  <input type="checkbox" checked={log.is_repaid} onChange={() => toggleRepaid(log.id, log.is_repaid)} />
                  {log.is_repaid ? ' [✓] คืนแล้ว' : ' [ ] รอคืนตัวเอง'}
                </label>
              ) : <span style={{ fontSize: '12px', color: '#888' }}>รายจ่ายประจำ</span>}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}