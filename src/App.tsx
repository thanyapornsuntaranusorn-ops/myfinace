import { useState } from 'react';

// กำหนด Type สำหรับ e-Wallet
type WalletKeys = 'grab' | 'anywheel' | 'kkp711' | 'scbBus';

export default function App() {
  // --- STATE MANAGEMENT ---
  const [dailyBudget, setDailyBudget] = useState<number>(200);
  const [dailyBalance] = useState<number>(160);
  const [trafficLight] = useState<'green' | 'yellow' | 'red'>('yellow');

  // 💳 e-Wallet States
  const [wallets, setWallets] = useState<{ [key in WalletKeys]: number }>({
    grab: 15,
    anywheel: 45,
    kkp711: 120,
    scbBus: 30,
  });

  const [topUpInput, setTopUpInput] = useState<{
    walletKey: WalletKeys;
    amount: string;
  }>({
    walletKey: 'grab',
    amount: '',
  });

  // ฟังก์ชันเติมเงิน e-Wallet
  const handleTopUp = (key: WalletKeys, customAmount?: number | string) => {
    const addAmount =
      customAmount !== undefined && customAmount !== ''
        ? Number(customAmount)
        : 100;
    if (isNaN(addAmount) || addAmount <= 0) return;

    setWallets((prev) => ({
      ...prev,
      [key]: prev[key] + addAmount,
    }));
  };

  // รายการเงินรายวัน
  const [dailyLogs] = useState([
    {
      id: 1,
      category: 'ค่าเดินทาง',
      note: 'นั่ง Grab ไปมหาลัย',
      amount: 23,
      wallet: 'grab',
      isWasteful: false,
    },
    {
      id: 2,
      category: 'ค่าช็อปปิ้ง',
      note: 'เสื้อตัวใหม่',
      amount: 350,
      wallet: 'cash',
      isWasteful: true,
    },
  ]);

  // รายการเงินเดือน & Checklist ยืมเงินตัวเอง
  const [monthlyLogs, setMonthlyLogs] = useState([
    {
      id: 1,
      title: 'ค่าหอพัก',
      amount: 5500,
      isBorrowed: false,
      isRepaid: true,
    },
    {
      id: 2,
      title: 'ค่า iCloud',
      amount: 39,
      isBorrowed: false,
      isRepaid: true,
    },
    {
      id: 3,
      title: 'ทำฟันคลินิก',
      amount: 1500,
      isBorrowed: true,
      isRepaid: false,
    },
  ]);

  return (
    <div
      style={{
        fontFamily: 'sans-serif',
        backgroundColor: '#f4f6f8',
        minHeight: '100vh',
        padding: '16px',
      }}
    >
      {/* 1. HEADER & TRAFFIC LIGHT STATUS */}
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <h2 style={{ margin: 0 }}>💰 ระบบจัดการการเงินส่วนตัว</h2>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#eee',
              padding: '6px 12px',
              borderRadius: '20px',
            }}
          >
            <span>สถานะ:</span>
            <div
              style={{
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                backgroundColor:
                  trafficLight === 'green'
                    ? '#2e7d32'
                    : trafficLight === 'yellow'
                    ? '#fbc02d'
                    : '#d32f2f',
              }}
            ></div>
            <strong>
              {trafficLight === 'yellow'
                ? 'สีเหลือง (มียอดติดลบ/ยืมเงิน)'
                : 'สีเขียว (ปกติ)'}
            </strong>
          </div>
        </div>
        <p style={{ color: '#666', margin: '8px 0 0 0' }}>
          เงินเก็บสะสมยกมาจากเดือนก่อน: <strong>+2,450 บาท</strong>
        </p>
      </div>

      {/* 2. E-WALLET TRACKER & TOP-UP MODULE */}
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}
      >
        <h3 style={{ margin: '0 0 12px 0' }}>
          📱 ติดตามเงินใน e-Wallet & เตือนเติมเงิน (เป้าหมาย 100 บ.)
        </h3>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          {/* Grab Wallet */}
          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              border:
                wallets.grab < 20 ? '2px solid #d32f2f' : '1px solid #ddd',
              background: wallets.grab < 20 ? '#ffebee' : '#fafafa',
            }}
          >
            <strong>🚗 Grab Wallet</strong>
            <div
              style={{ fontSize: '18px', fontWeight: 'bold', margin: '4px 0' }}
            >
              {wallets.grab} บาท
            </div>
            {wallets.grab < 20 ? (
              <div style={{ color: '#d32f2f', fontSize: '12px' }}>
                🔴 เงินใกล้หมด! เติมด่วน
              </div>
            ) : (
              <div style={{ color: '#2e7d32', fontSize: '12px' }}>
                🟢 พร้อมใช้งาน
              </div>
            )}
            <button
              onClick={() => handleTopUp('grab', 100)}
              style={{
                marginTop: '8px',
                width: '100%',
                padding: '6px',
                background: '#2e7d32',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              + เติมเงิน 100 บ.
            </button>
          </div>

          {/* Anywheel Wallet */}
          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              border:
                wallets.anywheel < 20 ? '2px solid #d32f2f' : '1px solid #ddd',
              background: wallets.anywheel < 20 ? '#ffebee' : '#fafafa',
            }}
          >
            <strong>🛵 Anywheel (จักรยาน)</strong>
            <div
              style={{ fontSize: '18px', fontWeight: 'bold', margin: '4px 0' }}
            >
              {wallets.anywheel} บาท
            </div>
            {wallets.anywheel < 20 ? (
              <div style={{ color: '#d32f2f', fontSize: '12px' }}>
                🔴 เงินใกล้หมด!
              </div>
            ) : (
              <div style={{ color: '#2e7d32', fontSize: '12px' }}>
                🟢 พร้อมใช้งาน
              </div>
            )}
            <button
              onClick={() => handleTopUp('anywheel', 100)}
              style={{
                marginTop: '8px',
                width: '100%',
                padding: '6px',
                background: '#2e7d32',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              + เติมเงิน 100 บ.
            </button>
          </div>

          {/* 7-11 / KKP */}
          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              border:
                wallets.kkp711 < 20 ? '2px solid #d32f2f' : '1px solid #ddd',
              background: wallets.kkp711 < 20 ? '#ffebee' : '#fafafa',
            }}
          >
            <strong>🛒 7-Eleven (KKP)</strong>
            <div
              style={{ fontSize: '18px', fontWeight: 'bold', margin: '4px 0' }}
            >
              {wallets.kkp711} บาท
            </div>
            {wallets.kkp711 < 20 ? (
              <div style={{ color: '#d32f2f', fontSize: '12px' }}>
                🔴 เงินใกล้หมด!
              </div>
            ) : (
              <div style={{ color: '#2e7d32', fontSize: '12px' }}>
                🟢 พร้อมใช้งาน
              </div>
            )}
            <button
              onClick={() => handleTopUp('kkp711', 100)}
              style={{
                marginTop: '8px',
                width: '100%',
                padding: '6px',
                background: '#2e7d32',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              + เติมเงิน 100 บ.
            </button>
          </div>

          {/* รถเมล์ / SCB */}
          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              border:
                wallets.scbBus < 20 ? '2px solid #d32f2f' : '1px solid #ddd',
              background: wallets.scbBus < 20 ? '#ffebee' : '#fafafa',
            }}
          >
            <strong>🚌 รถเมล์ (SCB)</strong>
            <div
              style={{ fontSize: '18px', fontWeight: 'bold', margin: '4px 0' }}
            >
              {wallets.scbBus} บาท
            </div>
            {wallets.scbBus < 20 ? (
              <div style={{ color: '#d32f2f', fontSize: '12px' }}>
                🔴 เงินใกล้หมด!
              </div>
            ) : (
              <div style={{ color: '#2e7d32', fontSize: '12px' }}>
                🟢 พร้อมใช้งาน
              </div>
            )}
            <button
              onClick={() => handleTopUp('scbBus', 100)}
              style={{
                marginTop: '8px',
                width: '100%',
                padding: '6px',
                background: '#2e7d32',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              + เติมเงิน 100 บ.
            </button>
          </div>
        </div>

        {/* ระบุยอดเติมเงินเอง */}
        <div
          style={{
            background: '#f5f5f5',
            padding: '10px',
            borderRadius: '6px',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '14px' }}>⚙️ ระบุยอดเติมเงินเอง:</span>
          <select
            value={topUpInput.walletKey}
            onChange={(e) =>
              setTopUpInput({
                ...topUpInput,
                walletKey: e.target.value as WalletKeys,
              })
            }
            style={{ padding: '6px', borderRadius: '4px' }}
          >
            <option value="grab">Grab Wallet</option>
            <option value="anywheel">Anywheel</option>
            <option value="kkp711">7-11 (KKP)</option>
            <option value="scbBus">รถเมล์ (SCB)</option>
          </select>
          <input
            type="number"
            placeholder="จำนวนเงิน (บาท)"
            value={topUpInput.amount}
            onChange={(e) =>
              setTopUpInput({ ...topUpInput, amount: e.target.value })
            }
            style={{
              padding: '6px',
              width: '120px',
              borderRadius: '4px',
              border: '1px solid #ccc',
            }}
          />
          <button
            onClick={() => {
              handleTopUp(topUpInput.walletKey, topUpInput.amount);
              setTopUpInput({ ...topUpInput, amount: '' });
            }}
            style={{
              padding: '6px 12px',
              background: '#1976d2',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            บวกยอดเติมเงิน
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px',
        }}
      >
        {/* 3. DAILY BUDGET SECTION */}
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          }}
        >
          <h3 style={{ margin: '0 0 8px 0' }}>📅 บัญชีเงินรายวัน</h3>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <button
              onClick={() => setDailyBudget(200)}
              style={{
                flex: 1,
                padding: '8px',
                border:
                  dailyBudget === 200 ? '2px solid #1976d2' : '1px solid #ccc',
                borderRadius: '6px',
                background: dailyBudget === 200 ? '#e3f2fd' : '#fff',
              }}
            >
              วันมหาลัย (+200)
            </button>
            <button
              onClick={() => setDailyBudget(100)}
              style={{
                flex: 1,
                padding: '8px',
                border:
                  dailyBudget === 100 ? '2px solid #1976d2' : '1px solid #ccc',
                borderRadius: '6px',
                background: dailyBudget === 100 ? '#e3f2fd' : '#fff',
              }}
            >
              วันทำงาน (+100)
            </button>
          </div>

          <div
            style={{
              background: '#f5f5f5',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px',
            }}
          >
            <div>งบวันนี้: {dailyBudget} บาท</div>
            <div
              style={{
                fontSize: '18px',
                fontWeight: 'bold',
                color: dailyBalance >= 0 ? '#2e7d32' : '#d32f2f',
                marginTop: '4px',
              }}
            >
              คงเหลือใช้ได้วันนี้: {dailyBalance} บาท
            </div>
          </div>

          <h4 style={{ margin: '0 0 8px 0' }}>รายการวันนี้:</h4>
          {dailyLogs.map((log) => (
            <div
              key={log.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px',
                marginBottom: '6px',
                borderRadius: '6px',
                backgroundColor: log.isWasteful ? '#ffebee' : '#fafafa',
                borderLeft: log.isWasteful
                  ? '4px solid #d32f2f'
                  : '1px solid #eee',
              }}
            >
              <div>
                <strong>[{log.category}]</strong> {log.note}
                {log.wallet !== 'cash' && (
                  <span
                    style={{
                      fontSize: '11px',
                      color: '#666',
                      display: 'block',
                    }}
                  >
                    จ่ายผ่าน: {log.wallet}
                  </span>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontWeight: 'bold' }}>-{log.amount} บ.</span>
                {log.isWasteful && (
                  <div style={{ color: '#d32f2f', fontSize: '11px' }}>
                    🚩 ฟุ่มเฟือย
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 4. MONTHLY BUDGET & SHOPEE HUB */}
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          }}
        >
          <h3 style={{ margin: '0 0 8px 0' }}>💳 บัญชีเงินเดือน</h3>
          <p style={{ color: '#666', marginTop: 0 }}>
            เงินเดือนเข้าเดือนนี้: 18,000 บาท
          </p>

          <div
            style={{
              border: '1px dashed #ff5722',
              background: '#fffbe6',
              padding: '12px',
              borderRadius: '8px',
              marginBottom: '16px',
            }}
          >
            <h4 style={{ margin: '0 0 8px 0', color: '#e65100' }}>
              🛍️ ผ่อน Shopee (หักเข้าเงินเดือน)
            </h4>
            <div
              style={{
                fontSize: '14px',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>หูฟังไร้สาย (ผ่อน 6 งวด)</span>
              <strong>539 บ./เดือน</strong>
            </div>
          </div>

          <h4 style={{ margin: '0 0 8px 0' }}>รายการชำระเดือนนี้:</h4>
          {monthlyLogs.map((log) => (
            <div
              key={log.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                borderBottom: '1px solid #eee',
              }}
            >
              <div>
                <strong>{log.title}</strong>
                {log.isBorrowed && (
                  <div
                    style={{
                      fontSize: '12px',
                      color: log.isRepaid ? '#2e7d32' : '#ed6c02',
                    }}
                  >
                    {log.isRepaid
                      ? '✓ คืนเงินตัวเองแล้ว'
                      : '⚠️ ยืมเงินตัวเอง (รอคืน)'}
                  </div>
                )}
              </div>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <span>{log.amount} บ.</span>
                {log.isBorrowed && (
                  <input
                    type="checkbox"
                    checked={log.isRepaid}
                    onChange={() => {
                      setMonthlyLogs(
                        monthlyLogs.map((item) =>
                          item.id === log.id
                            ? { ...item, isRepaid: !item.isRepaid }
                            : item
                        )
                      );
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
