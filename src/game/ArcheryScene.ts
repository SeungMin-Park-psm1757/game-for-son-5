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

interface ActiveShot {
  path: Vector3[];
  progress: number;
  arrow: Group;
  resolve: () => void;
}

export class ArcheryScene {
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(65, 1, 0.1, 200);
  private readonly renderer = new WebGLRenderer({ antialias: true, alpha: true });
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

  constructor(private readonly host: HTMLElement, private readonly reduceMotion: boolean) {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(host.clientWidth, host.clientHeight);
    this.renderer.outputColorSpace = 'srgb';
    this.host.append(this.renderer.domElement);
    this.buildWorld();
    this.resize();
    window.addEventListener('resize', this.resize);
  }

  public frame(snapshot: AimSnapshot, drawRatio: number): void {
    this.updateCamera(snapshot);
    this.updateBow(drawRatio);
    this.updateShot();
    this.renderer.render(this.scene, this.camera);
  }

  public async playShot(path: Vector3[], hitX: number, hitY: number): Promise<void> {
    const arrow = this.createArrow(true);
    this.scene.add(arrow);

    return new Promise((resolve) => {
      this.activeShot = {
        path,
        progress: 0,
        arrow,
        resolve: () => {
          this.pinArrow(arrow, hitX, hitY);
          resolve();
        },
      };
    });
  }

  public destroy(): void {
    window.removeEventListener('resize', this.resize);
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
    this.scene.background = new Color('#b9d9f2');
    this.scene.add(new AmbientLight('#fff2dd', 1.5));

    const sun = new DirectionalLight('#fff8e8', 2.8);
    sun.position.set(10, 16, 6);
    this.scene.add(sun);

    const ground = new Mesh(
      new PlaneGeometry(70, 90),
      new MeshStandardMaterial({ color: '#8fbf76' }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.position.z = -26;
    this.scene.add(ground);

    for (const side of [-1, 1] as const) {
      for (let row = 0; row < 5; row += 1) {
        const stand = new Mesh(
          new BoxGeometry(6, 1.2 + row * 0.15, 4),
          new MeshStandardMaterial({ color: row % 2 === 0 ? '#5b6b7d' : '#6c7f90' }),
        );
        stand.position.set(side * (8 + row * 2.7), 0.6 + row * 0.1, -18 - row * 7);
        this.scene.add(stand);
      }
    }

    for (const side of [-1, 1] as const) {
      const banner = new Mesh(
        new PlaneGeometry(2.2, 1.2),
        new MeshStandardMaterial({ color: side > 0 ? '#ffcc66' : '#7dd3fc', side: DoubleSide }),
      );
      banner.position.set(side * 5.6, 2.6, -20);
      banner.rotation.y = side > 0 ? -0.18 : 0.18;
      this.scene.add(banner);
    }

    const targetStand = new Mesh(
      new CylinderGeometry(0.08, 0.08, 2.2, 10),
      new MeshStandardMaterial({ color: '#6b4f32' }),
    );
    targetStand.position.set(0, 1.1, -TARGET_DISTANCE - 0.2);
    this.scene.add(targetStand);

    const targetBack = new Mesh(
      new CircleGeometry(0.72, 24),
      new MeshStandardMaterial({ color: '#d6c39a' }),
    );
    targetBack.position.set(0, TARGET_CENTER_Y, -TARGET_DISTANCE - 0.03);
    this.scene.add(targetBack);

    this.targetPlane.position.set(0, TARGET_CENTER_Y, -TARGET_DISTANCE);
    this.scene.add(this.targetPlane);
    this.scene.add(this.impactGroup);

    this.camera.position.set(0, 1.58, 6);
    this.camera.add(this.bowGroup);
    this.scene.add(this.camera);

    const bowLeft = new Mesh(
      new CylinderGeometry(0.018, 0.02, 0.88, 8),
      new MeshStandardMaterial({ color: '#7c4c2e' }),
    );
    bowLeft.rotation.z = 0.22;
    bowLeft.position.set(0.12, 0.08, -0.86);

    const bowRight = bowLeft.clone();
    bowRight.rotation.z = -0.22;
    bowRight.position.y = -0.08;

    this.previewArrow.position.set(0.03, 0.0, -0.84);
    this.bowGroup.position.set(0.42, -0.18, -0.12);
    this.bowGroup.add(bowLeft, bowRight, this.stringLine, this.previewArrow);
  }

  private updateCamera(snapshot: AimSnapshot): void {
    const target = new Vector3(
      Math.sin(snapshot.yaw * 0.12) * TARGET_DISTANCE * 0.9,
      TARGET_CENTER_Y + Math.sin(snapshot.pitch * 0.08) * 5.2,
      -TARGET_DISTANCE,
    );
    this.camera.lookAt(target);
    this.bowGroup.rotation.z = snapshot.yaw * -0.06;
  }

  private updateBow(drawRatio: number): void {
    const clamped = Math.max(0, Math.min(drawRatio, 1));
    this.previewArrow.position.z = -0.84 + clamped * 0.22;
    this.previewArrow.position.x = 0.03 - clamped * 0.025;
    const points = [
      new Vector3(-0.05, 0.36, -0.86),
      new Vector3(-0.015 - clamped * 0.12, 0, -0.83 + clamped * 0.03),
      new Vector3(-0.05, -0.36, -0.86),
    ];
    this.stringLine.geometry.setFromPoints(points);
    this.previewArrow.visible = !this.activeShot;
  }

  private updateShot(): void {
    if (!this.activeShot) {
      return;
    }

    const speed = this.reduceMotion ? 3.5 : 1.5;
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

  private pinArrow(arrow: Group, hitX: number, hitY: number): void {
    arrow.position.set(hitX, TARGET_CENTER_Y + hitY, -TARGET_DISTANCE + 0.2);
    arrow.rotation.x = 0.05;
    arrow.rotation.y = 0;
    this.stuckArrows.push(arrow);
    if (this.stuckArrows.length > 5) {
      const removed = this.stuckArrows.shift();
      if (removed) {
        this.scene.remove(removed);
      }
    }

    const impact = new Mesh(
      new CircleGeometry(0.025, 18),
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
      new CylinderGeometry(0.012, 0.012, 0.88, 8),
      new MeshStandardMaterial({ color: '#d6b37c' }),
    );
    shaft.rotation.z = Math.PI / 2;

    const head = new Mesh(
      new ConeGeometry(0.026, 0.08, 8),
      new MeshStandardMaterial({ color: '#8b5a2b' }),
    );
    head.rotation.z = -Math.PI / 2;
    head.position.x = 0.48;

    const featherTop = new Mesh(
      new PlaneGeometry(0.11, 0.03),
      new MeshStandardMaterial({ color: '#ef4444', side: DoubleSide }),
    );
    featherTop.position.set(-0.36, 0.02, 0);

    const featherSide = featherTop.clone();
    featherSide.rotation.x = Math.PI / 2;
    featherSide.material = new MeshStandardMaterial({ color: '#f59e0b', side: DoubleSide });

    group.add(shaft, head, featherTop, featherSide);
    if (!withScale) {
      group.scale.setScalar(0.92);
    }
    return group;
  }

  private createString(): Line {
    const material = new LineBasicMaterial({ color: '#f8fafc' });
    const line = new Line(undefined, material);
    line.geometry.setFromPoints([
      new Vector3(-0.05, 0.36, -0.86),
      new Vector3(-0.015, 0, -0.83),
      new Vector3(-0.05, -0.36, -0.86),
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
}
