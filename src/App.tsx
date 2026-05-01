import { useState, useEffect, useCallback, ReactNode, CSSProperties } from "react";
import { createClient, Session } from "@supabase/supabase-js";

/* ═══════════════════════════════════════════════════════
   SUPABASE CLIENT
   Les clés sont dans votre fichier .env (jamais dans le code)
═══════════════════════════════════════════════════════ */
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL  as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

/* ═══════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════ */
type DayIndex   = 0|1|2|3|4|5|6;
type Priority   = "low"|"med"|"high";
type Recurrence = "once"|"daily"|"weekly"|"monthly";
type TabId      = "home"|"tasks"|"agenda"|"schedule"|"family";
type IconName   =
  |"home"|"check"|"checkCircle"|"bell"|"users"|"plus"|"search"|"settings"
  |"x"|"trash"|"star"|"clock"|"calendar"|"repeat"|"alert"|"chef"|"cart"
  |"sofa"|"bath"|"bed"|"door"|"dog"|"child"|"broom"|"sparkle"
  |"chevronLeft"|"chevronRight"|"sun"|"moon"|"briefcase"|"flag"|"edit"|"lock"|"mail"|"eye"|"eyeOff"|"wifi";

interface WorkHours { start: string; end: string; }
interface Member {
  id: string; name: string; emoji: string; color: string; avatarBg: string;
  isChild?: boolean; workDays: DayIndex[]; workHours: Partial<Record<DayIndex,WorkHours>>;
}
interface Task {
  id: string; name: string; memberId: string; roomId: string;
  day: DayIndex; priority: Priority; recurrence: Recurrence;
  done: boolean; note?: string; dueTime?: string;
}
interface Grocery  { id: string; name: string; qty: string; done: boolean; }
interface Reminder { id: string; title: string; time: string; day: DayIndex; emoji: string; }
type Meals = Record<DayIndex, string>;
interface Room { id: string; name: string; icon: IconName; color: string; }
interface ConfettiPiece { id: number; color: string; x: number; delay: number; }

/* ═══════════════════════════════════════════════════════
   DB CONVERSION  (snake_case ↔ camelCase)
═══════════════════════════════════════════════════════ */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toTask   = (r: any): Task    => ({id:r.id,name:r.name,memberId:r.member_id,roomId:r.room_id,day:r.day,priority:r.priority,recurrence:r.recurrence,done:r.done,note:r.note??undefined,dueTime:r.due_time??undefined});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toMember = (r: any): Member  => ({id:r.id,name:r.name,emoji:r.emoji,color:r.color,avatarBg:r.avatar_bg,isChild:r.is_child,workDays:r.work_days??[],workHours:r.work_hours??{}});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toGroc   = (r: any): Grocery => ({id:r.id,name:r.name,qty:r.qty,done:r.done});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toRem    = (r: any): Reminder=> ({id:r.id,title:r.title,time:r.time,day:r.day,emoji:r.emoji});

const fromTask   = (t: Task,   uid: string) => ({id:t.id,name:t.name,member_id:t.memberId,room_id:t.roomId,day:t.day,priority:t.priority,recurrence:t.recurrence,done:t.done,note:t.note??null,due_time:t.dueTime??null,user_id:uid});
const fromMember = (m: Member, uid: string, order: number) => ({id:m.id,name:m.name,emoji:m.emoji,color:m.color,avatar_bg:m.avatarBg,is_child:m.isChild??false,work_days:m.workDays,work_hours:m.workHours,sort_order:order,user_id:uid});
const fromGroc   = (g: Omit<Grocery,"id">, uid: string) => ({id:"g"+Date.now(),name:g.name,qty:g.qty,done:g.done,user_id:uid});
const fromRem    = (r: Omit<Reminder,"id">, uid: string) => ({id:"r"+Date.now(),title:r.title,time:r.time,day:r.day,emoji:r.emoji,user_id:uid});

/* ═══════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════ */
const DAYS_S  = ["L","M","M","J","V","S","D"] as const;
const DAYS_S2 = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"] as const;
const DAYS_F  = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi","Dimanche"] as const;
const MONTHS  = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"] as const;
const CONF_CLR= ["#FCE38A","#C8B6FF","#A8D5FF","#FFC0CB","#A8E6B7","#FFCBA4"];
const PASTEL  = [{bg:"#FCE38A",text:"#8B6914"},{bg:"#C8B6FF",text:"#4C3899"},{bg:"#A8D5FF",text:"#1E4D85"},{bg:"#FFC0CB",text:"#8B2F45"},{bg:"#A8E6B7",text:"#1B5E2A"},{bg:"#FFCBA4",text:"#7A4416"}];
const PRIORITY_CONFIG: Record<Priority,{label:string;color:string;bg:string}> = {
  high:{label:"Urgent",color:"#DC2626",bg:"#FEE2E2"},
  med: {label:"Normal",color:"#CA8A04",bg:"#FEF9C3"},
  low: {label:"Faible",color:"#16A34A",bg:"#DCFCE7"},
};
const RECURRENCE_CONFIG: Record<Recurrence,{label:string;short:string}> = {
  once:   {label:"Une fois",       short:"1×"},
  daily:  {label:"Chaque jour",    short:"Quotidien"},
  weekly: {label:"Chaque semaine", short:"Hebdo"},
  monthly:{label:"Chaque mois",    short:"Mensuel"},
};
const MEMBER_COLORS = [
  {color:"#EC4899",avatarBg:"#FCE7F3"},{color:"#3B82F6",avatarBg:"#DBEAFE"},
  {color:"#10B981",avatarBg:"#D1FAE5"},{color:"#A78BFA",avatarBg:"#EDE9FE"},
  {color:"#F59E0B",avatarBg:"#FEF3C7"},{color:"#EF4444",avatarBg:"#FEF2F2"},
];

const DEFAULT_ROOMS: Room[] = [
  {id:"r-salon",  name:"Salon",          icon:"sofa",  color:"#3B82F6"},
  {id:"r-cuisine",name:"Cuisine",        icon:"chef",  color:"#F59E0B"},
  {id:"r-wc",     name:"Toilettes",      icon:"door",  color:"#8B5CF6"},
  {id:"r-ch1",    name:"Chambre parents",icon:"bed",   color:"#EC4899"},
  {id:"r-ch2",    name:"Chambre enfant", icon:"child", color:"#10B981"},
  {id:"r-ch3",    name:"Chambre 3",      icon:"bed",   color:"#6366F1"},
  {id:"r-ch4",    name:"Chambre 4",      icon:"bed",   color:"#14B8A6"},
  {id:"r-sdb1",   name:"Salle de bain 1",icon:"bath",  color:"#0EA5E9"},
  {id:"r-sdb2",   name:"Salle de bain 2",icon:"bath",  color:"#06B6D4"},
  {id:"r-chien",  name:"Chien 🐕",      icon:"dog",   color:"#78716C"},
  {id:"r-general",name:"Général",        icon:"home",  color:"#64748B"},
];

// Aucune donnée personnelle dans le code — tout est saisi par l'utilisateur au premier lancement

/* ═══════════════════════════════════════════════════════
   UTILS
═══════════════════════════════════════════════════════ */
const todayIdx = (): DayIndex => { const d=new Date().getDay(); return (d===0?6:d-1) as DayIndex; };
const isWeekend = (d: DayIndex) => d===5||d===6;

function getColorIdx(str: string): number {
  let h=0; for(let i=0;i<str.length;i++) h=(h*31+str.charCodeAt(i))%PASTEL.length; return Math.abs(h)%PASTEL.length;
}

function isInWorkHours(m: Member, day: DayIndex, time: string): boolean {
  if(!time||!m.workHours[day]) return false;
  const wh=m.workHours[day]!;
  const mins=(t:string)=>{const[h,mm]=t.split(":").map(Number);return h*60+mm;};
  return mins(time)>=mins(wh.start)&&mins(time)<mins(wh.end);
}
function getWorkConflict(memberId:string,day:DayIndex,time:string,members:Member[]): string|null {
  if(!memberId||!time) return null;
  const m=members.find(x=>x.id===memberId);
  if(!m||!isInWorkHours(m,day,time)) return null;
  const wh=m.workHours[day]!;
  return `${m.name} ${m.isChild?"est à l'école":"travaille"} de ${wh.start} à ${wh.end} ce jour-là`;
}

/* ═══════════════════════════════════════════════════════
   GLOBAL CSS
═══════════════════════════════════════════════════════ */
const CSS=`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --bg:#FFFFFF;--soft:#F7F8FA;--soft2:#F0F2F5;--border:#E5E7EB;
  --text:#111827;--muted:#6B7280;--muted2:#9CA3AF;
  --accent:#3B82F6;--accent-bg:#EFF6FF;
  --warn:#F59E0B;--warn-bg:#FFFBEB;
  --danger:#EF4444;--danger-bg:#FEF2F2;
  --green:#10B981;--green-bg:#ECFDF5;
}
body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased;}
input,select,textarea,button{font-family:'Inter',sans-serif;}
::-webkit-scrollbar{width:4px;height:4px;}
::-webkit-scrollbar-thumb{background:#D1D5DB;border-radius:99px;}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
@keyframes confDrop{0%{transform:translateY(-10px) rotate(0);opacity:1;}100%{transform:translateY(90px) rotate(720deg);opacity:0;}}
@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
@keyframes spin{to{transform:rotate(360deg);}}
`;

/* ═══════════════════════════════════════════════════════
   ICONS
═══════════════════════════════════════════════════════ */
const Icon=({name,size=20,color="currentColor",sw=1.8}:{name:IconName;size?:number;color?:string;sw?:number})=>{
  const p={width:size,height:size,viewBox:"0 0 24 24",fill:"none",stroke:color,strokeWidth:sw,strokeLinecap:"round" as const,strokeLinejoin:"round" as const};
  const d:Record<IconName,ReactNode>={
    home:        <><path d="M3 12 12 3l9 9"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></>,
    check:       <><polyline points="4 12 9 17 20 6"/></>,
    checkCircle: <><circle cx="12" cy="12" r="9"/><polyline points="8 12 11 15 16 9"/></>,
    bell:        <><path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 003.4 0"/></>,
    users:       <><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></>,
    plus:        <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
    search:      <><circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="16.5" y2="16.5"/></>,
    settings:    <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></>,
    x:           <><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></>,
    trash:       <><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></>,
    star:        <><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26"/></>,
    clock:       <><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></>,
    calendar:    <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
    repeat:      <><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></>,
    alert:       <><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>,
    chef:        <><path d="M6 13.5V20a1 1 0 001 1h10a1 1 0 001-1v-6.5"/><path d="M5 10a4 4 0 014-4 4 4 0 016-2 4 4 0 014 6 4 4 0 01-4 4H8a3 3 0 01-3-4z"/></>,
    cart:        <><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 002 1.6h9.7a2 2 0 002-1.6L23 6H6"/></>,
    sofa:        <><path d="M20 9V6a2 2 0 00-2-2H6a2 2 0 00-2 2v3"/><path d="M2 11a2 2 0 012 2v3h16v-3a2 2 0 114 0v5H2v-5a2 2 0 012-2z"/></>,
    bath:        <><path d="M9 6L9 2"/><path d="M3 20h18"/><path d="M3 14a2 2 0 01-1-1.73V10a2 2 0 012-2h16a2 2 0 012 2v2.27A2 2 0 0121 14z"/><path d="M5 18v2M19 18v2"/></>,
    bed:         <><path d="M2 4v16M2 8h18a2 2 0 012 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></>,
    door:        <><path d="M3 21h18M9 21V5a2 2 0 012-2h2a2 2 0 012 2v16"/><circle cx="15" cy="13" r=".5" fill="currentColor"/></>,
    dog:         <><path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7 .08.703 1.725 1.722 3.656 2 1.261.188 2.557.023 3.344-.75"/><path d="M14.267 5.172c0-1.39 1.577-2.493 3.5-2.172 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 2-1.261.188-2.557.023-3.344-.75"/><path d="M8 14v.5M16 14v.5M11.25 16.25h1.5L12 17l-.75-.75z"/><path d="M4.42 11.247A13.152 13.152 0 004 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444c0-1.061-.162-2.2-.493-3.309m-7.12-1.064C11.572 10.048 10.671 9.25 8 9c-3 .25-3.229 3.144-2.994 5.75"/><path d="M11.573 9.186A12.756 12.756 0 0116 9c3 .25 3.229 3.144 2.994 5.75"/></>,
    child:       <><circle cx="12" cy="5" r="2"/><path d="M9 20l-1-7 2.5 2 1.5-4 1.5 4L16 13l-1 7"/><path d="M10 10l-1 4M14 10l1 4"/></>,
    broom:       <><path d="M20.21 15.21L19 14l-6.25-6.25"/><path d="M6.8 6.8L4 4M19 14l-9 1-1 3 3 3 3-1 4-9"/></>,
    sparkle:     <><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/></>,
    chevronLeft: <><polyline points="15 18 9 12 15 6"/></>,
    chevronRight:<><polyline points="9 18 15 12 9 6"/></>,
    sun:         <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></>,
    moon:        <><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></>,
    briefcase:   <><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="12"/><path d="M2 12h20"/></>,
    flag:        <><path d="M4 22V4M4 4h13l-2 4 2 4H4"/></>,
    edit:        <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></>,
    lock:        <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></>,
    mail:        <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></>,
    eye:         <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>,
    eyeOff:      <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></>,
    wifi:        <><path d="M5 12.55a11 11 0 0114.08 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 6 0 016.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></>,
  };
  return <svg {...p}>{d[name]}</svg>;
};

/* ═══════════════════════════════════════════════════════
   SHARED STYLES
═══════════════════════════════════════════════════════ */
const IS: CSSProperties={background:"var(--soft)",border:"1.5px solid var(--border)",borderRadius:10,padding:"10px 14px",color:"var(--text)",fontSize:".875rem",fontWeight:500,outline:"none",width:"100%"};
const PB: CSSProperties={background:"var(--text)",border:"none",borderRadius:12,padding:"11px 20px",color:"white",fontSize:".875rem",fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6};
const GB: CSSProperties={...PB,background:"var(--soft)",border:"1.5px solid var(--border)",color:"var(--muted)"};
const navBtn: CSSProperties={width:32,height:32,borderRadius:8,border:"1px solid var(--border)",background:"var(--soft)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--muted)"};

/* ═══════════════════════════════════════════════════════
   FAMILY SETUP SCREEN — premier lancement, aucun nom dans le code
═══════════════════════════════════════════════════════ */
const SETUP_COLORS = [
  {color:"#EC4899",avatarBg:"#FCE7F3"},
  {color:"#3B82F6",avatarBg:"#DBEAFE"},
  {color:"#10B981",avatarBg:"#D1FAE5"},
  {color:"#A78BFA",avatarBg:"#EDE9FE"},
  {color:"#F59E0B",avatarBg:"#FEF3C7"},
  {color:"#EF4444",avatarBg:"#FEF2F2"},
];
const PRESET_EMOJIS = ["👨","👩","👦","👧","👴","👵","🧑","👶"];

interface SetupMember { name: string; emoji: string; isChild: boolean; }

function FamilySetupScreen({onFinish}:{onFinish:(m:Member[])=>Promise<void>}) {
  const [step,    setStep]    = useState<"welcome"|"members"|"done">("welcome");
  const [members, setMembers] = useState<SetupMember[]>([
    {name:"", emoji:"👨", isChild:false},
    {name:"", emoji:"👩", isChild:false},
  ]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string|null>(null);

  const addMember = () => {
    if (members.length >= 6) return;
    setMembers(p => [...p, {name:"", emoji:"🧑", isChild:false}]);
  };
  const removeMember = (i: number) => {
    if (members.length <= 1) return;
    setMembers(p => p.filter((_,j) => j !== i));
  };
  const update = (i: number, field: keyof SetupMember, val: string | boolean) => {
    setMembers(p => p.map((m, j) => j === i ? {...m, [field]: val} : m));
  };

  const handleFinish = async () => {
    const valid = members.filter(m => m.name.trim());
    if (valid.length === 0) { setError("Ajoutez au moins un membre."); return; }
    setError(null); setLoading(true);
    const built: Member[] = valid.map((m, i) => ({
      id:       "m" + Date.now() + i,
      name:     m.name.trim(),
      emoji:    m.emoji,
      isChild:  m.isChild,
      color:    SETUP_COLORS[i % SETUP_COLORS.length].color,
      avatarBg: SETUP_COLORS[i % SETUP_COLORS.length].avatarBg,
      workDays: [],
      workHours: {},
    }));
    await onFinish(built);
    setLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
      {/* Logo */}
      <div style={{width:64,height:64,borderRadius:20,background:"var(--text)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:20,boxShadow:"0 8px 32px rgba(0,0,0,.12)"}}>
        <Icon name="home" size={30} color="white" sw={1.8}/>
      </div>

      {step === "welcome" && (
        <div style={{width:"100%",maxWidth:360,textAlign:"center",animation:"fadeUp .4s ease"}}>
          <h1 style={{fontWeight:900,fontSize:"1.6rem",marginBottom:8}}>Bienvenue !</h1>
          <p style={{fontSize:".9rem",color:"var(--muted)",lineHeight:1.6,marginBottom:32}}>
            Configurons votre foyer en 1 minute.<br/>
            Vos informations seront stockées dans<br/>
            votre base de données privée Supabase.
          </p>
          <div style={{background:"var(--soft)",borderRadius:14,padding:"14px 16px",marginBottom:28,textAlign:"left"}}>
            {[
              {icon:"lock"  as IconName, text:"Données chiffrées — jamais dans le code"},
              {icon:"users" as IconName, text:"Visible uniquement par votre famille"},
              {icon:"wifi"  as IconName, text:"Synchronisé sur tous vos appareils"},
            ].map(({icon,text}) => (
              <div key={text} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <div style={{width:28,height:28,borderRadius:8,background:"var(--accent-bg)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <Icon name={icon} size={14} color="var(--accent)"/>
                </div>
                <span style={{fontSize:".8rem",fontWeight:600,color:"var(--text)"}}>{text}</span>
              </div>
            ))}
          </div>
          <button onClick={() => setStep("members")} style={{...PB,width:"100%",padding:"13px"}}>
            Configurer notre foyer →
          </button>
        </div>
      )}

      {step === "members" && (
        <div style={{width:"100%",maxWidth:360,animation:"fadeUp .35s ease"}}>
          <h1 style={{fontWeight:900,fontSize:"1.4rem",marginBottom:4,textAlign:"center"}}>Les membres</h1>
          <p style={{fontSize:".8rem",color:"var(--muted)",textAlign:"center",marginBottom:20}}>
            Qui fait partie de votre foyer ?
          </p>

          <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
            {members.map((m, i) => (
              <div key={i} style={{background:"var(--soft)",border:"1.5px solid var(--border)",borderRadius:14,padding:"12px 14px",animation:"fadeUp .2s ease"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                  {/* Emoji picker */}
                  <div style={{position:"relative"}}>
                    <select
                      value={m.emoji}
                      onChange={e => update(i, "emoji", e.target.value)}
                      style={{...IS,width:60,textAlign:"center",fontSize:"1.3rem",padding:"6px",background:"white",border:"1.5px solid var(--border)",appearance:"none",cursor:"pointer"}}
                    >
                      {PRESET_EMOJIS.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                  {/* Name */}
                  <input
                    value={m.name}
                    onChange={e => update(i, "name", e.target.value)}
                    placeholder="Prénom…"
                    style={{...IS,flex:1,background:"white"}}
                    autoFocus={i === 0}
                  />
                  {/* Remove */}
                  {members.length > 1 && (
                    <button onClick={() => removeMember(i)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted2)",padding:4,display:"flex",flexShrink:0}}>
                      <Icon name="x" size={16}/>
                    </button>
                  )}
                </div>
                {/* Child toggle */}
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div
                    onClick={() => update(i, "isChild", !m.isChild)}
                    style={{width:36,height:20,borderRadius:10,background:m.isChild?SETUP_COLORS[i%SETUP_COLORS.length].color:"var(--border)",cursor:"pointer",position:"relative",transition:"background .2s",flexShrink:0}}
                  >
                    <div style={{position:"absolute",top:2,left:m.isChild?18:2,width:16,height:16,borderRadius:"50%",background:"white",transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
                  </div>
                  <span style={{fontSize:".78rem",fontWeight:600,color:m.isChild?SETUP_COLORS[i%SETUP_COLORS.length].color:"var(--muted)"}}>
                    {m.isChild ? "Enfant 👧" : "Adulte 🧑"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Add member */}
          {members.length < 6 && (
            <button onClick={addMember} style={{width:"100%",padding:"10px",background:"var(--soft)",border:"1.5px dashed var(--border)",borderRadius:12,color:"var(--muted)",fontSize:".8rem",fontWeight:600,cursor:"pointer",marginBottom:16,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
              <Icon name="plus" size={14} sw={2.5}/> Ajouter un membre
            </button>
          )}

          {error && (
            <div style={{fontSize:".78rem",color:"#DC2626",background:"#FEF2F2",border:"1px solid #FCA5A5",borderRadius:8,padding:"8px 12px",marginBottom:12}}>
              {error}
            </div>
          )}

          <button onClick={handleFinish} disabled={loading} style={{...PB,width:"100%",padding:"13px",opacity:loading?.7:1}}>
            {loading
              ? <><div style={{width:16,height:16,border:"2px solid white",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 1s linear infinite"}}/> Création…</>
              : "Créer notre foyer 🏠"
            }
          </button>

          <p style={{fontSize:".72rem",color:"var(--muted2)",textAlign:"center",marginTop:12}}>
            Vous pourrez modifier tout ça dans l'app ensuite
          </p>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   LOGIN SCREEN
═══════════════════════════════════════════════════════ */
function LoginScreen() {
  const [mode,     setMode]     = useState<"login"|"signup">("login");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string|null>(null);
  const [success,  setSuccess]  = useState<string|null>(null);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) { setError("Veuillez remplir tous les champs."); return; }
    if (password.length < 6) { setError("Le mot de passe doit contenir au moins 6 caractères."); return; }
    setLoading(true); setError(null); setSuccess(null);

    if (mode === "signup") {
      const { error: e } = await supabase.auth.signUp({ email: email.trim(), password });
      if (e) setError(e.message);
      else setSuccess("Compte créé ! Vous pouvez maintenant vous connecter.");
    } else {
      const { error: e } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (e) setError("Email ou mot de passe incorrect.");
    }
    setLoading(false);
  };

  return (
    <div style={{minHeight:"100vh",background:"var(--bg)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
      {/* Logo */}
      <div style={{width:72,height:72,borderRadius:22,background:"var(--text)",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:20,boxShadow:"0 8px 32px rgba(0,0,0,.15)"}}>
        <Icon name="home" size={34} color="white" sw={1.8}/>
      </div>
      <h1 style={{fontWeight:900,fontSize:"1.6rem",marginBottom:4}}>Notre Foyer</h1>
      <p style={{fontSize:".85rem",color:"var(--muted)",marginBottom:32,textAlign:"center"}}>
        {mode==="login" ? "Connectez-vous pour accéder à votre planning familial" : "Créez le compte de votre foyer"}
      </p>

      {/* Form */}
      <div style={{width:"100%",maxWidth:360}}>
        {/* Mode tabs */}
        <div style={{display:"flex",background:"var(--soft)",borderRadius:12,padding:4,marginBottom:20}}>
          {(["login","signup"] as const).map(m=>(
            <button key={m} onClick={()=>{setMode(m);setError(null);setSuccess(null);}} style={{flex:1,padding:"8px 0",border:"none",borderRadius:10,background:mode===m?"white":"transparent",fontWeight:700,fontSize:".82rem",cursor:"pointer",color:mode===m?"var(--text)":"var(--muted)",boxShadow:mode===m?"0 2px 8px rgba(0,0,0,.08)":"none",transition:"all .2s"}}>
              {m==="login" ? "Se connecter" : "Créer un compte"}
            </button>
          ))}
        </div>

        {/* Email */}
        <div style={{position:"relative",marginBottom:12}}>
          <div style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"var(--muted2)"}}><Icon name="mail" size={16}/></div>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email du foyer" style={{...IS,paddingLeft:38,background:"white"}} onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
        </div>

        {/* Password */}
        <div style={{position:"relative",marginBottom:8}}>
          <div style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"var(--muted2)"}}><Icon name="lock" size={16}/></div>
          <input type={showPwd?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mot de passe" style={{...IS,paddingLeft:38,paddingRight:40,background:"white"}} onKeyDown={e=>e.key==="Enter"&&handleSubmit()}/>
          <button onClick={()=>setShowPwd(!showPwd)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"var(--muted2)",padding:2,display:"flex"}}>
            <Icon name={showPwd?"eyeOff":"eye"} size={16}/>
          </button>
        </div>

        {/* Error / Success */}
        {error   && <div style={{fontSize:".78rem",color:"#DC2626",background:"#FEF2F2",border:"1px solid #FCA5A5",borderRadius:8,padding:"8px 12px",marginBottom:12}}>{error}</div>}
        {success && <div style={{fontSize:".78rem",color:"#16A34A",background:"#DCFCE7",border:"1px solid #86EFAC",borderRadius:8,padding:"8px 12px",marginBottom:12}}>{success}</div>}

        {/* Submit */}
        <button onClick={handleSubmit} disabled={loading} style={{...PB,width:"100%",marginTop:8,opacity:loading?.7:1}}>
          {loading
            ? <><div style={{width:16,height:16,border:"2px solid white",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 1s linear infinite"}}/> Chargement…</>
            : mode==="login" ? "Se connecter" : "Créer le compte famille"
          }
        </button>

        {/* Info */}
        <div style={{marginTop:20,background:"var(--soft)",borderRadius:12,padding:"12px 14px"}}>
          <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
            <Icon name="wifi" size={15} color="var(--accent)"/>
            <div style={{fontSize:".75rem",color:"var(--muted)",lineHeight:1.5}}>
              <strong style={{color:"var(--text)"}}>Compte famille partagé</strong><br/>
              Créez un compte, partagez l'email et le mot de passe avec votre famille. Tout le monde voit les mêmes données en temps réel.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   LOADING SCREEN
═══════════════════════════════════════════════════════ */
function LoadingScreen({message="Chargement…"}:{message?:string}) {
  return (
    <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,color:"var(--muted)"}}>
      <div style={{width:56,height:56,borderRadius:16,background:"var(--text)",display:"flex",alignItems:"center",justifyContent:"center"}}>
        <Icon name="home" size={28} color="white" sw={1.8}/>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8,fontSize:".9rem",fontWeight:600}}>
        <div style={{width:18,height:18,border:"2.5px solid var(--border)",borderTopColor:"var(--text)",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
        {message}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   ROOT APP
═══════════════════════════════════════════════════════ */
export default function App() {
  const [session,   setSession]   = useState<Session|null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [dbError,   setDbError]   = useState<string|null>(null);
  const [needsSetup,setNeedsSetup]= useState(false); // true = premier lancement, affiche le formulaire famille
  const [members,   setMembers]   = useState<Member[]>([]);
  const [tasks,     setTasks]     = useState<Task[]>([]);
  const [groceries, setGroceries] = useState<Grocery[]>([]);
  const [meals,     setMeals]     = useState<Meals>({0:"",1:"",2:"",3:"",4:"",5:"",6:""});
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [tab,       setTab]       = useState<TabId>("home");
  const [selDay,    setSelDay]    = useState<DayIndex>(todayIdx());
  const [weekOff,   setWeekOff]   = useState(0);
  const [confetti,  setConfetti]  = useState<ConfettiPiece[]>([]);

  // CSS injection
  useEffect(()=>{ const el=document.createElement("style"); el.textContent=CSS; document.head.appendChild(el); return()=>el.remove(); },[]);

  /* ── AUTH ── */
  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session:s}})=>{ setSession(s); setAuthReady(true); });
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_,s)=>{ setSession(s); if(!s){setDataReady(false);setMembers([]);setTasks([]);} });
    return ()=>subscription.unsubscribe();
  },[]);

  /* ── LOAD DATA ── */
  const loadData = useCallback(async (uid: string) => {
    const [tR,mR,meR,gR,rR] = await Promise.all([
      supabase.from("tasks").select("*").eq("user_id",uid).order("created_at"),
      supabase.from("members").select("*").eq("user_id",uid).order("sort_order"),
      supabase.from("meals").select("*").eq("user_id",uid),
      supabase.from("groceries").select("*").eq("user_id",uid).order("created_at"),
      supabase.from("reminders").select("*").eq("user_id",uid),
    ]);

    const firstErr = [mR.error, tR.error, meR.error, gR.error, rR.error].find(Boolean);
    if (firstErr) {
      console.error("Supabase loadData error:", firstErr);
      setDbError(`Erreur base de données : ${firstErr.message}`);
      setDataReady(true);
      return;
    }
    setDbError(null);

    if (mR.data) {
      if (mR.data.length === 0) {
        // Premier lancement — afficher le formulaire de configuration famille
        setNeedsSetup(true);
        setDataReady(true);
        return;
      } else {
        setMembers(mR.data.map(toMember));
        setNeedsSetup(false);
      }
    }
    if (tR.data && mR.data && mR.data.length>0) setTasks(tR.data.map(toTask));
    if (meR.data) {
      const rec: Meals={0:"",1:"",2:"",3:"",4:"",5:"",6:""};
      meR.data.forEach(r=>{ rec[r.day as DayIndex]=r.meal; });
      setMeals(rec);
    }
    if (gR.data) setGroceries(gR.data.map(toGroc));
    if (rR.data) setReminders(rR.data.map(toRem));
    setDataReady(true);
  },[]);

  useEffect(()=>{ if(session?.user) loadData(session.user.id); },[session,loadData]);

  /* ── REALTIME ── */
  useEffect(()=>{
    if(!session?.user) return;
    const uid=session.user.id;
    const ch=supabase.channel(`foyer-${uid}`)
      .on("postgres_changes",{event:"*",schema:"public",table:"tasks",    filter:`user_id=eq.${uid}`},()=>loadData(uid))
      .on("postgres_changes",{event:"*",schema:"public",table:"members",  filter:`user_id=eq.${uid}`},()=>loadData(uid))
      .on("postgres_changes",{event:"*",schema:"public",table:"meals",    filter:`user_id=eq.${uid}`},()=>loadData(uid))
      .on("postgres_changes",{event:"*",schema:"public",table:"groceries",filter:`user_id=eq.${uid}`},()=>loadData(uid))
      .on("postgres_changes",{event:"*",schema:"public",table:"reminders",filter:`user_id=eq.${uid}`},()=>loadData(uid))
      .subscribe();
    return()=>{ supabase.removeChannel(ch); };
  },[session,loadData]);

  /* ── CONFETTI ── */
  const burst=()=>{
    const p=Array.from({length:14},(_,i)=>({id:Date.now()+i,color:CONF_CLR[i%CONF_CLR.length],x:20+Math.random()*60,delay:Math.random()*.3}));
    setConfetti(p); setTimeout(()=>setConfetti([]),1200);
  };

  /* ── CRUD — toutes les écritures vont vers Supabase, le realtime met à jour l'état ── */
  const uid=()=>session!.user.id;

  const logErr=(op:string,e:{message:string}|null)=>{ if(e){ console.error(`Supabase ${op}:`,e); setDbError(`Erreur (${op}) : ${e.message}`); } };

  const addTask=async(t:Task)=>{
    setTasks(p=>[...p,t]); burst();
    const {error}=await supabase.from("tasks").insert(fromTask(t,uid())); logErr("addTask",error);
  };
  const deleteTask=async(id:string)=>{
    setTasks(p=>p.filter(t=>t.id!==id));
    const {error}=await supabase.from("tasks").delete().eq("id",id); logErr("deleteTask",error);
  };
  const toggleTask=async(id:string)=>{
    const task=tasks.find(t=>t.id===id); if(!task) return;
    const done=!task.done;
    setTasks(p=>p.map(t=>t.id===id?{...t,done}:t));
    if(done) burst();
    const {error}=await supabase.from("tasks").update({done}).eq("id",id); logErr("toggleTask",error);
  };
  const addGrocery=async(g:Omit<Grocery,"id">)=>{
    const row=fromGroc(g,uid());
    setGroceries(p=>[...p,{...g,id:row.id}]);
    const {error}=await supabase.from("groceries").insert(row); logErr("addGrocery",error);
  };
  const toggleGroc=async(id:string)=>{
    const g=groceries.find(x=>x.id===id); if(!g) return;
    const done=!g.done;
    setGroceries(p=>p.map(x=>x.id===id?{...x,done}:x));
    const {error}=await supabase.from("groceries").update({done}).eq("id",id); logErr("toggleGroc",error);
  };
  const deleteGroc=async(id:string)=>{
    setGroceries(p=>p.filter(x=>x.id!==id));
    const {error}=await supabase.from("groceries").delete().eq("id",id); logErr("deleteGroc",error);
  };
  const updateMeals=async(newMeals:Meals)=>{
    setMeals(newMeals);
    const rows=Object.entries(newMeals).map(([d,m])=>({day:parseInt(d),meal:m||"",user_id:uid()}));
    const {error}=await supabase.from("meals").upsert(rows,{onConflict:"day,user_id"}); logErr("updateMeals",error);
  };
  const addReminder=async(r:Omit<Reminder,"id">)=>{
    const row=fromRem(r,uid());
    setReminders(p=>[...p,{...r,id:row.id}]);
    const {error}=await supabase.from("reminders").insert(row); logErr("addReminder",error);
  };
  const deleteRem=async(id:string)=>{
    setReminders(p=>p.filter(x=>x.id!==id));
    const {error}=await supabase.from("reminders").delete().eq("id",id); logErr("deleteRem",error);
  };
  const updateMember=async(m:Member)=>{
    setMembers(p=>p.map(x=>x.id===m.id?m:x));
    const idx=members.findIndex(x=>x.id===m.id);
    const {error}=await supabase.from("members").update(fromMember(m,uid(),idx)).eq("id",m.id); logErr("updateMember",error);
  };
  const addMember=async(m:Pick<Member,"name"|"emoji">)=>{
    const c=MEMBER_COLORS[members.length%MEMBER_COLORS.length];
    const full:Member={id:"m"+Date.now(),...m,...c,workDays:[],workHours:{}};
    setMembers(p=>[...p,full]);
    const {error}=await supabase.from("members").insert(fromMember(full,uid(),members.length)); logErr("addMember",error);
  };
  const deleteMember=async(id:string)=>{
    setMembers(p=>p.filter(m=>m.id!==id));
    const {error}=await supabase.from("members").delete().eq("id",id); logErr("deleteMember",error);
  };
  const signOut=()=>supabase.auth.signOut();

  // Appelée par FamilySetupScreen quand la famille est configurée
  const finishSetup = async (setupMembers: Member[]) => {
    const u = uid();
    const {error}=await supabase.from("members").insert(setupMembers.map((m,i) => fromMember(m, u, i)));
    if (error) { logErr("finishSetup",error); return; }
    setMembers(setupMembers);
    setNeedsSetup(false);
  };

  const weekendWarn=tasks.filter(t=>isWeekend(t.day)&&!t.done).length>=8;
  const rooms=DEFAULT_ROOMS;

  const p={members,tasks,rooms,groceries,meals,reminders,selDay,setSelDay,weekOff,setWeekOff,
    addTask,deleteTask,toggleTask,addGrocery,toggleGroc,deleteGroc,updateMeals,addReminder,deleteRem,
    updateMember,addMember,deleteMember,weekendWarn,burst};

  /* ── RENDER ── */
  if (!authReady)   return <LoadingScreen message="Initialisation…"/>;
  if (!session)     return <LoginScreen/>;
  if (!dataReady)   return <LoadingScreen message="Chargement du foyer…"/>;
  if (needsSetup)   return <FamilySetupScreen onFinish={finishSetup}/>;


  return (
    <div style={{maxWidth:430,margin:"0 auto",minHeight:"100vh",background:"var(--bg)",display:"flex",flexDirection:"column",overflow:"hidden",position:"relative"}}>
      {confetti.map(c=>(
        <div key={c.id} style={{position:"fixed",left:`${c.x}%`,top:"40%",width:9,height:9,borderRadius:2,background:c.color,animationName:"confDrop",animationDuration:".9s",animationDelay:`${c.delay}s`,animationFillMode:"forwards",pointerEvents:"none",zIndex:9999}}/>
      ))}
      {dbError && (
        <div style={{position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,zIndex:9998,padding:"10px 16px",background:"#FEF2F2",borderBottom:"2px solid #FCA5A5",display:"flex",alignItems:"flex-start",gap:8}}>
          <span style={{fontSize:"1rem",flexShrink:0}}>⚠️</span>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:".78rem",color:"#DC2626",marginBottom:2}}>Problème Supabase — les données ne sont pas sauvegardées</div>
            <div style={{fontSize:".72rem",color:"#7F1D1D",fontFamily:"monospace",wordBreak:"break-all"}}>{dbError}</div>
          </div>
          <button onClick={()=>setDbError(null)} style={{background:"none",border:"none",cursor:"pointer",color:"#DC2626",fontSize:16,padding:0,lineHeight:1,flexShrink:0}}>✕</button>
        </div>
      )}
      <div style={{flex:1,overflowY:"auto",paddingBottom:72}}>
        {tab==="home"     && <HomeView     {...p}/>}
        {tab==="tasks"    && <TasksView    {...p}/>}
        {tab==="agenda"   && <AgendaView   {...p}/>}
        {tab==="schedule" && <ScheduleView {...p}/>}
        {tab==="family"   && <FamilyView   {...p} onSignOut={signOut} userEmail={session.user.email??""} />}
      </div>
      <BottomNav tab={tab} setTab={setTab} weekendWarn={weekendWarn}/>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   BOTTOM NAV
═══════════════════════════════════════════════════════ */
function BottomNav({tab,setTab,weekendWarn}:{tab:TabId;setTab:(t:TabId)=>void;weekendWarn:boolean}) {
  const items:{id:TabId;icon:IconName;label:string}[]=[
    {id:"home",     icon:"home",     label:"Accueil"},
    {id:"tasks",    icon:"check",    label:"Tâches"},
    {id:"agenda",   icon:"calendar", label:"Agenda"},
    {id:"schedule", icon:"briefcase",label:"Planning"},
    {id:"family",   icon:"users",    label:"Foyer"},
  ];
  return (
    <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"white",borderTop:"1px solid var(--border)",display:"flex",zIndex:100,padding:"7px 0 10px"}}>
      {items.map(it=>{
        const active=tab===it.id;
        return (
          <button key={it.id} onClick={()=>setTab(it.id)} style={{flex:1,border:"none",background:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"3px 0",color:active?"var(--text)":"var(--muted2)",transition:"color .2s",position:"relative"}}>
            <Icon name={it.icon} size={21} sw={active?2.2:1.7}/>
            <span style={{fontSize:".58rem",fontWeight:active?700:500}}>{it.label}</span>
            {it.id==="schedule"&&weekendWarn&&<span style={{position:"absolute",top:2,right:"18%",width:7,height:7,background:"#F59E0B",borderRadius:"50%",animation:"pulse 1.5s infinite"}}/>}
            {active&&<div style={{position:"absolute",top:0,left:"25%",right:"25%",height:2,background:"var(--text)",borderRadius:99}}/>}
          </button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   VIEW PROPS TYPE
═══════════════════════════════════════════════════════ */
type VP={
  members:Member[];tasks:Task[];rooms:Room[];groceries:Grocery[];meals:Meals;reminders:Reminder[];
  selDay:DayIndex;setSelDay:(d:DayIndex)=>void;weekOff:number;setWeekOff:(n:number)=>void;
  addTask:(t:Task)=>void;deleteTask:(id:string)=>void;toggleTask:(id:string)=>void;
  addGrocery:(g:Omit<Grocery,"id">)=>void;toggleGroc:(id:string)=>void;deleteGroc:(id:string)=>void;
  updateMeals:(m:Meals)=>void;addReminder:(r:Omit<Reminder,"id">)=>void;deleteRem:(id:string)=>void;
  updateMember:(m:Member)=>void;addMember:(m:Pick<Member,"name"|"emoji">)=>void;deleteMember:(id:string)=>void;
  weekendWarn:boolean;burst:()=>void;
};

/* ═══════════════════════════════════════════════════════
   HOME VIEW
═══════════════════════════════════════════════════════ */
function HomeView({members,tasks,meals,reminders,selDay,setSelDay,weekOff,setWeekOff,toggleTask,deleteTask,addTask,weekendWarn}:VP) {
  const today=todayIdx();
  const start=new Date(); start.setDate(start.getDate()-today+weekOff*7);
  const dates=DAYS_S.map((_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d.getDate();});
  const month=MONTHS[new Date(start).getMonth()];

  const[addFor,  setAddFor]  =useState<DayIndex|null>(null);
  const[inName,  setInName]  =useState("");
  const[inMember,setInMember]=useState("");
  const[inRoom,  setInRoom]  =useState("r-general");
  const[inPrio,  setInPrio]  =useState<Priority>("med");
  const[inTime,  setInTime]  =useState("");
  const conflict=getWorkConflict(inMember,addFor??0,inTime,members);

  const submitInline=(day:DayIndex)=>{
    if(!inName.trim()||conflict) return;
    addTask({id:"t"+Date.now(),name:inName.trim(),memberId:inMember,roomId:inRoom,day,priority:inPrio,recurrence:"once",done:false,dueTime:inTime||undefined});
    setInName("");setInMember("");setInRoom("r-general");setInPrio("med");setInTime("");setAddFor(null);
  };

  const dayItems=(d:DayIndex)=>tasks.filter(t=>t.day===d);
  const seen=new Set<DayIndex>();
  const agenda:DayIndex[]=[];
  const push=(d:DayIndex)=>{if(!seen.has(d)){seen.add(d);agenda.push(d);}};
  push(selDay);
  if(selDay!==today&&weekOff===0) push(today);
  for(let i=0;i<7;i++){const d=((today+i)%7) as DayIndex; if(dayItems(d).length) push(d);}

  const weTasks=tasks.filter(t=>isWeekend(t.day));
  const weDone=weTasks.filter(t=>t.done).length;

  return (
    <div style={{animation:"fadeUp .35s ease"}}>
      {/* Header */}
      <div style={{padding:"16px 20px 8px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:10,background:"var(--text)",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="home" size={18} color="white" sw={2}/></div>
          <div>
            <h1 style={{fontWeight:800,fontSize:"1.25rem",lineHeight:1}}>{month}</h1>
            <div style={{fontSize:".65rem",color:"var(--muted)",marginTop:2}}>Semaine {weekOff===0?"courante":weekOff>0?"+"+weekOff:weekOff}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>setWeekOff(weekOff-1)} style={navBtn}><Icon name="chevronLeft" size={16}/></button>
          {weekOff!==0&&<button onClick={()=>setWeekOff(0)} style={{...navBtn,fontSize:".7rem",fontWeight:700,padding:"0 10px",width:"auto"}}>Auj.</button>}
          <button onClick={()=>setWeekOff(weekOff+1)} style={navBtn}><Icon name="chevronRight" size={16}/></button>
        </div>
      </div>

      {weekendWarn&&weekOff===0&&(
        <div style={{margin:"0 16px 8px",background:"var(--warn-bg)",border:"1px solid #FDE68A",borderRadius:12,padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
          <Icon name="alert" size={18} color="#D97706"/>
          <div style={{flex:1}}>
            <div style={{fontSize:".82rem",fontWeight:700,color:"#92400E"}}>Weekend chargé !</div>
            <div style={{fontSize:".7rem",color:"#B45309"}}>{weTasks.length-weDone} tâches restantes Sam-Dim</div>
          </div>
        </div>
      )}

      {/* Week strip */}
      <div style={{padding:"4px 10px 12px",display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
        {DAYS_S.map((_,i)=>{
          const d=i as DayIndex;
          const isTd=d===today&&weekOff===0,isSel=d===selDay,isWe=isWeekend(d);
          const cnt=dayItems(d).length,doneCnt=dayItems(d).filter(t=>t.done).length;
          return (
            <button key={i} onClick={()=>setSelDay(d)} style={{border:"none",background:"none",cursor:"pointer",textAlign:"center",padding:"4px 2px"}}>
              <div style={{fontSize:".58rem",fontWeight:700,color:isWe?"var(--warn)":"var(--muted2)",marginBottom:3,textTransform:"uppercase"}}>{DAYS_S[i]}</div>
              <div style={{width:34,height:34,borderRadius:"50%",margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"center",background:isSel?"var(--text)":isTd?"#F3F4F6":"transparent",fontWeight:isSel||isTd?800:500,fontSize:".95rem",color:isSel?"white":"var(--text)",transition:"all .2s"}}>{dates[i]}</div>
              {cnt>0&&<div style={{marginTop:3,display:"flex",justifyContent:"center"}}><div style={{height:3,borderRadius:99,background:doneCnt===cnt?"var(--green)":"var(--accent)",width:Math.min(24,cnt*6)+"%",minWidth:6,opacity:isSel?.9:.5}}/></div>}
            </button>
          );
        })}
      </div>

      {/* Agenda */}
      <div style={{padding:"0 16px"}}>
        {agenda.map(dayIdx=>{
          const items=dayItems(dayIdx);
          const isToday=dayIdx===today&&weekOff===0,isSel=dayIdx===selDay;
          const lc=isToday?"var(--accent)":isWeekend(dayIdx)?"var(--warn)":"var(--muted2)";
          return (
            <div key={dayIdx} style={{marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <span style={{fontSize:".68rem",fontWeight:800,color:lc,letterSpacing:".6px",textTransform:"uppercase"}}>
                  {isToday?"AUJOURD'HUI · ":""}{DAYS_F[dayIdx].toUpperCase()} {dates[dayIdx]}
                  {isWeekend(dayIdx)&&<span style={{marginLeft:6}}>🏡</span>}
                </span>
                <span style={{fontSize:".65rem",color:"var(--muted2)",fontWeight:600}}>{items.filter(t=>t.done).length}/{items.length} ✓</span>
              </div>
              {items.length===0
                ? <div style={{padding:"4px 0 8px",color:"var(--muted2)",fontSize:".78rem",fontStyle:"italic"}}>Journée libre 😌</div>
                : items.map(t=><HomeTaskCard key={t.id} task={t} members={members} rooms={DEFAULT_ROOMS} onToggle={toggleTask} onDelete={deleteTask}/>)
              }
              {isSel&&(
                addFor===dayIdx?(
                  <div style={{background:"var(--soft)",border:"1.5px solid var(--border)",borderRadius:14,padding:14,marginTop:8,animation:"fadeUp .2s ease"}}>
                    <input autoFocus value={inName} onChange={e=>setInName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!conflict&&submitInline(dayIdx)} placeholder={`Tâche pour ${DAYS_F[dayIdx]}…`} style={{...IS,marginBottom:8,background:"white"}}/>
                    <div style={{display:"flex",gap:8,marginBottom:8}}>
                      <select value={inMember} onChange={e=>setInMember(e.target.value)} style={{...IS,flex:1,background:"white"}}>
                        <option value="">👨‍👩‍👧 Famille</option>
                        {members.map(m=><option key={m.id} value={m.id}>{m.emoji} {m.name}</option>)}
                      </select>
                      <input type="time" value={inTime} onChange={e=>setInTime(e.target.value)} style={{...IS,flex:1,background:"white"}}/>
                    </div>
                    <WorkConflictAlert conflict={conflict}/>
                    <select value={inRoom} onChange={e=>setInRoom(e.target.value)} style={{...IS,marginBottom:8,background:"white"}}>
                      {DEFAULT_ROOMS.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                    <div style={{display:"flex",gap:5,marginBottom:10}}>
                      {(["low","med","high"] as Priority[]).map(p=>{const c=PRIORITY_CONFIG[p];return <button key={p} onClick={()=>setInPrio(p)} style={{flex:1,padding:"7px 4px",border:`1.5px solid ${inPrio===p?c.color:"var(--border)"}`,borderRadius:8,background:inPrio===p?c.bg:"white",color:inPrio===p?c.color:"var(--muted)",fontSize:".7rem",fontWeight:700,cursor:"pointer"}}>{c.label}</button>;})}
                    </div>
                    <div style={{display:"flex",gap:6}}>
                      <button onClick={()=>submitInline(dayIdx)} disabled={!!conflict} style={{...PB,flex:1,padding:"9px 16px",fontSize:".82rem",opacity:conflict?.6:1,cursor:conflict?"not-allowed":"pointer"}}>{conflict?"⚠️ Conflit":"Ajouter ✓"}</button>
                      <button onClick={()=>setAddFor(null)} style={{...GB,padding:"9px 16px",fontSize:".82rem"}}>Annuler</button>
                    </div>
                  </div>
                ):(
                  <button onClick={()=>setAddFor(dayIdx)} style={{width:"100%",padding:"10px",background:"var(--soft)",border:"1.5px dashed var(--border)",borderRadius:12,color:"var(--muted)",fontSize:".8rem",fontWeight:600,cursor:"pointer",marginTop:4,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                    <Icon name="plus" size={14} sw={2.5}/> Ajouter à {DAYS_F[dayIdx]}
                  </button>
                )
              )}
            </div>
          );
        })}

        {/* Weekend bilan */}
        <div style={{background:"var(--soft)",borderRadius:14,padding:"14px 16px",marginBottom:20}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
            <Icon name="sun" size={16} color="#D97706"/>
            <span style={{fontWeight:700,fontSize:".82rem",color:"#92400E"}}>Bilan week-end</span>
            <span style={{marginLeft:"auto",fontSize:".72rem",fontWeight:700,color:"var(--muted2)"}}>{weDone}/{weTasks.length} faites</span>
          </div>
          <div style={{height:6,background:"var(--border)",borderRadius:99,overflow:"hidden"}}>
            <div style={{height:"100%",width:weTasks.length?`${Math.round(weDone/weTasks.length*100)}%`:"0%",background:weekendWarn?"var(--warn)":"var(--green)",transition:"width .6s ease",borderRadius:99}}/>
          </div>
          {weekendWarn&&<div style={{fontSize:".7rem",color:"var(--warn)",marginTop:6,fontWeight:600}}>💡 Déplacez certaines tâches en semaine</div>}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   HOME TASK CARD
═══════════════════════════════════════════════════════ */
function HomeTaskCard({task,members,rooms,onToggle,onDelete}:{task:Task;members:Member[];rooms:Room[];onToggle:(id:string)=>void;onDelete:(id:string)=>void}) {
  const m=members.find(x=>x.id===task.memberId),r=rooms.find(x=>x.id===task.roomId);
  const col=m?.color||r?.color||"#6B7280",bg=m?.avatarBg||PASTEL[2].bg;
  const rc=RECURRENCE_CONFIG[task.recurrence];
  return (
    <div onClick={()=>onToggle(task.id)} style={{display:"flex",alignItems:"stretch",gap:10,marginBottom:8,cursor:"pointer",opacity:task.done?.45:1,animation:"fadeUp .2s ease"}}>
      <div style={{width:44,flexShrink:0,paddingTop:10}}>
        {task.dueTime?<><div style={{fontSize:".8rem",fontWeight:700,lineHeight:1}}>{task.dueTime}</div><div style={{fontSize:".65rem",color:"var(--muted2)",marginTop:2}}>1 tâche</div></>
          :<><div style={{fontSize:".75rem",fontWeight:600,color:"var(--muted)",lineHeight:1}}>Journée</div><div style={{fontSize:".65rem",color:"var(--muted2)",marginTop:2}}>1 tâche</div></>}
      </div>
      <div style={{flex:1,background:bg,borderRadius:13,padding:"10px 12px",display:"flex",alignItems:"center",gap:10,position:"relative",minHeight:52}}>
        <div style={{width:22,height:22,borderRadius:"50%",border:`2.5px solid ${task.done?col:col+"60"}`,background:task.done?col:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:"white",fontSize:".7rem",transition:"all .2s"}}>
          {task.done&&<Icon name="check" size={11} color="white" sw={3}/>}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:".875rem",color:col,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textDecoration:task.done?"line-through":"none"}}>{task.name}</div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:2,flexWrap:"wrap"}}>
            {r&&<span style={{fontSize:".62rem",fontWeight:600,color:col,opacity:.7,display:"flex",alignItems:"center",gap:2}}><Icon name={r.icon} size={10} color={col}/>{r.name}</span>}
            {task.recurrence!=="once"&&<span style={{fontSize:".6rem",fontWeight:700,color:col,opacity:.6}}>{rc.short}</span>}
          </div>
        </div>
        {m&&<div style={{width:28,height:28,borderRadius:"50%",background:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1rem",border:`2px solid ${col}25`,flexShrink:0}}>{m.emoji}</div>}
        {task.priority==="high"&&!task.done&&<div style={{position:"absolute",top:6,right:8,width:6,height:6,borderRadius:"50%",background:"var(--danger)"}}/>}
        <button onClick={e=>{e.stopPropagation();onDelete(task.id);}} style={{position:"absolute",bottom:5,right:8,background:"none",border:"none",cursor:"pointer",color:col,opacity:.35,padding:2,display:"flex"}}>
          <Icon name="x" size={12} sw={2.5}/>
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   TASKS VIEW
═══════════════════════════════════════════════════════ */
function TasksView({members,tasks,addTask,toggleTask,deleteTask}:VP) {
  const[show,  setShow]  =useState(false);
  const[fname, setFname] =useState("");
  const[fm,    setFm]    =useState("");
  const[fr,    setFr]    =useState("r-general");
  const[fd,    setFd]    =useState<string>(String(todayIdx()));
  const[fp,    setFp]    =useState<Priority>("med");
  const[frec,  setFrec]  =useState<Recurrence>("once");
  const[ftime, setFtime] =useState("");
  const[fnote, setFnote] =useState("");
  const[filt,  setFilt]  =useState<"all"|"todo"|"done"|"high"|"weekend">("all");
  const[search,setSearch]=useState("");
  const conflict=getWorkConflict(fm,parseInt(fd) as DayIndex,ftime,members);

  const submit=()=>{
    if(!fname.trim()||conflict) return;
    addTask({id:"t"+Date.now(),name:fname.trim(),memberId:fm,roomId:fr,day:parseInt(fd) as DayIndex,priority:fp,recurrence:frec,done:false,note:fnote||undefined,dueTime:ftime||undefined});
    setFname("");setFm("");setFr("r-general");setFp("med");setFrec("once");setFtime("");setFnote("");setShow(false);
  };

  const filtered=[...tasks]
    .filter(t=>{
      if(search&&!t.name.toLowerCase().includes(search.toLowerCase())) return false;
      if(filt==="todo") return !t.done;
      if(filt==="done") return t.done;
      if(filt==="high") return t.priority==="high"&&!t.done;
      if(filt==="weekend") return isWeekend(t.day)&&!t.done;
      return true;
    })
    .sort((a,b)=>({high:0,med:1,low:2}[a.priority]-{high:0,med:1,low:2}[b.priority]||a.day-b.day));

  const urgentCount=tasks.filter(t=>t.priority==="high"&&!t.done).length;

  return (
    <div style={{animation:"fadeUp .35s ease"}}>
      <PgHdr title="Tâches" sub={`${tasks.filter(t=>!t.done).length} à faire · ${tasks.filter(t=>t.done).length} faites`}/>
      <div style={{padding:"14px 16px"}}>
        <div style={{position:"relative",marginBottom:12}}>
          <div style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"var(--muted2)"}}><Icon name="search" size={15}/></div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Rechercher…" style={{...IS,paddingLeft:36}}/>
        </div>
        <div style={{display:"flex",gap:6,marginBottom:12,overflowX:"auto",scrollbarWidth:"none"}}>
          {([["all","Toutes"],["todo","À faire"],["done","Faites"],["high",`🔴 Urgentes${urgentCount>0?" ("+urgentCount+")":""}`],["weekend","🏡 Week-end"]] as const).map(([v,l])=>(
            <Chip key={v} label={l} active={filt===v} onClick={()=>setFilt(v)}/>
          ))}
        </div>

        {show?(
          <div style={{background:"var(--soft)",border:"1px solid var(--border)",borderRadius:16,padding:16,marginBottom:14,animation:"fadeUp .2s ease"}}>
            <input value={fname} onChange={e=>setFname(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="Nom de la tâche…" style={{...IS,marginBottom:8,background:"white"}}/>
            <div style={{display:"flex",gap:8,marginBottom:8}}>
              <select value={fm} onChange={e=>setFm(e.target.value)} style={{...IS,flex:1,background:"white"}}>
                <option value="">👨‍👩‍👧 Famille</option>
                {members.map(m=><option key={m.id} value={m.id}>{m.emoji} {m.name}</option>)}
              </select>
              <select value={fd} onChange={e=>setFd(e.target.value)} style={{...IS,flex:1,background:"white"}}>
                {DAYS_F.map((d,i)=><option key={i} value={i}>{d}</option>)}
              </select>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:8}}>
              <select value={fr} onChange={e=>setFr(e.target.value)} style={{...IS,flex:1,background:"white"}}>
                {DEFAULT_ROOMS.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <input type="time" value={ftime} onChange={e=>setFtime(e.target.value)} style={{...IS,flex:1,background:"white"}}/>
            </div>
            <div style={{display:"flex",gap:5,marginBottom:8}}>
              {(["low","med","high"] as Priority[]).map(p=>{const c=PRIORITY_CONFIG[p];return <button key={p} onClick={()=>setFp(p)} style={{flex:1,padding:"7px 4px",border:`1.5px solid ${fp===p?c.color:"var(--border)"}`,borderRadius:8,background:fp===p?c.bg:"white",color:fp===p?c.color:"var(--muted)",fontSize:".7rem",fontWeight:700,cursor:"pointer"}}>{c.label}</button>;})}
            </div>
            <div style={{display:"flex",gap:5,marginBottom:8}}>
              {(["once","daily","weekly","monthly"] as Recurrence[]).map(rec=>{const a=frec===rec;return <button key={rec} onClick={()=>setFrec(rec)} style={{flex:1,padding:"6px 4px",border:`1.5px solid ${a?"var(--text)":"var(--border)"}`,borderRadius:8,background:a?"var(--text)":"white",color:a?"white":"var(--muted)",fontSize:".65rem",fontWeight:700,cursor:"pointer"}}>{RECURRENCE_CONFIG[rec].short}</button>;})}
            </div>
            <input value={fnote} onChange={e=>setFnote(e.target.value)} placeholder="Note optionnelle…" style={{...IS,marginBottom:8,background:"white",fontSize:".8rem"}}/>
            <WorkConflictAlert conflict={conflict}/>
            <div style={{display:"flex",gap:8}}>
              <button onClick={submit} disabled={!!conflict} style={{...PB,flex:1,opacity:conflict?.6:1,cursor:conflict?"not-allowed":"pointer"}}>{conflict?"⚠️ Conflit":"Ajouter ✓"}</button>
              <button onClick={()=>setShow(false)} style={{...GB,flex:1}}>Annuler</button>
            </div>
          </div>
        ):(
          <button onClick={()=>setShow(true)} style={{...PB,width:"100%",marginBottom:12}}>
            <Icon name="plus" size={16} sw={2.5}/> Nouvelle tâche
          </button>
        )}

        {!show&&(
          <div style={{marginBottom:14}}>
            <div style={{fontSize:".68rem",fontWeight:800,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:8}}>Suggestions rapides</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {["Faire la vaisselle","Passer l'aspirateur","Sortir les poubelles","Faire la lessive","Préparer les repas","Nettoyer la cuisine"].map(s=>(
                <button key={s} onClick={()=>{setFname(s);setShow(true);}} style={{background:"var(--soft)",border:"1px solid var(--border)",borderRadius:8,padding:"5px 10px",fontSize:".72rem",fontWeight:600,color:"var(--muted)",cursor:"pointer"}}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {filtered.length===0
          ?<Empty iconName="checkCircle" text="Aucune tâche ici !"/>
          :<div style={{display:"flex",flexDirection:"column",gap:8}}>{filtered.map(t=><FullTaskCard key={t.id} task={t} members={members} rooms={DEFAULT_ROOMS} onToggle={toggleTask} onDelete={deleteTask}/>)}</div>
        }
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   FULL TASK CARD
═══════════════════════════════════════════════════════ */
function FullTaskCard({task,members,rooms,onToggle,onDelete}:{task:Task;members:Member[];rooms:Room[];onToggle:(id:string)=>void;onDelete:(id:string)=>void}) {
  const m=members.find(x=>x.id===task.memberId),r=rooms.find(x=>x.id===task.roomId);
  const pc=PRIORITY_CONFIG[task.priority],rc=RECURRENCE_CONFIG[task.recurrence];
  const col=m?.color||r?.color||"#6B7280",bg=m?.avatarBg||"#F3F4F6";
  return (
    <div style={{background:bg,borderRadius:13,padding:"11px 13px",marginBottom:8,animation:"fadeUp .2s ease",opacity:task.done?.45:1}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div onClick={()=>onToggle(task.id)} style={{width:24,height:24,borderRadius:"50%",border:`2.5px solid ${task.done?col:col+"70"}`,background:task.done?col:"white",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,cursor:"pointer",transition:"all .2s"}}>
          {task.done&&<Icon name="check" size={12} color="white" sw={3}/>}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:".875rem",color:col,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textDecoration:task.done?"line-through":"none"}}>{task.name}</div>
          <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap",marginTop:2}}>
            <span style={{fontSize:".6rem",fontWeight:700,padding:"1px 6px",borderRadius:99,background:pc.bg,color:pc.color}}>{pc.label}</span>
            {r&&<span style={{fontSize:".6rem",color:col,opacity:.65,display:"flex",alignItems:"center",gap:2}}><Icon name={r.icon} size={10} color={col}/>{r.name}</span>}
            <span style={{fontSize:".6rem",color:"var(--muted2)"}}>{DAYS_S2[task.day]}</span>
            {task.recurrence!=="once"&&<span style={{fontSize:".6rem",color:col,opacity:.65,display:"flex",alignItems:"center",gap:2}}><Icon name="repeat" size={9} color={col}/>{rc.short}</span>}
            {task.dueTime&&<span style={{fontSize:".6rem",color:"var(--muted2)",display:"flex",alignItems:"center",gap:2}}><Icon name="clock" size={9}/>{task.dueTime}</span>}
          </div>
          {task.note&&<div style={{fontSize:".7rem",color:"var(--muted)",marginTop:3,fontStyle:"italic"}}>{task.note}</div>}
        </div>
        {m&&<div style={{width:28,height:28,borderRadius:"50%",background:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:".95rem",flexShrink:0}}>{m.emoji}</div>}
        <button onClick={()=>onDelete(task.id)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--muted2)",padding:4,display:"flex"}}><Icon name="trash" size={13} sw={1.8}/></button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   AGENDA VIEW (calendrier mensuel)
═══════════════════════════════════════════════════════ */
function AgendaView({tasks,members,rooms}:VP) {
  const today=new Date();
  const[viewDate,setViewDate]=useState(new Date(today.getFullYear(),today.getMonth(),1));
  const[detailDay,setDetailDay]=useState<number|null>(null);

  const year=viewDate.getFullYear(),month=viewDate.getMonth();
  const daysInMonth=new Date(year,month+1,0).getDate();
  const firstMon=(()=>{const d=new Date(year,month,1).getDay();return d===0?6:d-1;})();
  const isCurrentMonth=today.getFullYear()===year&&today.getMonth()===month;

  const tasksByDom=(dom:number)=>{const date=new Date(year,month,dom);const dow=(date.getDay()===0?6:date.getDay()-1) as DayIndex;return tasks.filter(t=>t.day===dow);};
  const selDow=detailDay?((new Date(year,month,detailDay).getDay()===0?6:new Date(year,month,detailDay).getDay()-1) as DayIndex):null;
  const selTasks=selDow!==null?tasks.filter(t=>t.day===selDow):[];

  return (
    <div style={{animation:"fadeUp .35s ease"}}>
      <div style={{padding:"16px 20px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid var(--border)"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:10,background:"var(--text)",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="calendar" size={18} color="white" sw={2}/></div>
          <div>
            <h1 style={{fontWeight:800,fontSize:"1.2rem",lineHeight:1}}>{MONTHS[month]} {year}</h1>
            <div style={{fontSize:".65rem",color:"var(--muted)",marginTop:2}}>{daysInMonth} jours · {tasks.length} tâches</div>
          </div>
        </div>
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>setViewDate(new Date(year,month-1,1))} style={navBtn}><Icon name="chevronLeft" size={16}/></button>
          <button onClick={()=>{setViewDate(new Date(today.getFullYear(),today.getMonth(),1));setDetailDay(today.getDate());}} style={{...navBtn,fontSize:".65rem",fontWeight:700,padding:"0 8px",width:"auto"}}>Auj.</button>
          <button onClick={()=>setViewDate(new Date(year,month+1,1))} style={navBtn}><Icon name="chevronRight" size={16}/></button>
        </div>
      </div>

      <div style={{padding:"12px 16px 0"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
          {["L","M","M","J","V","S","D"].map((d,i)=><div key={i} style={{textAlign:"center",fontSize:".62rem",fontWeight:700,color:i>=5?"var(--warn)":"var(--muted2)",padding:"2px 0"}}>{d}</div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:16}}>
          {Array.from({length:firstMon}).map((_,i)=><div key={"e"+i}/>)}
          {Array.from({length:daysInMonth}).map((_,i)=>{
            const dom=i+1;
            const date=new Date(year,month,dom);
            const dow=(date.getDay()===0?6:date.getDay()-1) as DayIndex;
            const isToday=isCurrentMonth&&dom===today.getDate(),isSel=detailDay===dom,isWe=dow>=5;
            const dtl=tasksByDom(dom);
            const doneAll=dtl.length>0&&dtl.every(t=>t.done),hasHigh=dtl.some(t=>t.priority==="high"&&!t.done);
            const dotColors=[...new Set(dtl.map(t=>members.find(m=>m.id===t.memberId)?.color).filter(Boolean))].slice(0,3) as string[];
            return (
              <button key={dom} onClick={()=>setDetailDay(isSel?null:dom)} style={{border:`1.5px solid ${isSel?"var(--text)":isToday?"var(--accent)":"transparent"}`,borderRadius:10,padding:"5px 2px 4px",background:isSel?"var(--text)":isToday?"var(--accent-bg)":"transparent",cursor:"pointer",textAlign:"center",transition:"all .15s",position:"relative"}}>
                <div style={{fontSize:".88rem",fontWeight:isToday||isSel?800:500,color:isSel?"white":isToday?"var(--accent)":isWe?"#D97706":"var(--text)",lineHeight:1.2}}>{dom}</div>
                <div style={{display:"flex",justifyContent:"center",gap:2,marginTop:3,minHeight:5}}>
                  {dtl.length===0?null:doneAll?<div style={{width:5,height:5,borderRadius:"50%",background:isSel?"white":"var(--green)"}}/>:dotColors.length>0?dotColors.map((c,ci)=><div key={ci} style={{width:4,height:4,borderRadius:"50%",background:isSel?"white":c}}/>):<div style={{width:4,height:4,borderRadius:"50%",background:isSel?"white":"var(--accent)"}}/>}
                </div>
                {hasHigh&&<div style={{position:"absolute",top:2,right:3,width:5,height:5,borderRadius:"50%",background:"var(--danger)"}}/>}
              </button>
            );
          })}
        </div>

        {detailDay&&selDow!==null&&(
          <div style={{background:"var(--soft)",border:"1px solid var(--border)",borderRadius:16,padding:14,marginBottom:16,animation:"fadeUp .2s ease"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <div>
                <div style={{fontWeight:800,fontSize:".95rem"}}>{DAYS_F[selDow]} {detailDay} {MONTHS[month]}</div>
                <div style={{fontSize:".68rem",color:"var(--muted)",marginTop:1}}>{selTasks.filter(t=>t.done).length}/{selTasks.length} tâches</div>
              </div>
              <button onClick={()=>setDetailDay(null)} style={{width:28,height:28,borderRadius:8,border:"1px solid var(--border)",background:"white",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:"var(--muted)"}}><Icon name="x" size={13}/></button>
            </div>
            {selTasks.length===0?<div style={{textAlign:"center",padding:"16px 0",color:"var(--muted2)",fontSize:".8rem",fontStyle:"italic"}}>Aucune tâche ce jour 😌</div>:(
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {selTasks.map(t=>{
                  const m=members.find(x=>x.id===t.memberId),r=rooms.find(x=>x.id===t.roomId);
                  const col=m?.color||r?.color||"#6B7280",pc=PRIORITY_CONFIG[t.priority];
                  return (
                    <div key={t.id} style={{background:"white",borderRadius:10,padding:"9px 12px",display:"flex",alignItems:"center",gap:9,borderLeft:`3px solid ${col}`}}>
                      <div style={{width:18,height:18,borderRadius:"50%",border:`2px solid ${t.done?col:col+"60"}`,background:t.done?col:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        {t.done&&<Icon name="check" size={9} color="white" sw={3}/>}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:600,fontSize:".8rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textDecoration:t.done?"line-through":"none",color:col}}>{t.name}</div>
                        <div style={{display:"flex",gap:5,alignItems:"center",marginTop:1}}>
                          <span style={{fontSize:".58rem",fontWeight:700,padding:"1px 5px",borderRadius:99,background:pc.bg,color:pc.color}}>{pc.label}</span>
                          {r&&<span style={{fontSize:".58rem",color:"var(--muted2)"}}>{r.name}</span>}
                          {t.dueTime&&<span style={{fontSize:".58rem",color:"var(--muted2)"}}>{t.dueTime}</span>}
                        </div>
                      </div>
                      {m&&<div style={{fontSize:"1rem",flexShrink:0}}>{m.emoji}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:20}}>
          {[{label:"Ce mois",val:tasks.length,color:"var(--accent)"},{label:"Faites",val:tasks.filter(t=>t.done).length,color:"var(--green)"},{label:"Urgentes",val:tasks.filter(t=>t.priority==="high"&&!t.done).length,color:"var(--danger)"}].map(({label,val,color})=>(
            <div key={label} style={{background:"var(--soft)",border:"1px solid var(--border)",borderRadius:12,padding:"10px",textAlign:"center"}}>
              <div style={{fontWeight:800,fontSize:"1.4rem",color,lineHeight:1}}>{val}</div>
              <div style={{fontSize:".62rem",color:"var(--muted)",marginTop:3,fontWeight:600}}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SCHEDULE VIEW
═══════════════════════════════════════════════════════ */
function ScheduleView({members,tasks,updateMember}:VP) {
  const[expanded,setExpanded]=useState<string|null>(members[0]?.id||null);
  const dayLoad=DAYS_F.map((_,i)=>tasks.filter(t=>t.day===i&&!t.done).length);
  const maxLoad=Math.max(...dayLoad,1);

  const toggleWorkDay=(m:Member,d:DayIndex)=>{
    const isWork=m.workDays.includes(d);
    const newWorkDays=isWork?m.workDays.filter(x=>x!==d):[...m.workDays,d] as DayIndex[];
    const newWorkHours={...m.workHours};
    if(isWork) delete newWorkHours[d]; else if(!newWorkHours[d]) newWorkHours[d]={start:"09:00",end:"18:00"};
    updateMember({...m,workDays:newWorkDays,workHours:newWorkHours});
  };
  const updateHours=(m:Member,d:DayIndex,field:"start"|"end",val:string)=>{
    updateMember({...m,workHours:{...m.workHours,[d]:{...(m.workHours[d]||{start:"09:00",end:"18:00"}),[field]:val}}});
  };

  const renderMemberCard=(m:Member)=>{
    const isExp=expanded===m.id;
    const dayLabel=m.isChild?"Jour d'école":"Jour travaillé";
    const freeLabel=m.isChild?"Pas d'école":"Jour libre";
    const startLabel=m.isChild?"🎒 Entrée":"🌅 Début";
    const endLabel=m.isChild?"🏠 Sortie":"🌙 Fin";
    return (
      <div key={m.id} style={{background:"var(--soft)",border:"1px solid var(--border)",borderRadius:14,marginBottom:10,overflow:"hidden"}}>
        <button onClick={()=>setExpanded(isExp?null:m.id)} style={{width:"100%",background:"none",border:"none",cursor:"pointer",padding:"12px 14px",display:"flex",alignItems:"center",gap:10,textAlign:"left"}}>
          <div style={{width:34,height:34,borderRadius:"50%",background:m.avatarBg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.1rem",border:`2px solid ${m.color}30`}}>{m.emoji}</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,fontSize:".9rem",color:m.color}}>{m.name}{m.isChild&&<span style={{fontSize:".7rem",fontWeight:500,color:"var(--muted)"}}> · 6 ans 🎒</span>}</div>
            <div style={{fontSize:".65rem",color:"var(--muted)",marginTop:1}}>
              {m.workDays.length} jour{m.workDays.length!==1?"s":""} {m.isChild?"d'école":"travaillé"}
              {m.workDays.length>0&&" · "+m.workDays.map(d=>{const wh=m.workHours[d];return wh?`${DAYS_S2[d]} ${wh.start}–${wh.end}`:DAYS_S2[d];}).join(", ")}
            </div>
          </div>
          <Icon name={isExp?"chevronLeft":"chevronRight"} size={16} color="var(--muted)" sw={2}/>
        </button>
        {isExp&&(
          <div style={{padding:"0 14px 14px",display:"flex",flexDirection:"column",gap:8}}>
            {DAYS_F.map((dayName,i)=>{
              const d=i as DayIndex,isWork=m.workDays.includes(d),isWe=isWeekend(d),wh=m.workHours[d];
              return (
                <div key={i} style={{background:"white",borderRadius:10,padding:"10px 12px",border:`1.5px solid ${isWork?m.color+"50":"var(--border)"}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:isWork?10:0}}>
                    <div style={{width:36,fontWeight:700,fontSize:".78rem",color:isWe?"#D97706":"var(--muted)"}}>{DAYS_S2[i]}</div>
                    <div onClick={()=>toggleWorkDay(m,d)} style={{width:40,height:22,borderRadius:11,background:isWork?m.color:"var(--border)",cursor:"pointer",position:"relative",transition:"background .2s",flexShrink:0}}>
                      <div style={{position:"absolute",top:3,left:isWork?21:3,width:16,height:16,borderRadius:"50%",background:"white",transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.2)"}}/>
                    </div>
                    <span style={{fontSize:".75rem",fontWeight:isWork?700:500,color:isWork?m.color:"var(--muted2)"}}>{isWork?dayLabel:freeLabel}</span>
                    {isWe&&<span style={{fontSize:".65rem",color:"#D97706",marginLeft:"auto"}}>🏡</span>}
                  </div>
                  {isWork&&wh&&(
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,flex:1,background:"var(--soft)",borderRadius:8,padding:"6px 10px"}}>
                        <span style={{fontSize:".8rem"}}>{startLabel.split(" ")[0]}</span>
                        <span style={{fontSize:".68rem",fontWeight:600,color:"var(--muted)"}}>{startLabel.split(" ").slice(1).join(" ")}</span>
                        <input type="time" value={wh.start} onChange={e=>updateHours(m,d,"start",e.target.value)} style={{border:"none",background:"transparent",fontSize:".82rem",fontWeight:700,color:m.color,outline:"none",width:70,cursor:"pointer"}}/>
                      </div>
                      <Icon name="chevronRight" size={14} color="var(--muted2)"/>
                      <div style={{display:"flex",alignItems:"center",gap:6,flex:1,background:"var(--soft)",borderRadius:8,padding:"6px 10px"}}>
                        <span style={{fontSize:".8rem"}}>{endLabel.split(" ")[0]}</span>
                        <span style={{fontSize:".68rem",fontWeight:600,color:"var(--muted)"}}>{endLabel.split(" ").slice(1).join(" ")}</span>
                        <input type="time" value={wh.end} onChange={e=>updateHours(m,d,"end",e.target.value)} style={{border:"none",background:"transparent",fontSize:".82rem",fontWeight:700,color:m.color,outline:"none",width:70,cursor:"pointer"}}/>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{animation:"fadeUp .35s ease"}}>
      <PgHdr title="Planning" sub="Horaires & charge hebdomadaire"/>
      <div style={{padding:"16px"}}>
        <SectionTitle iconName="flag" title="Charge hebdomadaire"/>
        <div style={{background:"var(--soft)",border:"1px solid var(--border)",borderRadius:14,padding:"14px",marginBottom:16}}>
          {DAYS_F.map((d,i)=>{
            const load=dayLoad[i],isWe=isWeekend(i as DayIndex),bar=Math.round(load/maxLoad*100);
            const color=isWe?load>4?"var(--danger)":"var(--warn)":load>6?"var(--danger)":"var(--accent)";
            return (
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,marginBottom:i<6?10:0}}>
                <div style={{width:28,fontSize:".72rem",fontWeight:700,color:isWe?"#D97706":"var(--muted)",flexShrink:0}}>{DAYS_S2[i]}</div>
                <div style={{flex:1,height:8,background:"var(--border)",borderRadius:99,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${bar}%`,background:color,borderRadius:99,transition:"width .5s ease"}}/>
                </div>
                <div style={{width:20,fontSize:".72rem",fontWeight:700,color:"var(--muted)",textAlign:"right"}}>{load}</div>
                {isWe&&load>4&&<Icon name="alert" size={14} color="#D97706"/>}
              </div>
            );
          })}
        </div>
        {dayLoad[5]+dayLoad[6]>8&&(
          <div style={{marginBottom:16,background:"var(--warn-bg)",border:"1px solid #FDE68A",borderRadius:12,padding:"12px 14px"}}>
            <div style={{fontWeight:700,fontSize:".82rem",color:"#92400E",marginBottom:4}}>💡 Conseil</div>
            <div style={{fontSize:".78rem",color:"#B45309",lineHeight:1.5}}>Weekend chargé ({dayLoad[5]+dayLoad[6]} tâches). Pensez à redistribuer en semaine !</div>
          </div>
        )}
        <SectionTitle iconName="briefcase" title="Horaires"/>
        {members.map(renderMemberCard)}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   FOYER VIEW (membres + pièces + cuisine + déco)
═══════════════════════════════════════════════════════ */
function FamilyView({members,tasks,rooms,groceries,meals,reminders,addGrocery,toggleGroc,deleteGroc,updateMeals,addReminder,deleteRem,addTask,toggleTask,deleteTask,addMember,deleteMember,onSignOut,userEmail}:VP&{onSignOut:()=>void;userEmail:string}) {
  const[section,setSection]=useState<"foyer"|"cuisine"|"rappels">("foyer");
  const[selRoom,setSelRoom]=useState<string|null>(null);
  const[showMemberForm,setShowMemberForm]=useState(false);
  const[newName,setNewName]=useState(""),newEmoji=useState("")[0];
  const[nEmoji,setNEmoji]=useState("");

  // Room task form
  const[showRoomForm,setShowRoomForm]=useState(false);
  const[rfName,setRfName]=useState(""),rfMember=useState("")[0];
  const[rfM,setRfM]=useState(""),rfDay=useState(String(todayIdx()))[0];
  const[rfDay2,setRfDay2]=useState(String(todayIdx())),rfPrio=useState<Priority>("med")[0];
  const[rfP,setRfP]=useState<Priority>("med"),rfRec=useState<Recurrence>("once")[0];
  const[rfRec2,setRfRec2]=useState<Recurrence>("once"),rfTime=useState("")[0];
  const[rfTime2,setRfTime2]=useState("");
  const roomConflict=getWorkConflict(rfM,parseInt(rfDay2) as DayIndex,rfTime2,members);
  const submitRoomTask=()=>{
    if(!rfName.trim()||!selRoom||roomConflict) return;
    addTask({id:"t"+Date.now(),name:rfName.trim(),memberId:rfM,roomId:selRoom,day:parseInt(rfDay2) as DayIndex,priority:rfP,recurrence:rfRec2,done:false,dueTime:rfTime2||undefined});
    setRfName("");setRfM("");setRfDay2(String(todayIdx()));setRfP("med");setRfRec2("once");setRfTime2("");setShowRoomForm(false);
  };

  // Grocery
  const[gn,setGn]=useState(""),gq=useState("")[0];
  const[gqVal,setGqVal]=useState("");
  // Meals
  const[ed,setEd]=useState<DayIndex|null>(null),mi=useState("")[0];
  const[miVal,setMiVal]=useState("");
  // Reminders
  const[rt,setRt]=useState(""),rem=useState("")[0];
  const[reTime,setReTime]=useState(""),reDay=useState(String(todayIdx()))[0];
  const[reDayVal,setReDayVal]=useState(String(todayIdx())),reEmoji=useState("🔔")[0];
  const[reEmojiVal,setReEmojiVal]=useState("🔔");

  const room=selRoom?rooms.find(r=>r.id===selRoom):null;
  const roomTasks=selRoom?tasks.filter(t=>t.roomId===selRoom):[];

  return (
    <div style={{animation:"fadeUp .35s ease"}}>
      <div style={{padding:"16px 20px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid var(--border)"}}>
        <div>
          <h1 style={{fontWeight:800,fontSize:"1.3rem"}}>Notre Foyer</h1>
          <div style={{fontSize:".65rem",color:"var(--muted)",marginTop:2}}>100 m² · 3 membres · 1 chien 🐕</div>
        </div>
        <button onClick={onSignOut} style={{...GB,padding:"6px 12px",fontSize:".72rem",gap:5}}>
          <Icon name="lock" size={13}/> Déconnexion
        </button>
      </div>

      {/* Section tabs */}
      <div style={{display:"flex",borderBottom:"1px solid var(--border)",padding:"0 16px"}}>
        {([["foyer","🏠 Foyer"],["cuisine","🍽️ Cuisine"],["rappels","🔔 Rappels"]] as const).map(([s,l])=>(
          <button key={s} onClick={()=>{setSection(s);setSelRoom(null);}} style={{flex:1,border:"none",background:"none",cursor:"pointer",padding:"10px 0",fontSize:".78rem",fontWeight:700,color:section===s?"var(--text)":"var(--muted2)",borderBottom:`2.5px solid ${section===s?"var(--text)":"transparent"}`,marginBottom:-1,transition:"all .2s"}}>{l}</button>
        ))}
      </div>

      <div style={{padding:"16px"}}>

        {/* ── FOYER ── */}
        {section==="foyer"&&!selRoom&&(
          <>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:20}}>
              {[{icon:"check" as IconName,val:tasks.filter(t=>t.done).length,label:"Faites",color:"var(--green)"},{icon:"alert" as IconName,val:tasks.filter(t=>t.priority==="high"&&!t.done).length,label:"Urgentes",color:"var(--danger)"},{icon:"repeat" as IconName,val:tasks.filter(t=>t.recurrence!=="once").length,label:"Récurrentes",color:"var(--accent)"}].map(({icon,val,label,color})=>(
                <div key={label} style={{background:"var(--soft)",border:"1px solid var(--border)",borderRadius:12,padding:"12px 8px",textAlign:"center"}}>
                  <div style={{width:32,height:32,borderRadius:8,background:color+"15",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 6px"}}><Icon name={icon} size={15} color={color}/></div>
                  <div style={{fontWeight:800,fontSize:"1.25rem",color,lineHeight:1}}>{val}</div>
                  <div style={{fontSize:".6rem",color:"var(--muted)",marginTop:2,fontWeight:600}}>{label}</div>
                </div>
              ))}
            </div>

            <SectionTitle iconName="users" title="Les membres"/>
            {members.map(m=>{
              const mt=tasks.filter(t=>t.memberId===m.id),md=mt.filter(t=>t.done).length,pct=mt.length?Math.round(md/mt.length*100):0;
              return (
                <div key={m.id} style={{background:m.avatarBg,borderRadius:14,padding:"12px 14px",marginBottom:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                    <div style={{width:36,height:36,borderRadius:"50%",background:"white",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.1rem",border:`2px solid ${m.color}30`}}>{m.emoji}</div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:".9rem",color:m.color}}>{m.name}</div>
                      <div style={{fontSize:".65rem",color:m.color,opacity:.7,marginTop:1}}>{m.isChild?"6 ans 🌟":m.workDays.length+" j/semaine travaillés"}</div>
                    </div>
                    <div style={{fontSize:".8rem",fontWeight:700,color:m.color,opacity:.8}}>{md}/{mt.length}</div>
                    {members.length>1&&<button onClick={()=>deleteMember(m.id)} style={{background:"none",border:"none",cursor:"pointer",color:m.color,opacity:.4,padding:4,display:"flex"}}><Icon name="trash" size={13}/></button>}
                  </div>
                  <div style={{height:4,background:"rgba(255,255,255,.55)",borderRadius:99,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${pct}%`,background:m.color,transition:"width .6s ease"}}/>
                  </div>
                </div>
              );
            })}
            {showMemberForm?(
              <div style={{background:"var(--soft)",border:"1px solid var(--border)",borderRadius:14,padding:14,marginTop:8,animation:"fadeUp .2s ease"}}>
                <div style={{display:"flex",gap:8,marginBottom:10}}>
                  <input value={nEmoji} onChange={e=>setNEmoji(e.target.value)} placeholder="😊" style={{...IS,width:60,textAlign:"center",fontSize:"1.2rem",background:"white"}}/>
                  <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Prénom…" style={{...IS,flex:1,background:"white"}} onKeyDown={e=>{if(e.key==="Enter"&&newName.trim()){addMember({name:newName.trim(),emoji:nEmoji||"😊"});setNewName("");setNEmoji("");setShowMemberForm(false);}}}/>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>{if(newName.trim()){addMember({name:newName.trim(),emoji:nEmoji||"😊"});setNewName("");setNEmoji("");setShowMemberForm(false);}}} style={{...PB,flex:1,fontSize:".82rem"}}>Ajouter</button>
                  <button onClick={()=>setShowMemberForm(false)} style={{...GB,fontSize:".82rem"}}>Annuler</button>
                </div>
              </div>
            ):(
              <button onClick={()=>setShowMemberForm(true)} style={{width:"100%",padding:"9px",background:"var(--soft)",border:"1.5px dashed var(--border)",borderRadius:12,color:"var(--muted)",fontSize:".78rem",fontWeight:600,cursor:"pointer",marginTop:4,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                <Icon name="plus" size={13} sw={2.5}/> Ajouter un membre
              </button>
            )}

            <div style={{marginTop:20}}>
              <SectionTitle iconName="home" title="Les pièces"/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {rooms.map(r=>{
                  const rt=tasks.filter(t=>t.roomId===r.id),rd=rt.filter(t=>t.done).length,pct=rt.length?Math.round(rd/rt.length*100):0;
                  return (
                    <button key={r.id} onClick={()=>setSelRoom(r.id)} style={{background:"white",border:"1.5px solid var(--border)",borderRadius:14,padding:"12px 12px 10px",textAlign:"left",cursor:"pointer",position:"relative",overflow:"hidden"}}>
                      <div style={{position:"absolute",inset:0,background:r.color,opacity:.04}}/>
                      <div style={{width:32,height:32,borderRadius:8,background:r.color+"18",display:"flex",alignItems:"center",justifyContent:"center",marginBottom:6}}><Icon name={r.icon} size={16} color={r.color}/></div>
                      <div style={{fontWeight:700,fontSize:".78rem",marginBottom:2}}>{r.name}</div>
                      <div style={{fontSize:".65rem",color:"var(--muted)",marginBottom:6}}>{rt.length-rd} à faire</div>
                      <div style={{height:3,background:"var(--border)",borderRadius:99,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:r.color}}/></div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Account info */}
            <div style={{marginTop:20,background:"var(--soft)",border:"1px solid var(--border)",borderRadius:14,padding:"12px 14px",display:"flex",alignItems:"center",gap:10}}>
              <div style={{width:34,height:34,borderRadius:10,background:"#EEE",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="mail" size={16} color="var(--muted)"/></div>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:".82rem"}}>Compte famille</div>
                <div style={{fontSize:".68rem",color:"var(--muted)",marginTop:1}}>{userEmail}</div>
              </div>
              <div style={{width:8,height:8,borderRadius:"50%",background:"var(--green)",boxShadow:"0 0 6px var(--green)"}}/>
            </div>
          </>
        )}

        {/* ── ROOM DETAIL ── */}
        {section==="foyer"&&selRoom&&room&&(
          <div style={{animation:"fadeUp .25s ease"}}>
            <button onClick={()=>{setSelRoom(null);setShowRoomForm(false);}} style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",cursor:"pointer",color:"var(--muted)",fontSize:".8rem",fontWeight:600,marginBottom:12,padding:0}}>
              <Icon name="chevronLeft" size={14}/> Toutes les pièces
            </button>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div style={{width:36,height:36,borderRadius:10,background:room.color+"18",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name={room.icon} size={18} color={room.color}/></div>
              <div style={{flex:1}}><div style={{fontWeight:700,fontSize:"1rem"}}>{room.name}</div><div style={{fontSize:".68rem",color:"var(--muted)"}}>{roomTasks.filter(t=>!t.done).length} à faire · {roomTasks.filter(t=>t.done).length} faites</div></div>
            </div>
            {roomTasks.length>0&&<div style={{height:4,background:"var(--soft)",borderRadius:99,overflow:"hidden",marginBottom:12}}><div style={{height:"100%",width:`${Math.round(roomTasks.filter(t=>t.done).length/roomTasks.length*100)}%`,background:room.color,transition:"width .5s"}}/></div>}
            {roomTasks.length===0&&!showRoomForm&&<div style={{textAlign:"center",padding:"16px 0 8px",color:"var(--muted2)",fontSize:".8rem",fontStyle:"italic"}}>Aucune tâche pour cette pièce 🧹</div>}
            {roomTasks.map(t=><FullTaskCard key={t.id} task={t} members={members} rooms={rooms} onToggle={toggleTask} onDelete={deleteTask}/>)}
            {showRoomForm?(()=>{return(
              <div style={{background:"var(--soft)",border:"1.5px solid var(--border)",borderRadius:14,padding:14,marginTop:8,animation:"fadeUp .2s ease"}}>
                <input autoFocus value={rfName} onChange={e=>setRfName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!roomConflict&&submitRoomTask()} placeholder={`Nouvelle tâche — ${room.name}…`} style={{...IS,marginBottom:8,background:"white"}}/>
                <div style={{display:"flex",gap:8,marginBottom:8}}>
                  <select value={rfM} onChange={e=>setRfM(e.target.value)} style={{...IS,flex:1,background:"white"}}>
                    <option value="">👨‍👩‍👧 Famille</option>
                    {members.map(m=><option key={m.id} value={m.id}>{m.emoji} {m.name}</option>)}
                  </select>
                  <select value={rfDay2} onChange={e=>setRfDay2(e.target.value)} style={{...IS,flex:1,background:"white"}}>
                    {DAYS_F.map((d,i)=><option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
                <div style={{display:"flex",gap:8,marginBottom:8}}>
                  <div style={{display:"flex",gap:5,flex:2}}>
                    {(["low","med","high"] as Priority[]).map(p=>{const c=PRIORITY_CONFIG[p];return <button key={p} onClick={()=>setRfP(p)} style={{flex:1,padding:"7px 4px",border:`1.5px solid ${rfP===p?c.color:"var(--border)"}`,borderRadius:8,background:rfP===p?c.bg:"white",color:rfP===p?c.color:"var(--muted)",fontSize:".68rem",fontWeight:700,cursor:"pointer"}}>{c.label}</button>;})}
                  </div>
                  <input type="time" value={rfTime2} onChange={e=>setRfTime2(e.target.value)} style={{...IS,flex:1,background:"white"}}/>
                </div>
                <WorkConflictAlert conflict={roomConflict}/>
                <div style={{display:"flex",gap:5,marginBottom:10}}>
                  {(["once","daily","weekly","monthly"] as Recurrence[]).map(rec=>{const a=rfRec2===rec;return <button key={rec} onClick={()=>setRfRec2(rec)} style={{flex:1,padding:"6px 4px",border:`1.5px solid ${a?"var(--text)":"var(--border)"}`,borderRadius:8,background:a?"var(--text)":"white",color:a?"white":"var(--muted)",fontSize:".65rem",fontWeight:700,cursor:"pointer"}}>{RECURRENCE_CONFIG[rec].short}</button>;})}
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={submitRoomTask} disabled={!!roomConflict} style={{...PB,flex:1,padding:"9px 16px",fontSize:".82rem",opacity:roomConflict?.6:1,cursor:roomConflict?"not-allowed":"pointer"}}>{roomConflict?"⚠️ Conflit":"Ajouter ✓"}</button>
                  <button onClick={()=>setShowRoomForm(false)} style={{...GB,padding:"9px 16px",fontSize:".82rem"}}>Annuler</button>
                </div>
              </div>
            );})():(
              <button onClick={()=>setShowRoomForm(true)} style={{width:"100%",padding:"10px",background:"var(--soft)",border:`1.5px dashed ${room.color}60`,borderRadius:12,color:room.color,fontSize:".8rem",fontWeight:600,cursor:"pointer",marginTop:8,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                <Icon name="plus" size={14} color={room.color} sw={2.5}/> Ajouter une tâche — {room.name}
              </button>
            )}
          </div>
        )}

        {/* ── CUISINE ── */}
        {section==="cuisine"&&(
          <>
            <SectionTitle iconName="chef" title="Planning repas"/>
            <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:20}}>
              {DAYS_F.map((d,i)=>{
                const di=i as DayIndex;
                return (
                  <div key={i} style={{background:"var(--soft)",border:"1px solid var(--border)",borderRadius:12,padding:"10px 14px",display:"flex",alignItems:"center",gap:12}}>
                    <div style={{width:36,height:36,borderRadius:10,background:di===todayIdx()?"#FEF9C3":"white",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontWeight:800,fontSize:".8rem"}}>{DAYS_S2[i]}</div>
                    {ed===di?(
                      <div style={{display:"flex",flex:1,gap:8}}>
                        <input value={miVal} onChange={e=>setMiVal(e.target.value)} placeholder="Nom du repas…" style={{...IS,flex:1,padding:"6px 10px",fontSize:".8rem",background:"white"}} onKeyDown={e=>{if(e.key==="Enter"){updateMeals({...meals,[di]:miVal});setEd(null);}}} autoFocus/>
                        <button onClick={()=>{updateMeals({...meals,[di]:miVal});setEd(null);}} style={{...PB,padding:"6px 14px",fontSize:".75rem"}}>OK</button>
                      </div>
                    ):(
                      <div style={{flex:1,cursor:"pointer"}} onClick={()=>{setEd(di);setMiVal(meals[di]||"");}}>
                        {meals[di]?<span style={{fontWeight:600,fontSize:".875rem"}}>{meals[di]}</span>:<span style={{color:"var(--muted2)",fontSize:".8rem",fontStyle:"italic"}}>Cliquer pour ajouter…</span>}
                      </div>
                    )}
                    {meals[di]&&ed!==di&&<button onClick={()=>updateMeals({...meals,[di]:""})} style={{background:"none",border:"none",color:"var(--muted2)",cursor:"pointer",padding:5,display:"flex"}}><Icon name="x" size={14}/></button>}
                  </div>
                );
              })}
            </div>

            <SectionTitle iconName="cart" title={`Courses${groceries.filter(g=>!g.done).length>0?" · "+groceries.filter(g=>!g.done).length+" restant"+(groceries.filter(g=>!g.done).length>1?"s":""):""}`}/>
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              <input value={gn} onChange={e=>setGn(e.target.value)} placeholder="Article…" style={{...IS,flex:1,background:"white"}} onKeyDown={e=>{if(e.key==="Enter"&&gn.trim()){addGrocery({name:gn.trim(),qty:gqVal,done:false});setGn("");setGqVal("");}}}/>
              <input value={gqVal} onChange={e=>setGqVal(e.target.value)} placeholder="Qté" style={{...IS,width:70,background:"white"}}/>
              <button onClick={()=>{if(gn.trim()){addGrocery({name:gn.trim(),qty:gqVal,done:false});setGn("");setGqVal("");}}} style={{...PB,padding:"10px 14px"}}><Icon name="plus" size={18} sw={2.4}/></button>
            </div>
            {groceries.length===0?<Empty iconName="cart" text="Liste de courses vide"/>:(
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {groceries.map(g=>(
                  <div key={g.id} onClick={()=>toggleGroc(g.id)} style={{background:"var(--soft)",border:"1px solid var(--border)",borderRadius:12,padding:"10px 14px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",opacity:g.done?.5:1,transition:"opacity .2s"}}>
                    <div style={{width:22,height:22,borderRadius:"50%",border:`2px solid ${g.done?"var(--green)":"var(--border)"}`,background:g.done?"var(--green)":"transparent",display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontSize:".75rem",flexShrink:0,transition:"all .2s"}}>{g.done?"✓":""}</div>
                    <span style={{flex:1,fontWeight:600,fontSize:".875rem",textDecoration:g.done?"line-through":"none"}}>{g.name}</span>
                    {g.qty&&<span style={{fontSize:".75rem",color:"var(--muted2)",fontWeight:600}}>{g.qty}</span>}
                    <button onClick={e=>{e.stopPropagation();deleteGroc(g.id);}} style={{background:"none",border:"none",color:"var(--muted2)",cursor:"pointer",padding:5,display:"flex"}}><Icon name="x" size={14}/></button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── RAPPELS ── */}
        {section==="rappels"&&(
          <>
            <div style={{background:"var(--soft)",border:"1px solid var(--border)",borderRadius:16,padding:16,marginBottom:16}}>
              <div style={{display:"flex",gap:8,marginBottom:10}}>
                <input value={reEmojiVal} onChange={e=>setReEmojiVal(e.target.value)} style={{...IS,width:60,textAlign:"center",fontSize:"1.2rem",background:"white"}}/>
                <input value={rt} onChange={e=>setRt(e.target.value)} placeholder="Titre du rappel…" style={{...IS,flex:1,background:"white"}} onKeyDown={e=>{if(e.key==="Enter"&&rt.trim()){addReminder({title:rt.trim(),time:reTime,day:parseInt(reDayVal) as DayIndex,emoji:reEmojiVal||"🔔"});setRt("");setReTime("");}}}/>
              </div>
              <div style={{display:"flex",gap:8,marginBottom:12}}>
                <select value={reDayVal} onChange={e=>setReDayVal(e.target.value)} style={{...IS,flex:1,background:"white"}}>
                  {DAYS_F.map((d,i)=><option key={i} value={i}>{d}</option>)}
                </select>
                <input type="time" value={reTime} onChange={e=>setReTime(e.target.value)} style={{...IS,flex:1,background:"white"}}/>
              </div>
              <button onClick={()=>{if(rt.trim()){addReminder({title:rt.trim(),time:reTime,day:parseInt(reDayVal) as DayIndex,emoji:reEmojiVal||"🔔"});setRt("");setReTime("");}}} style={{...PB,width:"100%"}}>
                <Icon name="plus" size={16} sw={2.2}/> Ajouter le rappel
              </button>
            </div>
            {reminders.length===0?<Empty iconName="bell" text="Aucun rappel configuré"/>:
              DAYS_F.map((d,i)=>{
                const dr=reminders.filter(r=>r.day===i as DayIndex);
                if(dr.length===0) return null;
                return (
                  <div key={i} style={{marginBottom:14}}>
                    <div style={{fontSize:".68rem",fontWeight:800,color:"var(--muted)",textTransform:"uppercase",letterSpacing:".5px",marginBottom:8}}>{d}</div>
                    {dr.map(r=>(
                      <div key={r.id} style={{background:"#EDE9FE",borderRadius:12,padding:"10px 14px",display:"flex",alignItems:"center",gap:12,marginBottom:6}}>
                        <span style={{fontSize:"1.3rem"}}>{r.emoji}</span>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:700,fontSize:".875rem",color:"#4C3899"}}>{r.title}</div>
                          {r.time&&<div style={{fontSize:".7rem",color:"#7C5CD9"}}>{r.time}</div>}
                        </div>
                        <button onClick={()=>deleteRem(r.id)} style={{background:"none",border:"none",color:"#7C5CD9",cursor:"pointer",padding:5,display:"flex",opacity:.6}}><Icon name="x" size={14}/></button>
                      </div>
                    ))}
                  </div>
                );
              })
            }
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   SHARED MICRO-COMPONENTS
═══════════════════════════════════════════════════════ */
function WorkConflictAlert({conflict}:{conflict:string|null}) {
  if(!conflict) return null;
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,background:"var(--warn-bg)",border:"1px solid #FDE68A",borderRadius:10,padding:"8px 12px",marginBottom:8,animation:"fadeUp .2s ease"}}>
      <Icon name="briefcase" size={14} color="#D97706"/>
      <span style={{fontSize:".75rem",fontWeight:600,color:"#92400E"}}>{conflict} — choisissez une heure en dehors</span>
    </div>
  );
}
function PgHdr({title,sub}:{title:string;sub?:string}) {
  return (
    <div style={{padding:"18px 20px 12px",borderBottom:"1px solid var(--border)"}}>
      <h1 style={{fontWeight:800,fontSize:"1.3rem"}}>{title}</h1>
      {sub&&<p style={{fontSize:".72rem",color:"var(--muted)",marginTop:2,fontWeight:500}}>{sub}</p>}
    </div>
  );
}
function SectionTitle({iconName,title}:{iconName:IconName;title:string}) {
  return <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:10,color:"var(--muted)",fontSize:".68rem",fontWeight:700,textTransform:"uppercase",letterSpacing:".8px"}}><Icon name={iconName} size={13} sw={2.2}/>{title}</div>;
}
function Chip({label,active,onClick}:{label:string;active:boolean;onClick:()=>void}) {
  return <button onClick={onClick} style={{background:active?"var(--text)":"var(--soft)",border:`1.5px solid ${active?"var(--text)":"var(--border)"}`,borderRadius:50,padding:"6px 12px",fontSize:".7rem",fontWeight:700,color:active?"white":"var(--muted)",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,transition:"all .2s"}}>{label}</button>;
}
function Empty({iconName,text}:{iconName:IconName;text:string}) {
  return (
    <div style={{textAlign:"center",padding:"32px 20px",color:"var(--muted2)"}}>
      <div style={{width:52,height:52,margin:"0 auto 10px",borderRadius:14,background:"var(--soft)",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name={iconName} size={24} sw={1.5}/></div>
      <p style={{fontWeight:600,fontSize:".82rem"}}>{text}</p>
    </div>
  );
}
