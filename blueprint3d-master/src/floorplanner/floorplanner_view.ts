/// <reference path="../../lib/jQuery.d.ts" />
/// <reference path="../core/configuration.ts" />
/// <reference path="../core/dimensioning.ts" />
/// <reference path="../core/utils.ts" />
/// <reference path="../model/floorplan.ts" />
/// <reference path="../model/half_edge.ts" />
/// <reference path="../model/model.ts" />
/// <reference path="../model/wall.ts" />
/// <reference path="floorplanner.ts" />

module BP3D.Floorplanner {

  export const floorplannerModes = {
    MOVE: 0,
    DRAW: 1,
    DELETE: 2
  } as const;

  // Grid parameters
  const gridSpacing = 20;
  const gridWidth = 1;
  const gridColor = "#f1f1f1";

  // Room config
  const roomColor = "#f9f9f9";

  // Wall config
  const wallWidth = 5;
  const wallWidthHover = 7;
  const wallColor = "#dddddd";
  const wallColorHover = "#008cba";
  const edgeColor = "#888888";
  const edgeColorHover = "#008cba";
  const edgeWidth = 1;

  const deleteColor = "#ff0000";

  // Corner config
  const cornerRadius = 0;
  const cornerRadiusHover = 7;
  const cornerColor = "#cccccc";
  const cornerColorHover = "#008cba";

  export class FloorplannerView {

    private canvasElement: HTMLCanvasElement;
    private context: CanvasRenderingContext2D;

    constructor(
      private floorplan: Model.Floorplan,
      private viewmodel: Floorplanner,
      canvas: string
    ) {
      const element = document.getElementById(canvas);
      if (!element || !(element instanceof HTMLCanvasElement)) {
        throw new Error(`Canvas element with id "${canvas}" not found or not a canvas.`);
      }

      this.canvasElement = element;
      const ctx = this.canvasElement.getContext('2d');
      if (!ctx) {
        throw new Error("Failed to get 2D rendering context.");
      }
      this.context = ctx;

      const scope = this;
      $(window).resize(() => scope.handleWindowResize());
      this.handleWindowResize();
    }

    public handleWindowResize(): void {
      const $canvas = $("#" + this.canvasElement.id);
      const $parent = $canvas.parent();
      if (!$parent || $parent.length === 0) return;

      const height = $parent.innerHeight();
      const width = $parent.innerWidth();

      if (height === undefined || width === undefined) return;

      // FIXED: Use .css() or native properties to avoid jQuery overload errors
      $canvas.css({
        height: height + "px",
        width: width + "px"
      });

      // Also update canvas drawing buffer
      this.canvasElement.height = height;
      this.canvasElement.width = width;

      this.draw();
    }

    public draw(): void {
      this.context.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
      this.drawGrid();

      this.floorplan.getRooms().forEach(room => this.drawRoom(room));
      this.floorplan.getWalls().forEach(wall => this.drawWall(wall));
      this.floorplan.getCorners().forEach(corner => this.drawCorner(corner));

      if (this.viewmodel.mode === floorplannerModes.DRAW) {
        this.drawTarget(this.viewmodel.targetX, this.viewmodel.targetY, this.viewmodel.lastNode);
      }

      this.floorplan.getWalls().forEach(wall => this.drawWallLabels(wall));
    }

    private drawWallLabels(wall: Model.Wall): void {
      let edge: Model.HalfEdge | null = null;
      if (wall.backEdge && wall.frontEdge) {
        edge = wall.backEdge.interiorDistance < wall.frontEdge.interiorDistance
          ? wall.backEdge : wall.frontEdge;
      } else if (wall.backEdge) {
        edge = wall.backEdge;
      } else if (wall.frontEdge) {
        edge = wall.frontEdge;
      }
      if (edge) this.drawEdgeLabel(edge);
    }

    private drawWall(wall: Model.Wall): void {
      const hover = wall === this.viewmodel.activeWall;
      let color = wallColor;
      if (hover && this.viewmodel.mode === floorplannerModes.DELETE) {
        color = deleteColor;
      } else if (hover) {
        color = wallColorHover;
      }

      this.drawLine(
        this.viewmodel.convertX(wall.getStartX()),
        this.viewmodel.convertY(wall.getStartY()),
        this.viewmodel.convertX(wall.getEndX()),
        this.viewmodel.convertY(wall.getEndY()),
        hover ? wallWidthHover : wallWidth,
        color
      );

      if (!hover) {
        if (wall.frontEdge) this.drawEdge(wall.frontEdge, false);
        if (wall.backEdge) this.drawEdge(wall.backEdge, false);
      }
    }

    private drawEdgeLabel(edge: Model.HalfEdge): void {
      const pos = edge.interiorCenter();
      const length = edge.interiorDistance();
      if (length < 60) return;

      this.context.font = "normal 12px Arial";
      this.context.fillStyle = "#000000";
      this.context.textBaseline = "middle";
      this.context.textAlign = "center";
      this.context.strokeStyle = "#ffffff";
      this.context.lineWidth = 4;

      const text = Core.Dimensioning.cmToMeasure(length);
      const x = this.viewmodel.convertX(pos.x);
      const y = this.viewmodel.convertY(pos.y);

      this.context.strokeText(text, x, y);
      this.context.fillText(text, x, y);
    }

    private drawEdge(edge: Model.HalfEdge, hover: boolean): void {
      let color = edgeColor;
      if (hover && this.viewmodel.mode === floorplannerModes.DELETE) {
        color = deleteColor;
      } else if (hover) {
        color = edgeColorHover;
      }

      const corners = edge.corners();
      const xArr = corners.map(c => this.viewmodel.convertX(c.x));
      const yArr = corners.map(c => this.viewmodel.convertY(c.y));

      this.drawPolygon(xArr, yArr, false, null, true, color, edgeWidth);
    }

    private drawRoom(room: Model.Room): void {
      const xArr = room.corners.map(c => this.viewmodel.convertX(c.x));
      const yArr = room.corners.map(c => this.viewmodel.convertY(c.y));
      this.drawPolygon(xArr, yArr, true, roomColor);
    }

    private drawCorner(corner: Model.Corner): void {
      const hover = corner === this.viewmodel.activeCorner;
      let color = cornerColor;
      if (hover && this.viewmodel.mode === floorplannerModes.DELETE) {
        color = deleteColor;
      } else if (hover) {
        color = cornerColorHover;
      }

      this.drawCircle(
        this.viewmodel.convertX(corner.x),
        this.viewmodel.convertY(corner.y),
        hover ? cornerRadiusHover : cornerRadius,
        color
      );
    }

    private drawTarget(x: number, y: number, lastNode?: Model.Corner | null): void {
      this.drawCircle(
        this.viewmodel.convertX(x),
        this.viewmodel.convertY(y),
        cornerRadiusHover,
        cornerColorHover
      );

      if (lastNode) {
        this.drawLine(
          this.viewmodel.convertX(lastNode.x),
          this.viewmodel.convertY(lastNode.y),
          this.viewmodel.convertX(x),
          this.viewmodel.convertY(y),
          wallWidthHover,
          wallColorHover
        );
      }
    }

    private drawLine(
      startX: number, startY: number,
      endX: number, endY: number,
      width: number, color: string
    ): void {
      this.context.beginPath();
      this.context.moveTo(startX, startY);
      this.context.lineTo(endX, endY);
      this.context.lineWidth = width;
      this.context.strokeStyle = color;
      this.context.stroke();
    }

    private drawPolygon(
      xArr: number[], yArr: number[],
      fill: boolean, fillColor: string | null,
      stroke?: boolean, strokeColor?: string, strokeWidth?: number
    ): void {
      if (xArr.length === 0) return;

      this.context.beginPath();
      this.context.moveTo(xArr[0], yArr[0]);
      for (let i = 1; i < xArr.length; i++) {
        this.context.lineTo(xArr[i], yArr[i]);
      }
      this.context.closePath();

      if (fill && fillColor) {
        this.context.fillStyle = fillColor;
        this.context.fill();
      }
      if (stroke && strokeColor && strokeWidth != null) {
        this.context.lineWidth = strokeWidth;
        this.context.strokeStyle = strokeColor;
        this.context.stroke();
      }
    }

    private drawCircle(centerX: number, centerY: number, radius: number, fillColor: string): void {
      if (radius <= 0) return;
      this.context.beginPath();
      this.context.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
      this.context.fillStyle = fillColor;
      this.context.fill();
    }

    private calculateGridOffset(n: number): number {
      return n >= 0
        ? (n + gridSpacing / 2) % gridSpacing - gridSpacing / 2
        : (n - gridSpacing / 2) % gridSpacing + gridSpacing / 2;
    }

    private drawGrid(): void {
      const offsetX = this.calculateGridOffset(-this.viewmodel.originX);
      const offsetY = this.calculateGridOffset(-this.viewmodel.originY);
      const width = this.canvasElement.width;
      const height = this.canvasElement.height;

      const xSteps = Math.floor(width / gridSpacing) + 2;
      const ySteps = Math.floor(height / gridSpacing) + 2;

      for (let i = -1; i < xSteps; i++) {
        const x = gridSpacing * i + offsetX;
        this.drawLine(x, 0, x, height, gridWidth, gridColor);
      }
      for (let i = -1; i < ySteps; i++) {
        const y = gridSpacing * i + offsetY;
        this.drawLine(0, y, width, y, gridWidth, gridColor);
      }
    }
  }
}