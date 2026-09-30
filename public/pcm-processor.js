// Chromium AudioContext runs at the provider's required 24 kHz.
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.chunk = new Int16Array(480);
    this.position = 0;
  }

  process(inputs) {
    for (const sample of inputs[0]?.[0] || []) {
      this.chunk[this.position++] = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
      if (this.position === this.chunk.length) {
        this.port.postMessage(this.chunk.buffer, [this.chunk.buffer]);
        this.chunk = new Int16Array(480);
        this.position = 0;
      }
    }
    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
