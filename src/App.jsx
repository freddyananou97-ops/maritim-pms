import { useState, useEffect, useCallback } from "react";

// ============ CONFIG ============
const ROLES = {
  admin: { label: "Admin", icon: "👑", modules: ["dashboard","rooms","guests","spa","restaurant","roomservice","housekeeping","maintenance","billing","reports"] },
  reception: { label: "Rezeption", icon: "🛎️", modules: ["dashboard","rooms","guests","spa","restaurant","roomservice","billing"] },
  housekeeping: { label: "Housekeeping", icon: "🧹", modules: ["housekeeping"] },
  maintenance: { label: "Technik", icon: "🔧", modules: ["maintenance"] },
  kitchen: { label: "Küche", icon: "👨‍🍳", modules: ["roomservice"] },
  restaurant_staff: { label: "Restaurant", icon: "🍽️", modules: ["restaurant"] },
  spa_staff: { label: "SPA", icon: "🧖", modules: ["spa"] },
};

const ROOM_TYPES = { standard_single: "Standard EZ", standard_double: "Standard DZ", superior_double: "Superior DZ", junior_suite: "Junior Suite", suite: "Suite", penthouse: "Penthouse" };
const ROOM_STATUS_COLORS = { free: "#22c55e", occupied: "#ef4444", checkout_today: "#f59e0b", checkin_today: "#3b82f6", cleaning: "#eab308", out_of_order: "#6b7280" };
const ROOM_STATUS_LABELS = { free: "Frei", occupied: "Belegt", checkout_today: "Check-out", checkin_today: "Check-in", cleaning: "Reinigung", out_of_order: "Außer Betrieb" };

const TREATMENTS = [
  { id: 1, name: "Ganzkörper-Massage", duration: 60, price: 89, capacity: 2 },
  { id: 2, name: "Hot Stone Massage", duration: 90, price: 119, capacity: 1 },
  { id: 3, name: "Gesichtsbehandlung", duration: 45, price: 69, capacity: 2 },
  { id: 4, name: "Aromatherapie", duration: 60, price: 79, capacity: 1 },
  { id: 5, name: "Rücken-Massage", duration: 30, price: 49, capacity: 3 },
  { id: 6, name: "Maniküre & Pediküre", duration: 75, price: 59, capacity: 2 },
];

const TABLES = [
  { id: 1, name: "T1", seats: 2, x: 8, y: 12, shape: "round", location: "Fenster" },
  { id: 2, name: "T2", seats: 2, x: 25, y: 12, shape: "round", location: "Fenster" },
  { id: 3, name: "T3", seats: 4, x: 50, y: 8, shape: "rect", location: "Mitte" },
  { id: 4, name: "T4", seats: 4, x: 75, y: 8, shape: "rect", location: "Mitte" },
  { id: 5, name: "T5", seats: 6, x: 8, y: 42, shape: "rect", location: "Innen" },
  { id: 6, name: "T6", seats: 6, x: 35, y: 42, shape: "rect", location: "Innen" },
  { id: 7, name: "T7", seats: 8, x: 65, y: 42, shape: "rect", location: "Innen" },
  { id: 8, name: "T8", seats: 2, x: 12, y: 72, shape: "round", location: "Terrasse" },
  { id: 9, name: "T9", seats: 2, x: 35, y: 72, shape: "round", location: "Terrasse" },
  { id: 10, name: "T10", seats: 4, x: 60, y: 72, shape: "rect", location: "Terrasse" },
];

const MENU_ITEMS = [
  { id: 1, name: "Caesar Salad", price: 12, cat: "Vorspeise" },
  { id: 2, name: "Tomatensuppe", price: 9, cat: "Vorspeise" },
  { id: 3, name: "Burger Classic", price: 18, cat: "Hauptgericht" },
  { id: 4, name: "Wiener Schnitzel", price: 22, cat: "Hauptgericht" },
  { id: 5, name: "Pasta Carbonara", price: 15, cat: "Hauptgericht" },
  { id: 6, name: "Gegrillter Lachs", price: 24, cat: "Hauptgericht" },
  { id: 7, name: "Tiramisu", price: 9, cat: "Dessert" },
  { id: 8, name: "Bier (0,5l)", price: 6, cat: "Getränk" },
  { id: 9, name: "Cola", price: 4, cat: "Getränk" },
];

const today = () => new Date().toISOString().split("T")[0];
const fmtDate = d => new Date(d).toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"});
const fmtTime = () => new Date().toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"});
const SPA_TIMES = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00"];
const REST_TIMES = ["12:00","12:30","13:00","13:30","14:00","18:00","18:30","19:00","19:30","20:00","20:30","21:00","21:30"];

// ============ INITIAL DATA ============
const INIT_ROOMS = [
  { number: "101", floor: 1, type: "standard_single", status: "free", guestId: null, price: 95 },
  { number: "102", floor: 1, type: "standard_single", status: "occupied", guestId: 1, price: 95 },
  { number: "201", floor: 2, type: "standard_double", status: "occupied", guestId: 2, price: 125 },
  { number: "202", floor: 2, type: "standard_double", status: "free", price: 125 },
  { number: "203", floor: 2, type: "standard_double", status: "cleaning", guestId: null, price: 125 },
  { number: "301", floor: 3, type: "superior_double", status: "occupied", guestId: 3, price: 165 },
  { number: "302", floor: 3, type: "superior_double", status: "checkout_today", guestId: 4, price: 165 },
  { number: "312", floor: 3, type: "superior_double", status: "occupied", guestId: 5, price: 165 },
  { number: "401", floor: 4, type: "junior_suite", status: "free", price: 220 },
  { number: "402", floor: 4, type: "junior_suite", status: "checkin_today", guestId: null, price: 220 },
  { number: "501", floor: 5, type: "suite", status: "occupied", guestId: 6, price: 310 },
  { number: "601", floor: 6, type: "penthouse", status: "free", price: 450 },
];

const INIT_GUESTS = [
  { id: 1, name: "Anna Schmidt", room: "102", phone: "+49176123456", language: "german", checkin: "04.03.2026", checkout: "07.03.2026", vip: false, email: "anna@email.de" },
  { id: 2, name: "Lars Schwingeler", room: "201", phone: "+49176234567", language: "german", checkin: "05.03.2026", checkout: "08.03.2026", vip: false, email: "lars@email.de" },
  { id: 3, name: "Pierre Dumont", room: "301", phone: "+33612345678", language: "french", checkin: "03.03.2026", checkout: "09.03.2026", vip: true, email: "pierre@email.fr" },
  { id: 4, name: "Janine Kügel", room: "302", phone: "+49175940765", language: "german", checkin: "02.03.2026", checkout: "06.03.2026", vip: false, email: "janine@email.de" },
  { id: 5, name: "Juan Diablo", room: "312", phone: "+49176324239", language: "english", checkin: "01.03.2026", checkout: "04.03.2026", vip: true, email: "juan@email.com" },
  { id: 6, name: "Yuki Tanaka", room: "501", phone: "+81901234567", language: "japanese", checkin: "04.03.2026", checkout: "10.03.2026", vip: true, email: "yuki@email.jp" },
];

// ============ STYLES ============
const C = { bg:"#06080d", bg2:"#0c1017", card:"#111620", cardH:"#171d2a", border:"#1c2333", accent:"#c9a84c", accentD:"#a68a3a", accentG:"rgba(201,168,76,0.1)", text:"#e8ecf2", dim:"#5a6478", ok:"#22c55e", err:"#ef4444", warn:"#f59e0b", info:"#3b82f6", spa:"#a78bfa", rest:"#f472b6" };

const btn = (bg, color="#fff") => ({ padding:"8px 18px", borderRadius:8, border:"none", background:bg, color, fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s" });
const input = { width:"100%", padding:"9px 13px", borderRadius:8, border:`1px solid ${C.border}`, background:C.bg2, color:C.text, fontSize:13, fontFamily:"inherit", marginBottom:14, outline:"none" };
const label = { fontSize:11, color:C.dim, display:"block", marginBottom:3, textTransform:"uppercase", letterSpacing:"0.06em", fontWeight:600 };
const badge = (color) => ({ display:"inline-block", padding:"2px 10px", borderRadius:20, fontSize:11, fontWeight:600, background:color+"18", color, border:`1px solid ${color}33` });

// ============ MAIN APP ============
export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [rooms, setRooms] = useState(INIT_ROOMS);
  const [guests] = useState(INIT_GUESTS);
  const [spaBooks, setSpaBooks] = useState([
    { id: 1, guestId: 5, treatId: 1, date: today(), time: "10:00", status: "confirmed" },
    { id: 2, guestId: 3, treatId: 3, date: today(), time: "14:00", status: "confirmed" },
    { id: 3, guestId: 6, treatId: 2, date: today(), time: "16:00", status: "confirmed" },
  ]);
  const [restBooks, setRestBooks] = useState([
    { id: 1, guestId: 2, tableId: 3, date: today(), time: "19:00", persons: 3, status: "confirmed", notes: "Fensterplatz" },
    { id: 2, guestId: 5, tableId: 1, date: today(), time: "20:00", persons: 2, status: "confirmed", notes: "" },
    { id: 3, guestId: 6, tableId: 7, date: today(), time: "19:30", persons: 4, status: "confirmed", notes: "VIP, Geburtstag" },
  ]);
  const [rsOrders, setRsOrders] = useState([
    { id: 1, guestId: 5, room: "312", items: [{name:"Burger Classic",qty:1,price:18},{name:"Cola",qty:1,price:4}], total: 27, status: "preparing", time: "20:15", minutes: null },
    { id: 2, guestId: 6, room: "501", items: [{name:"Gegrillter Lachs",qty:1,price:24},{name:"Tiramisu",qty:1,price:9}], total: 38, status: "ordered", time: "20:30", minutes: null },
  ]);
  const [hkTasks, setHkTasks] = useState([
    { id: 1, room: "312", request: "3 fresh towels", status: "open", priority: "normal", image: null, created: "20:10" },
    { id: 2, room: "203", request: "Full room cleaning", status: "in_progress", priority: "urgent", image: null, created: "18:30" },
    { id: 3, room: "301", request: "Extra pillows (2x)", status: "open", priority: "normal", image: null, created: "20:45" },
  ]);
  const [mtTasks, setMtTasks] = useState([
    { id: 1, room: "312", problem: "Broken shower head", location: "Bathroom", status: "open", priority: "urgent", image: "https://i.ibb.co/example.jpg", created: "19:55" },
    { id: 2, room: "201", problem: "AC making noise", location: "Room", status: "in_progress", priority: "normal", image: null, created: "14:20" },
  ]);
  const [selDate, setSelDate] = useState(today());
  const [modal, setModal] = useState(null);
  const [notif, setNotif] = useState(null);

  const notify = (msg, type="ok") => { setNotif({msg,type}); setTimeout(()=>setNotif(null),3000); };

  if (!user) return <LoginScreen onLogin={(role) => { setUser(role); setTab(ROLES[role].modules[0]); }} />;

  const mods = ROLES[user].modules;
  const NAV = [
    { id:"dashboard", icon:"📊", label:"Dashboard" },
    { id:"rooms", icon:"🏨", label:"Zimmer" },
    { id:"guests", icon:"👥", label:"Gäste" },
    { id:"spa", icon:"🧖", label:"SPA" },
    { id:"restaurant", icon:"🍽️", label:"Restaurant" },
    { id:"roomservice", icon:"🍔", label:"Room Service" },
    { id:"housekeeping", icon:"🧹", label:"Housekeeping" },
    { id:"maintenance", icon:"🔧", label:"Technik" },
    { id:"billing", icon:"💳", label:"Rechnungen" },
    { id:"reports", icon:"📈", label:"Berichte" },
  ].filter(n => mods.includes(n.id));

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'DM Sans',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Cormorant+Garamond:wght@400;500;600;700&display=swap" rel="stylesheet" />
      
      {notif && <div style={{ position:"fixed",top:16,right:16,zIndex:9999,padding:"12px 22px",borderRadius:10, background:notif.type==="ok"?C.ok:notif.type==="err"?C.err:C.warn, color:"#fff",fontWeight:600,fontSize:13,boxShadow:"0 8px 32px rgba(0,0,0,0.5)",animation:"slideIn .25s ease" }}>{notif.msg}</div>}
      
      {/* Sidebar */}
      <aside style={{ width:220, background:C.bg2, borderRight:`1px solid ${C.border}`, display:"flex", flexDirection:"column", flexShrink:0 }}>
        <div style={{ padding:"20px 16px", borderBottom:`1px solid ${C.border}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36,height:36,borderRadius:9,background:`linear-gradient(135deg,${C.accent},${C.accentD})`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:16,color:C.bg }}>M</div>
            <div>
              <p style={{ margin:0,fontFamily:"'Cormorant Garamond',serif",fontSize:17,fontWeight:700 }}>Maritim</p>
              <p style={{ margin:0,fontSize:9,color:C.dim,textTransform:"uppercase",letterSpacing:"0.12em" }}>Ingolstadt</p>
            </div>
          </div>
        </div>
        <nav style={{ flex:1,padding:"12px 8px" }}>
          {NAV.map(n => (
            <button key={n.id} onClick={()=>setTab(n.id)} style={{ display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 12px",borderRadius:8,border:"none",cursor:"pointer",fontSize:13,fontWeight:tab===n.id?600:400,background:tab===n.id?C.accentG:"transparent",color:tab===n.id?C.accent:C.dim,textAlign:"left",fontFamily:"inherit",marginBottom:2,transition:"all .15s" }}>
              <span style={{fontSize:16}}>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
        <div style={{ padding:16, borderTop:`1px solid ${C.border}` }}>
          <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:8 }}>
            <span style={{fontSize:18}}>{ROLES[user].icon}</span>
            <div>
              <p style={{ margin:0,fontSize:12,fontWeight:600 }}>{ROLES[user].label}</p>
              <p style={{ margin:0,fontSize:10,color:C.dim }}>Eingeloggt</p>
            </div>
          </div>
          <button onClick={()=>setUser(null)} style={{ ...btn("transparent",C.dim), width:"100%",border:`1px solid ${C.border}`,fontSize:11,padding:"6px 12px" }}>Ausloggen</button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex:1, padding:"24px 28px", overflowY:"auto", maxHeight:"100vh" }}>
        {tab==="dashboard" && <Dashboard guests={guests} rooms={rooms} spaBooks={spaBooks.filter(b=>b.date===today()&&b.status==="confirmed")} restBooks={restBooks.filter(b=>b.date===today()&&b.status==="confirmed")} rsOrders={rsOrders} hkTasks={hkTasks} mtTasks={mtTasks} />}
        {tab==="rooms" && <Rooms rooms={rooms} guests={guests} setRooms={setRooms} notify={notify} />}
        {tab==="guests" && <Guests guests={guests} role={user} />}
        {tab==="spa" && <SPA guests={guests} bookings={spaBooks} setBookings={setSpaBooks} selDate={selDate} setSelDate={setSelDate} notify={notify} setModal={setModal} />}
        {tab==="restaurant" && <Restaurant guests={guests} bookings={restBooks} setBookings={setRestBooks} selDate={selDate} setSelDate={setSelDate} notify={notify} setModal={setModal} />}
        {tab==="roomservice" && <RoomService orders={rsOrders} setOrders={setRsOrders} guests={guests} notify={notify} role={user} />}
        {tab==="housekeeping" && <Housekeeping tasks={hkTasks} setTasks={setHkTasks} notify={notify} />}
        {tab==="maintenance" && <Maintenance tasks={mtTasks} setTasks={setMtTasks} notify={notify} />}
        {tab==="billing" && <Billing guests={guests} spaBooks={spaBooks} restBooks={restBooks} rsOrders={rsOrders} rooms={rooms} />}
        {tab==="reports" && <Reports guests={guests} rooms={rooms} spaBooks={spaBooks} restBooks={restBooks} rsOrders={rsOrders} hkTasks={hkTasks} />}
      </main>

      {modal==="spa" && <Modal t="SPA-Termin buchen" onClose={()=>setModal(null)}><SPAForm guests={guests} bookings={spaBooks} date={selDate} onSubmit={b=>{setSpaBooks(p=>[...p,{...b,id:Date.now(),status:"confirmed"}]);notify("SPA-Termin gebucht!");setModal(null);}} /></Modal>}
      {modal==="rest" && <Modal t="Reservierung erstellen" onClose={()=>setModal(null)}><RestForm guests={guests} bookings={restBooks} date={selDate} onSubmit={b=>{setRestBooks(p=>[...p,{...b,id:Date.now(),status:"confirmed"}]);notify("Reservierung erstellt!");setModal(null);}} /></Modal>}

      <style>{`@keyframes slideIn{from{transform:translateX(80px);opacity:0}to{transform:translateX(0);opacity:1}}@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}*{box-sizing:border-box}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:${C.bg}}::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}`}</style>
    </div>
  );
}

// ============ LOGIN ============
function LoginScreen({ onLogin }) {
  const [hover, setHover] = useState(null);
  return (
    <div style={{ minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:`radial-gradient(ellipse at 30% 20%, #12161f 0%, #06080d 70%)`,fontFamily:"'DM Sans',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Cormorant+Garamond:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <div style={{ textAlign:"center",animation:"fadeIn .6s ease" }}>
        <div style={{ width:64,height:64,borderRadius:16,background:`linear-gradient(135deg,#c9a84c,#a68a3a)`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 20px",fontSize:28,fontWeight:700,color:"#06080d" }}>M</div>
        <h1 style={{ fontFamily:"'Cormorant Garamond',serif",fontSize:36,fontWeight:700,color:"#e8ecf2",margin:"0 0 4px" }}>Maritim Hotel</h1>
        <p style={{ color:"#5a6478",fontSize:13,margin:"0 0 40px",textTransform:"uppercase",letterSpacing:"0.15em" }}>Property Management System</p>
        <p style={{ color:"#5a6478",fontSize:13,marginBottom:20 }}>Einloggen als:</p>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,maxWidth:600 }}>
          {Object.entries(ROLES).map(([key,r]) => (
            <button key={key} onClick={()=>onLogin(key)} onMouseEnter={()=>setHover(key)} onMouseLeave={()=>setHover(null)}
              style={{ padding:"18px 8px",borderRadius:12,border:`1px solid ${hover===key?"#c9a84c33":"#1c2333"}`,background:hover===key?"rgba(201,168,76,0.06)":"#111620",cursor:"pointer",textAlign:"center",transition:"all .2s",fontFamily:"inherit" }}>
              <span style={{fontSize:28,display:"block",marginBottom:6}}>{r.icon}</span>
              <span style={{fontSize:12,fontWeight:600,color:hover===key?"#c9a84c":"#e8ecf2"}}>{r.label}</span>
            </button>
          ))}
        </div>
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}

// ============ DASHBOARD ============
function Dashboard({ guests, rooms, spaBooks, restBooks, rsOrders, hkTasks, mtTasks }) {
  const occupied = rooms.filter(r=>r.status==="occupied").length;
  const stats = [
    { l:"Belegung",v:`${occupied}/${rooms.length}`,sub:`${Math.round(occupied/rooms.length*100)}%`,c:C.accent,icon:"🏨" },
    { l:"Check-in heute",v:rooms.filter(r=>r.status==="checkin_today").length,sub:"Zimmer",c:C.info,icon:"📥" },
    { l:"Check-out heute",v:rooms.filter(r=>r.status==="checkout_today").length,sub:"Zimmer",c:C.warn,icon:"📤" },
    { l:"SPA Termine",v:spaBooks.length,sub:"heute",c:C.spa,icon:"🧖" },
    { l:"Reservierungen",v:restBooks.length,sub:"heute",c:C.rest,icon:"🍽️" },
    { l:"Room Service",v:rsOrders.filter(o=>o.status!=="delivered").length,sub:"aktiv",c:C.warn,icon:"🍔" },
    { l:"Housekeeping",v:hkTasks.filter(t=>t.status!=="completed").length,sub:"offen",c:C.ok,icon:"🧹" },
    { l:"Maintenance",v:mtTasks.filter(t=>t.status!=="completed").length,sub:"offen",c:C.err,icon:"🔧" },
  ];
  return (
    <div style={{animation:"fadeIn .35s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:20}}>
        <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:700,margin:0}}>Dashboard</h2>
        <span style={{color:C.dim,fontSize:13}}>{fmtDate(today())} · {fmtTime()}</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24}}>
        {stats.map((s,i)=>(
          <div key={i} style={{background:C.card,borderRadius:14,padding:"18px 20px",border:`1px solid ${C.border}`,position:"relative",overflow:"hidden"}}>
            <div style={{position:"absolute",top:-8,right:-6,fontSize:40,opacity:0.06}}>{s.icon}</div>
            <p style={{color:C.dim,fontSize:10,textTransform:"uppercase",letterSpacing:"0.08em",margin:"0 0 6px",fontWeight:600}}>{s.l}</p>
            <p style={{fontSize:26,fontWeight:700,margin:"0 0 2px",color:s.c}}>{s.v}</p>
            <p style={{fontSize:11,color:C.dim,margin:0}}>{s.sub}</p>
          </div>
        ))}
      </div>
      {/* Room Overview */}
      <div style={{background:C.card,borderRadius:14,padding:20,border:`1px solid ${C.border}`,marginBottom:16}}>
        <h3 style={{fontSize:15,fontWeight:600,margin:"0 0 14px"}}>Zimmerübersicht</h3>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {rooms.map(r=>(
            <div key={r.number} style={{width:56,height:44,borderRadius:8,background:ROOM_STATUS_COLORS[r.status]+"18",border:`1px solid ${ROOM_STATUS_COLORS[r.status]}44`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}} title={`${r.number} — ${ROOM_STATUS_LABELS[r.status]}`}>
              <span style={{fontSize:12,fontWeight:700,color:ROOM_STATUS_COLORS[r.status]}}>{r.number}</span>
              <span style={{fontSize:7,color:C.dim}}>{ROOM_STATUS_LABELS[r.status]}</span>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:14,marginTop:12}}>
          {Object.entries(ROOM_STATUS_LABELS).map(([k,v])=>(<span key={k} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:C.dim}}><span style={{width:8,height:8,borderRadius:"50%",background:ROOM_STATUS_COLORS[k]}}></span>{v}</span>))}
        </div>
      </div>
    </div>
  );
}

// ============ ROOMS ============
function Rooms({ rooms, guests, setRooms, notify }) {
  const [filter, setFilter] = useState("all");
  const filtered = filter==="all"?rooms:rooms.filter(r=>r.status===filter);
  const changeStatus = (num,status) => { setRooms(p=>p.map(r=>r.number===num?{...r,status}:r)); notify("Zimmerstatus geändert"); };
  return (
    <div style={{animation:"fadeIn .35s ease"}}>
      <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:700,margin:"0 0 20px"}}>Zimmerverwaltung</h2>
      <div style={{display:"flex",gap:6,marginBottom:18}}>
        {[["all","Alle"],["free","Frei"],["occupied","Belegt"],["checkout_today","Check-out"],["cleaning","Reinigung"]].map(([k,v])=>(
          <button key={k} onClick={()=>setFilter(k)} style={{padding:"6px 14px",borderRadius:6,border:`1px solid ${filter===k?C.accent:C.border}`,background:filter===k?C.accentG:"transparent",color:filter===k?C.accent:C.dim,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>{v}</button>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
        {filtered.map(r=>{
          const g = guests.find(g=>g.id===r.guestId);
          return (
            <div key={r.number} style={{background:C.card,borderRadius:12,padding:18,border:`1px solid ${C.border}`,borderLeft:`3px solid ${ROOM_STATUS_COLORS[r.status]}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <span style={{fontSize:20,fontWeight:700,color:C.accent}}>{r.number}</span>
                <span style={badge(ROOM_STATUS_COLORS[r.status])}>{ROOM_STATUS_LABELS[r.status]}</span>
              </div>
              <p style={{fontSize:12,color:C.dim,margin:"0 0 4px"}}>{ROOM_TYPES[r.type]} · Etage {r.floor} · {r.price}€/Nacht</p>
              {g && <p style={{fontSize:13,fontWeight:500,margin:"6px 0 0"}}>{g.name} {g.vip?"⭐":""}</p>}
              <div style={{display:"flex",gap:4,marginTop:10}}>
                {r.status==="free"&&<button onClick={()=>changeStatus(r.number,"occupied")} style={{...btn(C.ok+"22",C.ok),padding:"4px 10px",fontSize:11}}>Check-in</button>}
                {r.status==="occupied"&&<button onClick={()=>changeStatus(r.number,"checkout_today")} style={{...btn(C.warn+"22",C.warn),padding:"4px 10px",fontSize:11}}>Check-out</button>}
                {r.status==="checkout_today"&&<button onClick={()=>changeStatus(r.number,"cleaning")} style={{...btn(C.warn+"22",C.warn),padding:"4px 10px",fontSize:11}}>Reinigung</button>}
                {r.status==="cleaning"&&<button onClick={()=>changeStatus(r.number,"free")} style={{...btn(C.ok+"22",C.ok),padding:"4px 10px",fontSize:11}}>Freigeben</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============ GUESTS ============
function Guests({ guests, role }) {
  const showPhone = ["admin","reception"].includes(role);
  return (
    <div style={{animation:"fadeIn .35s ease"}}>
      <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:700,margin:"0 0 20px"}}>Gästeliste</h2>
      <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,overflow:"hidden"}}>
        <div style={{display:"grid",gridTemplateColumns:showPhone?"1fr 70px 150px 80px 100px 100px":"1fr 70px 80px 100px 100px",padding:"10px 20px",borderBottom:`1px solid ${C.border}`,fontSize:10,color:C.dim,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:600}}>
          <span>Name</span><span>Zimmer</span>{showPhone&&<span>Telefon</span>}<span>Sprache</span><span>Check-in</span><span>Check-out</span>
        </div>
        {guests.map(g=>(
          <div key={g.id} style={{display:"grid",gridTemplateColumns:showPhone?"1fr 70px 150px 80px 100px 100px":"1fr 70px 80px 100px 100px",padding:"12px 20px",borderBottom:`1px solid ${C.border}`,fontSize:13,alignItems:"center"}}>
            <span style={{fontWeight:500}}>{g.name} {g.vip?<span style={{color:C.accent,fontSize:10}}>⭐ VIP</span>:""}</span>
            <span style={{color:C.accent,fontWeight:600}}>{g.room}</span>
            {showPhone&&<span style={{color:C.dim,fontSize:11}}>{g.phone}</span>}
            <span style={{fontSize:11}}>{g.language}</span>
            <span style={{fontSize:11}}>{g.checkin}</span>
            <span style={{fontSize:11}}>{g.checkout}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ SPA ============
function SPA({ guests, bookings, setBookings, selDate, setSelDate, notify, setModal }) {
  const dayBooks = bookings.filter(b=>b.date===selDate&&b.status==="confirmed");
  const cancel = id => { setBookings(p=>p.map(b=>b.id===id?{...b,status:"cancelled"}:b)); notify("Termin storniert","err"); };
  return (
    <div style={{animation:"fadeIn .35s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:700,margin:0}}>SPA & Wellness</h2>
        <button onClick={()=>setModal("spa")} style={btn(`linear-gradient(135deg,${C.spa},#7c3aed)`)}>+ Neuer Termin</button>
      </div>
      <input type="date" value={selDate} onChange={e=>setSelDate(e.target.value)} style={{...input,width:180,marginBottom:18}} />
      {/* Calendar Grid */}
      <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,overflow:"auto",marginBottom:20}}>
        <div style={{display:"grid",gridTemplateColumns:"80px repeat(6,1fr)",minWidth:800}}>
          <div style={{padding:"10px 8px",fontWeight:600,fontSize:10,color:C.dim,borderBottom:`1px solid ${C.border}`}}>Zeit</div>
          {TREATMENTS.map(t=><div key={t.id} style={{padding:"8px 6px",fontSize:10,color:C.dim,textAlign:"center",borderBottom:`1px solid ${C.border}`,borderLeft:`1px solid ${C.border}`}}>{t.name}<br/><span style={{color:C.spa}}>{t.price}€</span></div>)}
        </div>
        {SPA_TIMES.map(slot=>(
          <div key={slot} style={{display:"grid",gridTemplateColumns:"80px repeat(6,1fr)",minWidth:800}}>
            <div style={{padding:"8px",fontSize:12,color:C.dim,borderBottom:`1px solid ${C.border}`}}>{slot}</div>
            {TREATMENTS.map(t=>{
              const b = dayBooks.find(b=>b.time===slot&&b.treatId===t.id);
              const g = b?guests.find(g=>g.id===b.guestId):null;
              return <div key={t.id} style={{padding:3,borderLeft:`1px solid ${C.border}`,borderBottom:`1px solid ${C.border}`,minHeight:36,display:"flex",alignItems:"center",justifyContent:"center"}}>
                {b?<div onClick={()=>cancel(b.id)} style={{background:C.spa+"18",border:`1px solid ${C.spa}33`,borderRadius:6,padding:"3px 6px",fontSize:10,color:C.spa,cursor:"pointer",textAlign:"center",width:"100%"}} title="Stornieren"><b>{g?.name?.split(" ")[0]}</b></div>:null}
              </div>;
            })}
          </div>
        ))}
      </div>
      {/* List */}
      <div style={{background:C.card,borderRadius:14,padding:18,border:`1px solid ${C.border}`}}>
        <h3 style={{fontSize:14,fontWeight:600,margin:"0 0 12px"}}>Termine — {fmtDate(selDate)}</h3>
        {dayBooks.length===0?<p style={{color:C.dim,fontSize:13}}>Keine Termine</p>:dayBooks.map(b=>{
          const g=guests.find(g=>g.id===b.guestId);const t=TREATMENTS.find(t=>t.id===b.treatId);
          return <div key={b.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
            <div style={{display:"flex",gap:12,alignItems:"center"}}><span style={{color:C.accent,fontWeight:600,fontSize:13,minWidth:46}}>{b.time}</span><div><p style={{margin:0,fontWeight:500,fontSize:13}}>{g?.name}</p><p style={{margin:0,color:C.dim,fontSize:11}}>{t?.name} · {t?.duration}min · {t?.price}€</p></div></div>
            <button onClick={()=>cancel(b.id)} style={{...btn(C.err+"18",C.err),padding:"4px 12px",fontSize:11}}>Stornieren</button>
          </div>;
        })}
      </div>
    </div>
  );
}

// ============ RESTAURANT ============
function Restaurant({ guests, bookings, setBookings, selDate, setSelDate, notify, setModal }) {
  const [selTime, setSelTime] = useState("19:00");
  const dayBooks = bookings.filter(b=>b.date===selDate&&b.status==="confirmed");
  const timeBooks = dayBooks.filter(b=>b.time===selTime);
  const bookedIds = timeBooks.map(b=>b.tableId);
  const cancel = id => { setBookings(p=>p.map(b=>b.id===id?{...b,status:"cancelled"}:b)); notify("Storniert","err"); };

  return (
    <div style={{animation:"fadeIn .35s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:700,margin:0}}>Restaurant Weitblick</h2>
        <button onClick={()=>setModal("rest")} style={btn(`linear-gradient(135deg,${C.rest},#be185d)`)}>+ Reservierung</button>
      </div>
      <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap",alignItems:"center"}}>
        <input type="date" value={selDate} onChange={e=>setSelDate(e.target.value)} style={{...input,width:160,marginBottom:0}} />
        <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
          {REST_TIMES.map(t=><button key={t} onClick={()=>setSelTime(t)} style={{padding:"5px 10px",borderRadius:5,border:`1px solid ${t===selTime?C.rest:C.border}`,background:t===selTime?C.rest+"18":"transparent",color:t===selTime?C.rest:C.dim,cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>{t}</button>)}
        </div>
      </div>
      {/* Table Map */}
      <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,padding:28,position:"relative",height:420,marginBottom:20}}>
        <span style={{position:"absolute",top:12,left:20,fontSize:10,color:C.dim,textTransform:"uppercase",letterSpacing:"0.08em"}}>Tischplan — {fmtDate(selDate)} {selTime}</span>
        <div style={{position:"absolute",top:10,right:20,display:"flex",gap:12,fontSize:10}}>
          <span style={{display:"flex",alignItems:"center",gap:3}}><span style={{width:8,height:8,borderRadius:"50%",background:C.ok}}></span>Frei</span>
          <span style={{display:"flex",alignItems:"center",gap:3}}><span style={{width:8,height:8,borderRadius:"50%",background:C.err}}></span>Besetzt</span>
        </div>
        {TABLES.map(tb=>{
          const booked=bookedIds.includes(tb.id);const bk=timeBooks.find(b=>b.tableId===tb.id);const g=bk?guests.find(g=>g.id===bk.guestId):null;
          const sz=tb.seats<=2?52:tb.seats<=4?66:tb.seats<=6?80:94;
          return <div key={tb.id} style={{position:"absolute",left:`${tb.x}%`,top:`${tb.y+8}%`,width:sz,height:tb.shape==="round"?sz:sz*.65,borderRadius:tb.shape==="round"?"50%":10,background:booked?C.err+"18":C.ok+"0d",border:`2px solid ${booked?C.err+"55":C.ok+"33"}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:booked?"pointer":"default",transition:"all .2s",fontSize:9}} title={booked?`${g?.name} — ${bk?.persons}P`:""} onClick={()=>booked&&cancel(bk.id)}>
            <span style={{fontWeight:700,fontSize:10,color:booked?C.err:C.ok}}>{tb.name}</span>
            <span style={{color:C.dim,fontSize:8}}>{tb.seats}P · {tb.location}</span>
            {booked&&<span style={{color:C.err,fontSize:8,fontWeight:600,marginTop:1}}>{g?.name?.split(" ")[0]}</span>}
          </div>;
        })}
      </div>
      {/* List */}
      <div style={{background:C.card,borderRadius:14,padding:18,border:`1px solid ${C.border}`}}>
        <h3 style={{fontSize:14,fontWeight:600,margin:"0 0 12px"}}>Reservierungen — {fmtDate(selDate)}</h3>
        {dayBooks.length===0?<p style={{color:C.dim,fontSize:13}}>Keine Reservierungen</p>:dayBooks.map(b=>{
          const g=guests.find(g=>g.id===b.guestId);const tb=TABLES.find(t=>t.id===b.tableId);
          return <div key={b.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.border}`}}>
            <div style={{display:"flex",gap:12,alignItems:"center"}}><span style={{color:C.accent,fontWeight:600,fontSize:13,minWidth:46}}>{b.time}</span><div><p style={{margin:0,fontWeight:500,fontSize:13}}>{g?.name} — {b.persons} Pers.</p><p style={{margin:0,color:C.dim,fontSize:11}}>{tb?.name} ({tb?.seats}P){b.notes?` · ${b.notes}`:""}</p></div></div>
            <button onClick={()=>cancel(b.id)} style={{...btn(C.err+"18",C.err),padding:"4px 12px",fontSize:11}}>Stornieren</button>
          </div>;
        })}
      </div>
    </div>
  );
}

// ============ ROOM SERVICE ============
function RoomService({ orders, setOrders, guests, notify, role }) {
  const statusColors = { ordered:C.err, preparing:C.warn, delivering:C.info, delivered:C.ok };
  const statusLabels = { ordered:"Bestellt", preparing:"In Zubereitung", delivering:"Unterwegs", delivered:"Geliefert" };
  const next = { ordered:"preparing", preparing:"delivering", delivering:"delivered" };
  const advance = (id) => { setOrders(p=>p.map(o=>o.id===id?{...o,status:next[o.status]||o.status}:o)); notify("Status aktualisiert"); };
  const setMin = (id,min) => { setOrders(p=>p.map(o=>o.id===id?{...o,minutes:min}:o)); notify("Zeitangabe gespeichert"); };

  return (
    <div style={{animation:"fadeIn .35s ease"}}>
      <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:700,margin:"0 0 20px"}}>Room Service</h2>
      <div style={{display:"grid",gap:12}}>
        {orders.filter(o=>o.status!=="delivered").map(o=>{
          const g=guests.find(g=>g.id===o.guestId);
          return <div key={o.id} style={{background:C.card,borderRadius:14,padding:18,border:`1px solid ${C.border}`,borderLeft:`3px solid ${statusColors[o.status]}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div><span style={{fontSize:18,fontWeight:700,color:C.accent}}>Zi. {o.room}</span>{role!=="kitchen"&&g&&<span style={{color:C.dim,fontSize:12,marginLeft:8}}>{g.name}</span>}</div>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={badge(statusColors[o.status])}>{statusLabels[o.status]}</span>
                <span style={{color:C.dim,fontSize:11}}>{o.time}</span>
              </div>
            </div>
            <div style={{marginBottom:10}}>
              {o.items.map((it,i)=><p key={i} style={{margin:"2px 0",fontSize:13}}>{it.qty}x {it.name} — {it.price}€</p>)}
              <p style={{margin:"6px 0 0",fontWeight:600,fontSize:13,color:C.accent}}>Total: {o.total}€ (inkl. 5€ Aufpreis)</p>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              {o.status!=="delivered"&&<button onClick={()=>advance(o.id)} style={btn(statusColors[next[o.status]]+"22",statusColors[next[o.status]])}>→ {statusLabels[next[o.status]]}</button>}
              {(o.status==="preparing"||o.status==="ordered")&&<div style={{display:"flex",alignItems:"center",gap:4}}>
                <input type="number" placeholder="Min" style={{...input,width:60,marginBottom:0,padding:"5px 8px"}} onChange={e=>setMin(o.id,e.target.value)} />
                <span style={{fontSize:11,color:C.dim}}>Min</span>
              </div>}
            </div>
          </div>;
        })}
        {orders.filter(o=>o.status!=="delivered").length===0&&<p style={{color:C.dim,textAlign:"center",padding:40}}>Keine offenen Bestellungen 🎉</p>}
      </div>
      {/* Delivered */}
      <h3 style={{fontSize:14,fontWeight:600,margin:"24px 0 12px",color:C.dim}}>Abgeschlossen</h3>
      {orders.filter(o=>o.status==="delivered").map(o=>(
        <div key={o.id} style={{background:C.card,borderRadius:10,padding:12,border:`1px solid ${C.border}`,marginBottom:8,opacity:0.6}}>
          <span style={{fontSize:12}}>Zi. {o.room} — {o.items.map(i=>`${i.qty}x ${i.name}`).join(", ")} — {o.total}€</span>
        </div>
      ))}
    </div>
  );
}

// ============ HOUSEKEEPING ============
function Housekeeping({ tasks, setTasks, notify }) {
  const statusC = { open:C.err, in_progress:C.warn, completed:C.ok };
  const statusL = { open:"Offen", in_progress:"In Bearbeitung", completed:"Erledigt" };
  const next = { open:"in_progress", in_progress:"completed" };
  const advance = id => { setTasks(p=>p.map(t=>t.id===id?{...t,status:next[t.status]||t.status}:t)); notify(next[tasks.find(t=>t.id===id).status]==="completed"?"Auftrag erledigt! ✅":"Status aktualisiert"); };

  return (
    <div style={{animation:"fadeIn .35s ease"}}>
      <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:700,margin:"0 0 20px"}}>Housekeeping</h2>
      <div style={{display:"grid",gap:10}}>
        {tasks.filter(t=>t.status!=="completed").map(t=>(
          <div key={t.id} style={{background:C.card,borderRadius:12,padding:16,border:`1px solid ${C.border}`,borderLeft:`3px solid ${statusC[t.status]}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{fontSize:18,fontWeight:700,color:C.accent}}>Zimmer {t.room}</span>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                {t.priority==="urgent"&&<span style={badge(C.err)}>DRINGEND</span>}
                <span style={badge(statusC[t.status])}>{statusL[t.status]}</span>
              </div>
            </div>
            <p style={{margin:"0 0 10px",fontSize:13}}>{t.request}</p>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:11,color:C.dim}}>Erstellt: {t.created}</span>
              {t.status!=="completed"&&<button onClick={()=>advance(t.id)} style={btn(statusC[next[t.status]]+"22",statusC[next[t.status]])}>{t.status==="open"?"Annehmen":"Erledigt ✓"}</button>}
            </div>
          </div>
        ))}
        {tasks.filter(t=>t.status!=="completed").length===0&&<p style={{color:C.dim,textAlign:"center",padding:40}}>Alle Aufträge erledigt! 🎉</p>}
      </div>
    </div>
  );
}

// ============ MAINTENANCE ============
function Maintenance({ tasks, setTasks, notify }) {
  const statusC = { open:C.err, in_progress:C.warn, completed:C.ok };
  const statusL = { open:"Offen", in_progress:"In Bearbeitung", completed:"Erledigt" };
  const next = { open:"in_progress", in_progress:"completed" };
  const advance = id => { setTasks(p=>p.map(t=>t.id===id?{...t,status:next[t.status]||t.status}:t)); notify(next[tasks.find(t=>t.id===id).status]==="completed"?"Reparatur erledigt! ✅":"Status aktualisiert"); };

  return (
    <div style={{animation:"fadeIn .35s ease"}}>
      <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:700,margin:"0 0 20px"}}>Maintenance</h2>
      <div style={{display:"grid",gap:10}}>
        {tasks.filter(t=>t.status!=="completed").map(t=>(
          <div key={t.id} style={{background:C.card,borderRadius:12,padding:16,border:`1px solid ${C.border}`,borderLeft:`3px solid ${statusC[t.status]}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{fontSize:18,fontWeight:700,color:C.accent}}>Zimmer {t.room}</span>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                {t.priority==="urgent"&&<span style={badge(C.err)}>DRINGEND</span>}
                <span style={badge(statusC[t.status])}>{statusL[t.status]}</span>
              </div>
            </div>
            <p style={{margin:"0 0 4px",fontSize:13,fontWeight:500}}>{t.problem}</p>
            <p style={{margin:"0 0 10px",fontSize:11,color:C.dim}}>Ort: {t.location}</p>
            {t.image&&<p style={{margin:"0 0 10px"}}><a href={t.image} target="_blank" style={{color:C.info,fontSize:12}}>📷 Foto ansehen</a></p>}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontSize:11,color:C.dim}}>Erstellt: {t.created}</span>
              {t.status!=="completed"&&<button onClick={()=>advance(t.id)} style={btn(statusC[next[t.status]]+"22",statusC[next[t.status]])}>{t.status==="open"?"Annehmen":"Erledigt ✓"}</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ BILLING ============
function Billing({ guests, spaBooks, restBooks, rsOrders, rooms }) {
  return (
    <div style={{animation:"fadeIn .35s ease"}}>
      <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:700,margin:"0 0 20px"}}>Rechnungen</h2>
      {guests.map(g=>{
        const room = rooms.find(r=>r.guestId===g.id);
        const spa = spaBooks.filter(b=>b.guestId===g.id&&b.status==="confirmed");
        const rs = rsOrders.filter(o=>o.guestId===g.id);
        const rest = restBooks.filter(b=>b.guestId===g.id&&b.status==="confirmed");
        if(!room)return null;
        const nights = 3;
        const roomTotal = nights * room.price;
        const spaTotal = spa.reduce((s,b)=>s+(TREATMENTS.find(t=>t.id===b.treatId)?.price||0),0);
        const rsTotal = rs.reduce((s,o)=>s+o.total,0);
        const total = roomTotal + spaTotal + rsTotal;
        if(total===0)return null;
        return (
          <div key={g.id} style={{background:C.card,borderRadius:14,padding:20,border:`1px solid ${C.border}`,marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div><span style={{fontSize:16,fontWeight:700}}>{g.name}</span><span style={{color:C.dim,fontSize:12,marginLeft:8}}>Zi. {g.room}</span>{g.vip&&<span style={{color:C.accent,marginLeft:6}}>⭐</span>}</div>
              <span style={badge(C.warn)}>OFFEN</span>
            </div>
            <div style={{fontSize:13}}>
              <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:`1px solid ${C.border}`}}><span>{nights}x Übernachtung ({room.price}€/N)</span><span style={{fontWeight:600}}>{roomTotal}€</span></div>
              {spa.map((b,i)=>{const t=TREATMENTS.find(t=>t.id===b.treatId);return <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:`1px solid ${C.border}`}}><span>SPA: {t?.name}</span><span style={{fontWeight:600}}>{t?.price}€</span></div>;})}
              {rs.map((o,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:`1px solid ${C.border}`}}><span>Room Service: {o.items.map(i=>`${i.qty}x ${i.name}`).join(", ")}</span><span style={{fontWeight:600}}>{o.total}€</span></div>)}
              <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",fontWeight:700,fontSize:15,color:C.accent}}><span>GESAMT</span><span>{total}€</span></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============ REPORTS ============
function Reports({ guests, rooms, spaBooks, restBooks, rsOrders, hkTasks }) {
  const occ = rooms.filter(r=>r.status==="occupied").length;
  const data = [
    { l:"Zimmer-Auslastung", v:`${Math.round(occ/rooms.length*100)}%`, c:C.accent },
    { l:"SPA-Termine (gesamt)", v:spaBooks.filter(b=>b.status==="confirmed").length, c:C.spa },
    { l:"Reservierungen (gesamt)", v:restBooks.filter(b=>b.status==="confirmed").length, c:C.rest },
    { l:"Room Service Umsatz", v:rsOrders.reduce((s,o)=>s+o.total,0)+"€", c:C.warn },
    { l:"SPA Umsatz", v:spaBooks.filter(b=>b.status==="confirmed").reduce((s,b)=>s+(TREATMENTS.find(t=>t.id===b.treatId)?.price||0),0)+"€", c:C.spa },
    { l:"Offene HK-Aufträge", v:hkTasks.filter(t=>t.status!=="completed").length, c:C.ok },
    { l:"Gäste gesamt", v:guests.length, c:C.info },
    { l:"VIP Gäste", v:guests.filter(g=>g.vip).length, c:C.accent },
  ];
  return (
    <div style={{animation:"fadeIn .35s ease"}}>
      <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,fontWeight:700,margin:"0 0 20px"}}>Berichte & Statistiken</h2>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        {data.map((d,i)=>(
          <div key={i} style={{background:C.card,borderRadius:14,padding:20,border:`1px solid ${C.border}`}}>
            <p style={{color:C.dim,fontSize:10,textTransform:"uppercase",letterSpacing:"0.08em",margin:"0 0 8px",fontWeight:600}}>{d.l}</p>
            <p style={{fontSize:28,fontWeight:700,margin:0,color:d.c}}>{d.v}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ MODAL ============
function Modal({ t, onClose, children }) {
  return <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}}>
    <div onClick={e=>e.stopPropagation()} style={{background:C.card,borderRadius:18,border:`1px solid ${C.border}`,padding:28,width:440,maxHeight:"80vh",overflow:"auto",animation:"fadeIn .25s ease"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h3 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:20,fontWeight:700,margin:0}}>{t}</h3>
        <button onClick={onClose} style={{background:"none",border:"none",color:C.dim,fontSize:18,cursor:"pointer"}}>✕</button>
      </div>
      {children}
    </div>
  </div>;
}

// ============ SPA FORM ============
function SPAForm({ guests, bookings, date, onSubmit }) {
  const [gId,setG]=useState("");const [tId,setT]=useState("");const [d,setD]=useState(date);const [time,setTime]=useState("");
  const avail = SPA_TIMES.filter(s=>{if(!tId)return true;const t=TREATMENTS.find(t=>t.id===+tId);return bookings.filter(b=>b.date===d&&b.time===s&&b.treatId===+tId&&b.status==="confirmed").length<(t?.capacity||1);});
  return <div>
    <label style={label}>Gast</label><select value={gId} onChange={e=>setG(e.target.value)} style={input}><option value="">Wählen...</option>{guests.map(g=><option key={g.id} value={g.id}>{g.name} — Zi. {g.room}</option>)}</select>
    <label style={label}>Behandlung</label><select value={tId} onChange={e=>setT(e.target.value)} style={input}><option value="">Wählen...</option>{TREATMENTS.map(t=><option key={t.id} value={t.id}>{t.name} — {t.price}€</option>)}</select>
    <label style={label}>Datum</label><input type="date" value={d} onChange={e=>setD(e.target.value)} style={input} />
    <label style={label}>Uhrzeit</label><select value={time} onChange={e=>setTime(e.target.value)} style={input}><option value="">Wählen...</option>{avail.map(s=><option key={s} value={s}>{s}</option>)}</select>
    <button onClick={()=>gId&&tId&&d&&time&&onSubmit({guestId:+gId,treatId:+tId,date:d,time})} disabled={!gId||!tId||!d||!time} style={{...btn(!gId||!tId||!d||!time?C.border:`linear-gradient(135deg,${C.spa},#7c3aed)`),width:"100%",marginTop:6}}>Termin buchen</button>
  </div>;
}

// ============ RESTAURANT FORM ============
function RestForm({ guests, bookings, date, onSubmit }) {
  const [gId,setG]=useState("");const [d,setD]=useState(date);const [time,setTime]=useState("");const [pers,setPers]=useState(2);const [tbl,setTbl]=useState("");const [notes,setNotes]=useState("");
  const booked = bookings.filter(b=>b.date===d&&b.time===time&&b.status==="confirmed").map(b=>b.tableId);
  const avail = TABLES.filter(t=>!booked.includes(t.id)&&t.seats>=pers);
  return <div>
    <label style={label}>Gast</label><select value={gId} onChange={e=>setG(e.target.value)} style={input}><option value="">Wählen...</option>{guests.map(g=><option key={g.id} value={g.id}>{g.name} — Zi. {g.room}</option>)}</select>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      <div><label style={label}>Datum</label><input type="date" value={d} onChange={e=>setD(e.target.value)} style={input} /></div>
      <div><label style={label}>Personen</label><input type="number" value={pers} onChange={e=>setPers(+e.target.value)} min={1} max={10} style={input} /></div>
    </div>
    <label style={label}>Uhrzeit</label><select value={time} onChange={e=>setTime(e.target.value)} style={input}><option value="">Wählen...</option>{REST_TIMES.map(t=><option key={t} value={t}>{t}</option>)}</select>
    <label style={label}>Tisch {time?`(${avail.length} frei)`:""}</label><select value={tbl} onChange={e=>setTbl(e.target.value)} style={input}><option value="">Wählen...</option>{avail.map(t=><option key={t.id} value={t.id}>{t.name} — {t.seats}P ({t.location})</option>)}</select>
    <label style={label}>Sonderwünsche</label><input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Fensterplatz, Geburtstag..." style={input} />
    <button onClick={()=>gId&&tbl&&d&&time&&onSubmit({guestId:+gId,tableId:+tbl,date:d,time,persons:pers,notes})} disabled={!gId||!tbl||!d||!time} style={{...btn(!gId||!tbl||!d||!time?C.border:`linear-gradient(135deg,${C.rest},#be185d)`),width:"100%",marginTop:6}}>Reservierung erstellen</button>
  </div>;
}
