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
  Vector3,
  WebGLRenderer,
} from 'three';
import { TARGET_CENTER_Y, TARGET_DISTANCE } from './Ballistics';
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

export class ArcheryScene {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(64, 1, 0.1, 200);
  private readonly renderer = new WebGLRenderer({ antialias: true, alpha: true });
  private readonly resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(() => this.resize()) : null;
  private readonly bowGroup = new Group();
  private readonly previewArrow = this.createArrow(false);
  private readonly stringLine = this.createString();
  private readonly targetPlane = new Mesh(
    new PlaneGeometry(1.35, 1.35),
    new MeshLambertMaterial({ map: this.createTargetTexture(), side: DoubleSide }),
  );
  private readonly impactGroup = new Group();
  private readonly stuckArrows: Group[] = [];
  private activeShot: ActiveShot | null = null;
  private currentFov = 64;

  constructor(private readonly host: HTMLElement, private readonly reduceMotion: boolean) {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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
    this.bowGroup.add(bowLeft, bowRight, this.stringLine, this.previewArrow);
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

  private updateCamera(snapshot: AimSnapshot, scopeRatio: number): void {
    const target = new Vector3(
      Math.sin(snapshot.yaw * 0.05) * TARGET_DISTANCE * 0.34,
      TARGET_CENTER_Y + Math.sin(snapshot.pitch * 0.055) * 2.9,
      -TARGET_DISTANCE,
    );
    const targetFov = 64 - scopeRatio * 38;
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
    canvas.width = 1024;
    canvas.height = 1024;
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
      context.arc(512, 512, (ring / 10) * 480, 0, Math.PI * 2);
      context.fill();
    }

    context.strokeStyle = '#f8fafc';
    context.lineWidth = 3;
    for (let ring = 1; ring <= 10; ring += 1) {
      context.beginPath();
      context.arc(512, 512, (ring / 10) * 480, 0, Math.PI * 2);
      context.stroke();
    }

    const texture = new CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private createBannerTexture(label: string, accent: string): CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const context = canvas.getContext('2d');

    if (!context) {
      return new CanvasTexture(canvas);
    }

    context.fillStyle = '#f7f1e5';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = accent;
    context.fillRect(0, 0, canvas.width, 34);
    context.fillRect(0, canvas.height - 34, canvas.width, 34);

    context.fillStyle = 'rgba(22, 36, 63, 0.08)';
    context.fillRect(38, 44, canvas.width - 76, canvas.height - 88);

    context.fillStyle = '#16243f';
    context.font = '700 86px "Trebuchet MS", sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(label, canvas.width / 2, canvas.height / 2);

    const texture = new CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }
}
