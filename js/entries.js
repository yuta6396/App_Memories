const Entries = {
  async loadEntries() {
    const { data, error } = await supabaseClient
      .from("entries")
      .select(
        "id, status, title, place_name, latitude, longitude, visited_on, memo, created_by, created_at, updated_at",
      );

    if (error) {
      throw error;
    }

    return data || [];
  },

  async createEntry(payload) {
    const { data, error } = await supabaseClient
      .from("entries")
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async updateEntry(id, payload) {
    const { data, error } = await supabaseClient
      .from("entries")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async deleteEntry(id) {
    const { error } = await supabaseClient.from("entries").delete().eq("id", id);

    if (error) {
      throw error;
    }
  },
};
