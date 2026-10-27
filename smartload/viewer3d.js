// ==========================================
// RENDERIZADO Y ESCENA THREE.JS CON VISTAS RÁPIDAS
// ==========================================

let globalMats = null; 
let solidMaterialsCache = {}; 
let selectedMaterialsCache = {};
let lockedMaterialsCache = {};

function initGlobalMats() {
    if (globalMats) return;
    globalMats = {
        contFill: new THREE.MeshBasicMaterial({color: 0x99b4d1, transparent: true, opacity: 0.15, side: THREE.DoubleSide}),
        contEdge: new THREE.LineBasicMaterial({color: 0x6688aa, linewidth: 2}),
        contFillSel: new THREE.MeshBasicMaterial({color: 0x0067c0, transparent: true, opacity: 0.25, side: THREE.DoubleSide}),
        contEdgeSel: new THREE.LineBasicMaterial({color: 0x0067c0, linewidth: 3}),
        boxEdge: new THREE.LineBasicMaterial({color: 0x333333, linewidth: 1}), 
        boxEdgeSel: new THREE.LineBasicMaterial({color: 0x0067c0, linewidth: 2.5}),
        boxEdgeLocked: new THREE.LineBasicMaterial({color: 0xd13438, linewidth: 2.5})
    };
}

function getSolidMaterial(colorHex) { 
    if(!solidMaterialsCache[colorHex]) solidMaterialsCache[colorHex] = new THREE.MeshLambertMaterial({ color: colorHex }); 
    return solidMaterialsCache[colorHex]; 
}

function getSelectedMaterial(baseColorHex) {
    if(!selectedMaterialsCache[baseColorHex]) {
        const c = new THREE.Color(baseColorHex);
        selectedMaterialsCache[baseColorHex] = new THREE.MeshLambertMaterial({ 
            color: c,
            emissive: new THREE.Color(0x112244),
            emissiveIntensity: 0.35
        });
    } 
    return selectedMaterialsCache[baseColorHex];
}

function getLockedMaterial(baseColorHex) {
    if(!lockedMaterialsCache[baseColorHex]) {
        const canvas = document.createElement('canvas'); 
        canvas.width = 128; 
        canvas.height = 128; 
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = baseColorHex; 
        ctx.fillRect(0, 0, 128, 128); 
        
        ctx.lineWidth = 16; 
        ctx.strokeStyle = 'rgba(209, 52, 56, 0.75)'; 
        ctx.beginPath(); 
        for(let i = -128; i < 256; i += 32) { 
            ctx.moveTo(i, 0); 
            ctx.lineTo(i + 128, 128); 
        } 
        ctx.stroke();

        ctx.fillStyle = 'rgba(209, 52, 56, 0.15)';
        ctx.fillRect(0, 0, 128, 128);

        const tex = new THREE.CanvasTexture(canvas); 
        tex.wrapS = THREE.RepeatWrapping; 
        tex.wrapT = THREE.RepeatWrapping;
        lockedMaterialsCache[baseColorHex] = new THREE.MeshLambertMaterial({ map: tex });
    } 
    return lockedMaterialsCache[baseColorHex];
}

let scene, camera, renderer, controls, transformControls, mainGroup; 
let miniScene, miniCamera, miniRenderer, miniGroup;
let raycaster = new THREE.Raycaster(); 
let mouse = new THREE.Vector2(); 
let objectsInteractables = []; 
let is3DInitialized = false;

let selectedUUIDsSet = new Set();
let currentSceneBounds = { centerX: 0, maxH: 250, maxD: 1200 };

function init3D() {
    if(is3DInitialized) return; 
    initGlobalMats();
    const containerDiv = document.getElementById('canvas-container'); 
    scene = new THREE.Scene(); 
    camera = new THREE.PerspectiveCamera(45, containerDiv.clientWidth / containerDiv.clientHeight, 1, 30000);
    renderer = new THREE.WebGLRenderer({antialias: true, alpha: true}); 
    renderer.setSize(containerDiv.clientWidth, containerDiv.clientHeight); 
    containerDiv.appendChild(renderer.domElement);
    
    controls = new THREE.OrbitControls(camera, renderer.domElement); 
    controls.enableDamping = true; 
    
    transformControls = new THREE.TransformControls(camera, renderer.domElement);
    transformControls.setMode('translate');
    transformControls.setTranslationSnap(1); 
    scene.add(transformControls);

    transformControls.addEventListener('dragging-changed', function (event) {
        controls.enabled = !event.value;
    });

    transformControls.addEventListener('change', function () {
        if (transformControls.object) {
            const activeGroup = transformControls.object;
            const uuid = activeGroup.userData.uuid;
            const inst = instanciasCajas.find(i => i.uuid === uuid);
            if (inst) {
                const offsetX = activeGroup.userData.offsetX || 0;
                inst.x = Math.round(activeGroup.position.x - inst.drawW / 2 - offsetX);
                inst.y = Math.round(activeGroup.position.y - inst.drawH / 2);
                inst.z = Math.round(activeGroup.position.z - inst.drawD / 2);
                
                actualizarMetricasGlobales();
                actualizarTabla();
            }
        }
    });

    scene.add(new THREE.AmbientLight(0xffffff, 0.8)); 
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5); 
    dirLight.position.set(5000, 10000, 5000); 
    scene.add(dirLight);
    
    mainGroup = new THREE.Group(); 
    scene.add(mainGroup);
    
    let pointerDownPos = {x: 0, y: 0}; 
    containerDiv.addEventListener('pointerdown', e => { pointerDownPos.x = e.clientX; pointerDownPos.y = e.clientY; });
    containerDiv.addEventListener('pointerup', e => { 
        if(Math.abs(e.clientX - pointerDownPos.x) > 5 || Math.abs(e.clientY - pointerDownPos.y) > 5) return; 
        onMouseClick(e); 
    });
    
    const resizeObserver = new ResizeObserver(() => {
        if (renderer && camera && containerDiv) {
            const width = containerDiv.clientWidth;
            const height = containerDiv.clientHeight;
            if (width > 0 && height > 0) {
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
                renderer.setSize(width, height);
            }
        }
    });
    resizeObserver.observe(containerDiv);

    function animate() { 
        requestAnimationFrame(animate); 
        controls.update(); 
        renderer.render(scene, camera); 
    } 
    animate(); 
    is3DInitialized = true;
}

/** 'contenedor' = estiba FCL; 'modulo' = detalle pallet/huacal unitizado. */
var slVista3dMode = 'contenedor';
var slModulosPreview = null;

function construirEscena3D() {
    if (slVista3dMode === 'modulo') {
        if (slModulosPreview && slModulosPreview.length) construirEscenaModulo3D(slModulosPreview);
        return;
    }
    init3D(); 
    if(transformControls) transformControls.detach();
    while(mainGroup.children.length > 0) { 
        let obj = mainGroup.children[0]; 
        if(obj.geometry) obj.geometry.dispose(); 
        mainGroup.remove(obj); 
    } 
    objectsInteractables = [];
    ocultarCotasModulo_();
    
    const gapX = 150; 
    let totalWidth = 0; 
    let maxH = 250, maxD = 1200; 
    contenedoresFisicos.forEach(c => { 
        totalWidth += c.w + gapX; 
        if(c.h > maxH) maxH = c.h; 
        if(c.d > maxD) maxD = c.d; 
    });

    /* Contenedores se colocan desde X=0 hacia negativo; el centro real está en mitad del span. */
    let spanW = Math.max(1, totalWidth - gapX);
    let centerX = -spanW / 2 + (contenedoresFisicos[0] ? contenedoresFisicos[0].w / 2 : 0);
    if (contenedoresFisicos.length === 1) {
        centerX = contenedoresFisicos[0].w / 2;
    } else if (contenedoresFisicos.length > 1) {
        let right = contenedoresFisicos[0].w;
        let left = -(spanW - contenedoresFisicos[contenedoresFisicos.length - 1].w);
        centerX = (left + right) / 2;
    }
    currentSceneBounds = { centerX, maxH, maxD, spanW };

    enfocarCamaraCarga_('iso');

    let currentOffsetX = 0;
    contenedoresFisicos.forEach((contenedor, idx) => {
        const contGeo = new THREE.BoxGeometry(contenedor.w, contenedor.h, contenedor.d); 
        contGeo.translate((contenedor.w/2) + currentOffsetX, contenedor.h/2, contenedor.d/2);
        
        const boxMesh = new THREE.Mesh(contGeo, globalMats.contFill); 
        boxMesh.userData = { isContainer: true, contIdx: idx }; 
        mainGroup.add(boxMesh);
        
        const edgeMesh = new THREE.LineSegments(new THREE.EdgesGeometry(contGeo), globalMats.contEdge); 
        edgeMesh.userData = { isContainerEdge: true, contIdx: idx }; 
        mainGroup.add(edgeMesh);
        
        if(contenedor.cajas) {
            contenedor.cajas.forEach(caja => {
                let cajaGroup = new THREE.Group();
                cajaGroup.position.set(caja.x + caja.drawW/2 + currentOffsetX, caja.y + caja.drawH/2, caja.z + caja.drawD/2);

                if (caja.shape === 'barrel') { 
                    let isUpright = (caja.drawH === caja.h); 
                    let isXAligned = (caja.drawW === caja.h); 
                    let geo;
                    if (isUpright) { 
                        let r = Math.min(caja.drawW, caja.drawD) / 2 - 0.5; 
                        geo = new THREE.CylinderGeometry(r, r, caja.drawH - 1, 32); 
                    } else if (isXAligned) { 
                        let r = Math.min(caja.drawH, caja.drawD) / 2 - 0.5; 
                        geo = new THREE.CylinderGeometry(r, r, caja.drawW - 1, 32); 
                        geo.rotateZ(Math.PI / 2); 
                    } else { 
                        let r = Math.min(caja.drawW, caja.drawH) / 2 - 0.5; 
                        geo = new THREE.CylinderGeometry(r, r, caja.drawD - 1, 32); 
                        geo.rotateX(Math.PI / 2); 
                    } 
                    let mesh = new THREE.Mesh(geo, getSolidMaterial(caja.color));
                    mesh.userData = { isLoadBox: true };
                    cajaGroup.add(mesh);
                    let edge = new THREE.LineSegments(new THREE.EdgesGeometry(geo), globalMats.boxEdge);
                    edge.userData = { isLoadEdge: true };
                    cajaGroup.add(edge);
                } 
                else if (caja.shape === 'pallet') {
                    let palletH = 15;
                    let loadH = caja.drawH - palletH;
                    if (loadH < 1) loadH = 1;
                    let metaP = caja.slMeta || {};
                    if (!metaP.ori && typeof listaEmpaque !== 'undefined') {
                        let srcP = listaEmpaque.find(function (it) { return String(it.id) === String(caja.groupId); });
                        if (srcP && srcP.slMeta) metaP = srcP.slMeta;
                    }
                    /* Construir en orientación original (w×d) y rotar el grupo si el solver giró la unidad. */
                    let baseWP = Number(caja.w) || caja.drawW;
                    let baseDP = Number(caja.d) || caja.drawD;
                    let pg = new THREE.Group();
                    pg.position.y = -caja.drawH / 2;
                    addTarimaMadera_(pg, baseWP, baseDP, palletH, 0);
                    if (metaP.ori && metaP.ori.length >= 3) {
                        let nx = Math.max(1, metaP.nx || 1), ny = Math.max(1, metaP.ny || 1), nz = Math.max(1, metaP.nz || 1);
                        let cw = metaP.ori[0], cd = metaP.ori[1], ch = metaP.ori[2];
                        let x0 = -nx * cw / 2, z0 = -ny * cd / 2;
                        for (let iz = 0; iz < nz; iz++) {
                            for (let iy = 0; iy < ny; iy++) {
                                for (let ix = 0; ix < nx; ix++) {
                                    addBoxMesh_(pg, cw, ch, cd,
                                        x0 + ix * cw + cw / 2,
                                        palletH + iz * ch + ch / 2,
                                        z0 + iy * cd + cd / 2,
                                        caja.color);
                                }
                            }
                        }
                    } else {
                        addBoxMesh_(pg, baseWP - 1, loadH - 0.5, baseDP - 1, 0, palletH + loadH / 2, 0, caja.color);
                    }
                    aplicarYawUnidadCarga_(pg, baseWP, baseDP, caja.drawW, caja.drawD);
                    cajaGroup.add(pg);
                } else if (caja.shape === 'huacal' || (caja.slMeta && caja.slMeta.unidad === 'huacal')) {
                    let meta = caja.slMeta || {};
                    if (!meta.ori && typeof listaEmpaque !== 'undefined') {
                        let src = listaEmpaque.find(function (it) { return String(it.id) === String(caja.groupId); });
                        if (src && src.slMeta) meta = src.slMeta;
                    }
                    let baseW = Number(caja.w) || caja.drawW;
                    let baseD = Number(caja.d) || caja.drawD;
                    let baseH = Number(caja.h) || caja.drawH;
                    let hg = new THREE.Group();
                    hg.position.y = -caja.drawH / 2;
                    /* Siempre modelar en w×d originales: las cajas internas rotan con el huacal. */
                    addHuacalJaula_(hg, baseW, baseH, baseD, caja.color, {
                        deckH: meta.deckH != null ? meta.deckH : 15,
                        tapaH: meta.tapaH != null ? meta.tapaH : 2,
                        cajaInner: meta.cajaInner || null,
                        ori: meta.ori || null,
                        nx: meta.nx || 1, ny: meta.ny || 1, nz: meta.nz || 1
                    });
                    aplicarYawUnidadCarga_(hg, baseW, baseD, caja.drawW, caja.drawD);
                    cajaGroup.add(hg);
                } else { 
                    let geo = new THREE.BoxGeometry(caja.drawW - 1, caja.drawH - 1, caja.drawD - 1); 
                    let mesh = new THREE.Mesh(geo, getSolidMaterial(caja.color));
                    mesh.userData = { isLoadBox: true };
                    cajaGroup.add(mesh);
                    let edge = new THREE.LineSegments(new THREE.EdgesGeometry(geo), globalMats.boxEdge);
                    edge.userData = { isLoadEdge: true };
                    cajaGroup.add(edge);
                }
                
                cajaGroup.userData = { uuid: caja.uuid, groupId: caja.groupId, color: caja.color, locked: caja.locked, offsetX: currentOffsetX, isCajaGroup: true }; 
                mainGroup.add(cajaGroup); 
                objectsInteractables.push(cajaGroup); 
            });
        } 
        currentOffsetX -= (contenedor.w + gapX); 
    }); 
    actualizarRenderCajas();
}

/** Encuadre centrado y cercano a la(s) unidad(es) de carga (evita contenedores chicos/descentrados). */
function enfocarCamaraCarga_(view) {
    if (!camera || !controls) return;
    const { centerX, maxH, maxD, spanW } = currentSceneBounds;
    const span = Math.max(spanW || maxD, maxD, maxH);
    const targetY = maxH * 0.45;
    const targetZ = maxD / 2;
    controls.target.set(centerX, targetY, targetZ);
    /* Factor ~1.15–1.35: rellena el viewport sin cortar esquinas. */
    const k = 1.25;
    switch (view) {
        case 'top':
            camera.position.set(centerX, maxH + span * k, targetZ + 0.1);
            break;
        case 'front':
            camera.position.set(centerX, targetY, maxD + span * k * 0.85);
            break;
        case 'left':
            camera.position.set(centerX - span * k, targetY, targetZ);
            break;
        case 'right':
            camera.position.set(centerX + span * k, targetY, targetZ);
            break;
        case 'iso':
        default:
            camera.position.set(
                centerX + span * 0.72,
                maxH * 0.55 + span * 0.55,
                targetZ + span * 0.72
            );
            break;
    }
    controls.update();
}

function setCameraView(view) {
    enfocarCamaraCarga_(view || 'iso');
}

function actualizarRenderCajas() {
    const selectedIdx = document.getElementById('view-cont-select').value;
    let primarySelectedMesh = null;

    mainGroup.children.forEach(obj => {
        if(obj.userData.isCajaGroup) { 
            let uuid = obj.userData.uuid;
            let inst = instanciasCajas.find(i => i.uuid === uuid);
            let isSelected = selectedUUIDsSet.has(uuid) || (selectedGroupId && String(obj.userData.groupId) === String(selectedGroupId)); 
            let isLocked = inst ? inst.locked : false;

            obj.children.forEach(child => {
                if (child.userData.isLoadBox) {
                    if (isLocked) {
                        child.material = getLockedMaterial(obj.userData.color);
                    } else if (isSelected) {
                        child.material = getSelectedMaterial(obj.userData.color);
                    } else {
                        child.material = getSolidMaterial(obj.userData.color);
                    }
                }
                if (child.userData.isLoadEdge) {
                    if (isSelected) {
                        child.material = globalMats.boxEdgeSel;
                    } else if (isLocked) {
                        child.material = globalMats.boxEdgeLocked;
                    } else {
                        child.material = globalMats.boxEdge;
                    }
                }
            });

            if (isSelected && !primarySelectedMesh) {
                primarySelectedMesh = obj;
            }
        }
        if(obj.userData.isContainer) { 
            obj.material = (obj.userData.contIdx == selectedIdx && selectedIdx !== "") ? globalMats.contFillSel : globalMats.contFill; 
        }
        if(obj.userData.isContainerEdge) { 
            obj.material = (obj.userData.contIdx == selectedIdx && selectedIdx !== "") ? globalMats.contEdgeSel : globalMats.contEdge; 
        }
    });

    if (primarySelectedMesh && transformControls) {
        transformControls.attach(primarySelectedMesh);
    } else if (transformControls) {
        transformControls.detach();
    }
}

function onMouseClick(event) {
    const containerDiv = document.getElementById('canvas-container'); 
    const rect = containerDiv.getBoundingClientRect(); 
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1; 
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1; 
    
    raycaster.setFromCamera(mouse, camera); 
    const intersects = raycaster.intersectObjects(objectsInteractables, true);
    
    const isMultiSelect = event.ctrlKey || event.metaKey;

    if (intersects.length > 0) { 
        let topGroup = intersects[0].object;
        while (topGroup.parent && topGroup.parent !== mainGroup) {
            topGroup = topGroup.parent;
        }
        let clickedUUID = topGroup.userData.uuid; 

        if (clickedUUID) {
            if (isMultiSelect) {
                if (selectedUUIDsSet.has(clickedUUID)) {
                    selectedUUIDsSet.delete(clickedUUID);
                } else {
                    selectedUUIDsSet.add(clickedUUID);
                }
                selectedGroupId = null;
            } else {
                if (selectedUUIDsSet.has(clickedUUID) && selectedUUIDsSet.size === 1) {
                    selectedUUIDsSet.clear();
                } else {
                    selectedUUIDsSet.clear();
                    selectedUUIDsSet.add(clickedUUID);
                }
                selectedGroupId = null;
            }
        }
    } else { 
        if (!isMultiSelect) {
            selectedUUIDsSet.clear();
            selectedGroupId = null;
        }
    } 
    actualizarTabla(); 
    actualizarRenderCajas(); 
}

function initMini3D() {
    if(miniRenderer) return; 
    initGlobalMats();
    const container = document.getElementById('mini-3d-preview'); 
    miniScene = new THREE.Scene(); 
    miniCamera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 1, 1000); 
    miniCamera.position.set(150, 150, 200); 
    miniCamera.lookAt(0, 0, 0);
    
    miniRenderer = new THREE.WebGLRenderer({antialias: true, alpha: true}); 
    miniRenderer.setSize(container.clientWidth, container.clientHeight); 
    container.appendChild(miniRenderer.domElement);
    
    miniScene.add(new THREE.AmbientLight(0xffffff, 0.7)); 
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6); 
    dirLight.position.set(100, 200, 100); 
    miniScene.add(dirLight);
    
    miniGroup = new THREE.Group(); 
    miniScene.add(miniGroup);
    
    function animateMini() { 
        if (document.getElementById('modal-box').style.display === 'block') { 
            if(miniGroup) miniGroup.rotation.y -= 0.015; 
            miniRenderer.render(miniScene, miniCamera); 
        } 
        requestAnimationFrame(animateMini); 
    } 
    animateMini();
}

function updateMini3D() {
    if(!miniRenderer) initMini3D(); 
    while(miniGroup.children.length > 0) { 
        let child = miniGroup.children[0]; 
        if(child.geometry) child.geometry.dispose(); 
        miniGroup.remove(child); 
    }
    
    let shape = document.getElementById('m-shape').value; 
    let w = parseFloat(document.getElementById('m-w').value) || 10; 
    let d = parseFloat(document.getElementById('m-d').value) || 10; 
    let h = parseFloat(document.getElementById('m-h').value) || 10;
    
    let mat = getSolidMaterial(document.getElementById('m-color').value); 
    let edgeMat = globalMats.boxEdge; 
    if(w < 1) w = 1; if(d < 1) d = 1; if(h < 1) h = 1;
    
    if (shape === 'barrel') {
        let r = Math.min(w, d) / 2; 
        let geo = new THREE.CylinderGeometry(r, r, h, 32); 
        miniGroup.add(new THREE.Mesh(geo, mat)); 
        miniGroup.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat));
    } else if (shape === 'pallet') {
        let palletH = Math.min(15, h * 0.2); 
        let loadH = h - palletH; 
        if(loadH<1) loadH=1; 
        
        let deckThick = 2.0;
        let topStrH = 2.0;
        let notchH = 9.0;
        let botThick = 2.0;
        let strThick = 8.0;
        
        let deckGeo = new THREE.BoxGeometry(w, deckThick, d); 
        deckGeo.translate(0, -h/2 + palletH - deckThick/2, 0); 
        miniGroup.add(new THREE.Mesh(deckGeo, getSolidMaterial('#8B5A2B'))); 
        miniGroup.add(new THREE.LineSegments(new THREE.EdgesGeometry(deckGeo), edgeMat));
        
        let isLongerOnW = (w >= d);
        let bLen = Math.min(20, (isLongerOnW ? w : d) * 0.18);

        if (isLongerOnW) {
            for (let i = 0; i < 3; i++) {
                let pz = 0;
                if (i === 0) pz = -d/2 + strThick/2;
                if (i === 2) pz = d/2 - strThick/2;

                let topStrGeo = new THREE.BoxGeometry(w, topStrH, strThick);
                topStrGeo.translate(0, -h/2 + 12, pz);
                miniGroup.add(new THREE.Mesh(topStrGeo, getSolidMaterial('#8B5A2B')));
                miniGroup.add(new THREE.LineSegments(new THREE.EdgesGeometry(topStrGeo), edgeMat));

                for (let j = 0; j < 3; j++) {
                    let px = 0;
                    if (j === 0) px = -w/2 + bLen/2;
                    if (j === 2) px = w/2 - bLen/2;

                    let blockGeo = new THREE.BoxGeometry(bLen, notchH, strThick);
                    blockGeo.translate(px, -h/2 + 6.5, pz);
                    miniGroup.add(new THREE.Mesh(blockGeo, getSolidMaterial('#8B5A2B')));
                    miniGroup.add(new THREE.LineSegments(new THREE.EdgesGeometry(blockGeo), edgeMat));
                }

                let botGeo = new THREE.BoxGeometry(w, botThick, strThick);
                botGeo.translate(0, -h/2 + 1, pz);
                miniGroup.add(new THREE.Mesh(botGeo, getSolidMaterial('#8B5A2B')));
                miniGroup.add(new THREE.LineSegments(new THREE.EdgesGeometry(botGeo), edgeMat));
            }
        } else {
            for (let i = 0; i < 3; i++) {
                let px = 0;
                if (i === 0) px = -w/2 + strThick/2;
                if (i === 2) px = w/2 - strThick/2;

                let topStrGeo = new THREE.BoxGeometry(strThick, topStrH, d);
                topStrGeo.translate(px, -h/2 + 12, 0);
                miniGroup.add(new THREE.Mesh(topStrGeo, getSolidMaterial('#8B5A2B')));
                miniGroup.add(new THREE.LineSegments(new THREE.EdgesGeometry(topStrGeo), edgeMat));

                for (let j = 0; j < 3; j++) {
                    let pz = 0;
                    if (j === 0) pz = -d/2 + bLen/2;
                    if (j === 2) pz = d/2 - bLen/2;

                    let blockGeo = new THREE.BoxGeometry(strThick, notchH, bLen);
                    blockGeo.translate(px, -h/2 + 6.5, pz);
                    miniGroup.add(new THREE.Mesh(blockGeo, getSolidMaterial('#8B5A2B')));
                    miniGroup.add(new THREE.LineSegments(new THREE.EdgesGeometry(blockGeo), edgeMat));
                }

                let botGeo = new THREE.BoxGeometry(strThick, botThick, d);
                botGeo.translate(px, -h/2 + 1, 0);
                miniGroup.add(new THREE.Mesh(botGeo, getSolidMaterial('#8B5A2B')));
                miniGroup.add(new THREE.LineSegments(new THREE.EdgesGeometry(botGeo), edgeMat));
            }
        }
        
        let loadGeo = new THREE.BoxGeometry(w, loadH, d); 
        loadGeo.translate(0, -h/2 + palletH + loadH/2, 0); 
        miniGroup.add(new THREE.Mesh(loadGeo, mat)); 
        miniGroup.add(new THREE.LineSegments(new THREE.EdgesGeometry(loadGeo), edgeMat));
    } else { 
        let geo = new THREE.BoxGeometry(w, h, d); 
        miniGroup.add(new THREE.Mesh(geo, mat)); 
        miniGroup.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), edgeMat)); 
    }
    
    let maxDim = Math.max(w, d, h); 
    let scale = 110 / maxDim; 
    miniGroup.scale.set(scale, scale, scale);
}

// ==========================================
// VISTA MÓDULO (pallet / huacal unitizado)
// ==========================================

function limpiarMainGroup_() {
    if (transformControls) transformControls.detach();
    if (!mainGroup) return;
    while (mainGroup.children.length > 0) {
        let obj = mainGroup.children[0];
        if (obj.geometry) obj.geometry.dispose();
        mainGroup.remove(obj);
    }
    objectsInteractables = [];
}

function addBoxMesh_(group, w, h, d, cx, cy, cz, colorHex) {
    let geo = new THREE.BoxGeometry(Math.max(0.5, w - 0.8), Math.max(0.5, h - 0.8), Math.max(0.5, d - 0.8));
    geo.translate(cx, cy, cz);
    let mesh = new THREE.Mesh(geo, getSolidMaterial(colorHex || '#c5a968'));
    mesh.userData = { isLoadBox: true };
    group.add(mesh);
    let edge = new THREE.LineSegments(new THREE.EdgesGeometry(geo), globalMats.boxEdge);
    edge.userData = { isLoadEdge: true };
    group.add(edge);
    return mesh;
}

/**
 * Si el solver giró la unidad 90° en planta (drawW↔drawD), rota el grupo local
 * para que estiba + cajas internas giren juntas.
 */
function aplicarYawUnidadCarga_(group, baseW, baseD, drawW, drawD) {
    if (!group) return;
    let bw = Number(baseW) || 0, bd = Number(baseD) || 0;
    let dw = Number(drawW) || 0, dd = Number(drawD) || 0;
    if (bw < 1 || bd < 1 || dw < 1 || dd < 1) return;
    let swapped = Math.abs(dw - bd) <= 2 && Math.abs(dd - bw) <= 2 && Math.abs(dw - bw) > 2;
    if (swapped) group.rotation.y = Math.PI / 2;
}

/**
 * Estiba detallada (misma geometría que el panel grande del simulador).
 * y0 = cara inferior; altura fija ~15 cm (deckH se ignora para coincidir con el panel).
 */
function addTarimaMadera_(group, w, d, deckH, y0) {
    initGlobalMats();
    y0 = y0 || 0;
    let wood = '#8B5A2B';
    let deckThick = 2.0;
    let topStrH = 2.0;
    let notchH = 9.0;
    let botThick = 2.0;
    let strThick = 8.0;
    let isLongerOnW = (w >= d);
    let bLen = Math.min(20, (isLongerOnW ? w : d) * 0.18);

    function addWoodPart_(geo) {
        group.add(new THREE.Mesh(geo, getSolidMaterial(wood)));
        group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), globalMats.boxEdge));
    }

    let deckGeo = new THREE.BoxGeometry(w - 1, deckThick, d - 1);
    deckGeo.translate(0, y0 + 14, 0);
    addWoodPart_(deckGeo);

    if (isLongerOnW) {
        for (let i = 0; i < 3; i++) {
            let pz = 0;
            if (i === 0) pz = -d / 2 + strThick / 2 + 0.5;
            if (i === 2) pz = d / 2 - strThick / 2 - 0.5;

            let topStrGeo = new THREE.BoxGeometry(w - 1, topStrH, strThick);
            topStrGeo.translate(0, y0 + 12, pz);
            addWoodPart_(topStrGeo);

            for (let j = 0; j < 3; j++) {
                let px = 0;
                if (j === 0) px = -w / 2 + bLen / 2 + 0.5;
                if (j === 2) px = w / 2 - bLen / 2 - 0.5;
                let blockGeo = new THREE.BoxGeometry(bLen, notchH, strThick);
                blockGeo.translate(px, y0 + 6.5, pz);
                addWoodPart_(blockGeo);
            }

            let botGeo = new THREE.BoxGeometry(w - 1, botThick, strThick);
            botGeo.translate(0, y0 + 1, pz);
            addWoodPart_(botGeo);
        }
    } else {
        for (let i = 0; i < 3; i++) {
            let px = 0;
            if (i === 0) px = -w / 2 + strThick / 2 + 0.5;
            if (i === 2) px = w / 2 - strThick / 2 - 0.5;

            let topStrGeo = new THREE.BoxGeometry(strThick, topStrH, d - 1);
            topStrGeo.translate(px, y0 + 12, 0);
            addWoodPart_(topStrGeo);

            for (let j = 0; j < 3; j++) {
                let pz = 0;
                if (j === 0) pz = -d / 2 + bLen / 2 + 0.5;
                if (j === 2) pz = d / 2 - bLen / 2 - 0.5;
                let blockGeo = new THREE.BoxGeometry(strThick, notchH, bLen);
                blockGeo.translate(px, y0 + 6.5, pz);
                addWoodPart_(blockGeo);
            }

            let botGeo = new THREE.BoxGeometry(strThick, botThick, d - 1);
            botGeo.translate(px, y0 + 1, 0);
            addWoodPart_(botGeo);
        }
    }
}

/**
 * Huacal = misma estiba + 1 tabla por esquina (6×1 cm) a la altura de la carga
 * + tapa: panel 1 cm debajo + marco de 4 tablas 6×1 cm. Madera = color estiba.
 * El exterior ya incluye +2 cm An/Lar (espesor de parales) y +2 cm alto (panel+marco).
 */
function addHuacalJaula_(group, w, hTotal, d, colorHex, opts) {
    opts = opts || {};
    initGlobalMats();
    let wood = '#8B5A2B';
    let deckH = opts.deckH != null ? opts.deckH : 15;
    let lidThick = 1;
    let frameThick = 1;
    let postW = 6;
    let postT = 1;
    let cageH = Math.max(4, hTotal - deckH - lidThick - frameThick);
    let usableW = Math.max(1, w - 2 * postT);
    let usableD = Math.max(1, d - 2 * postT);

    /* 1) Misma estiba detallada del panel grande */
    addTarimaMadera_(group, w, d, deckH, 0);

    /* 2) Cajas centradas en el hueco interior (huella − 2×1 cm de parales) */
    let inner = opts.cajaInner;
    let ori = opts.ori;
    let nx = Math.max(1, opts.nx || 1), ny = Math.max(1, opts.ny || 1), nz = Math.max(1, opts.nz || 1);
    let loadColor = colorHex || '#c5a968';
    if (ori && ori.length >= 3) {
        let cw = ori[0], cd = ori[1], ch = ori[2];
        let gridW = nx * cw, gridD = ny * cd;
        let x0 = -gridW / 2, z0 = -gridD / 2;
        /* Si la rejilla cabe en el hueco, centrar; si no, alinear al centro del huacal. */
        if (gridW <= usableW + 0.2 && gridD <= usableD + 0.2) {
            x0 = -gridW / 2;
            z0 = -gridD / 2;
        }
        for (let iz = 0; iz < nz; iz++) {
            for (let iy = 0; iy < ny; iy++) {
                for (let ix = 0; ix < nx; ix++) {
                    addBoxMesh_(group, cw, ch, cd,
                        x0 + ix * cw + cw / 2,
                        deckH + iz * ch + ch / 2,
                        z0 + iy * cd + cd / 2,
                        loadColor);
                }
            }
        }
    } else if (inner) {
        let iw = Math.min(inner.w, usableW);
        let id = Math.min(inner.d, usableD);
        addBoxMesh_(group, iw, inner.h, id, 0, deckH + inner.h / 2, 0, loadColor);
    }

    function addWood_(geo) {
        group.add(new THREE.Mesh(geo, getSolidMaterial(wood)));
        group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), globalMats.boxEdge));
    }

    let midY = deckH + cageH / 2;

    /* 3) Esquineros: 1 tabla 6×1 cm por esquina */
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (s) {
        let post = new THREE.BoxGeometry(postW, cageH, postT);
        post.translate(
            s[0] * (w / 2 - postW / 2),
            midY,
            s[1] * (d / 2 - postT / 2)
        );
        addWood_(post);
    });

    /*
     * 3b) Parales intermedios (mismo 6×1 × altura):
     * - lado corto: 1 paral centrado en cada cara corta
     * - lado ancho: 2 parales en cada cara larga (a 1/3 y 2/3)
     */
    let longIsW = w >= d;
    if (longIsW) {
        /* Caras largas (frente/fondo, a lo largo de W): 2 parales */
        [-1, 1].forEach(function (sz) {
            [-1, 1].forEach(function (k) {
                let px = k * (w / 6);
                let p = new THREE.BoxGeometry(postW, cageH, postT);
                p.translate(px, midY, sz * (d / 2 - postT / 2));
                addWood_(p);
            });
        });
        /* Caras cortas (lados, a lo largo de D): 1 paral */
        [-1, 1].forEach(function (sx) {
            let p = new THREE.BoxGeometry(postT, cageH, postW);
            p.translate(sx * (w / 2 - postT / 2), midY, 0);
            addWood_(p);
        });
    } else {
        /* Caras largas (lados, a lo largo de D): 2 parales */
        [-1, 1].forEach(function (sx) {
            [-1, 1].forEach(function (k) {
                let pz = k * (d / 6);
                let p = new THREE.BoxGeometry(postT, cageH, postW);
                p.translate(sx * (w / 2 - postT / 2), midY, pz);
                addWood_(p);
            });
        });
        /* Caras cortas (frente/fondo): 1 paral */
        [-1, 1].forEach(function (sz) {
            let p = new THREE.BoxGeometry(postW, cageH, postT);
            p.translate(0, midY, sz * (d / 2 - postT / 2));
            addWood_(p);
        });
    }

    /* 4) Tapa: panel 1 cm (ancho×largo del huacal) debajo del marco */
    let lidY = deckH + cageH + lidThick / 2;
    let lid = new THREE.BoxGeometry(w - 0.2, lidThick, d - 0.2);
    lid.translate(0, lidY, 0);
    addWood_(lid);

    /* 5) Marco superior: 4 tablas 6×1 cm */
    let frameY = deckH + cageH + lidThick + frameThick / 2;
    [-1, 1].forEach(function (s) {
        let front = new THREE.BoxGeometry(w, frameThick, postW);
        front.translate(0, frameY, s * (d / 2 - postW / 2));
        addWood_(front);
        let side = new THREE.BoxGeometry(postW, frameThick, Math.max(1, d - 2 * postW));
        side.translate(s * (w / 2 - postW / 2), frameY, 0);
        addWood_(side);
    });
}

function enfocarCamaraModulo_(w, d, h) {
    if (!camera || !controls) return;
    let cx = 0, cy = h / 2, cz = 0;
    currentSceneBounds = { centerX: cx, maxH: h, maxD: Math.max(w, d) };
    controls.target.set(cx, cy, cz);
    let dist = Math.max(w, d, h) * 2.4;
    camera.position.set(cx + dist * 0.75, cy + dist * 0.55, cz + dist * 0.85);
    controls.update();
}

function ocultarCotasModulo_() {
    let el = document.getElementById('slModuloCotas');
    if (el) {
        el.classList.add('d-none');
        el.innerHTML = '';
    }
}

function pintarCotasModulo_(mods) {
    let el = document.getElementById('slModuloCotas');
    if (!el) return;
    if (!mods || !mods.length) {
        ocultarCotasModulo_();
        return;
    }
    el.classList.remove('d-none');
    el.innerHTML = mods.map(function (m) {
        let dims = Math.round(m.w) + ' × ' + Math.round(m.d) + ' × ' + Math.round(m.h) + ' cm';
        let extra = '';
        if (m.tipo === 'pallet' && m.nx) {
            extra = ' · ' + (m.nx * m.ny * m.nz) + ' caja(s) (' + m.nx + '×' + m.ny + '×' + m.nz + ')';
        } else if (m.tipo === 'huacal') {
            extra = ' · 1 caja enhuacalada';
        }
        let qty = m.qty > 1 ? ' ×' + m.qty + ' en carga' : '';
        let tipoLbl = m.tipo === 'huacal' ? 'Huacal' : m.tipo === 'master' ? 'Master' : m.tipo === 'caja' ? 'Caja' : 'Pallet';
        return '<div class="sl-cota-card"><strong>' + tipoLbl +
            '</strong> ' + dims + extra + qty +
            (m.desc ? '<div class="text-muted">' + String(m.desc).slice(0, 60) + '</div>' : '') +
            '</div>';
    }).join('');
}

/**
 * Renderiza módulos unitizados (sin contenedor) para feedback tras "Modular carga".
 * @param {Array} modulos [{tipo,w,d,h,deckH,color,desc,qty,nx,ny,nz,ori,cajaInner}]
 */
function construirEscenaModulo3D(modulos) {
    init3D();
    limpiarMainGroup_();
    slVista3dMode = 'modulo';
    slModulosPreview = modulos || [];
    if (!slModulosPreview.length) {
        ocultarCotasModulo_();
        return;
    }

    let gap = 80;
    let totalW = 0;
    slModulosPreview.forEach(function (m, i) {
        if (i) totalW += gap;
        totalW += m.w;
    });
    let cursorX = -totalW / 2;
    let maxH = 50, maxD = 50;

    slModulosPreview.forEach(function (m) {
        let g = new THREE.Group();
        let deckH = m.deckH != null ? m.deckH : (m.tipo === 'pallet' ? 15 : 0);
        let color = m.color || '#c5a968';

        if (m.tipo === 'huacal') {
            addHuacalJaula_(g, m.w, m.h, m.d, color, {
                deckH: deckH,
                tapaH: 2,
                cajaInner: m.cajaInner || null,
                ori: m.ori || null,
                nx: m.nx || 1, ny: m.ny || 1, nz: m.nz || 1
            });
        } else if (m.tipo === 'master' || m.tipo === 'caja') {
            addBoxMesh_(g, m.w, m.h, m.d, 0, m.h / 2, 0, color);
        } else {
            // Pallet: tarima + rejilla de cajas
            addTarimaMadera_(g, m.w, m.d, deckH, 0);
            let ori = m.ori || null;
            let nx = Math.max(1, m.nx || 1);
            let ny = Math.max(1, m.ny || 1);
            let nz = Math.max(1, m.nz || 1);
            if (ori && ori.length >= 3) {
                let cw = ori[0], cd = ori[1], ch = ori[2];
                let x0 = -m.w / 2;
                let z0 = -m.d / 2;
                for (let iz = 0; iz < nz; iz++) {
                    for (let iy = 0; iy < ny; iy++) {
                        for (let ix = 0; ix < nx; ix++) {
                            let cx = x0 + ix * cw + cw / 2;
                            let cz = z0 + iy * cd + cd / 2;
                            let cy = deckH + iz * ch + ch / 2;
                            addBoxMesh_(g, cw, ch, cd, cx, cy, cz, color);
                        }
                    }
                }
            } else {
                let loadH = Math.max(1, m.h - deckH);
                addBoxMesh_(g, m.w - 2, loadH, m.d - 2, 0, deckH + loadH / 2, 0, color);
            }
        }

        g.position.set(cursorX + m.w / 2, 0, 0);
        g.userData = { isModuloPreview: true, isCajaGroup: true, color: color };
        mainGroup.add(g);
        objectsInteractables.push(g);

        cursorX += m.w + gap;
        if (m.h > maxH) maxH = m.h;
        if (m.d > maxD) maxD = m.d;
    });

    // Suelo de referencia discreto
    let floorW = totalW + 100;
    let floorD = maxD + 100;
    let floorGeo = new THREE.PlaneGeometry(floorW, floorD);
    floorGeo.rotateX(-Math.PI / 2);
    let floorMat = new THREE.MeshLambertMaterial({ color: 0xe8e4dc, transparent: true, opacity: 0.55 });
    let floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.set(0, -0.2, 0);
    floor.userData = { isFloor: true };
    mainGroup.add(floor);

    enfocarCamaraModulo_(Math.max(totalW, maxD), maxD, maxH);
    pintarCotasModulo_(slModulosPreview);
    if (typeof actualizarSwitchVistaUI === 'function') actualizarSwitchVistaUI();
}

function setVista3dModo(modo) {
    slVista3dMode = (modo === 'modulo') ? 'modulo' : 'contenedor';
    window.slVista3dMode = slVista3dMode;
    if (slVista3dMode === 'modulo') {
        if (slModulosPreview && slModulosPreview.length) construirEscenaModulo3D(slModulosPreview);
        else if (typeof window.slRebuildModulosPreview === 'function') window.slRebuildModulosPreview();
    } else {
        ocultarCotasModulo_();
        construirEscena3D();
    }
    if (typeof actualizarSwitchVistaUI === 'function') actualizarSwitchVistaUI();
}

window.construirEscenaModulo3D = construirEscenaModulo3D;
window.setVista3dModo = setVista3dModo;
window.ocultarCotasModulo_ = ocultarCotasModulo_;
window.getSlVista3dMode = function () { return slVista3dMode; };
window.setSlVista3dMode = function (v) {
    slVista3dMode = (v === 'modulo') ? 'modulo' : 'contenedor';
};

/* —— Preview 3D dentro de la ficha de Agrupación —— */
let agMiniScene, agMiniCamera, agMiniRenderer, agMiniGroup, agMiniAnimating = false;

/**
 * Construye una unidad de agrupación (caja / master / pallet / huacal) en un Group.
 * @param {{tipo,w,d,h,deckH,color,ori,nx,ny,nz,cajaInner}} spec
 */
function buildAgrupacionUnit3D_(spec) {
    initGlobalMats();
    let g = new THREE.Group();
    if (!spec) return g;
    let tipo = spec.tipo || 'caja';
    let w = Math.max(1, Number(spec.w) || 10);
    let d = Math.max(1, Number(spec.d) || 10);
    let h = Math.max(1, Number(spec.h) || 10);
    let deckH = spec.deckH != null ? Number(spec.deckH) : (tipo === 'pallet' || tipo === 'huacal' ? 15 : 0);
    let color = spec.color || '#c5a968';
    let ori = spec.ori || null;
    let nx = Math.max(1, spec.nx || 1), ny = Math.max(1, spec.ny || 1), nz = Math.max(1, spec.nz || 1);

    if (tipo === 'huacal') {
        addHuacalJaula_(g, w, h, d, color, {
            deckH: deckH, tapaH: 2,
            cajaInner: spec.cajaInner || null,
            ori: ori, nx: nx, ny: ny, nz: nz
        });
    } else if (tipo === 'pallet') {
        addTarimaMadera_(g, w, d, deckH, 0);
        if (ori && ori.length >= 3) {
            let cw = ori[0], cd = ori[1], ch = ori[2];
            let x0 = -nx * cw / 2, z0 = -ny * cd / 2;
            for (let iz = 0; iz < nz; iz++) {
                for (let iy = 0; iy < ny; iy++) {
                    for (let ix = 0; ix < nx; ix++) {
                        addBoxMesh_(g, cw, ch, cd,
                            x0 + ix * cw + cw / 2,
                            deckH + iz * ch + ch / 2,
                            z0 + iy * cd + cd / 2,
                            color);
                    }
                }
            }
        } else {
            let loadH = Math.max(1, h - deckH);
            addBoxMesh_(g, w - 2, loadH, d - 2, 0, deckH + loadH / 2, 0, color);
        }
    } else if (tipo === 'master') {
        /* Cáscara master semitransparente + cajas internas */
        let shell = new THREE.BoxGeometry(w, h, d);
        shell.translate(0, h / 2, 0);
        let shellMat = new THREE.MeshLambertMaterial({
            color: color, transparent: true, opacity: 0.28, depthWrite: false
        });
        g.add(new THREE.Mesh(shell, shellMat));
        g.add(new THREE.LineSegments(new THREE.EdgesGeometry(shell), globalMats.boxEdge));
        if (ori && ori.length >= 3) {
            let cw = ori[0], cd = ori[1], ch = ori[2];
            let x0 = -nx * cw / 2, z0 = -ny * cd / 2;
            for (let iz = 0; iz < nz; iz++) {
                for (let iy = 0; iy < ny; iy++) {
                    for (let ix = 0; ix < nx; ix++) {
                        addBoxMesh_(g, cw, ch, cd,
                            x0 + ix * cw + cw / 2,
                            iz * ch + ch / 2,
                            z0 + iy * cd + cd / 2,
                            color);
                    }
                }
            }
        }
    } else {
        addBoxMesh_(g, w, h, d, 0, h / 2, 0, color);
    }
    return g;
}

function initAgMini3D_() {
    if (agMiniRenderer) return;
    initGlobalMats();
    let container = document.getElementById('ag-mini3d');
    if (!container || typeof THREE === 'undefined') return;
    agMiniScene = new THREE.Scene();
    agMiniScene.background = new THREE.Color(0xf4f6f9);
    let aw = Math.max(120, container.clientWidth || 280);
    let ah = Math.max(120, container.clientHeight || 220);
    agMiniCamera = new THREE.PerspectiveCamera(42, aw / ah, 1, 5000);
    agMiniRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    agMiniRenderer.setSize(aw, ah);
    agMiniRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.innerHTML = '';
    container.appendChild(agMiniRenderer.domElement);
    agMiniScene.add(new THREE.AmbientLight(0xffffff, 0.75));
    let dir = new THREE.DirectionalLight(0xffffff, 0.55);
    dir.position.set(120, 220, 160);
    agMiniScene.add(dir);
    agMiniGroup = new THREE.Group();
    agMiniScene.add(agMiniGroup);
    if (!agMiniAnimating) {
        agMiniAnimating = true;
        (function loop() {
            let modal = document.getElementById('modal-agrupacion');
            if (modal && modal.style.display === 'block' && agMiniRenderer && agMiniScene && agMiniCamera) {
                if (agMiniGroup) agMiniGroup.rotation.y -= 0.012;
                agMiniRenderer.render(agMiniScene, agMiniCamera);
            }
            requestAnimationFrame(loop);
        })();
    }
}

/**
 * Actualiza el preview 3D de la ficha de agrupación.
 * @param {{tipo,w,d,h,deckH,color,ori,nx,ny,nz,cajaInner}} spec
 */
function updateAgrupacionMini3D(spec) {
    initAgMini3D_();
    if (!agMiniGroup || !agMiniCamera || !agMiniRenderer) return;
    while (agMiniGroup.children.length) {
        let ch = agMiniGroup.children[0];
        agMiniGroup.remove(ch);
        if (ch.traverse) {
            ch.traverse(function (o) {
                if (o.geometry) o.geometry.dispose();
            });
        }
    }
    let unit = buildAgrupacionUnit3D_(spec);
    /* Centrar verticalmente alrededor del origen para la cámara */
    let h = Math.max(1, Number(spec && spec.h) || 40);
    unit.position.y = -h / 2;
    agMiniGroup.add(unit);
    agMiniGroup.rotation.y = 0.4;

    let container = document.getElementById('ag-mini3d');
    if (container) {
        let aw = Math.max(120, container.clientWidth || 280);
        let ah = Math.max(120, container.clientHeight || 220);
        agMiniCamera.aspect = aw / ah;
        agMiniRenderer.setSize(aw, ah);
    }
    let span = Math.max(
        Number(spec && spec.w) || 40,
        Number(spec && spec.d) || 40,
        Number(spec && spec.h) || 40
    );
    let dist = span * 1.85;
    agMiniCamera.position.set(dist * 0.85, dist * 0.65, dist * 0.95);
    agMiniCamera.lookAt(0, 0, 0);
    agMiniCamera.updateProjectionMatrix();
    agMiniRenderer.render(agMiniScene, agMiniCamera);
}

window.buildAgrupacionUnit3D_ = buildAgrupacionUnit3D_;
window.updateAgrupacionMini3D = updateAgrupacionMini3D;
