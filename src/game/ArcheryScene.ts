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
import type { ArrowTheme } from './playerProgress';
import type { AimSnapshot } from '../input/types';
import type { ChapterId } from '../types';

const ARROW_SHAFT_LENGTH = 1.04;
const ARROW_HEAD_LENGTH = 0.15;
const ARROW_TIP_OFFSET = ARROW_SHAFT_LENGTH * 0.5 + ARROW_HEAD_LENGTH;
const CROWD_COLORS = ['#d9685c', '#f0c05f', '#5ea3d8', '#7e87bf', '#6cb08b', '#d77f91'];
const DEFAULT_ARROW_THEME: ArrowTheme = {
  tip: '#30343f',
  wrap: '#8b5e3c',
  featherA: '#d9485a',
  featherB: '#f0b13c',
  featherC: '#2f8f83',
};

interface SceneTheme {
  sky: string;
  ground: string;
  lane: string;
  boundary: string;
  accent: string;
  accentSoft: string;
  accentAlt: string;
  banner: string;
  backdropLabel: string;
}

const CHAPTER_THEMES: Record<ChapterId, SceneTheme> = {
  practice: {
    sky: '#cfe2f4',
    ground: '#8dbd70',
    lane: '#dfe7d1',
    boundary: '#f6efe1',
    accent: '#b76506',
    accentSoft: '#f7ddac',
    accentAlt: '#247a6d',
    banner: '훈련장',
    backdropLabel: 'PRACTICE FIELD',
  },
  korea: {
    sky: '#c7def5',
    ground: '#8bb669',
    lane: '#e3ead6',
    boundary: '#f5efe2',
    accent: '#c45c2d',
    accentSoft: '#f6d8b2',
    accentAlt: '#1f6f66',
    banner: '서울 기록전',
    backdropLabel: 'SEOUL STAGE',
  },
  japan: {
    sky: '#d4e0f1',
    ground: '#89b46a',
    lane: '#e6ead8',
    boundary: '#f4eee1',
    accent: '#b63e3c',
    accentSoft: '#f4c8c1',
    accentAlt: '#5c677d',
    banner: '도쿄 기록전',
    backdropLabel: 'TOKYO STAGE',
  },
  usa: {
    sky: '#d2e5fa',
    ground: '#86b265',
    lane: '#e5eadb',
    boundary: '#f2ece0',
    accent: '#1d4ed8',
    accentSoft: '#c7d8fb',
    accentAlt: '#d97706',
    banner: 'LA 기록전',
    backdropLabel: 'LOS ANGELES FINAL',
  },
};

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
  private readonly theme: SceneTheme;
  private readonly resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(() => this.resize()) : null;
  private readonly bowGroup = new Group();
  private readonly bowHand = this.createBowHand();
  private readonly drawHand = this.createDrawHand();
  private currentArrowTheme: ArrowTheme = DEFAULT_ARROW_THEME;
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

  constructor(
    private readonly host: HTMLElement,
    private readonly reduceMotion: boolean,
    private readonly chapterId: ChapterId,
    arrowTheme?: ArrowTheme,
  ) {
    this.theme = CHAPTER_THEMES[chapterId];
    if (arrowTheme) {
      this.currentArrowTheme = arrowTheme;
    }
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.4));
    this.renderer.setSize(host.clientWidth, host.clientHeight);
    this.renderer.outputColorSpace = 'srgb';
    this.host.append(this.renderer.domElement);
    this.buildWorld();
    this.setArrowTheme(this.currentArrowTheme);
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

  public setArrowTheme(theme: ArrowTheme): void {
    this.currentArrowTheme = theme;
    this.applyArrowTheme(this.previewArrow, theme);
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
    this.scene.background = new Color(this.theme.sky);
    this.scene.add(new AmbientLight('#fff4dd', 1.55));

    const sun = new DirectionalLight('#fff8e8', 2.7);
    sun.position.set(9, 16, 7);
    this.scene.add(sun);

    const ground = new Mesh(
      new PlaneGeometry(80, 96),
      new MeshStandardMaterial({ color: this.theme.ground }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, 0, -28);
    this.scene.add(ground);

    const lane = new Mesh(
      new PlaneGeometry(8.2, TARGET_DISTANCE + 18),
      new MeshStandardMaterial({ color: this.theme.lane }),
    );
    lane.rotation.x = -Math.PI / 2;
    lane.position.set(0, 0.02, -TARGET_DISTANCE * 0.5 - 4.2);
    this.scene.add(lane);

    for (const side of [-1, 1] as const) {
      const boundary = new Mesh(
        new BoxGeometry(0.22, 0.18, TARGET_DISTANCE + 18),
        new MeshStandardMaterial({ color: this.theme.boundary }),
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

    const backdrop = new Mesh(
      new PlaneGeometry(48, 16.5),
      new MeshStandardMaterial({ map: this.createBackdropTexture(), side: DoubleSide }),
    );
    backdrop.position.set(0, 6.7, -38.4);
    this.scene.add(backdrop);

    this.addCeremonyGate();
    this.addSkyFestivalRig();

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
      new PlaneGeometry(1.68, 4.5),
      new MeshStandardMaterial({
        map: this.createSideMarkerTexture(side),
        side: DoubleSide,
        transparent: true,
      }),
    );
    sideBanner.position.set(side * 5.42, 2.58, -20.75);
    sideBanner.rotation.y = side > 0 ? -0.08 : 0.08;
    this.scene.add(sideBanner);
  }

  private addCeremonyGate(): void {
    const materials = {
      post: new MeshStandardMaterial({ color: '#f7efe0', roughness: 0.72 }),
      trim: new MeshStandardMaterial({ color: this.theme.accent, roughness: 0.42 }),
      plate: new MeshStandardMaterial({ color: this.theme.accentAlt, roughness: 0.5 }),
    };

    const leftPost = new Mesh(new BoxGeometry(0.42, 5.8, 0.42), materials.post);
    leftPost.position.set(-4.55, 2.92, -24.1);
    const rightPost = leftPost.clone();
    rightPost.position.x = 4.55;

    const topBeam = new Mesh(new BoxGeometry(9.8, 0.44, 0.44), materials.post);
    topBeam.position.set(0, 5.72, -24.1);

    const trimBeam = new Mesh(new BoxGeometry(9.2, 0.12, 0.12), materials.trim);
    trimBeam.position.set(0, 5.42, -23.82);

    const leftPlate = new Mesh(new BoxGeometry(1.15, 2.4, 0.08), materials.plate);
    leftPlate.position.set(-5.06, 3.34, -23.8);
    const rightPlate = leftPlate.clone();
    rightPlate.position.x = 5.06;

    this.scene.add(leftPost, rightPost, topBeam, trimBeam, leftPlate, rightPlate);
  }

  private addSkyFestivalRig(): void {
    const ropeMaterial = new MeshStandardMaterial({ color: '#f7efe0', roughness: 0.62 });
    const pennantColors = [this.theme.accent, this.theme.accentAlt, '#f7d48f'];
    const rows = [{ y: 7.45, z: -20.6, width: 11.2, pennants: 11, rotationZ: 0.012 }];

    rows.forEach((row, rowIndex) => {
      const rope = new Mesh(new BoxGeometry(row.width, 0.03, 0.03), ropeMaterial);
      rope.position.set(0, row.y, row.z);
      rope.rotation.z = row.rotationZ;
      this.scene.add(rope);

      const spacing = row.width / (row.pennants - 1);
      for (let index = 0; index < row.pennants; index += 1) {
        const pennant = new Mesh(
          new PlaneGeometry(0.34, 0.62),
          new MeshStandardMaterial({
            color: pennantColors[(index + rowIndex) % pennantColors.length],
            side: DoubleSide,
            roughness: 0.56,
          }),
        );
        pennant.position.set(-row.width * 0.5 + spacing * index, row.y - 0.3 - (index % 2) * 0.05, row.z);
        pennant.rotation.x = -0.08;
        pennant.rotation.z = (index % 2 === 0 ? 1 : -1) * 0.06;
        this.scene.add(pennant);
      }
    });
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
    shaft.name = 'shaft';
    shaft.rotation.x = Math.PI / 2;

    const head = new Mesh(
      new ConeGeometry(0.03, ARROW_HEAD_LENGTH, 10),
      new MeshStandardMaterial({ color: this.currentArrowTheme.tip }),
    );
    head.name = 'tip';
    head.rotation.x = -Math.PI / 2;
    head.position.z = -(ARROW_SHAFT_LENGTH * 0.5 + ARROW_HEAD_LENGTH * 0.5);

    const nock = new Mesh(
      new CylinderGeometry(0.018, 0.018, 0.035, 10),
      new MeshStandardMaterial({ color: '#f7efe0' }),
    );
    nock.name = 'nock';
    nock.rotation.x = Math.PI / 2;
    nock.position.z = ARROW_SHAFT_LENGTH * 0.5 + 0.015;

    const wrap = new Mesh(
      new CylinderGeometry(0.014, 0.014, 0.08, 10),
      new MeshStandardMaterial({ color: this.currentArrowTheme.wrap }),
    );
    wrap.name = 'wrap';
    wrap.rotation.x = Math.PI / 2;
    wrap.position.z = ARROW_SHAFT_LENGTH * 0.24;

    const featherPalette = [this.currentArrowTheme.featherA, this.currentArrowTheme.featherB, this.currentArrowTheme.featherC];
    for (let index = 0; index < 3; index += 1) {
      const feather = new Mesh(
        new PlaneGeometry(0.16, 0.05),
        new MeshStandardMaterial({ color: featherPalette[index], side: DoubleSide }),
      );
      feather.name = `feather-${index}`;
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

  private createBackdropTexture(): CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 4096;
    canvas.height = 1280;
    const context = canvas.getContext('2d');

    if (!context) {
      return new CanvasTexture(canvas);
    }

    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, this.theme.sky);
    gradient.addColorStop(0.46, '#ecf1ee');
    gradient.addColorStop(0.72, '#efe7d7');
    gradient.addColorStop(1, '#95b86a');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = 'rgba(255, 229, 170, 0.84)';
    context.beginPath();
    context.arc(canvas.width * 0.18, canvas.height * 0.18, 196, 0, Math.PI * 2);
    context.fill();

    const haze = context.createLinearGradient(0, 260, 0, 720);
    haze.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    haze.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = haze;
    context.fillRect(0, 240, canvas.width, 460);

    context.fillStyle = 'rgba(255, 248, 235, 0.12)';
    context.beginPath();
    context.moveTo(0, 420);
    context.lineTo(620, 290);
    context.lineTo(790, 620);
    context.lineTo(0, 820);
    context.closePath();
    context.fill();

    context.beginPath();
    context.moveTo(canvas.width, 410);
    context.lineTo(canvas.width - 620, 300);
    context.lineTo(canvas.width - 792, 630);
    context.lineTo(canvas.width, 806);
    context.closePath();
    context.fill();

    context.fillStyle = 'rgba(83, 111, 134, 0.14)';
    context.beginPath();
    context.moveTo(0, 760);
    context.lineTo(460, 584);
    context.lineTo(910, 700);
    context.lineTo(1380, 412);
    context.lineTo(1940, 726);
    context.lineTo(2500, 330);
    context.lineTo(3090, 708);
    context.lineTo(3610, 514);
    context.lineTo(4096, 760);
    context.lineTo(4096, 1280);
    context.lineTo(0, 1280);
    context.closePath();
    context.fill();

    context.fillStyle = 'rgba(55, 77, 96, 0.18)';
    context.beginPath();
    context.moveTo(0, 860);
    context.lineTo(520, 728);
    context.lineTo(960, 878);
    context.lineTo(1500, 642);
    context.lineTo(2140, 916);
    context.lineTo(2760, 684);
    context.lineTo(3340, 868);
    context.lineTo(4096, 780);
    context.lineTo(4096, 1280);
    context.lineTo(0, 1280);
    context.closePath();
    context.fill();

    context.fillStyle = 'rgba(255, 255, 255, 0.2)';
    context.fillRect(0, 1106, canvas.width, 18);

    context.fillStyle = 'rgba(255, 248, 239, 0.96)';
    context.fillRect(390, 878, 560, 214);
    context.fillRect(3146, 878, 560, 214);

    context.fillStyle = 'rgba(22, 36, 63, 0.08)';
    context.fillRect(438, 932, 464, 14);
    context.fillRect(3194, 932, 464, 14);
    context.fillRect(438, 994, 464, 14);
    context.fillRect(3194, 994, 464, 14);

    for (let block = 0; block < 10; block += 1) {
      const color = CROWD_COLORS[block % CROWD_COLORS.length];
      const leftX = 460 + block * 42;
      const rightX = 3216 + block * 42;
      const topY = block % 2 === 0 ? 966 : 1012;
      context.fillStyle = color;
      context.fillRect(leftX, topY, 24, 24);
      context.fillRect(leftX + 6, topY - 16, 12, 16);
      context.fillRect(rightX, topY, 24, 24);
      context.fillRect(rightX + 6, topY - 16, 12, 16);
    }

    context.fillStyle = 'rgba(255, 251, 244, 0.96)';
    context.fillRect(1384, 806, 1328, 262);
    context.fillStyle = this.theme.accent;
    context.fillRect(1528, 770, 1040, 24);
    context.fillStyle = this.theme.accentAlt;
    context.fillRect(1548, 836, 54, 192);
    context.fillRect(2494, 836, 54, 192);
    context.fillRect(1610, 854, 876, 22);

    context.fillStyle = 'rgba(22, 36, 63, 0.08)';
    context.fillRect(1656, 910, 784, 112);

    context.fillStyle = '#9a7446';
    context.fillRect(2028, 900, 12, 180);
    context.beginPath();
    context.arc(2034, 888, 64, 0, Math.PI * 2);
    context.fillStyle = '#f3efe2';
    context.fill();
    context.beginPath();
    context.arc(2034, 888, 52, 0, Math.PI * 2);
    context.fillStyle = '#202632';
    context.fill();
    context.beginPath();
    context.arc(2034, 888, 38, 0, Math.PI * 2);
    context.fillStyle = '#2e66cc';
    context.fill();
    context.beginPath();
    context.arc(2034, 888, 24, 0, Math.PI * 2);
    context.fillStyle = '#ce4937';
    context.fill();
    context.beginPath();
    context.arc(2034, 888, 10, 0, Math.PI * 2);
    context.fillStyle = '#ffe6a8';
    context.fill();

    context.strokeStyle = 'rgba(255, 255, 255, 0.72)';
    context.lineWidth = 8;
    context.beginPath();
    context.moveTo(1244, 1270);
    context.lineTo(1870, 1074);
    context.lineTo(2198, 1074);
    context.lineTo(2824, 1270);
    context.stroke();

    return this.enhanceTexture(new CanvasTexture(canvas));
  }

  private createSideMarkerTexture(side: -1 | 1): CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 2048;
    const context = canvas.getContext('2d');

    if (!context) {
      return new CanvasTexture(canvas);
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'rgba(255, 250, 241, 0.96)';
    context.fillRect(94, 60, canvas.width - 188, canvas.height - 120);

    context.fillStyle = this.theme.accent;
    context.fillRect(94, 60, canvas.width - 188, 62);
    context.fillRect(94, canvas.height - 122, canvas.width - 188, 62);

    context.fillStyle = 'rgba(22, 36, 63, 0.08)';
    context.fillRect(152, 168, canvas.width - 304, canvas.height - 336);

    const icon = this.chapterId === 'practice' ? 'kr' : side < 0 ? this.getChapterFlagKey() : 'festival';
    this.drawMarkerIcon(context, icon, canvas.width * 0.5, canvas.height * 0.5);

    return this.enhanceTexture(new CanvasTexture(canvas));
  }

  private getChapterFlagKey(): 'kr' | 'jp' | 'us' {
    if (this.chapterId === 'japan') {
      return 'jp';
    }
    if (this.chapterId === 'usa') {
      return 'us';
    }
    return 'kr';
  }

  private drawMarkerIcon(
    context: CanvasRenderingContext2D,
    icon: 'kr' | 'jp' | 'us' | 'festival',
    centerX: number,
    centerY: number,
  ): void {
    context.save();
    context.translate(centerX, centerY);

    if (icon === 'jp') {
      context.fillStyle = '#fffaf1';
      context.fillRect(-172, -120, 344, 240);
      context.beginPath();
      context.arc(0, 0, 74, 0, Math.PI * 2);
      context.fillStyle = '#d64545';
      context.fill();
      context.restore();
      return;
    }

    if (icon === 'us') {
      context.fillStyle = '#fffaf1';
      context.fillRect(-172, -120, 344, 240);
      for (let stripe = 0; stripe < 7; stripe += 1) {
        context.fillStyle = stripe % 2 === 0 ? '#d64545' : '#fffaf1';
        context.fillRect(-172, -120 + stripe * 34, 344, 18);
      }
      context.fillStyle = '#3157a6';
      context.fillRect(-172, -120, 150, 118);
      context.fillStyle = '#fffaf1';
      for (let row = 0; row < 3; row += 1) {
        for (let column = 0; column < 4; column += 1) {
          context.beginPath();
          context.arc(-144 + column * 30, -92 + row * 28, 5, 0, Math.PI * 2);
          context.fill();
        }
      }
      context.restore();
      return;
    }

    if (icon === 'festival') {
      const colors = ['#2563eb', '#111827', '#ef4444', '#f59e0b', '#16a34a'];
      const positions = [
        [-82, 0],
        [-22, 0],
        [38, 0],
        [-52, 54],
        [8, 54],
      ];
      positions.forEach(([x, y], index) => {
        context.beginPath();
        context.arc(x, y, 32, 0, Math.PI * 2);
        context.lineWidth = 10;
        context.strokeStyle = colors[index];
        context.stroke();
      });
      context.restore();
      return;
    }

    context.fillStyle = '#fffaf1';
    context.fillRect(-172, -120, 344, 240);

    context.beginPath();
    context.arc(0, 0, 62, Math.PI * 0.5, Math.PI * 1.5);
    context.fillStyle = '#d64545';
    context.fill();
    context.beginPath();
    context.arc(0, 0, 62, -Math.PI * 0.5, Math.PI * 0.5);
    context.fillStyle = '#2563eb';
    context.fill();
    context.beginPath();
    context.arc(0, -31, 31, 0, Math.PI * 2);
    context.fillStyle = '#2563eb';
    context.fill();
    context.beginPath();
    context.arc(0, 31, 31, 0, Math.PI * 2);
    context.fillStyle = '#d64545';
    context.fill();

    context.fillStyle = '#111827';
    context.fillRect(-140, -86, 14, 44);
    context.fillRect(-140, 44, 14, 44);
    context.fillRect(-126, -86, 14, 14);
    context.fillRect(-126, -28, 14, 14);
    context.fillRect(-126, 44, 14, 14);
    context.fillRect(-126, 102, 14, 14);

    context.fillRect(112, -86, 14, 44);
    context.fillRect(112, 44, 14, 44);
    context.fillRect(126, -102, 14, 14);
    context.fillRect(126, -44, 14, 14);
    context.fillRect(126, 28, 14, 14);
    context.fillRect(126, 86, 14, 14);
    context.restore();
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

  private applyArrowTheme(group: Group, theme: ArrowTheme): void {
    group.traverse((node) => {
      if (!(node instanceof Mesh)) {
        return;
      }

      const material = node.material;
      if (!(material instanceof MeshStandardMaterial)) {
        return;
      }

      if (node.name === 'tip') {
        material.color.set(theme.tip);
      } else if (node.name === 'wrap') {
        material.color.set(theme.wrap);
      } else if (node.name === 'feather-0') {
        material.color.set(theme.featherA);
      } else if (node.name === 'feather-1') {
        material.color.set(theme.featherB);
      } else if (node.name === 'feather-2') {
        material.color.set(theme.featherC);
      }
    });
  }

  private loadPortraitTexture(key: keyof typeof PORTRAITS): Texture {
    const texture = this.textureLoader.load(getPortraitImageUrl(key), (loaded) => {
      loaded.anisotropy = Math.min(this.renderer.capabilities.getMaxAnisotropy(), 8);
      loaded.needsUpdate = true;
    });
    return texture;
  }
}
