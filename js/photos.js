const PHOTO_BUCKET = "memory-photos";
const SIGNED_URL_SECONDS = 3600;

const Photos = {
  extensionFor(file) {
    const name = String(file && file.name ? file.name : "");
    const dot = name.lastIndexOf(".");
    if (dot >= 0) {
      const ext = name
        .slice(dot + 1)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
      if (ext) {
        return ext;
      }
    }
    if (file && file.type === "image/jpeg") {
      return "jpg";
    }
    if (file && file.type === "image/png") {
      return "png";
    }
    if (file && file.type === "image/webp") {
      return "webp";
    }
    if (file && file.type === "image/gif") {
      return "gif";
    }
    return "jpg";
  },

  storagePath(entryId, file) {
    return entryId + "/" + crypto.randomUUID() + "." + Photos.extensionFor(file);
  },

  async loadPhotos() {
    const { data, error } = await supabaseClient
      .from("photos")
      .select("id, entry_id, storage_path, created_by, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  },

  async loadPhotosForEntry(entryId) {
    const { data, error } = await supabaseClient
      .from("photos")
      .select("id, entry_id, storage_path, created_by, created_at")
      .eq("entry_id", entryId);

    if (error) {
      throw error;
    }

    return data || [];
  },

  async insertPhoto(payload) {
    const { data, error } = await supabaseClient
      .from("photos")
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async uploadFile(entryId, file) {
    const path = Photos.storagePath(entryId, file);
    const { error } = await supabaseClient.storage
      .from(PHOTO_BUCKET)
      .upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (error) {
      throw error;
    }

    return path;
  },

  async createSignedUrlMap(paths) {
    const unique = [];
    const seen = {};
    paths.forEach(function (path) {
      if (path && !seen[path]) {
        seen[path] = true;
        unique.push(path);
      }
    });

    if (!unique.length) {
      return {};
    }

    const { data, error } = await supabaseClient.storage
      .from(PHOTO_BUCKET)
      .createSignedUrls(unique, SIGNED_URL_SECONDS);

    if (error) {
      throw error;
    }

    const map = {};
    (data || []).forEach(function (item) {
      const url = item.signedUrl || item.signedURL;
      if (item.path && url) {
        map[item.path] = url;
      }
    });
    return map;
  },

  async removeFiles(paths) {
    if (!paths.length) {
      return;
    }
    const { error } = await supabaseClient.storage
      .from(PHOTO_BUCKET)
      .remove(paths);

    if (error) {
      throw error;
    }
  },

  async deletePhotoRecord(id) {
    const { error } = await supabaseClient.from("photos").delete().eq("id", id);

    if (error) {
      throw error;
    }
  },
};
