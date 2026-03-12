import {
  AmbientLight,
  BoxGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshLambertMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  Texture,
  TextureLoader,
  Vector3,
  WebGLRenderer,
} from 'three';
import { resolveAimPoint, TARGET_CENTER_Y, TARGET_DISTANCE } from './Ballistics';
import { getPortraitImageUrl, PORTRAITS } from '../data/portraits';
import type { AimSnapshot } from '../input/types';

const ARROW_SHAFT_LENGTH = 1.04;
const ARROW_HEAD_LENGTH = 0.15;
const ARROW_TIP_OFFSET = ARROW_SHAFT_LENGTH * 0.5 + ARROW_HEAD_LENGTH;
const CROWD_COLORS = ['#d9685c', '#f0c05f', '#5ea3d8', '#7e87bf', '#6cb08b', '#d77f91'];

interface ActiveShot {
  path: Vector3[];
  progress: number;
  arrow: Group;
  hitX: number;
  hitY: number;
  finalDirection: Vector3;
  resolve: () => void;
}

interface FamilyStandee {
  root: Group;
  photoPanel: Mesh;
  cheerBanner: Mesh;
  baseY: number;
  baseRotationY: number;
  phase: number;
}

export class ArcheryScene {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(64, 1, 0.1, 200);
  private readonly renderer = new WebGLRenderer({ antialias: true, alpha: true });
  private readonly textureLoader = new TextureLoader();
  private readonly resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(() => this.resize()) : null;
  private readonly bowGroup = new Group();
  private readonly bowHand = this.createBowHand();
  private readonly drawHand = this.createDrawHand();
  private readonly previewArrow = this.createArrow(false);
  private readonly stringLine = this.createString();
  private readonly targetPlane = new Mesh(
    new PlaneGeometry(1.35, 1.35),
    new MeshLambertMaterial({ map: this.createTargetTexture(), side: DoubleSide }),
  );
  private readonly impactGroup = new Group();
  private readonly stuckArrows: Group[] = [];
  private readonly familyStandees: FamilyStandee[] = [];
  private activeShot: ActiveShot | null = null;
  private currentFov = 64;

  constructor(private readonly host: HTMLElement, private readonly reduceMotion: boolean) {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.4));
    this.renderer.setSize(host.clientWidth, host.clientHeight);
    this.renderer.outputColorSpace = 'srgb';
    this.host.append(this.renderer.domElement);
    this.buildWorld();
    this.resize();
    window.requestAnimationFrame(this.resize);
    this.resizeObserver?.observe(this.host);
    window.addEventListener('resize', this.resize);
  }

  public frame(snapshot: AimSnapshot, drawRatio: number, scopeRatio: number): void {
    this.updateCamera(snapshot, scopeRatio);
    this.updateBow(drawRatio);
    this.updateShot();
    this.updateAmbientMotion();
    this.renderer.render(this.scene, this.camera);
  }

  public async playShot(path: Vector3[], hitX: number, hitY: number): Promise<void> {
    const arrow = this.createArrow(true);
    this.scene.add(arrow);
    const finalDirection = path[path.length - 1].clone().sub(path[Math.max(path.length - 2, 0)]).normalize();

    return new Promise((resolve) => {
      this.activeShot = {
        path,
        progress: 0,
        arrow,
        hitX,
        hitY,
        finalDirection,
        resolve: () => {
          this.pinArrow(arrow, hitX, hitY, finalDirection);
          resolve();
        },
      };
    });
  }

  public destroy(): void {
    window.removeEventListener('resize', this.resize);
    this.resizeObserver?.disconnect();
    this.renderer.dispose();
    this.host.innerHTML = '';
  }

  private readonly resize = () => {
    const width = Math.max(this.host.clientWidth, 320);
    const height = Math.max(this.host.clientHeight, 320);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private buildWorld(): void {
    this.scene.background = new Color('#c8def3');
    this.scene.add(new AmbientLight('#fff4dd', 1.55));

    const sun = new DirectionalLight('#fff8e8', 2.7);
    sun.position.set(9, 16, 7);
    this.scene.add(sun);

    const ground = new Mesh(
      new PlaneGeometry(80, 96),
      new MeshStandardMaterial({ color: '#8dbd70' }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, -28);
    this.scene.add(ground);

    const lane = new Mesh(
      new PlaneGeometry(8.2, TARGET_DISTANCE + 18),
      new MeshStandardMaterial({ color: '#dfe7d1' }),
    );
    lane.rotation.x = -Math.PI / 2;
    lane.position.set(0, 0.02, -TARGET_DISTANCE * 0.5 - 4.2);
    this.scene.add(lane);

    for (const side of [-1, 1] as const) {
      const boundary = new Mesh(
        new BoxGeometry(0.22, 0.18, TARGET_DISTANCE + 18),
        new MeshStandardMaterial({ color: '#f6efe1' }),
      );
      boundary.position.set(side * 4.2, 0.1, -TARGET_DISTANCE * 0.5 - 4.2);
      this.scene.add(boundary);
      this.addGrandstand(side);
      this.addBannerRig(side);
    }

    const targetStand = new Mesh(
      new CylinderGeometry(0.08, 0.08, 2.2, 10),
      new MeshStandardMaterial({ color: '#6b4f32' }),
    );
    targetStand.position.set(0, 1.1, -TARGET_DISTANCE - 0.2);
    this.scene.add(targetStand);

    const targetBack = new Mesh(
      new CircleGeometry(0.74, 32),
      new MeshStandardMaterial({ color: '#d6c39a' }),
    );
    targetBack.position.set(0, TARGET_CENTER_Y, -TARGET_DISTANCE - 0.03);
    this.scene.add(targetBack);

    const targetFrame = new Mesh(
      new BoxGeometry(1.56, 1.56, 0.08),
      new MeshStandardMaterial({ color: '#9a7446' }),
    );
    targetFrame.position.set(0, TARGET_CENTER_Y, -TARGET_DISTANCE - 0.08);
    this.scene.add(targetFrame);

    const eventBanner = new Mesh(
      new PlaneGeometry(6.8, 1.45),
      new MeshStandardMaterial({ map: this.createBannerTexture('FAMILY ARCHERY CUP', '#b76506'), side: DoubleSide }),
    );
    eventBanner.position.set(0, 4.9, -24.6);
    this.scene.add(eventBanner);

    this.addFamilyCheerStands();

    this.targetPlane.position.set(0, TARGET_CENTER_Y, -TARGET_DISTANCE);
    this.scene.add(this.targetPlane);
    this.scene.add(this.impactGroup);

    this.camera.position.set(0, 1.58, 6);
    this.camera.add(this.bowGroup);
    this.scene.add(this.camera);

    const bowLeft = new Mesh(
      new CylinderGeometry(0.018, 0.02, 0.9, 8),
      new MeshStandardMaterial({ color: '#7c4c2e' }),
    );
    bowLeft.rotation.z = 0.22;
    bowLeft.position.set(0.13, 0.08, -0.92);

    const bowRight = bowLeft.clone();
    bowRight.rotation.z = -0.22;
    bowRight.position.y = -0.08;

    this.previewArrow.position.set(0.03, 0, -0.98);
    this.bowGroup.position.set(0.42, -0.2, -0.12);
    this.bowGroup.add(bowLeft, bowRight, this.stringLine, this.previewArrow, this.bowHand, this.drawHand);
  }

  private addGrandstand(side: -1 | 1): void {
    const crowdMaterials = CROWD_COLORS.map((color) => new MeshStandardMaterial({ color }));

    for (let row = 0; row < 5; row += 1) {
      const stand = new Mesh(
        new BoxGeometry(7.2, 0.8 + row * 0.18, 4.6),
        new MeshStandardMaterial({ color: row % 2 === 0 ? '#59697a' : '#6c7f90' }),
      );
      stand.position.set(side * (9.2 + row * 2.8), 0.45 + row * 0.12, -18 - row * 6.4);
      this.scene.add(stand);

      for (let seat = 0; seat < 7; seat += 1) {
        for (let depth = 0; depth < 3; depth += 1) {
          const spectator = new Mesh(
            new BoxGeometry(0.34, 0.42, 0.34),
            crowdMaterials[(seat + depth + row) % crowdMaterials.length],
          );
          spectator.position.set(
            side * (7.3 + row * 2.75),
            1 + row * 0.12 + depth * 0.08,
            -16.8 - row * 6.3 - seat * 0.58,
          );
          spectator.position.x += side * depth * 0.38;
          this.scene.add(spectator);
        }
      }
    }
  }

  private addBannerRig(side: -1 | 1): void {
    const poleLeft = new Mesh(
      new BoxGeometry(0.16, 5, 0.16),
      new MeshStandardMaterial({ color: '#ebe7de' }),
    );
    poleLeft.position.set(side * 5.7, 2.5, -17);
    this.scene.add(poleLeft);

    const poleRight = poleLeft.clone();
    poleRight.position.z = -24.5;
    this.scene.add(poleRight);

    const rail = new Mesh(
      new BoxGeometry(0.16, 0.16, 7.8),
      new MeshStandardMaterial({ color: '#ebe7de' }),
    );
    rail.position.set(side * 5.7, 4.7, -20.75);
    this.scene.add(rail);

    const sideBanner = new Mesh(
      new PlaneGeometry(2.2, 5.8),
      new MeshStandardMaterial({
        map: this.createBannerTexture(side > 0 ? 'TEAM FAMILY' : 'NATIONAL TRIAL', side > 0 ? '#247a6d' : '#3b82f6'),
        side: DoubleSide,
      }),
    );
    sideBanner.position.set(side * 5.45, 2.7, -20.75);
    sideBanner.rotation.y = side > 0 ? -0.06 : 0.06;
    this.scene.add(sideBanner);
  }

  private addFamilyCheerStands(): void {
    const keys = Object.keys(PORTRAITS) as Array<keyof typeof PORTRAITS>;
    const anchors = [
      { x: -7.4, z: -12.8, rotation: 0.16 },
      { x: -8.8, z: -21.4, rotation: 0.18 },
      { x: 7.4, z: -12.8, rotation: -0.16 },
      { x: 8.8, z: -21.4, rotation: -0.18 },
    ];

    keys.forEach((key, index) => {
      const anchor = anchors[index];
      const standee = this.createFamilyCheerStand(key);
      standee.root.position.set(anchor.x, 0, anchor.z);
      standee.root.rotation.y = anchor.rotation;
      standee.baseRotationY = anchor.rotation;
      standee.phase = index * 0.85;
      this.familyStandees.push(standee);
      this.scene.add(standee.root);
    });
  }

  private createFamilyCheerStand(key: keyof typeof PORTRAITS): FamilyStandee {
    const info = PORTRAITS[key];
    const stand = new Group();

    const platform = new Mesh(
      new BoxGeometry(1.55, 0.22, 1.16),
      new MeshStandardMaterial({ color: '#847160', roughness: 0.8 }),
    );
    platform.position.y = 0.11;

    const riser = new Mesh(
      new BoxGeometry(1.08, 0.34, 0.74),
      new MeshStandardMaterial({ color: '#f6efe1', roughness: 0.7 }),
    );
    riser.position.set(0, 0.39, 0);

    const frame = new Mesh(
      new BoxGeometry(1.02, 1.52, 0.12),
      new MeshStandardMaterial({ color: '#d9cab4', roughness: 0.55 }),
    );
    frame.position.set(0, 1.34, -0.02);

    const photoPanel = new Mesh(
      new PlaneGeometry(0.86, 1.32),
      new MeshStandardMaterial({
        map: this.loadPortraitTexture(key),
        transparent: true,
        alphaTest: 0.02,
        side: DoubleSide,
      }),
    );
    photoPanel.position.set(0, 1.34, 0.05);

    const topAccent = new Mesh(
      new BoxGeometry(1.04, 0.12, 0.08),
      new MeshStandardMaterial({ color: info.accent, roughness: 0.45 }),
    );
    topAccent.position.set(0, 2.08, 0.02);

    const namePlate = new Mesh(
      new BoxGeometry(0.94, 0.16, 0.12),
      new MeshStandardMaterial({ color: '#fff7eb', roughness: 0.6 }),
    );
    namePlate.position.set(0, 0.74, 0.08);

    const nameBand = new Mesh(
      new BoxGeometry(0.78, 0.05, 0.02),
      new MeshStandardMaterial({ color: info.accent }),
    );
    nameBand.position.set(0, 0.74, 0.15);

    const backBrace = new Mesh(
      new BoxGeometry(0.18, 1.34, 0.18),
      new MeshStandardMaterial({ color: '#7f6958', roughness: 0.72 }),
    );
    backBrace.position.set(0, 1.12, -0.38);
    backBrace.rotation.x = -0.24;

    const pole = new Mesh(
      new BoxGeometry(0.05, 0.86, 0.05),
      new MeshStandardMaterial({ color: '#7f6958', roughness: 0.76 }),
    );
    pole.position.set(0.56, 1.26, -0.18);

    const cheerBanner = new Mesh(
      new PlaneGeometry(0.48, 0.28),
      new MeshStandardMaterial({
        map: this.createCheerTexture(`${info.label} 응원`, info.accent),
        side: DoubleSide,
      }),
    );
    cheerBanner.position.set(0.81, 1.56, -0.08);
    cheerBanner.rotation.y = -0.1;

    stand.add(platform, riser, frame, photoPanel, topAccent, namePlate, nameBand, backBrace, pole, cheerBanner);
    return {
      root: stand,
      photoPanel,
      cheerBanner,
      baseY: 0,
      baseRotationY: 0,
      phase: 0,
    };
  }

  private updateCamera(snapshot: AimSnapshot, scopeRatio: number): void {
    const aimPoint = resolveAimPoint(snapshot.yaw, snapshot.pitch);
    const target = new Vector3(
      aimPoint.targetX,
      TARGET_CENTER_Y + aimPoint.targetY,
      -TARGET_DISTANCE,
    );
    const targetFov = Math.max(10, 64 - scopeRatio * 57);
    this.currentFov += (targetFov - this.currentFov) * 0.18;
    this.camera.fov = this.currentFov;
    this.camera.updateProjectionMatrix();
    this.camera.lookAt(target);
    this.bowGroup.rotation.z = snapshot.yaw * -0.03;
  }

  private updateBow(drawRatio: number): void {
    const clamped = Math.max(0, Math.min(drawRatio, 1));
    this.previewArrow.position.z = -0.98 + clamped * 0.24;
    this.previewArrow.position.x = 0.03 - clamped * 0.03;
    const points = [
      new Vector3(-0.05, 0.36, -0.92),
      new Vector3(-0.02 - clamped * 0.13, 0, -0.89 + clamped * 0.035),
      new Vector3(-0.05, -0.36, -0.92),
    ];
    this.stringLine.geometry.setFromPoints(points);
    this.previewArrow.visible = !this.activeShot;
    this.drawHand.position.set(-0.02 - clamped * 0.13, -0.01, -0.89 + clamped * 0.035);
    this.drawHand.rotation.y = -0.25 - clamped * 0.22;
    this.drawHand.rotation.z = -0.08 + clamped * 0.04;
  }

  private updateShot(): void {
    if (!this.activeShot) {
      return;
    }

    const speed = this.reduceMotion ? 3.6 : 1.6;
    this.activeShot.progress += speed;
    const index = Math.min(Math.floor(this.activeShot.progress), this.activeShot.path.length - 2);
    const current = this.activeShot.path[index];
    const next = this.activeShot.path[index + 1];
    this.activeShot.arrow.position.copy(current);
    this.activeShot.arrow.lookAt(next);

    if (index >= this.activeShot.path.length - 2) {
      const finished = this.activeShot;
      this.activeShot = null;
      finished.resolve();
    }
  }

  private updateAmbientMotion(): void {
    if (this.familyStandees.length === 0) {
      return;
    }

    const time = performance.now() * 0.001;
    const motionScale = this.reduceMotion ? 0.38 : 1;

    this.familyStandees.forEach((standee) => {
      const bob = Math.max(0, Math.sin(time * 1.9 + standee.phase)) * 0.045 * motionScale;
      const sway = Math.sin(time * 2.4 + standee.phase) * 0.065 * motionScale;
      const flutter = Math.sin(time * 4.2 + standee.phase) * 0.18 * motionScale;

      standee.root.position.y = standee.baseY + bob;
      standee.root.rotation.y = standee.baseRotationY + sway * 0.3;
      standee.photoPanel.rotation.y = sway;
      standee.photoPanel.rotation.z = Math.sin(time * 1.35 + standee.phase) * 0.028 * motionScale;
      standee.cheerBanner.rotation.z = 0.08 + flutter;
      standee.cheerBanner.rotation.x = 0.03 + sway * 0.25;
    });
  }

  private pinArrow(arrow: Group, hitX: number, hitY: number, direction: Vector3): void {
    const hitPoint = new Vector3(hitX, TARGET_CENTER_Y + hitY, -TARGET_DISTANCE).addScaledVector(direction, 0.03);
    arrow.position.copy(hitPoint).sub(direction.clone().multiplyScalar(ARROW_TIP_OFFSET));
    arrow.lookAt(hitPoint.clone().add(direction));

    this.stuckArrows.push(arrow);
    if (this.stuckArrows.length > 5) {
      const removed = this.stuckArrows.shift();
      if (removed) {
        this.scene.remove(removed);
      }
    }

    const impact = new Mesh(
      new CircleGeometry(0.026, 18),
      new MeshStandardMaterial({ color: '#111827', side: DoubleSide }),
    );
    impact.position.set(hitX, TARGET_CENTER_Y + hitY, -TARGET_DISTANCE + 0.01);
    this.impactGroup.add(impact);
    if (this.impactGroup.children.length > 8) {
      const removed = this.impactGroup.children[0];
      this.impactGroup.remove(removed);
    }
  }

  private createArrow(withScale: boolean): Group {
    const group = new Group();

    const shaft = new Mesh(
      new CylinderGeometry(0.012, 0.012, ARROW_SHAFT_LENGTH, 10),
      new MeshStandardMaterial({ color: '#d4b281' }),
    );
    shaft.rotation.x = Math.PI / 2;

    const head = new Mesh(
      new ConeGeometry(0.03, ARROW_HEAD_LENGTH, 10),
      new MeshStandardMaterial({ color: '#30343f' }),
    );
    head.rotation.x = -Math.PI / 2;
    head.position.z = -(ARROW_SHAFT_LENGTH * 0.5 + ARROW_HEAD_LENGTH * 0.5);

    const nock = new Mesh(
      new CylinderGeometry(0.018, 0.018, 0.035, 10),
      new MeshStandardMaterial({ color: '#f7efe0' }),
    );
    nock.rotation.x = Math.PI / 2;
    nock.position.z = ARROW_SHAFT_LENGTH * 0.5 + 0.015;

    const wrap = new Mesh(
      new CylinderGeometry(0.014, 0.014, 0.08, 10),
      new MeshStandardMaterial({ color: '#a94e4e' }),
    );
    wrap.rotation.x = Math.PI / 2;
    wrap.position.z = ARROW_SHAFT_LENGTH * 0.24;

    const featherPalette = ['#d9485a', '#f0b13c', '#2f8f83'];
    for (let index = 0; index < 3; index += 1) {
      const feather = new Mesh(
        new PlaneGeometry(0.16, 0.05),
        new MeshStandardMaterial({ color: featherPalette[index], side: DoubleSide }),
      );
      feather.rotation.y = Math.PI / 2;
      feather.rotation.z = (Math.PI * 2 * index) / 3;
      feather.position.set(0, 0.028, ARROW_SHAFT_LENGTH * 0.34);
      group.add(feather);
    }

    group.add(shaft, head, nock, wrap);
    if (!withScale) {
      group.scale.setScalar(0.96);
    }

    return group;
  }

  private createBowHand(): Group {
    const group = new Group();
    const skin = new MeshStandardMaterial({ color: '#f0d2b3' });
    const sleeve = new MeshStandardMaterial({ color: '#4f6f88' });

    const forearm = new Mesh(new BoxGeometry(0.22, 0.16, 0.68), sleeve);
    forearm.position.set(0.34, -0.12, -0.54);
    forearm.rotation.y = 0.24;
    forearm.rotation.z = -0.16;

    const wrist = new Mesh(new BoxGeometry(0.16, 0.12, 0.22), skin);
    wrist.position.set(0.18, -0.03, -0.82);
    wrist.rotation.y = 0.18;

    const hand = new Mesh(new BoxGeometry(0.13, 0.12, 0.15), skin);
    hand.position.set(0.13, 0.01, -0.95);

    group.add(forearm, wrist, hand);
    return group;
  }

  private createDrawHand(): Group {
    const group = new Group();
    const skin = new MeshStandardMaterial({ color: '#f0d2b3' });
    const sleeve = new MeshStandardMaterial({ color: '#9c4e4e' });

    const forearm = new Mesh(new BoxGeometry(0.2, 0.15, 0.56), sleeve);
    forearm.position.set(0.3, -0.11, 0.24);
    forearm.rotation.y = -0.5;
    forearm.rotation.z = -0.12;

    const wrist = new Mesh(new BoxGeometry(0.15, 0.11, 0.2), skin);
    wrist.position.set(0.12, -0.04, 0.06);
    wrist.rotation.y = -0.24;

    const hand = new Mesh(new BoxGeometry(0.12, 0.11, 0.14), skin);
    hand.position.set(0.02, 0, 0);

    group.add(forearm, wrist, hand);
    return group;
  }

  private createString(): Line {
    const material = new LineBasicMaterial({ color: '#f8fafc' });
    const line = new Line(undefined, material);
    line.geometry.setFromPoints([
      new Vector3(-0.05, 0.36, -0.92),
      new Vector3(-0.02, 0, -0.89),
      new Vector3(-0.05, -0.36, -0.92),
    ]);
    return line;
  }

  private createTargetTexture(): CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 2048;
    const context = canvas.getContext('2d');

    if (!context) {
      return new CanvasTexture(canvas);
    }

    context.fillStyle = '#d6c39a';
    context.fillRect(0, 0, canvas.width, canvas.height);
    const colors = ['#f5f5f4', '#111827', '#38bdf8', '#2563eb', '#ef4444', '#f59e0b'];

    for (let ring = 10; ring > 0; ring -= 1) {
      const colorIndex = Math.floor((10 - ring) / 2);
      context.beginPath();
      context.fillStyle = colors[colorIndex];
      context.arc(1024, 1024, (ring / 10) * 960, 0, Math.PI * 2);
      context.fill();
    }

    context.strokeStyle = '#f8fafc';
    context.lineWidth = 6;
    for (let ring = 1; ring <= 10; ring += 1) {
      context.beginPath();
      context.arc(1024, 1024, (ring / 10) * 960, 0, Math.PI * 2);
      context.stroke();
    }

    return this.enhanceTexture(new CanvasTexture(canvas));
  }

  private createBannerTexture(label: string, accent: string): CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 512;
    const context = canvas.getContext('2d');

    if (!context) {
      return new CanvasTexture(canvas);
    }

    context.fillStyle = '#f7f1e5';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = accent;
    context.fillRect(0, 0, canvas.width, 54);
    context.fillRect(0, canvas.height - 54, canvas.width, 54);

    context.fillStyle = 'rgba(22, 36, 63, 0.08)';
    context.fillRect(74, 84, canvas.width - 148, canvas.height - 168);

    context.fillStyle = '#16243f';
    context.font = '700 164px "Trebuchet MS", sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(label, canvas.width / 2, canvas.height / 2);

    return this.enhanceTexture(new CanvasTexture(canvas));
  }

  private createCheerTexture(label: string, accent: string): CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const context = canvas.getContext('2d');

    if (!context) {
      return new CanvasTexture(canvas);
    }

    context.fillStyle = '#fff7eb';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = accent;
    context.fillRect(0, 0, canvas.width, 54);
    context.fillRect(0, canvas.height - 54, canvas.width, 54);

    context.fillStyle = 'rgba(22, 36, 63, 0.1)';
    context.fillRect(48, 84, canvas.width - 96, canvas.height - 168);

    context.fillStyle = '#16243f';
    context.font = '700 88px "Trebuchet MS", sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(label, canvas.width / 2, canvas.height / 2);

    return this.enhanceTexture(new CanvasTexture(canvas));
  }

  private enhanceTexture(texture: CanvasTexture): CanvasTexture {
    texture.anisotropy = Math.min(this.renderer.capabilities.getMaxAnisotropy(), 8);
    texture.needsUpdate = true;
    return texture;
  }

  private loadPortraitTexture(key: keyof typeof PORTRAITS): Texture {
    const texture = this.textureLoader.load(getPortraitImageUrl(key), (loaded) => {
      loaded.anisotropy = Math.min(this.renderer.capabilities.getMaxAnisotropy(), 8);
      loaded.needsUpdate = true;
    });
    return texture;
  }
}
