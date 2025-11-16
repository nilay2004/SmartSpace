/// <reference path="../../lib/three.d.ts" />
/// <reference path="../core/utils.ts" />

module BP3D.Three {
  export var Floor = function (scene: THREE.Scene, room: any) {
    const scope = this;

    scope.room = room;
    const sceneRef: THREE.Scene = scene;

    let floorPlane: THREE.Mesh | null = null;
    let roofPlane: THREE.Mesh | null = null;

    init();

    function init() {
      scope.room.fireOnFloorChange(redraw);
      floorPlane = buildFloor();
      // roofs look weird, so commented out
      // roofPlane = buildRoof();
    }

    function redraw() {
      scope.removeFromScene();
      floorPlane = buildFloor();
      scope.addToScene();
    }

    /** Builds the floor mesh with texture and geometry */
    function buildFloor(): THREE.Mesh {
      const textureSettings = scope.room.getTexture();

      // Load floor texture
      const floorTexture = THREE.ImageUtils.loadTexture(textureSettings.url);
      floorTexture.wrapS = THREE.RepeatWrapping;
      floorTexture.wrapT = THREE.RepeatWrapping;
      floorTexture.repeat.set(1, 1);

      const floorMaterialTop = new THREE.MeshPhongMaterial({
        map: floorTexture,
        side: THREE.DoubleSide,
        color: 0xcccccc,
        specular: 0x0a0a0a,
      });

      const textureScale = textureSettings.scale;

      // Create floor shape
      const points: THREE.Vector2[] = [];
      scope.room.interiorCorners.forEach((corner: any) => {
        points.push(
          new THREE.Vector2(
            corner.x / textureScale,
            corner.y / textureScale
          )
        );
      });

      const shape = new THREE.Shape(points);
      const geometry = new THREE.ShapeGeometry(shape);
      const floor = new THREE.Mesh(geometry, floorMaterialTop);

      floor.rotation.set(Math.PI / 2, 0, 0);
      floor.scale.set(textureScale, textureScale, textureScale);
      floor.receiveShadow = true;
      floor.castShadow = false;

      return floor;
    }

    /** Builds the roof mesh (optional) */
    function buildRoof(): THREE.Mesh {
      const roofMaterial = new THREE.MeshBasicMaterial({
        side: THREE.FrontSide,
        color: 0xe5e5e5,
      });

      const points: THREE.Vector2[] = [];
      scope.room.interiorCorners.forEach((corner: any) => {
        points.push(new THREE.Vector2(corner.x, corner.y));
      });

      const shape = new THREE.Shape(points);
      const geometry = new THREE.ShapeGeometry(shape);
      const roof = new THREE.Mesh(geometry, roofMaterial);

      roof.rotation.set(Math.PI / 2, 0, 0);
      roof.position.y = 250;
      return roof;
    }

    /** Adds floor and roof meshes to scene */
    this.addToScene = function () {
      if (floorPlane) sceneRef.add(floorPlane);
      // if (roofPlane) sceneRef.add(roofPlane);
      if (room.floorPlane) sceneRef.add(room.floorPlane);
    };

    /** Removes floor and roof meshes from scene */
    this.removeFromScene = function () {
      if (floorPlane) sceneRef.remove(floorPlane);
      // if (roofPlane) sceneRef.remove(roofPlane);
      if (room.floorPlane) sceneRef.remove(room.floorPlane);
    };
  };
}
