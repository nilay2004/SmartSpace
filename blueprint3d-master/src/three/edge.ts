/// <reference path="../../lib/jQuery.d.ts" />
/// <reference path="../../lib/three.d.ts" />
/// <reference path="../core/utils.ts" />

namespace BP3D.Three  {
  export var Edge = function (scene: THREE.Scene, edge: any, controls: any) {
    const scope = this;

    const sceneRef: THREE.Scene = scene;
    const wall = edge.wall;
    const front = edge.front;

    let planes: THREE.Mesh[] = [];
    let basePlanes: THREE.Mesh[] = []; // always visible
    let texture: THREE.Texture | null = null;

    const lightMap = THREE.ImageUtils.loadTexture("rooms/textures/walllightmap.png");
    const fillerColor = 0xdddddd;
    const sideColor = 0xcccccc;
    const baseColor = 0xdddddd;

    scope.visible = false;

    this.remove = function () {
      edge.redrawCallbacks.remove(redraw);
      controls.cameraMovedCallbacks.remove(updateVisibility);
      removeFromScene();
    };

    function init() {
      edge.redrawCallbacks.add(redraw);
      controls.cameraMovedCallbacks.add(updateVisibility);
      updateTexture();
      updatePlanes();
      addToScene();
    }

    function redraw() {
      removeFromScene();
      updateTexture();
      updatePlanes();
      addToScene();
    }

    function removeFromScene() {
      planes.forEach((plane) => sceneRef.remove(plane));
      basePlanes.forEach((plane) => sceneRef.remove(plane));
      planes = [];
      basePlanes = [];
    }

    function addToScene() {
      planes.forEach((plane) => sceneRef.add(plane));
      basePlanes.forEach((plane) => sceneRef.add(plane));
      updateVisibility();
    }

    function updateVisibility() {
      const start = edge.interiorStart();
      const end = edge.interiorEnd();
      const x = end.x - start.x;
      const y = end.y - start.y;

      // rotate 90° CCW
      const normal = new THREE.Vector3(-y, 0, x).normalize();

      const position = controls.object.position.clone();
      const focus = new THREE.Vector3(
        (start.x + end.x) / 2.0,
        0,
        (start.y + end.y) / 2.0
      );
      const direction = position.sub(focus).normalize();

      const dot = normal.dot(direction);
      scope.visible = dot >= 0;

      planes.forEach((plane) => {
        plane.visible = scope.visible;
      });

      updateObjectVisibility();
    }

    function updateObjectVisibility() {
      wall.items.forEach((item: any) => {
        item.updateEdgeVisibility(scope.visible, front);
      });
      wall.onItems.forEach((item: any) => {
        item.updateEdgeVisibility(scope.visible, front);
      });
    }

    /** Loads and updates wall texture */
    function updateTexture(callback?: () => void) {
      callback =
        callback ||
        function () {
          (sceneRef as any).needsUpdate = true;
        };

      const textureData = edge.getTexture();
      const { stretch, url, scale } = textureData;

      texture = THREE.ImageUtils.loadTexture(url, undefined, callback);

      if (texture && !stretch) {
        const height = wall.height;
        const width = edge.interiorDistance();
        texture.wrapT = THREE.RepeatWrapping;
        texture.wrapS = THREE.RepeatWrapping;
        texture.repeat.set(width / scale, height / scale);
        texture.needsUpdate = true;
      }
    }

    function updatePlanes() {
      const wallMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.FrontSide,
        map: texture ?? undefined, // ✅ avoids null errors
      });

      const fillerMaterial = new THREE.MeshBasicMaterial({
        color: fillerColor,
        side: THREE.DoubleSide,
      });

      // exterior plane
      planes.push(
        makeWall(
          edge.exteriorStart(),
          edge.exteriorEnd(),
          edge.exteriorTransform,
          edge.invExteriorTransform,
          fillerMaterial
        )
      );

      // interior plane
      planes.push(
        makeWall(
          edge.interiorStart(),
          edge.interiorEnd(),
          edge.interiorTransform,
          edge.invInteriorTransform,
          wallMaterial
        )
      );

      // bottom (always visible)
      basePlanes.push(buildFiller(edge, 0, THREE.BackSide, baseColor));

      // top
      planes.push(buildFiller(edge, wall.height, THREE.DoubleSide, fillerColor));

      // sides
      planes.push(
        buildSideFilter(edge.interiorStart(), edge.exteriorStart(), wall.height, sideColor)
      );

      planes.push(
        buildSideFilter(edge.interiorEnd(), edge.exteriorEnd(), wall.height, sideColor)
      );
    }

    function makeWall(
      start: any,
      end: any,
      transform: THREE.Matrix4,
      invTransform: THREE.Matrix4,
      material: THREE.Material
    ): THREE.Mesh {
      const v1 = toVec3(start);
      const v2 = toVec3(end);
      const v3 = v2.clone();
      v3.y = wall.height;
      const v4 = v1.clone();
      v4.y = wall.height;

      const points = [v1.clone(), v2.clone(), v3.clone(), v4.clone()];
      points.forEach((p) => p.applyMatrix4(transform));

      const shape = new THREE.Shape(
        points.map((p) => new THREE.Vector2(p.x, p.y))
      );

      // add holes for wall items
      wall.items.forEach((item: any) => {
        const pos = item.position.clone();
        pos.applyMatrix4(transform);
        const halfSize = item.halfSize;
        const min = halfSize.clone().multiplyScalar(-1).add(pos);
        const max = halfSize.clone().add(pos);

        const holePoints = [
          new THREE.Vector2(min.x, min.y),
          new THREE.Vector2(max.x, min.y),
          new THREE.Vector2(max.x, max.y),
          new THREE.Vector2(min.x, max.y),
        ];
        shape.holes.push(new THREE.Path(holePoints));
      });

      const geometry = new THREE.ShapeGeometry(shape);
      geometry.vertices.forEach((v) => v.applyMatrix4(invTransform));

      const totalDistance = Core.Utils.distance(v1.x, v1.z, v2.x, v2.z);
      const height = wall.height;
      geometry.faceVertexUvs[0] = [];

      function vertexToUv(vertex: THREE.Vector3) {
        const x = Core.Utils.distance(v1.x, v1.z, vertex.x, vertex.z) / totalDistance;
        const y = vertex.y / height;
        return new THREE.Vector2(x, y);
      }

      geometry.faces.forEach((face: any) => {
        const vertA = geometry.vertices[face.a];
        const vertB = geometry.vertices[face.b];
        const vertC = geometry.vertices[face.c];
        geometry.faceVertexUvs[0].push([
          vertexToUv(vertA),
          vertexToUv(vertB),
          vertexToUv(vertC),
        ]);
      });

      geometry.faceVertexUvs[1] = geometry.faceVertexUvs[0];
      geometry.computeFaceNormals();
      geometry.computeVertexNormals();

      return new THREE.Mesh(geometry, material);
    }

    function buildSideFilter(
      p1: any,
      p2: any,
      height: number,
      color: number
    ): THREE.Mesh {
      const points = [toVec3(p1), toVec3(p2), toVec3(p2, height), toVec3(p1, height)];
      const geometry = new THREE.Geometry();
      points.forEach((p) => geometry.vertices.push(p));
      geometry.faces.push(new THREE.Face3(0, 1, 2));
      geometry.faces.push(new THREE.Face3(0, 2, 3));

      const fillerMaterial = new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
      });

      return new THREE.Mesh(geometry, fillerMaterial);
    }

    function buildFiller(
      edge: any,
      height: number,
      side: THREE.Side,
      color: number
    ): THREE.Mesh {
      const points = [
        toVec2(edge.exteriorStart()),
        toVec2(edge.exteriorEnd()),
        toVec2(edge.interiorEnd()),
        toVec2(edge.interiorStart()),
      ];
      const fillerMaterial = new THREE.MeshBasicMaterial({ color, side });
      const shape = new THREE.Shape(points);
      const geometry = new THREE.ShapeGeometry(shape);
      const filler = new THREE.Mesh(geometry, fillerMaterial);
      filler.rotation.set(Math.PI / 2, 0, 0);
      filler.position.y = height;
      return filler;
    }

    function toVec2(pos: any): THREE.Vector2 {
      return new THREE.Vector2(pos.x, pos.y);
    }

    function toVec3(pos: any, height = 0): THREE.Vector3 {
      return new THREE.Vector3(pos.x, height, pos.y);
    }

    init();
  };
}
