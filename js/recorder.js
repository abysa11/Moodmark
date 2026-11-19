// Own voice: recorded with the microphone and kept in the day folder.

export const canRecord = () => !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);

export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find(m => MediaRecorder.isTypeSupported(m)) || '';
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks = [];
  rec.ondataavailable = e => e.data.size && chunks.push(e.data);
  rec.start(250);
  const t0 = performance.now();
  return {
    elapsed: () => (performance.now() - t0) / 1000,
    stop: () => new Promise(resolve => {
      rec.onstop = () => { stream.getTracks().forEach(t => t.stop()); resolve(new Blob(chunks, { type: rec.mimeType || 'audio/webm' })); };
      rec.stop();
    }),
    cancel: () => { rec.onstop = null; if (rec.state !== 'inactive') rec.stop(); stream.getTracks().forEach(t => t.stop()); },
  };
}
