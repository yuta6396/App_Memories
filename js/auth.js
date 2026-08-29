const Auth = {
  getSession() {
    return supabaseClient.auth.getSession().then(({ data, error }) => {
      if (error) {
        throw error;
      }
      return data.session;
    });
  },

  signIn(email, password) {
    return supabaseClient.auth.signInWithPassword({ email, password });
  },

  signOut() {
    return supabaseClient.auth.signOut();
  },

  async isAppMember(userId) {
    const { data, error } = await supabaseClient
      .from("app_members")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return Boolean(data && data.user_id);
  },
};
