import { CSSResultGroup, html, LitElement, PropertyValues, unsafeCSS } from "lit";
import { customElement, property, query } from "lit/decorators";
import Styles from 'bundle-text:./Particles.less';

/** How a preset looks and moves: speeds and sizes are for a 1000 px wide element and scale with it. */
interface Preset {
    shape: 'dot' | 'streak' | 'petal' | 'feather' | 'confetti' | 'bubble';
    colours: string[];
    /** Size range, px. */
    size: [number, number];
    /** Speed range along the direction, px/s. */
    speed: [number, number];
    /** Degrees: 0 up, 90 right, 180 down, 270 left. */
    direction: number;
    spread: number;
    /** Particles per second for a whole edge (or a point). */
    rate: number;
    /** Side-to-side flutter, px, and how fast it swings (rad/s). */
    sway: number;
    swaySpeed: [number, number];
    /** Spin, deg/s. */
    spin: number;
    opacity: [number, number];
    emitter: Emitter;
}

type Emitter = 'top' | 'bottom' | 'left' | 'right' | 'point';

const Presets: Record<string, Preset> = {
    snow: { shape: 'dot', colours: ['#ffffff'], size: [2, 7], speed: [40, 110], direction: 180, spread: 20, rate: 40, sway: 18, swaySpeed: [0.6, 1.6], spin: 0, opacity: [0.5, 0.95], emitter: 'top' },
    rain: { shape: 'streak', colours: ['#a9c7e8', '#cfe0f2'], size: [12, 26], speed: [700, 1000], direction: 185, spread: 3, rate: 120, sway: 0, swaySpeed: [0, 0], spin: 0, opacity: [0.35, 0.7], emitter: 'top' },
    petals: { shape: 'petal', colours: ['#f8c8dc', '#f4a6c4', '#e87da5', '#d9577f', '#fbe0ea'], size: [8, 15], speed: [50, 110], direction: 160, spread: 30, rate: 9, sway: 40, swaySpeed: [0.8, 2], spin: 160, opacity: [0.8, 1], emitter: 'top' },
    feathers: { shape: 'feather', colours: ['#ffffff', '#f2f2f2', '#e6e3dc'], size: [18, 32], speed: [25, 60], direction: 175, spread: 25, rate: 4, sway: 60, swaySpeed: [0.4, 1], spin: 60, opacity: [0.85, 1], emitter: 'top' },
    confetti: { shape: 'confetti', colours: ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'], size: [6, 11], speed: [120, 260], direction: 180, spread: 25, rate: 50, sway: 20, swaySpeed: [1, 3], spin: 400, opacity: [0.9, 1], emitter: 'top' },
    bubbles: { shape: 'bubble', colours: ['#ffffff'], size: [6, 18], speed: [40, 90], direction: 0, spread: 15, rate: 8, sway: 14, swaySpeed: [0.6, 1.4], spin: 0, opacity: [0.35, 0.7], emitter: 'bottom' },
};

const Directions: Record<string, number> = { up: 0, right: 90, down: 180, left: 270 };

interface Particle {
    x: number; y: number;
    vx: number; vy: number;
    size: number;
    colour: string;
    opacity: number;
    angle: number; spin: number;
    phase: number; swaySpeed: number;
}

/**
 * Falling or drifting particles over (or behind) whatever it's placed in:
 * snow, rain, petals, feathers, confetti, bubbles, or an image of your own.
 * It fills its nearest positioned ancestor and ignores the pointer.
 *
 * Every setting is optional, on top of the preset's:
 * - `preset`: `snow` (default), `rain`, `petals`, `feathers`, `confetti`, `bubbles`.
 * - `image`: a picture to use for each particle instead of the preset's shape.
 * - `emitter`: `top`, `bottom`, `left`, `right` (the whole edge) or `point`
 *   (at `x`, `y`: percentages of the width and height).
 * - `direction`: `down`, `up`, `left`, `right`, or degrees (0 up, 90 right,
 *   180 down); `spread` is the random variation either side, in degrees.
 *   Left out, it's the preset's, or away from the edge `emitter` names.
 * - `speed`, `size`, `density`: multipliers (1 = the preset's).
 * - `wind`: a sideways push, -1 (left) to 1 (right), that gusts.
 * - `colour`: one colour for every particle.
 * - `layer`: `front` (default) or `behind`, for the content of its container
 *   (`behind` needs the container to be its own stacking context).
 *
 * It starts on its own; `pause()` / `play()` stop and restart it (Jetty
 * plays a slide's particles only while the slide is shown), keeping the
 * last frame. With `prefers-reduced-motion` it draws one still frame.
 */
@customElement('juel-particles')
export class Particles extends LitElement {
    static styles?: CSSResultGroup = unsafeCSS(Styles);

    @property() preset = 'snow';
    @property() image?: string;
    @property() emitter?: Emitter;
    @property({ type: Number }) x = 50;
    @property({ type: Number }) y = 50;
    @property() direction?: string;
    @property({ type: Number }) spread?: number;
    @property({ type: Number }) speed = 1;
    @property({ type: Number }) size = 1;
    @property({ type: Number }) density = 1;
    @property({ type: Number }) wind = 0;
    @property() colour?: string;
    @property({ reflect: true }) layer: 'front' | 'behind' = 'front';
    /** Set while it's stopped (by `pause()`, or the `paused` attribute). */
    @property({ type: Boolean, reflect: true }) paused = false;

    @query('canvas') private canvas!: HTMLCanvasElement;

    private particles: Particle[] = [];
    private frame = 0;
    private last = 0;
    private time = 0;
    private owed = 0;
    private picture?: HTMLImageElement;
    private resize = new ResizeObserver(() => this.fit());
    private scale = 1;
    private width = 0;
    private height = 0;

    /** Starts (or restarts) the particles. */
    play() {
        this.paused = false;
    }

    /** Stops the particles where they are. */
    pause() {
        this.paused = true;
    }

    /** Clears every particle; a playing system starts filling again. */
    clear() {
        this.particles = [];
        this.draw();
    }

    connectedCallback() {
        super.connectedCallback();
        if (this.canvas) this.resize.observe(this);
        this.schedule();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.resize.disconnect();
        cancelAnimationFrame(this.frame);
        this.frame = 0;
    }

    protected firstUpdated() {
        this.resize.observe(this);
        this.fit();
    }

    protected updated(changed: PropertyValues<this>) {
        if (changed.has('image')) this.loadImage();
        if (changed.has('preset') || changed.has('emitter') || changed.has('direction')) this.particles = [];
        this.schedule();
    }

    render() {
        return html`<canvas part="canvas" aria-hidden="true"></canvas>`;
    }

    private get settings(): Preset {
        return Presets[this.preset?.toLowerCase()] ?? Presets.snow;
    }

    private get reducedMotion() {
        return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    }

    private loadImage() {
        this.picture = undefined;
        if (!this.image) return;
        const wanted = this.image;
        const picture = new Image();
        // Only if `image` hasn't changed again while this one loaded.
        picture.onload = () => { if (this.image === wanted) { this.picture = picture; this.draw(); } };
        picture.src = wanted;
        if (picture.complete && picture.naturalWidth) this.picture = picture;
    }

    private fit() {
        if (!this.canvas) return;
        const ratio = window.devicePixelRatio || 1;
        this.width = this.clientWidth;
        this.height = this.clientHeight;
        this.scale = Math.max(this.width, 1) / 1000;
        this.canvas.width = Math.round(this.width * ratio);
        this.canvas.height = Math.round(this.height * ratio);
        this.canvas.getContext('2d')?.setTransform(ratio, 0, 0, ratio, 0, 0);
        if (this.reducedMotion) this.still();
        else this.draw();
    }

    private schedule() {
        if (!this.isConnected || this.frame) return;
        if (this.paused || this.reducedMotion) {
            if (this.reducedMotion && !this.particles.length) this.still();
            return;
        }
        this.last = performance.now();
        const tick = (now: number) => {
            this.frame = 0;
            if (this.paused || !this.isConnected) return;
            // A tab in the background, or a long pause: don't jump.
            const dt = Math.min((now - this.last) / 1000, 0.1);
            this.last = now;
            this.step(dt);
            this.draw();
            this.frame = requestAnimationFrame(tick);
        };
        this.frame = requestAnimationFrame(tick);
    }

    /** Reduced motion: one frame of particles spread over the whole area. */
    private still() {
        this.particles = [];
        const count = Math.round(this.settings.rate * this.density * 3);
        for (let i = 0; i < count; i++) {
            const p = this.spawn();
            p.x = Math.random() * this.width;
            p.y = Math.random() * this.height;
            this.particles.push(p);
        }
        this.draw();
    }

    private step(dt: number) {
        const s = this.settings;
        this.time += dt;
        if (this.width > 0 && this.height > 0) {
            this.owed += s.rate * this.density * dt;
            const max = 1500;
            while (this.owed >= 1) {
                this.owed--;
                if (this.particles.length < max) this.particles.push(this.spawn());
            }
        }
        // Wind gusts: a steady push with a slow swell.
        const gust = this.wind * 120 * this.scale * (1 + 0.5 * Math.sin(this.time * 0.7) + 0.25 * Math.sin(this.time * 1.9));
        const margin = 60 * this.scale + 40;
        this.particles = this.particles.filter(p => {
            p.phase += p.swaySpeed * dt;
            const sway = s.sway * this.scale * Math.cos(p.phase) * p.swaySpeed;
            p.x += (p.vx + sway + gust) * dt;
            p.y += p.vy * dt;
            p.angle += p.spin * dt;
            return p.x > -margin && p.x < this.width + margin && p.y > -margin && p.y < this.height + margin;
        });
    }

    private spawn(): Particle {
        const s = this.settings;
        const rand = (min: number, max: number) => min + Math.random() * (max - min);
        const emitter = this.emitter ?? s.emitter;
        // No direction given: the preset's, or, from another edge, away from that edge.
        const away: Record<Emitter, number> = { top: 180, bottom: 0, left: 90, right: 270, point: s.direction };
        const direction = this.direction === undefined || this.direction === ''
            ? (emitter === s.emitter ? s.direction : away[emitter])
            : Directions[this.direction.toLowerCase()] ?? (Number(this.direction) || 0);
        const spread = this.spread ?? s.spread;
        const angle = (direction + rand(-spread, spread)) * Math.PI / 180;
        const speed = rand(...s.speed) * this.speed * this.scale;
        const size = rand(...s.size) * this.size * this.scale * (this.picture ? 1.6 : 1);
        const pad = size * 2;
        let x: number, y: number;
        switch (emitter) {
            case 'bottom': x = rand(0, this.width); y = this.height + pad; break;
            case 'left': x = -pad; y = rand(0, this.height); break;
            case 'right': x = this.width + pad; y = rand(0, this.height); break;
            case 'point': x = this.width * this.x / 100; y = this.height * this.y / 100; break;
            default: x = rand(0, this.width); y = -pad;
        }
        // A sideways wind means the far edge needs particles too, or one side stays bare.
        if ((emitter === 'top' || emitter === 'bottom') && this.wind) x -= this.wind * rand(0, this.width * 0.6);
        return {
            x, y,
            vx: Math.sin(angle) * speed,
            vy: -Math.cos(angle) * speed,
            size,
            colour: this.colour || s.colours[Math.floor(Math.random() * s.colours.length)],
            opacity: rand(...s.opacity),
            angle: rand(0, 360),
            spin: rand(-s.spin, s.spin),
            phase: rand(0, Math.PI * 2),
            swaySpeed: rand(...s.swaySpeed),
        };
    }

    private draw() {
        const g = this.canvas?.getContext('2d');
        if (!g) return;
        g.clearRect(0, 0, this.width, this.height);
        const shape = this.settings.shape;
        for (const p of this.particles) {
            g.save();
            g.globalAlpha = p.opacity;
            g.translate(p.x, p.y);
            if (this.picture) {
                g.rotate(p.angle * Math.PI / 180);
                const w = p.size, h = p.size * (this.picture.naturalHeight / (this.picture.naturalWidth || 1));
                g.drawImage(this.picture, -w / 2, -h / 2, w, h);
            } else {
                this.drawShape(g, shape, p);
            }
            g.restore();
        }
    }

    private drawShape(g: CanvasRenderingContext2D, shape: Preset['shape'], p: Particle) {
        const r = p.size / 2;
        g.fillStyle = g.strokeStyle = p.colour;
        switch (shape) {
            case 'streak': {
                // Along the direction of travel.
                const length = Math.hypot(p.vx, p.vy) || 1;
                g.lineWidth = Math.max(1, p.size / 14);
                g.lineCap = 'round';
                g.beginPath();
                g.moveTo(0, 0);
                g.lineTo(-p.vx / length * p.size, -p.vy / length * p.size);
                g.stroke();
                break;
            }
            case 'petal':
                g.rotate(p.angle * Math.PI / 180);
                // Fluttering: the petal turns edge-on and back.
                g.scale(1, 0.35 + 0.65 * Math.abs(Math.cos(p.phase * 1.7)));
                g.beginPath();
                g.ellipse(0, 0, r, r * 0.6, 0, 0, Math.PI * 2);
                g.fill();
                break;
            case 'feather': {
                g.rotate(p.angle * Math.PI / 180 * 0.3 + Math.sin(p.phase) * 0.6);
                g.beginPath();
                g.ellipse(0, 0, r * 0.32, r, 0, 0, Math.PI * 2);
                g.fill();
                g.globalAlpha *= 0.5;
                g.strokeStyle = '#9c9488';
                g.lineWidth = Math.max(0.6, p.size / 40);
                g.beginPath();
                g.moveTo(0, -r);
                g.lineTo(0, r * 1.25);
                g.stroke();
                break;
            }
            case 'confetti':
                g.rotate(p.angle * Math.PI / 180);
                g.scale(1, Math.cos(p.phase * 3));
                g.fillRect(-r, -r * 0.45, p.size, p.size * 0.45);
                break;
            case 'bubble':
                g.lineWidth = Math.max(1, p.size / 12);
                g.beginPath();
                g.arc(0, 0, r, 0, Math.PI * 2);
                g.stroke();
                g.globalAlpha *= 0.6;
                g.beginPath();
                g.arc(-r * 0.35, -r * 0.35, r * 0.2, 0, Math.PI * 2);
                g.fill();
                break;
            default: {
                // Snow: a soft dot.
                const glow = g.createRadialGradient(0, 0, 0, 0, 0, r);
                glow.addColorStop(0, p.colour);
                glow.addColorStop(0.6, p.colour);
                glow.addColorStop(1, 'rgba(255,255,255,0)');
                g.fillStyle = glow;
                g.beginPath();
                g.arc(0, 0, r, 0, Math.PI * 2);
                g.fill();
            }
        }
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'juel-particles': Particles;
    }
}
