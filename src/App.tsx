import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

type WalletKeys = 'grab' | 'anywheel' | 'kkp711' | 'scbBus';

export default function App() {
  const [dailyBudget, setDailyBudget] = useState<number>(200);
  const [wallets, setWallets] = useState<{ [key in WalletKeys]: number }>({
    grab: 0, anywheel: 0, kkp711: 0, scbBus: 0
  });
  const [topUpInput, setTopUpInput] = useState<{ walletKey: WalletKeys; amount: string }>({ 
    walletKey: 'grab', amount: '' 
  });
  const [dailyLogs, setDailyLogs] = useState<any[]>([]);
  const [monthlyLogs, setMonthlyLogs] = useState<any[]>([]);

  // 1. ดึงข้อมูลล่าสุดจาก Supabase เมื่อเปิดเว็บ
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

  // 2. ฟังก์ชันเติมเงิน + บันทึกลง Supabase ทันที
  const handleTopUp = async (key: WalletKeys, customAmount?: number | string) => {
    const addAmount = customAmount !== undefined && customAmount !== '' ? Number(customAmount) : 100;
    if (isNaN(addAmount) || addAmount <= 0) return;

    const newBalance = (wallets[key] || 0) + addAmount;
    
    // อัปเดตหน้าจอทันที
    setWallets(prev => ({ ...prev, [key]: newBalance }));

    // บันทึกลง Supabase ฐานข้อมูลจริง
    const { error } = await supabase.from('wallets').upsert({ id: key, balance: newBalance });
    if (error) {
      console.error('Error updating wallet:', error);
      alert('บันทึกข้อมูลไม่สำเร็จ: ' + error.message);
    }
  };

  // 3. ฟังก์ชันอัปเดตสถานะคืนเงิน
  const toggleRepaid = async (id: number, currentStatus: boolean) => {
    const updatedStatus = !currentStatus;
    setMonthlyLogs(prev => prev.map(item => item.id === id ? { ...item, is_repaid: updatedStatus } : item));
    await supabase.from('monthly_logs').update({ is_repaid: updatedStatus }).eq('id', id);
  };

  const dailyBalance = dailyBudget - dailyLogs.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);

  return (
    <div style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f6f8', minHeight: '100vh', padding: '16px' }}>
      <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
        <h2>💰 ระบบจัดการการเงินส่วนตัว (เชื่อม Supabase แล้ว)</h2>
      </div>

      {/* e-Wallet Tracker */}
      <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
        <h3>📱 ติดตามเงินใน e-Wallet</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          {(['grab', 'anywheel', 'kkp711', 'scbBus'] as WalletKeys[]).map((key) => (
            <div key={key} style={{ padding: '12px', borderRadius: '8px', border: wallets[key] < 20 ? '2px solid #d32f2f' : '1px solid #ddd', background: wallets[key] < 20 ? '#ffebee' : '#fafafa' }}>
              <strong>{key.toUpperCase()} Wallet</strong>
              <div style={{ fontSize: '18px', fontWeight: 'bold', margin: '4px 0' }}>{wallets[key]} บาท</div>
              {wallets[key] < 20 ? <div style={{ color: '#d32f2f', fontSize: '12px' }}>🔴 เงินใกล้หมด!</div> : <div style={{ color: '#2e7d32', fontSize: '12px' }}>🟢 พร้อมใช้งาน</div>}
              <button onClick={() => handleTopUp(key, 100)} style={{ marginTop: '8px', width: '100%', padding: '6px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>+ เติมเงิน 100 บ.</button>
            </div>
          ))}
        </div>

        <div style={{ background: '#f5f5f5', padding: '10px', borderRadius: '6px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span>⚙️ ระบุยอดเติมเงินเอง:</span>
          <select value={topUpInput.walletKey} onChange={e => setTopUpInput({...topUpInput, walletKey: e.target.value as WalletKeys})}>
            <option value="grab">Grab</option>
            <option value="anywheel">Anywheel</option>
            <option value="kkp711">7-11/KKP</option>
            <option value="scbBus">SCB Bus</option>
          </select>
          <input type="number" placeholder="จำนวนเงิน" value={topUpInput.amount} onChange={e => setTopUpInput({...topUpInput, amount: e.target.value})} style={{ width: '100px' }} />
          <button onClick={() => { handleTopUp(topUpInput.walletKey, topUpInput.amount); setTopUpInput({...topUpInput, amount: ''}); }}>บวกยอดเติมเงิน</button>
        </div>
      </div>

      {/* Daily & Monthly Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        <div style={{ background: '#fff', borderRadius: '12px', padding: '16px' }}>
          <h3>📅 บัญชีเงินรายวัน</h3>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button onClick={() => setDailyBudget(200)}>วันมหาลัย (+200)</button>
            <button onClick={() => setDailyBudget(100)}>วันทำงาน (+100)</button>
          </div>
          <div>งบวันนี้: {dailyBudget} บาท | คงเหลือ: <strong>{dailyBalance} บาท</strong></div>
        </div>

        <div style={{ background: '#fff', borderRadius: '12px', padding: '16px' }}>
          <h3>💳 บัญชีเงินเดือน & ยืมเงินตัวเอง</h3>
          {monthlyLogs.map(log => (
            <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
              <span>{log.title} ({log.amount} บ.)</span>
              {log.is_borrowed && (
                <label>
                  <input type="checkbox" checked={log.is_repaid} onChange={() => toggleRepaid(log.id, log.is_repaid)} />
                  {log.is_repaid ? ' คืนแล้ว' : ' รอคืน'}
                </label>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}