// src/core/utils.ts
// Blueprint3D - Core Utility Functions (TypeScript strict-mode ready)

module BP3D.Core {

  /** Collection of utility functions. */
  export class Utils {

    /** Determines the distance of a point from a line. */
    public static pointDistanceFromLine(
      x: number, y: number,
      x1: number, y1: number,
      x2: number, y2: number
    ): number {
      const { x: px, y: py } = Utils.closestPointOnLine(x, y, x1, y1, x2, y2);
      const dx = x - px;
      const dy = y - py;
      return Math.sqrt(dx * dx + dy * dy);
    }

    /** Gets the projection of a point onto a line. */
    public static closestPointOnLine(
      x: number, y: number,
      x1: number, y1: number,
      x2: number, y2: number
    ): { x: number; y: number } {
      const A = x - x1;
      const B = y - y1;
      const C = x2 - x1;
      const D = y2 - y1;

      const dot = A * C + B * D;
      const lenSq = C * C + D * D;
      let param = lenSq !== 0 ? dot / lenSq : 0;

      let xx: number, yy: number;

      if (param < 0 || (x1 === x2 && y1 === y2)) {
        xx = x1;
        yy = y1;
      } else if (param > 1) {
        xx = x2;
        yy = y2;
      } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
      }

      return { x: xx, y: yy };
    }

    /** Gets the distance between two points. */
    public static distance(x1: number, y1: number, x2: number, y2: number): number {
      const dx = x2 - x1;
      const dy = y2 - y1;
      return Math.sqrt(dx * dx + dy * dy);
    }

    /** Gets the angle between two vectors (from origin) in radians (-π to π). */
    public static angle(x1: number, y1: number, x2: number, y2: number): number {
      const dot = x1 * x2 + y1 * y2;
      const det = x1 * y2 - y1 * x2;
      return -Math.atan2(det, dot);
    }

    /** Converts angle to range [0, 2π). */
    public static angle2pi(x1: number, y1: number, x2: number, y2: number): number {
      let theta = Utils.angle(x1, y1, x2, y2);
      if (theta < 0) theta += 2 * Math.PI;
      return theta;
    }

    /** Checks if an array of points is clockwise. */
    public static isClockwise(points: { x: number; y: number }[]): boolean {
      if (points.length < 3) return false;

      const subX = Math.min(0, ...points.map(p => p.x));
      const subY = Math.min(0, ...points.map(p => p.y));

      const translated = points.map(p => ({ x: p.x - subX, y: p.y - subY }));

      let sum = 0;
      for (let i = 0; i < translated.length; i++) {
        const c1 = translated[i];
        const c2 = translated[(i + 1) % translated.length];
        sum += (c2.x - c1.x) * (c2.y + c1.y);
      }

      return sum >= 0;
    }

    /** Generates a UUID v4-like GUID. */
    public static guid(): string {
      const s4 = () => Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
      return `${s4()}${s4()}-${s4()}-${s4()}-${s4()}-${s4()}${s4()}${s4()}`;
    }

    /** Checks if two polygons intersect. */
    public static polygonPolygonIntersect(
      firstCorners: { x: number; y: number }[],
      secondCorners: { x: number; y: number }[]
    ): boolean {
      for (let i = 0; i < firstCorners.length; i++) {
        const c1 = firstCorners[i];
        const c2 = firstCorners[(i + 1) % firstCorners.length];
        if (Utils.linePolygonIntersect(c1.x, c1.y, c2.x, c2.y, secondCorners)) {
          return true;  // FIXED: Removed corrupted "_String(return true);"
        }
      }
      return false;
    }

    /** Checks if a line segment intersects a polygon. */
    public static linePolygonIntersect(
      x1: number, y1: number, x2: number, y2: number,
      corners: { x: number; y: number }[]
    ): boolean {
      for (let i = 0; i < corners.length; i++) {
        const c1 = corners[i];
        const c2 = corners[(i + 1) % corners.length];
        if (Utils.lineLineIntersect(x1, y1, x2, y2, c1.x, c1.y, c2.x, c2.y)) {
          return true;
        }
      }
      return false;
    }

    /** Checks if two line segments intersect. */
    public static lineLineIntersect(
      x1: number, y1: number, x2: number, y2: number,
      x3: number, y3: number, x4: number, y4: number
    ): boolean {
      const ccw = (p1: { x: number; y: number }, p2: { x: number; y: number }, p3: { x: number; y: number }) =>
        (p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x);

      const a = { x: x1, y: y1 }, b = { x: x2, y: y2 };
      const c = { x: x3, y: y3 }, d = { x: x4, y: y4 };

      return ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);
    }

    /** Raycasting algorithm: is point inside polygon? */
    public static pointInPolygon(
      x: number, y: number,
      corners: { x: number; y: number }[],
      startX?: number,
      startY?: number
    ): boolean {
      startX ??= Math.min(...corners.map(c => c.x)) - 10;
      startY ??= Math.min(...corners.map(c => c.y)) - 10;

      let intersects = 0;
      for (let i = 0; i < corners.length; i++) {
        const a = corners[i];
        const b = corners[(i + 1) % corners.length];
        if (Utils.lineLineIntersect(startX, startY, x, y, a.x, a.y, b.x, b.y)) {
          intersects++;
        }
      }
      return intersects % 2 === 1;
    }

    /** All corners of inner polygon inside outer polygon? */
    public static polygonInsidePolygon(
      insideCorners: { x: number; y: number }[],
      outsideCorners: { x: number; y: number }[],
      startX?: number,
      startY?: number
    ): boolean {
      for (const corner of insideCorners) {
        if (!Utils.pointInPolygon(corner.x, corner.y, outsideCorners, startX, startY)) {
          return false;
        }
      }
      return true;
    }

    /** No corner of inner polygon inside outer polygon? */
    public static polygonOutsidePolygon(
      insideCorners: { x: number; y: number }[],
      outsideCorners: { x: number; y: number }[],
      startX?: number,
      startY?: number
    ): boolean {
      for (const corner of insideCorners) {
        if (Utils.pointInPolygon(corner.x, corner.y, outsideCorners, startX, startY)) {
          return false;
        }
      }
      return true;
    }

    // === Array Helpers ===

    public static forEach<T>(array: T[], action: (item: T) => void): void {
      array.forEach(action);
    }

    public static forEachIndexed<T>(array: T[], action: (index: number, item: T) => void): void {
      array.forEach((item, i) => action(i, item));
    }

    public static map<T, U>(array: T[], func: (item: T) => U): U[] {
      return array.map(func);
    }

    public static removeIf<T>(array: T[], predicate: (item: T) => boolean): T[] {
      return array.filter(item => !predicate(item));
    }

    public static cycle<T>(arr: T[], shift: number): T[] {
      if (arr.length === 0) return [];
      shift = ((shift % arr.length) + arr.length) % arr.length; // Handle negative shifts
      return [...arr.slice(shift), ...arr.slice(0, shift)];
    }

    public static unique<T>(arr: T[], hashFunc?: (item: T) => any): T[] {
      const seen = new Set<any>();
      return arr.filter(item => {
        const key = hashFunc ? hashFunc(item) : item;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    public static removeValue<T>(array: T[], value: T): void {
      for (let i = array.length - 1; i >= 0; i--) {
        if (array[i] === value) {
          array.splice(i, 1);
        }
      }
    }

    public static hasValue<T>(array: T[], value: T): boolean {
      return array.includes(value);
    }

    public static subtract<T>(array: T[], subArray: T[]): T[] {
      const set = new Set(subArray);
      return array.filter(el => !set.has(el));
    }
  }
}