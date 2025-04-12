import { LitElement, html, css, PropertyValueMap } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { BrowserCodeReader, BrowserMultiFormatReader } from '@zxing/browser';
import { Result } from '@zxing/library';
import { when } from 'lit/directives/when';

@customElement('juel-scanner')
export class JuelScanner extends LitElement {
  @property({ type: String }) trigger?: string;
  @state() private scanning = false;
  @state() private visible = false;

  private codeReader = new BrowserMultiFormatReader();
  private videoElement?: HTMLVideoElement;
  private videoControl?: any;
  private mediaStream?: MediaStream;

  static styles = css`
    :host {
      display: block;
    }

    :host([data-triggered]) {
      position: fixed;
      top: -100%;
      left: 0;
      right: 0;
      margin: auto;
      max-width: 100%;
      z-index: 1000;
      background: white;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
      transition: top 0.4s ease;
      border-radius: 0 0 12px 12px;
      padding: 1rem;
    }

    :host([data-triggered][data-visible]) {
      top: 0;
    }

    video {
      width: 100%;
      max-width: 400px;
      border: 1px solid #ccc;
      border-radius: 8px;
    }

    .scanner-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
    }
  `;

  render() {
    return html`
      <div class="scanner-container" part="container">
        <video id="video" autoplay part="video"></video>
        ${when(!this.trigger, () => html`
          <button @click="${this.toggleScanning}" part="toggle-button">
            ${this.scanning ? 'Stop Scanning' : 'Start Scanning'}
          </button>`, () => html`
          <button @click="${this.hideScanner}" part="hide-button">Hide Scanner</button>`)}
      </div>
    `;
  }

  protected updated(changed: PropertyValueMap<any> | Map<PropertyKey, unknown>): void {
    if (changed.has('trigger')) {
      this.setAttribute('data-triggered', this.trigger ? 'true' : '');
      if (this.trigger) {
        const triggerElement = document.querySelector(this.trigger);
        if (triggerElement) {
          triggerElement.addEventListener('click', () => this.slideIn());
        }
      }
    }

    if (this.trigger) {
      this.toggleAttribute('data-visible', this.visible);
    }
  }

  firstUpdated() {
    this.videoElement = this.shadowRoot?.getElementById('video') as HTMLVideoElement;
  }

  private async slideIn() {
    this.visible = true;
    // Wait for animation to complete before starting scan
    setTimeout(() => this.startScanning(), 400);
  }

  private async hideScanner() {
    this.stopScanning();
    this.visible = false;
  }
  

  private async toggleScanning() {
    if (this.scanning) {
      this.stopScanning();
    } else {
      await this.startScanning();
    }
  }

  private async startScanning() {
    if (!this.videoElement) return;
    this.scanning = true;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.videoElement.srcObject = this.mediaStream;
      const devices = await BrowserCodeReader.listVideoInputDevices();
      const deviceId = devices[0]?.deviceId;
      if (!deviceId) throw new Error('No camera devices found');

      this.videoControl = await this.codeReader.decodeFromVideoDevice(
        deviceId,
        this.videoElement,
        (result: Result | undefined) => {
          if (result) {
            this.dispatchEvent(new CustomEvent('barcode-scanned', {
              detail: { text: result.getText() },
              bubbles: true,
              composed: true
            }));
            this.stopScanning();
            if (this.trigger) this.visible = false;
          }
        }
      );
    } catch (err) {
      console.error('Error starting scanner:', err);
      this.scanning = false;
    }
  }

  private async stopScanning() {
    this.videoControl?.stop();
    this.videoControl = undefined;
    this.scanning = false;
    // Ensure the media stream is available and stop all tracks
  // Get the stream from the video element
  const stream = this.mediaStream;
  if (stream) {
    
    // Stop each track and release the stream
    stream.getTracks().forEach(track => {
      console.log('Stopping track:', track); // Debug log
        track.stop(); // Stop the track if it's not already ended
    });
  }
  }
}