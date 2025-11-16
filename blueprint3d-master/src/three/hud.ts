/// <reference path="../../lib/three.d.ts" />
/// <reference path="../core/utils.ts" />

namespace BP3D.Three {
  /**
   * Drawings on "top" of the scene. e.g. rotate arrows
   */
  export var HUD = function (three: any) {
    const scope = this;
    const scene = new THREE.Scene();

    // Typed variables
    let selectedItem: any | null = null;
    let rotating = false;
    let mouseover = false;
    let activeObject: THREE.Object3D | null = null;

    const tolerance = 10;
    const height = 5;
    const distance = 20;
    const color = "#ffffff";
    const hoverColor = "#f1c40f";

    this.getScene = function () {
      return scene;
    };

    this.getObject = function () {
      return activeObject;
    };

    function init() {
      three.itemSelectedCallbacks.add(itemSelected);
      three.itemUnselectedCallbacks.add(itemUnselected);
    }

    function resetSelectedItem() {
      selectedItem = null;
      if (activeObject) {
        scene.remove(activeObject);
        activeObject = null;
      }
    }

    function itemSelected(item: any) {
      if (selectedItem !== item) {
        resetSelectedItem();
        if (item.allowRotate && !item.fixed) {
          selectedItem = item;
          activeObject = makeObject(selectedItem);
          scene.add(activeObject);
        }
      }
    }

    function itemUnselected() {
      resetSelectedItem();
    }

    this.setRotating = function (isRotating: boolean) {
      rotating = isRotating;
      setColor();
    };

    this.setMouseover = function (isMousedOver: boolean) {
      mouseover = isMousedOver;
      setColor();
    };

    function setColor() {
      if (activeObject && activeObject.children) {
        activeObject.children.forEach((obj: any) => {
          if (obj.material && obj.material.color) {
            obj.material.color.set(getColor());
          }
        });
      }
      if (three.needsUpdate) three.needsUpdate();
    }

    function getColor() {
      return mouseover || rotating ? hoverColor : color;
    }

    this.update = function () {
      if (activeObject && selectedItem) {
        if (selectedItem.rotation && selectedItem.position) {
          activeObject.rotation.y = selectedItem.rotation.y;
          activeObject.position.x = selectedItem.position.x;
          activeObject.position.z = selectedItem.position.z;
        }
      }
    };

    function makeLineGeometry(item: any) {
      const geometry = new THREE.Geometry();
      geometry.vertices.push(
        new THREE.Vector3(0, 0, 0),
        rotateVector(item)
      );
      return geometry;
    }

    function rotateVector(item: any) {
      const vec = new THREE.Vector3(
        0,
        0,
        Math.max(item.halfSize.x, item.halfSize.z) + 1.4 + distance
      );
      return vec;
    }

    function makeLineMaterial(rotating: boolean) {
      return new THREE.LineBasicMaterial({
        color: getColor(),
        linewidth: 3,
      });
    }

    function makeCone(item: any) {
      const coneGeo = new THREE.CylinderGeometry(5, 0, 10);
      const coneMat = new THREE.MeshBasicMaterial({
        color: getColor(),
      });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.copy(rotateVector(item));
      cone.rotation.x = -Math.PI / 2.0;
      return cone;
    }

    function makeSphere(item: any) {
      const geometry = new THREE.SphereGeometry(4, 16, 16);
      const material = new THREE.MeshBasicMaterial({
        color: getColor(),
      });
      return new THREE.Mesh(geometry, material);
    }

    function makeObject(item: any) {
      const object = new THREE.Object3D();
      const line = new THREE.Line(
        makeLineGeometry(item),
        makeLineMaterial(scope.rotating),
        THREE.LinePieces
      );
      const cone = makeCone(item);
      const sphere = makeSphere(item);

      object.add(line);
      object.add(cone);
      object.add(sphere);

      if (item.rotation && item.position) {
        object.rotation.y = item.rotation.y;
        object.position.x = item.position.x;
        object.position.z = item.position.z;
      }
      object.position.y = height;

      return object;
    }

    init();
  };
}
