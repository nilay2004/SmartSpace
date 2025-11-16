/// <reference path="../../lib/jQuery.d.ts" />
/// <reference path="../model/floorplan.ts" />
/// <reference path="floorplanner_view.ts" />

module BP3D.Floorplanner {

  const snapTolerance = 25;

  // Declare internal types that expose private methods safely
  // This is the ONLY correct way in strict TypeScript
  type FloorplannerCorner = Model.Corner & {
    move(newX: number, newY: number): void;
    snapToAxis(tolerance: number): void;
    removeAll(): void;
  };

  type FloorplannerWall = Model.Wall & {
    relativeMove(dx: number, dy: number): void;
    snapToAxis(tolerance: number): void;
  };

  export class Floorplanner {

    public mode = 0;
    public activeWall: FloorplannerWall | null = null;
    public activeCorner: FloorplannerCorner | null = null;

    public originX = 0;
    public originY = 0;

    public targetX = 0;
    public targetY = 0;
    public lastNode: Model.Corner | null = null;

    private wallWidth: number;
    private modeResetCallbacks = $.Callbacks();

    private $canvas: JQuery<HTMLElement>;
    private view: FloorplannerView;

    private mouseDown = false;
    private mouseMoved = false;

    private mouseX = 0;
    private mouseY = 0;
    private rawMouseX = 0;
    private rawMouseY = 0;

    private lastX = 0;
    private lastY = 0;

    private cmPerPixel: number;
    private pixelsPerCm: number;

    constructor(canvas: string, private floorplan: Model.Floorplan) {
      this.$canvas = $("#" + canvas);
      if (this.$canvas.length === 0) {
        throw new Error(`Canvas element "#${canvas}" not found.`);
      }

      this.view = new FloorplannerView(this.floorplan, this, canvas);

      const cmPerFoot = 30.48;
      const pixelsPerFoot = 15.0;
      this.cmPerPixel = cmPerFoot / pixelsPerFoot;
      this.pixelsPerCm = pixelsPerFoot / cmPerFoot;

      this.wallWidth = 10.0 * this.pixelsPerCm;

      this.setMode(floorplannerModes.MOVE);

      const scope = this;

      this.$canvas
        .mousedown((e: JQuery.MouseDownEvent) => scope.mousedown(e))
        .mousemove((e: JQuery.MouseMoveEvent) => scope.mousemove(e))
        .mouseup(() => scope.mouseup())
        .mouseleave(() => scope.mouseleave());

      $(document).keyup((e: JQuery.KeyUpEvent) => {
        if (e.key === "Escape" || e.keyCode === 27) {
          scope.escapeKey();
        }
      });

      floorplan.roomLoadedCallbacks.add(() => scope.reset());
    }

    private escapeKey(): void {
      this.setMode(floorplannerModes.MOVE);
    }

    private updateTarget(): void {
      if (this.mode === floorplannerModes.DRAW && this.lastNode) {
        this.targetX = Math.abs(this.mouseX - this.lastNode.x) < snapTolerance
          ? this.lastNode.x
          : this.mouseX;
        this.targetY = Math.abs(this.mouseY - this.lastNode.y) < snapTolerance
          ? this.lastNode.y
          : this.mouseY;
      } else {
        this.targetX = this.mouseX;
        this.targetY = this.mouseY;
      }
      this.view.draw();
    }

    private mousedown(e: JQuery.MouseDownEvent): void {
      this.mouseDown = true;
      this.mouseMoved = false;
      this.lastX = e.clientX;
      this.lastY = e.clientY;

      if (this.mode === floorplannerModes.DELETE) {
        if (this.activeCorner) {
          this.activeCorner.removeAll();
        } else if (this.activeWall) {
          this.activeWall.remove();
        } else {
          this.setMode(floorplannerModes.MOVE);
        }
      }
    }

    private mousemove(e: JQuery.MouseMoveEvent): void {
      this.mouseMoved = true;
      this.rawMouseX = e.clientX;
      this.rawMouseY = e.clientY;

      const offset = this.$canvas.offset();
      if (!offset) return;

      const canvasX = e.clientX - offset.left;
      const canvasY = e.clientY - offset.top;

      this.mouseX = canvasX * this.cmPerPixel + this.originX;
      this.mouseY = canvasY * this.cmPerPixel + this.originY;

      if (this.mode === floorplannerModes.DRAW || (this.mode === floorplannerModes.MOVE && this.mouseDown)) {
        this.updateTarget();
      }

      if (this.mode !== floorplannerModes.DRAW && !this.mouseDown) {
        const hoverCorner = this.floorplan.overlappedCorner(this.mouseX, this.mouseY);
        const hoverWall = this.floorplan.overlappedWall(this.mouseX, this.mouseY);
        let needsDraw = false;

        if (hoverCorner !== this.activeCorner) {
          this.activeCorner = hoverCorner as FloorplannerCorner;
          needsDraw = true;
        }
        if (this.activeCorner === null && hoverWall !== this.activeWall) {
          this.activeWall = hoverWall as FloorplannerWall;
          needsDraw = true;
        } else if (this.activeCorner !== null) {
          this.activeWall = null;
        }
        if (needsDraw) this.view.draw();
      }

      // Panning
      if (this.mouseDown && !this.activeCorner && !this.activeWall) {
        this.originX += (this.lastX - this.rawMouseX) * this.cmPerPixel;
        this.originY += (this.lastY - this.rawMouseY) * this.cmPerPixel;
        this.lastX = this.rawMouseX;
        this.lastY = this.rawMouseY;
        this.view.draw();
      }

      // Dragging
      if (this.mode === floorplannerModes.MOVE && this.mouseDown) {
        if (this.activeCorner) {
          this.activeCorner.move(this.mouseX, this.mouseY);
          this.activeCorner.snapToAxis(snapTolerance);
        } else if (this.activeWall) {
          this.activeWall.relativeMove(
            (this.rawMouseX - this.lastX) * this.cmPerPixel,
            (this.rawMouseY - this.lastY) * this.cmPerPixel
          );
          this.activeWall.snapToAxis(snapTolerance);
          this.lastX = this.rawMouseX;
          this.lastY = this.rawMouseY;
        }
        this.view.draw();
      }
    }

    private mouseup(): void {
      this.mouseDown = false;

      if (this.mode === floorplannerModes.DRAW && !this.mouseMoved) {
        const corner = this.floorplan.newCorner(this.targetX, this.targetY);
        if (this.lastNode) {
          this.floorplan.newWall(this.lastNode, corner);
        }
        if (corner.mergeWithIntersected() && this.lastNode) {
          this.setMode(floorplannerModes.MOVE);
        }
        this.lastNode = corner;
      }
    }

    private mouseleave(): void {
      this.mouseDown = false;
    }

    private reset(): void {
      this.resizeView();
      this.setMode(floorplannerModes.MOVE);
      this.resetOrigin();
      this.view.draw();
    }

    private resizeView(): void {
      this.view.handleWindowResize();
    }

    private setMode(mode: number): void {
      this.lastNode = null;
      this.mode = mode;
      this.modeResetCallbacks.fire(mode);
      this.updateTarget();
      this.view.draw();
    }

    private resetOrigin(): void {
      const width = this.$canvas.innerWidth() ?? 0;
      const height = this.$canvas.innerHeight() ?? 0;
      const center = this.floorplan.getCenter();

      this.originX = center.x * this.pixelsPerCm - width / 2;
      this.originY = center.z * this.pixelsPerCm - height / 2;
    }

    public convertX(x: number): number {
      return (x - this.originX) * this.pixelsPerCm;
    }

    public convertY(y: number): number {
      return (y - this.originY) * this.pixelsPerCm;
    }
  }
}