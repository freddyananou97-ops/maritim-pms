import { useState, useEffect, useRef } from "react";

// ============ CONFIG ============
const ROLES = {
  admin: { label: "Admin", icon: "👑", modules: ["dashboard","rooms","guests","spa","restaurant","roomservice","housekeeping","maintenance","taxi","billing","reports"] },
  reception: { label: "Rezeption", icon: "🛎️", modules: ["dashboard","rooms","guests","spa","restaurant","roomservice","taxi","billing"] },
  housekeeping: { label: "Housekeeping", icon: "🧹", modules: ["housekeeping"] },
  maintenance: { label: "Technik", icon: "🔧", modules: ["maintenance"] },
  kitchen: { label: "Küche", icon: "👨‍🍳", modules: ["roomservice"] },
  restaurant_staff: { label: "Restaurant", icon: "🍽️", modules: ["restaurant"] },
  spa_staff: { label: "SPA", icon: "🧖", modules: ["spa"] },
};

const ROOM_TYPES = { standard_single:"Standard EZ", standard_double:"Standard DZ", superior_double:"Superior DZ", junior_suite:"Junior Suite", suite:"Suite", penthouse:"Penthouse" };
const ROOM_STATUS_COLORS = { free:"#16a34a", occupied:"#dc2626", checkout_today:"#d97706", checkin_today:"#2563eb", cleaning:"#ca8a04", out_of_order:"#6b7280" };
const ROOM_STATUS_LABELS = { free:"Frei", occupied:"Belegt", checkout_today:"Check-out", checkin_today:"Check-in", cleaning:"Reinigung", out_of_order:"Außer Betrieb" };

const TREATMENTS = [
  { id:1, name:"Ganzkörper-Massage", duration:60, price:89, capacity:2 },
  { id:2, name:"Hot Stone Massage", duration:90, price:119, capacity:1 },
  { id:3, name:"Gesichtsbehandlung", duration:45, price:69, capacity:2 },
  { id:4, name:"Aromatherapie", duration:60, price:79, capacity:1 },
  { id:5, name:"Rücken-Massage", duration:30, price:49, capacity:3 },
  { id:6, name:"Maniküre & Pediküre", duration:75, price:59, capacity:2 },
];

const TABLES = [
  { id:1, name:"T1", seats:2, x:8, y:12, shape:"round", location:"Fenster" },
  { id:2, name:"T2", seats:2, x:25, y:12, shape:"round", location:"Fenster" },
  { id:3, name:"T3", seats:4, x:50, y:8, shape:"rect", location:"Mitte" },
  { id:4, name:"T4", seats:4, x:75, y:8, shape:"rect", location:"Mitte" },
  { id:5, name:"T5", seats:6, x:8, y:42, shape:"rect", location:"Innen" },
  { id:6, name:"T6", seats:6, x:35, y:42, shape:"rect", location:"Innen" },
  { id:7, name:"T7", seats:8, x:65, y:42, shape:"rect", location:"Innen" },
  { id:8, name:"T8", seats:2, x:12, y:72, shape:"round", location:"Terrasse" },
  { id:9, name:"T9", seats:2, x:35, y:72, shape:"round", location:"Terrasse" },
  { id:10, name:"T10", seats:4, x:60, y:72, shape:"rect", location:"Terrasse" },
];

const MENU_ITEMS = [
  { id:1, name:"Caesar Salad", price:12, cat:"Vorspeise" },
  { id:2, name:"Tomatensuppe", price:9, cat:"Vorspeise" },
  { id:3, name:"Burger Classic", price:18, cat:"Hauptgericht" },
  { id:4, name:"Wiener Schnitzel", price:22, cat:"Hauptgericht" },
  { id:5, name:"Pasta Carbonara", price:15, cat:"Hauptgericht" },
  { id:6, name:"Gegrillter Lachs", price:24, cat:"Hauptgericht" },
  { id:7, name:"Tiramisu", price:9, cat:"Dessert" },
  { id:8, name:"Bier (0,5l)", price:6, cat:"Getränk" },
  { id:9, name:"Cola", price:4, cat:"Getränk" },
];



// ============ NOTIFY WEBHOOK ============
// ⬇ Hier deine Make Webhook URL eintragen (Szenario 15)
const NOTIFY_WEBHOOK = "https://hook.eu2.make.com/5tyyp6yjmcrt788r5fgi967mxh12dbpo";

// ============ AIRTABLE CONFIG ============
const AT_TOKEN = "pat2H7JDN2uHcCl4t.8973e91b5cda47a35799d4b9517bced92ea08d8edb6f872807bdb5d3927dcc2f";
const AT_BASE  = "appv9sXdA3qm9U1Kl";
const AT_URL   = `https://api.airtable.com/v0/${AT_BASE}`;
const AT_HEADS = { "Authorization": `Bearer ${AT_TOKEN}`, "Content-Type": "application/json" };

async function atGet(table, filter="") {
  try {
    const url = `${AT_URL}/${encodeURIComponent(table)}${filter?"?filterByFormula="+encodeURIComponent(filter):""}`;
    const r = await fetch(url, { headers: AT_HEADS });
    const d = await r.json();
    return d.records || [];
  } catch(e) { console.error("AT GET error:", e); return []; }
}

async function atCreate(table, fields) {
  try {
    const r = await fetch(`${AT_URL}/${encodeURIComponent(table)}`, {
      method: "POST", headers: AT_HEADS,
      body: JSON.stringify({ records: [{ fields }] })
    });
    const d = await r.json();
    return d.records?.[0] || null;
  } catch(e) { console.error("AT CREATE error:", e); return null; }
}

async function atUpdate(table, recordId, fields) {
  try {
    await fetch(`${AT_URL}/${encodeURIComponent(table)}/${recordId}`, {
      method: "PATCH", headers: AT_HEADS,
      body: JSON.stringify({ fields })
    });
  } catch(e) { console.error("AT UPDATE error:", e); }
}

function mapGuest(rec, idx) {
  return {
    id: rec.id,
    atId: rec.id,
    name: rec.fields.guest_name || "Unbekannt",
    room: rec.fields.Rooms?.[0] ? String(rec.fields.Rooms[0]).substring(0,3) : rec.fields.room || "–",
    phone: rec.fields.phone_number || "",
    language: rec.fields.language || "german",
    checkin: rec.fields.check_in || "",
    checkout: rec.fields.check_out || "",
    status: rec.fields.status || "reserved",
    nights: rec.fields.nights || 1,
    vip: false,
    email: "",
  };
}

function mapRequest(rec) {
  return {
    id: rec.id,
    atId: rec.id,
    category: rec.fields.category || "",
    room: rec.fields.room || "",
    guestName: rec.fields.guest_name || "",
    phone: rec.fields.phone_number || "",
    language: rec.fields.language || "german",
    details: rec.fields.request_details || "",
    status: rec.fields.status || "open",
    time: rec.fields.timestamp ? new Date(rec.fields.timestamp).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}) : "",
    createdAt: rec.fields.timestamp ? new Date(rec.fields.timestamp).getTime() : Date.now(),
    // taxi specific
    destination: rec.fields.request_details?.split("Ziel:")?.[1]?.split(",")[0]?.trim() || rec.fields.request_details || "",
    requested_time: rec.fields.request_details?.match(/(\d{2}:\d{2})/)?.[1] || "",
    persons: rec.fields.request_details?.match(/Personen: (\d+)/)?.[1] || "",
    luggage: rec.fields.request_details?.match(/Gepäck: (.+?)(?:,|$)/)?.[1] || "",
    confirmed_time: "",
    created: new Date(rec.fields.timestamp||Date.now()).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}),
  };
}

async function sendNotifyWebhook(data) {
  try {
    await fetch(NOTIFY_WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch(e) { console.log("Webhook error:", e); }
}

const today = () => new Date().toISOString().split("T")[0];
const fmtDate = d => new Date(d).toLocaleDateString("de-DE",{weekday:"short",day:"2-digit",month:"2-digit"});
const fmtTime = () => new Date().toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"});
const SPA_TIMES = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00"];
const REST_TIMES = ["12:00","12:30","13:00","13:30","14:00","18:00","18:30","19:00","19:30","20:00","20:30","21:00","21:30"];

const INIT_ROOMS = [
  { number:"101", floor:1, type:"standard_single", status:"free", guestId:null, price:95 },
  { number:"102", floor:1, type:"standard_single", status:"occupied", guestId:1, price:95 },
  { number:"201", floor:2, type:"standard_double", status:"occupied", guestId:2, price:125 },
  { number:"202", floor:2, type:"standard_double", status:"free", price:125 },
  { number:"203", floor:2, type:"standard_double", status:"cleaning", guestId:null, price:125 },
  { number:"301", floor:3, type:"superior_double", status:"occupied", guestId:3, price:165 },
  { number:"302", floor:3, type:"superior_double", status:"checkout_today", guestId:4, price:165 },
  { number:"312", floor:3, type:"superior_double", status:"occupied", guestId:5, price:165 },
  { number:"401", floor:4, type:"junior_suite", status:"free", price:220 },
  { number:"402", floor:4, type:"junior_suite", status:"checkin_today", guestId:null, price:220 },
  { number:"501", floor:5, type:"suite", status:"occupied", guestId:6, price:310 },
  { number:"601", floor:6, type:"penthouse", status:"free", price:450 },
];

const INIT_GUESTS = [
  { id:1, name:"Anna Schmidt", room:"102", phone:"+49176123456", language:"Deutsch", checkin:"04.03.2026", checkout:"07.03.2026", vip:false, email:"anna@email.de" },
  { id:2, name:"Lars Schwingeler", room:"201", phone:"+49176234567", language:"Deutsch", checkin:"05.03.2026", checkout:"08.03.2026", vip:false, email:"lars@email.de" },
  { id:3, name:"Pierre Dumont", room:"301", phone:"+33612345678", language:"Französisch", checkin:"03.03.2026", checkout:"09.03.2026", vip:true, email:"pierre@email.fr" },
  { id:4, name:"Janine Kügel", room:"302", phone:"+49175940765", language:"Deutsch", checkin:"02.03.2026", checkout:"06.03.2026", vip:false, email:"janine@email.de" },
  { id:5, name:"Juan Diablo", room:"312", phone:"+49176324239", language:"Englisch", checkin:"01.03.2026", checkout:"04.03.2026", vip:true, email:"juan@email.com" },
  { id:6, name:"Yuki Tanaka", room:"501", phone:"+81901234567", language:"Japanisch", checkin:"04.03.2026", checkout:"10.03.2026", vip:true, email:"yuki@email.jp" },
];

// ============ MARITIM DESIGN TOKENS ============
const C = {
  navy:    "#1B3A6B",
  navyD:   "#0D2245",
  navyL:   "#24508A",
  red:     "#E8303A",
  redL:    "#F04550",
  bg:      "#F4F5F8",
  white:   "#FFFFFF",
  card:    "#FFFFFF",
  border:  "#DDE1EC",
  borderL: "#EEF0F6",
  text:    "#1A2236",
  dim:     "#6B7A9B",
  dimL:    "#9AA4BC",
  ok:      "#16a34a",
  err:     "#dc2626",
  warn:    "#d97706",
  info:    "#2563eb",
  spa:     "#7c3aed",
  rest:    "#be185d",
  gold:    "#B8973A",
};

const btn = (variant="primary") => {
  const styles = {
    primary: { background:C.red, color:"#fff", border:"none" },
    secondary: { background:"transparent", color:C.navy, border:`1.5px solid ${C.navy}` },
    ghost: { background:"transparent", color:C.dim, border:`1px solid ${C.border}` },
    danger: { background:"transparent", color:C.err, border:`1px solid ${C.err}` },
    success: { background:"transparent", color:C.ok, border:`1px solid ${C.ok}` },
    warn: { background:"transparent", color:C.warn, border:`1px solid ${C.warn}` },
  };
  return { ...styles[variant], padding:"8px 18px", borderRadius:4, fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"inherit", transition:"all 0.15s", letterSpacing:"0.02em" };
};

const inp = { width:"100%", padding:"9px 12px", borderRadius:4, border:`1.5px solid ${C.border}`, background:C.white, color:C.text, fontSize:13, fontFamily:"inherit", marginBottom:14, outline:"none", transition:"border-color .2s" };
const lbl = { fontSize:11, color:C.dim, display:"block", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600 };
const badge = (color) => ({ display:"inline-block", padding:"2px 10px", borderRadius:3, fontSize:11, fontWeight:600, background:color+"15", color, border:`1px solid ${color}30` });

// ============ MARITIM LOGO SVG ============
function MaritimLogo({ size=32, white=false }) {
  const c = white ? "#fff" : C.navy;
  return (
    <svg width={size} height={size*0.9} viewBox="0 0 80 72" fill="none">
      <path d="M40 4 L8 60 L40 52 L72 60 Z" stroke={c} strokeWidth="3.5" fill="none" strokeLinejoin="round"/>
      <path d="M40 4 L40 52" stroke={c} strokeWidth="2.5"/>
      <path d="M20 42 L40 36 L60 42" stroke={c} strokeWidth="2" opacity="0.7"/>
      <path d="M28 28 L40 22 L52 28" stroke={c} strokeWidth="2" opacity="0.5"/>
      <path d="M8 60 L72 60" stroke={c} strokeWidth="3"/>
    </svg>
  );
}

// ============ MAIN APP ============
export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("dashboard");
  const [rooms, setRooms] = useState(INIT_ROOMS);
  const [guests, setGuests] = useState(INIT_GUESTS);
  const [loading, setLoading] = useState(false);
  const [atReady, setAtReady] = useState(false);
  const [spaBooks, setSpaBooks] = useState([
    { id:1, guestId:5, treatId:1, date:today(), time:"10:00", status:"confirmed" },
    { id:2, guestId:3, treatId:3, date:today(), time:"14:00", status:"confirmed" },
    { id:3, guestId:6, treatId:2, date:today(), time:"16:00", status:"confirmed" },
  ]);
  const [restBooks, setRestBooks] = useState([
    { id:1, guestId:2, tableId:3, date:today(), time:"19:00", persons:3, status:"confirmed", notes:"Fensterplatz" },
    { id:2, guestId:5, tableId:1, date:today(), time:"20:00", persons:2, status:"confirmed", notes:"" },
    { id:3, guestId:6, tableId:7, date:today(), time:"19:30", persons:4, status:"confirmed", notes:"VIP, Geburtstag" },
  ]);
  const [rsOrders, setRsOrders] = useState([
    { id:1, guestId:5, room:"312", items:[{name:"Burger Classic",qty:1,price:18},{name:"Cola",qty:1,price:4}], total:27, status:"preparing", time:"20:15", minutes:null, createdAt:Date.now()-8*60000 },
    { id:2, guestId:6, room:"501", items:[{name:"Gegrillter Lachs",qty:1,price:24},{name:"Tiramisu",qty:1,price:9}], total:38, status:"ordered", time:"20:30", minutes:null, createdAt:Date.now()-4*60000 },
  ]);
  const [hkTasks, setHkTasks] = useState([
    { id:1, room:"312", request:"3 fresh towels", status:"open", priority:"normal", image:null, created:"20:10", createdAt:Date.now()-7*60000 },
    { id:2, room:"203", request:"Full room cleaning", status:"in_progress", priority:"urgent", image:null, created:"18:30", createdAt:Date.now()-12*60000 },
    { id:3, room:"301", request:"Extra pillows (2x)", status:"open", priority:"normal", image:null, created:"20:45", createdAt:Date.now()-3*60000 },
  ]);
  const [mtTasks, setMtTasks] = useState([
    { id:1, room:"312", problem:"Broken shower head", location:"Bathroom", status:"open", priority:"urgent", image:null, created:"19:55", createdAt:Date.now()-11*60000 },
    { id:2, room:"201", problem:"AC making noise", location:"Room", status:"in_progress", priority:"normal", image:null, created:"14:20", createdAt:Date.now()-6*60000 },
  ]);
  const [taxiRequests, setTaxiRequests] = useState([
    { id:1, guestId:3, room:"301", destination:"Hauptbahnhof Ingolstadt", requested_time:"21:00", confirmed_time:"", persons:"2", luggage:"1 Koffer", status:"open", created:"20:30", createdAt:Date.now()-5*60000 },
    { id:2, guestId:6, room:"501", destination:"Flughafen München", requested_time:"06:00", confirmed_time:"", persons:"3", luggage:"2 Koffer", status:"open", created:"19:45", createdAt:Date.now()-20*60000 },
  ]);
  const [selDate, setSelDate] = useState(today());
  const [modal, setModal] = useState(null);
  const [notif, setNotif] = useState(null);
  const [sideOpen, setSideOpen] = useState(true);
  const [sectionAlerts, setSectionAlerts] = useState({});
  const reminderRef = useRef({});

  const notify = (msg, type="ok") => { setNotif({msg,type}); setTimeout(()=>setNotif(null),3000); };

  // Simple alert engine — checks every 30s, shows alert in relevant section
  // Reminder after 5 min if still open
  useEffect(() => {
    const check = () => {
      const now = Date.now();
      const newAlerts = {};

      hkTasks.filter(t=>t.status==="open").forEach(t => {
        const ageMin = (now - (t.createdAt||now)) / 60000;
        const isReminder = ageMin >= 5;
        const key = "hk-"+t.id+"-reminder";
        if(isReminder && !reminderRef.current[key]) reminderRef.current[key] = true;
        if(!newAlerts.housekeeping) newAlerts.housekeeping = [];
        newAlerts.housekeeping.push({ id:t.id, room:t.room, text:t.request, isReminder: isReminder && reminderRef.current[key] });
      });

      mtTasks.filter(t=>t.status==="open").forEach(t => {
        const ageMin = (now - (t.createdAt||now)) / 60000;
        const isReminder = ageMin >= 5;
        const key = "mt-"+t.id+"-reminder";
        if(isReminder && !reminderRef.current[key]) reminderRef.current[key] = true;
        if(!newAlerts.maintenance) newAlerts.maintenance = [];
        newAlerts.maintenance.push({ id:t.id, room:t.room, text:t.problem, isReminder: isReminder && reminderRef.current[key] });
      });

      rsOrders.filter(o=>o.status==="ordered").forEach(o => {
        const ageMin = (now - (o.createdAt||now)) / 60000;
        const isReminder = ageMin >= 5;
        const key = "rs-"+o.id+"-reminder";
        if(isReminder && !reminderRef.current[key]) reminderRef.current[key] = true;
        if(!newAlerts.roomservice) newAlerts.roomservice = [];
        newAlerts.roomservice.push({ id:o.id, room:o.room, text:"Neue Bestellung", isReminder: isReminder && reminderRef.current[key] });
      });

      setSectionAlerts(newAlerts);
    };
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [hkTasks, mtTasks, rsOrders]);

  // ===== AIRTABLE SYNC =====
  const syncAirtable = async () => {
    setLoading(true);
    try {
      // Load Guests
      const gRecs = await atGet("Guests");
      if(gRecs.length > 0) {
        setGuests(gRecs.map(mapGuest));
      }

      // Load Service Requests
      const rRecs = await atGet("Service_Requests", "NOT({status}='completed')");
      const hk = [], mt = [], rs = [], tx = [];
      rRecs.forEach(rec => {
        const r = mapRequest(rec);
        if(r.category==="housekeeping") hk.push({id:rec.id,atId:rec.id,room:r.room,request:r.details,status:r.status==="in_progress"?"in_progress":r.status==="open"?"open":"completed",priority:"normal",image:null,created:r.created,createdAt:r.createdAt});
        else if(r.category==="maintenance") mt.push({id:rec.id,atId:rec.id,room:r.room,problem:r.details,location:"Zimmer",status:r.status==="in_progress"?"in_progress":r.status==="open"?"open":"completed",priority:"normal",image:null,created:r.created,createdAt:r.createdAt});
        else if(r.category==="roomservice") rs.push({id:rec.id,atId:rec.id,guestId:null,room:r.room,items:[{name:r.details,qty:1,price:0}],total:rec.fields.order_total||0,status:r.status==="open"?"ordered":"preparing",time:r.created,minutes:null,createdAt:r.createdAt});
        else if(r.category==="taxi") tx.push({id:rec.id,atId:rec.id,guestId:null,room:r.room,destination:r.destination,requested_time:r.requested_time,confirmed_time:"",persons:r.persons,luggage:r.luggage,status:"open",created:r.created,createdAt:r.createdAt});
      });
      if(hk.length>0) setHkTasks(p=>[...p.filter(t=>!t.atId), ...hk]);
      if(mt.length>0) setMtTasks(p=>[...p.filter(t=>!t.atId), ...mt]);
      if(rs.length>0) setRsOrders(p=>[...p.filter(o=>!o.atId), ...rs]);
      if(tx.length>0) setTaxiRequests(p=>[...p.filter(r=>!r.atId), ...tx]);

      setAtReady(true);
    } catch(e) { console.error("Sync error:", e); }
    setLoading(false);
  };

  useEffect(() => { syncAirtable(); const iv = setInterval(syncAirtable, 30000); return ()=>clearInterval(iv); }, []);

  if (!user) return <LoginScreen onLogin={(role) => { setUser(role); setTab(ROLES[role].modules[0]); }} />;

  const mods = ROLES[user].modules;
  const NAV = [
    { id:"dashboard", label:"Dashboard", icon:"▦" },
    { id:"rooms", label:"Zimmer", icon:"⊞" },
    { id:"guests", label:"Gäste", icon:"♟" },
    { id:"spa", label:"SPA & Wellness", icon:"✦" },
    { id:"restaurant", label:"Restaurant", icon:"⊛" },
    { id:"roomservice", label:"Room Service", icon:"⊕" },
    { id:"housekeeping", label:"Housekeeping", icon:"⊘" },
    { id:"maintenance", label:"Technik", icon:"⚙" },
    { id:"taxi", label:"Taxi", icon:"🚕" },
    { id:"billing", label:"Rechnungen", icon:"◈" },
    { id:"reports", label:"Berichte", icon:"◉" },
  ].filter(n => mods.includes(n.id));

  const urgentCount = hkTasks.filter(t=>t.status!=="completed"&&t.priority==="urgent").length + mtTasks.filter(t=>t.status!=="completed"&&t.priority==="urgent").length;

  return (
    <div style={{ display:"flex", minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'Gill Sans', 'Trebuchet MS', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Source+Sans+3:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {notif && (
        <div style={{ position:"fixed",top:20,right:20,zIndex:9999,padding:"14px 24px",borderRadius:4,
          background:notif.type==="ok"?C.ok:notif.type==="err"?C.err:C.warn,
          color:"#fff",fontWeight:600,fontSize:13,boxShadow:"0 8px 32px rgba(0,0,0,0.15)",
          animation:"slideIn .25s ease", display:"flex", alignItems:"center", gap:8 }}>
          <span>{notif.type==="ok"?"✓":notif.type==="err"?"✕":"!"}</span>
          {notif.msg}
        </div>
      )}


      {/* Sidebar */}
      <aside style={{ width: sideOpen?240:72, background:C.navyD, display:"flex", flexDirection:"column", flexShrink:0, transition:"width .25s ease", overflow:"hidden" }}>
        {/* Logo Area */}
        <div style={{ padding:"24px 20px 20px", borderBottom:`1px solid rgba(255,255,255,0.1)`, display:"flex", alignItems:"center", gap:12, minWidth:240 }}>
          <MaritimLogo size={36} white />
          {sideOpen && (
            <div>
              <p style={{ margin:0, fontFamily:"'Libre Baskerville',serif", fontSize:16, fontWeight:700, color:"#fff", letterSpacing:"0.05em" }}>MARITIM</p>
              <p style={{ margin:0, fontSize:9, color:"rgba(255,255,255,0.45)", textTransform:"uppercase", letterSpacing:"0.2em" }}>Hotel Ingolstadt</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex:1, padding:"16px 8px" }}>
          {NAV.map(n => (
            <button key={n.id} onClick={()=>setTab(n.id)}
              style={{ display:"flex", alignItems:"center", gap:12, width:"100%", padding:sideOpen?"11px 14px":"11px", borderRadius:4, border:"none", cursor:"pointer",
                fontSize:13, fontWeight:tab===n.id?600:400,
                background:tab===n.id?"rgba(255,255,255,0.1)":"transparent",
                color:tab===n.id?"#fff":"rgba(255,255,255,0.5)",
                textAlign:"left", fontFamily:"inherit", marginBottom:2, transition:"all .15s",
                whiteSpace:"nowrap", letterSpacing:"0.01em" }}>
              <span style={{ fontSize:15, opacity:0.9, flexShrink:0 }}>{n.icon}</span>
              {sideOpen && n.label}
              {sideOpen && tab===n.id && <span style={{ marginLeft:"auto", width:4, height:4, borderRadius:"50%", background:C.red }}></span>}
            </button>
          ))}
        </nav>

        {/* User + Collapse */}
        <div style={{ padding:"12px 8px", borderTop:`1px solid rgba(255,255,255,0.1)` }}>
          {sideOpen && (
            <div style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 14px", marginBottom:8 }}>
              <div style={{ width:32, height:32, borderRadius:"50%", background:C.red, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, color:"#fff", fontWeight:700, flexShrink:0 }}>
                {ROLES[user].label[0]}
              </div>
              <div>
                <p style={{ margin:0, fontSize:12, fontWeight:600, color:"#fff" }}>{ROLES[user].label}</p>
                <p style={{ margin:0, fontSize:10, color:"rgba(255,255,255,0.4)" }}>Eingeloggt</p>
              </div>
            </div>
          )}
          <button onClick={()=>setUser(null)}
            style={{ width:"100%", padding:"8px 14px", background:"transparent", border:`1px solid rgba(255,255,255,0.15)`,
              color:"rgba(255,255,255,0.5)", borderRadius:4, cursor:"pointer", fontSize:11, fontFamily:"inherit",
              display:"flex", alignItems:"center", gap:8, justifyContent: sideOpen?"flex-start":"center" }}>
            <span>↩</span>{sideOpen && "Ausloggen"}
          </button>
        </div>
        <button onClick={()=>setSideOpen(!sideOpen)}
          style={{ padding:"10px", background:"rgba(255,255,255,0.05)", border:"none", borderTop:`1px solid rgba(255,255,255,0.1)`,
            color:"rgba(255,255,255,0.4)", cursor:"pointer", fontSize:13, fontFamily:"inherit" }}>
          {sideOpen ? "◀ Einklappen" : "▶"}
        </button>
      </aside>

      {/* Main Content */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* Top Bar */}
        <header style={{ background:C.white, borderBottom:`1px solid ${C.border}`, padding:"0 32px", height:56, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:11, color:C.dim, textTransform:"uppercase", letterSpacing:"0.1em" }}>PMS</span>
            <span style={{ color:C.border }}>›</span>
            <span style={{ fontSize:13, fontWeight:600, color:C.navy }}>
              {NAV.find(n=>n.id===tab)?.label || "Dashboard"}
            </span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:20 }}>
            {urgentCount > 0 && (
              <div style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 12px", background:C.err+"10", border:`1px solid ${C.err}30`, borderRadius:4 }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:C.err, display:"inline-block" }}></span>
                <span style={{ fontSize:12, color:C.err, fontWeight:600 }}>{urgentCount} Dringend</span>
              </div>
            )}
            {loading && <span style={{ fontSize:11, color:C.dim }}>↻ Sync...</span>}
            {atReady && !loading && <span style={{ fontSize:11, color:C.ok }}>● Airtable live</span>}
            <span style={{ color:C.dim, fontSize:13 }}>{fmtDate(today())} · {fmtTime()}</span>
          </div>
        </header>

        <main style={{ flex:1, padding:"28px 32px", overflowY:"auto" }}>
          {tab==="dashboard" && <Dashboard guests={guests} rooms={rooms} spaBooks={spaBooks.filter(b=>b.date===today()&&b.status==="confirmed")} restBooks={restBooks.filter(b=>b.date===today()&&b.status==="confirmed")} rsOrders={rsOrders} hkTasks={hkTasks} mtTasks={mtTasks} />}
          {tab==="rooms" && <Rooms rooms={rooms} guests={guests} setRooms={setRooms} notify={notify} />}
          {tab==="guests" && <Guests guests={guests} role={user} />}
          {tab==="spa" && <SPA guests={guests} bookings={spaBooks} setBookings={setSpaBooks} selDate={selDate} setSelDate={setSelDate} notify={notify} setModal={setModal} />}
          {tab==="restaurant" && <Restaurant guests={guests} bookings={restBooks} setBookings={setRestBooks} selDate={selDate} setSelDate={setSelDate} notify={notify} setModal={setModal} />}
          {tab==="roomservice" && <RoomService orders={rsOrders} setOrders={setRsOrders} guests={guests} notify={notify} role={user} alerts={sectionAlerts.roomservice||[]} />}
          {tab==="housekeeping" && <Housekeeping tasks={hkTasks} setTasks={setHkTasks} notify={notify} alerts={sectionAlerts.housekeeping||[]} guests={guests} />}
          {tab==="maintenance" && <Maintenance tasks={mtTasks} setTasks={setMtTasks} notify={notify} alerts={sectionAlerts.maintenance||[]} guests={guests} />}
          {tab==="taxi" && <Taxi requests={taxiRequests} setRequests={setTaxiRequests} guests={guests} notify={notify} />}
          {tab==="billing" && <Billing guests={guests} spaBooks={spaBooks} restBooks={restBooks} rsOrders={rsOrders} rooms={rooms} />}
          {tab==="reports" && <Reports guests={guests} rooms={rooms} spaBooks={spaBooks} restBooks={restBooks} rsOrders={rsOrders} hkTasks={hkTasks} />}
        </main>
      </div>

      {modal==="spa" && <Modal t="SPA-Termin buchen" onClose={()=>setModal(null)}><SPAForm guests={guests} bookings={spaBooks} date={selDate} onSubmit={b=>{setSpaBooks(p=>[...p,{...b,id:Date.now(),status:"confirmed"}]);notify("SPA-Termin gebucht!");setModal(null);}} /></Modal>}
      {modal==="rest" && <Modal t="Reservierung erstellen" onClose={()=>setModal(null)}><RestForm guests={guests} bookings={restBooks} date={selDate} onSubmit={b=>{setRestBooks(p=>[...p,{...b,id:Date.now(),status:"confirmed"}]);notify("Reservierung erstellt!");setModal(null);}} /></Modal>}

      <style>{`
        @keyframes slideIn{from{transform:translateX(60px);opacity:0}to{transform:translateX(0);opacity:1}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:6px}
        ::-webkit-scrollbar-track{background:${C.bg}}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}
        input:focus,select:focus,textarea:focus{border-color:${C.navy} !important;outline:none}
        button:hover{opacity:0.88}
      `}</style>
    </div>
  );
}


// ============ ALERT BANNER ============
function AlertBanner({ alerts }) {
  if (!alerts || alerts.length === 0) return null;
  return (
    <div style={{ marginBottom:20 }}>
      {alerts.map(a => (
        <div key={a.id} style={{
          display:"flex", alignItems:"center", gap:12, padding:"12px 16px",
          background: a.isReminder ? "#fff7ed" : "#eff6ff",
          border: `1.5px solid ${a.isReminder ? C.warn : C.info}`,
          borderRadius:6, marginBottom:8
        }}>
          <span style={{ fontSize:18 }}>{a.isReminder ? "⏰" : "🔔"}</span>
          <div style={{ flex:1 }}>
            <span style={{ fontWeight:700, fontSize:13, color: a.isReminder ? C.warn : C.info }}>
              {a.isReminder ? "Erinnerung — noch nicht angenommen" : "Neuer Auftrag"}
            </span>
            <span style={{ fontSize:13, color:C.text, marginLeft:8 }}>Zi. {a.room} · {a.text}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ LOGIN ============
function LoginScreen({ onLogin }) {
  const [hover, setHover] = useState(null);
  return (
    <div style={{ minHeight:"100vh", display:"flex", background:`linear-gradient(160deg, ${C.navyD} 0%, ${C.navy} 50%, #2A5298 100%)`, fontFamily:"'Source Sans 3', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Source+Sans+3:wght@300;400;500;600;700&display=swap" rel="stylesheet" />

      {/* Left decorative panel */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", padding:"60px 80px", maxWidth:520 }}>
        <MaritimLogo size={64} white />
        <h1 style={{ fontFamily:"'Libre Baskerville',serif", fontSize:42, fontWeight:700, color:"#fff", margin:"32px 0 8px", lineHeight:1.15 }}>
          Maritim Hotel<br/>Ingolstadt
        </h1>
        <p style={{ color:"rgba(255,255,255,0.5)", fontSize:14, letterSpacing:"0.2em", textTransform:"uppercase", margin:"0 0 40px" }}>
          Property Management System
        </p>
        <div style={{ width:48, height:2, background:C.red, marginBottom:32 }}></div>
        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:14, lineHeight:1.7, maxWidth:340 }}>
          Wählen Sie Ihren Arbeitsbereich aus, um sich anzumelden.
        </p>
      </div>

      {/* Right login panel */}
      <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(255,255,255,0.04)", backdropFilter:"blur(20px)", padding:40 }}>
        <div style={{ width:"100%", maxWidth:480, animation:"fadeUp .6s ease" }}>
          <p style={{ color:"rgba(255,255,255,0.5)", fontSize:11, letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:24, fontWeight:600 }}>Bereich auswählen</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {Object.entries(ROLES).map(([key, r]) => (
              <button key={key} onClick={()=>onLogin(key)}
                onMouseEnter={()=>setHover(key)} onMouseLeave={()=>setHover(null)}
                style={{ padding:"20px 16px", borderRadius:6,
                  border:`1.5px solid ${hover===key?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.1)"}`,
                  background:hover===key?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.04)",
                  cursor:"pointer", textAlign:"left", transition:"all .2s", fontFamily:"inherit",
                  display:"flex", alignItems:"center", gap:14 }}>
                <span style={{ fontSize:24 }}>{r.icon}</span>
                <div>
                  <p style={{ margin:0, fontSize:14, fontWeight:600, color:"#fff" }}>{r.label}</p>
                  <p style={{ margin:0, fontSize:11, color:"rgba(255,255,255,0.35)", marginTop:2 }}>
                    {r.modules.length} Module
                  </p>
                </div>
                {hover===key && <span style={{ marginLeft:"auto", color:C.red, fontSize:16 }}>→</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}*{box-sizing:border-box}`}</style>
    </div>
  );
}

// ============ SECTION HEADER ============
function SectionHeader({ title, subtitle, action }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:28 }}>
      <div>
        <h2 style={{ fontFamily:"'Libre Baskerville',serif", fontSize:26, fontWeight:700, margin:"0 0 4px", color:C.navy, letterSpacing:"-0.02em" }}>{title}</h2>
        {subtitle && <p style={{ margin:0, fontSize:13, color:C.dim }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ============ CARD ============
function Card({ children, style={} }) {
  return <div style={{ background:C.card, borderRadius:6, border:`1px solid ${C.border}`, ...style }}>{children}</div>;
}

// ============ DASHBOARD ============
function Dashboard({ guests, rooms, spaBooks, restBooks, rsOrders, hkTasks, mtTasks }) {
  const occupied = rooms.filter(r=>r.status==="occupied").length;
  const stats = [
    { l:"Belegung", v:`${occupied}/${rooms.length}`, sub:`${Math.round(occupied/rooms.length*100)}% ausgelastet`, accent:C.navy },
    { l:"Check-in heute", v:rooms.filter(r=>r.status==="checkin_today").length, sub:"Zimmer erwarten Gäste", accent:C.info },
    { l:"Check-out heute", v:rooms.filter(r=>r.status==="checkout_today").length, sub:"Zimmer frei ab 12:00", accent:C.warn },
    { l:"SPA Termine", v:spaBooks.length, sub:"heute bestätigt", accent:C.spa },
    { l:"Reservierungen", v:restBooks.length, sub:"heute im Restaurant", accent:C.rest },
    { l:"Room Service", v:rsOrders.filter(o=>o.status!=="delivered").length, sub:"aktive Bestellungen", accent:C.warn },
    { l:"Housekeeping", v:hkTasks.filter(t=>t.status!=="completed").length, sub:"offene Aufträge", accent:C.ok },
    { l:"Technik", v:mtTasks.filter(t=>t.status!=="completed").length, sub:"offene Meldungen", accent:C.err },
  ];

  return (
    <div style={{ animation:"fadeUp .35s ease" }}>
      <SectionHeader title="Übersicht" subtitle={`${fmtDate(today())} · Stand ${fmtTime()} Uhr`} />

      {/* Stats Grid */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:28 }}>
        {stats.map((s,i) => (
          <Card key={i} style={{ padding:"20px 22px" }}>
            <p style={{ color:C.dim, fontSize:10, textTransform:"uppercase", letterSpacing:"0.1em", margin:"0 0 8px", fontWeight:600 }}>{s.l}</p>
            <p style={{ fontSize:28, fontWeight:700, margin:"0 0 4px", color:s.accent, fontFamily:"'Libre Baskerville',serif" }}>{s.v}</p>
            <p style={{ fontSize:11, color:C.dimL, margin:0 }}>{s.sub}</p>
          </Card>
        ))}
      </div>

      {/* Room Overview */}
      <Card style={{ padding:24 }}>
        <p style={{ fontSize:12, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", color:C.dim, margin:"0 0 16px" }}>Zimmerübersicht</p>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
          {rooms.map(r => (
            <div key={r.number} style={{ width:58, height:46, borderRadius:4,
              background:ROOM_STATUS_COLORS[r.status]+"12",
              border:`1.5px solid ${ROOM_STATUS_COLORS[r.status]}40`,
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}
              title={`${r.number} — ${ROOM_STATUS_LABELS[r.status]}`}>
              <span style={{ fontSize:13, fontWeight:700, color:ROOM_STATUS_COLORS[r.status] }}>{r.number}</span>
              <span style={{ fontSize:7, color:C.dim, marginTop:1 }}>{ROOM_STATUS_LABELS[r.status]}</span>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:16, marginTop:14, flexWrap:"wrap" }}>
          {Object.entries(ROOM_STATUS_LABELS).map(([k,v]) => (
            <span key={k} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:C.dim }}>
              <span style={{ width:8, height:8, borderRadius:2, background:ROOM_STATUS_COLORS[k] }}></span>{v}
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ============ ROOMS ============
function Rooms({ rooms, guests, setRooms, notify }) {
  const [filter, setFilter] = useState("all");
  const filtered = filter==="all" ? rooms : rooms.filter(r=>r.status===filter);
  const changeStatus = (num, status) => { setRooms(p=>p.map(r=>r.number===num?{...r,status}:r)); notify("Zimmerstatus geändert"); };

  return (
    <div style={{ animation:"fadeUp .35s ease" }}>
      <SectionHeader title="Zimmerverwaltung" subtitle={`${rooms.length} Zimmer insgesamt`} />
      <div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap" }}>
        {[["all","Alle"],["free","Frei"],["occupied","Belegt"],["checkout_today","Check-out"],["checkin_today","Check-in"],["cleaning","Reinigung"]].map(([k,v]) => (
          <button key={k} onClick={()=>setFilter(k)}
            style={{ padding:"7px 16px", borderRadius:4,
              border:`1.5px solid ${filter===k?C.navy:C.border}`,
              background:filter===k?C.navy:"transparent",
              color:filter===k?"#fff":C.dim,
              cursor:"pointer", fontSize:12, fontFamily:"inherit", fontWeight:filter===k?600:400, letterSpacing:"0.02em" }}>
            {v}
          </button>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
        {filtered.map(r => {
          const g = guests.find(g=>g.id===r.guestId);
          return (
            <Card key={r.number} style={{ padding:20, borderLeft:`3px solid ${ROOM_STATUS_COLORS[r.status]}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                <div>
                  <span style={{ fontFamily:"'Libre Baskerville',serif", fontSize:22, fontWeight:700, color:C.navy }}>Zi. {r.number}</span>
                  <p style={{ margin:"2px 0 0", fontSize:11, color:C.dim }}>{ROOM_TYPES[r.type]} · Etage {r.floor} · {r.price}€/Nacht</p>
                </div>
                <span style={badge(ROOM_STATUS_COLORS[r.status])}>{ROOM_STATUS_LABELS[r.status]}</span>
              </div>
              {g && (
                <div style={{ padding:"8px 12px", background:C.bg, borderRadius:4, marginBottom:12 }}>
                  <p style={{ margin:0, fontSize:13, fontWeight:600 }}>{g.name} {g.vip && <span style={{ color:C.gold, fontSize:11 }}>★ VIP</span>}</p>
                  <p style={{ margin:"2px 0 0", fontSize:11, color:C.dim }}>{g.checkin} → {g.checkout}</p>
                </div>
              )}
              <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                {r.status==="free" && <button onClick={()=>changeStatus(r.number,"occupied")} style={btn("success")}>Check-in</button>}
                {r.status==="occupied" && <button onClick={()=>changeStatus(r.number,"checkout_today")} style={btn("warn")}>Check-out</button>}
                {r.status==="checkout_today" && <button onClick={()=>changeStatus(r.number,"cleaning")} style={btn("ghost")}>Reinigung</button>}
                {r.status==="cleaning" && <button onClick={()=>changeStatus(r.number,"free")} style={btn("success")}>Freigeben</button>}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ============ GUESTS ============
function NewGuestModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name:"", phone:"", language:"german", checkin:"", checkout:"", nights:"1" });
  const set = (k,v) => setForm(p=>({...p,[k]:v}));
  const valid = form.name && form.phone && form.checkin && form.checkout;
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(13,34,69,0.5)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999 }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.white, borderRadius:6, border:`1px solid ${C.border}`, padding:28, width:440, boxShadow:"0 24px 60px rgba(13,34,69,0.15)", animation:"fadeUp .2s ease" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, paddingBottom:16, borderBottom:`1px solid ${C.border}` }}>
          <h3 style={{ fontFamily:"'Libre Baskerville',serif", fontSize:18, fontWeight:700, margin:0, color:C.navy }}>Neuer Gast</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.dim, fontSize:18, cursor:"pointer" }}>✕</button>
        </div>
        <label style={lbl}>Name</label>
        <input value={form.name} onChange={e=>set("name",e.target.value)} placeholder="Vor- und Nachname" style={inp} />
        <label style={lbl}>Telefon (WhatsApp)</label>
        <input value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="+49176..." style={inp} />
        <label style={lbl}>Sprache</label>
        <select value={form.language} onChange={e=>set("language",e.target.value)} style={inp}>
          <option value="german">Deutsch</option>
          <option value="english">Englisch</option>
          <option value="french">Französisch</option>
          <option value="spanish">Spanisch</option>
          <option value="italian">Italienisch</option>
          <option value="japanese">Japanisch</option>
        </select>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div><label style={lbl}>Check-in</label><input type="date" value={form.checkin} onChange={e=>set("checkin",e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Check-out</label><input type="date" value={form.checkout} onChange={e=>set("checkout",e.target.value)} style={inp} /></div>
        </div>
        <label style={lbl}>Nächte</label>
        <input type="number" value={form.nights} onChange={e=>set("nights",e.target.value)} min="1" style={inp} />
        <button onClick={()=>valid&&onSave(form)} disabled={!valid}
          style={{ ...btn(valid?"primary":"ghost"), width:"100%", marginTop:4, opacity:valid?1:0.5 }}>
          ✓ Gast anlegen & in Airtable speichern
        </button>
      </div>
    </div>
  );
}

function Guests({ guests, role }) {
  const [showNewGuest, setShowNewGuest] = useState(false);
  const showPhone = ["admin","reception"].includes(role);
  return (
    <div style={{ animation:"fadeUp .35s ease" }}>
      <SectionHeader title="Gästeliste" subtitle={`${guests.length} aktuelle Gäste`}
        action={role==="admin"||role==="reception" ? <button onClick={()=>setShowNewGuest(true)} style={{...btn("primary")}}>+ Neuer Gast</button> : null} />
      {showNewGuest && <NewGuestModal onClose={()=>setShowNewGuest(false)} onSave={async(g)=>{
        const rec = await atCreate("Guests", {
          guest_name: g.name,
          phone_number: g.phone,
          language: g.language,
          check_in: g.checkin,
          check_out: g.checkout,
          status: "reserved",
          nights: parseInt(g.nights)||1,
          welcome_sent: false,
        });
        if(rec) setGuests(p=>[...p, mapGuest(rec, p.length)]);
        setShowNewGuest(false);
      }} />}
      <Card>
        <div style={{ display:"grid", gridTemplateColumns:showPhone?"2fr 60px 140px 80px 100px 100px":"2fr 60px 80px 100px 100px",
          padding:"12px 20px", borderBottom:`1px solid ${C.border}`,
          fontSize:10, color:C.dim, textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:600 }}>
          <span>Gast</span><span>Zimmer</span>{showPhone && <span>Telefon</span>}<span>Sprache</span><span>Check-in</span><span>Check-out</span>
        </div>
        {guests.map((g, i) => (
          <div key={g.id} style={{ display:"grid",
            gridTemplateColumns:showPhone?"2fr 60px 140px 80px 100px 100px":"2fr 60px 80px 100px 100px",
            padding:"14px 20px", borderBottom:i<guests.length-1?`1px solid ${C.borderL}`:"none",
            fontSize:13, alignItems:"center", background: g.vip?"rgba(184,151,58,0.03)":"transparent" }}>
            <span style={{ fontWeight:500 }}>
              {g.name}
              {g.vip && <span style={{ color:C.gold, fontSize:10, marginLeft:6, fontWeight:600 }}>★ VIP</span>}
            </span>
            <span style={{ color:C.navy, fontWeight:700 }}>{g.room}</span>
            {showPhone && <span style={{ color:C.dim, fontSize:11 }}>{g.phone}</span>}
            <span style={{ fontSize:11 }}>{g.language}</span>
            <span style={{ fontSize:11 }}>{g.checkin}</span>
            <span style={{ fontSize:11 }}>{g.checkout}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ============ SPA ============
function SPA({ guests, bookings, setBookings, selDate, setSelDate, notify, setModal }) {
  const dayBooks = bookings.filter(b=>b.date===selDate&&b.status==="confirmed");
  const cancel = id => { setBookings(p=>p.map(b=>b.id===id?{...b,status:"cancelled"}:b)); notify("Termin storniert","err"); };

  return (
    <div style={{ animation:"fadeUp .35s ease" }}>
      <SectionHeader title="SPA & Wellness"
        action={<button onClick={()=>setModal("spa")} style={{ ...btn("primary"), display:"flex", alignItems:"center", gap:6 }}>+ Neuer Termin</button>} />
      <input type="date" value={selDate} onChange={e=>setSelDate(e.target.value)} style={{ ...inp, width:180, marginBottom:20 }} />

      <Card style={{ overflow:"auto", marginBottom:20 }}>
        <div style={{ display:"grid", gridTemplateColumns:"80px repeat(6,1fr)", minWidth:820 }}>
          <div style={{ padding:"12px 10px", fontSize:10, color:C.dim, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", borderBottom:`1px solid ${C.border}` }}>Zeit</div>
          {TREATMENTS.map(t => (
            <div key={t.id} style={{ padding:"10px 8px", fontSize:10, color:C.dim, textAlign:"center",
              borderBottom:`1px solid ${C.border}`, borderLeft:`1px solid ${C.border}` }}>
              <span style={{ fontWeight:600 }}>{t.name}</span><br/>
              <span style={{ color:C.navy }}>{t.price}€ · {t.duration}min</span>
            </div>
          ))}
          {SPA_TIMES.map(slot => (
            <div key={slot} style={{ display:"contents" }}>
              <div style={{ padding:"8px 10px", fontSize:12, color:C.dim, borderBottom:`1px solid ${C.borderL}` }}>{slot}</div>
              {TREATMENTS.map(t => {
                const b = dayBooks.find(b=>b.time===slot&&b.treatId===t.id);
                const g = b ? guests.find(g=>g.id===b.guestId) : null;
                return (
                  <div key={t.id} style={{ padding:4, borderLeft:`1px solid ${C.borderL}`, borderBottom:`1px solid ${C.borderL}`, minHeight:38, display:"flex", alignItems:"center" }}>
                    {b && (
                      <div onClick={()=>cancel(b.id)}
                        style={{ background:C.spa+"15", border:`1px solid ${C.spa}30`, borderRadius:3,
                          padding:"3px 8px", fontSize:10, color:C.spa, cursor:"pointer", width:"100%", textAlign:"center" }}
                        title="Klicken zum Stornieren">
                        <b>{g?.name?.split(" ")[0]}</b>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ padding:20 }}>
        <p style={{ fontSize:12, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", color:C.dim, margin:"0 0 14px" }}>Termine — {fmtDate(selDate)}</p>
        {dayBooks.length===0 ? <p style={{ color:C.dim, fontSize:13 }}>Keine Termine</p> : dayBooks.map(b => {
          const g = guests.find(g=>g.id===b.guestId);
          const t = TREATMENTS.find(t=>t.id===b.treatId);
          return (
            <div key={b.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0", borderBottom:`1px solid ${C.borderL}` }}>
              <div style={{ display:"flex", gap:16, alignItems:"center" }}>
                <span style={{ color:C.navy, fontWeight:700, fontSize:14, minWidth:50 }}>{b.time}</span>
                <div>
                  <p style={{ margin:0, fontWeight:600, fontSize:13 }}>{g?.name} {g?.vip && "★"}</p>
                  <p style={{ margin:0, color:C.dim, fontSize:11 }}>{t?.name} · {t?.duration}min · {t?.price}€</p>
                </div>
              </div>
              <button onClick={()=>cancel(b.id)} style={btn("danger")}>Stornieren</button>
            </div>
          );
        })}
      </Card>
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
    <div style={{ animation:"fadeUp .35s ease" }}>
      <SectionHeader title="Restaurant Weitblick"
        action={<button onClick={()=>setModal("rest")} style={{ ...btn("primary") }}>+ Reservierung</button>} />

      <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
        <input type="date" value={selDate} onChange={e=>setSelDate(e.target.value)} style={{ ...inp, width:160, marginBottom:0 }} />
        <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
          {REST_TIMES.map(t => (
            <button key={t} onClick={()=>setSelTime(t)}
              style={{ padding:"6px 10px", borderRadius:3,
                border:`1.5px solid ${t===selTime?C.navy:C.border}`,
                background:t===selTime?C.navy:"transparent",
                color:t===selTime?"#fff":C.dim,
                cursor:"pointer", fontSize:11, fontFamily:"inherit" }}>{t}</button>
          ))}
        </div>
      </div>

      <Card style={{ padding:24, position:"relative", height:420, marginBottom:20 }}>
        <span style={{ position:"absolute", top:14, left:20, fontSize:10, color:C.dim, textTransform:"uppercase", letterSpacing:"0.1em", fontWeight:600 }}>
          Tischplan — {fmtDate(selDate)} {selTime}
        </span>
        <div style={{ position:"absolute", top:12, right:20, display:"flex", gap:14, fontSize:10 }}>
          <span style={{ display:"flex", alignItems:"center", gap:4 }}><span style={{ width:8, height:8, borderRadius:2, background:C.ok }}></span>Frei</span>
          <span style={{ display:"flex", alignItems:"center", gap:4 }}><span style={{ width:8, height:8, borderRadius:2, background:C.err }}></span>Besetzt</span>
        </div>
        {TABLES.map(tb => {
          const booked = bookedIds.includes(tb.id);
          const bk = timeBooks.find(b=>b.tableId===tb.id);
          const g = bk ? guests.find(g=>g.id===bk.guestId) : null;
          const sz = tb.seats<=2?50:tb.seats<=4?64:tb.seats<=6?78:92;
          return (
            <div key={tb.id} style={{ position:"absolute", left:`${tb.x}%`, top:`${tb.y+8}%`,
              width:sz, height:tb.shape==="round"?sz:sz*.65,
              borderRadius:tb.shape==="round"?"50%":4,
              background:booked?C.err+"15":C.ok+"10",
              border:`2px solid ${booked?C.err+"50":C.ok+"40"}`,
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
              cursor:booked?"pointer":"default", transition:"all .2s", fontSize:9 }}
              title={booked?`${g?.name} — ${bk?.persons}P`:""} onClick={()=>booked&&cancel(bk.id)}>
              <span style={{ fontWeight:700, fontSize:10, color:booked?C.err:C.ok }}>{tb.name}</span>
              <span style={{ color:C.dim, fontSize:8 }}>{tb.seats}P</span>
              {booked && <span style={{ color:C.err, fontSize:8, fontWeight:600 }}>{g?.name?.split(" ")[0]}</span>}
            </div>
          );
        })}
      </Card>

      <Card style={{ padding:20 }}>
        <p style={{ fontSize:12, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.08em", color:C.dim, margin:"0 0 14px" }}>Reservierungen — {fmtDate(selDate)}</p>
        {dayBooks.length===0 ? <p style={{ color:C.dim, fontSize:13 }}>Keine Reservierungen</p> : dayBooks.map(b => {
          const g = guests.find(g=>g.id===b.guestId);
          const tb = TABLES.find(t=>t.id===b.tableId);
          return (
            <div key={b.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0", borderBottom:`1px solid ${C.borderL}` }}>
              <div style={{ display:"flex", gap:14, alignItems:"center" }}>
                <span style={{ color:C.navy, fontWeight:700, minWidth:48 }}>{b.time}</span>
                <div>
                  <p style={{ margin:0, fontWeight:600, fontSize:13 }}>{g?.name} · {b.persons} Pers.</p>
                  <p style={{ margin:0, color:C.dim, fontSize:11 }}>{tb?.name} ({tb?.seats}P){b.notes?` · ${b.notes}`:""}</p>
                </div>
              </div>
              <button onClick={()=>cancel(b.id)} style={btn("danger")}>Stornieren</button>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

// ============ ROOM SERVICE ============
function RoomService({ orders, setOrders, guests, notify, role, alerts=[] }) {
  const statusColors = { ordered:C.err, preparing:C.warn, delivering:C.info, delivered:C.ok };
  const statusLabels = { ordered:"Bestellt", preparing:"In Zubereitung", delivering:"Unterwegs", delivered:"Geliefert" };
  const next = { ordered:"preparing", preparing:"delivering", delivering:"delivered" };
  const [pendingMinutes, setPendingMinutes] = useState({});
  const advance = (id) => {
    const order = orders.find(o=>o.id===id);
    if(order.status==="ordered") {
      const minutes = pendingMinutes[id] || "30";
      const guest = guests.find(g=>g.id===order.guestId);
      sendNotifyWebhook({
        category: "roomservice",
        room: order.room,
        phone_number: guest?.phone || "",
        language: guest?.language || "german",
        minutes: minutes,
        status: "accepted"
      });
      notify(`Angenommen — Gast wird über ${minutes} Min. informiert ✉️`);
    } else {
      notify("Status aktualisiert");
    }
    setOrders(p=>p.map(o=>o.id===id?{...o,status:next[o.status]||o.status,minutes:pendingMinutes[id]||o.minutes}:o));
  };
  const setMin = (id, min) => { setPendingMinutes(p=>({...p,[id]:min})); };
  const active = orders.filter(o=>o.status!=="delivered");

  return (
    <div style={{ animation:"fadeUp .35s ease" }}>
      <SectionHeader title="Room Service" subtitle={`${active.length} aktive Bestellungen`} />
      <AlertBanner alerts={alerts} />
      <div style={{ display:"grid", gap:14 }}>
        {active.map(o => {
          const g = guests.find(g=>g.id===o.guestId);
          return (
            <Card key={o.id} style={{ padding:20, borderLeft:`3px solid ${statusColors[o.status]}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                <div>
                  <span style={{ fontFamily:"'Libre Baskerville',serif", fontSize:20, fontWeight:700, color:C.navy }}>Zimmer {o.room}</span>
                  {role!=="kitchen" && g && <span style={{ color:C.dim, fontSize:12, marginLeft:10 }}>{g.name}</span>}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={badge(statusColors[o.status])}>{statusLabels[o.status]}</span>
                  <span style={{ color:C.dim, fontSize:12 }}>{o.time} Uhr</span>
                </div>
              </div>
              <div style={{ background:C.bg, borderRadius:4, padding:"12px 14px", marginBottom:14 }}>
                {o.items.map((it,i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:13, padding:"2px 0" }}>
                    <span>{it.qty}× {it.name}</span>
                    <span style={{ fontWeight:600 }}>{it.price}€</span>
                  </div>
                ))}
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, fontWeight:700, color:C.navy, marginTop:8, paddingTop:8, borderTop:`1px solid ${C.border}` }}>
                  <span>Gesamt (inkl. 5€ Service)</span>
                  <span>{o.total}€</span>
                </div>
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                {o.status!=="delivered" && (
                  <button onClick={()=>advance(o.id)} style={{ ...btn("primary"), display:"flex", alignItems:"center", gap:6 }}>
                    → {statusLabels[next[o.status]]}
                  </button>
                )}
                {o.status==="ordered" && (
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <input type="number" placeholder="30" style={{ ...inp, width:70, marginBottom:0, padding:"7px 10px" }}
                      value={pendingMinutes[o.id]||""}
                      onChange={e=>setMin(o.id,e.target.value)} />
                    <span style={{ fontSize:11, color:C.dim }}>Min. bis Lieferung</span>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
        {active.length===0 && (
          <Card style={{ padding:48, textAlign:"center" }}>
            <p style={{ color:C.dim, fontSize:15, margin:0 }}>Keine offenen Bestellungen ✓</p>
          </Card>
        )}
      </div>

      {orders.filter(o=>o.status==="delivered").length>0 && (
        <>
          <p style={{ fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.1em", color:C.dim, margin:"24px 0 12px" }}>Abgeschlossen</p>
          {orders.filter(o=>o.status==="delivered").map(o => (
            <div key={o.id} style={{ background:C.bg, borderRadius:4, padding:"10px 16px", marginBottom:6, border:`1px solid ${C.border}`, opacity:0.7 }}>
              <span style={{ fontSize:12 }}>Zi. {o.room} — {o.items.map(i=>`${i.qty}× ${i.name}`).join(", ")} — {o.total}€</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ============ HOUSEKEEPING ============
function Housekeeping({ tasks, setTasks, notify, alerts=[], guests=[] }) {
  const statusC = { open:C.err, in_progress:C.warn, completed:C.ok };
  const statusL = { open:"Offen", in_progress:"In Bearbeitung", completed:"Erledigt" };
  const next = { open:"in_progress", in_progress:"completed" };
  const advance = id => {
    const task = tasks.find(t=>t.id===id);
    if(task.status==="open") {
      const guest = guests.find(g=>g.room===task.room);
      sendNotifyWebhook({
        category: "housekeeping",
        room: task.room,
        phone_number: guest?.phone || "",
        language: guest?.language || "german",
        status: "accepted"
      });
    }
    setTasks(p=>p.map(t=>t.id===id?{...t,status:next[t.status]||t.status}:t));
    notify(task.status==="in_progress"?"Auftrag erledigt ✓":"Angenommen — Gast wird benachrichtigt ✉️");
  };
  const active = tasks.filter(t=>t.status!=="completed");

  return (
    <div style={{ animation:"fadeUp .35s ease" }}>
      <SectionHeader title="Housekeeping" subtitle={`${active.length} offene Aufträge`} />
      <AlertBanner alerts={alerts} />
      <div style={{ display:"grid", gap:12 }}>
        {active.map(t => (
          <Card key={t.id} style={{ padding:20, borderLeft:`3px solid ${statusC[t.status]}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
              <div>
                <span style={{ fontFamily:"'Libre Baskerville',serif", fontSize:20, fontWeight:700, color:C.navy }}>Zimmer {t.room}</span>
                <p style={{ margin:"4px 0 0", fontSize:13 }}>{t.request}</p>
              </div>
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                {t.priority==="urgent" && <span style={{ ...badge(C.err), fontWeight:700 }}>DRINGEND</span>}
                <span style={badge(statusC[t.status])}>{statusL[t.status]}</span>
              </div>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:11, color:C.dim }}>Eingang: {t.created} Uhr</span>
              <button onClick={()=>advance(t.id)} style={t.status==="open"?btn("secondary"):btn("success")}>
                {t.status==="open" ? "Annehmen" : "Erledigt ✓"}
              </button>
            </div>
          </Card>
        ))}
        {active.length===0 && (
          <Card style={{ padding:48, textAlign:"center" }}>
            <p style={{ color:C.dim, fontSize:15, margin:0 }}>Alle Aufträge erledigt ✓</p>
          </Card>
        )}
      </div>
    </div>
  );
}

// ============ MAINTENANCE ============
function Maintenance({ tasks, setTasks, notify, alerts=[], guests=[] }) {
  const statusC = { open:C.err, in_progress:C.warn, completed:C.ok };
  const statusL = { open:"Offen", in_progress:"In Bearbeitung", completed:"Erledigt" };
  const next = { open:"in_progress", in_progress:"completed" };
  const advance = id => {
    const task = tasks.find(t=>t.id===id);
    if(task.status==="open") {
      const guest = guests.find(g=>g.room===task.room);
      sendNotifyWebhook({
        category: "maintenance",
        room: task.room,
        phone_number: guest?.phone || "",
        language: guest?.language || "german",
        status: "accepted"
      });
    }
    setTasks(p=>p.map(t=>t.id===id?{...t,status:next[t.status]||t.status}:t));
    notify(task.status==="in_progress"?"Reparatur abgeschlossen ✓":"Angenommen — Gast wird benachrichtigt ✉️");
  };

  return (
    <div style={{ animation:"fadeUp .35s ease" }}>
      <SectionHeader title="Technischer Dienst" subtitle={`${tasks.filter(t=>t.status!=="completed").length} offene Meldungen`} />
      <AlertBanner alerts={alerts} />
      <div style={{ display:"grid", gap:12 }}>
        {tasks.filter(t=>t.status!=="completed").map(t => (
          <Card key={t.id} style={{ padding:20, borderLeft:`3px solid ${statusC[t.status]}` }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
              <div>
                <span style={{ fontFamily:"'Libre Baskerville',serif", fontSize:20, fontWeight:700, color:C.navy }}>Zimmer {t.room}</span>
                <p style={{ margin:"4px 0 2px", fontSize:13, fontWeight:500 }}>{t.problem}</p>
                <p style={{ margin:0, fontSize:11, color:C.dim }}>Ort: {t.location}</p>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                {t.priority==="urgent" && <span style={{ ...badge(C.err), fontWeight:700 }}>DRINGEND</span>}
                <span style={badge(statusC[t.status])}>{statusL[t.status]}</span>
              </div>
            </div>
            {t.image && <p style={{ margin:"0 0 10px" }}><a href={t.image} target="_blank" style={{ color:C.info, fontSize:12, textDecoration:"none" }}>📷 Foto ansehen</a></p>}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:11, color:C.dim }}>Gemeldet: {t.created} Uhr</span>
              <button onClick={()=>advance(t.id)} style={t.status==="open"?btn("secondary"):btn("success")}>
                {t.status==="open" ? "Annehmen" : "Erledigt ✓"}
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}


// ============ TAXI ============
function Taxi({ requests, setRequests, guests, notify }) {
  const [confirmedTimes, setConfirmedTimes] = useState({});
  const active = requests.filter(r=>r.status==="open");
  const done = requests.filter(r=>r.status==="confirmed");

  const confirm = (req) => {
    const time = confirmedTimes[req.id] || req.requested_time;
    if(!time) { notify("Bitte bestätigte Uhrzeit eingeben","err"); return; }
    const guest = guests.find(g=>g.id===req.guestId);
    sendNotifyWebhook({
      category: "taxi",
      room: req.room,
      phone_number: guest?.phone || "",
      language: guest?.language || "german",
      destination: req.destination,
      confirmed_time: time,
      status: "accepted"
    });
    setRequests(p=>p.map(r=>r.id===req.id?{...r,status:"confirmed",confirmed_time:time}:r));
    notify(`Bestätigt — Gast wird über ${time} Uhr informiert ✉️`);
  };

  return (
    <div style={{ animation:"fadeUp .35s ease" }}>
      <SectionHeader title="Taxi" subtitle={`${active.length} offene Anfragen`} />

      {active.length===0 && (
        <Card style={{ padding:48, textAlign:"center" }}>
          <p style={{ color:C.dim, fontSize:15, margin:0 }}>Keine offenen Taxi-Anfragen ✓</p>
        </Card>
      )}

      <div style={{ display:"grid", gap:14, marginBottom:28 }}>
        {active.map(req => {
          const guest = guests.find(g=>g.id===req.guestId);
          return (
            <Card key={req.id} style={{ padding:20, borderLeft:`3px solid ${C.warn}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
                <div>
                  <span style={{ fontFamily:"'Libre Baskerville',serif", fontSize:20, fontWeight:700, color:C.navy }}>
                    🚕 Zimmer {req.room}
                  </span>
                  {guest && <span style={{ color:C.dim, fontSize:12, marginLeft:10 }}>{guest.name}</span>}
                </div>
                <span style={badge(C.warn)}>Wartet auf Bestätigung</span>
              </div>

              <div style={{ background:C.bg, borderRadius:4, padding:"12px 16px", marginBottom:16, display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <p style={{ margin:"0 0 2px", fontSize:10, color:C.dim, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600 }}>Ziel</p>
                  <p style={{ margin:0, fontSize:14, fontWeight:600 }}>{req.destination}</p>
                </div>
                <div>
                  <p style={{ margin:"0 0 2px", fontSize:10, color:C.dim, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600 }}>Gewünschte Uhrzeit</p>
                  <p style={{ margin:0, fontSize:14, fontWeight:600, color:C.navy }}>{req.requested_time} Uhr</p>
                </div>
                <div>
                  <p style={{ margin:"0 0 2px", fontSize:10, color:C.dim, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600 }}>Personen</p>
                  <p style={{ margin:0, fontSize:14, fontWeight:600 }}>{req.persons || "–"}</p>
                </div>
                <div>
                  <p style={{ margin:"0 0 2px", fontSize:10, color:C.dim, textTransform:"uppercase", letterSpacing:"0.08em", fontWeight:600 }}>Gepäck</p>
                  <p style={{ margin:0, fontSize:14, fontWeight:600 }}>{req.luggage || "Keines angegeben"}</p>
                </div>
              </div>

              <div style={{ display:"flex", gap:10, alignItems:"center" }}>
                <div style={{ flex:1 }}>
                  <label style={{ ...lbl, marginBottom:4 }}>Bestätigte Uhrzeit</label>
                  <input
                    type="time"
                    defaultValue={req.requested_time}
                    onChange={e=>setConfirmedTimes(p=>({...p,[req.id]:e.target.value}))}
                    style={{ ...inp, marginBottom:0, width:"100%" }}
                  />
                </div>
                <button onClick={()=>confirm(req)}
                  style={{ ...btn("primary"), marginTop:20, whiteSpace:"nowrap", padding:"10px 20px" }}>
                  ✓ Bestätigen & Gast informieren
                </button>
              </div>

              <p style={{ margin:"10px 0 0", fontSize:11, color:C.dim }}>
                Anfrage eingegangen: {req.created} Uhr
              </p>
            </Card>
          );
        })}
      </div>

      {done.length > 0 && (
        <>
          <p style={{ fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.1em", color:C.dim, margin:"0 0 12px" }}>Bestätigt</p>
          {done.map(req => {
            const guest = guests.find(g=>g.id===req.guestId);
            return (
              <div key={req.id} style={{ background:C.bg, borderRadius:4, padding:"12px 16px", marginBottom:8, border:`1px solid ${C.border}`, opacity:0.7, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:13 }}>🚕 Zi. {req.room} · {guest?.name} · {req.destination}</span>
                <span style={{ fontSize:13, fontWeight:600, color:C.ok }}>✓ {req.confirmed_time} Uhr bestätigt</span>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ============ BILLING ============
function Billing({ guests, spaBooks, restBooks, rsOrders, rooms }) {
  return (
    <div style={{ animation:"fadeUp .35s ease" }}>
      <SectionHeader title="Rechnungen" subtitle="Offene Konten der aktuellen Gäste" />
      {guests.map(g => {
        const room = rooms.find(r=>r.guestId===g.id);
        if(!room) return null;
        const spa = spaBooks.filter(b=>b.guestId===g.id&&b.status==="confirmed");
        const rs = rsOrders.filter(o=>o.guestId===g.id);
        const nights = 3;
        const roomTotal = nights * room.price;
        const spaTotal = spa.reduce((s,b)=>s+(TREATMENTS.find(t=>t.id===b.treatId)?.price||0),0);
        const rsTotal = rs.reduce((s,o)=>s+o.total,0);
        const total = roomTotal + spaTotal + rsTotal;
        if(total===0) return null;
        return (
          <Card key={g.id} style={{ marginBottom:14, overflow:"hidden" }}>
            <div style={{ padding:"16px 20px", background:C.navy, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontFamily:"'Libre Baskerville',serif", fontSize:16, fontWeight:700, color:"#fff" }}>{g.name}</span>
                {g.vip && <span style={{ color:C.gold, fontSize:12 }}>★ VIP</span>}
                <span style={{ color:"rgba(255,255,255,0.5)", fontSize:12 }}>· Zimmer {g.room}</span>
              </div>
              <span style={{ ...badge(C.warn), background:"rgba(217,119,6,0.2)", border:"1px solid rgba(217,119,6,0.4)" }}>OFFEN</span>
            </div>
            <div style={{ padding:"16px 20px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${C.borderL}`, fontSize:13 }}>
                <span>{nights}× Übernachtung ({room.price}€/Nacht)</span>
                <span style={{ fontWeight:600 }}>{roomTotal}€</span>
              </div>
              {spa.map((b,i) => { const t=TREATMENTS.find(t=>t.id===b.treatId); return (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${C.borderL}`, fontSize:13 }}>
                  <span>SPA: {t?.name}</span><span style={{ fontWeight:600 }}>{t?.price}€</span>
                </div>
              );})}
              {rs.map((o,i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:`1px solid ${C.borderL}`, fontSize:13 }}>
                  <span>Room Service: {o.items.map(i=>`${i.qty}× ${i.name}`).join(", ")}</span>
                  <span style={{ fontWeight:600 }}>{o.total}€</span>
                </div>
              ))}
              <div style={{ display:"flex", justifyContent:"space-between", padding:"12px 0 4px", fontWeight:700, fontSize:15, color:C.navy }}>
                <span>GESAMT</span><span>{total}€</span>
              </div>
              <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:10 }}>
                <button style={btn("ghost")}>Rechnung drucken</button>
                <button style={btn("primary")}>Bezahlt</button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ============ REPORTS ============
function Reports({ guests, rooms, spaBooks, restBooks, rsOrders, hkTasks }) {
  const occ = rooms.filter(r=>r.status==="occupied").length;
  const data = [
    { l:"Zimmer-Auslastung", v:`${Math.round(occ/rooms.length*100)}%`, accent:C.navy },
    { l:"SPA-Termine", v:spaBooks.filter(b=>b.status==="confirmed").length, accent:C.spa },
    { l:"Reservierungen", v:restBooks.filter(b=>b.status==="confirmed").length, accent:C.rest },
    { l:"Room Service Umsatz", v:rsOrders.reduce((s,o)=>s+o.total,0)+"€", accent:C.warn },
    { l:"SPA Umsatz", v:spaBooks.filter(b=>b.status==="confirmed").reduce((s,b)=>s+(TREATMENTS.find(t=>t.id===b.treatId)?.price||0),0)+"€", accent:C.spa },
    { l:"Offene HK-Aufträge", v:hkTasks.filter(t=>t.status!=="completed").length, accent:C.ok },
    { l:"Gäste gesamt", v:guests.length, accent:C.navy },
    { l:"VIP Gäste", v:guests.filter(g=>g.vip).length, accent:C.gold },
  ];
  return (
    <div style={{ animation:"fadeUp .35s ease" }}>
      <SectionHeader title="Berichte & Statistiken" subtitle={`Stand: ${fmtDate(today())} · ${fmtTime()} Uhr`} />
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
        {data.map((d,i) => (
          <Card key={i} style={{ padding:22 }}>
            <p style={{ color:C.dim, fontSize:10, textTransform:"uppercase", letterSpacing:"0.1em", margin:"0 0 10px", fontWeight:600 }}>{d.l}</p>
            <p style={{ fontFamily:"'Libre Baskerville',serif", fontSize:30, fontWeight:700, margin:0, color:d.accent }}>{d.v}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============ MODAL ============
function Modal({ t, onClose, children }) {
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(13,34,69,0.5)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:999 }}>
      <div onClick={e=>e.stopPropagation()}
        style={{ background:C.white, borderRadius:6, border:`1px solid ${C.border}`, padding:28, width:460, maxHeight:"85vh", overflow:"auto", animation:"fadeUp .2s ease", boxShadow:"0 24px 60px rgba(13,34,69,0.15)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24, paddingBottom:16, borderBottom:`1px solid ${C.border}` }}>
          <h3 style={{ fontFamily:"'Libre Baskerville',serif", fontSize:18, fontWeight:700, margin:0, color:C.navy }}>{t}</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", color:C.dim, fontSize:18, cursor:"pointer", lineHeight:1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ============ SPA FORM ============
function SPAForm({ guests, bookings, date, onSubmit }) {
  const [gId,setG]=useState("");const [tId,setT]=useState("");const [d,setD]=useState(date);const [time,setTime]=useState("");
  const avail = SPA_TIMES.filter(s=>{ if(!tId)return true; const t=TREATMENTS.find(t=>t.id===+tId); return bookings.filter(b=>b.date===d&&b.time===s&&b.treatId===+tId&&b.status==="confirmed").length<(t?.capacity||1); });
  const valid = gId && tId && d && time;
  return (
    <div>
      <label style={lbl}>Gast</label>
      <select value={gId} onChange={e=>setG(e.target.value)} style={inp}><option value="">Wählen...</option>{guests.map(g=><option key={g.id} value={g.id}>{g.name} — Zi. {g.room}</option>)}</select>
      <label style={lbl}>Behandlung</label>
      <select value={tId} onChange={e=>setT(e.target.value)} style={inp}><option value="">Wählen...</option>{TREATMENTS.map(t=><option key={t.id} value={t.id}>{t.name} — {t.price}€ ({t.duration}min)</option>)}</select>
      <label style={lbl}>Datum</label>
      <input type="date" value={d} onChange={e=>setD(e.target.value)} style={inp} />
      <label style={lbl}>Uhrzeit</label>
      <select value={time} onChange={e=>setTime(e.target.value)} style={inp}><option value="">Wählen...</option>{avail.map(s=><option key={s} value={s}>{s}</option>)}</select>
      <button onClick={()=>valid&&onSubmit({guestId:+gId,treatId:+tId,date:d,time})} disabled={!valid}
        style={{ ...btn(valid?"primary":"ghost"), width:"100%", marginTop:8, opacity:valid?1:0.5 }}>
        Termin buchen
      </button>
    </div>
  );
}

// ============ RESTAURANT FORM ============
function RestForm({ guests, bookings, date, onSubmit }) {
  const [gId,setG]=useState("");const [d,setD]=useState(date);const [time,setTime]=useState("");const [pers,setPers]=useState(2);const [tbl,setTbl]=useState("");const [notes,setNotes]=useState("");
  const booked = bookings.filter(b=>b.date===d&&b.time===time&&b.status==="confirmed").map(b=>b.tableId);
  const avail = TABLES.filter(t=>!booked.includes(t.id)&&t.seats>=pers);
  const valid = gId && tbl && d && time;
  return (
    <div>
      <label style={lbl}>Gast</label>
      <select value={gId} onChange={e=>setG(e.target.value)} style={inp}><option value="">Wählen...</option>{guests.map(g=><option key={g.id} value={g.id}>{g.name} — Zi. {g.room}</option>)}</select>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <div><label style={lbl}>Datum</label><input type="date" value={d} onChange={e=>setD(e.target.value)} style={inp} /></div>
        <div><label style={lbl}>Personen</label><input type="number" value={pers} onChange={e=>setPers(+e.target.value)} min={1} max={10} style={inp} /></div>
      </div>
      <label style={lbl}>Uhrzeit</label>
      <select value={time} onChange={e=>setTime(e.target.value)} style={inp}><option value="">Wählen...</option>{REST_TIMES.map(t=><option key={t} value={t}>{t}</option>)}</select>
      <label style={lbl}>Tisch {time?`(${avail.length} verfügbar)`:""}</label>
      <select value={tbl} onChange={e=>setTbl(e.target.value)} style={inp}><option value="">Wählen...</option>{avail.map(t=><option key={t.id} value={t.id}>{t.name} — {t.seats}P ({t.location})</option>)}</select>
      <label style={lbl}>Sonderwünsche</label>
      <input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Fensterplatz, Geburtstag..." style={inp} />
      <button onClick={()=>valid&&onSubmit({guestId:+gId,tableId:+tbl,date:d,time,persons:pers,notes})} disabled={!valid}
        style={{ ...btn(valid?"primary":"ghost"), width:"100%", marginTop:8, opacity:valid?1:0.5 }}>
        Reservierung erstellen
      </button>
    </div>
  );
}
