// Backend URL configuration
const BACKEND_URL = window.APP_CONFIG?.BACKEND_URL || "http://localhost:3000";

// Tracker: dialect → Set of flagged IDs
const flagged = {};

// Load dialects from backend
async function loadDialects(showLoading = false) {
  try {
    const dialectSelect = document.getElementById('dialect');
    const currentValue = dialectSelect.value; // Remember current selection
    const wasDisabled = dialectSelect.disabled;
    
    if (showLoading) {
      dialectSelect.innerHTML = '<option value="">🔄 Loading dialects...</option>';
      dialectSelect.disabled = true;
    }
    
    const response = await fetch(`${BACKEND_URL}/api/dialects`);
    if (!response.ok) throw new Error('Failed to fetch dialects');
    
    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Failed to load dialects');
    
    // Clear and rebuild options
    dialectSelect.innerHTML = '';
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- উপভাষা নির্বাচন করুন --';
    dialectSelect.appendChild(defaultOption);
    
    // Add dialects to dropdown
    data.dialects.forEach(dialect => {
      const option = document.createElement('option');
      option.value = dialect.code;
      option.textContent = `${dialect.name} (${dialect.recorded}/${dialect.total} - ${dialect.percentage}%)`;
      
      // Restore previous selection if it exists
      if (dialect.code === currentValue) {
        option.selected = true;
      }
      
      dialectSelect.appendChild(option);
    });
    
    console.log(`✅ Loaded ${data.dialects.length} dialects from database${showLoading ? ' (refreshed)' : ''}`);
    
  } catch (error) {
    console.error('❌ Error loading dialects:', error);
    const dialectSelect = document.getElementById('dialect');
    dialectSelect.innerHTML = '<option value="">❌ Error loading dialects</option>';
  } finally {
    // Re-enable dropdown only if it was disabled by this function
    const dialectSelect = document.getElementById('dialect');
    if (showLoading || dialectSelect.disabled) {
      dialectSelect.disabled = false;
    }
  }
}

// UI elements
const sentenceEl = document.getElementById("currentSentence");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const statusEl = document.getElementById("status");
const dialectSel = document.getElementById("dialect");
const floating = document.getElementById("recordingBox");

// Recording state
let mediaRecorder, audioChunks = [];
let currentIndex = 0;
let currentSentence = null;
let currentDialect = "";

// Initialize the app
async function initApp() {
  await loadDialects();
  
  // Add manual refresh button functionality
  const dialectSelect = document.getElementById('dialect');
  const refreshButton = document.getElementById('refreshDialects');
  
  // Track if we're already refreshing to avoid multiple simultaneous calls
  let isRefreshing = false;
  
  // Manual refresh button
  refreshButton.addEventListener('click', async () => {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshButton.disabled = true;
      refreshButton.textContent = '⏳';
      
      await loadDialects(true);
      
      refreshButton.disabled = false;
      refreshButton.textContent = '🔄';
      isRefreshing = false;
    }
  });
}

// Load dialects when page loads
document.addEventListener('DOMContentLoaded', initApp);

// Fetch next index from backend
async function getNextIndex(dialect) {
  const url = `${BACKEND_URL}/api/next-index?dialect=${encodeURIComponent(dialect)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("next-index failed");
  const data = await res.json();
  return data.next_index ?? 0;
}

// Fetch next sentence from backend
async function getNextSentence(dialect) {
  const url = `${BACKEND_URL}/api/next-sentence?dialect=${encodeURIComponent(dialect)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("next-sentence failed");
  const data = await res.json();
  return data;
}

startBtn.onclick = async () => {
  currentDialect = dialectSel.value;
  if (!currentDialect) { alert("প্রথমে একটি উপভাষা নির্বাচন করুন"); return; }

  try { 
    currentIndex = await getNextIndex(currentDialect);
    
    // Get next sentence from backend
    const sentenceData = await getNextSentence(currentDialect);
    
    if (!sentenceData.success || !sentenceData.sentence) {
      alert(sentenceData.message || "এই উপভাষার জন্য সব বাক্য রেকর্ড সম্পন্ন হয়েছে।");
      return;
    }
    
    currentSentence = sentenceData.sentence;
    sentenceEl.textContent = currentSentence.text;
    
    // Show progress
    if (sentenceData.progress) {
      console.log(`Progress: ${sentenceData.progress.recorded}/${sentenceData.progress.total} (${sentenceData.progress.percentage}%)`);
    }
  }
  catch (e) { console.error(e); alert("সার্ভার সংযোগে সমস্যা"); return; }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" :
               (MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "");
  mediaRecorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);

  audioChunks = [];
  mediaRecorder.ondataavailable = e => { if (e.data.size) audioChunks.push(e.data); };

  mediaRecorder.onstop = async () => {
    if (currentSentence && currentSentence.id) {
      // Show uploading state
      statusEl.textContent = "আপলোড হচ্ছে... অনুগ্রহ করে অপেক্ষা করুন।";
      startBtn.disabled = true;
      stopBtn.disabled = true;
      dialectSel.disabled = true;
      
      // Add uploading class for spinner
      statusEl.classList.add('uploading');
      
      const blob = new Blob(audioChunks, { type: mime || "application/octet-stream" });
      const form = new FormData();
      form.append("file", blob, "recording.webm");
      form.append("dialect", currentDialect);
      form.append("index", String(currentIndex));
      form.append("sentence_id", String(currentSentence.id || currentSentence.sentenceId));
      form.append("sentence_text", currentSentence.text);

      try {
        const res = await fetch(`${BACKEND_URL}/api/upload`, { method: "POST", body: form });
        const data = await res.json();
        if (res.ok && data.success) {
          statusEl.textContent = `✅ সংরক্ষণ সম্পন্ন হয়েছে: ${data.recording?.filename || data.filename}`;
          // Flag this sentence for this dialect
          const sentenceId = currentSentence.id || currentSentence.sentenceId;
          if (!flagged[currentDialect]) flagged[currentDialect] = new Set();
          flagged[currentDialect].add(sentenceId);
          
          // Show progress update message
          statusEl.textContent = "✅ সংরক্ষণ সম্পন্ন! প্রগ্রেস আপডেট হচ্ছে...";
          
          // Refresh dialect dropdown to show updated progress (without loading indicator)
          await loadDialects(false);
          
          statusEl.textContent = "✅ সংরক্ষণ এবং প্রগ্রেস আপডেট সম্পন্ন হয়েছে!";
        } else {
          statusEl.textContent = `❌ সংরক্ষণ ব্যর্থ: ${data.error || 'unknown'}`;
        }
      } catch (err) {
        console.error(err);
        statusEl.textContent = "❌ সার্ভারের সাথে সংযোগ ব্যর্থ হয়েছে।";
      } finally {
        // Remove uploading state
        statusEl.classList.remove('uploading');
        startBtn.disabled = false;
        stopBtn.disabled = true;
        dialectSel.disabled = false;
      }
    }

    // Hide sentence until next record
    sentenceEl.textContent = "রেকর্ড শেষ হয়েছে। নতুন বাক্য আসবে।";
    floating.classList.add("hidden");
    startBtn.disabled = false;
    stopBtn.disabled = true;
  };

  mediaRecorder.start();
  statusEl.textContent = "রেকর্ড চলছে... প্রদত্ত বাক্য পড়ুন।";
  floating.classList.remove("hidden");
  startBtn.disabled = true;
  stopBtn.disabled = false;
};

stopBtn.onclick = () => {
  if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
  statusEl.textContent = "রেকর্ড শেষ হয়েছে।";
};
