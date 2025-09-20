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
      dialectSelect.innerHTML = '<option value=""> Loading dialects...</option>';
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
    
    // Group dialects by label (division/region)
    const groupedDialects = data.dialects.reduce((groups, dialect) => {
      const label = dialect.label || 'other';
      if (!groups[label]) {
        groups[label] = [];
      }
      groups[label].push(dialect);
      return groups;
    }, {});
    
    // Sort groups: divisions first, then regions
    const groupOrder = ['devision', 'region'];
    const sortedGroups = groupOrder.filter(group => groupedDialects[group]);
    
    // Add grouped dialects to dropdown
    sortedGroups.forEach(groupLabel => {
      const dialects = groupedDialects[groupLabel];
      
      // Create optgroup
      const optgroup = document.createElement('optgroup');
      const groupTitle = groupLabel === 'devision' ? 'বিভাগসমূহ' : 'অঞ্চলসমূহ';
      optgroup.label = groupTitle;
      
      // Add dialects to optgroup
      dialects.forEach(dialect => {
        const option = document.createElement('option');
        option.value = dialect.code;
        option.textContent = `${dialect.name} (${dialect.recorded}/${dialect.total} - ${dialect.percentage}%)`;
        
        // Restore previous selection if it exists
        if (dialect.code === currentValue) {
          option.selected = true;
        }
        
        optgroup.appendChild(option);
      });
      
      dialectSelect.appendChild(optgroup);
    });
    
    console.log(`Loaded ${data.dialects.length} dialects from database${showLoading ? ' (refreshed)' : ''}`);
    
  } catch (error) {
    console.error('Error loading dialects:', error);
    const dialectSelect = document.getElementById('dialect');
    dialectSelect.innerHTML = '<option value=""> Error loading dialects</option>';
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
const previewSection = document.getElementById("previewSection");
const audioPreview = document.getElementById("audioPreview");
const submitBtn = document.getElementById("submitBtn");
const retryBtn = document.getElementById("retryBtn");

// Recording state
let mediaRecorder, audioChunks = [];
let currentIndex = 0;
let currentSentence = null;
let currentDialect = "";
let recordedBlob = null;

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

// Get selected gender
function getSelectedGender() {
  const genderRadios = document.querySelectorAll('input[name="gender"]');
  for (const radio of genderRadios) {
    if (radio.checked) {
      return radio.value;
    }
  }
  return null;
}

// Validate inputs before recording
function validateInputs() {
  const selectedGender = getSelectedGender();
  const selectedDialect = dialectSel.value;
  
  if (!selectedGender) {
    alert("প্রথমে লিঙ্গ নির্বাচন করুন");
    return false;
  }
  
  if (!selectedDialect) {
    alert("প্রথমে একটি উপভাষা নির্বাচন করুন");
    return false;
  }
  
  return true;
}

// Reset UI to initial state
function resetUI() {
  previewSection.classList.add("hidden");
  sentenceEl.textContent = "রেকর্ড শুরু চাপুন, একটি বাক্য আসবে।";
  statusEl.textContent = "রেকর্ড করার জন্য 'রেকর্ড শুরু' চাপুন";
  startBtn.disabled = false;
  stopBtn.disabled = true;
  recordedBlob = null;
}

startBtn.onclick = async () => {
  if (!validateInputs()) return;
  
  currentDialect = dialectSel.value;

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
    // Create blob for preview
    recordedBlob = new Blob(audioChunks, { type: mime || "application/octet-stream" });
    
    // Create URL for audio preview
    const audioURL = URL.createObjectURL(recordedBlob);
    audioPreview.src = audioURL;
    
    // Show preview section
    previewSection.classList.remove("hidden");
    
    // Update status
    statusEl.textContent = "রেকর্ডিং সম্পন্ন! প্রিভিউ শুনুন এবং জমা দিন বা আবার রেকর্ড করুন।";
    
    // Hide floating recording box
    floating.classList.add("hidden");
    
    // Enable start button for retry
    startBtn.disabled = false;
    stopBtn.disabled = true;
    
    // Stop all media tracks
    stream.getTracks().forEach(track => track.stop());
  };

  mediaRecorder.start();
  statusEl.textContent = "রেকর্ড চলছে... প্রদত্ত বাক্য পড়ুন।";
  floating.classList.remove("hidden");
  startBtn.disabled = true;
  stopBtn.disabled = false;
};

stopBtn.onclick = () => {
  if (mediaRecorder && mediaRecorder.state !== "inactive") mediaRecorder.stop();
  statusEl.textContent = "রেকর্ড শেষ হয়েছে। প্রিভিউ লোড হচ্ছে...";
};

// Submit recording
submitBtn.onclick = async () => {
  if (!recordedBlob || !currentSentence) {
    alert("রেকর্ডিং পাওয়া যায়নি। আবার রেকর্ড করুন।");
    return;
  }
  
  const selectedGender = getSelectedGender();
  if (!selectedGender) {
    alert("লিঙ্গ নির্বাচন করুন।");
    return;
  }
  
  // Show uploading state
  statusEl.textContent = "আপলোড হচ্ছে... অনুগ্রহ করে অপেক্ষা করুন।";
  submitBtn.disabled = true;
  retryBtn.disabled = true;
  startBtn.disabled = true;
  dialectSel.disabled = true;
  
  // Disable gender selection during upload
  const genderRadios = document.querySelectorAll('input[name="gender"]');
  genderRadios.forEach(radio => radio.disabled = true);
  
  // Add uploading class for spinner
  statusEl.classList.add('uploading');
  
  const form = new FormData();
  form.append("file", recordedBlob, "recording.webm");
  form.append("dialect", currentDialect);
  form.append("gender", selectedGender);
  form.append("index", String(currentIndex));
  form.append("sentence_id", String(currentSentence.id || currentSentence.sentenceId));
  form.append("sentence_text", currentSentence.text);

  try {
    const res = await fetch(`${BACKEND_URL}/api/upload`, { method: "POST", body: form });
    const data = await res.json();
    if (res.ok && data.success) {
      statusEl.textContent = `সংরক্ষণ সম্পন্ন হয়েছে: ${data.recording?.filename || data.filename}`;
      // Flag this sentence for this dialect
      const sentenceId = currentSentence.id || currentSentence.sentenceId;
      if (!flagged[currentDialect]) flagged[currentDialect] = new Set();
      flagged[currentDialect].add(sentenceId);
      
      // Show progress update message
      statusEl.textContent = "সংরক্ষণ সম্পন্ন! প্রগ্রেস আপডেট হচ্ছে...";
      
      // Refresh dialect dropdown to show updated progress (without loading indicator)
      await loadDialects(false);
      
      statusEl.textContent = "সংরক্ষণ এবং প্রগ্রেস আপডেট সম্পন্ন হয়েছে!";
      
      // Reset UI for next recording
      setTimeout(() => {
        resetUI();
      }, 2000);
      
    } else {
      statusEl.textContent = `সংরক্ষণ ব্যর্থ: ${data.error || 'unknown'}`;
    }
  } catch (err) {
    console.error(err);
    statusEl.textContent = "সার্ভারের সাথে সংযোগ ব্যর্থ হয়েছে।";
  } finally {
    // Remove uploading state
    statusEl.classList.remove('uploading');
    submitBtn.disabled = false;
    retryBtn.disabled = false;
    dialectSel.disabled = false;
    
    // Re-enable gender selection
    genderRadios.forEach(radio => radio.disabled = false);
  }
};

// Retry recording
retryBtn.onclick = () => {
  // Clean up preview
  if (audioPreview.src) {
    URL.revokeObjectURL(audioPreview.src);
    audioPreview.src = '';
  }
  
  // Reset UI
  resetUI();
};
