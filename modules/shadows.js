import * as THREE from 'https://unpkg.com/three@0.122.0/build/three.module.js';

export function setupShadows(scene, renderer){

  scene.traverse((obj) => {
    if (obj.castShadow !== undefined) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  {
    renderer.shadowMap.enabled = true;
    const color = 0xFFFFFF;
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.castShadow = true;
    light.position.set(-250, 800, -850);
    light.target.position.set(-550, 40, -450);
  
    light.shadow.bias = -0.004;
    light.shadow.mapSize.width = 2048;
    light.shadow.mapSize.height = 2048;

    scene.add(light);
    scene.add(light.target);

    const shadowCam = light.shadow.camera;
    shadowCam.near = 1;
    shadowCam.far = 2000;
    shadowCam.left = -1500;
    shadowCam.right = 1500;
    shadowCam.top = 1500;
    shadowCam.bottom = -1500;
  }
}

