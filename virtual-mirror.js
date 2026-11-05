/* =========================================
   AUREX VIRTUAL MIRROR
   GLB Avatar + Measurements + Size Guide
========================================= */

import * as THREE from
  "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

import { GLTFLoader } from
  "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";

import { OrbitControls } from
  "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js";

(() => {
  "use strict";

  const MODEL_PATH = "assets/models/aurex-male-avatar.glb";
  const STORAGE_KEY = "aurexMeasurements";

  let scene;
  let camera;
  let renderer;
  let controls;
  let avatar;
  let mixer;
  let idleAction;
  let animationFrame;
  let initialRotation = 0;
  let baseAvatarHeight = 0;

  const clock = new THREE.Clock();

  const elements = {
    canvas: document.getElementById("avatarCanvas"),
    wrapper: document.getElementById("avatarCanvasWrap"),
    loading: document.getElementById("avatarLoading"),
    error: document.getElementById("avatarError"),
    status: document.getElementById("avatarStatus"),
    height: document.getElementById("bodyHeight"),
    weight: document.getElementById("bodyWeight"),
    waist: document.getElementById("bodyWaist"),
    chest: document.getElementById("bodyChest"),
    size: document.getElementById("recommendedSize"),
    explanation: document.getElementById("fitExplanation")
  };

  function setStatus(message) {
    if (elements.status) {
      elements.status.textContent = message;
    }
  }

  function showLoading(show) {
    if (elements.loading) {
      elements.loading.classList.toggle("hidden", !show);
    }
  }

  function showError(message) {
    showLoading(false);

    if (elements.error) {
      elements.error.classList.remove("hidden");

      const paragraph = elements.error.querySelector("p");
      const small = elements.error.querySelector("small");

      if (paragraph) paragraph.textContent = message;
      if (small) {
        small.textContent =
          "Check the model file path and internet connection, then reload.";
      }
    }

    setStatus("MODEL ERROR");
  }

  function createScene() {
    if (!elements.canvas || !elements.wrapper) {
      console.warn("AUREX: Avatar canvas not found.");
      return false;
    }

    if (!window.WebGLRenderingContext) {
      showError("3D graphics are not supported in this browser.");
      return false;
    }

    const width = elements.wrapper.clientWidth || 360;
    const height = elements.wrapper.clientHeight || 500;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x08090b);

    camera = new THREE.PerspectiveCamera(
      35,
      width / height,
      0.1,
      100
    );

    camera.position.set(0, 1.7, 5.5);

    try {
      renderer = new THREE.WebGLRenderer({
        canvas: elements.canvas,
        antialias: true,
        alpha: false,
        powerPreference: "high-performance"
      });
    } catch (error) {
      console.error("WebGL renderer error:", error);
      showError("Your device could not start the 3D viewer.");
      return false;
    }

    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, 1.75)
    );

    renderer.setSize(width, height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    scene.add(new THREE.HemisphereLight(
      0xffffff,
      0x303040,
      2.1
    ));

    const keyLight = new THREE.DirectionalLight(
      0xffffff,
      3
    );
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(
      0x64d8ff,
      1.2
    );
    fillLight.position.set(-4, 2, -3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(
      0x4d7cff,
      1.5
    );
    rimLight.position.set(0, 3, -5);
    scene.add(rimLight);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(3, 64),
      new THREE.MeshStandardMaterial({
        color: 0x111827,
        roughness: 0.9,
        metalness: 0.05
      })
    );

    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.015;
    scene.add(floor);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.enablePan = false;
    controls.minPolarAngle = Math.PI * 0.23;
    controls.maxPolarAngle = Math.PI * 0.72;
    controls.minDistance = 2.5;
    controls.maxDistance = 9;
    controls.target.set(0, 1.65, 0);

    return true;
  }

  function frameAvatar(model) {
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();

    box.getSize(size);
    box.getCenter(center);

    if (!Number.isFinite(size.y) || size.y <= 0) {
      throw new Error("Invalid avatar model dimensions.");
    }

    baseAvatarHeight = size.y;

    // Center model horizontally and place feet at ground level.
    model.position.x -= center.x;
    model.position.z -= center.z;
    model.position.y -= box.min.y;

    const normalizedHeight = 3.35;
    const scale = normalizedHeight / size.y;

    model.scale.setScalar(scale);

    const scaledBox = new THREE.Box3().setFromObject(model);
    const scaledCenter = new THREE.Vector3();
    scaledBox.getCenter(scaledCenter);

    model.position.x -= scaledCenter.x;
    model.position.z -= scaledCenter.z;
    model.position.y -= scaledBox.min.y;

    const finalBox = new THREE.Box3().setFromObject(model);
    const finalSize = new THREE.Vector3();
    finalBox.getSize(finalSize);

    const maxDimension = Math.max(
      finalSize.x,
      finalSize.y,
      finalSize.z
    );

    const distance = maxDimension * 1.65;

    camera.position.set(
      0,
      finalSize.y * 0.53,
      distance
    );

    camera.near = 0.01;
    camera.far = 100;
    camera.updateProjectionMatrix();

    controls.target.set(
      0,
      finalSize.y * 0.5,
      0
    );

    controls.update();
  }

  function loadAvatar() {
    showLoading(true);
    setStatus("LOADING MODEL");

    const loader = new GLTFLoader();

    loader.load(
      MODEL_PATH,

      gltf => {
        try {
          avatar = gltf.scene;

          avatar.traverse(object => {
            if (object.isMesh) {
              object.castShadow = true;
              object.receiveShadow = true;

              if (object.material) {
                object.material.side = THREE.FrontSide;
              }
            }
          });

          frameAvatar(avatar);
          scene.add(avatar);

          if (gltf.animations && gltf.animations.length) {
            mixer = new THREE.AnimationMixer(avatar);

            const idleClip = gltf.animations.find(
              clip => clip.name.toLowerCase() === "idle"
            ) || gltf.animations[0];

            idleAction = mixer.clipAction(idleClip);
            idleAction.play();
          }

          initialRotation = avatar.rotation.y;

          showLoading(false);
          elements.error?.classList.add("hidden");

          setStatus("AVATAR READY");
          startAnimation();

          console.log(
            "AUREX avatar loaded:",
            gltf.animations.map(animation => animation.name)
          );

        } catch (error) {
          console.error("Avatar setup error:", error);
          showError("Avatar could not be prepared.");
        }
      },

      progress => {
        if (progress.total > 0 && elements.loading) {
          const percent = Math.round(
            (progress.loaded / progress.total) * 100
          );

          const text = elements.loading.querySelector("p");
          if (text) text.textContent = `Loading avatar... ${percent}%`;
        }
      },

      error => {
        console.error("Avatar loading failed:", error);
        showError("Avatar model could not be loaded.");
      }
    );
  }

  function startAnimation() {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }

    function animate() {
      animationFrame = requestAnimationFrame(animate);

      const delta = Math.min(clock.getDelta(), 0.05);

      if (mixer) {
        mixer.update(delta);
      }

      if (controls) {
        controls.update();
      }

      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    }

    animate();
  }

  function resizeViewer() {
    if (!renderer || !camera || !elements.wrapper) return;

    const width = elements.wrapper.clientWidth;
    const height = elements.wrapper.clientHeight;

    if (!width || !height) return;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize(width, height, false);
  }

  function rotateAvatar(amount) {
    if (!avatar) return;
    avatar.rotation.y += amount;
  }

  function resetAvatar() {
    if (!avatar || !controls || !camera) return;

    avatar.rotation.y = initialRotation;

    controls.reset();
    controls.target.set(0, 1.65, 0);
    controls.update();
  }

  function calculateSize(chest, waist) {
    if (chest < 86 || waist < 72) return "S";
    if (chest < 96 && waist < 84) return "M";
    if (chest < 106 && waist < 94) return "L";
    if (chest < 116 && waist < 104) return "XL";
    return "XXL";
  }

  function updateMeasurementResult(event) {
    if (event) event.preventDefault();

    const height = Number(elements.height?.value);
    const weight = Number(elements.weight?.value);
    const waist = Number(elements.waist?.value);
    const chest = Number(elements.chest?.value);

    if (
      height < 120 || height > 220 ||
      weight < 30 || weight > 200 ||
      waist < 45 || waist > 160 ||
      chest < 55 || chest > 160 ||
      ![height, weight, waist, chest].every(Number.isFinite)
    ) {
      if (window.AUREX) {
        window.AUREX.toast("Please enter valid measurements.");
      }
      return;
    }

    const size = calculateSize(chest, waist);

    if (elements.size) {
      elements.size.textContent = size;
    }

    if (elements.explanation) {
      elements.explanation.textContent =
        `Suggested size ${size}, based on ${chest} cm chest ` +
        `and ${waist} cm waist. Height: ${height} cm; weight: ${weight} kg.`;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        height,
        weight,
        waist,
        chest,
        size,
        updatedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.warn("Could not save measurements:", error);
    }

    // Height is represented by proportional avatar scaling.
    // Weight/chest/waist are used for size guidance only.
    if (avatar && baseAvatarHeight > 0) {
      const targetHeight = 3.35 * (height / 175);
      const scale = targetHeight / baseAvatarHeight;
      avatar.scale.setScalar(scale);
    }

    if (window.AUREX) {
      window.AUREX.toast("Measurements updated.");
    }
  }

  function loadSavedMeasurements() {
    let saved;

    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch {
      saved = null;
    }

    if (!saved) return;

    if (elements.height) elements.height.value = saved.height || 175;
    if (elements.weight) elements.weight.value = saved.weight || 65;
    if (elements.waist) elements.waist.value = saved.waist || 80;
    if (elements.chest) elements.chest.value = saved.chest || 95;

    updateMeasurementResult();
  }

  function bindControls() {
    document.getElementById("rotateAvatarLeft")?.addEventListener(
      "click",
      () => rotateAvatar(-Math.PI / 6)
    );

    document.getElementById("rotateAvatarRight")?.addEventListener(
      "click",
      () => rotateAvatar(Math.PI / 6)
    );

    document.getElementById("resetAvatar")?.addEventListener(
      "click",
      resetAvatar
    );

    document.getElementById("measurementForm")?.addEventListener(
      "submit",
      updateMeasurementResult
    );

    window.addEventListener("resize", resizeViewer);

    if ("ResizeObserver" in window && elements.wrapper) {
      const observer = new ResizeObserver(resizeViewer);
      observer.observe(elements.wrapper);
    }
  }

  function init() {
    if (!elements.canvas || !elements.wrapper) return;

    if (!createScene()) return;

    bindControls();
    loadSavedMeasurements();
    loadAvatar();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();