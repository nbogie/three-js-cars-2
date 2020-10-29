import * as THREE from 'https://unpkg.com/three@0.122.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.122.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://unpkg.com/three@0.122.0/examples/jsm/loaders/GLTFLoader.js';

import { setupShadows } from "./modules/shadows.js";

function setupCamera() {
    // The camera
    const camera = new THREE.PerspectiveCamera(
        30,
        window.innerWidth / window.innerHeight,
        1,
        10000
    );

    // Make the camera further from the models so we can see them better
    camera.position.z = 15;
    camera.position.y = 5;
    return camera;
}

function setupGround(scene) {
    var groundGeo = new THREE.PlaneBufferGeometry(10000, 10000);
    var groundMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    groundMat.color.setHSL(0, 0, 0.35);
    var ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = 0;
    ground.rotation.x = - Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    return ground;
}

function setupLights(scene) {
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.color.setHSL(0.1, 1.0, 0.85);
    dirLight.position.set(-0.4, 0.4, 0.4);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 1);
    dirLight2.color.setHSL(0.7, 1.0, 0.85);
    dirLight2.position.set(0.4, 0.4, -0.4);
    dirLight2.castShadow = true;
    scene.add(dirLight2);
}

async function loadCarsAsync(scene) {
    const gltfLoader = new GLTFLoader();
    const modelURLs = [1, 2, 3, 4, 5, 6, 7, 8].map(n => `./models/car${n}.glb`);
    const loadedModels = [];
    function namedLikeCarOrVan(obj) {
        return obj.name
            && (
                obj.name.toLowerCase().startsWith("car")
                || obj.name.toLowerCase().startsWith("van")
            )
    }
    const promises = modelURLs.map((url, ix) =>
        new Promise((resolve, reject) => {
            gltfLoader.load(url, (gltf) => {
                const root = gltf.scene;
                dumpObjectToConsoleAsString(root);
                const car = root.children.find(namedLikeCarOrVan) || root;
                //when you know the exact name: 
                //root.getObjectByName('car')
                const phaseStep = Math.PI * 2 / modelURLs.length;
                // cars.push({mesh: car, phase: phaseStep*ix});
                scene.add(car);
                resolve({ mesh: car, phase: phaseStep * ix });
            });
        })//new promise
    );//map over all models to get a list of promises
    return Promise.all(promises);
}

async function loadCarsAsyncFromSingleFile(scene) {
    console.log("loading ALL cars from one file!")
    const url = "./models/cars_big_set.glb"
    
    const gltfLoader = new GLTFLoader();
    function namedLikeCar(obj) {
        return obj.name && obj.name.toLowerCase().startsWith("car")
    }
    
    const promise = new Promise((resolve, reject) => {

        gltfLoader.load(url, (gltf) => {
            const root = gltf.scene;
            dumpObjectToConsoleAsString(root);
            const allCars = root.children.filter(namedLikeCar);

            scene.add(...allCars);

            const phaseStep = Math.PI * 2 / allCars.length;
            const allCarsObjs = allCars.map((mesh, ix) => ({ mesh, phase: phaseStep * ix }));
            resolve(allCarsObjs);
        });

    })//new promise
    return promise;
}



async function loadModelAsync(path, scene) {
    const gltfLoader = new GLTFLoader();
    const promise = new Promise((resolve, reject) => {
        gltfLoader.load(path, (gltf) => {
            const root = gltf.scene;
            dumpObjectToConsoleAsString(root);
            scene.add(root);
            resolve(root);
        });
    })//new promise

    return promise;
}

function updateWheels(wheeledCar, timeS) {
    if (wheeledCar) {
        const wheels = wheeledCar.children.filter(c => c.name && c.name.startsWith("wheel"));
        const wheelsFront = wheeledCar.children.filter(c => c.name && c.name.startsWith("wheel_f"));
        const wheelsBack = wheeledCar.children.filter(c => c.name && c.name.startsWith("wheel_b"));

        for (let wheel of wheelsFront) {
            //we need to rotate the wheels (on steering axis) 
            // AND then preserve their new spinning axis when spinning them (was on x)
            const myEuler = new THREE.Euler(timeS * 0.8 * Math.PI * 2, -Math.PI * 0.1, 0, 'YXZ');
            wheel.setRotationFromEuler(myEuler)
            // wheel.scale.set(2,2,2)
        }
        for (let wheel of wheelsBack) {
            wheel.rotation.x = timeS * 1.4 * Math.PI;
        }
        const brakeLights = wheeledCar.getObjectByName("lights_brakes");
        if (brakeLights) {
            // brakeLights.visible =  timeS % 2 < 1;

            //changing the colour of the material is not suitable if we've loaded a low-poly pixel-colour texture.
            // brakeLights.material.color = new THREE.Color("rgb(0, 255, 0)");
        }
    }
}

function updateCars(cars, timeS, radius) {
    cars.forEach(carObj => {
        if (!carObj.mesh) {
            return;
        }
        const carMesh = carObj.mesh;
        updateWheels(carMesh, timeS);

        const angle = carObj.phase + (timeS / 10) * 2 * Math.PI;
        carMesh.position.x = radius * Math.cos(angle);
        carMesh.position.z = radius * Math.sin(angle);
        carMesh.rotation.y = - angle;
        //carMesh.lookAt(camera.position)
    });
}

function dumpObjectToTextLines(obj, lines = [], isLast = true, prefix = '') {
    if (!obj || !obj.children) {
        return lines;
    }
    const localPrefix = isLast ? '└─' : '├─';
    lines.push(`${prefix}${prefix ? localPrefix : ''}${obj.name || '*no-name*'} [${obj.type}]`);
    const newPrefix = prefix + (isLast ? '  ' : '│ ');
    const lastNdx = obj.children.length - 1;
    obj.children.forEach((child, ndx) => {
        const isLast = ndx === lastNdx;
        dumpObjectToTextLines(child, lines, isLast, newPrefix);
    });
    return lines;
}

function dumpObjectToConsoleAsString(root) {
    console.log(dumpObjectToTextLines(root).join("\n"))
}


async function setupAsync() {
    // The three.js scene: the 3D world where you put objects
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("hsl(190, 30%, 75%)");

    // The renderer: something that draws 3D objects onto the canvas
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0xaaaaaa, 1);
    // Append the renderer canvas into <body>
    document.body.appendChild(renderer.domElement);

    setupLights(scene);
    setupGround(scene);

    let carsSmallSet = await loadCarsAsync(scene);
    let carsBigSet = await loadCarsAsyncFromSingleFile(scene);
    console.log("dumping cars found in full set...")
    carsBigSet.forEach(c => {
        dumpObjectToConsoleAsString(c.mesh)
    })

    // let dragonHead = await loadModelAsync("models/dragon_head1.glb", scene);
    // dragonHead.position.y = 0.6;

    setupShadows(scene, renderer);

    const camera = setupCamera();
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.update();


    function render(time) {
        updateCars(carsBigSet, time * 0.001, 10);
        updateCars(carsSmallSet, time * 0.001, 5);

        document.getElementById("info").innerText = `Time: ${(time / 1000).toFixed(1)}`;

        // Render the scene and the camera
        renderer.render(scene, camera);

        // Make it call the render() function about every 1/60 second
        requestAnimationFrame(render);
    }

    render();
}

setupAsync();