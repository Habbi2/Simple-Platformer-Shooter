import Phaser from 'phaser';

export class NameScene extends Phaser.Scene {
  constructor() { super('NameScene'); }

  create() {
    const cam = this.cameras.main;
    const w = cam.width, h = cam.height;

    // Background overlay
    this.add.rectangle(w/2, h/2, w, h, 0x000000, 0.6).setScrollFactor(0);

    // Panel
    const panelW = 420, panelH = 200;
    const panel = this.add.rectangle(w/2, h/2, panelW, panelH, 0x0b1021, 0.95)
      .setStrokeStyle(2, 0x38bdf8, 1)
      .setScrollFactor(0);

    this.add.text(w/2, h/2 - 56, 'Enter your name', { fontSize: '24px', color: '#e2e8f0' })
      .setOrigin(0.5).setScrollFactor(0);

    // Name input (DOM element)
    const storageKey = 'ps_name_v1';
    const defaultName = `p${Math.floor(Math.random()*1000)}`;
    const prev = (localStorage.getItem(storageKey) || '').toString();
    const startVal = prev && prev.length <= 16 ? prev : defaultName;

    const input = this.add.dom(w/2, h/2 - 12, 'input',
      'width:260px; height:34px; border-radius:6px; border:1px solid #334155; outline:none;'+
      'background:#0f172a; color:#e2e8f0; padding:0 10px; font-size:16px;'
    ).setOrigin(0.5);
    input.node.type = 'text';
    input.node.maxLength = 24; // hard limit in DOM, we additionally trim to 16 below
    input.node.placeholder = 'Your name';
    input.node.value = startVal;
    // Focus after a tick to ensure DOM is ready
    this.time.delayedCall(50, () => input.node?.focus());

    const playBtn = this.add.text(w/2, h/2 + 46, 'Play', { fontSize: '20px', color: '#0b1021', backgroundColor: '#38bdf8' })
      .setPadding(12, 6, 12, 8).setOrigin(0.5).setScrollFactor(0).setDepth(2)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => playBtn.setStyle({ backgroundColor: '#22c55e' }))
      .on('pointerout', () => playBtn.setStyle({ backgroundColor: '#38bdf8' }))
      .on('pointerdown', () => this._startWithName(input));

    this.input.keyboard.on('keydown-ENTER', () => this._startWithName(input));
  }

  _sanitizeName(raw, fallback) {
    let name = (raw ?? '').toString().trim();
    name = name.replace(/\s+/g, ' ').replace(/[^\w \-]/g, '');
    if (!name) name = fallback;
    if (name.length > 16) name = name.slice(0, 16);
    return name;
  }

  _startWithName(input) {
    const storageKey = 'ps_name_v1';
    const fallback = `p${Math.floor(Math.random()*1000)}`;
    const name = this._sanitizeName(input?.node?.value, fallback);
    try { localStorage.setItem(storageKey, name); } catch {}
    this.scene.start('GameScene', { name });
  }
}
