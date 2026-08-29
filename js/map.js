const MemoryMap = (function () {
  const JAPAN_CENTER = [36.5, 138.0];
  const JAPAN_ZOOM = 5;
  const SINGLE_MARKER_ZOOM = 12;
  const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const OSM_ATTR = "&copy; OpenStreetMap";

  let mainMap = null;
  let mainLayer = null;
  let lastMainPoints = [];
  let pickerMap = null;
  let pickerMarker = null;
  let pickerPickHandler = null;
  let photoClickHandler = null;

  function hasLeaflet() {
    return typeof window.L !== "undefined";
  }

  function setLeafletIconPath() {
    if (!hasLeaflet() || !window.L.Icon || !window.L.Icon.Default) {
      return;
    }
    const base = "https://unpkg.com/leaflet@1.9.4/dist/images/";
    delete window.L.Icon.Default.prototype._getIconUrl;
    window.L.Icon.Default.mergeOptions({
      iconRetinaUrl: base + "marker-icon-2x.png",
      iconUrl: base + "marker-icon.png",
      shadowUrl: base + "marker-shadow.png",
    });
  }

  function addOsm(map) {
    window.L.tileLayer(OSM_URL, {
      attribution: OSM_ATTR,
      maxZoom: 19,
    }).addTo(map);
  }

  function toLatLng(latitude, longitude) {
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return null;
    }
    return [lat, lng];
  }

  function formatVisitedOn(value) {
    if (!value) {
      return "";
    }
    const parts = String(value).split("-");
    if (parts.length !== 3) {
      return String(value);
    }
    return parts[0] + "年" + Number(parts[1]) + "月" + Number(parts[2]) + "日";
  }

  function appendText(parent, tag, text) {
    if (!text) {
      return;
    }
    const node = document.createElement(tag);
    node.textContent = text;
    parent.appendChild(node);
  }

  function buildPopup(entry) {
    const wrap = document.createElement("div");
    wrap.className = "map-popup";
    appendText(wrap, "strong", entry.title);
    appendText(wrap, "p", entry.place_name);
    appendText(wrap, "p", formatVisitedOn(entry.visited_on));
    appendText(wrap, "p", entry.memo);
    if (entry.photoUrl) {
      const image = document.createElement("img");
      image.src = entry.photoUrl;
      image.alt = "";
      image.addEventListener("click", function () {
        if (photoClickHandler) {
          photoClickHandler(entry.photoUrl);
        }
      });
      wrap.appendChild(image);
    }
    return wrap;
  }

  function fitMainToPoints(points) {
    if (!mainMap) {
      return;
    }
    if (!points.length) {
      mainMap.setView(JAPAN_CENTER, JAPAN_ZOOM);
      return;
    }
    if (points.length === 1) {
      mainMap.setView(points[0], SINGLE_MARKER_ZOOM);
      return;
    }
    mainMap.fitBounds(window.L.latLngBounds(points), {
      padding: [40, 40],
      maxZoom: SINGLE_MARKER_ZOOM,
    });
  }

  function initMainMap() {
    if (!hasLeaflet()) {
      return null;
    }
    setLeafletIconPath();
    if (mainMap) {
      return mainMap;
    }
    const element = document.getElementById("main-map");
    if (!element) {
      return null;
    }
    mainMap = window.L.map(element, {
      scrollWheelZoom: true,
    }).setView(JAPAN_CENTER, JAPAN_ZOOM);
    addOsm(mainMap);
    mainLayer = window.L.layerGroup().addTo(mainMap);
    return mainMap;
  }

  function invalidateMain() {
    if (!mainMap) {
      return;
    }
    mainMap.invalidateSize();
    fitMainToPoints(lastMainPoints);
  }

  function renderEntryMarkers(entries) {
    initMainMap();
    if (!mainMap || !mainLayer) {
      return;
    }
    mainLayer.clearLayers();
    lastMainPoints = [];

    (entries || []).forEach(function (entry) {
      const point = toLatLng(entry.latitude, entry.longitude);
      if (!point) {
        return;
      }
      lastMainPoints.push(point);
      const marker = window.L.marker(point);
      marker.bindPopup(buildPopup(entry), { maxWidth: 240 });
      marker.addTo(mainLayer);
    });

    fitMainToPoints(lastMainPoints);
  }

  function initLocationPicker(onPick) {
    if (typeof onPick === "function") {
      pickerPickHandler = onPick;
    }
    if (!hasLeaflet()) {
      return null;
    }
    setLeafletIconPath();
    if (pickerMap) {
      return pickerMap;
    }
    const element = document.getElementById("picker-map");
    if (!element) {
      return null;
    }
    pickerMap = window.L.map(element, {
      scrollWheelZoom: false,
    }).setView(JAPAN_CENTER, JAPAN_ZOOM);
    addOsm(pickerMap);
    pickerMap.on("click", function (event) {
      const lat = event.latlng.lat;
      const lng = event.latlng.lng;
      updateLocationPickerMarker(lat, lng);
      if (pickerPickHandler) {
        pickerPickHandler(lat, lng);
      }
    });
    return pickerMap;
  }

  function invalidatePicker() {
    if (!pickerMap) {
      return;
    }
    pickerMap.invalidateSize();
  }

  function updateLocationPickerMarker(latitude, longitude) {
    initLocationPicker();
    if (!pickerMap) {
      return;
    }
    const point = toLatLng(latitude, longitude);
    if (!point) {
      return;
    }
    if (pickerMarker) {
      pickerMarker.setLatLng(point);
    } else {
      pickerMarker = window.L.marker(point).addTo(pickerMap);
    }
    pickerMap.setView(point, Math.max(pickerMap.getZoom(), 12));
  }

  function clearLocationPicker() {
    if (pickerMarker && pickerMap) {
      pickerMap.removeLayer(pickerMarker);
      pickerMarker = null;
    }
    if (pickerMap) {
      pickerMap.setView(JAPAN_CENTER, JAPAN_ZOOM);
    }
  }

  function setPhotoClickHandler(handler) {
    photoClickHandler = handler;
  }

  function refreshVisible(screen) {
    window.setTimeout(function () {
      if (screen === "map") {
        initMainMap();
        invalidateMain();
      }
      if (screen === "add") {
        initLocationPicker();
        invalidatePicker();
      }
    }, 50);
  }

  return {
    initMainMap: initMainMap,
    renderEntryMarkers: renderEntryMarkers,
    initLocationPicker: initLocationPicker,
    updateLocationPickerMarker: updateLocationPickerMarker,
    clearLocationPicker: clearLocationPicker,
    invalidateMain: invalidateMain,
    invalidatePicker: invalidatePicker,
    setPhotoClickHandler: setPhotoClickHandler,
    refreshVisible: refreshVisible,
  };
})();
