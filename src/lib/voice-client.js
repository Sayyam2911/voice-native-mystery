export class VoiceClient {
  constructor({ onState, onHeard, onError, onClose }) {
    this.onState = onState;
    this.onHeard = onHeard;
    this.onError = onError;
    this.onClose = onClose;
    this.sources = new Set();
    this.replies = new Map();
    this.ready = false;
    this.stopped = false;
    this.nextPlayback = 0;
    this.state = { status: 'idle', caption: '', microphone: { receiving: false, level: 0 } };
    this.meterPeak = 0;
    this.lastMeterAt = 0;
  }

  publish(state) {
    if (this.stopped) return;
    this.state = { ...this.state, ...state };
    this.onState(this.state);
  }

  receiveInput(data) {
    if (this.stopped || !data.byteLength) return;
    this.lastInputAt = Date.now();
    if (!this.ready || this.socket?.readyState !== WebSocket.OPEN) return;
    this.send({
      type: 'input.audio',
      audio: btoa(String.fromCharCode(...new Uint8Array(data))),
    });
    const samples = new Int16Array(data);
    let energy = 0;
    for (const sample of samples) energy += (sample / 32768) ** 2;
    this.meterPeak = Math.max(this.meterPeak, Math.sqrt(energy / samples.length));
    // Local amplitude only, at most five UI updates per second. Never retain audio.
    if (this.lastInputAt - this.lastMeterAt >= 200) {
      this.publish({
        microphone: { receiving: true, level: Math.min(100, Math.round(this.meterPeak * 500)) },
      });
      this.meterPeak = 0;
      this.lastMeterAt = this.lastInputAt;
    }
  }

  checkInput(now = Date.now()) {
    if (this.ready && !this.stopped && now - (this.lastInputAt || this.readyAt) > 6000)
      this.onError(
        'Microphone audio stopped reaching the call. Check your browser microphone input, then start the call again.',
      );
  }

  waitForAnswer() {
    if (this.answerTimer || (this.current && !this.current.interrupted)) return;
    this.answerTimer = setTimeout(() => {
      this.answerTimer = null;
      if (!this.stopped)
        this.onError(
          'Your speech was detected, but no reply arrived within 30 seconds. Please start the call again.',
        );
    }, 30000);
    this.answerTimer.unref?.();
  }

  async connect(credentials) {
    this.credentials = credentials;
    this.publish({ status: 'connecting', caption: '' });
    this.context = new AudioContext({ sampleRate: 24000 });
    if (this.context.sampleRate !== 24000)
      throw new Error(
        'This browser cannot provide 24 kHz voice audio. Please use Chrome or Edge for calls.',
      );
    await this.context.audioWorklet.addModule('/pcm-processor.js');
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: true },
    });
    if (this.stopped) {
      this.stream.getTracks().forEach((track) => track.stop());
      return;
    }
    this.input = this.context.createMediaStreamSource(this.stream);
    this.worklet = new AudioWorkletNode(this.context, 'pcm-processor');
    this.mute = this.context.createGain();
    this.mute.gain.value = 0;
    this.input.connect(this.worklet).connect(this.mute).connect(this.context.destination);
    this.worklet.port.onmessage = ({ data }) => this.receiveInput(data);
    for (const track of this.stream.getAudioTracks()) {
      track.onended = () => {
        if (!this.stopped) this.onError('The microphone disconnected. Check your input and retry.');
      };
    }
    this.context.onstatechange = () => {
      if (this.ready && !this.stopped && this.context.state !== 'running')
        this.onError('The browser paused call audio. Return to this tab and start the call again.');
    };
    await this.context.resume();
    if (this.stopped) return;
    this.inputTimer = setInterval(() => this.checkInput(), 1000);
    this.inputTimer.unref?.();
    const url = new URL('wss://agents.assemblyai.com/v1/ws');
    url.searchParams.set('token', credentials.token);
    this.socket = new WebSocket(url);
    this.connectionTimer = setTimeout(() => {
      if (!this.ready && !this.stopped)
        this.onError('The voice connection did not become ready. Please retry the call.');
    }, 20000);
    this.connectionTimer.unref?.();
    this.socket.addEventListener('open', () =>
      this.send({ type: 'session.update', session: { agent_id: credentials.agentId } }),
    );
    this.socket.addEventListener('message', ({ data }) => {
      if (this.stopped) return;
      try {
        this.event(JSON.parse(data));
      } catch {
        this.onError('The voice connection returned an invalid event.');
      }
    });
    this.socket.addEventListener('error', () =>
      this.onError('The voice connection failed. Please start the call again.'),
    );
    this.socket.addEventListener('close', ({ code }) => {
      if (!this.stopped) {
        if (code !== 1000)
          this.onError(`The voice connection closed (${code}). Please start the call again.`);
        else this.onClose();
      }
    });
  }

  send(message) {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message));
  }

  event(message) {
    switch (message.type) {
      case 'session.ready':
        this.ready = true;
        this.readyAt = Date.now();
        clearTimeout(this.connectionTimer);
        this.publish({ status: 'listening', caption: '' });
        break;
      case 'input.speech.started':
        this.userTurnEnded = false;
        clearTimeout(this.answerTimer);
        this.answerTimer = null;
        // Speech may be a back-channel, not an interruption. Only provider-confirmed
        // interrupted events may discard the active reply and queued playback.
        if (!this.current || this.current.interrupted)
          this.publish({ status: 'listening', caption: '' });
        break;
      case 'transcript.user.delta':
        if (!this.current || this.current.interrupted)
          this.publish({ status: 'listening', caption: `You: ${message.text}` });
        break;
      case 'input.speech.stopped':
        this.userTurnEnded = true;
        if (!this.current || this.current.interrupted) {
          this.publish({ status: 'thinking' });
          this.waitForAnswer();
        }
        break;
      case 'transcript.user':
        this.userTurnEnded = true;
        if (!this.current || this.current.interrupted) {
          this.publish({ status: 'thinking', caption: `You: ${message.text}` });
          this.waitForAnswer();
        }
        break;
      case 'reply.started': {
        this.userTurnEnded = false;
        clearTimeout(this.answerTimer);
        this.answerTimer = null;
        this.publish({ status: 'thinking', caption: '' });
        this.current = {
          id: message.reply_id,
          words: [],
          text: '',
          caption: '',
          sources: new Set(),
          done: false,
          interrupted: false,
          acknowledged: false,
          startTime: null,
        };
        this.replies.set(message.reply_id, this.current);
        const reply = this.current;
        reply.waitTimer = setTimeout(() => {
          if (!this.stopped && !reply.interrupted && !reply.acknowledged)
            this.onError(
              'No spoken reply arrived within 30 seconds. End the call and retry; the server callback or voice provider may be unavailable.',
            );
        }, 30000);
        reply.waitTimer.unref?.();
        break;
      }
      case 'reply.audio':
        if (this.current && !this.current.interrupted) this.play(message.data, this.current);
        break;
      case 'transcript.agent.delta': {
        const reply = this.replies.get(message.reply_id);
        if (!reply || reply.interrupted) break;
        reply.words.push({ text: message.delta, end: message.end_ms });
        reply.caption += message.delta;
        this.publish({ status: 'speaking', caption: reply.caption });
        break;
      }
      case 'transcript.agent': {
        const reply = this.replies.get(message.reply_id);
        if (!reply) break;
        reply.text = message.text;
        reply.final = true;
        if (message.interrupted) this.interrupt(reply);
        this.finish(reply);
        break;
      }
      case 'reply.done': {
        // AssemblyAI's normal reply.done event has no reply_id. The active reply owns it.
        const reply = message.reply_id ? this.replies.get(message.reply_id) : this.current;
        if (!reply) break;
        if (message.status === 'failed') {
          clearTimeout(reply.waitTimer);
          this.onError('The voice provider could not complete the reply. Please retry the call.');
          break;
        }
        reply.done = true;
        if (message.status === 'interrupted') this.interrupt(reply);
        this.finish(reply);
        break;
      }
      case 'session.error':
        this.onError(message.message || 'Voice provider rejected the session. Try again shortly.');
        break;
      case 'session.ended':
        this.onClose();
        break;
    }
  }

  play(base64, reply) {
    const raw = atob(base64);
    const pcm = new Int16Array(raw.length / 2);
    for (let i = 0; i < pcm.length; i++)
      pcm[i] = raw.charCodeAt(i * 2) | (raw.charCodeAt(i * 2 + 1) << 8);
    const buffer = this.context.createBuffer(1, pcm.length, 24000);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) channel[i] = pcm[i] / 32768;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.context.destination);
    this.nextPlayback = Math.max(this.nextPlayback, this.context.currentTime + 0.01);
    reply.startTime ??= this.nextPlayback;
    reply.sources.add(source);
    this.sources.add(source);
    source.onended = () => {
      reply.sources.delete(source);
      this.sources.delete(source);
      source.disconnect();
      this.finish(reply);
    };
    source.start(this.nextPlayback);
    clearTimeout(reply.waitTimer);
    this.nextPlayback += buffer.duration;
    this.publish({ status: 'speaking', caption: reply.caption });
  }

  interrupt(reply = this.current) {
    if (!reply || reply.acknowledged) return;
    clearTimeout(reply.waitTimer);
    if (!reply.interrupted) {
      const elapsedMs =
        reply.startTime === null
          ? 0
          : Math.max(0, (this.context.currentTime - reply.startTime) * 1000);
      // Nullable timing is deliberately not treated as evidence of playback.
      reply.audiblePrefix = reply.words
        .filter((word) => typeof word.end === 'number' && word.end <= elapsedMs)
        .map((word) => word.text)
        .join('');
    }
    reply.interrupted = true;
    for (const source of reply.sources) {
      try {
        source.stop();
      } catch {
        /* Already finished. */
      }
    }
    this.nextPlayback = this.context?.currentTime || 0;
    if (this.current === reply) {
      if (this.userTurnEnded) this.waitForAnswer();
      this.publish({ status: this.userTurnEnded ? 'thinking' : 'listening', caption: '' });
    }
    this.finish(reply);
  }

  finish(reply) {
    if (this.stopped || reply.acknowledged || !reply.done || !reply.final || reply.sources.size)
      return;
    clearTimeout(reply.waitTimer);
    if (!reply.interrupted && reply.startTime === null) {
      this.onError('The reply contained no playable audio. Please retry the call.');
      return;
    }
    reply.acknowledged = true;
    const text = reply.interrupted ? reply.audiblePrefix || '' : reply.text;
    // Receiving reply.done is not sufficient: all locally queued audio must end first.
    Promise.resolve(
      this.onHeard({ text, interrupted: reply.interrupted, leaseId: this.credentials.leaseId }),
    ).catch((error) => this.onError(error.message));
    this.replies.delete(reply.id);
    if (this.current === reply) {
      this.current = null;
      this.publish({ status: this.answerTimer ? 'thinking' : 'listening', caption: '' });
    }
  }

  stop() {
    if (this.stopped) return;
    this.stopped = true;
    this.ready = false;
    clearTimeout(this.connectionTimer);
    clearTimeout(this.answerTimer);
    clearInterval(this.inputTimer);
    for (const reply of this.replies.values()) clearTimeout(reply.waitTimer);
    this.send({ type: 'session.end' });
    const socket = this.socket;
    if (socket?.readyState === WebSocket.CONNECTING) socket.close();
    else setTimeout(() => socket?.close(), 500);
    for (const source of this.sources) {
      source.onended = null;
      try {
        source.stop();
      } catch {}
    }
    this.sources.clear();
    if (this.worklet) this.worklet.port.onmessage = null;
    for (const node of [this.input, this.worklet, this.mute]) node?.disconnect();
    this.stream?.getTracks().forEach((track) => {
      track.onended = null;
      track.stop();
    });
    if (this.context) this.context.onstatechange = null;
    this.context?.close().catch(() => {});
  }
}
