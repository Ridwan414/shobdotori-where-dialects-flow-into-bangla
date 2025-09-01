// Backend URL configuration
const BACKEND_URL = window.APP_CONFIG?.BACKEND_URL || "http://localhost:3000";

// All sentences
const sentences = [
  "তুমি এখন কোথায় যাচ্ছো?","আমি আজকে বাড়ি যাচ্ছি।","এখন কয়টা বাজে বলো?","দুপুর ইতিমধ্যেই হয়ে গেছে।",
  "দরজা তাড়াতাড়ি খুলো।","আলোটা নিভিয়ে দাও।","আমি কিছু খেতে চাই।","ভাত একেবারে হয়ে গেছে।",
  "আমাকে একটু পানি দাও।","আমি আজ খুব ক্লান্ত।","চল আমরা বাইরে যাই।","আমি এখনই আসছি।",
  "তুমি কি কাল আসবে?","আজকে খুব গরম লাগছে।","বাইরে বৃষ্টি পড়ছে।","ছাতা নিয়ে যাও এখন।",
  "তুমি আজ কেমন আছো?","আমি খুব ভালো আছি।","এখানে এসে বসো।","ওই বইটা আমাকে দাও।",
  "তোমার নামটা কী বলো?","আমার নাম রফিক হাসান।","তুমি কোথা থেকে আসছো?","আমি চট্টগ্রাম শহর থেকে।",
  "তুমি কি পড়াশোনা করছো?","আমি এখন বাংলা পড়ছি।","দরজায় কে দাঁড়িয়েছে?","আমি এখানেই ছিলাম।",
  "তুমি কি এখন ব্যস্ত?","হ্যাঁ, আমি একটু ব্যস্ত।","তুমি কি কিছু খাবে?","আমি এক কাপ চা খাবো।",
  "ভাত খাওয়া শেষ হয়েছে?","হ্যাঁ, এখনই শেষ হয়েছে।","তুমি কি গান শুনছো?","হ্যাঁ, আমি গান শুনছি।",
  "আমি মাঝে মাঝে গান গাই।","টিভি এখনই চালাও।","টিভি তাড়াতাড়ি বন্ধ করো।","আমি বই পড়তে চাই।",
  "তোমার কলমটা কোথায়?","কলমটা এখানেই আছে।","আমাকে মোবাইলটা দাও তো।","ফোনের চার্জ শেষ হয়ে গেছে।",
  "তোমার বাসা কোথায় বলো?","আমার বাসা ঢাকার ভিতরে।","আজ শুক্রবার সকাল।","আগামীকাল ছুটির দিন।",
  "তুমি কি সত্যিই আসবে?","হ্যাঁ, আমি অবশ্যই আসবো।","তুমি আজ কেমন আছো?","আমি মোটামুটি ভালো আছি।",
  "আজ আমি খুব খুশি।","আমি অনেক দুঃখিত আছি।","আমাকে ক্ষমা করে দাও।","তোমাকে অনেক ধন্যবাদ।",
  "তুমি কি কফি খাবে?","না, আমি শুধু চা খাবো।","এখন আমার ঘুম পাচ্ছে।","আমি ঘুমাতে যাচ্ছি।",
  "দরজাটা বন্ধ করে দাও।","জানালাটা একটু খুলো।","শীতল বাতাস আসছে।","বৃষ্টি এখন থেমে গেছে।",
  "আমি কোথায় যাবো এখন?","তুমি বাজারে চলে যাও।","বাজার কতদূরে আছে?","বাজারটা খুব কাছেই আছে।",
  "আমি হাঁটতে যাবো এখন।","চল আমরা একসাথে হাঁটি।","আমি নতুন বন্ধু চাই।","তুমি আমার সেরা বন্ধু।",
  "তুমি কি এখন খুশি?","হ্যাঁ, আমি সত্যিই খুশি।","আজ স্কুল বন্ধ রয়েছে।","আমি খেলতে যাচ্ছি।",
  "তুমি কি ফুটবল খেলবে?","না, আমি ক্রিকেট খেলবো।","আজ ম্যাচ শুরু হয়েছে।","বাংলাদেশ আজ জিতেছে।",
  "আমি গান শুনছি এখন।","তুমি কী পড়ছো বলো?","হ্যাঁ, আমি বাংলা পড়ছি।","আমি কবিতা লিখছি।",
  "তুমি কী কাজ করছো?","আমি রান্না করছি এখন।","খাওয়া তৈরি হয়েছে কি?","হ্যাঁ, এখনই তৈরি হয়েছে।",
  "খেতে এসো সবাই।","আমি তাড়াতাড়ি আসছি।","আমাকে এখনই ডাকো।","তুমি কই গিয়েছিলে বলো?",
  "আমি বাজারে গিয়েছিলাম।","তুমি কী কিনেছো বলো?","আমি ফলমূল কিনেছি।","এই আমটা খুব মিষ্টি।",
  "আমি লিচু খেতে চাই।","দুধটা এখন গরম আছে।","চাল আনো ঘরের ভিতর।","ডালটা আমাকে দাও।"
];

// Render sentences on page
const box = document.getElementById("sentences");
sentences.forEach((s,i)=>{
  const p = document.createElement("p");
  p.textContent = `${i+1}. ${s}`;
  box.appendChild(p);
});

// Recording logic
let mediaRecorder, audioChunks = [];
let currentIndex = 0;

const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusEl = document.getElementById("status");
const dialectSel = document.getElementById("dialect");
const floating = document.getElementById("recordingBox");

// Fetch next index from backend
async function getNextIndex(dialect){
  const url = `${BACKEND_URL}/api/next-index?dialect=${encodeURIComponent(dialect)}`;
  const res = await fetch(url);
  if(!res.ok) throw new Error("next-index failed");
  const data = await res.json();
  return data.next_index ?? 0;
}

startBtn.onclick = async () => {
  const dialect = dialectSel.value;
  if(!dialect){ alert("প্রথমে একটি ডায়ালেক্ট নির্বাচন করুন"); return; }

  try { currentIndex = await getNextIndex(dialect); }
  catch(e){ console.error(e); alert("সার্ভার সংযোগে সমস্যা"); return; }

  const stream = await navigator.mediaDevices.getUserMedia({audio:true});
  const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" :
               (MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "");
  mediaRecorder = new MediaRecorder(stream, mime ? {mimeType:mime} : undefined);

  audioChunks = [];

  mediaRecorder.ondataavailable = e => { if(e.data.size) audioChunks.push(e.data); };

  mediaRecorder.onstop = async () => {
    const blob = new Blob(audioChunks, { type: mime || "application/octet-stream" });
    const form = new FormData();
    form.append("file", blob, "recording.webm");
    form.append("dialect", dialect);
    form.append("index", String(currentIndex));

    try {
      const res = await fetch(`${BACKEND_URL}/api/upload`, { method:"POST", body: form });
      const data = await res.json();
      if(res.ok && data.success){
        statusEl.textContent = `ফাইল Google Drive এ সংরক্ষিত হয়েছে: ${data.filename}`;
      } else {
        statusEl.textContent = `সংরক্ষণ ব্যর্থ: ${data.error || 'unknown'}`;
      }
    } catch(err){
      console.error(err);
      statusEl.textContent = "সার্ভারের সাথে সংযোগ ব্যর্থ হয়েছে।";
    }

    floating.classList.add("hidden");
    startBtn.disabled=false;
    stopBtn.disabled=true;
  };

  mediaRecorder.start();
  statusEl.textContent = "রেকর্ড চলছে... একটি মাত্র বাক্য পড়ুন।";
  floating.classList.remove("hidden");
  startBtn.disabled=true;
  stopBtn.disabled=false;
};

stopBtn.onclick = () => {
  if(mediaRecorder && mediaRecorder.state!=="inactive") mediaRecorder.stop();
  statusEl.textContent = "রেকর্ড শেষ হয়েছে।";
};
