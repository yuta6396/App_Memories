(function () {
  const views = {
    loading: document.getElementById("view-loading"),
    login: document.getElementById("view-login"),
    denied: document.getElementById("view-denied"),
    main: document.getElementById("view-main"),
  };

  const loginForm = document.getElementById("login-form");
  const loginButton = document.getElementById("login-button");
  const loginError = document.getElementById("login-error");
  const mainUser = document.getElementById("main-user");
  const logoutButton = document.getElementById("logout-button");
  const deniedBackButton = document.getElementById("denied-back-button");

  const mainError = document.getElementById("main-error");
  const entryForm = document.getElementById("entry-form");
  const entryFormTitle = document.getElementById("entry-form-title");
  const entryError = document.getElementById("entry-error");
  const entrySaveButton = document.getElementById("entry-save-button");
  const entryCancelButton = document.getElementById("entry-cancel-button");
  const geoButton = document.getElementById("geo-button");
  const visitedOnWrap = document.getElementById("visited-on-wrap");
  const visitedList = document.getElementById("visited-list");
  const wishlistList = document.getElementById("wishlist-list");
  const photoLightbox = document.getElementById("photo-lightbox");
  const lightboxImage = document.getElementById("lightbox-image");
  const lightboxClose = document.getElementById("lightbox-close");

  let showingDenied = false;
  let editingId = null;
  const SCREENS = {
    map: true,
    timeline: true,
    wishlist: true,
    add: true,
  };

  function screenFromHash() {
    const raw = String(location.hash || "")
      .replace(/^#\/?/, "")
      .split("?")[0];
    return SCREENS[raw] ? raw : "timeline";
  }

  function applyScreen(name) {
    const screen = SCREENS[name] ? name : "timeline";
    document.querySelectorAll(".app-panel").forEach(function (panel) {
      panel.hidden = panel.id !== "panel-" + screen;
    });
    document.querySelectorAll(".bottom-nav [data-screen]").forEach(function (button) {
      button.classList.toggle(
        "active",
        button.getAttribute("data-screen") === screen,
      );
    });
    views.main.classList.toggle("is-map", screen === "map");
    MemoryMap.refreshVisible(screen);
    if (screen === "add") {
      window.setTimeout(syncPickerFromInputs, 80);
    }
  }

  function goToScreen(name) {
    const screen = SCREENS[name] ? name : "timeline";
    const hash = "#/" + screen;
    if (location.hash !== hash) {
      location.hash = hash;
    } else {
      applyScreen(screen);
    }
  }

  function closePhotoLightbox() {
    photoLightbox.hidden = true;
    lightboxImage.src = "";
    document.body.style.overflow = "";
  }

  function openPhotoLightbox(url) {
    if (!url) {
      return;
    }
    lightboxImage.src = url;
    photoLightbox.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function showView(name) {
    Object.keys(views).forEach((key) => {
      views[key].hidden = key !== name;
    });
  }

  function showLoginError(message) {
    loginError.textContent = message;
    loginError.hidden = !message;
  }

  function showMainError(message) {
    mainError.textContent = message;
    mainError.hidden = !message;
  }

  function showEntryError(message) {
    entryError.textContent = message;
    entryError.hidden = !message;
  }

  function syncPickerFromInputs() {
    const lat = document.getElementById("entry-lat").value;
    const lng = document.getElementById("entry-lng").value;
    if (String(lat).trim() && String(lng).trim()) {
      MemoryMap.updateLocationPickerMarker(lat, lng);
    }
  }

  function getStatus() {
    const checked = entryForm.querySelector('input[name="status"]:checked');
    return checked ? checked.value : "visited";
  }

  function setStatus(status) {
    const next = status === "wishlist" ? "wishlist" : "visited";
    const input = entryForm.querySelector(
      'input[name="status"][value="' + next + '"]',
    );
    if (input) {
      input.checked = true;
    }
    syncVisitedOnField();
  }

  function syncVisitedOnField() {
    const isVisited = getStatus() === "visited";
    visitedOnWrap.hidden = !isVisited;
    if (!isVisited) {
      document.getElementById("entry-visited-on").value = "";
    }
  }

  function resetEntryForm() {
    editingId = null;
    entryForm.reset();
    setStatus("visited");
    entryFormTitle.textContent = "Add";
    entrySaveButton.textContent = "保存";
    entryCancelButton.hidden = true;
    showEntryError("");
    MemoryMap.clearLocationPicker();
  }

  function showLogin(message) {
    showingDenied = false;
    mainUser.textContent = "";
    showLoginError(message || "");
    resetEntryForm();
    visitedList.replaceChildren();
    wishlistList.replaceChildren();
    showMainError("");
    closePhotoLightbox();
    showView("login");
  }

  function parseOptionalCoord(raw, min, max, label) {
    const trimmed = String(raw || "").trim();
    if (!trimmed) {
      return { ok: true, value: null };
    }
    const value = Number(trimmed);
    if (!Number.isFinite(value) || value < min || value > max) {
      return { ok: false, message: label + "を確認してください" };
    }
    return { ok: true, value: value };
  }

  function emptyToNull(value) {
    const trimmed = String(value || "").trim();
    return trimmed ? trimmed : null;
  }

  function readEntryForm() {
    const status = getStatus();
    const title = document.getElementById("entry-title").value.trim();
    if (!title) {
      return { ok: false, message: "titleを入力してください" };
    }

    const visitedOn = document.getElementById("entry-visited-on").value;
    if (status === "visited" && !visitedOn) {
      return { ok: false, message: "visited の場合は訪問日を入力してください" };
    }

    const lat = parseOptionalCoord(
      document.getElementById("entry-lat").value,
      -90,
      90,
      "latitude",
    );
    if (!lat.ok) {
      return lat;
    }

    const lng = parseOptionalCoord(
      document.getElementById("entry-lng").value,
      -180,
      180,
      "longitude",
    );
    if (!lng.ok) {
      return lng;
    }

    if ((lat.value === null) !== (lng.value === null)) {
      return {
        ok: false,
        message: "latitude と longitude は両方入力するか、両方空にしてください",
      };
    }

    return {
      ok: true,
      payload: {
        status: status,
        title: title,
        place_name: emptyToNull(document.getElementById("entry-place").value),
        latitude: lat.value,
        longitude: lng.value,
        visited_on: status === "visited" ? visitedOn : null,
        memo: emptyToNull(document.getElementById("entry-memo").value),
      },
    };
  }

  function fillEntryForm(entry) {
    editingId = entry.id;
    setStatus(entry.status);
    document.getElementById("entry-title").value = entry.title || "";
    document.getElementById("entry-place").value = entry.place_name || "";
    document.getElementById("entry-lat").value =
      entry.latitude === null || entry.latitude === undefined
        ? ""
        : String(entry.latitude);
    document.getElementById("entry-lng").value =
      entry.longitude === null || entry.longitude === undefined
        ? ""
        : String(entry.longitude);
    document.getElementById("entry-visited-on").value = entry.visited_on || "";
    document.getElementById("entry-memo").value = entry.memo || "";
    document.getElementById("entry-photos").value = "";
    entryFormTitle.textContent = "Edit";
    entrySaveButton.textContent = "更新";
    entryCancelButton.hidden = false;
    showEntryError("");
    goToScreen("add");
  }

  function toMapItems(entries, photosByEntry) {
    return entries
      .filter(function (entry) {
        const lat = Number(entry.latitude);
        const lng = Number(entry.longitude);
        return Number.isFinite(lat) && Number.isFinite(lng);
      })
      .map(function (entry) {
        const photos = photosByEntry[entry.id] || [];
        let photoUrl = "";
        for (let i = 0; i < photos.length; i += 1) {
          if (photos[i].signedUrl) {
            photoUrl = photos[i].signedUrl;
            break;
          }
        }
        return {
          title: entry.title,
          place_name: entry.place_name,
          visited_on: entry.visited_on,
          memo: entry.memo,
          latitude: Number(entry.latitude),
          longitude: Number(entry.longitude),
          photoUrl: photoUrl,
        };
      });
  }

  function sortVisited(entries) {
    return entries.slice().sort(function (a, b) {
      const dateCmp = String(b.visited_on || "").localeCompare(
        String(a.visited_on || ""),
      );
      if (dateCmp !== 0) {
        return dateCmp;
      }
      return String(b.created_at || "").localeCompare(String(a.created_at || ""));
    });
  }

  function sortWishlist(entries) {
    return entries.slice().sort(function (a, b) {
      return String(b.created_at || "").localeCompare(String(a.created_at || ""));
    });
  }

  function formatVisitedOn(value) {
    if (!value) {
      return "";
    }
    const parts = String(value).split("-");
    if (parts.length !== 3) {
      return String(value);
    }
    return (
      parts[0] + "年" + Number(parts[1]) + "月" + Number(parts[2]) + "日"
    );
  }

  function appendText(parent, className, text) {
    if (!text) {
      return;
    }
    const line = document.createElement("p");
    line.className = className;
    line.textContent = text;
    parent.appendChild(line);
  }

  function renderPhotoStrip(photos, variant) {
    const strip = document.createElement("div");
    strip.className =
      variant === "timeline" ? "photo-strip album-strip" : "photo-strip wish-strip";

    photos.forEach(function (photo) {
      const item = document.createElement("div");
      item.className = "photo-item";

      if (photo.signedUrl) {
        const image = document.createElement("img");
        image.src = photo.signedUrl;
        image.alt = "";
        image.addEventListener("click", function () {
          openPhotoLightbox(photo.signedUrl);
        });
        item.appendChild(image);
      } else {
        const missing = document.createElement("p");
        missing.className = "muted";
        missing.textContent = "表示できません";
        item.appendChild(missing);
      }

      const deletePhotoButton = document.createElement("button");
      deletePhotoButton.type = "button";
      deletePhotoButton.className = "photo-delete";
      deletePhotoButton.textContent = "削除";
      deletePhotoButton.addEventListener("click", function () {
        removePhoto(photo);
      });
      item.appendChild(deletePhotoButton);
      strip.appendChild(item);
    });

    return strip;
  }

  function renderEntryActions(entry) {
    const actions = document.createElement("div");
    actions.className = "entry-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "secondary";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", function () {
      fillEntryForm(entry);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "secondary";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", function () {
      removeEntry(entry);
    });

    actions.appendChild(editButton);
    actions.appendChild(deleteButton);
    return actions;
  }

  function renderTimelineCard(entry, photos) {
    const card = document.createElement("article");
    card.className = "album-card";

    if (photos && photos.length) {
      card.appendChild(renderPhotoStrip(photos, "timeline"));
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "photo-placeholder";
      placeholder.textContent = "写真はまだありません";
      card.appendChild(placeholder);
    }

    const body = document.createElement("div");
    body.className = "album-body";
    appendText(body, "album-date", formatVisitedOn(entry.visited_on));
    appendText(body, "album-title", entry.title);
    appendText(body, "album-place", entry.place_name);
    appendText(body, "album-memo", entry.memo);
    card.appendChild(body);
    card.appendChild(renderEntryActions(entry));
    return card;
  }

  function renderWishlistCard(entry, photos) {
    const card = document.createElement("article");
    card.className = "wish-card";

    const body = document.createElement("div");
    body.className = "wish-body";
    appendText(body, "wish-title", entry.title);
    appendText(body, "wish-place", entry.place_name);
    appendText(body, "wish-memo", entry.memo);
    card.appendChild(body);

    if (photos && photos.length) {
      card.appendChild(renderPhotoStrip(photos, "wishlist"));
    }

    card.appendChild(renderEntryActions(entry));
    return card;
  }

  function renderList(container, entries, photosByEntry, emptyText, variant) {
    container.replaceChildren();
    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = emptyText;
      container.appendChild(empty);
      return;
    }
    entries.forEach(function (entry) {
      const photos = photosByEntry[entry.id] || [];
      const card =
        variant === "wishlist"
          ? renderWishlistCard(entry, photos)
          : renderTimelineCard(entry, photos);
      container.appendChild(card);
    });
  }

  function selectedPhotoFiles() {
    const input = document.getElementById("entry-photos");
    return Array.prototype.slice.call(input.files || []).filter(function (file) {
      return !file.type || file.type.indexOf("image/") === 0;
    });
  }

  async function uploadSelectedPhotos(entryId, userId, files) {
    let failed = 0;
    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      let path = null;
      try {
        path = await Photos.uploadFile(entryId, file);
        await Photos.insertPhoto({
          entry_id: entryId,
          storage_path: path,
          created_by: userId,
        });
      } catch (error) {
        console.error(error);
        failed += 1;
        if (path) {
          try {
            await Photos.removeFiles([path]);
          } catch (cleanupError) {
            console.error(cleanupError);
          }
        }
      }
    }
    return failed;
  }

  async function refreshEntries() {
    showMainError("");
    try {
      const entries = await Entries.loadEntries();
      const visited = sortVisited(
        entries.filter(function (entry) {
          return entry.status === "visited";
        }),
      );
      const wishlist = sortWishlist(
        entries.filter(function (entry) {
          return entry.status === "wishlist";
        }),
      );

      let photosByEntry = {};
      try {
        const photos = await Photos.loadPhotos();
        const urlMap = await Photos.createSignedUrlMap(
          photos.map(function (photo) {
            return photo.storage_path;
          }),
        );
        photos.forEach(function (photo) {
          if (!photosByEntry[photo.entry_id]) {
            photosByEntry[photo.entry_id] = [];
          }
          photosByEntry[photo.entry_id].push({
            id: photo.id,
            storage_path: photo.storage_path,
            signedUrl: urlMap[photo.storage_path] || "",
          });
        });
      } catch (photoError) {
        console.error(photoError);
        showMainError("写真を表示できませんでした");
      }

      renderList(
        visitedList,
        visited,
        photosByEntry,
        "まだ思い出がありません",
        "timeline",
      );
      renderList(
        wishlistList,
        wishlist,
        photosByEntry,
        "まだ行きたい場所がありません",
        "wishlist",
      );

      const mapEntries = toMapItems(visited, photosByEntry);
      MemoryMap.renderEntryMarkers(mapEntries);
    } catch (error) {
      console.error(error);
      visitedList.replaceChildren();
      wishlistList.replaceChildren();
      MemoryMap.renderEntryMarkers([]);
      showMainError("一覧を取得できませんでした");
    }
  }

  async function removePhoto(photo) {
    if (!window.confirm("この写真を削除しますか？")) {
      return;
    }
    showMainError("");
    try {
      await Photos.deletePhotoRecord(photo.id);
      try {
        await Photos.removeFiles([photo.storage_path]);
      } catch (storageError) {
        console.error(storageError);
        showMainError(
          "写真は削除しましたが、ファイルが残っている可能性があります",
        );
        await refreshEntries();
        return;
      }
      await refreshEntries();
    } catch (error) {
      console.error(error);
      showMainError("写真を削除できませんでした");
    }
  }

  async function removeEntry(entry) {
    if (!window.confirm("この項目を削除しますか？")) {
      return;
    }
    showMainError("");
    try {
      const photos = await Photos.loadPhotosForEntry(entry.id);
      const paths = photos.map(function (photo) {
        return photo.storage_path;
      });
      await Entries.deleteEntry(entry.id);
      if (paths.length) {
        try {
          await Photos.removeFiles(paths);
        } catch (storageError) {
          console.error(storageError);
          showMainError(
            "項目は削除しましたが、一部の写真ファイルが残っている可能性があります",
          );
          await refreshEntries();
          return;
        }
      }
      if (editingId === entry.id) {
        resetEntryForm();
      }
      await refreshEntries();
    } catch (error) {
      console.error(error);
      showMainError("削除できませんでした");
    }
  }

  async function rejectNonMember() {
    showingDenied = true;
    showView("denied");
    try {
      await Auth.signOut();
    } catch (error) {
      console.error(error);
    }
  }

  async function enterIfMember(user) {
    try {
      const isMember = await Auth.isAppMember(user.id);
      if (!isMember) {
        await rejectNonMember();
        return;
      }
      showingDenied = false;
      mainUser.textContent = user.email || "";
      showView("main");
      applyScreen(screenFromHash());
      await refreshEntries();
    } catch (error) {
      console.error(error);
      showingDenied = false;
      try {
        await Auth.signOut();
      } catch (signOutError) {
        console.error(signOutError);
      }
      showLogin("接続を確認してください");
    }
  }

  async function bootFromSession() {
    if (!isSupabaseConfigured()) {
      showLogin("js/config.js に Supabase URL と anon key を設定してください");
      return;
    }

    showView("loading");

    try {
      const session = await Auth.getSession();
      if (!session || !session.user) {
        showLogin();
        return;
      }
      await enterIfMember(session.user);
    } catch (error) {
      console.error(error);
      showLogin("接続を確認してください");
    }
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    showLoginError("");

    if (!isSupabaseConfigured()) {
      showLoginError("js/config.js に Supabase URL と anon key を設定してください");
      return;
    }

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {
      showLoginError("メールアドレスとパスワードを入力してください");
      return;
    }

    loginButton.disabled = true;

    try {
      const { data, error } = await Auth.signIn(email, password);
      if (error || !data.user) {
        console.error(error);
        showLoginError("メールアドレスまたはパスワードを確認してください");
        return;
      }
      await enterIfMember(data.user);
    } catch (error) {
      console.error(error);
      showLoginError("メールアドレスまたはパスワードを確認してください");
    } finally {
      loginButton.disabled = false;
    }
  });

  logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    try {
      await Auth.signOut();
    } catch (error) {
      console.error(error);
    } finally {
      logoutButton.disabled = false;
      document.getElementById("password").value = "";
      showLogin();
    }
  });

  deniedBackButton.addEventListener("click", () => {
    document.getElementById("password").value = "";
    showLogin();
  });

  document.querySelectorAll(".bottom-nav [data-screen]").forEach(function (button) {
    button.addEventListener("click", function () {
      goToScreen(button.getAttribute("data-screen"));
    });
  });

  window.addEventListener("hashchange", function () {
    if (views.main.hidden) {
      return;
    }
    applyScreen(screenFromHash());
  });

  entryForm.querySelectorAll('input[name="status"]').forEach(function (input) {
    input.addEventListener("change", syncVisitedOnField);
  });

  document.getElementById("entry-lat").addEventListener("change", syncPickerFromInputs);
  document.getElementById("entry-lng").addEventListener("change", syncPickerFromInputs);

  entryCancelButton.addEventListener("click", function () {
    resetEntryForm();
  });

  geoButton.addEventListener("click", function () {
    showEntryError("");
    if (!navigator.geolocation) {
      showEntryError("この端末では位置情報を使えません");
      return;
    }

    geoButton.disabled = true;
    navigator.geolocation.getCurrentPosition(
      function (position) {
        document.getElementById("entry-lat").value =
          position.coords.latitude.toFixed(6);
        document.getElementById("entry-lng").value =
          position.coords.longitude.toFixed(6);
        MemoryMap.updateLocationPickerMarker(
          position.coords.latitude,
          position.coords.longitude,
        );
        geoButton.disabled = false;
      },
      function (error) {
        console.error(error);
        if (error && error.code === 1) {
          showEntryError("位置情報の許可を確認してください");
        } else {
          showEntryError("現在地を取得できませんでした");
        }
        geoButton.disabled = false;
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  });

  entryForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    showEntryError("");
    showMainError("");

    const parsed = readEntryForm();
    if (!parsed.ok) {
      showEntryError(parsed.message);
      return;
    }

    entrySaveButton.disabled = true;

    try {
      const files = selectedPhotoFiles();
      const session = await Auth.getSession();
      if (!session || !session.user) {
        showEntryError("ログインし直してください");
        showLogin();
        return;
      }

      let saved;
      if (editingId) {
        saved = await Entries.updateEntry(editingId, parsed.payload);
      } else {
        saved = await Entries.createEntry(
          Object.assign({ created_by: session.user.id }, parsed.payload),
        );
      }

      const failedCount = await uploadSelectedPhotos(
        saved.id,
        session.user.id,
        files,
      );
      resetEntryForm();
      await refreshEntries();
      goToScreen(parsed.payload.status === "wishlist" ? "wishlist" : "timeline");
      if (failedCount) {
        showMainError(
          "保存はできましたが、一部の写真をアップロードできませんでした",
        );
      }
    } catch (error) {
      console.error(error);
      showEntryError(editingId ? "更新できませんでした" : "保存できませんでした");
    } finally {
      entrySaveButton.disabled = false;
    }
  });

  supabaseClient.auth.onAuthStateChange((event) => {
    if (showingDenied) {
      return;
    }
    if (event === "SIGNED_OUT") {
      showLogin();
    }
  });

  lightboxClose.addEventListener("click", function (event) {
    event.stopPropagation();
    closePhotoLightbox();
  });

  photoLightbox.addEventListener("click", function () {
    closePhotoLightbox();
  });

  lightboxImage.addEventListener("click", function (event) {
    event.stopPropagation();
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !photoLightbox.hidden) {
      closePhotoLightbox();
    }
  });

  syncVisitedOnField();
  MemoryMap.setPhotoClickHandler(openPhotoLightbox);
  MemoryMap.initLocationPicker(function (lat, lng) {
    document.getElementById("entry-lat").value = lat.toFixed(6);
    document.getElementById("entry-lng").value = lng.toFixed(6);
  });
  bootFromSession();
})();
